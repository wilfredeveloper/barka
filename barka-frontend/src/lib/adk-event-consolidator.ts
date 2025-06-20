/**
 * ADK Event Consolidation Service
 * 
 * This service processes raw ADK events and consolidates them into:
 * 1. A single final message for display
 * 2. Progressive status updates for real-time feedback
 * 3. Debug information when needed
 */

import { ADKEvent, ADKSessionData } from '@/types/adk-session';

export interface ConsolidatedResponse {
  finalMessage: {
    id: string;
    content: string;
    author: string;
    timestamp: number;
    isComplete: boolean;
  } | null;
  statusUpdates: StatusUpdate[];
  debugEvents: DebugEvent[];
}

export interface StatusUpdate {
  id: string;
  message: string;
  timestamp: number;
  type: 'analyzing' | 'transferring' | 'gathering' | 'processing' | 'completing';
  isVisible: boolean;
}

export interface DebugEvent {
  id: string;
  type: 'function_call' | 'function_response' | 'transfer' | 'system';
  content: string;
  timestamp: number;
  author: string;
  metadata: Record<string, any>;
}

/**
 * Main consolidation function that processes ADK events
 */
export function consolidateADKEvents(
  events: ADKEvent[],
  options: {
    includeDebugInfo?: boolean;
    isAdminMode?: boolean;
  } = {}
): ConsolidatedResponse {
  const { includeDebugInfo = false, isAdminMode = true } = options;
  
  const statusUpdates: StatusUpdate[] = [];
  const debugEvents: DebugEvent[] = [];
  let finalMessage: ConsolidatedResponse['finalMessage'] = null;
  
  // Process events in chronological order
  const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);
  
  for (const event of sortedEvents) {
    // Extract final text response
    if (event.content?.parts) {
      for (const part of event.content.parts) {
        if (part.text && part.text.trim()) {
          // This is likely the final response
          finalMessage = {
            id: event.id,
            content: part.text.trim(),
            author: event.author,
            timestamp: event.timestamp,
            isComplete: true
          };
        }
        
        // Process function calls for status updates
        if (part.functionCall) {
          const statusUpdate = mapFunctionCallToStatus(part.functionCall, event.timestamp);
          if (statusUpdate) {
            statusUpdates.push(statusUpdate);
          }
          
          // Add to debug events if requested
          if (includeDebugInfo) {
            debugEvents.push({
              id: `${event.id}-func-call`,
              type: 'function_call',
              content: `Function Call: ${part.functionCall.name}`,
              timestamp: event.timestamp,
              author: event.author,
              metadata: {
                functionName: part.functionCall.name,
                args: part.functionCall.args
              }
            });
          }
        }
        
        if (part.functionResponse) {
          // Add to debug events if requested
          if (includeDebugInfo) {
            debugEvents.push({
              id: `${event.id}-func-response`,
              type: 'function_response',
              content: `Function Response: ${part.functionResponse.name}`,
              timestamp: event.timestamp,
              author: event.author,
              metadata: {
                functionName: part.functionResponse.name,
                response: part.functionResponse.response
              }
            });
          }
        }
      }
    }
    
    // Process agent transfers
    if (event.actions?.transfer_to_agent) {
      const transferStatus = mapAgentTransferToStatus(
        event.actions.transfer_to_agent,
        event.timestamp,
        isAdminMode
      );
      if (transferStatus) {
        statusUpdates.push(transferStatus);
      }
      
      // Add to debug events if requested
      if (includeDebugInfo) {
        debugEvents.push({
          id: `${event.id}-transfer`,
          type: 'transfer',
          content: `Agent Transfer: ${event.actions.transfer_to_agent}`,
          timestamp: event.timestamp,
          author: event.author,
          metadata: {
            fromAgent: event.author,
            toAgent: event.actions.transfer_to_agent
          }
        });
      }
    }
  }
  
  // Add completion status if we have a final message
  if (finalMessage) {
    statusUpdates.push({
      id: `completion-${finalMessage.timestamp}`,
      message: 'Response ready',
      timestamp: finalMessage.timestamp,
      type: 'completing',
      isVisible: true
    });
  }
  
  return {
    finalMessage,
    statusUpdates: statusUpdates.filter(update => update.isVisible),
    debugEvents
  };
}

/**
 * Map function calls to user-friendly status messages
 */
function mapFunctionCallToStatus(
  functionCall: { name: string; args?: Record<string, any> },
  timestamp: number
): StatusUpdate | null {
  const functionName = functionCall.name.toLowerCase();
  
  // Map technical function names to business-friendly messages
  const statusMap: Record<string, { message: string; type: StatusUpdate['type'] }> = {
    'transfer_to_agent': {
      message: 'Routing to specialist...',
      type: 'transferring'
    },
    'get_projects': {
      message: 'Gathering project data...',
      type: 'gathering'
    },
    'get_tasks': {
      message: 'Retrieving task information...',
      type: 'gathering'
    },
    'get_team_members': {
      message: 'Loading team information...',
      type: 'gathering'
    },
    'create_project': {
      message: 'Creating new project...',
      type: 'processing'
    },
    'update_task': {
      message: 'Updating task details...',
      type: 'processing'
    },
    'calculate_metrics': {
      message: 'Calculating performance metrics...',
      type: 'processing'
    },
    'search_conversations': {
      message: 'Searching conversation history...',
      type: 'gathering'
    },
    'schedule_meeting': {
      message: 'Checking calendar availability...',
      type: 'processing'
    }
  };
  
  const mapping = statusMap[functionName];
  if (!mapping) {
    // Generic fallback for unknown functions
    return {
      id: `func-${timestamp}`,
      message: 'Processing request...',
      timestamp,
      type: 'processing',
      isVisible: true
    };
  }
  
  return {
    id: `func-${functionName}-${timestamp}`,
    message: mapping.message,
    timestamp,
    type: mapping.type,
    isVisible: true
  };
}

/**
 * Map agent transfers to user-friendly status messages
 */
function mapAgentTransferToStatus(
  targetAgent: string,
  timestamp: number,
  isAdminMode: boolean
): StatusUpdate | null {
  const agentName = targetAgent.toLowerCase();
  
  // Map agent names to business-friendly messages
  const agentMap: Record<string, string> = {
    'project_manager_agent': 'Connecting to project manager...',
    'scheduling_agent': 'Connecting to scheduling assistant...',
    'analytics_agent': 'Connecting to analytics specialist...',
    'onboarding_agent': 'Connecting to onboarding assistant...',
    'orchestrator_agent': 'Coordinating response...'
  };
  
  const message = agentMap[agentName] || `Connecting to ${targetAgent.replace('_agent', '').replace('_', ' ')}...`;
  
  return {
    id: `transfer-${agentName}-${timestamp}`,
    message,
    timestamp,
    type: 'transferring',
    isVisible: true
  };
}

/**
 * Determine if events processing is complete
 */
export function isEventProcessingComplete(events: ADKEvent[]): boolean {
  // Check if we have a final text response from a non-system agent
  return events.some(event => 
    event.content?.parts?.some(part => 
      part.text && 
      part.text.trim() && 
      event.author !== 'user' && 
      event.author !== 'Gaia' &&
      !event.author.includes('system')
    )
  );
}

/**
 * Extract the most recent meaningful status
 */
export function getCurrentStatus(statusUpdates: StatusUpdate[]): string {
  if (statusUpdates.length === 0) {
    return 'Analyzing your request...';
  }
  
  const latest = statusUpdates[statusUpdates.length - 1];
  return latest.message;
}
