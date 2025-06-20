/**
 * ADK Message Formatter Utility
 * 
 * This utility formats ADK session messages into frontend-compatible format
 * for display in the chat UI. It handles all message types including text,
 * function calls, agent transfers, and system messages.
 */

import {
  ADKSessionData,
  ADKMessage,
  ADKContentPart,
  FormattedMessage,
  MessageProcessingOptions,
  MessageFilter
} from '@/types/adk-session';

/**
 * Main function to format ADK session messages for frontend display
 */
export function formatADKMessages(
  sessionData: ADKSessionData,
  options: MessageProcessingOptions = {}
): FormattedMessage[] {
  const {
    filter = 'all',
    includeDebugInfo = false,
    includeSystemMessages = true,
    sortOrder = 'asc'
  } = options;

  const formattedMessages: FormattedMessage[] = [];

  // Process each message from the ADK session
  for (const message of sessionData.messages) {
    const processedMessages = processADKMessage(message, includeDebugInfo, includeSystemMessages);
    formattedMessages.push(...processedMessages);
  }

  // Apply filtering
  const filteredMessages = applyMessageFilter(formattedMessages, filter);

  // Sort messages
  const sortedMessages = sortMessages(filteredMessages, sortOrder);

  return sortedMessages;
}

/**
 * Process a single ADK message into one or more formatted messages
 */
function processADKMessage(
  message: ADKMessage,
  includeDebugInfo: boolean,
  includeSystemMessages: boolean
): FormattedMessage[] {
  const results: FormattedMessage[] = [];
  const baseTimestamp = message.timestamp;
  const timestampISO = new Date(baseTimestamp * 1000).toISOString();

  // Process each content part (handle null/empty parts safely)
  const parts = message.content.parts || [];

  if (parts.length === 0) {
    // Handle messages with no content parts (e.g., system messages, empty responses)
    console.log(`⚠️ Message ${message.id} has no content parts, creating placeholder message`);
    const placeholderMessage: FormattedMessage = {
      id: `${message.id}-empty`,
      author: message.author,
      authorType: getAuthorType(message.author),
      content: '', // Empty content for messages with no parts
      timestamp: baseTimestamp,
      timestampISO,
      messageType: 'text',
      actions: message.actions,
      metadata: {
        invocation_id: message.metadata.invocation_id,
        ...message.metadata
      },
      isVisible: false, // Don't show empty messages in UI
      isDebugOnly: true
    };

    if (shouldIncludeMessage(placeholderMessage, includeSystemMessages, includeDebugInfo)) {
      results.push(placeholderMessage);
    }
  } else {
    // Process each content part normally
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const partTimestamp = baseTimestamp + (i * 0.001); // Slight offset for ordering

      // Handle text content
      if (part.text) {
        const textMessage = createTextMessage(message, part, partTimestamp, timestampISO);
        if (shouldIncludeMessage(textMessage, includeSystemMessages)) {
          results.push(textMessage);
        }
      }

      // Handle function calls
      if (part.functionCall) {
        const functionCallMessage = createFunctionCallMessage(message, part, partTimestamp, timestampISO);
        if (shouldIncludeMessage(functionCallMessage, includeSystemMessages, includeDebugInfo)) {
          results.push(functionCallMessage);
        }
      }

      // Handle function responses
      if (part.functionResponse) {
        const functionResponseMessage = createFunctionResponseMessage(message, part, partTimestamp, timestampISO);
        if (shouldIncludeMessage(functionResponseMessage, includeSystemMessages, includeDebugInfo)) {
          results.push(functionResponseMessage);
        }
      }

      // Handle other content types (extensible)
      if (part.fileData || part.inlineData || part.executableCode) {
        const specialContentMessage = createSpecialContentMessage(message, part, partTimestamp, timestampISO);
        if (shouldIncludeMessage(specialContentMessage, includeSystemMessages, includeDebugInfo)) {
          results.push(specialContentMessage);
        }
      }
    }
  }

  // Handle agent transfers
  if (message.actions.transfer_to_agent) {
    const transferMessage = createAgentTransferMessage(message, baseTimestamp, timestampISO);
    if (shouldIncludeMessage(transferMessage, includeSystemMessages)) {
      results.push(transferMessage);
    }
  }

  return results;
}

/**
 * Create a formatted text message
 */
function createTextMessage(
  message: ADKMessage,
  part: ADKContentPart,
  timestamp: number,
  timestampISO: string
): FormattedMessage {
  return {
    id: `${message.id}-text`,
    author: message.author,
    authorType: getAuthorType(message.author),
    content: part.text || '',
    timestamp,
    timestampISO,
    messageType: 'text',
    actions: message.actions,
    metadata: {
      invocation_id: message.metadata.invocation_id,
      ...message.metadata
    },
    isVisible: true,
    isDebugOnly: false
  };
}

/**
 * Create a formatted function call message
 */
function createFunctionCallMessage(
  message: ADKMessage,
  part: ADKContentPart,
  timestamp: number,
  timestampISO: string
): FormattedMessage {
  const funcCall = part.functionCall!;
  
  return {
    id: `${message.id}-func-call-${funcCall.id}`,
    author: message.author,
    authorType: getAuthorType(message.author),
    content: `🔧 **Function Call**: \`${funcCall.name}\``,
    timestamp,
    timestampISO,
    messageType: 'function_call',
    functionCall: {
      name: funcCall.name,
      args: funcCall.args,
      id: funcCall.id
    },
    actions: message.actions,
    metadata: {
      invocation_id: message.metadata.invocation_id,
      function_name: funcCall.name,
      ...message.metadata
    },
    isVisible: true,
    isDebugOnly: true
  };
}

/**
 * Create a formatted function response message
 */
function createFunctionResponseMessage(
  message: ADKMessage,
  part: ADKContentPart,
  timestamp: number,
  timestampISO: string
): FormattedMessage {
  const funcResponse = part.functionResponse!;
  
  return {
    id: `${message.id}-func-response-${funcResponse.id}`,
    author: message.author,
    authorType: getAuthorType(message.author),
    content: `📋 **Function Response**: \`${funcResponse.name}\``,
    timestamp,
    timestampISO,
    messageType: 'function_response',
    functionResponse: {
      name: funcResponse.name,
      response: funcResponse.response,
      id: funcResponse.id
    },
    actions: message.actions,
    metadata: {
      invocation_id: message.metadata.invocation_id,
      function_name: funcResponse.name,
      ...message.metadata
    },
    isVisible: true,
    isDebugOnly: true
  };
}

/**
 * Create a formatted agent transfer message
 */
function createAgentTransferMessage(
  message: ADKMessage,
  timestamp: number,
  timestampISO: string
): FormattedMessage {
  const toAgent = message.actions.transfer_to_agent!;
  
  return {
    id: `${message.id}-transfer`,
    author: message.author,
    authorType: getAuthorType(message.author),
    content: `🔄 **Agent Transfer**: Routing to \`${toAgent}\` agent`,
    timestamp,
    timestampISO,
    messageType: 'transfer',
    agentTransfer: {
      fromAgent: message.author,
      toAgent: toAgent
    },
    actions: message.actions,
    metadata: {
      invocation_id: message.metadata.invocation_id,
      transfer_to: toAgent,
      ...message.metadata
    },
    isVisible: true,
    isDebugOnly: false
  };
}

/**
 * Create a formatted special content message (files, code, etc.)
 */
function createSpecialContentMessage(
  message: ADKMessage,
  part: ADKContentPart,
  timestamp: number,
  timestampISO: string
): FormattedMessage {
  let content = '📎 **Special Content**';
  let messageType: FormattedMessage['messageType'] = 'text';

  if (part.fileData) {
    content = `📁 **File**: ${part.fileData.mimeType}`;
  } else if (part.inlineData) {
    content = `📋 **Inline Data**: ${part.inlineData.mimeType}`;
  } else if (part.executableCode) {
    content = `💻 **Code**: ${part.executableCode.language}`;
    messageType = 'text';
  }

  return {
    id: `${message.id}-special`,
    author: message.author,
    authorType: getAuthorType(message.author),
    content,
    timestamp,
    timestampISO,
    messageType,
    actions: message.actions,
    metadata: {
      invocation_id: message.metadata.invocation_id,
      content_type: 'special',
      ...message.metadata
    },
    isVisible: true,
    isDebugOnly: true
  };
}

/**
 * Determine author type based on author name
 */
function getAuthorType(author: string): 'user' | 'agent' | 'system' {
  if (author === 'user') return 'user';
  if (author.includes('agent') || author === 'jarvis' || author === 'barka' || author === 'orchestrator_agent') {
    return 'agent';
  }
  return 'system';
}

/**
 * Check if a message should be included based on options
 */
function shouldIncludeMessage(
  message: FormattedMessage,
  includeSystemMessages: boolean,
  includeDebugInfo: boolean = true
): boolean {
  if (!includeSystemMessages && message.authorType === 'system') {
    return false;
  }
  
  if (!includeDebugInfo && message.isDebugOnly) {
    return false;
  }
  
  return true;
}

/**
 * Apply message filtering
 */
function applyMessageFilter(messages: FormattedMessage[], filter: MessageFilter): FormattedMessage[] {
  switch (filter) {
    case 'text_only':
      return messages.filter(msg => msg.messageType === 'text');
    case 'function_calls':
      return messages.filter(msg => msg.messageType === 'function_call' || msg.messageType === 'function_response');
    case 'transfers':
      return messages.filter(msg => msg.messageType === 'transfer');
    case 'errors':
      return messages.filter(msg => msg.messageType === 'error' || msg.metadata.error_code);
    case 'all':
    default:
      return messages;
  }
}

/**
 * Sort messages by timestamp
 */
function sortMessages(messages: FormattedMessage[], order: 'asc' | 'desc'): FormattedMessage[] {
  return messages.sort((a, b) => {
    const comparison = a.timestamp - b.timestamp;
    return order === 'asc' ? comparison : -comparison;
  });
}

/**
 * Utility function to extract session summary information
 */
export function extractSessionSummary(sessionData: ADKSessionData) {
  const { conversation, session, messages } = sessionData;
  
  return {
    conversationId: conversation.id,
    title: conversation.title,
    status: conversation.status,
    clientName: conversation.client._id,
    organizationName: conversation.organization.name,
    sessionId: session.id,
    currentAgent: session.state.current_agent,
    messageCount: messages.length,
    lastActivity: new Date(session.last_update_time * 1000).toISOString(),
    onboardingStatus: session.state.onboarding?.status || 'unknown',
    onboardingProgress: session.state.onboarding?.progress || 0
  };
}
