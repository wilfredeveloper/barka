import { Types } from 'mongoose';

// Base interface for all entities
export interface BaseEntity {
  _id?: Types.ObjectId;
  client?: Types.ObjectId; // Optional - entities can exist at organization level
  organization: Types.ObjectId;
  isActive?: boolean;
  createdBy: Types.ObjectId;
  lastModifiedBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

// Project interfaces
export interface IProject extends BaseEntity {
  name: string;
  description: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  startDate: Date;
  dueDate: Date;
  completedAt?: Date;
  budget?: number;
  currency?: string;
  projectManager?: Types.ObjectId;
  progress: {
    completionPercentage: number;
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    notStartedTasks: number;
  };
  teamMembers: Types.ObjectId[];
  documents?: Array<{
    documentId: Types.ObjectId;
    documentType: 'SRS' | 'CONTRACT' | 'PROPOSAL' | 'TECHNICAL_SPEC' | 'OTHER';
    linkedAt: Date;
  }>;
  milestones?: Array<{
    name: string;
    description?: string;
    dueDate?: Date;
    status: 'not_started' | 'in_progress' | 'completed';
    completedAt?: Date;
  }>;
  tags?: string[];
  customFields?: Record<string, any>;
  statusHistory?: Array<{
    status: string;
    timestamp: Date;
    changedBy: Types.ObjectId;
    reason?: string;
  }>;
  isArchived?: boolean;
}

// Task interfaces
export interface ITask extends BaseEntity {
  project: Types.ObjectId;
  name: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'blocked' | 'under_review' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  complexity: 'simple' | 'medium' | 'complex' | 'very_complex';
  assignedTo?: Types.ObjectId;
  assignedToName?: string;
  dueDate?: Date;
  startDate?: Date;
  completedAt?: Date;
  estimatedHours?: number;
  actualHours?: number;
  progress: {
    completionPercentage: number;
    timeSpent: number;
    remainingWork: number;
  };
  dependsOn?: Types.ObjectId[];
  blockedBy?: Types.ObjectId[];
  subtasks?: Types.ObjectId[];
  parentTask?: Types.ObjectId;
  acceptanceCriteria?: Array<{
    description: string;
    isCompleted: boolean;
    completedAt?: Date;
    completedBy?: Types.ObjectId;
  }>;
  requirements?: string[];
  deliverables?: Array<{
    name: string;
    description?: string;
    isDelivered: boolean;
    deliveredAt?: Date;
  }>;
  comments?: Array<{
    author: Types.ObjectId;
    content: string;
    createdAt: Date;
  }>;
  statusHistory?: Array<{
    status: string;
    timestamp: Date;
    changedBy: Types.ObjectId;
    comment?: string;
  }>;
  tags?: string[];
  category?: string;
  customFields?: Record<string, any>;
  linkedDocuments?: Types.ObjectId[];
  calendarEvent?: Types.ObjectId;
  isArchived?: boolean;
}

// TeamMember interfaces
export interface ITeamMember extends BaseEntity {
  name: string;
  email: string;
  role: 'project_manager' | 'developer' | 'designer' | 'qa_engineer' | 'business_analyst' | 'stakeholder' | 'client' | 'other';
  customRole?: string;
  status: 'active' | 'inactive' | 'on_leave';
  phone?: string;
  department?: string;
  title?: string;
  capacity: {
    hoursPerWeek: number;
    availability: 'full_time' | 'part_time' | 'contract' | 'consultant';
    timezone: string;
    workingHours: {
      start: string;
      end: string;
    };
  };
  skills?: string[];
  expertise?: Array<{
    skill: string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  }>;
  certifications?: Array<{
    name: string;
    issuedBy?: string;
    issuedDate?: Date;
    expiryDate?: Date;
  }>;
  currentProjects?: Types.ObjectId[];
  workload: {
    currentTasks: number;
    totalHoursAllocated: number;
    utilizationPercentage: number;
  };
  performance?: {
    tasksCompleted: number;
    averageTaskCompletionTime: number;
    onTimeDeliveryRate: number;
    qualityRating?: number;
  };
  tags?: string[];
  notes?: string;
  customFields?: Record<string, any>;
  statusHistory?: Array<{
    status: string;
    timestamp: Date;
    changedBy: Types.ObjectId;
    reason?: string;
  }>;
  lastActivity?: Date;
}

// MCP Tool response interfaces
export interface MCPResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  error_message?: string;
  metadata?: {
    total?: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
  };
}

// Query interfaces for filtering and pagination
export interface QueryOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}

// Tool action types
export type ProjectAction = 'create' | 'get' | 'list' | 'update' | 'delete' | 'search' | 'get_tasks' | 'add_team_member' | 'get_status';
export type TaskAction = 'create' | 'get' | 'list' | 'update' | 'delete' | 'assign' | 'add_comment' | 'update_status' | 'search';
export type TeamAction = 'create' | 'get' | 'list' | 'update' | 'delete' | 'get_available' | 'update_skills' | 'get_workload';
export type SearchAction = 'cross_search' | 'advanced_filter' | 'related_items';
export type AnalyticsAction = 'project_progress' | 'team_performance' | 'deadline_tracking' | 'risk_analysis';
export type AssignmentAction = 'skill_based_assignment' | 'workload_balancing' | 'capacity_planning';
