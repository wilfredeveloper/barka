/**
 * ADK Polling Service
 * 
 * Handles real-time polling of ADK session state for progressive updates
 * since WebSockets are not used in the current architecture.
 */

import { ADKSessionService } from './adk-session-service';
import { consolidateADKEvents, ConsolidatedResponse, isEventProcessingComplete } from './adk-event-consolidator';

export interface PollingOptions {
  conversationId: string;
  onStatusUpdate: (status: ConsolidatedResponse) => void;
  onComplete: (finalResponse: ConsolidatedResponse) => void;
  onError: (error: Error) => void;
  onTimeout: () => void;
  maxDuration?: number; // Maximum polling duration in ms (default: 100000)
  initialInterval?: number; // Initial polling interval in ms (default: 1000)
  maxInterval?: number; // Maximum polling interval in ms (default: 3000)
}

export class ADKPollingService {
  private sessionService: ADKSessionService;
  private activePolls: Map<string, PollingSession> = new Map();

  constructor() {
    this.sessionService = new ADKSessionService();
  }

  /**
   * Start polling for a conversation's ADK session updates
   */
  startPolling(options: PollingOptions): string {
    const pollId = `poll-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    
    const session = new PollingSession(
      pollId,
      this.sessionService,
      options
    );

    this.activePolls.set(pollId, session);
    session.start();

    return pollId;
  }

  /**
   * Stop polling for a specific conversation
   */
  stopPolling(pollId: string): void {
    const session = this.activePolls.get(pollId);
    if (session) {
      session.stop();
      this.activePolls.delete(pollId);
    }
  }

  /**
   * Stop all active polling sessions
   */
  stopAllPolling(): void {
    for (const [pollId, session] of this.activePolls) {
      session.stop();
    }
    this.activePolls.clear();
  }

  /**
   * Get active polling sessions count
   */
  getActiveSessionsCount(): number {
    return this.activePolls.size;
  }
}

/**
 * Individual polling session manager
 */
class PollingSession {
  private pollId: string;
  private sessionService: ADKSessionService;
  private options: PollingOptions;
  private intervalId: NodeJS.Timeout | null = null;
  private startTime: number = 0;
  private currentInterval: number;
  private lastEventCount: number = 0;
  private isActive: boolean = false;

  constructor(
    pollId: string,
    sessionService: ADKSessionService,
    options: PollingOptions
  ) {
    this.pollId = pollId;
    this.sessionService = sessionService;
    this.options = {
      maxDuration: 100000, // 100 seconds default
      initialInterval: 1000, // 1 second default
      maxInterval: 3000, // 3 seconds max
      ...options
    };
    this.currentInterval = this.options.initialInterval!;
  }

  /**
   * Start the polling session
   */
  start(): void {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    this.startTime = Date.now();
    this.scheduleNextPoll();

    console.log(`🔄 Started ADK polling for conversation: ${this.options.conversationId}`);
  }

  /**
   * Stop the polling session
   */
  stop(): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }

    console.log(`⏹️ Stopped ADK polling for conversation: ${this.options.conversationId}`);
  }

  /**
   * Schedule the next poll
   */
  private scheduleNextPoll(): void {
    if (!this.isActive) {
      return;
    }

    this.intervalId = setTimeout(() => {
      this.poll();
    }, this.currentInterval);
  }

  /**
   * Perform a single poll
   */
  private async poll(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    const elapsed = Date.now() - this.startTime;

    // Check for timeout
    if (elapsed > this.options.maxDuration!) {
      console.log(`⏰ ADK polling timeout for conversation: ${this.options.conversationId}`);
      this.options.onTimeout();
      this.stop();
      return;
    }

    try {
      // Fetch current session data
      const sessionData = await this.sessionService.getConversationSession(
        this.options.conversationId
      );

      if (!sessionData) {
        console.warn(`⚠️ No session data found for conversation: ${this.options.conversationId}`);
        this.scheduleNextPoll();
        return;
      }

      // Process events using consolidation service
      const consolidatedResponse = consolidateADKEvents(
        sessionData.session.events || [],
        {
          includeDebugInfo: process.env.NODE_ENV === 'development',
          isAdminMode: true
        }
      );

      // Check if processing is complete
      const isComplete = isEventProcessingComplete(sessionData.session.events || []);
      
      if (isComplete && consolidatedResponse.finalMessage) {
        console.log(`✅ ADK processing complete for conversation: ${this.options.conversationId}`);
        this.options.onComplete(consolidatedResponse);
        this.stop();
        return;
      }

      // Send status update
      this.options.onStatusUpdate(consolidatedResponse);

      // Adaptive polling interval
      this.adjustPollingInterval(sessionData.session.events?.length || 0);

      // Schedule next poll
      this.scheduleNextPoll();

    } catch (error) {
      console.error(`❌ ADK polling error for conversation ${this.options.conversationId}:`, error);
      this.options.onError(error as Error);
      
      // Continue polling on error, but with longer interval
      this.currentInterval = Math.min(this.currentInterval * 1.5, this.options.maxInterval!);
      this.scheduleNextPoll();
    }
  }

  /**
   * Adjust polling interval based on activity
   */
  private adjustPollingInterval(currentEventCount: number): void {
    const hasNewEvents = currentEventCount > this.lastEventCount;
    this.lastEventCount = currentEventCount;

    if (hasNewEvents) {
      // New activity detected, poll more frequently
      this.currentInterval = this.options.initialInterval!;
    } else {
      // No new activity, gradually increase interval
      this.currentInterval = Math.min(
        this.currentInterval * 1.2,
        this.options.maxInterval!
      );
    }
  }
}

// Singleton instance
export const adkPollingService = new ADKPollingService();
