import api from '../api';

export interface Client {
  _id: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  organization: {
    _id: string;
    name: string;
  };
  projectType: string;
  projectTypeOther?: string;
  budget?: number;
  status: 'onboarding' | 'active' | 'paused' | 'completed';
  requirements?: string[];
  notes?: string;
  onboardingProgress: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClientFilters {
  status?: string;
  projectType?: string;
  page?: number;
  limit?: number;
}

class ClientsApi {
  // Get all clients (organization-scoped)
  async getClients(filters?: ClientFilters): Promise<{ clients: Client[]; total: number }> {
    try {
      const response = await api.get('/clients', { params: filters });
      return {
        clients: response.data.data || [],
        total: response.data.count || 0
      };
    } catch (error) {
      console.error('Error fetching clients:', error);
      throw error;
    }
  }

  // Get single client
  async getClient(id: string): Promise<Client> {
    try {
      const response = await api.get(`/clients/${id}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching client:', error);
      throw error;
    }
  }

  // Create new client
  async createClient(data: any): Promise<Client> {
    try {
      const response = await api.post('/clients', data);
      return response.data.data;
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  }

  // Update client
  async updateClient(id: string, data: any): Promise<Client> {
    try {
      const response = await api.put(`/clients/${id}`, data);
      return response.data.data;
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  }

  // Delete client
  async deleteClient(id: string): Promise<void> {
    try {
      await api.delete(`/clients/${id}`);
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  }

  // Refresh client progress
  async refreshClientProgress(id: string): Promise<{
    client: Client;
    progress: {
      overall: number;
      byPhase: Record<string, any>;
      totalTodos: number;
      completedTodos: number;
    };
    message: string;
  }> {
    try {
      const response = await api.post(`/clients/${id}/refresh-progress`);
      return response.data.data;
    } catch (error) {
      console.error('Error refreshing client progress:', error);
      throw error;
    }
  }

  // Refresh current user's progress (for clients)
  async refreshMyProgress(): Promise<{
    client: Client;
    progress: {
      overall: number;
      byPhase: Record<string, any>;
      totalTodos: number;
      completedTodos: number;
    };
    message: string;
  }> {
    try {
      const response = await api.post('/clients/me/refresh-progress');
      return response.data.data;
    } catch (error) {
      console.error('Error refreshing my progress:', error);
      throw error;
    }
  }

  // Get client statistics
  async getClientStats(): Promise<any> {
    try {
      const response = await api.get('/clients/stats');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching client stats:', error);
      throw error;
    }
  }
}

export const clientsApi = new ClientsApi();
