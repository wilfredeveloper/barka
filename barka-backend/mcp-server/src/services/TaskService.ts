import { Types } from 'mongoose';
import { ITask, MCPResponse, QueryOptions } from '../types/index.js';
import { getModels } from '../utils/database.js';
import { logger } from '../utils/logger.js';

export class TaskService {
  private models = getModels();

  /**
   * Create a new task
   */
  async createTask(taskData: Partial<ITask>): Promise<MCPResponse<ITask>> {
    try {
      logger.info('Creating new task', { name: taskData.name, project: taskData.project });

      // Validate required fields
      if (!taskData.name || !taskData.description || !taskData.project || !taskData.client || !taskData.organization) {
        return {
          status: 'error',
          error_message: 'Missing required fields: name, description, project, client, organization'
        };
      }

      const task = new this.models.Task(taskData);
      const savedTask = await task.save();

      // Update project progress
      const project = await this.models.Project.findById(taskData.project);
      if (project) {
        await project.updateProgress();
      }

      logger.info('Task created successfully', { taskId: savedTask._id });

      return {
        status: 'success',
        data: savedTask.toObject()
      };
    } catch (error) {
      logger.error('Error creating task', error as Error, taskData);
      return {
        status: 'error',
        error_message: `Failed to create task: ${(error as Error).message}`
      };
    }
  }

  /**
   * Get task by ID with population
   */
  async getTask(taskId: string, clientId?: string, organizationId?: string): Promise<MCPResponse<ITask>> {
    try {
      logger.debug('Fetching task', { taskId, clientId, organizationId });

      const query: any = { _id: taskId, isActive: true };
      if (clientId) query.client = clientId;
      if (organizationId) query.organization = organizationId;

      const task = await this.models.Task
        .findOne(query)
        .populate('project', 'name status')
        .populate('assignedTo', 'name email role')
        .populate('dependsOn', 'name status')
        .populate('blockedBy', 'name status')
        .populate('subtasks', 'name status progress.completionPercentage')
        .populate('parentTask', 'name status')
        .populate('createdBy', 'name email')
        .populate('lastModifiedBy', 'name email');

      if (!task) {
        return {
          status: 'error',
          error_message: 'Task not found or access denied'
        };
      }

      return {
        status: 'success',
        data: task.toObject()
      };
    } catch (error) {
      logger.error('Error fetching task', error as Error, { taskId });
      return {
        status: 'error',
        error_message: `Failed to fetch task: ${(error as Error).message}`
      };
    }
  }

  /**
   * List tasks with filtering and pagination
   */
  async listTasks(options: QueryOptions & { 
    clientId?: string; 
    organizationId?: string; 
    projectId?: string; 
    assigneeId?: string; 
    status?: string;
  }): Promise<MCPResponse<ITask[]>> {
    try {
      const { 
        page = 1, 
        limit = 20, 
        sort = 'createdAt', 
        order = 'desc', 
        search, 
        filters, 
        clientId, 
        organizationId, 
        projectId, 
        assigneeId, 
        status 
      } = options;

      logger.debug('Listing tasks', { page, limit, search, projectId, assigneeId, status });

      // Build query
      const query: any = { isActive: true };
      if (clientId) query.client = clientId;
      if (organizationId) query.organization = organizationId;
      if (projectId) query.project = projectId;
      if (assigneeId) query.assignedTo = assigneeId;
      if (status) query.status = status;

      // Add search functionality
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } },
          { category: { $regex: search, $options: 'i' } }
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
      const [tasks, total] = await Promise.all([
        this.models.Task
          .find(query)
          .populate('project', 'name status')
          .populate('assignedTo', 'name email role')
          .sort({ [sort]: sortOrder })
          .skip(skip)
          .limit(limit),
        this.models.Task.countDocuments(query)
      ]);

      const hasMore = skip + tasks.length < total;

      return {
        status: 'success',
        data: tasks.map((t: any) => t.toObject()),
        metadata: {
          total,
          page,
          limit,
          hasMore
        }
      };
    } catch (error) {
      logger.error('Error listing tasks', error as Error, options);
      return {
        status: 'error',
        error_message: `Failed to list tasks: ${(error as Error).message}`
      };
    }
  }

  /**
   * Update task
   */
  async updateTask(taskId: string, updateData: Partial<ITask>, userId: string): Promise<MCPResponse<ITask>> {
    try {
      logger.info('Updating task', { taskId, userId });

      const task = await this.models.Task.findOne({ _id: taskId, isActive: true });
      if (!task) {
        return {
          status: 'error',
          error_message: 'Task not found'
        };
      }

      // Update fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof ITask] !== undefined) {
          (task as any)[key] = updateData[key as keyof ITask];
        }
      });

      task.lastModifiedBy = new Types.ObjectId(userId);
      const updatedTask = await task.save();

      // Update project progress if task belongs to a project
      if (task.project) {
        const project = await this.models.Project.findById(task.project);
        if (project) {
          await project.updateProgress();
        }
      }

      logger.info('Task updated successfully', { taskId });

      return {
        status: 'success',
        data: updatedTask.toObject()
      };
    } catch (error) {
      logger.error('Error updating task', error as Error, { taskId });
      return {
        status: 'error',
        error_message: `Failed to update task: ${(error as Error).message}`
      };
    }
  }

  /**
   * Soft delete task
   */
  async deleteTask(taskId: string, userId: string): Promise<MCPResponse<boolean>> {
    try {
      logger.info('Deleting task', { taskId, userId });

      const task = await this.models.Task.findOne({ _id: taskId, isActive: true });
      if (!task) {
        return {
          status: 'error',
          error_message: 'Task not found'
        };
      }

      // Check for dependencies
      const dependentTasks = await this.models.Task.find({ 
        dependsOn: taskId, 
        isActive: true 
      });

      if (dependentTasks.length > 0) {
        return {
          status: 'error',
          error_message: `Cannot delete task: ${dependentTasks.length} tasks depend on this task`
        };
      }

      task.isActive = false;
      task.lastModifiedBy = new Types.ObjectId(userId);
      await task.save();

      // Update project progress
      if (task.project) {
        const project = await this.models.Project.findById(task.project);
        if (project) {
          await project.updateProgress();
        }
      }

      logger.info('Task deleted successfully', { taskId });

      return {
        status: 'success',
        data: true
      };
    } catch (error) {
      logger.error('Error deleting task', error as Error, { taskId });
      return {
        status: 'error',
        error_message: `Failed to delete task: ${(error as Error).message}`
      };
    }
  }

  /**
   * Assign task to team member
   */
  async assignTask(taskId: string, teamMemberId: string, userId: string): Promise<MCPResponse<ITask>> {
    try {
      logger.info('Assigning task', { taskId, teamMemberId, userId });

      const task = await this.models.Task.findOne({ _id: taskId, isActive: true });
      if (!task) {
        return {
          status: 'error',
          error_message: 'Task not found'
        };
      }

      // Verify team member exists
      const teamMember = await this.models.TeamMember.findOne({ 
        _id: teamMemberId, 
        isActive: true 
      });
      if (!teamMember) {
        return {
          status: 'error',
          error_message: 'Team member not found'
        };
      }

      task.assignedTo = new Types.ObjectId(teamMemberId);
      task.assignedToName = teamMember.name;
      task.lastModifiedBy = new Types.ObjectId(userId);
      const updatedTask = await task.save();

      // Update team member workload
      await teamMember.updateWorkload();

      logger.info('Task assigned successfully', { taskId, teamMemberId });

      return {
        status: 'success',
        data: updatedTask.toObject()
      };
    } catch (error) {
      logger.error('Error assigning task', error as Error, { taskId, teamMemberId });
      return {
        status: 'error',
        error_message: `Failed to assign task: ${(error as Error).message}`
      };
    }
  }

  /**
   * Add comment to task
   */
  async addComment(taskId: string, authorId: string, content: string): Promise<MCPResponse<ITask>> {
    try {
      logger.info('Adding comment to task', { taskId, authorId });

      const task = await this.models.Task.findOne({ _id: taskId, isActive: true });
      if (!task) {
        return {
          status: 'error',
          error_message: 'Task not found'
        };
      }

      await task.addComment(authorId, content);
      const updatedTask = await this.models.Task
        .findById(taskId)
        .populate('comments.author', 'name email');

      logger.info('Comment added successfully', { taskId });

      return {
        status: 'success',
        data: updatedTask?.toObject()
      };
    } catch (error) {
      logger.error('Error adding comment', error as Error, { taskId });
      return {
        status: 'error',
        error_message: `Failed to add comment: ${(error as Error).message}`
      };
    }
  }

  /**
   * Update task status
   */
  async updateStatus(taskId: string, newStatus: string, userId: string, comment?: string): Promise<MCPResponse<ITask>> {
    try {
      logger.info('Updating task status', { taskId, newStatus, userId });

      const task = await this.models.Task.findOne({ _id: taskId, isActive: true });
      if (!task) {
        return {
          status: 'error',
          error_message: 'Task not found'
        };
      }

      await task.updateStatus(newStatus, userId, comment);

      // Update project progress
      if (task.project) {
        const project = await this.models.Project.findById(task.project);
        if (project) {
          await project.updateProgress();
        }
      }

      // Update team member workload if assigned
      if (task.assignedTo) {
        const teamMember = await this.models.TeamMember.findById(task.assignedTo);
        if (teamMember) {
          await teamMember.updateWorkload();
        }
      }

      logger.info('Task status updated successfully', { taskId, newStatus });

      return {
        status: 'success',
        data: task.toObject()
      };
    } catch (error) {
      logger.error('Error updating task status', error as Error, { taskId, newStatus });
      return {
        status: 'error',
        error_message: `Failed to update task status: ${(error as Error).message}`
      };
    }
  }

  /**
   * Search tasks
   */
  async searchTasks(searchTerm: string, clientId?: string, organizationId?: string): Promise<MCPResponse<ITask[]>> {
    try {
      logger.debug('Searching tasks', { searchTerm, clientId, organizationId });

      const query: any = { isActive: true };
      if (clientId) query.client = clientId;
      if (organizationId) query.organization = organizationId;

      query.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { tags: { $in: [new RegExp(searchTerm, 'i')] } },
        { category: { $regex: searchTerm, $options: 'i' } }
      ];

      const tasks = await this.models.Task
        .find(query)
        .populate('project', 'name status')
        .populate('assignedTo', 'name email role')
        .limit(50);

      return {
        status: 'success',
        data: tasks.map((t: any) => t.toObject())
      };
    } catch (error) {
      logger.error('Error searching tasks', error as Error, { searchTerm });
      return {
        status: 'error',
        error_message: `Failed to search tasks: ${(error as Error).message}`
      };
    }
  }
}
