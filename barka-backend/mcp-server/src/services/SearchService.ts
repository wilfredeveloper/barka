import { Types } from 'mongoose';
import { MCPResponse, QueryOptions } from '../types/index.js';
import { getModels } from '../utils/database.js';
import { logger } from '../utils/logger.js';

export class SearchService {
  private models = getModels();

  /**
   * Cross-entity search across projects, tasks, and team members
   */
  async crossSearch(
    searchTerm: string, 
    entityTypes: string[] = ['projects', 'tasks', 'team_members'],
    clientId?: string, 
    organizationId?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<MCPResponse<any>> {
    try {
      logger.info('Performing cross-entity search', { searchTerm, entityTypes, clientId, organizationId });

      const results: any = {
        search_term: searchTerm,
        total_results: 0,
        results_by_type: {}
      };

      const baseQuery: any = {};
      if (clientId) baseQuery.client = clientId;
      if (organizationId) baseQuery.organization = organizationId;
      baseQuery.isActive = true;

      const searchRegex = new RegExp(searchTerm, 'i');

      // Search projects
      if (entityTypes.includes('projects')) {
        const projectQuery = {
          ...baseQuery,
          $or: [
            { name: searchRegex },
            { description: searchRegex },
            { tags: { $in: [searchRegex] } }
          ]
        };

        const projects = await this.models.Project
          .find(projectQuery)
          .populate('projectManager', 'name email')
          .populate('teamMembers', 'name email role')
          .limit(limit)
          .sort({ updatedAt: -1 });

        results.results_by_type.projects = {
          count: projects.length,
          items: projects.map((p: any) => ({
            id: p._id,
            type: 'project',
            name: p.name,
            description: p.description,
            status: p.status,
            priority: p.priority,
            progress: p.progress?.completionPercentage || 0,
            dueDate: p.dueDate,
            projectManager: p.projectManager?.name,
            teamSize: p.teamMembers?.length || 0
          }))
        };
        results.total_results += projects.length;
      }

      // Search tasks
      if (entityTypes.includes('tasks')) {
        const taskQuery = {
          ...baseQuery,
          $or: [
            { name: searchRegex },
            { description: searchRegex },
            { tags: { $in: [searchRegex] } },
            { category: searchRegex }
          ]
        };

        const tasks = await this.models.Task
          .find(taskQuery)
          .populate('project', 'name status')
          .populate('assignedTo', 'name email')
          .limit(limit)
          .sort({ updatedAt: -1 });

        results.results_by_type.tasks = {
          count: tasks.length,
          items: tasks.map((t: any) => ({
            id: t._id,
            type: 'task',
            name: t.name,
            description: t.description,
            status: t.status,
            priority: t.priority,
            progress: t.progress?.completionPercentage || 0,
            dueDate: t.dueDate,
            assignedTo: t.assignedTo?.name,
            project: t.project?.name,
            estimatedHours: t.estimatedHours
          }))
        };
        results.total_results += tasks.length;
      }

      // Search team members
      if (entityTypes.includes('team_members')) {
        const memberQuery = {
          ...baseQuery,
          $or: [
            { name: searchRegex },
            { email: searchRegex },
            { department: searchRegex },
            { title: searchRegex },
            { skills: { $in: [searchRegex] } }
          ]
        };

        const members = await this.models.TeamMember
          .find(memberQuery)
          .populate('currentProjects', 'name status')
          .limit(limit)
          .sort({ updatedAt: -1 });

        results.results_by_type.team_members = {
          count: members.length,
          items: members.map((m: any) => ({
            id: m._id,
            type: 'team_member',
            name: m.name,
            email: m.email,
            role: m.role,
            status: m.status,
            department: m.department,
            title: m.title,
            skills: m.skills,
            utilization: m.workload?.utilizationPercentage || 0,
            currentProjects: m.currentProjects?.length || 0
          }))
        };
        results.total_results += members.length;
      }

      logger.info('Cross-entity search completed', { totalResults: results.total_results });

      return {
        status: 'success',
        data: results,
        metadata: {
          page,
          limit,
          total: results.total_results
        }
      };
    } catch (error) {
      logger.error('Error performing cross-entity search', error as Error, { searchTerm });
      return {
        status: 'error',
        error_message: `Failed to perform cross-entity search: ${(error as Error).message}`
      };
    }
  }

  /**
   * Advanced filtering across entities
   */
  async advancedFilter(filters: Record<string, any>, clientId?: string, organizationId?: string): Promise<MCPResponse<any>> {
    try {
      logger.info('Performing advanced filter', { filters, clientId, organizationId });

      const results: any = {
        filters_applied: filters,
        results: {}
      };

      const baseQuery: any = { isActive: true };
      if (clientId) baseQuery.client = clientId;
      if (organizationId) baseQuery.organization = organizationId;

      // Apply filters to projects
      if (filters.entity_types?.includes('projects') || !filters.entity_types) {
        const projectQuery = { ...baseQuery };
        
        if (filters.status) projectQuery.status = filters.status;
        if (filters.priority) projectQuery.priority = filters.priority;
        if (filters.date_range) {
          if (filters.date_range.start_date) projectQuery.startDate = { $gte: new Date(filters.date_range.start_date) };
          if (filters.date_range.end_date) projectQuery.dueDate = { $lte: new Date(filters.date_range.end_date) };
        }
        if (filters.progress_range) {
          projectQuery['progress.completionPercentage'] = {
            $gte: filters.progress_range.min || 0,
            $lte: filters.progress_range.max || 100
          };
        }

        const projects = await this.models.Project
          .find(projectQuery)
          .populate('projectManager', 'name email')
          .sort({ updatedAt: -1 });

        results.results.projects = projects.map((p: any) => p.toObject());
      }

      // Apply filters to tasks
      if (filters.entity_types?.includes('tasks') || !filters.entity_types) {
        const taskQuery = { ...baseQuery };
        
        if (filters.status) taskQuery.status = filters.status;
        if (filters.priority) taskQuery.priority = filters.priority;
        if (filters.assignedTo) taskQuery.assignedTo = filters.assignedTo;
        if (filters.project) taskQuery.project = filters.project;
        if (filters.complexity) taskQuery.complexity = filters.complexity;

        const tasks = await this.models.Task
          .find(taskQuery)
          .populate('project', 'name status')
          .populate('assignedTo', 'name email')
          .sort({ updatedAt: -1 });

        results.results.tasks = tasks.map((t: any) => t.toObject());
      }

      // Apply filters to team members
      if (filters.entity_types?.includes('team_members') || !filters.entity_types) {
        const memberQuery = { ...baseQuery };
        
        if (filters.role) memberQuery.role = filters.role;
        if (filters.status) memberQuery.status = filters.status;
        if (filters.department) memberQuery.department = filters.department;
        if (filters.skills) {
          memberQuery.skills = { $in: Array.isArray(filters.skills) ? filters.skills : [filters.skills] };
        }
        if (filters.utilization_range) {
          memberQuery['workload.utilizationPercentage'] = {
            $gte: filters.utilization_range.min || 0,
            $lte: filters.utilization_range.max || 100
          };
        }

        const members = await this.models.TeamMember
          .find(memberQuery)
          .populate('currentProjects', 'name status')
          .sort({ updatedAt: -1 });

        results.results.team_members = members.map((m: any) => m.toObject());
      }

      return {
        status: 'success',
        data: results
      };
    } catch (error) {
      logger.error('Error performing advanced filter', error as Error, { filters });
      return {
        status: 'error',
        error_message: `Failed to perform advanced filter: ${(error as Error).message}`
      };
    }
  }

  /**
   * Get related items for a specific entity
   */
  async getRelatedItems(
    entityId: string, 
    entityType: 'project' | 'task' | 'team_member',
    includeDependencies: boolean = false
  ): Promise<MCPResponse<any>> {
    try {
      logger.info('Getting related items', { entityId, entityType, includeDependencies });

      const results: any = {
        entity_id: entityId,
        entity_type: entityType,
        related_items: {}
      };

      switch (entityType) {
        case 'project':
          // Get project details
          const project = await this.models.Project
            .findById(entityId)
            .populate('teamMembers', 'name email role')
            .populate('projectManager', 'name email');

          if (!project) {
            return {
              status: 'error',
              error_message: 'Project not found'
            };
          }

          results.entity = project.toObject();

          // Get related tasks
          const projectTasks = await this.models.Task
            .find({ project: entityId, isActive: true })
            .populate('assignedTo', 'name email');

          results.related_items.tasks = projectTasks.map((t: any) => t.toObject());
          results.related_items.team_members = project.teamMembers;

          break;

        case 'task':
          // Get task details
          const task = await this.models.Task
            .findById(entityId)
            .populate('project', 'name status')
            .populate('assignedTo', 'name email')
            .populate('dependsOn', 'name status')
            .populate('blockedBy', 'name status')
            .populate('subtasks', 'name status');

          if (!task) {
            return {
              status: 'error',
              error_message: 'Task not found'
            };
          }

          results.entity = task.toObject();
          results.related_items.project = task.project;
          results.related_items.assignee = task.assignedTo;

          if (includeDependencies) {
            results.related_items.dependencies = task.dependsOn;
            results.related_items.blocking_tasks = task.blockedBy;
            results.related_items.subtasks = task.subtasks;
          }

          break;

        case 'team_member':
          // Get team member details
          const member = await this.models.TeamMember
            .findById(entityId)
            .populate('currentProjects', 'name status');

          if (!member) {
            return {
              status: 'error',
              error_message: 'Team member not found'
            };
          }

          results.entity = member.toObject();

          // Get assigned tasks
          const assignedTasks = await this.models.Task
            .find({ assignedTo: entityId, isActive: true })
            .populate('project', 'name status');

          results.related_items.assigned_tasks = assignedTasks.map((t: any) => t.toObject());
          results.related_items.projects = member.currentProjects;

          break;

        default:
          return {
            status: 'error',
            error_message: `Unknown entity type: ${entityType}`
          };
      }

      return {
        status: 'success',
        data: results
      };
    } catch (error) {
      logger.error('Error getting related items', error as Error, { entityId, entityType });
      return {
        status: 'error',
        error_message: `Failed to get related items: ${(error as Error).message}`
      };
    }
  }
}
