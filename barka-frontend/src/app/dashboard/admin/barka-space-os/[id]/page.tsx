'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Terminal,
  Send,
  User,
  Settings,
  Zap,
  MessageSquare,
  Clock,
  Activity
} from 'lucide-react';
import Image from 'next/image';
import { ADKClient, ADKSessionInfo } from '@/lib/adk-client';
import api from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { adkSessionService } from '@/lib/adk-session-service';

// Types
interface Message {
  _id: string;
  conversation: string;
  sender: 'user' | 'agent';
  content: string;
  createdAt: string;
  attachments?: any[];
  metadata?: {
    author?: string;
    messageType?: string;
    isDebugOnly?: boolean;
  };
}

interface Conversation {
  _id: string;
  title: string;
  client?: string;
  organization?: string;
  createdAt: string;
  lastMessageAt?: string;
  selectedAgent?: string;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

// Available agents for selection
const AVAILABLE_AGENTS: Agent[] = [
  {
    id: 'gaia',
    name: 'Gaia (Orchestrator)',
    description: 'Main orchestrator agent that coordinates all specialized agents',
    icon: <Zap size={16} />,
    color: 'text-brown_sugar-400'
  },
  {
    id: 'project_manager',
    name: 'Project Manager',
    description: 'Advanced project management with MCP server integration',
    icon: <Settings size={16} />,
    color: 'text-blue-400'
  },
  {
    id: 'discovery',
    name: 'Discovery Agent',
    description: 'Client discovery, requirement gathering, and stakeholder interviews',
    icon: <MessageSquare size={16} />,
    color: 'text-green-400'
  },
  {
    id: 'documentation',
    name: 'Documentation Agent',
    description: 'SRS, contracts, proposals, and technical documentation',
    icon: <Clock size={16} />,
    color: 'text-purple-400'
  },
  {
    id: 'jarvis',
    name: 'Jarvis Agent',
    description: 'Scheduling, calendar operations, and meeting coordination',
    icon: <Activity size={16} />,
    color: 'text-orange-400'
  }
];

// Fast pulsating dots loader component - optimized for speed perception
const FastPulsatingDotsLoader = React.memo(() => (
  <div className="flex items-center space-x-1 py-2">
    <span
      className="w-2 h-2 bg-zinc-400 rounded-full"
      style={{
        animation: 'pulsate 0.6s ease-in-out infinite',
        animationDelay: '0s'
      }}
    ></span>
    <span
      className="w-2 h-2 bg-zinc-400 rounded-full"
      style={{
        animation: 'pulsate 0.6s ease-in-out infinite',
        animationDelay: '0.15s'
      }}
    ></span>
    <span
      className="w-2 h-2 bg-zinc-400 rounded-full"
      style={{
        animation: 'pulsate 0.6s ease-in-out infinite',
        animationDelay: '0.3s'
      }}
    ></span>
  </div>
));

// XML Response Renderer Component
const XMLResponseRenderer = React.memo(({ content }: { content: string }) => {
  // Enhanced XML detection - handles multiple XML blocks and nested structures
  const xmlRegex = /<([^>\/\s]+)(?:\s[^>]*)?>[\s\S]*?<\/\1>/g;
  const xmlMatches = Array.from(content.matchAll(xmlRegex));

  if (xmlMatches.length === 0) {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  // Split content into parts with XML blocks highlighted
  const parts: Array<{ type: 'text' | 'xml'; content: string; tagName?: string }> = [];
  let lastIndex = 0;

  xmlMatches.forEach((match) => {
    const [fullMatch, tagName] = match;
    const matchStart = match.index || 0;

    // Add text before XML
    if (matchStart > lastIndex) {
      const textBefore = content.substring(lastIndex, matchStart);
      if (textBefore.trim()) {
        parts.push({ type: 'text', content: textBefore });
      }
    }

    // Add XML block
    const xmlContent = fullMatch.replace(new RegExp(`^<${tagName}[^>]*>|<\/${tagName}>$`, 'g'), '').trim();
    parts.push({
      type: 'xml',
      content: xmlContent,
      tagName: tagName.toLowerCase()
    });

    lastIndex = matchStart + fullMatch.length;
  });

  // Add remaining text
  if (lastIndex < content.length) {
    const remainingText = content.substring(lastIndex);
    if (remainingText.trim()) {
      parts.push({ type: 'text', content: remainingText });
    }
  }

  // Get appropriate styling for XML block type
  const getXMLBlockStyle = (tagName: string) => {
    switch (tagName) {
      case 'confirmation':
      case 'confirm':
        return {
          border: 'border-green-500/30',
          bg: 'bg-green-900/20',
          dot: 'bg-green-500',
          label: 'text-green-400'
        };
      case 'plan':
      case 'planning':
        return {
          border: 'border-blue-500/30',
          bg: 'bg-blue-900/20',
          dot: 'bg-blue-500',
          label: 'text-blue-400'
        };
      case 'error':
      case 'warning':
        return {
          border: 'border-red-500/30',
          bg: 'bg-red-900/20',
          dot: 'bg-red-500',
          label: 'text-red-400'
        };
      default:
        return {
          border: 'border-brown_sugar-500/30',
          bg: 'bg-brown_sugar-900/20',
          dot: 'bg-brown_sugar-500',
          label: 'text-brown_sugar-400'
        };
    }
  };

  return (
    <div className="space-y-3">
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return (
            <div key={index} className="whitespace-pre-wrap">
              {part.content}
            </div>
          );
        } else {
          const style = getXMLBlockStyle(part.tagName || '');
          return (
            <div key={index} className={`${style.bg} border ${style.border} rounded-lg p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 ${style.dot} rounded-full`}></div>
                <span className={`text-xs font-medium ${style.label} uppercase tracking-wide`}>
                  {part.tagName} Response
                </span>
              </div>
              <div className="text-zinc-200 whitespace-pre-wrap font-mono text-sm leading-relaxed">
                {part.content}
              </div>
            </div>
          );
        }
      })}
    </div>
  );
});

// Message Component - optimized with proper memoization
const MessageComponent = React.memo(({ message, debugMode }: { message: Message; debugMode: boolean }) => {
  const isUser = message.sender === 'user';
  const isThinking = message.content === 'Thinking...';

  // Memoize expensive computations
  const messageClasses = useMemo(() => ({
    container: `flex gap-3 mb-4 ${isUser ? 'justify-end' : 'justify-start'}`,
    content: `max-w-[80%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`,
    bubble: `p-3 rounded-xl shadow-sm w-fit message-bubble ${isUser ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-100'}`
  }), [isUser]);

  const showDebugInfo = debugMode && !isUser && message.metadata;

  return (
    <div className={messageClasses.container}>
      {/* Agent Avatar with Name */}
      {!isUser && (
        <div className="flex-shrink-0 flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center mb-1">
            <Image
              src="/barka-logo.svg"
              alt="Barka"
              width={16}
              height={16}
              className="text-brown_sugar-400"
            />
          </div>
          <span className="text-xs text-zinc-500 text-center max-w-[60px] truncate">
            {message.metadata?.author || 'Agent'}
          </span>
        </div>
      )}

      {/* Message Content */}
      <div className={messageClasses.content}>
        {isThinking ? (
          <div className="p-3 rounded-lg text-zinc-400 bg-zinc-800 inline-block">
            <FastPulsatingDotsLoader />
          </div>
        ) : (
          <div className={messageClasses.bubble}>
            {/* Debug Info */}
            {showDebugInfo && (
              <div className="mb-3 p-2 bg-zinc-900/50 border border-zinc-700/50 rounded-md">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <span className="font-medium">🤖 {message.metadata!.author || 'Agent'}</span>
                  {message.metadata!.messageType && (
                    <Badge variant="outline" className="text-xs">
                      {message.metadata!.messageType}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Message Content with XML Detection */}
            <XMLResponseRenderer content={message.content} />
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brown_sugar-600 flex items-center justify-center">
          <User size={16} className="text-white" />
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.message._id === nextProps.message._id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.debugMode === nextProps.debugMode
  );
});

export default function BarkaSpaceOSConversationPage() {
  const router = useRouter();
  const params = useParams();

  const conversationId = params.id as string;

  // State management
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent>(AVAILABLE_AGENTS[0]);
  const [user, setUser] = useState<any>(null);
  const [shouldAutoFocus, setShouldAutoFocus] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);
  const [adkSessionInfo, setAdkSessionInfo] = useState<ADKSessionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ADK Client
  const adkClient = useRef(new ADKClient());

  // Function to send initial message with session info
  const sendInitialMessage = async (messageContent: string, sessionInfo: ADKSessionInfo) => {
    try {
      setIsSending(true);

      // Add user message to UI immediately
      const userMessage: Message = {
        _id: `user_${Date.now()}`,
        content: messageContent,
        sender: 'user' as const,
        conversation: conversationId,
        createdAt: new Date().toISOString()
      };

      setMessages(prev => [...prev, userMessage]);

      // Add thinking indicator
      const thinkingMessage: Message = {
        _id: `thinking_${Date.now()}`,
        content: 'Thinking...',
        sender: 'agent' as const,
        conversation: conversationId,
        createdAt: new Date().toISOString()
      };

      setMessages(prev => [...prev, thinkingMessage]);

      // Send message via ADK
      console.log('Sending initial message with params:', {
        userId: sessionInfo.userId,
        sessionId: sessionInfo.sessionId,
        content: messageContent
      });

      const adkMessages = await adkClient.current.sendMessage(
        sessionInfo.userId,
        sessionInfo.sessionId,
        messageContent
      );

      // Remove thinking indicator and add actual responses
      setMessages(prev => prev.filter(msg => msg._id !== thinkingMessage._id));

      if (adkMessages && adkMessages.length > 0) {
        // Filter out function calls and system messages, only show user-facing content
        const userFacingMessages = adkMessages.filter(msg =>
          msg.content &&
          msg.content.trim() &&
          msg.type !== 'function_call' &&
          !msg.content.includes('**Agent Transfer**') // Filter out transfer messages
        );

        if (userFacingMessages.length > 0) {
          const agentResponses: Message[] = userFacingMessages.map((adkMsg, index) => ({
            _id: `agent_${Date.now()}_${index}`,
            content: adkMsg.content,
            sender: 'agent' as const,
            conversation: conversationId,
            createdAt: new Date().toISOString(),
            metadata: {
              author: adkMsg.author || selectedAgent.name,
              messageType: adkMsg.type || 'text'
            }
          }));

          setMessages(prev => [...prev, ...agentResponses]);
        } else {
          // If no user-facing messages, show a generic response
          const fallbackResponse: Message = {
            _id: `agent_${Date.now()}`,
            content: 'I\'m processing your request. How can I help you today?',
            sender: 'agent' as const,
            conversation: conversationId,
            createdAt: new Date().toISOString(),
            metadata: {
              author: selectedAgent.name,
              messageType: 'text'
            }
          };
          setMessages(prev => [...prev, fallbackResponse]);
        }
      } else {
        // No response received
        const errorMessage: Message = {
          _id: `error_${Date.now()}`,
          content: 'No response received from agent. Please try again.',
          sender: 'agent' as const,
          conversation: conversationId,
          createdAt: new Date().toISOString(),
          metadata: {
            author: 'system',
            messageType: 'error'
          }
        };
        setMessages(prev => [...prev, errorMessage]);
      }

    } catch (error: any) {
      console.error('Failed to send initial message:', error);
      setError(error.message || 'Failed to send initial message');

      // Remove thinking indicator on error
      setMessages(prev => prev.filter(msg => msg.content !== 'Thinking...'));
    } finally {
      setIsSending(false);
    }
  };

  // Initialize conversation and session
  useEffect(() => {
    const initializeConversation = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get current user
        const currentUser = getCurrentUser();
        if (!currentUser) {
          router.push('/login');
          return;
        }

        // Verify user has admin permissions
        if (!['org_admin', 'org_member'].includes(currentUser.role)) {
          setError('Access denied. Admin or member role required.');
          return;
        }

        setUser(currentUser);

        // Get conversation details
        console.log('Loading conversation:', conversationId);
        const conversationResponse = await api.get(`/conversations/${conversationId}`);

        if (!conversationResponse.data.success) {
          throw new Error('Conversation not found');
        }

        const conversation = conversationResponse.data.data;
        setActiveConversation(conversation);

        // Get ADK session for this conversation
        console.log('Getting ADK session for conversation:', conversationId);
        const sessionData = await adkSessionService.getConversationSession(conversationId);

        if (!sessionData) {
          throw new Error('Failed to get ADK session');
        }

        setSessionData(sessionData);
        console.log('ADK session retrieved:', sessionData.session.id);

        // Initialize ADK client session info
        const sessionInfo: ADKSessionInfo = {
          sessionId: sessionData.session.id,
          userId: sessionData.conversation.adkUserId,
          isConnected: true,
          conversationId: conversationId,
          appName: sessionData.conversation.adkAppName || 'orchestrator'
        };

        setAdkSessionInfo(sessionInfo);
        console.log('ADK session info set:', sessionInfo);

        // Fetch existing messages from the conversation
        console.log('Fetching existing messages for conversation:', conversationId);
        try {
          const formattedMessages = await adkSessionService.getFormattedMessages(conversationId, {
            filter: 'all',
            includeDebugInfo: debugMode,
            includeSystemMessages: true,
            sortOrder: 'asc'
          });

          if (formattedMessages.length > 0) {
            const frontendMessages: Message[] = formattedMessages.map(fmsg => ({
              _id: fmsg.id,
              conversation: conversationId,
              sender: (fmsg.authorType === 'user' ? 'user' : 'agent') as 'user' | 'agent',
              content: fmsg.content,
              createdAt: fmsg.timestampISO,
              attachments: [],
              metadata: {
                author: fmsg.author,
                messageType: fmsg.messageType,
                isDebugOnly: fmsg.isDebugOnly,
                ...fmsg.metadata
              }
            }));

            setMessages(frontendMessages);
            console.log(`Loaded ${frontendMessages.length} existing messages`);
          } else {
            // Start with empty messages if no existing messages
            setMessages([]);
            console.log('No existing messages found, starting with empty conversation');
          }
        } catch (messageError) {
          console.error('Failed to fetch existing messages:', messageError);
          // Start with empty messages if fetching fails
          setMessages([]);
        }

        // Check for initial message from sessionStorage (for new conversations)
        const initialMessage = sessionStorage.getItem(`initialMessage_${conversationId}`);
        if (initialMessage) {
          console.log('Sending initial message from sessionStorage:', initialMessage);
          // Clear the initial message from sessionStorage to prevent re-sending
          sessionStorage.removeItem(`initialMessage_${conversationId}`);
          // Send the message directly using the session info we just created
          sendInitialMessage(initialMessage, sessionInfo);
        }

      } catch (error: any) {
        console.error('Failed to initialize conversation:', error);
        setError(error.message || 'Failed to initialize conversation');
      } finally {
        setIsLoading(false);
      }
    };

    if (conversationId) {
      initializeConversation();
    }

    // Cleanup on unmount
    return () => {
      adkClient.current.disconnect();
    };
  }, [conversationId, router, selectedAgent]);

  // Handle sending messages
  const handleSendMessage = useCallback(async (messageContent: string) => {
    if (!messageContent.trim() || !conversationId || !adkSessionInfo) {
      console.warn('Cannot send message: missing conversation or session info');
      return;
    }

    try {
      setIsSending(true);

      // Add user message to UI immediately
      const userMessage: Message = {
        _id: `user_${Date.now()}`,
        content: messageContent,
        sender: 'user' as const,
        conversation: conversationId,
        createdAt: new Date().toISOString()
      };

      setMessages(prev => [...prev, userMessage]);

      // Add thinking indicator
      const thinkingMessage: Message = {
        _id: `thinking_${Date.now()}`,
        content: 'Thinking...',
        sender: 'agent' as const,
        conversation: conversationId,
        createdAt: new Date().toISOString()
      };

      setMessages(prev => [...prev, thinkingMessage]);

      // Send message via ADK (same pattern as project manager test)
      console.log('Sending message with params:', {
        userId: adkSessionInfo.userId,
        sessionId: adkSessionInfo.sessionId,
        content: messageContent
      });

      const adkMessages = await adkClient.current.sendMessage(
        adkSessionInfo.userId,
        adkSessionInfo.sessionId,
        messageContent
      );

      // Remove thinking indicator and add actual responses
      setMessages(prev => prev.filter(msg => msg._id !== thinkingMessage._id));

      if (adkMessages && adkMessages.length > 0) {
        // Filter out function calls and system messages, only show user-facing content
        const userFacingMessages = adkMessages.filter(msg =>
          msg.content &&
          msg.content.trim() &&
          msg.type !== 'function_call' &&
          !msg.content.includes('**Agent Transfer**') // Filter out transfer messages
        );

        if (userFacingMessages.length > 0) {
          const agentResponses: Message[] = userFacingMessages.map((adkMsg, index) => ({
            _id: `agent_${Date.now()}_${index}`,
            content: adkMsg.content,
            sender: 'agent' as const,
            conversation: conversationId,
            createdAt: new Date().toISOString(),
            metadata: {
              author: adkMsg.author || selectedAgent.name,
              messageType: adkMsg.type || 'text'
            }
          }));

          setMessages(prev => [...prev, ...agentResponses]);
        } else {
          // If no user-facing messages, show a generic response
          const fallbackResponse: Message = {
            _id: `agent_${Date.now()}`,
            content: 'I\'m processing your request. How can I help you today?',
            sender: 'agent' as const,
            conversation: conversationId,
            createdAt: new Date().toISOString(),
            metadata: {
              author: selectedAgent.name,
              messageType: 'text'
            }
          };
          setMessages(prev => [...prev, fallbackResponse]);
        }
      } else {
        // No response received
        const errorMessage: Message = {
          _id: `error_${Date.now()}`,
          content: 'No response received from agent. Please try again.',
          sender: 'agent' as const,
          conversation: conversationId,
          createdAt: new Date().toISOString(),
          metadata: {
            author: 'system',
            messageType: 'error'
          }
        };
        setMessages(prev => [...prev, errorMessage]);
      }

    } catch (error: any) {
      console.error('Failed to send message:', error);
      setError(error.message || 'Failed to send message');

      // Remove thinking indicator on error
      setMessages(prev => prev.filter(msg => msg.content !== 'Thinking...'));
    } finally {
      setIsSending(false);
      setShouldAutoFocus(true);
    }
  }, [conversationId, adkSessionInfo, selectedAgent]);

  // Reset auto-focus after it's been used
  useEffect(() => {
    if (shouldAutoFocus) {
      const timer = setTimeout(() => {
        setShouldAutoFocus(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [shouldAutoFocus]);



  // Chat Message List Component
  const ChatMessageList = React.memo(({ messages, debugMode }: { messages: Message[], debugMode: boolean }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const filteredMessages = useMemo(() => {
      return messages.filter(message => {
        // Always show user messages
        if (message.sender === 'user') return true;

        // For agent messages, filter based on debug mode
        if (!debugMode && message.sender === 'agent' && message.metadata) {
          // Hide function calls, system messages, and debug-only messages
          if (message.metadata.messageType === 'function_call' ||
              message.metadata.messageType === 'function_response' ||
              message.metadata.messageType === 'welcome' ||
              message.metadata.isDebugOnly) {
            return false;
          }
        }

        return true;
      });
    }, [messages, debugMode]);

    return (
      <div className="space-y-4 p-4">
        {filteredMessages.map((message) => (
          <MessageComponent key={message._id} message={message} debugMode={debugMode} />
        ))}
        <div ref={messagesEndRef} />
      </div>
    );
  });

  // Message Input Component
  const MessageInputBar = React.memo(({
    onSendMessage,
    isSending,
    selectedAgent,
    autoFocus = false
  }: {
    onSendMessage: (message: string) => void;
    isSending: boolean;
    selectedAgent?: Agent;
    autoFocus?: boolean;
  }) => {
    const [inputValue, setInputValue] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    };

    const handleSend = () => {
      if (inputValue.trim() && !isSending) {
        onSendMessage(inputValue.trim());
        setInputValue('');
      }
    };

    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }, [inputValue]);

    // Auto-focus when requested (after agent response)
    useEffect(() => {
      if (autoFocus && textareaRef.current && !isSending) {
        textareaRef.current.focus();
      }
    }, [autoFocus, isSending]);

    return (
      <div className="w-full max-w-3xl mx-auto p-2 border border-brown_sugar-500/20 border-1 rounded-lg">
        <div className="glass-surface rounded-xl overflow-hidden">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              placeholder="Continue the conversation..."
              className="w-full min-h-[10px] max-h-[400px] bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base text-white placeholder:text-zinc-400 chat-textarea-optimized custom-scrollbar"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending}
            />
          </div>

          <div className="flex items-center justify-between p-3 pt-0">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              {selectedAgent && (
                <div className="flex items-center gap-1">
                  <span className={selectedAgent.color}>{selectedAgent.icon}</span>
                  <span>{selectedAgent.name}</span>
                </div>
              )}
            </div>

            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isSending}
              size="sm"
              className="bg-brown_sugar-600 hover:bg-brown_sugar-700 text-white"
            >
              {isSending ? (
                <FastPulsatingDotsLoader />
              ) : (
                <>
                  <Send size={14} className="mr-1" />
                  Send
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Terminal size={48} className="text-brown_sugar-400 mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-semibold text-zinc-100 mb-2">Loading Conversation</h2>
          <FastPulsatingDotsLoader />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <Terminal size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-zinc-100 mb-2">Error</h2>
          <p className="text-zinc-400 mb-4">{error}</p>
          <Button onClick={() => router.push('/dashboard/admin/barka-space-os')} variant="outline">
            Back to Space OS
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white relative">
      <style jsx>{`
        @keyframes pulsate {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(39, 39, 42, 0.3);
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(161, 161, 170, 0.3);
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(161, 161, 170, 0.5);
        }
      `}</style>
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/admin/barka-space-os')}
                className="text-zinc-400 hover:text-zinc-100"
              >
                ← Back to Space OS
              </Button>
              <div className="h-6 w-px bg-zinc-700" />
              <h1 className="text-xl font-semibold text-zinc-100 flex items-center gap-2">
                <Terminal size={20} className="text-brown_sugar-400" />
                {activeConversation?.title || 'Barka Space OS'}
              </h1>
              <Badge className="bg-brown_sugar-500/20 text-brown_sugar-300">
                Active Session
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDebugMode(!debugMode)}
                className={`text-zinc-400 hover:text-zinc-100 ${debugMode ? 'bg-zinc-700' : ''}`}
              >
                Debug {debugMode ? 'ON' : 'OFF'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 relative">
        <div className="flex flex-col h-[calc(100vh-8rem)]">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <ChatMessageList messages={messages} debugMode={debugMode} />
          </div>

          {/* Message Input */}
          <div className="sticky bottom-0 bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-800 pt-4">
            <MessageInputBar
              onSendMessage={handleSendMessage}
              isSending={isSending}
              selectedAgent={selectedAgent}
              autoFocus={shouldAutoFocus}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
