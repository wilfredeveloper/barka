import api from '../api';

export interface Project {
  _id: string;
  id: string;
  name: string;
  description?: string;
  client?: {
    _id: string;
    user?: {
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  } | string;
  organization?: {
    _id: string;
    name: string;
    id: string;
  };
  startDate?: string;
  dueDate?: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  budget?: number;
  currency?: string;
  progress?: {
    completionPercentage: number;
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    notStartedTasks: number;
  };
  teamMembers?: string[];
  milestones?: Array<{
    name: string;
    dueDate: string;
    status: 'pending' | 'completed';
  }>;
  tags?: string[];
  linkedDocuments?: any[];
  calendarEvents?: any[];
  isActive?: boolean;
  isArchived?: boolean;
  createdBy?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  lastModifiedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  documents?: any[];
  statusHistory?: Array<{
    status: string;
    timestamp: string;
    changedBy: string;
    reason?: string;
    _id: string;
    id: string;
  }>;
  daysRemaining?: number;
  deadlineStatus?: string;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

export interface CreateProjectData {
  name: string;
  description: string;
  clientId?: string;
  startDate: string;
  dueDate: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  budget?: number;
  tags?: string[];
  teamMembers?: string[];
}

export interface UpdateProjectData extends Partial<CreateProjectData> {
  status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  progress?: number;
  clientId?: string | null;
}

export interface ProjectFilters {
  status?: string;
  priority?: string;
  client?: string;
  limit?: number;
  offset?: number;
  search?: string;
}

export interface ProjectStats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  completionRate: number;
  averageProgress: number;
  budgetAnalysis: {
    totalBudget: number;
    averageBudget: number;
  };
}

class ProjectsApi {
  // Get all projects
  async getProjects(filters?: ProjectFilters): Promise<{ projects: Project[]; total: number }> {
    try {
      const response = await api.get('/projects', { params: filters });
      // Backend returns: { success, count, totalProjects, data: [...] }
      return {
        projects: response.data.data || [],
        total: response.data.totalProjects || response.data.count || 0
      };
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  }

  // Get single project
  async getProject(id: string): Promise<Project> {
    try {
      const response = await api.get(`/projects/${id}`);
      // Backend returns { success: true, data: Project }
      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch project');
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      throw error;
    }
  }

  // Create new project
  async createProject(data: CreateProjectData): Promise<Project> {
    try {
      const response = await api.post('/projects', data);
      // Backend returns { success: true, data: Project }
      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to create project');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  // Update project
  async updateProject(id: string, data: UpdateProjectData): Promise<Project> {
    try {
      const response = await api.put(`/projects/${id}`, data);
      // Backend returns { success: true, data: Project }
      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to update project');
      }
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  // Delete project with password validation (soft delete)
  async deleteProject(id: string, password: string, reason?: string): Promise<{
    success: boolean;
    message: string;
    data: {
      id: string;
      name: string;
      trashId: string;
      autoDeleteDate: string;
      daysUntilDeletion: number;
    };
  }> {
    try {
      const response = await api.delete(`/projects/${id}`, {
        data: {
          password,
          reason
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }

  // Validate admin password
  async validateAdminPassword(password: string): Promise<void> {
    try {
      await api.post('/auth/validate-password', { password });
    } catch (error) {
      console.error('Error validating password:', error);
      throw error;
    }
  }

  // Recover project from trash
  async recoverProject(trashId: string, password: string): Promise<Project> {
    try {
      const response = await api.post(`/projects/recover/${trashId}`, { password });
      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to recover project');
      }
    } catch (error) {
      console.error('Error recovering project:', error);
      throw error;
    }
  }

  // Update project status
  async updateProjectStatus(id: string, status: Project['status'], reason?: string): Promise<Project> {
    try {
      const response = await api.put(`/projects/${id}/status`, { status, reason });
      // Backend returns { success: true, data: Project }
      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to update project status');
      }
    } catch (error) {
      console.error('Error updating project status:', error);
      throw error;
    }
  }

  // Update project progress
  async updateProjectProgress(id: string): Promise<Project> {
    try {
      const response = await api.put(`/projects/${id}/progress`);
      // Backend returns { success: true, data: Project }
      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to update project progress');
      }
    } catch (error) {
      console.error('Error updating project progress:', error);
      throw error;
    }
  }

  // Get project tasks
  async getProjectTasks(id: string, filters?: { status?: string; assignee?: string; priority?: string }) {
    try {
      const response = await api.get(`/projects/${id}/tasks`, { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching project tasks:', error);
      throw error;
    }
  }

  // Get project team
  async getProjectTeam(id: string) {
    try {
      const response = await api.get(`/projects/${id}/team`);
      return response.data;
    } catch (error) {
      console.error('Error fetching project team:', error);
      throw error;
    }
  }

  // Update project team
  async updateProjectTeam(id: string, teamMembers: Array<{ memberId: string; role?: string }>) {
    try {
      const response = await api.put(`/projects/${id}/team`, { teamMembers });
      return response.data;
    } catch (error) {
      console.error('Error updating project team:', error);
      throw error;
    }
  }

  // Get project timeline
  async getProjectTimeline(id: string) {
    try {
      const response = await api.get(`/projects/${id}/timeline`);
      return response.data;
    } catch (error) {
      console.error('Error fetching project timeline:', error);
      throw error;
    }
  }

  // Update project milestones
  async updateProjectMilestones(id: string, milestones: Project['milestones']) {
    try {
      const response = await api.put(`/projects/${id}/milestones`, { milestones });
      return response.data;
    } catch (error) {
      console.error('Error updating project milestones:', error);
      throw error;
    }
  }

  // Get project statistics
  async getProjectStats(): Promise<ProjectStats> {
    try {
      const response = await api.get('/projects/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching project stats:', error);
      throw error;
    }
  }

  // Search projects
  async searchProjects(query: string, filters?: Omit<ProjectFilters, 'search'>) {
    try {
      const response = await api.get('/projects/search', { 
        params: { q: query, ...filters } 
      });
      return response.data;
    } catch (error) {
      console.error('Error searching projects:', error);
      throw error;
    }
  }

  // Get projects by status
  async getProjectsByStatus(status: string) {
    try {
      const response = await api.get(`/projects/by-status/${status}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching projects by status:', error);
      throw error;
    }
  }

  // Get overdue projects
  async getOverdueProjects() {
    try {
      const response = await api.get('/projects/overdue');
      return response.data;
    } catch (error) {
      console.error('Error fetching overdue projects:', error);
      throw error;
    }
  }

  // Get projects due soon
  async getProjectsDueSoon(days: number = 7) {
    try {
      const response = await api.get('/projects/due-soon', { params: { days } });
      return response.data;
    } catch (error) {
      console.error('Error fetching projects due soon:', error);
      throw error;
    }
  }
}

export const projectsApi = new ProjectsApi();
