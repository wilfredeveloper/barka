import api from '../api';

export interface Task {
  _id: string;
  name: string;
  description: string;
  client: {
    _id: string;
    name?: string;
  };
  organization: {
    _id: string;
    name?: string;
  };
  project: {
    _id: string;
    name?: string;
  };
  assignedTo?: {
    _id: string;
    name?: string;
    email?: string;
    role?: string;
    displayRole?: string;
    capacity?: {
      workingHours?: {
        start: string;
        end: string;
      };
      hoursPerWeek?: number;
      availability?: string;
      timezone?: string;
    };
    id?: string;
  };
  assignedToName?: string;
  status: 'not_started' | 'in_progress' | 'blocked' | 'under_review' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  complexity: 'simple' | 'medium' | 'complex' | 'very_complex';
  dueDate?: string;
  startDate?: string;
  completedAt?: string;
  estimatedHours?: number;
  actualHours?: number;
  progress?: {
    completionPercentage: number;
    timeSpent: number;
    remainingWork: number;
  };
  dependsOn?: string[];
  blockedBy?: string[];
  subtasks?: string[];
  parentTask?: string;
  acceptanceCriteria?: Array<{
    description: string;
    isCompleted: boolean;
    completedAt?: string;
    completedBy?: string;
  }>;
  requirements?: string[];
  deliverables?: Array<{
    name: string;
    description: string;
    isDelivered: boolean;
    deliveredAt?: string;
  }>;
  comments?: Array<{
    _id: string;
    content: string;
    author: string | {
      _id: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      role?: string;
    };
    createdAt: string;
  }>;
  statusHistory?: Array<{
    status: string;
    timestamp: string;
    changedBy: string;
    comment?: string;
  }>;
  tags?: string[];
  category?: string;
  customFields?: Record<string, any>;
  linkedDocuments?: string[];
  calendarEvent?: string;
  isActive: boolean;
  isArchived: boolean;
  createdBy: {
    _id: string;
    name?: string;
  };
  lastModifiedBy?: {
    _id: string;
    name?: string;
  };
  createdAt: string;
  updatedAt: string;
  // Virtual fields
  daysRemaining?: number;
  deadlineStatus?: string;
  isCompleted?: boolean;
  isBlocked?: boolean;
}

export interface CreateTaskData {
  name: string;
  description: string;
  clientId: string;  // Backend expects 'clientId'
  organizationId: string;  // Backend expects 'organizationId'
  project: string;
  assignedTo?: string;
  assignedToName?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  complexity?: 'simple' | 'medium' | 'complex' | 'very_complex';
  status?: 'not_started' | 'in_progress' | 'blocked' | 'under_review' | 'completed' | 'cancelled';
  dueDate?: string;
  startDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  progress?: {
    completionPercentage?: number;
    timeSpent?: number;
    remainingWork?: number;
  };
  category?: string;
  tags?: string[];
  dependsOn?: string[];
  blockedBy?: string[];
  parentTask?: string;
  acceptanceCriteria?: Array<{
    description: string;
    isCompleted?: boolean;
  }>;
  requirements?: string[];
  deliverables?: Array<{
    name: string;
    description: string;
    isDelivered?: boolean;
  }>;
  customFields?: Record<string, any>;
}

export interface UpdateTaskData extends Partial<CreateTaskData> {
  status?: 'not_started' | 'in_progress' | 'blocked' | 'under_review' | 'completed' | 'cancelled';
  actualHours?: number;
  progress?: {
    completionPercentage?: number;
    timeSpent?: number;
    remainingWork?: number;
  };
  completedAt?: string;
}

export interface TaskFilters {
  client?: string;
  organization?: string;
  project?: string;
  assignee?: string;
  status?: 'not_started' | 'in_progress' | 'blocked' | 'under_review' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  complexity?: 'simple' | 'medium' | 'complex' | 'very_complex';
  category?: string;
  tags?: string[];
  dueDateFrom?: string;
  dueDateTo?: string;
  createdFrom?: string;
  createdTo?: string;
  isActive?: boolean;
  isArchived?: boolean;
  limit?: number;
  offset?: number;
  search?: string;
}

export interface TaskComment {
  content: string;
}

export interface TimeEntry {
  hours: number;
  description?: string;
  date: string;
}

class TasksApi {
  // Get all tasks
  async getTasks(filters?: TaskFilters): Promise<{ tasks: Task[]; total: number }> {
    try {
      const response = await api.get('/tasks', { params: filters });
      const responseData = response.data;

      // Handle different response formats
      if (responseData.data && Array.isArray(responseData.data)) {
        // New format: { success: true, data: [...], totalTasks: number }
        return {
          tasks: responseData.data,
          total: responseData.totalTasks || responseData.count || responseData.data.length
        };
      } else if (responseData.tasks) {
        // Legacy format: { tasks: [...], total: number }
        return responseData;
      } else {
        // Direct array format: [...]
        return {
          tasks: Array.isArray(responseData) ? responseData : [],
          total: Array.isArray(responseData) ? responseData.length : 0
        };
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  }

  // Get single task
  async getTask(id: string): Promise<Task> {
    try {
      const response = await api.get(`/tasks/${id}`);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error fetching task:', error);
      throw error;
    }
  }

  // Create new task
  async createTask(data: CreateTaskData): Promise<Task> {
    try {
      const response = await api.post('/tasks', data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  // Update task
  async updateTask(id: string, data: UpdateTaskData): Promise<Task> {
    try {
      const response = await api.put(`/tasks/${id}`, data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  // Delete task
  async deleteTask(id: string): Promise<void> {
    try {
      await api.delete(`/tasks/${id}`);
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  // Update task status
  async updateTaskStatus(id: string, status: Task['status'], comment?: string): Promise<Task> {
    try {
      const response = await api.put(`/tasks/${id}/status`, { status, comment });
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  }

  // Assign task
  async assignTask(id: string, assignedTo: string, assignedToName: string): Promise<Task> {
    try {
      const response = await api.put(`/tasks/${id}/assign`, { assignedTo, assignedToName });
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error assigning task:', error);
      throw error;
    }
  }

  // Update task progress
  async updateTaskProgress(id: string, completionPercentage: number, timeSpent?: number): Promise<Task> {
    try {
      const response = await api.put(`/tasks/${id}/progress`, {
        completionPercentage,
        timeSpent
      });
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error updating task progress:', error);
      throw error;
    }
  }

  // Add comment to task
  async addTaskComment(id: string, comment: TaskComment): Promise<any> {
    try {
      const response = await api.post(`/tasks/${id}/comments`, comment);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error adding task comment:', error);
      throw error;
    }
  }

  // Get task comments
  async getTaskComments(id: string): Promise<Task['comments']> {
    try {
      const response = await api.get(`/tasks/${id}/comments`);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error fetching task comments:', error);
      throw error;
    }
  }

  // Log time for task
  async logTaskTime(id: string, timeEntry: TimeEntry): Promise<Task> {
    try {
      const response = await api.put(`/tasks/${id}/time`, timeEntry);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error logging task time:', error);
      throw error;
    }
  }

  // Get task history
  async getTaskHistory(id: string) {
    try {
      const response = await api.get(`/tasks/${id}/history`);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error fetching task history:', error);
      throw error;
    }
  }

  // Update task dependencies
  async updateTaskDependencies(id: string, dependsOn: string[], blockedBy: string[]): Promise<Task> {
    try {
      const response = await api.put(`/tasks/${id}/dependencies`, { dependsOn, blockedBy });
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error updating task dependencies:', error);
      throw error;
    }
  }

  // Search tasks
  async searchTasks(query: string, filters?: Omit<TaskFilters, 'search'>) {
    try {
      const response = await api.get('/tasks/search', { 
        params: { q: query, ...filters } 
      });
      return response.data;
    } catch (error) {
      console.error('Error searching tasks:', error);
      throw error;
    }
  }

  // Get tasks by status
  async getTasksByStatus(status: string) {
    try {
      const response = await api.get(`/tasks/by-status/${status}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching tasks by status:', error);
      throw error;
    }
  }

  // Get tasks by assignee
  async getTasksByAssignee(memberId: string) {
    try {
      const response = await api.get(`/tasks/by-assignee/${memberId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching tasks by assignee:', error);
      throw error;
    }
  }

  // Get overdue tasks
  async getOverdueTasks() {
    try {
      const response = await api.get('/tasks/overdue');
      return response.data;
    } catch (error) {
      console.error('Error fetching overdue tasks:', error);
      throw error;
    }
  }

  // Get tasks due today
  async getTasksDueToday() {
    try {
      const response = await api.get('/tasks/due-today');
      return response.data;
    } catch (error) {
      console.error('Error fetching tasks due today:', error);
      throw error;
    }
  }

  // Get unassigned tasks
  async getUnassignedTasks() {
    try {
      const response = await api.get('/tasks/unassigned');
      return response.data;
    } catch (error) {
      console.error('Error fetching unassigned tasks:', error);
      throw error;
    }
  }

  // Get blocked tasks
  async getBlockedTasks() {
    try {
      const response = await api.get('/tasks/blocked');
      return response.data;
    } catch (error) {
      console.error('Error fetching blocked tasks:', error);
      throw error;
    }
  }
}

export const tasksApi = new TasksApi();
