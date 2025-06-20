import api from '../api';

export interface Organization {
  _id: string;
  name: string;
  description?: string;
  contactEmail: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  website?: string;
  industry?: string;
  size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  metadata?: {
    organizationType?: string;
    otherType?: string;
    teamSize?: string;
    departments?: string[];
    customDepartments?: string[];
    clientsPerMonth?: string;
    onboardingChallenges?: string[];
    otherChallenges?: string[];
  };
  isActive: boolean;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganizationData {
  name: string;
  description?: string;
  contactEmail: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  website?: string;
  industry?: string;
  size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
}

export interface UpdateOrganizationData extends Partial<CreateOrganizationData> {}

export interface OrganizationFilters {
  search?: string;
  industry?: string;
  size?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

class OrganizationsApi {
  // Get all organizations (user has access to)
  async getOrganizations(filters?: OrganizationFilters): Promise<{ organizations: Organization[]; total: number }> {
    try {
      const response = await api.get('/organizations', { params: filters });
      return {
        organizations: response.data.data || [],
        total: response.data.count || 0
      };
    } catch (error) {
      console.error('Error fetching organizations:', error);
      throw error;
    }
  }

  // Get single organization
  async getOrganization(id: string): Promise<Organization> {
    try {
      const response = await api.get(`/organizations/${id}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching organization:', error);
      throw error;
    }
  }

  // Create new organization (Super Admin only)
  async createOrganization(data: CreateOrganizationData): Promise<Organization> {
    try {
      const response = await api.post('/organizations', data);
      return response.data.data;
    } catch (error) {
      console.error('Error creating organization:', error);
      throw error;
    }
  }

  // Update organization
  async updateOrganization(id: string, data: UpdateOrganizationData): Promise<Organization> {
    try {
      const response = await api.put(`/organizations/${id}`, data);
      return response.data.data;
    } catch (error) {
      console.error('Error updating organization:', error);
      throw error;
    }
  }

  // Delete organization (Super Admin only)
  async deleteOrganization(id: string): Promise<void> {
    try {
      await api.delete(`/organizations/${id}`);
    } catch (error) {
      console.error('Error deleting organization:', error);
      throw error;
    }
  }

  // Get current user's organization
  async getCurrentUserOrganization(): Promise<Organization | null> {
    try {
      const response = await api.get('/auth/me');
      const user = response.data.data;
      
      if (user && user.organization) {
        return await this.getOrganization(user.organization);
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching current user organization:', error);
      throw error;
    }
  }
}

export const organizationsApi = new OrganizationsApi();
