#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { getDatabase, getDatabaseConfig } from './utils/database.js';
import { logger } from './utils/logger.js';
import {
  validateInput,
  projectOperationsSchema,
  taskOperationsSchema,
  teamOperationsSchema,
  searchOperationsSchema,
  analyticsOperationsSchema,
  assignmentOperationsSchema
} from './utils/validation.js';
import { ProjectService } from './services/ProjectService.js';
import { TaskService } from './services/TaskService.js';
import { TeamMemberService } from './services/TeamMemberService.js';
import { SearchService } from './services/SearchService.js';
import { AnalyticsService } from './services/AnalyticsService.js';
import { AssignmentService } from './services/AssignmentService.js';
import { MCPResponse } from './types/index.js';

// Service instances
const projectService = new ProjectService();
const taskService = new TaskService();
const teamMemberService = new TeamMemberService();
const searchService = new SearchService();
const analyticsService = new AnalyticsService();
const assignmentService = new AssignmentService();

// Server instance
const server = new Server(
  {
    name: 'barka-project-manager',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
const tools: Tool[] = [
  {
    name: 'project_operations',
    description: 'Comprehensive project management operations including create, read, update, delete, search, and team management',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['create', 'get', 'list', 'update', 'delete', 'search', 'get_tasks', 'add_team_member', 'get_status'],
          description: 'The operation to perform'
        },
        project_id: {
          type: 'string',
          description: 'Project ID (required for get, update, delete, get_tasks, add_team_member, get_status)'
        },
        client_id: {
          type: 'string',
          description: 'Client ID for scoping operations'
        },
        organization_id: {
          type: 'string',
          description: 'Organization ID for scoping operations'
        },
        user_id: {
          type: 'string',
          description: 'User ID performing the operation (required for create, update, delete, add_team_member)'
        },
        project_data: {
          type: 'object',
          description: 'Project data for create/update operations'
        },
        team_member_id: {
          type: 'string',
          description: 'Team member ID for add_team_member action'
        },
        search_term: {
          type: 'string',
          description: 'Search term for search action'
        },
        page: {
          type: 'number',
          description: 'Page number for list action (default: 1)'
        },
        limit: {
          type: 'number',
          description: 'Items per page for list action (default: 20)'
        },
        filters: {
          type: 'object',
          description: 'Additional filters for list action'
        }
      },
      required: ['action']
    }
  },
  {
    name: 'task_operations',
    description: 'Comprehensive task management operations including create, read, update, delete, assign, comment, and status updates',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['create', 'get', 'list', 'update', 'delete', 'assign', 'add_comment', 'update_status', 'search'],
          description: 'The operation to perform'
        },
        task_id: {
          type: 'string',
          description: 'Task ID (required for get, update, delete, assign, add_comment, update_status)'
        },
        client_id: {
          type: 'string',
          description: 'Client ID for scoping operations'
        },
        organization_id: {
          type: 'string',
          description: 'Organization ID for scoping operations'
        },
        project_id: {
          type: 'string',
          description: 'Project ID for filtering tasks'
        },
        user_id: {
          type: 'string',
          description: 'User ID performing the operation (required for create, update, delete, assign, add_comment, update_status)'
        },
        task_data: {
          type: 'object',
          description: 'Task data for create/update operations'
        },
        team_member_id: {
          type: 'string',
          description: 'Team member ID for assign action'
        },
        comment_content: {
          type: 'string',
          description: 'Comment content for add_comment action'
        },
        new_status: {
          type: 'string',
          description: 'New status for update_status action'
        },
        status_comment: {
          type: 'string',
          description: 'Optional comment for status update'
        },
        search_term: {
          type: 'string',
          description: 'Search term for search action'
        },
        assignee_id: {
          type: 'string',
          description: 'Filter tasks by assignee'
        },
        status: {
          type: 'string',
          description: 'Filter tasks by status'
        },
        page: {
          type: 'number',
          description: 'Page number for list action (default: 1)'
        },
        limit: {
          type: 'number',
          description: 'Items per page for list action (default: 20)'
        },
        filters: {
          type: 'object',
          description: 'Additional filters for list action'
        }
      },
      required: ['action']
    }
  },
  {
    name: 'team_operations',
    description: 'Comprehensive team member management operations including create, read, update, delete, availability, skills, and workload management',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['create', 'get', 'list', 'update', 'delete', 'get_available', 'update_skills', 'get_workload'],
          description: 'The operation to perform'
        },
        member_id: {
          type: 'string',
          description: 'Team member ID (required for get, update, delete, update_skills, get_workload)'
        },
        client_id: {
          type: 'string',
          description: 'Client ID for scoping operations'
        },
        organization_id: {
          type: 'string',
          description: 'Organization ID for scoping operations'
        },
        user_id: {
          type: 'string',
          description: 'User ID performing the operation (required for create, update, delete, update_skills)'
        },
        member_data: {
          type: 'object',
          description: 'Team member data for create/update operations'
        },
        skills: {
          type: 'array',
          description: 'Skills array for update_skills action'
        },
        expertise: {
          type: 'array',
          description: 'Expertise array for update_skills action'
        },
        skill_required: {
          type: 'string',
          description: 'Required skill for get_available action'
        },
        role: {
          type: 'string',
          description: 'Filter by role'
        },
        status: {
          type: 'string',
          description: 'Filter by status'
        },
        availability: {
          type: 'string',
          description: 'Filter by availability type'
        },
        page: {
          type: 'number',
          description: 'Page number for list action (default: 1)'
        },
        limit: {
          type: 'number',
          description: 'Items per page for list action (default: 20)'
        },
        filters: {
          type: 'object',
          description: 'Additional filters for list action'
        }
      },
      required: ['action']
    }
  },
  {
    name: 'search_operations',
    description: 'Advanced search operations across projects, tasks, and team members with cross-entity search, filtering, and related items discovery',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['cross_search', 'advanced_filter', 'related_items'],
          description: 'The search operation to perform'
        },
        search_term: {
          type: 'string',
          description: 'Search term for cross_search action'
        },
        entity_types: {
          type: 'array',
          description: 'Entity types to search in: projects, tasks, team_members (default: all)'
        },
        client_id: {
          type: 'string',
          description: 'Client ID for scoping search'
        },
        organization_id: {
          type: 'string',
          description: 'Organization ID for scoping search'
        },
        filters: {
          type: 'object',
          description: 'Advanced filters for advanced_filter action'
        },
        entity_id: {
          type: 'string',
          description: 'Entity ID for related_items action'
        },
        entity_type: {
          type: 'string',
          description: 'Entity type for related_items action (project, task, team_member)'
        },
        include_dependencies: {
          type: 'boolean',
          description: 'Include task dependencies in related items'
        },
        page: {
          type: 'number',
          description: 'Page number (default: 1)'
        },
        limit: {
          type: 'number',
          description: 'Items per page (default: 20)'
        }
      },
      required: ['action']
    }
  },
  {
    name: 'analytics_operations',
    description: 'Analytics and reporting operations for project progress, team performance, deadline tracking, and risk analysis',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['project_progress', 'team_performance', 'deadline_tracking', 'risk_analysis'],
          description: 'The analytics operation to perform'
        },
        client_id: {
          type: 'string',
          description: 'Client ID for scoping analytics'
        },
        organization_id: {
          type: 'string',
          description: 'Organization ID for scoping analytics'
        },
        project_id: {
          type: 'string',
          description: 'Project ID for project-specific analytics'
        },
        team_member_id: {
          type: 'string',
          description: 'Team member ID for individual performance analytics'
        },
        date_range: {
          type: 'object',
          description: 'Date range for analytics (start_date, end_date)'
        },
        include_historical: {
          type: 'boolean',
          description: 'Include historical data in analytics'
        },
        group_by: {
          type: 'string',
          description: 'Group analytics by: day, week, month, quarter'
        }
      },
      required: ['action']
    }
  },
  {
    name: 'assignment_operations',
    description: 'Intelligent task assignment operations with skill-based matching, workload balancing, and capacity planning',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['skill_based_assignment', 'workload_balancing', 'capacity_planning'],
          description: 'The assignment operation to perform'
        },
        task_id: {
          type: 'string',
          description: 'Task ID for skill_based_assignment'
        },
        client_id: {
          type: 'string',
          description: 'Client ID for scoping operations'
        },
        organization_id: {
          type: 'string',
          description: 'Organization ID for scoping operations'
        },
        required_skills: {
          type: 'array',
          description: 'Required skills for task assignment'
        },
        priority_level: {
          type: 'string',
          description: 'Priority level for assignment (low, medium, high, urgent)'
        },
        estimated_hours: {
          type: 'number',
          description: 'Estimated hours for the task'
        },
        due_date: {
          type: 'string',
          description: 'Due date for the task (ISO string)'
        },
        team_member_ids: {
          type: 'array',
          description: 'Specific team member IDs to consider for assignment'
        },
        max_utilization: {
          type: 'number',
          description: 'Maximum utilization percentage for workload balancing (default: 90)'
        },
        planning_horizon: {
          type: 'string',
          description: 'Planning horizon for capacity planning (week, month, quarter)'
        }
      },
      required: ['action']
    }
  }
];

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    logger.info('Tool call received', { name, args });

    // Validate database connection
    if (!getDatabase().getConnectionStatus()) {
      throw new Error('Database connection not available');
    }

    let result: MCPResponse<any>;

    switch (name) {
      case 'project_operations':
        // Validate input schema
        const projectValidation = validateInput(projectOperationsSchema, args);
        if (!projectValidation.success) {
          result = {
            status: 'error',
            error_message: projectValidation.error
          };
        } else {
          result = await handleProjectOperations(projectValidation.data);
        }
        break;
      case 'task_operations':
        // Validate input schema
        const taskValidation = validateInput(taskOperationsSchema, args);
        if (!taskValidation.success) {
          result = {
            status: 'error',
            error_message: taskValidation.error
          };
        } else {
          result = await handleTaskOperations(taskValidation.data);
        }
        break;
      case 'team_operations':
        // Validate input schema
        const teamValidation = validateInput(teamOperationsSchema, args);
        if (!teamValidation.success) {
          result = {
            status: 'error',
            error_message: teamValidation.error
          };
        } else {
          result = await handleTeamOperations(teamValidation.data);
        }
        break;
      case 'search_operations':
        // Validate input schema
        const searchValidation = validateInput(searchOperationsSchema, args);
        if (!searchValidation.success) {
          result = {
            status: 'error',
            error_message: searchValidation.error
          };
        } else {
          result = await handleSearchOperations(searchValidation.data);
        }
        break;
      case 'analytics_operations':
        // Validate input schema
        const analyticsValidation = validateInput(analyticsOperationsSchema, args);
        if (!analyticsValidation.success) {
          result = {
            status: 'error',
            error_message: analyticsValidation.error
          };
        } else {
          result = await handleAnalyticsOperations(analyticsValidation.data);
        }
        break;
      case 'assignment_operations':
        // Validate input schema
        const assignmentValidation = validateInput(assignmentOperationsSchema, args);
        if (!assignmentValidation.success) {
          result = {
            status: 'error',
            error_message: assignmentValidation.error
          };
        } else {
          result = await handleAssignmentOperations(assignmentValidation.data);
        }
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    logger.info('Tool call completed', { name, status: result.status });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    logger.error('Tool call failed', error as Error, { name, args });

    const errorResult: MCPResponse<any> = {
      status: 'error',
      error_message: `Tool execution failed: ${(error as Error).message}`
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(errorResult, null, 2)
        }
      ]
    };
  }
});

// Project operations handler
async function handleProjectOperations(args: any): Promise<MCPResponse<any>> {
  const { action, project_id, client_id, organization_id, user_id, project_data, team_member_id, search_term, page, limit, filters } = args;

  switch (action) {
    case 'create':
      if (!project_data || !user_id) {
        throw new Error('project_data and user_id are required for create action');
      }
      return await projectService.createProject({ ...project_data, createdBy: user_id });

    case 'get':
      if (!project_id) {
        throw new Error('project_id is required for get action');
      }
      return await projectService.getProject(project_id, client_id, organization_id);

    case 'list':
      return await projectService.listProjects({ page, limit, filters, clientId: client_id, organizationId: organization_id });

    case 'update':
      if (!project_id || !project_data || !user_id) {
        throw new Error('project_id, project_data, and user_id are required for update action');
      }
      return await projectService.updateProject(project_id, project_data, user_id);

    case 'delete':
      if (!project_id || !user_id) {
        throw new Error('project_id and user_id are required for delete action');
      }
      return await projectService.deleteProject(project_id, user_id);

    case 'search':
      if (!search_term) {
        throw new Error('search_term is required for search action');
      }
      return await projectService.searchProjects(search_term, client_id, organization_id);

    case 'get_tasks':
      if (!project_id) {
        throw new Error('project_id is required for get_tasks action');
      }
      return await projectService.getProjectTasks(project_id);

    case 'add_team_member':
      if (!project_id || !team_member_id || !user_id) {
        throw new Error('project_id, team_member_id, and user_id are required for add_team_member action');
      }
      return await projectService.addTeamMember(project_id, team_member_id, user_id);

    case 'get_status':
      if (!project_id) {
        throw new Error('project_id is required for get_status action');
      }
      return await projectService.getProjectStatus(project_id);

    default:
      throw new Error(`Unknown project action: ${action}`);
  }
}

// Task operations handler
async function handleTaskOperations(args: any): Promise<MCPResponse<any>> {
  const {
    action, task_id, client_id, organization_id, project_id, user_id, task_data,
    team_member_id, comment_content, new_status, status_comment, search_term,
    assignee_id, status, page, limit, filters
  } = args;

  switch (action) {
    case 'create':
      if (!task_data || !user_id) {
        throw new Error('task_data and user_id are required for create action');
      }
      return await taskService.createTask({ ...task_data, createdBy: user_id });

    case 'get':
      if (!task_id) {
        throw new Error('task_id is required for get action');
      }
      return await taskService.getTask(task_id, client_id, organization_id);

    case 'list':
      return await taskService.listTasks({
        page, limit, filters, clientId: client_id, organizationId: organization_id,
        projectId: project_id, assigneeId: assignee_id, status
      });

    case 'update':
      if (!task_id || !task_data || !user_id) {
        throw new Error('task_id, task_data, and user_id are required for update action');
      }
      return await taskService.updateTask(task_id, task_data, user_id);

    case 'delete':
      if (!task_id || !user_id) {
        throw new Error('task_id and user_id are required for delete action');
      }
      return await taskService.deleteTask(task_id, user_id);

    case 'assign':
      if (!task_id || !team_member_id || !user_id) {
        throw new Error('task_id, team_member_id, and user_id are required for assign action');
      }
      return await taskService.assignTask(task_id, team_member_id, user_id);

    case 'add_comment':
      if (!task_id || !comment_content || !user_id) {
        throw new Error('task_id, comment_content, and user_id are required for add_comment action');
      }
      return await taskService.addComment(task_id, user_id, comment_content);

    case 'update_status':
      if (!task_id || !new_status || !user_id) {
        throw new Error('task_id, new_status, and user_id are required for update_status action');
      }
      return await taskService.updateStatus(task_id, new_status, user_id, status_comment);

    case 'search':
      if (!search_term) {
        throw new Error('search_term is required for search action');
      }
      return await taskService.searchTasks(search_term, client_id, organization_id);

    default:
      throw new Error(`Unknown task action: ${action}`);
  }
}

// Team operations handler
async function handleTeamOperations(args: any): Promise<MCPResponse<any>> {
  const {
    action, member_id, client_id, organization_id, user_id, member_data,
    skills, expertise, skill_required, role, status, availability, page, limit, filters
  } = args;

  switch (action) {
    case 'create':
      if (!member_data || !user_id) {
        throw new Error('member_data and user_id are required for create action');
      }
      return await teamMemberService.createTeamMember({ ...member_data, createdBy: user_id });

    case 'get':
      if (!member_id) {
        throw new Error('member_id is required for get action');
      }
      return await teamMemberService.getTeamMember(member_id, client_id, organization_id);

    case 'list':
      return await teamMemberService.listTeamMembers({
        page, limit, filters, clientId: client_id, organizationId: organization_id,
        role, status, availability
      });

    case 'update':
      if (!member_id || !member_data || !user_id) {
        throw new Error('member_id, member_data, and user_id are required for update action');
      }
      return await teamMemberService.updateTeamMember(member_id, member_data, user_id);

    case 'delete':
      if (!member_id || !user_id) {
        throw new Error('member_id and user_id are required for delete action');
      }
      return await teamMemberService.deleteTeamMember(member_id, user_id);

    case 'get_available':
      return await teamMemberService.getAvailableTeamMembers(client_id, organization_id, skill_required);

    case 'update_skills':
      if (!member_id || !user_id) {
        throw new Error('member_id and user_id are required for update_skills action');
      }
      return await teamMemberService.updateSkills(member_id, skills || [], expertise || [], user_id);

    case 'get_workload':
      if (!member_id) {
        throw new Error('member_id is required for get_workload action');
      }
      return await teamMemberService.getWorkload(member_id);

    default:
      throw new Error(`Unknown team action: ${action}`);
  }
}

// Search operations handler
async function handleSearchOperations(args: any): Promise<MCPResponse<any>> {
  const { action, search_term, entity_types, client_id, organization_id, filters, entity_id, entity_type, include_dependencies, page, limit } = args;

  switch (action) {
    case 'cross_search':
      if (!search_term) {
        throw new Error('search_term is required for cross_search action');
      }
      return await searchService.crossSearch(search_term, entity_types, client_id, organization_id, page, limit);

    case 'advanced_filter':
      if (!filters) {
        throw new Error('filters are required for advanced_filter action');
      }
      return await searchService.advancedFilter(filters, client_id, organization_id);

    case 'related_items':
      if (!entity_id || !entity_type) {
        throw new Error('entity_id and entity_type are required for related_items action');
      }
      return await searchService.getRelatedItems(entity_id, entity_type, include_dependencies);

    default:
      throw new Error(`Unknown search action: ${action}`);
  }
}

// Analytics operations handler
async function handleAnalyticsOperations(args: any): Promise<MCPResponse<any>> {
  const { action, client_id, organization_id, project_id, team_member_id, date_range, include_historical, group_by } = args;

  switch (action) {
    case 'project_progress':
      return await analyticsService.getProjectProgress(client_id, organization_id, project_id, date_range, group_by);

    case 'team_performance':
      return await analyticsService.getTeamPerformance(client_id, organization_id, team_member_id, date_range);

    case 'deadline_tracking':
      return await analyticsService.getDeadlineTracking(client_id, organization_id);

    case 'risk_analysis':
      return await analyticsService.getRiskAnalysis(client_id, organization_id);

    default:
      throw new Error(`Unknown analytics action: ${action}`);
  }
}

// Assignment operations handler
async function handleAssignmentOperations(args: any): Promise<MCPResponse<any>> {
  const {
    action, task_id, client_id, organization_id, required_skills, priority_level,
    estimated_hours, due_date, team_member_ids, max_utilization, planning_horizon
  } = args;

  switch (action) {
    case 'skill_based_assignment':
      if (!task_id && !required_skills) {
        throw new Error('Either task_id or required_skills must be provided for skill_based_assignment action');
      }
      return await assignmentService.getSkillBasedAssignment(
        task_id, required_skills, priority_level, estimated_hours,
        due_date ? new Date(due_date) : undefined, client_id, organization_id, team_member_ids
      );

    case 'workload_balancing':
      return await assignmentService.getWorkloadBalancing(client_id, organization_id, max_utilization);

    case 'capacity_planning':
      return await assignmentService.getCapacityPlanning(planning_horizon, client_id, organization_id);

    default:
      throw new Error(`Unknown assignment action: ${action}`);
  }
}

// Initialize and start server
async function main() {
  try {
    logger.info('Starting Barka MCP Server...');

    // Connect to database
    const dbConfig = getDatabaseConfig();
    await getDatabase().connect(dbConfig);
    logger.info('Database connected successfully');

    // Start server
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info('MCP Server started successfully');

  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  try {
    await getDatabase().disconnect();
    logger.info('Database disconnected');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', error as Error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  try {
    await getDatabase().disconnect();
    logger.info('Database disconnected');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', error as Error);
    process.exit(1);
  }
});

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error('Unhandled error in main', error as Error);
    process.exit(1);
  });
}
