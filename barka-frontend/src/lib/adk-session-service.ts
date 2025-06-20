/**
 * ADK Session Service
 * 
 * This service handles all interactions with the ADK session API endpoints.
 * It provides a clean interface for fetching session data and managing
 * conversation state.
 */

import api from './api';
import {
  ADKSessionResponse,
  ADKSessionData,
  ADKSessionError,
  FormattedMessage,
  MessageProcessingOptions
} from '@/types/adk-session';
import { formatADKMessages, extractSessionSummary } from './adk-message-formatter';

export class ADKSessionService {
  private baseUrl: string;

  constructor(baseUrl: string = '/agent/adk') {
    this.baseUrl = baseUrl;
  }

  /**
   * Fetch complete session data for a conversation
   */
  async getConversationSession(conversationId: string): Promise<ADKSessionData | null> {
    try {
      console.log(`Fetching ADK session for conversation: ${conversationId}`);

      const response = await api.get<ADKSessionResponse>(`${this.baseUrl}/conversation/${conversationId}`);

      if (response.data.success) {
        console.log(`ADK session retrieved successfully for conversation: ${conversationId}`);
        return response.data.data;
      } else {
        console.error('Failed to retrieve ADK session:', response.data);
        return null;
      }
    } catch (error: any) {
      console.error('Error fetching ADK session:', error);

      if (error.response?.status === 404) {
        console.log('No existing ADK session found for conversation');
        return null;
      } else if (error.response?.status === 503) {
        throw new Error('ADK server is not available. Please make sure it is running on port 5566.');
      } else if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Failed to fetch conversation session data');
      }
    }
  }

  /**
   * Create a new ADK session for a conversation
   */
  async createConversationSession(
    conversationId: string,
    clientId: string,
    organizationId: string
  ): Promise<string | null> {
    try {
      console.log(`Creating new ADK session for conversation: ${conversationId}`);

      const response = await api.post(`${this.baseUrl}/create-session`, {
        conversationId,
        clientId,
        organizationId
      });

      if (response.data.success) {
        const { sessionId } = response.data.data;
        console.log(`ADK session created successfully: ${sessionId}`);
        return sessionId;
      } else {
        console.error('Failed to create ADK session:', response.data);
        throw new Error(response.data.message || 'Session creation failed');
      }
    } catch (error: any) {
      console.error('Error creating ADK session:', error);

      if (error.response?.status === 503) {
        throw new Error('ADK server is not available. Please make sure it is running on port 5566.');
      } else if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Failed to create ADK session');
      }
    }
  }

  /**
   * Get formatted messages for display in the UI
   */
  async getFormattedMessages(
    conversationId: string,
    options: MessageProcessingOptions = {}
  ): Promise<FormattedMessage[]> {
    const sessionData = await this.getConversationSession(conversationId);
    
    if (!sessionData) {
      return [];
    }

    return formatADKMessages(sessionData, options);
  }

  /**
   * Get session summary information
   */
  async getSessionSummary(conversationId: string) {
    const sessionData = await this.getConversationSession(conversationId);
    
    if (!sessionData) {
      return null;
    }

    return extractSessionSummary(sessionData);
  }

  /**
   * Check if a conversation has an existing ADK session
   */
  async hasExistingSession(conversationId: string): Promise<boolean> {
    try {
      const sessionData = await this.getConversationSession(conversationId);
      return sessionData !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get or create session data for a conversation
   * This is the main method that should be used by components
   */
  async getOrCreateSession(
    conversationId: string,
    clientId: string,
    organizationId: string
  ): Promise<ADKSessionData | null> {
    try {
      // Try to get existing session first
      let sessionData = await this.getConversationSession(conversationId);
      
      if (sessionData) {
        console.log('Using existing ADK session');
        return sessionData;
      }

      // No existing session, create new one
      console.log('No existing session found, creating new one');
      const sessionId = await this.createConversationSession(conversationId, clientId, organizationId);
      
      if (!sessionId) {
        throw new Error('Failed to create new session');
      }

      // Fetch the newly created session data
      sessionData = await this.getConversationSession(conversationId);
      
      if (!sessionData) {
        throw new Error('Failed to retrieve newly created session');
      }

      return sessionData;
    } catch (error) {
      console.error('Error in getOrCreateSession:', error);
      throw error;
    }
  }

  /**
   * Refresh session data (useful after sending messages)
   */
  async refreshSession(conversationId: string): Promise<ADKSessionData | null> {
    return this.getConversationSession(conversationId);
  }

  /**
   * Get real-time session state
   */
  async getSessionState(conversationId: string): Promise<any> {
    const sessionData = await this.getConversationSession(conversationId);
    return sessionData?.session.state || null;
  }

  /**
   * Get conversation metadata
   */
  async getConversationMetadata(conversationId: string) {
    const sessionData = await this.getConversationSession(conversationId);
    
    if (!sessionData) {
      return null;
    }

    return {
      conversation: sessionData.conversation,
      sessionInfo: {
        id: sessionData.session.id,
        appName: sessionData.session.app_name,
        userId: sessionData.session.user_id,
        lastUpdate: new Date(sessionData.session.last_update_time * 1000).toISOString()
      },
      currentAgent: sessionData.session.state.current_agent,
      messageCount: sessionData.messages.length
    };
  }
}

// Export singleton instance
export const adkSessionService = new ADKSessionService();

// Export utility functions for direct use
export { formatADKMessages, extractSessionSummary } from './adk-message-formatter';

// Export types for convenience
export type {
  ADKSessionData,
  FormattedMessage,
  MessageProcessingOptions
} from '@/types/adk-session';
