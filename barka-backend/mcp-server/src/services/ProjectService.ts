import { Types } from 'mongoose';
import { IProject, MCPResponse, QueryOptions } from '../types/index.js';
import { getModels } from '../utils/database.js';
import { logger } from '../utils/logger.js';

export class ProjectService {
  private models = getModels();

  /**
   * Create a new project
   */
  async createProject(projectData: Partial<IProject>): Promise<MCPResponse<IProject>> {
    try {
      logger.info('Creating new project', { name: projectData.name });

      // Validate required fields (client is now optional)
      if (!projectData.name || !projectData.description || !projectData.organization) {
        return {
          status: 'error',
          error_message: 'Missing required fields: name, description, organization'
        };
      }

      const project = new this.models.Project(projectData);
      const savedProject = await project.save();

      logger.info('Project created successfully', { projectId: savedProject._id });

      return {
        status: 'success',
        data: savedProject.toObject()
      };
    } catch (error) {
      logger.error('Error creating project', error as Error, projectData);
      return {
        status: 'error',
        error_message: `Failed to create project: ${(error as Error).message}`
      };
    }
  }

  /**
   * Get project by ID with population
   */
  async getProject(projectId: string, clientId?: string, organizationId?: string): Promise<MCPResponse<IProject>> {
    try {
      logger.debug('Fetching project', { projectId, clientId, organizationId });

      const query: any = { _id: projectId, isActive: true };
      if (clientId) query.client = clientId;
      if (organizationId) query.organization = organizationId;

      const project = await this.models.Project
        .findOne(query)
        .populate('teamMembers', 'name email role')
        .populate('projectManager', 'name email')
        .populate('createdBy', 'name email')
        .populate('lastModifiedBy', 'name email');

      if (!project) {
        return {
          status: 'error',
          error_message: 'Project not found or access denied'
        };
      }

      return {
        status: 'success',
        data: project.toObject()
      };
    } catch (error) {
      logger.error('Error fetching project', error as Error, { projectId });
      return {
        status: 'error',
        error_message: `Failed to fetch project: ${(error as Error).message}`
      };
    }
  }

  /**
   * List projects with filtering and pagination
   */
  async listProjects(options: QueryOptions & { clientId?: string; organizationId?: string }): Promise<MCPResponse<IProject[]>> {
    try {
      const { page = 1, limit = 20, sort = 'createdAt', order = 'desc', search, filters, clientId, organizationId } = options;

      logger.debug('Listing projects', { page, limit, search, clientId, organizationId });

      // Build query
      const query: any = { isActive: true };
      if (clientId) query.client = clientId;
      if (organizationId) query.organization = organizationId;

      // Add search functionality
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ];
      }

      // Add filters
      if (filters) {
        Object.keys(filters).forEach(key => {
          if (filters[key] !== undefined && filters[key] !== null) {
            query[key] = filters[key];
          }
        });
      }

      // Calculate pagination
      const skip = (page - 1) * limit;
      const sortOrder = order === 'desc' ? -1 : 1;

      // Execute query
      const [projects, total] = await Promise.all([
        this.models.Project
          .find(query)
          .populate('teamMembers', 'name email role')
          .populate('projectManager', 'name email')
          .sort({ [sort]: sortOrder })
          .skip(skip)
          .limit(limit),
        this.models.Project.countDocuments(query)
      ]);

      const hasMore = skip + projects.length < total;

      return {
        status: 'success',
        data: projects.map((p: any) => p.toObject()),
        metadata: {
          total,
          page,
          limit,
          hasMore
        }
      };
    } catch (error) {
      logger.error('Error listing projects', error as Error, options);
      return {
        status: 'error',
        error_message: `Failed to list projects: ${(error as Error).message}`
      };
    }
  }

  /**
   * Update project
   */
  async updateProject(projectId: string, updateData: Partial<IProject>, userId: string): Promise<MCPResponse<IProject>> {
    try {
      logger.info('Updating project', { projectId, userId });

      const project = await this.models.Project.findOne({ _id: projectId, isActive: true });
      if (!project) {
        return {
          status: 'error',
          error_message: 'Project not found'
        };
      }

      // Update fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof IProject] !== undefined) {
          (project as any)[key] = updateData[key as keyof IProject];
        }
      });

      project.lastModifiedBy = new Types.ObjectId(userId);
      const updatedProject = await project.save();

      logger.info('Project updated successfully', { projectId });

      return {
        status: 'success',
        data: updatedProject.toObject()
      };
    } catch (error) {
      logger.error('Error updating project', error as Error, { projectId });
      return {
        status: 'error',
        error_message: `Failed to update project: ${(error as Error).message}`
      };
    }
  }

  /**
   * Soft delete project
   */
  async deleteProject(projectId: string, userId: string): Promise<MCPResponse<boolean>> {
    try {
      logger.info('Deleting project', { projectId, userId });

      const project = await this.models.Project.findOne({ _id: projectId, isActive: true });
      if (!project) {
        return {
          status: 'error',
          error_message: 'Project not found'
        };
      }

      project.isActive = false;
      project.lastModifiedBy = new Types.ObjectId(userId);
      await project.save();

      logger.info('Project deleted successfully', { projectId });

      return {
        status: 'success',
        data: true
      };
    } catch (error) {
      logger.error('Error deleting project', error as Error, { projectId });
      return {
        status: 'error',
        error_message: `Failed to delete project: ${(error as Error).message}`
      };
    }
  }

  /**
   * Search projects
   */
  async searchProjects(searchTerm: string, clientId?: string, organizationId?: string): Promise<MCPResponse<IProject[]>> {
    try {
      logger.debug('Searching projects', { searchTerm, clientId, organizationId });

      const query: any = { isActive: true };
      if (clientId) query.client = clientId;
      if (organizationId) query.organization = organizationId;

      query.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { tags: { $in: [new RegExp(searchTerm, 'i')] } }
      ];

      const projects = await this.models.Project
        .find(query)
        .populate('teamMembers', 'name email role')
        .populate('projectManager', 'name email')
        .limit(50);

      return {
        status: 'success',
        data: projects.map((p: any) => p.toObject())
      };
    } catch (error) {
      logger.error('Error searching projects', error as Error, { searchTerm });
      return {
        status: 'error',
        error_message: `Failed to search projects: ${(error as Error).message}`
      };
    }
  }

  /**
   * Get project tasks
   */
  async getProjectTasks(projectId: string): Promise<MCPResponse<any[]>> {
    try {
      logger.debug('Fetching project tasks', { projectId });

      const tasks = await this.models.Task
        .find({ project: projectId, isActive: true })
        .populate('assignedTo', 'name email')
        .sort({ createdAt: -1 });

      return {
        status: 'success',
        data: tasks.map((t: any) => t.toObject())
      };
    } catch (error) {
      logger.error('Error fetching project tasks', error as Error, { projectId });
      return {
        status: 'error',
        error_message: `Failed to fetch project tasks: ${(error as Error).message}`
      };
    }
  }

  /**
   * Add team member to project
   */
  async addTeamMember(projectId: string, teamMemberId: string, userId: string): Promise<MCPResponse<IProject>> {
    try {
      logger.info('Adding team member to project', { projectId, teamMemberId, userId });

      const project = await this.models.Project.findOne({ _id: projectId, isActive: true });
      if (!project) {
        return {
          status: 'error',
          error_message: 'Project not found'
        };
      }

      // Check if team member already exists
      if (project.teamMembers.includes(new Types.ObjectId(teamMemberId))) {
        return {
          status: 'error',
          error_message: 'Team member already assigned to project'
        };
      }

      project.teamMembers.push(new Types.ObjectId(teamMemberId));
      project.lastModifiedBy = new Types.ObjectId(userId);
      const updatedProject = await project.save();

      logger.info('Team member added successfully', { projectId, teamMemberId });

      return {
        status: 'success',
        data: updatedProject.toObject()
      };
    } catch (error) {
      logger.error('Error adding team member', error as Error, { projectId, teamMemberId });
      return {
        status: 'error',
        error_message: `Failed to add team member: ${(error as Error).message}`
      };
    }
  }

  /**
   * Get project status and progress
   */
  async getProjectStatus(projectId: string): Promise<MCPResponse<any>> {
    try {
      logger.debug('Fetching project status', { projectId });

      const project = await this.models.Project
        .findOne({ _id: projectId, isActive: true })
        .populate('teamMembers', 'name email role')
        .populate('projectManager', 'name email');

      if (!project) {
        return {
          status: 'error',
          error_message: 'Project not found'
        };
      }

      // Update progress
      await project.updateProgress();

      const tasks = await this.models.Task.find({ project: projectId, isActive: true });
      const overdueTasks = tasks.filter((task: any) => task.dueDate && task.dueDate < new Date() && task.status !== 'completed');

      const statusData = {
        project: project.toObject(),
        progress: project.progress,
        deadlineStatus: project.deadlineStatus,
        daysRemaining: project.daysRemaining,
        overdueTasks: overdueTasks.length,
        totalTasks: tasks.length,
        teamSize: project.teamMembers.length
      };

      return {
        status: 'success',
        data: statusData
      };
    } catch (error) {
      logger.error('Error fetching project status', error as Error, { projectId });
      return {
        status: 'error',
        error_message: `Failed to fetch project status: ${(error as Error).message}`
      };
    }
  }
}
