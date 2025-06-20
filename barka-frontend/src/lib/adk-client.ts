/**
 * ADK API Client for Ovara Agent
 *
 * This client handles communication with the ADK API server via barka-backend proxy
 * to avoid CORS issues. The proxy endpoints forward requests to the Google ADK server.
 */

import api from './api';

// Configuration
const APP_NAME = "orchestrator";
const DEFAULT_USER_ID = "user";

// Types
export interface ADKMessage {
  role: string;
  content: string;
  author?: string;
  type?: 'text' | 'function_call' | 'transfer';
  functionCall?: {
    name: string;
    args: Record<string, any>;
  };
}

export interface ADKEvent {
  author?: string;
  content?: {
    parts?: Array<{
      text?: string;
      functionCall?: {
        name: string;
        args: Record<string, any>;
      };
    }>;
  };
  actions?: {
    transfer_to_agent?: string;
  };
  type?: string;
}

export interface ADKSessionInfo {
  sessionId: string;
  userId: string;
  isConnected: boolean;
  conversationId?: string;
  appName?: string;
}

export interface ADKSessionData {
  conversation: {
    id: string;
    title: string;
    status: string;
    lastMessageAt: string;
    client: any;
    organization: any;
    adkSessionId: string;
    adkUserId: string;
    adkAppName: string;
  };
  session: {
    id: string;
    app_name: string;
    user_id: string;
    state: Record<string, any>;
    events: any[];
    last_update_time: number;
  };
  messages: Array<{
    id: string;
    author: string;
    content: any;
    timestamp: number;
    turn_complete: boolean;
    actions: any;
    metadata: any;
  }>;
}

export class ADKClient {
  private appName: string;
  private sessionInfo: ADKSessionInfo | null = null;

  constructor(appName: string = APP_NAME) {
    this.appName = appName;
  }

  /**
   * Create a new session with custom initial state for a new conversation
   */
  async createSessionForNewConversation(
    conversationId: string,
    clientId: string,
    organizationId: string
  ): Promise<string | null> {
    try {
      console.log(`Creating new ADK session for conversation: ${conversationId}`);

      const response = await api.post('/agent/adk/create-session', {
        conversationId,
        clientId,
        organizationId
      });

      console.log(`Session creation response:`, response.data);

      if (response.data.success) {
        const { sessionId, userId, appName } = response.data.data;
        this.sessionInfo = {
          sessionId,
          userId,
          appName,
          isConnected: true,
          conversationId
        };
        console.log(`ADK session created successfully: ${sessionId} for conversation: ${conversationId}`);
        return sessionId;
      } else {
        console.error(`Failed to create session:`, response.data);
        throw new Error(response.data.message || 'Session creation failed');
      }
    } catch (error: any) {
      console.error('Error creating session:', error);

      if (error.response?.status === 503) {
        throw new Error('ADK server is not available. Please make sure it is running on port 5566.');
      } else if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Cannot connect to backend server. Please check your connection.');
      }
    }
  }

  /**
   * Get existing session data for a conversation
   */
  async getExistingSession(conversationId: string): Promise<ADKSessionData | null> {
    try {
      console.log(`Fetching existing ADK session for conversation: ${conversationId}`);

      const response = await api.get(`/agent/adk/conversation/${conversationId}`);

      console.log(`Session retrieval response:`, response.data);

      if (response.data.success) {
        const sessionData = response.data.data;

        // Update session info
        this.sessionInfo = {
          sessionId: sessionData.conversation.adkSessionId,
          userId: sessionData.conversation.adkUserId,
          appName: sessionData.conversation.adkAppName,
          isConnected: true,
          conversationId
        };

        console.log(`ADK session retrieved successfully: ${sessionData.conversation.adkSessionId}`);
        return sessionData;
      } else {
        console.error(`Failed to retrieve session:`, response.data);
        return null;
      }
    } catch (error: any) {
      console.error('Error retrieving session:', error);

      if (error.response?.status === 404) {
        console.log('No existing session found, will need to create new one');
        return null;
      } else if (error.response?.status === 503) {
        throw new Error('ADK server is not available. Please make sure it is running on port 5566.');
      } else if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Cannot connect to backend server. Please check your connection.');
      }
    }
  }

  /**
   * Create a new session with the agent via barka-backend proxy (Legacy method)
   */
  async createSession(
    userId: string = DEFAULT_USER_ID,
    conversationId?: string,
    clientId?: string,
    organizationId?: string
  ): Promise<string | null> {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    try {
      console.log(`Creating ADK session via proxy: appName=${this.appName}, userId=${userId}, sessionId=${sessionId}, conversationId=${conversationId}`);

      const response = await api.post('/agent/adk/session', {
        appName: this.appName,
        userId: userId,
        sessionId: sessionId,
        conversationId: conversationId,
        clientId: clientId,
        organizationId: organizationId
      });

      console.log(`Session creation response:`, response.data);

      if (response.data.success) {
        this.sessionInfo = {
          sessionId,
          userId,
          isConnected: true,
          conversationId: conversationId
        };
        console.log(`ADK session created successfully: ${sessionId} for conversation: ${conversationId}`);
        return sessionId;
      } else {
        console.error(`Failed to create session:`, response.data);
        throw new Error(response.data.message || 'Session creation failed');
      }
    } catch (error: any) {
      console.error('Error creating session:', error);

      if (error.response?.status === 503) {
        throw new Error('ADK server is not available. Please make sure it is running on port 8000.');
      } else if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Cannot connect to backend server. Please check your connection.');
      }
    }
  }

  /**
   * Send a message to the agent and get response events via barka-backend proxy
   */
  async sendMessage(
    userId: string,
    sessionId: string,
    message: string
  ): Promise<ADKMessage[]> {
    try {
      const payload = {
        app_name: this.appName,
        user_id: userId,
        session_id: sessionId,
        new_message: {
          role: "user",
          parts: [{ text: message }]
        }
      };

      console.log(`Sending message via proxy:`, payload);

      const response = await api.post('/agent/adk/run', payload);

      console.log(`Message response:`, response.data);

      if (response.data.success) {
        return this.processEvents(response.data.data);
      } else {
        console.error(`Failed to send message:`, response.data);
        throw new Error(response.data.message || 'Failed to send message');
      }
    } catch (error: any) {
      console.error('Error sending message:', error);

      if (error.response?.status === 503) {
        throw new Error('ADK server is not available. Please make sure it is running on port 8000.');
      } else if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Cannot connect to backend server. Please check your connection.');
      }
    }
  }

  /**
   * Convert ADK session messages to frontend-compatible format
   */
  convertSessionMessagesToFrontend(sessionData: ADKSessionData): ADKMessage[] {
    const messages: ADKMessage[] = [];

    try {
      for (const message of sessionData.messages) {
        const author = message.author || "unknown";

        // Process message content
        if (message.content?.parts) {
          for (const part of message.content.parts) {
            if (part.text) {
              messages.push({
                role: author === "user" ? "user" : "assistant",
                content: part.text.trim(),
                author,
                type: "text"
              });
            }

            // Process function calls
            if (part.functionCall) {
              const funcCall = part.functionCall;
              const funcName = funcCall.name || "unknown_function";
              const funcArgs = funcCall.args || {};

              messages.push({
                role: "assistant",
                content: `🔧 **Function Call**: \`${funcName}\``,
                author,
                type: "function_call",
                functionCall: {
                  name: funcName,
                  args: funcArgs
                }
              });
            }
          }
        }

        // Handle agent transfers
        if (message.actions?.transfer_to_agent) {
          const transferredAgent = message.actions.transfer_to_agent;
          messages.push({
            role: "assistant",
            content: `🔄 **Agent Transfer**: Routing to \`${transferredAgent}\` agent`,
            author,
            type: "transfer"
          });
        }
      }
    } catch (error) {
      console.error('Error converting session messages:', error);
    }

    return messages;
  }

  /**
   * Process events from the agent response
   */
  private processEvents(events: ADKEvent[]): ADKMessage[] {
    const messages: ADKMessage[] = [];

    try {
      for (const event of events) {
        if (typeof event === 'object' && event !== null) {
          const author = event.author || "unknown";

          // Process text responses
          if (event.content?.parts) {
            for (const part of event.content.parts) {
              if (part.text) {
                messages.push({
                  role: "assistant",
                  content: part.text.trim(),
                  author,
                  type: "text"
                });
              }

              // Process function calls
              if (part.functionCall) {
                const funcCall = part.functionCall;
                const funcName = funcCall.name || "unknown_function";
                const funcArgs = funcCall.args || {};

                // Create a clean function call message without JSON code block
                messages.push({
                  role: "assistant",
                  content: `🔧 **Function Call**: \`${funcName}\``,
                  author,
                  type: "function_call",
                  functionCall: {
                    name: funcName,
                    args: funcArgs
                  }
                });
              }
            }
          }

          // Handle agent transfers
          if (event.actions?.transfer_to_agent) {
            const transferredAgent = event.actions.transfer_to_agent;
            messages.push({
              role: "assistant",
              content: `🔄 **Agent Transfer**: Routing to \`${transferredAgent}\` agent`,
              author,
              type: "transfer"
            });
          }

          console.log(`Processed event from ${author}: type=${event.type || 'unknown'}`);
        }
      }
    } catch (error) {
      console.error('Error processing events:', error);
      console.error('Events structure:', events);
    }

    return messages;
  }

  /**
   * Check server status - simplified approach using proxy
   */
  async checkServerStatus(): Promise<boolean> {
    try {
      // For now, we'll assume the backend is available and let the session creation handle errors
      // This avoids additional complexity and the backend will handle ADK server connectivity
      return true;
    } catch (error) {
      console.error('Server status check failed:', error);
      return false;
    }
  }

  /**
   * Get current session info
   */
  getSessionInfo(): ADKSessionInfo | null {
    return this.sessionInfo;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.sessionInfo?.isConnected || false;
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.sessionInfo = null;
  }
}

// Export a default instance
export const adkClient = new ADKClient();
