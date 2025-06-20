import { Types } from 'mongoose';
import { ITeamMember, MCPResponse, QueryOptions } from '../types/index.js';
import { getModels } from '../utils/database.js';
import { logger } from '../utils/logger.js';

export class TeamMemberService {
  private models = getModels();

  /**
   * Create a new team member
   */
  async createTeamMember(memberData: Partial<ITeamMember>): Promise<MCPResponse<ITeamMember>> {
    try {
      logger.info('Creating new team member', { name: memberData.name, email: memberData.email });

      // Validate required fields (client is now optional)
      if (!memberData.name || !memberData.email || !memberData.role || !memberData.organization) {
        return {
          status: 'error',
          error_message: 'Missing required fields: name, email, role, organization'
        };
      }

      // Check for duplicate email
      const existingMember = await this.models.TeamMember.findOne({ 
        email: memberData.email,
        isActive: true 
      });
      if (existingMember) {
        return {
          status: 'error',
          error_message: 'Team member with this email already exists'
        };
      }

      const teamMember = new this.models.TeamMember(memberData);
      const savedMember = await teamMember.save();

      logger.info('Team member created successfully', { memberId: savedMember._id });

      return {
        status: 'success',
        data: savedMember.toObject()
      };
    } catch (error) {
      logger.error('Error creating team member', error as Error, memberData);
      return {
        status: 'error',
        error_message: `Failed to create team member: ${(error as Error).message}`
      };
    }
  }

  /**
   * Get team member by ID with population
   */
  async getTeamMember(memberId: string, clientId?: string, organizationId?: string): Promise<MCPResponse<ITeamMember>> {
    try {
      logger.debug('Fetching team member', { memberId, clientId, organizationId });

      const query: any = { _id: memberId, isActive: true };
      if (clientId) query.client = clientId;
      if (organizationId) query.organization = organizationId;

      const teamMember = await this.models.TeamMember
        .findOne(query)
        .populate('currentProjects', 'name status')
        .populate('createdBy', 'name email')
        .populate('lastModifiedBy', 'name email');

      if (!teamMember) {
        return {
          status: 'error',
          error_message: 'Team member not found or access denied'
        };
      }

      return {
        status: 'success',
        data: teamMember.toObject()
      };
    } catch (error) {
      logger.error('Error fetching team member', error as Error, { memberId });
      return {
        status: 'error',
        error_message: `Failed to fetch team member: ${(error as Error).message}`
      };
    }
  }

  /**
   * List team members with filtering and pagination
   */
  async listTeamMembers(options: QueryOptions & { 
    clientId?: string; 
    organizationId?: string; 
    role?: string; 
    status?: string;
    availability?: string;
  }): Promise<MCPResponse<ITeamMember[]>> {
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
        role, 
        status,
        availability 
      } = options;

      logger.debug('Listing team members', { page, limit, search, role, status });

      // Build query
      const query: any = { isActive: true };
      if (clientId) query.client = clientId;
      if (organizationId) query.organization = organizationId;
      if (role) query.role = role;
      if (status) query.status = status;
      if (availability) query['capacity.availability'] = availability;

      // Add search functionality
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { department: { $regex: search, $options: 'i' } },
          { title: { $regex: search, $options: 'i' } },
          { skills: { $in: [new RegExp(search, 'i')] } }
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
      const [teamMembers, total] = await Promise.all([
        this.models.TeamMember
          .find(query)
          .populate('currentProjects', 'name status')
          .sort({ [sort]: sortOrder })
          .skip(skip)
          .limit(limit),
        this.models.TeamMember.countDocuments(query)
      ]);

      const hasMore = skip + teamMembers.length < total;

      return {
        status: 'success',
        data: teamMembers.map((tm: any) => tm.toObject()),
        metadata: {
          total,
          page,
          limit,
          hasMore
        }
      };
    } catch (error) {
      logger.error('Error listing team members', error as Error, options);
      return {
        status: 'error',
        error_message: `Failed to list team members: ${(error as Error).message}`
      };
    }
  }

  /**
   * Update team member
   */
  async updateTeamMember(memberId: string, updateData: Partial<ITeamMember>, userId: string): Promise<MCPResponse<ITeamMember>> {
    try {
      logger.info('Updating team member', { memberId, userId });

      const teamMember = await this.models.TeamMember.findOne({ _id: memberId, isActive: true });
      if (!teamMember) {
        return {
          status: 'error',
          error_message: 'Team member not found'
        };
      }

      // Check for email conflicts if email is being updated
      if (updateData.email && updateData.email !== teamMember.email) {
        const existingMember = await this.models.TeamMember.findOne({ 
          email: updateData.email,
          isActive: true,
          _id: { $ne: memberId }
        });
        if (existingMember) {
          return {
            status: 'error',
            error_message: 'Another team member with this email already exists'
          };
        }
      }

      // Update fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof ITeamMember] !== undefined) {
          (teamMember as any)[key] = updateData[key as keyof ITeamMember];
        }
      });

      teamMember.lastModifiedBy = new Types.ObjectId(userId);
      const updatedMember = await teamMember.save();

      logger.info('Team member updated successfully', { memberId });

      return {
        status: 'success',
        data: updatedMember.toObject()
      };
    } catch (error) {
      logger.error('Error updating team member', error as Error, { memberId });
      return {
        status: 'error',
        error_message: `Failed to update team member: ${(error as Error).message}`
      };
    }
  }

  /**
   * Soft delete team member
   */
  async deleteTeamMember(memberId: string, userId: string): Promise<MCPResponse<boolean>> {
    try {
      logger.info('Deleting team member', { memberId, userId });

      const teamMember = await this.models.TeamMember.findOne({ _id: memberId, isActive: true });
      if (!teamMember) {
        return {
          status: 'error',
          error_message: 'Team member not found'
        };
      }

      // Check for active task assignments
      const activeTasks = await this.models.Task.find({ 
        assignedTo: memberId, 
        status: { $in: ['not_started', 'in_progress'] },
        isActive: true 
      });

      if (activeTasks.length > 0) {
        return {
          status: 'error',
          error_message: `Cannot delete team member: ${activeTasks.length} active tasks are assigned to this member`
        };
      }

      teamMember.isActive = false;
      teamMember.lastModifiedBy = new Types.ObjectId(userId);
      await teamMember.save();

      logger.info('Team member deleted successfully', { memberId });

      return {
        status: 'success',
        data: true
      };
    } catch (error) {
      logger.error('Error deleting team member', error as Error, { memberId });
      return {
        status: 'error',
        error_message: `Failed to delete team member: ${(error as Error).message}`
      };
    }
  }

  /**
   * Get available team members
   */
  async getAvailableTeamMembers(clientId?: string, organizationId?: string, skillRequired?: string): Promise<MCPResponse<ITeamMember[]>> {
    try {
      logger.debug('Fetching available team members', { clientId, organizationId, skillRequired });

      const query: any = { 
        isActive: true, 
        status: 'active',
        'workload.utilizationPercentage': { $lt: 100 }
      };
      if (clientId) query.client = clientId;
      if (organizationId) query.organization = organizationId;
      if (skillRequired) {
        query.$or = [
          { skills: { $in: [new RegExp(skillRequired, 'i')] } },
          { 'expertise.skill': { $regex: skillRequired, $options: 'i' } }
        ];
      }

      const availableMembers = await this.models.TeamMember
        .find(query)
        .populate('currentProjects', 'name status')
        .sort({ 'workload.utilizationPercentage': 1 });

      return {
        status: 'success',
        data: availableMembers.map((tm: any) => tm.toObject())
      };
    } catch (error) {
      logger.error('Error fetching available team members', error as Error, { skillRequired });
      return {
        status: 'error',
        error_message: `Failed to fetch available team members: ${(error as Error).message}`
      };
    }
  }

  /**
   * Update team member skills
   */
  async updateSkills(memberId: string, skills: string[], expertise: Array<{skill: string, level: string}>, userId: string): Promise<MCPResponse<ITeamMember>> {
    try {
      logger.info('Updating team member skills', { memberId, userId });

      const teamMember = await this.models.TeamMember.findOne({ _id: memberId, isActive: true });
      if (!teamMember) {
        return {
          status: 'error',
          error_message: 'Team member not found'
        };
      }

      teamMember.skills = skills;
      teamMember.expertise = expertise;
      teamMember.lastModifiedBy = new Types.ObjectId(userId);
      const updatedMember = await teamMember.save();

      logger.info('Team member skills updated successfully', { memberId });

      return {
        status: 'success',
        data: updatedMember.toObject()
      };
    } catch (error) {
      logger.error('Error updating team member skills', error as Error, { memberId });
      return {
        status: 'error',
        error_message: `Failed to update team member skills: ${(error as Error).message}`
      };
    }
  }

  /**
   * Get team member workload
   */
  async getWorkload(memberId: string): Promise<MCPResponse<any>> {
    try {
      logger.debug('Fetching team member workload', { memberId });

      const teamMember = await this.models.TeamMember
        .findOne({ _id: memberId, isActive: true })
        .populate('currentProjects', 'name status dueDate');

      if (!teamMember) {
        return {
          status: 'error',
          error_message: 'Team member not found'
        };
      }

      // Update workload
      await teamMember.updateWorkload();

      // Get assigned tasks
      const assignedTasks = await this.models.Task
        .find({
          assignedTo: memberId,
          status: { $in: ['not_started', 'in_progress'] },
          isActive: true
        })
        .populate('project', 'name status')
        .sort({ dueDate: 1 });

      const workloadData = {
        teamMember: {
          _id: teamMember._id,
          name: teamMember.name,
          email: teamMember.email,
          role: teamMember.role
        },
        workload: teamMember.workload,
        capacity: teamMember.capacity,
        availabilityStatus: teamMember.availabilityStatus,
        assignedTasks: assignedTasks.map((t: any) => t.toObject()),
        currentProjects: teamMember.currentProjects
      };

      return {
        status: 'success',
        data: workloadData
      };
    } catch (error) {
      logger.error('Error fetching team member workload', error as Error, { memberId });
      return {
        status: 'error',
        error_message: `Failed to fetch team member workload: ${(error as Error).message}`
      };
    }
  }
}
