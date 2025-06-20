/**
 * Memory and Personalization API Client
 * 
 * This client handles communication with the ovara-agent memory system
 * for user profiles, memories, and privacy controls.
 */

import { getCurrentUser } from './auth';
import api from './api';

// Types for memory system
export interface UserProfile {
  userId: string;
  basicInfo: {
    name: string;
    email: string;
    role: string;
    timezone: string;
  };
  preferences: {
    communicationStyle: string;
    responseLength: string;
    technicalLevel: string;
    language: string;
    notifications: {
      email: boolean;
      inApp: boolean;
      reminders: boolean;
    };
  };
  interests: Record<string, number>;
  interactionPatterns: {
    totalInteractions: number;
    averageSessionLength: number;
    preferredTimeOfDay: string[];
    commonTopics: string[];
    responsePatterns: Record<string, any>;
  };
  privacySettings: {
    level: string;
    dataRetentionDays: number;
    allowPersonalization: boolean;
    allowAnalytics: boolean;
    shareWithOrganization: boolean;
  };
  createdAt: string;
  lastUpdated: string;
}

export interface UserMemory {
  id: string;
  content: string;
  type: string;
  importance: string;
  tags: string[];
  created_at: string;
  access_count: number;
  summary?: string;
}

export interface MemorySettings {
  privacyLevel: string;
  dataRetentionDays: number;
  allowPersonalization: boolean;
  allowAnalytics: boolean;
  shareWithOrganization: boolean;
  memoryStatistics: {
    totalMemories: number;
    typeBreakdown: Array<{
      _id: string;
      count: number;
      totalAccess: number;
    }>;
    lastUpdated: string;
  };
  dataRights: {
    canExportData: boolean;
    canDeleteData: boolean;
    canModifySettings: boolean;
    dataPortability: boolean;
  };
}

export interface TransparencyInfo {
  userId: string;
  generatedAt: string;
  dataOverview: {
    profileExists: boolean;
    totalMemories: number;
    memoryTypes: Array<{
      _id: string;
      count: number;
      totalAccess: number;
    }>;
    dataRetentionDays: number;
  };
  personalizationUsage: {
    isPersonalizationEnabled: boolean;
    communicationStyleAdaptation: boolean;
    interestBasedRecommendations: boolean;
    interactionPatternTracking: boolean;
  };
  dataSharing: {
    shareWithOrganization: boolean;
    allowAnalytics: boolean;
    externalServices: {
      mem0Integration: boolean;
      encryptionEnabled: boolean;
    };
  };
  userRights: {
    canViewData: boolean;
    canExportData: boolean;
    canDeleteData: boolean;
    canModifySettings: boolean;
    canOptOut: boolean;
  };
  dataProcessingPurposes: string[];
}

export interface UserInterest {
  topic: string;
  score: number;
}

class MemoryApiClient {
  // Use the existing API client which handles authentication and CORS
  private async makeRequest<T>(endpoint: string, method: string = 'GET', data?: any): Promise<T> {
    try {
      const config: any = {
        method,
        url: `/memory${endpoint}`,
      };

      if (data) {
        config.data = data;
      }

      const response = await api(config);
      return response.data;
    } catch (error: any) {
      console.error('Memory API request failed:', error);
      throw new Error(error.response?.data?.message || 'Memory API request failed');
    }
  }

  // User Profile Methods
  async getUserProfile(): Promise<UserProfile | null> {
    try {
      const user = getCurrentUser();
      if (!user) return null;

      const response = await this.makeRequest<{
        status: string;
        profile?: UserProfile;
        error_message?: string;
      }>(`/profile/${user.id}`, 'GET');

      return response.status === 'success' ? response.profile || null : null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  async updateUserProfile(field: string, value: string): Promise<boolean> {
    try {
      const user = getCurrentUser();
      if (!user) return false;

      const response = await this.makeRequest<{
        status: string;
        error_message?: string;
      }>(`/profile/${user.id}`, 'PUT', { field, value });

      return response.status === 'success';
    } catch (error) {
      console.error('Error updating user profile:', error);
      return false;
    }
  }

  async getUserInterests(limit: number = 10): Promise<UserInterest[]> {
    try {
      const user = getCurrentUser();
      if (!user) return [];

      const response = await this.makeRequest<{
        status: string;
        interests?: UserInterest[];
        error_message?: string;
      }>(`/interests/${user.id}?limit=${limit}`, 'GET');

      return response.status === 'success' ? response.interests || [] : [];
    } catch (error) {
      console.error('Error fetching user interests:', error);
      return [];
    }
  }

  // Memory Methods
  async searchMemories(
    query: string = '',
    memoryType: string = '',
    limit: number = 10
  ): Promise<UserMemory[]> {
    try {
      const user = getCurrentUser();
      if (!user) return [];

      const params = new URLSearchParams({
        query,
        memory_type: memoryType,
        limit: limit.toString(),
      });

      const response = await this.makeRequest<{
        status: string;
        memories?: UserMemory[];
        error_message?: string;
      }>(`/memories/${user.id}/search?${params}`, 'GET');

      return response.status === 'success' ? response.memories || [] : [];
    } catch (error) {
      console.error('Error searching memories:', error);
      return [];
    }
  }

  // Privacy and Settings Methods
  async getMemorySettings(): Promise<MemorySettings | null> {
    try {
      const user = getCurrentUser();
      if (!user) return null;

      const response = await this.makeRequest<{
        status: string;
        settings?: MemorySettings;
        error_message?: string;
      }>(`/settings/${user.id}`, 'GET');

      return response.status === 'success' ? response.settings || null : null;
    } catch (error) {
      console.error('Error fetching memory settings:', error);
      return null;
    }
  }

  async updateMemorySetting(setting: string, value: string): Promise<boolean> {
    try {
      const user = getCurrentUser();
      if (!user) return false;

      const response = await this.makeRequest<{
        status: string;
        error_message?: string;
      }>(`/settings/${user.id}`, 'PUT', { setting, value });

      return response.status === 'success';
    } catch (error) {
      console.error('Error updating memory setting:', error);
      return false;
    }
  }

  async getTransparencyInfo(): Promise<TransparencyInfo | null> {
    try {
      const user = getCurrentUser();
      if (!user) return null;

      const response = await this.makeRequest<{
        status: string;
        transparencyInfo?: TransparencyInfo;
        error_message?: string;
      }>(`/transparency/${user.id}`, 'GET');

      return response.status === 'success' ? response.transparencyInfo || null : null;
    } catch (error) {
      console.error('Error fetching transparency info:', error);
      return null;
    }
  }

  async exportUserData(dataTypes: string = 'all'): Promise<any> {
    try {
      const user = getCurrentUser();
      if (!user) return null;

      const response = await this.makeRequest<{
        status: string;
        exportData?: any;
        error_message?: string;
      }>(`/export/${user.id}?data_types=${dataTypes}`, 'GET');

      return response.status === 'success' ? response.exportData : null;
    } catch (error) {
      console.error('Error exporting user data:', error);
      return null;
    }
  }

  async deleteUserData(dataTypes: string, confirmation: boolean = false): Promise<boolean> {
    try {
      const user = getCurrentUser();
      if (!user) return false;

      const response = await this.makeRequest<{
        status: string;
        error_message?: string;
      }>(`/delete/${user.id}`, 'DELETE', {
        data_types: dataTypes,
        confirmation: confirmation.toString(),
      });

      return response.status === 'success';
    } catch (error) {
      console.error('Error deleting user data:', error);
      return false;
    }
  }
}

// Export singleton instance
export const memoryApi = new MemoryApiClient();
