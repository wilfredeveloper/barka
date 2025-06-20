/**
 * TypeScript interfaces for ADK Session API responses
 * These interfaces match the structure returned by /api/agent/adk/conversation/:id
 */

// Core ADK Session Response Structure
export interface ADKSessionResponse {
  success: boolean;
  data: ADKSessionData;
}

export interface ADKSessionData {
  conversation: ADKConversationInfo;
  session: ADKSession;
  messages: ADKMessage[];
}

// Conversation Information
export interface ADKConversationInfo {
  id: string;
  title: string;
  status: string;
  lastMessageAt: string;
  client: {
    _id: string;
    user: string;
    projectType: string;
    status: string;
  };
  organization: {
    _id: string;
    name: string;
    id: string;
  };
  adkSessionId: string;
  adkUserId: string;
  adkAppName: string;
}

// ADK Session Information
export interface ADKSession {
  id: string;
  app_name: string;
  user_id: string;
  state: ADKSessionState;
  events: ADKEvent[];
  last_update_time: number;
}

// Session State Structure
export interface ADKSessionState {
  client_id: string;
  organization_id: {
    _id: string;
    name: string;
    id: string;
  };
  conversation_id: string;
  current_agent: string;
  agent_history: AgentHistoryEntry[];
  onboarding: OnboardingState;
  scheduling: SchedulingState;
  user_preferences: Record<string, any>;
  session_metadata: SessionMetadata;
  // Extensible for future state additions
  [key: string]: any;
}

export interface AgentHistoryEntry {
  agent: string;
  timestamp: number;
  context?: Record<string, any>;
}

export interface OnboardingState {
  status: string;
  phase: string | null;
  current_todo: string | null;
  progress: number;
}

export interface SchedulingState {
  meetings: Meeting[];
  availability: Record<string, any>;
  preferences: Record<string, any>;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  duration: number;
  attendees: string[];
}

export interface SessionMetadata {
  created_at: string;
  frontend_conversation_id: string;
  [key: string]: any;
}

// ADK Events and Messages
export interface ADKEvent {
  content: ADKContent;
  invocation_id: string;
  author: string;
  actions: ADKActions;
  long_running_tool_ids: string[];
  id: string;
  timestamp: number;
  // Optional fields for extensibility
  turn_complete?: boolean;
  partial?: boolean;
  error_code?: string;
  error_message?: string;
  interrupted?: boolean;
  custom_metadata?: Record<string, any>;
}

export interface ADKMessage {
  id: string;
  author: string;
  content: ADKContent;
  timestamp: number;
  actions: ADKActions;
  metadata: ADKMessageMetadata;
  // Optional fields for future extensions
  turn_complete?: boolean;
  partial?: boolean;
  error_code?: string;
  error_message?: string;
}

export interface ADKContent {
  parts: ADKContentPart[];
  role: 'user' | 'model';
}

export interface ADKContentPart {
  text?: string;
  functionCall?: ADKFunctionCall;
  functionResponse?: ADKFunctionResponse;
  // Extensible for future content types
  fileData?: {
    fileUri: string;
    mimeType: string;
  };
  inlineData?: {
    data: string;
    mimeType: string;
  };
  videoMetadata?: {
    startOffset: string;
    endOffset: string;
  };
  executableCode?: {
    code: string;
    language: string;
  };
  codeExecutionResult?: {
    outcome: string;
    output: string;
  };
}

export interface ADKFunctionCall {
  id: string;
  name: string;
  args: Record<string, any>;
}

export interface ADKFunctionResponse {
  id: string;
  name: string;
  response: Record<string, any>;
}

export interface ADKActions {
  state_delta: Record<string, any>;
  artifact_delta: Record<string, any>;
  requested_auth_configs: Record<string, any>;
  transfer_to_agent?: string;
  escalate?: boolean;
  skip_summarization?: boolean;
}

export interface ADKMessageMetadata {
  invocation_id: string;
  // Extensible for future metadata
  [key: string]: any;
}

// Frontend-compatible message format
export interface FormattedMessage {
  id: string;
  author: string;
  authorType: 'user' | 'agent' | 'system';
  content: string;
  timestamp: number;
  timestampISO: string;
  messageType: 'text' | 'function_call' | 'function_response' | 'transfer' | 'error';
  functionCall?: {
    name: string;
    args: Record<string, any>;
    id: string;
  };
  functionResponse?: {
    name: string;
    response: Record<string, any>;
    id: string;
  };
  agentTransfer?: {
    fromAgent: string;
    toAgent: string;
  };
  actions: ADKActions;
  metadata: {
    invocation_id: string;
    turn_complete?: boolean;
    partial?: boolean;
    error_code?: string;
    error_message?: string;
    // Extensible metadata
    [key: string]: any;
  };
  // UI-specific properties
  isVisible?: boolean;
  isDebugOnly?: boolean;
  hasAttachments?: boolean;
  attachments?: any[];
}

// Utility types for filtering and processing
export type MessageFilter = 'all' | 'text_only' | 'function_calls' | 'transfers' | 'errors';

export interface MessageProcessingOptions {
  filter?: MessageFilter;
  includeDebugInfo?: boolean;
  includeSystemMessages?: boolean;
  sortOrder?: 'asc' | 'desc';
}

// Error handling
export interface ADKSessionError {
  success: false;
  message: string;
  needsSessionCreation?: boolean;
  conversationData?: Partial<ADKConversationInfo>;
}
