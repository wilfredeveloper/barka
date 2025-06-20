import api from '../api';

export interface TeamMember {
  _id: string;
  name: string;
  email: string;
  role: string;
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
  skills: string[];
  expertise: Array<{
    skill: string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  }>;
  certifications: Array<{
    name: string;
    issuedBy?: string;
    issuedDate?: string;
    expiryDate?: string;
  }>;
  currentProjects?: string[];
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
  hourlyRate?: number;
  isActive: boolean;
  lastActivity?: string;
  createdAt: string;
  updatedAt: string;
  // Virtual fields
  displayRole?: string;
  availabilityStatus?: string;
}

export interface CreateTeamMemberData {
  name: string;
  email: string;
  role: string;
  customRole?: string;
  phone?: string;
  department?: string;
  title?: string;
  capacity?: {
    hoursPerWeek?: number;
    availability?: 'full_time' | 'part_time' | 'contract' | 'consultant';
    timezone?: string;
    workingHours?: {
      start?: string;
      end?: string;
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
    issuedDate?: string;
    expiryDate?: string;
  }>;
  tags?: string[];
  notes?: string;
  hourlyRate?: number;
}

export interface UpdateTeamMemberData extends Partial<CreateTeamMemberData> {
  status?: 'active' | 'inactive' | 'on_leave';
}

export interface TeamMemberFilters {
  status?: string;
  role?: string;
  availability?: string;
  skills?: string[];
  limit?: number;
  offset?: number;
  search?: string;
}

export interface WorkloadUpdate {
  currentTasks: number;
  totalHoursAllocated: number;
}

export interface TeamStats {
  total: number;
  byRole: Record<string, number>;
  byStatus: Record<string, number>;
  averageUtilization: number;
  totalCapacity: number;
  totalAllocated: number;
  performanceMetrics: {
    averageScore: number;
    topPerformers: TeamMember[];
  };
}

class TeamApi {
  // Get all team members
  async getTeamMembers(filters?: TeamMemberFilters): Promise<{ members: TeamMember[]; total: number }> {
    try {
      const response = await api.get('/team-members', { params: filters });
      // Transform backend response format to frontend expected format
      return {
        members: response.data.data || [],
        total: response.data.total || 0
      };
    } catch (error) {
      console.error('Error fetching team members:', error);
      throw error;
    }
  }

  // Get single team member
  async getTeamMember(id: string): Promise<TeamMember> {
    try {
      const response = await api.get(`/team-members/${id}`);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error fetching team member:', error);
      throw error;
    }
  }

  // Create new team member
  async createTeamMember(data: CreateTeamMemberData): Promise<TeamMember> {
    try {
      const response = await api.post('/team-members', data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error creating team member:', error);
      throw error;
    }
  }

  // Update team member
  async updateTeamMember(id: string, data: UpdateTeamMemberData): Promise<TeamMember> {
    try {
      const response = await api.put(`/team-members/${id}`, data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error updating team member:', error);
      throw error;
    }
  }

  // Delete team member
  async deleteTeamMember(id: string): Promise<void> {
    try {
      await api.delete(`/team-members/${id}`);
    } catch (error) {
      console.error('Error deleting team member:', error);
      throw error;
    }
  }

  // Get team statistics
  async getTeamStats(): Promise<TeamStats> {
    try {
      const response = await api.get('/team-members/stats');
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error fetching team stats:', error);
      throw error;
    }
  }

  // Update team member workload
  async updateTeamMemberWorkload(id: string, workload: WorkloadUpdate): Promise<TeamMember> {
    try {
      const response = await api.put(`/team-members/${id}/workload`, workload);
      return response.data;
    } catch (error) {
      console.error('Error updating team member workload:', error);
      throw error;
    }
  }

  // Update team member status
  async updateTeamMemberStatus(id: string, status: TeamMember['status']): Promise<TeamMember> {
    try {
      const response = await api.put(`/team-members/${id}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('Error updating team member status:', error);
      throw error;
    }
  }

  // Update team member hourly rate
  async updateTeamMemberHourlyRate(id: string, hourlyRate: number): Promise<TeamMember> {
    try {
      const response = await api.put(`/team-members/${id}/hourly-rate`, { hourlyRate });
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error updating team member hourly rate:', error);
      throw error;
    }
  }

  // Get tasks assigned to team member
  async getTeamMemberTasks(id: string, filters?: { status?: string; project?: string }) {
    try {
      const response = await api.get(`/team-members/${id}/tasks`, { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching team member tasks:', error);
      throw error;
    }
  }

  // Get projects assigned to team member
  async getTeamMemberProjects(id: string) {
    try {
      const response = await api.get(`/team-members/${id}/projects`);
      return response.data;
    } catch (error) {
      console.error('Error fetching team member projects:', error);
      throw error;
    }
  }

  // Update team member skills
  async updateTeamMemberSkills(
    id: string, 
    skills: string[], 
    expertise: string[], 
    certifications: string[]
  ): Promise<TeamMember> {
    try {
      const response = await api.put(`/team-members/${id}/skills`, { 
        skills, 
        expertise, 
        certifications 
      });
      return response.data;
    } catch (error) {
      console.error('Error updating team member skills:', error);
      throw error;
    }
  }

  // Get available team members for assignment
  async getAvailableTeamMembers(filters?: { 
    hoursNeeded?: number; 
    skills?: string[]; 
    role?: string 
  }) {
    try {
      const response = await api.get('/team-members/available', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching available team members:', error);
      throw error;
    }
  }

  // Get team members by role
  async getTeamMembersByRole(role: string) {
    try {
      const response = await api.get(`/team-members/by-role/${role}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching team members by role:', error);
      throw error;
    }
  }

  // Search team members
  async searchTeamMembers(query: string, filters?: Omit<TeamMemberFilters, 'search'>) {
    try {
      const response = await api.get('/team-members/search', { 
        params: { q: query, ...filters } 
      });
      return response.data;
    } catch (error) {
      console.error('Error searching team members:', error);
      throw error;
    }
  }

  // Get team member performance metrics
  async getTeamMemberPerformance(id: string, timeframe?: string) {
    try {
      const response = await api.get(`/team-members/${id}/performance`, { 
        params: { timeframe } 
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching team member performance:', error);
      throw error;
    }
  }

  // Get team workload distribution
  async getTeamWorkloadDistribution() {
    try {
      const response = await api.get('/team-members/workload-distribution');
      return response.data;
    } catch (error) {
      console.error('Error fetching team workload distribution:', error);
      throw error;
    }
  }

  // Bulk update team members
  async bulkUpdateTeamMembers(updates: Array<{ id: string; data: UpdateTeamMemberData }>) {
    try {
      const response = await api.put('/team-members/bulk-update', { updates });
      return response.data;
    } catch (error) {
      console.error('Error bulk updating team members:', error);
      throw error;
    }
  }

  // Import team members from CSV
  async importTeamMembers(csvData: string | FormData) {
    try {
      const response = await api.post('/team-members/import', csvData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error importing team members:', error);
      throw error;
    }
  }
}

export const teamApi = new TeamApi();
