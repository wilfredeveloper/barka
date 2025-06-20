/**
 * WebSocket service for connecting to ovara-agent
 * Handles real-time chat communication with the AI agent
 */

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  isPartial?: boolean;
  turnComplete?: boolean;
}

export interface ConnectionInfo {
  clientId: string;
  conversationId: string;
  sessionId: string;
  connectionId: string;
}

export interface WebSocketConfig {
  url: string;
  clientId: string;
  token: string;
  conversationId?: string;
  isAudio?: boolean;
}

export class OvaraWebSocketService {
  private websocket: WebSocket | null = null;
  private config: WebSocketConfig | null = null;
  private connectionInfo: ConnectionInfo | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private connectionPromise: Promise<void> | null = null;

  // Event handlers
  private onMessageHandler: ((message: ChatMessage) => void) | null = null;
  private onConnectionHandler: ((info: ConnectionInfo) => void) | null = null;
  private onErrorHandler: ((error: string) => void) | null = null;
  private onStatusHandler: ((status: 'connecting' | 'connected' | 'disconnected' | 'error') => void) | null = null;

  constructor() {
    console.log('OvaraWebSocketService initialized');
  }

  /**
   * Connect to the ovara-agent WebSocket
   */
  async connect(config: WebSocketConfig): Promise<void> {
    // Prevent multiple simultaneous connection attempts
    if (this.isConnecting && this.connectionPromise) {
      console.log('Connection already in progress, waiting for existing attempt');
      return this.connectionPromise;
    }

    // If already connected to the same configuration, return early
    if (this.isConnected && this.config &&
        this.config.clientId === config.clientId &&
        this.config.conversationId === config.conversationId) {
      console.log('Already connected to the same conversation');
      return Promise.resolve();
    }

    // Disconnect existing connection if connecting to different conversation
    if (this.isConnected || this.isConnecting) {
      console.log('Disconnecting existing connection before establishing new one');
      this.disconnect();
    }

    this.config = config;
    this.reconnectAttempts = 0;
    this.isConnecting = true;

    this.connectionPromise = this.establishConnection();

    try {
      await this.connectionPromise;
    } finally {
      this.isConnecting = false;
      this.connectionPromise = null;
    }
  }

  private async establishConnection(): Promise<void> {
    if (!this.config) {
      throw new Error('WebSocket config not provided');
    }

    try {
      this.onStatusHandler?.('connecting');
      
      // Build WebSocket URL
      const wsUrl = this.buildWebSocketUrl();
      console.log(`Connecting to ovara-agent: ${wsUrl}`);

      // Create WebSocket connection
      this.websocket = new WebSocket(wsUrl);
      
      // Setup event handlers
      this.setupWebSocketHandlers();

    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
      this.onErrorHandler?.(`Connection failed: ${error}`);
      this.onStatusHandler?.('error');
      throw error;
    }
  }

  private buildWebSocketUrl(): string {
    if (!this.config) {
      throw new Error('WebSocket config not available');
    }

    const { url, clientId, token, conversationId, isAudio = false } = this.config;
    
    // Build query parameters
    const params = new URLSearchParams({
      token,
      is_audio: isAudio.toString()
    });

    if (conversationId) {
      params.append('conversation_id', conversationId);
    }

    return `${url}/ws/${clientId}?${params.toString()}`;
  }

  private setupWebSocketHandlers(): void {
    if (!this.websocket) return;

    this.websocket.onopen = () => {
      console.log('WebSocket connection opened');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.onStatusHandler?.('connected');
    };

    this.websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        this.onErrorHandler?.('Failed to parse message');
      }
    };

    this.websocket.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
      this.isConnected = false;
      this.connectionInfo = null;
      this.onStatusHandler?.('disconnected');

      // Only attempt reconnection if:
      // 1. Not manually closed (code 1000)
      // 2. Not currently disconnecting intentionally
      // 3. Haven't exceeded max reconnect attempts
      // 4. Still have a valid config (not cleared by disconnect)
      if (event.code !== 1000 &&
          !this.isConnecting &&
          this.config &&
          this.reconnectAttempts < this.maxReconnectAttempts) {
        this.attemptReconnection();
      }
    };

    this.websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.onErrorHandler?.('WebSocket connection error');
      this.onStatusHandler?.('error');
    };
  }

  private handleMessage(message: any): void {
    console.log('Received message:', message);

    // Handle connection establishment
    if (message.type === 'connection_established') {
      this.connectionInfo = {
        clientId: message.client_id,
        conversationId: message.conversation_id,
        sessionId: message.session_id,
        connectionId: message.connection_id
      };

      this.onConnectionHandler?.(this.connectionInfo);
      return;
    }

    // Handle chat messages
    if (message.mime_type === 'text/plain') {
      const chatMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2)}`,
        content: message.data || '',
        sender: message.role === 'user' ? 'user' : 'agent',
        timestamp: new Date(),
        isPartial: message.partial || false,
        turnComplete: message.turn_complete || false
      };

      this.onMessageHandler?.(chatMessage);
    }

    // Handle turn completion (when it comes as a separate message)
    if (message.turn_complete && !message.mime_type) {
      // This is a turn completion message without content
      const turnCompleteMessage: ChatMessage = {
        id: `turn-complete-${Date.now()}-${Math.random().toString(36).substring(2)}`,
        content: '',
        sender: 'agent',
        timestamp: new Date(),
        isPartial: false,
        turnComplete: true
      };

      this.onMessageHandler?.(turnCompleteMessage);
      console.log('Turn completed');
    }
  }

  private attemptReconnection(): void {
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (this.config) {
        this.establishConnection().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }
    }, delay);
  }

  /**
   * Send a message to the agent
   */
  sendMessage(content: string): void {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    const message = {
      mime_type: 'text/plain',
      data: content,
      role: 'user'
    };

    this.websocket.send(JSON.stringify(message));
    console.log('Sent message:', content);
  }

  /**
   * Disconnect from the WebSocket
   */
  disconnect(): void {
    console.log('Disconnecting WebSocket...');

    // Cancel any pending connection attempts
    this.isConnecting = false;
    this.connectionPromise = null;

    if (this.websocket) {
      // Remove event listeners to prevent unwanted reconnection attempts
      this.websocket.onopen = null;
      this.websocket.onmessage = null;
      this.websocket.onclose = null;
      this.websocket.onerror = null;

      // Close the connection
      if (this.websocket.readyState === WebSocket.OPEN || this.websocket.readyState === WebSocket.CONNECTING) {
        this.websocket.close(1000, 'Client disconnecting');
      }
      this.websocket = null;
    }

    this.isConnected = false;
    this.connectionInfo = null;
    this.reconnectAttempts = 0;
    this.config = null; // Clear config to prevent reconnection
    this.onStatusHandler?.('disconnected');
    console.log('WebSocket disconnected');
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): 'connecting' | 'connected' | 'disconnected' {
    if (!this.websocket) return 'disconnected';
    
    switch (this.websocket.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      default:
        return 'disconnected';
    }
  }

  /**
   * Get connection info
   */
  getConnectionInfo(): ConnectionInfo | null {
    return this.connectionInfo;
  }

  /**
   * Event handler setters
   */
  onMessage(handler: (message: ChatMessage) => void): void {
    this.onMessageHandler = handler;
  }

  onConnection(handler: (info: ConnectionInfo) => void): void {
    this.onConnectionHandler = handler;
  }

  onError(handler: (error: string) => void): void {
    this.onErrorHandler = handler;
  }

  onStatus(handler: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void): void {
    this.onStatusHandler = handler;
  }

  /**
   * Check if connected
   */
  isWebSocketConnected(): boolean {
    return this.isConnected && this.websocket?.readyState === WebSocket.OPEN;
  }
}

// Export a singleton instance
export const ovaraWebSocket = new OvaraWebSocketService();
