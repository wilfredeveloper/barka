import { z } from 'zod';
import { Types } from 'mongoose';

// MongoDB ObjectId validation
export const objectIdSchema = z.string().refine(
  (val) => Types.ObjectId.isValid(val),
  { message: 'Invalid ObjectId format' }
);

// Common validation schemas
export const paginationSchema = z.object({
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(20),
  sort: z.string().optional().default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc')
});

// Project validation schemas
export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  client: objectIdSchema.optional(), // Optional - projects can exist at organization level
  organization: objectIdSchema,
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  startDate: z.string().datetime().or(z.date()),
  dueDate: z.string().datetime().or(z.date()),
  budget: z.number().min(0).optional(),
  currency: z.string().optional(),
  projectManager: objectIdSchema.optional(),
  teamMembers: z.array(objectIdSchema).optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.any()).optional()
});

export const updateProjectSchema = createProjectSchema.partial();

// Task validation schemas
export const createTaskSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  project: objectIdSchema,
  client: objectIdSchema,
  organization: objectIdSchema,
  status: z.enum(['not_started', 'in_progress', 'blocked', 'under_review', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  complexity: z.enum(['simple', 'medium', 'complex', 'very_complex']).optional(),
  assignedTo: objectIdSchema.optional(),
  dueDate: z.string().datetime().or(z.date()).optional(),
  startDate: z.string().datetime().or(z.date()).optional(),
  estimatedHours: z.number().min(0).optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  customFields: z.record(z.any()).optional()
});

export const updateTaskSchema = createTaskSchema.partial();

// Team member validation schemas
export const createTeamMemberSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  client: objectIdSchema.optional(), // Optional - team members can exist at organization level
  organization: objectIdSchema,
  role: z.enum(['project_manager', 'developer', 'designer', 'qa_engineer', 'business_analyst', 'stakeholder', 'client', 'other']),
  customRole: z.string().optional(),
  status: z.enum(['active', 'inactive', 'on_leave']).optional(),
  phone: z.string().optional(),
  department: z.string().optional(),
  title: z.string().optional(),
  capacity: z.object({
    hoursPerWeek: z.number().min(0).max(168).optional(),
    availability: z.enum(['full_time', 'part_time', 'contract', 'consultant']).optional(),
    timezone: z.string().optional(),
    workingHours: z.object({
      start: z.string().optional(),
      end: z.string().optional()
    }).optional()
  }).optional(),
  skills: z.array(z.string()).optional(),
  expertise: z.array(z.object({
    skill: z.string(),
    level: z.enum(['beginner', 'intermediate', 'advanced', 'expert'])
  })).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  customFields: z.record(z.any()).optional()
});

export const updateTeamMemberSchema = createTeamMemberSchema.partial();

// Tool action validation schemas
export const projectOperationsSchema = z.object({
  action: z.enum(['create', 'get', 'list', 'update', 'delete', 'search', 'get_tasks', 'add_team_member', 'get_status']),
  project_id: objectIdSchema.optional(),
  client_id: objectIdSchema.optional(),
  organization_id: objectIdSchema.optional(),
  user_id: objectIdSchema.optional(),
  project_data: z.any().optional(),
  team_member_id: objectIdSchema.optional(),
  search_term: z.string().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
  filters: z.record(z.any()).optional()
});

export const taskOperationsSchema = z.object({
  action: z.enum(['create', 'get', 'list', 'update', 'delete', 'assign', 'add_comment', 'update_status', 'search']),
  task_id: objectIdSchema.optional(),
  client_id: objectIdSchema.optional(),
  organization_id: objectIdSchema.optional(),
  project_id: objectIdSchema.optional(),
  user_id: objectIdSchema.optional(),
  task_data: z.any().optional(),
  team_member_id: objectIdSchema.optional(),
  comment_content: z.string().optional(),
  new_status: z.string().optional(),
  status_comment: z.string().optional(),
  search_term: z.string().optional(),
  assignee_id: objectIdSchema.optional(),
  status: z.string().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
  filters: z.record(z.any()).optional()
});

export const teamOperationsSchema = z.object({
  action: z.enum(['create', 'get', 'list', 'update', 'delete', 'get_available', 'update_skills', 'get_workload']),
  member_id: objectIdSchema.optional(),
  client_id: objectIdSchema.optional(),
  organization_id: objectIdSchema.optional(),
  user_id: objectIdSchema.optional(),
  member_data: z.any().optional(),
  skills: z.array(z.string()).optional(),
  expertise: z.array(z.object({
    skill: z.string(),
    level: z.enum(['beginner', 'intermediate', 'advanced', 'expert'])
  })).optional(),
  skill_required: z.string().optional(),
  role: z.string().optional(),
  status: z.string().optional(),
  availability: z.string().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
  filters: z.record(z.any()).optional()
});

export const searchOperationsSchema = z.object({
  action: z.enum(['cross_search', 'advanced_filter', 'related_items']),
  search_term: z.string().optional(),
  entity_types: z.array(z.enum(['projects', 'tasks', 'team_members'])).optional(),
  client_id: objectIdSchema.optional(),
  organization_id: objectIdSchema.optional(),
  filters: z.record(z.any()).optional(),
  entity_id: objectIdSchema.optional(),
  entity_type: z.enum(['project', 'task', 'team_member']).optional(),
  include_dependencies: z.boolean().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional()
});

export const analyticsOperationsSchema = z.object({
  action: z.enum(['project_progress', 'team_performance', 'deadline_tracking', 'risk_analysis']),
  client_id: objectIdSchema.optional(),
  organization_id: objectIdSchema.optional(),
  project_id: objectIdSchema.optional(),
  team_member_id: objectIdSchema.optional(),
  date_range: z.object({
    start_date: z.string().datetime().or(z.date()),
    end_date: z.string().datetime().or(z.date())
  }).optional(),
  include_historical: z.boolean().optional(),
  group_by: z.enum(['day', 'week', 'month', 'quarter']).optional()
});

export const assignmentOperationsSchema = z.object({
  action: z.enum(['skill_based_assignment', 'workload_balancing', 'capacity_planning']),
  task_id: objectIdSchema.optional(),
  client_id: objectIdSchema.optional(),
  organization_id: objectIdSchema.optional(),
  required_skills: z.array(z.string()).optional(),
  priority_level: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  estimated_hours: z.number().min(0).optional(),
  due_date: z.string().datetime().or(z.date()).optional(),
  team_member_ids: z.array(objectIdSchema).optional(),
  max_utilization: z.number().min(0).max(100).optional(),
  planning_horizon: z.enum(['week', 'month', 'quarter']).optional()
});

// Validation helper functions
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      return { success: false, error: `Validation failed: ${errorMessages}` };
    }
    return { success: false, error: 'Unknown validation error' };
  }
}

export function validateObjectId(id: string, fieldName: string = 'id'): { success: true; data: string } | { success: false; error: string } {
  if (!Types.ObjectId.isValid(id)) {
    return { success: false, error: `Invalid ${fieldName}: must be a valid ObjectId` };
  }
  return { success: true, data: id };
}

export function validateRequiredFields(data: Record<string, any>, requiredFields: string[]): { success: true } | { success: false; error: string } {
  const missingFields = requiredFields.filter(field => !data[field]);
  if (missingFields.length > 0) {
    return { success: false, error: `Missing required fields: ${missingFields.join(', ')}` };
  }
  return { success: true };
}
