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
  Activity,
  ChevronLeft
} from 'lucide-react'; // Added ChevronLeft for back button
import Image from 'next/image';
import { ADKClient, ADKSessionInfo } from '@/lib/adk-client';
import api from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { adkSessionService } from '@/lib/adk-session-service';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

// Types (assuming these are unchanged from your original)
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
  responseTime?: number; // Response time in milliseconds
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

// Available agents for selection (assuming unchanged)
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


// Circular progress indicator component
const CircularProgress = React.memo(({ size = 20, strokeWidth = 2, className = "" }: {
  size?: number;
  strokeWidth?: number;
  className?: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="animate-spin"
        style={{ animationDuration: '1.5s' }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="opacity-25"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * 0.25}
          className="opacity-75"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
});

// Response time indicator component
const ResponseTimeIndicator = React.memo(({ responseTime }: { responseTime?: number }) => {
  if (!responseTime) return null;

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="flex items-center gap-1.5 mt-2 text-xs text-zinc-500">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="opacity-60">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
        <polyline points="12,6 12,12 16,14" stroke="currentColor" strokeWidth="2"/>
      </svg>
      <span>Response time: {formatTime(responseTime)}</span>
    </div>
  );
});

// Fast pulsating dots loader component with circular progress - optimized for speed perception
const FastPulsatingDotsLoader = React.memo(() => (
  <div className="flex items-center space-x-3 py-2">
    <CircularProgress size={16} className="text-brown_sugar-400" />
    <div className="flex items-center space-x-1">
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
  </div>
));

// Enhanced Message Content Renderer Component
const MessageContentRenderer = React.memo(({ content }: { content: string }) => {
  const xmlRegex = /<([^>\/\s]+)(?:\s[^>]*)?>[\s\S]*?<\/\1>/g;
  const xmlMatches = Array.from(content.matchAll(xmlRegex));

  if (xmlMatches.length === 0) {
    return (
      <div className="prose prose-invert max-w-none"> {/* Removed prose-sm for larger base */}
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            p: ({ children }) => <p className="mb-3 text-base leading-relaxed text-zinc-100">{children}</p>,
            h1: ({ children }) => <h1 className="text-xl font-semibold mb-3 text-zinc-50">{children}</h1>,
            h2: ({ children }) => <h2 className="text-lg font-semibold mb-3 text-zinc-50">{children}</h2>,
            h3: ({ children }) => <h3 className="text-base font-semibold mb-2 text-zinc-50">{children}</h3>,
            h4: ({ children }) => <h4 className="text-sm font-semibold mb-2 text-zinc-100">{children}</h4>,
            h5: ({ children }) => <h5 className="text-sm font-medium mb-1 text-zinc-200">{children}</h5>,
            h6: ({ children }) => <h6 className="text-xs font-medium mb-1 text-zinc-300">{children}</h6>,
            ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1.5 text-base">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1.5 text-base">{children}</ol>,
            li: ({ children }) => <li className="text-zinc-100">{children}</li>, // Ensure consistent color with <p>
            code: ({ children, className }) => {
              const isInline = !className;
              return isInline ? (
                <code className="bg-zinc-700 text-zinc-100 px-1.5 py-0.5 rounded text-sm font-mono">
                  {children}
                </code>
              ) : (
                <code className={className}>{children}</code>
              );
            },
            pre: ({ children }) => (
              <pre className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 overflow-x-auto mb-3 custom-scrollbar">
                {children}
              </pre>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-zinc-600 pl-4 italic text-zinc-300 mb-3">
                {children}
              </blockquote>
            ),
            a: ({ children, href }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 underline"
              >
                {children}
              </a>
            ),
            strong: ({ children }) => <strong className="font-semibold text-zinc-50">{children}</strong>,
            em: ({ children }) => <em className="italic text-zinc-200">{children}</em>,
            table: ({ children }) => (
              <div className="overflow-x-auto my-4 custom-scrollbar">
                <table className="min-w-full border border-zinc-700 rounded-lg overflow-hidden">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-zinc-800">
                {children}
              </thead>
            ),
            tbody: ({ children }) => (
              <tbody className="bg-zinc-900/50">
                {children}
              </tbody>
            ),
            tr: ({ children }) => (
              <tr className="border-b border-zinc-700 hover:bg-zinc-800/30 transition-colors">
                {children}
              </tr>
            ),
            th: ({ children }) => (
              <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-100 border-r border-zinc-700 last:border-r-0">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-4 py-3 text-sm text-zinc-200 border-r border-zinc-700 last:border-r-0">
                {children}
              </td>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }

  const parts: Array<{ type: 'text' | 'xml'; content: string; tagName?: string }> = [];
  let lastIndex = 0;

  xmlMatches.forEach((match) => {
    const [fullMatch, tagName] = match;
    const matchStart = match.index || 0;

    if (matchStart > lastIndex) {
      const textBefore = content.substring(lastIndex, matchStart);
      if (textBefore.trim()) {
        parts.push({ type: 'text', content: textBefore });
      }
    }
    const xmlContent = fullMatch.replace(new RegExp(`^<${tagName}[^>]*>|<\/${tagName}>$`, 'g'), '').trim();
    parts.push({ type: 'xml', content: xmlContent, tagName: tagName.toLowerCase() });
    lastIndex = matchStart + fullMatch.length;
  });

  if (lastIndex < content.length) {
    const remainingText = content.substring(lastIndex);
    if (remainingText.trim()) {
      parts.push({ type: 'text', content: remainingText });
    }
  }

  const getXMLBlockStyle = (tagName: string) => {
    // ... (styles unchanged, but you could enhance these too if needed)
    switch (tagName) {
      case 'confirmation':
      case 'confirm':
        return { border: 'border-green-500/30', bg: 'bg-green-900/20', dot: 'bg-green-500', label: 'text-green-400' };
      case 'plan':
      case 'planning':
        return { border: 'border-blue-500/30', bg: 'bg-blue-900/20', dot: 'bg-blue-500', label: 'text-blue-400' };
      case 'error':
      case 'warning':
        return { border: 'border-red-500/30', bg: 'bg-red-900/20', dot: 'bg-red-500', label: 'text-red-400' };
      default:
        return { border: 'border-brown_sugar-500/30', bg: 'bg-brown_sugar-900/20', dot: 'bg-brown_sugar-500', label: 'text-brown_sugar-400' };
    }
  };

  return (
    <div className="space-y-4"> {/* Increased space between text/XML parts */}
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return (
            <div key={index} className="whitespace-pre-wrap text-base leading-relaxed text-zinc-100">
              {part.content} {/* Apply base styling for consistency */}
            </div>
          );
        } else {
          const style = getXMLBlockStyle(part.tagName || '');
          return (
            <div key={index} className={`${style.bg} border ${style.border} rounded-xl p-4 sm:p-5`}> {/* Increased padding, rounded-xl */}
              <div className="flex items-center gap-2 mb-4"> {/* Increased margin bottom */}
                <div className={`w-2.5 h-2.5 ${style.dot} rounded-full`}></div> {/* Slightly larger dot */}
                <span className={`text-xs font-medium ${style.label} uppercase tracking-wider`}> {/* Wider tracking */}
                  {part.tagName} Response
                </span>
              </div>
              <div className="text-zinc-200 whitespace-pre-wrap font-mono text-sm leading-relaxed custom-scrollbar">
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

  const messageClasses = useMemo(() => ({
    container: `flex gap-4 mb-6 ${isUser ? 'justify-end' : 'justify-start'}`, // Increased gap and mb
    contentWrapper: `flex flex-col ${isUser ? 'items-end' : 'items-start'}`, // Renamed for clarity
    // Max width adjustments: user messages more constrained to prevent overlap
    // Agent messages can be wider for better readability
    bubble: `p-4 rounded-2xl shadow-lg w-fit message-bubble my-2
             ${isUser ? 'bg-zinc-800 text-white max-w-[75%] md:max-w-lg lg:max-w-xl'
        : 'text-zinc-100 max-w-[85%] md:max-w-2xl lg:max-w-3xl'}`, // More conservative user message width
  }), [isUser]);

  const showDebugInfo = debugMode && !isUser && message.metadata;

  return (
    <div className={messageClasses.container}>
      {!isUser && (
        <div className="flex-shrink-0 flex flex-col items-center pt-1"> {/* Added pt-1 for alignment with bubble top */}
          <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center mb-1.5"> {/* Larger avatar, increased mb */}
            <Image
              src="/barka-logo.svg"
              alt="Barka"
              width={20} // Increased size
              height={20} // Increased size
              className="text-brown_sugar-400"
            />
          </div>
          <span className="text-xs text-zinc-500 text-center max-w-[70px] truncate"> {/* Increased max-w */}
            {message.metadata?.author || 'Agent'}
          </span>
        </div>
      )}

      <div className={messageClasses.contentWrapper}>
        {isThinking ? (
          <div className="p-4 rounded-xl text-zinc-400 bg-zinc-800 inline-block"> {/* Increased padding, rounded-xl */}
            <FastPulsatingDotsLoader />
          </div>
        ) : (
          <div className={messageClasses.bubble}>
            {showDebugInfo && (
              <div className="mb-3 p-3 bg-zinc-900/60 border border-zinc-700/60 rounded-lg"> {/* Increased padding, softer bg/border */}
                <div className="flex items-center gap-2.5 text-xs text-zinc-400"> {/* Increased gap */}
                  <span className="font-medium">🤖 {message.metadata!.author || 'Agent'}</span>
                  {message.metadata!.messageType && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5"> {/* Adjusted padding */}
                      {message.metadata!.messageType}
                    </Badge>
                  )}
                </div>
              </div>
            )}
            <MessageContentRenderer content={message.content} />
            {!isUser && message.responseTime && (
              <ResponseTimeIndicator responseTime={message.responseTime} />
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brown_sugar-600 flex items-center justify-center self-start pt-1"> {/* Larger, self-start, pt-1 */}
          <User size={20} className="text-white" /> {/* Increased size */}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
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
  const [requestStartTime, setRequestStartTime] = useState<number | null>(null);

  const adkClient = useRef(new ADKClient());

  const sendInitialMessage = useCallback(async (messageContent: string, sessionInfo: ADKSessionInfo) => {
    // ... (logic unchanged)
    try {
      setIsSending(true);
      const startTime = Date.now();
      setRequestStartTime(startTime);

      const userMessage: Message = { _id: `user_${Date.now()}`, content: messageContent, sender: 'user' as const, conversation: conversationId, createdAt: new Date().toISOString() };
      setMessages(prev => [...prev, userMessage]);
      const thinkingMessage: Message = { _id: `thinking_${Date.now()}`, content: 'Thinking...', sender: 'agent' as const, conversation: conversationId, createdAt: new Date().toISOString() };
      setMessages(prev => [...prev, thinkingMessage]);
      console.log('Sending initial message with params:', { userId: sessionInfo.userId, sessionId: sessionInfo.sessionId, content: messageContent });

      const adkMessages = await adkClient.current.sendMessage(sessionInfo.userId, sessionInfo.sessionId, messageContent);
      const responseTime = Date.now() - startTime;

      setMessages(prev => prev.filter(msg => msg._id !== thinkingMessage._id));
      if (adkMessages && adkMessages.length > 0) {
        const userFacingMessages = adkMessages.filter(msg => msg.content && msg.content.trim() && msg.type !== 'function_call' && !msg.content.includes('**Agent Transfer**'));
        if (userFacingMessages.length > 0) {
          const agentResponses: Message[] = userFacingMessages.map((adkMsg, index) => ({
            _id: `agent_${Date.now()}_${index}`,
            content: adkMsg.content,
            sender: 'agent' as const,
            conversation: conversationId,
            createdAt: new Date().toISOString(),
            metadata: { author: adkMsg.author || selectedAgent.name, messageType: adkMsg.type || 'text' },
            responseTime: index === 0 ? responseTime : undefined // Only add response time to first message
          }));
          setMessages(prev => [...prev, ...agentResponses]);
        } else {
          const fallbackResponse: Message = {
            _id: `agent_${Date.now()}`,
            content: 'I\'m processing your request. How can I help you today?',
            sender: 'agent' as const,
            conversation: conversationId,
            createdAt: new Date().toISOString(),
            metadata: { author: selectedAgent.name, messageType: 'text' },
            responseTime
          };
          setMessages(prev => [...prev, fallbackResponse]);
        }
      } else {
        const errorMessage: Message = {
          _id: `error_${Date.now()}`,
          content: 'No response received from agent. Please try again.',
          sender: 'agent' as const,
          conversation: conversationId,
          createdAt: new Date().toISOString(),
          metadata: { author: 'system', messageType: 'error' },
          responseTime
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error: any) {
      console.error('Failed to send initial message:', error);
      setError(error.message || 'Failed to send initial message');
      setMessages(prev => prev.filter(msg => msg.content !== 'Thinking...'));
    } finally {
      setIsSending(false);
      setRequestStartTime(null);
    }
  }, [conversationId, selectedAgent, adkClient]); // Added adkClient to dependencies

  useEffect(() => {
    const initializeConversation = async () => {
      // ... (logic mostly unchanged)
      try {
        setIsLoading(true); setError(null);
        const currentUser = getCurrentUser();
        if (!currentUser) { router.push('/login'); return; }
        if (!['org_admin', 'org_member'].includes(currentUser.role)) { setError('Access denied. Admin or member role required.'); return; }
        setUser(currentUser);
        const conversationResponse = await api.get(`/conversations/${conversationId}`);
        if (!conversationResponse.data.success) throw new Error('Conversation not found');
        const conversation = conversationResponse.data.data;
        setActiveConversation(conversation);
        const sessionData = await adkSessionService.getConversationSession(conversationId);
        if (!sessionData) throw new Error('Failed to get ADK session');
        setSessionData(sessionData);
        const sessionInfo: ADKSessionInfo = { sessionId: sessionData.session.id, userId: sessionData.conversation.adkUserId, isConnected: true, conversationId: conversationId, appName: sessionData.conversation.adkAppName || 'orchestrator' };
        setAdkSessionInfo(sessionInfo);
        try {
          const formattedMessages = await adkSessionService.getFormattedMessages(conversationId, { filter: 'all', includeDebugInfo: debugMode, includeSystemMessages: true, sortOrder: 'asc' });
          if (formattedMessages.length > 0) {
            const frontendMessages: Message[] = formattedMessages.map(fmsg => ({ _id: fmsg.id, conversation: conversationId, sender: (fmsg.authorType === 'user' ? 'user' : 'agent') as 'user' | 'agent', content: fmsg.content, createdAt: fmsg.timestampISO, attachments: [], metadata: { author: fmsg.author, messageType: fmsg.messageType, isDebugOnly: fmsg.isDebugOnly, ...fmsg.metadata } }));
            setMessages(frontendMessages);
          } else {
            setMessages([]);
          }
        } catch (messageError) {
          console.error('Failed to fetch existing messages:', messageError);
          setMessages([]);
        }
        const initialMessage = sessionStorage.getItem(`initialMessage_${conversationId}`);
        if (initialMessage) {
          sessionStorage.removeItem(`initialMessage_${conversationId}`);
          sendInitialMessage(initialMessage, sessionInfo); // Make sure sendInitialMessage is stable or memoized
        }
      } catch (error: any) {
        console.error('Failed to initialize conversation:', error);
        setError(error.message || 'Failed to initialize conversation');
      } finally {
        setIsLoading(false);
      }
    };
    if (conversationId) initializeConversation();
    return () => { adkClient.current.disconnect(); };
  }, [conversationId, router, debugMode, sendInitialMessage]); // Added debugMode and sendInitialMessage to dependencies

  const handleSendMessage = useCallback(async (messageContent: string) => {
    // ... (logic unchanged)
    if (!messageContent.trim() || !conversationId || !adkSessionInfo) { console.warn('Cannot send message: missing conversation or session info'); return; }
    try {
      setIsSending(true);
      const startTime = Date.now();
      setRequestStartTime(startTime);

      const userMessage: Message = { _id: `user_${Date.now()}`, content: messageContent, sender: 'user' as const, conversation: conversationId, createdAt: new Date().toISOString() };
      setMessages(prev => [...prev, userMessage]);
      const thinkingMessage: Message = { _id: `thinking_${Date.now()}`, content: 'Thinking...', sender: 'agent' as const, conversation: conversationId, createdAt: new Date().toISOString() };
      setMessages(prev => [...prev, thinkingMessage]);
      console.log('Sending message with params:', { userId: adkSessionInfo.userId, sessionId: adkSessionInfo.sessionId, content: messageContent });

      const adkMessages = await adkClient.current.sendMessage(adkSessionInfo.userId, adkSessionInfo.sessionId, messageContent);
      const responseTime = Date.now() - startTime;

      setMessages(prev => prev.filter(msg => msg._id !== thinkingMessage._id));
      if (adkMessages && adkMessages.length > 0) {
        const userFacingMessages = adkMessages.filter(msg => msg.content && msg.content.trim() && msg.type !== 'function_call' && !msg.content.includes('**Agent Transfer**'));
        if (userFacingMessages.length > 0) {
          const agentResponses: Message[] = userFacingMessages.map((adkMsg, index) => ({
            _id: `agent_${Date.now()}_${index}`,
            content: adkMsg.content,
            sender: 'agent' as const,
            conversation: conversationId,
            createdAt: new Date().toISOString(),
            metadata: { author: adkMsg.author || selectedAgent.name, messageType: adkMsg.type || 'text' },
            responseTime: index === 0 ? responseTime : undefined // Only add response time to first message
          }));
          setMessages(prev => [...prev, ...agentResponses]);
        } else {
          const fallbackResponse: Message = {
            _id: `agent_${Date.now()}`,
            content: 'I\'m processing your request. How can I help you today?',
            sender: 'agent' as const,
            conversation: conversationId,
            createdAt: new Date().toISOString(),
            metadata: { author: selectedAgent.name, messageType: 'text' },
            responseTime
          };
          setMessages(prev => [...prev, fallbackResponse]);
        }
      } else {
        const errorMessage: Message = {
          _id: `error_${Date.now()}`,
          content: 'No response received from agent. Please try again.',
          sender: 'agent' as const,
          conversation: conversationId,
          createdAt: new Date().toISOString(),
          metadata: { author: 'system', messageType: 'error' },
          responseTime
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error: any) {
      console.error('Failed to send message:', error);
      setError(error.message || 'Failed to send message');
      setMessages(prev => prev.filter(msg => msg.content !== 'Thinking...'));
    } finally {
      setIsSending(false);
      setShouldAutoFocus(true);
      setRequestStartTime(null);
    }
  }, [conversationId, adkSessionInfo, selectedAgent, adkClient]); // Added adkClient

  useEffect(() => {
    if (shouldAutoFocus) {
      const timer = setTimeout(() => { setShouldAutoFocus(false); }, 100);
      return () => clearTimeout(timer);
    }
  }, [shouldAutoFocus]);

  const ChatMessageList = React.memo(({ messages, debugMode }: { messages: Message[], debugMode: boolean }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
    const filteredMessages = useMemo(() => {
      // ... (filter logic unchanged)
      return messages.filter(message => {
        if (message.sender === 'user') return true;
        if (!debugMode && message.sender === 'agent' && message.metadata) {
          if (message.metadata.messageType === 'function_call' || message.metadata.messageType === 'function_response' || message.metadata.messageType === 'welcome' || message.metadata.isDebugOnly) {
            return false;
          }
        }
        return true;
      });
    }, [messages, debugMode]);
    return (
      // Removed p-4, will be handled by parent container's py-6. Horizontal padding also by parent.
      <div className="space-y-0"> {/* Adjusted: MessageComponent now has mb-6, so this parent doesn't need space-y */}
        {filteredMessages.map((message) => (
          <MessageComponent key={message._id} message={message} debugMode={debugMode} />
        ))}
        <div ref={messagesEndRef} />
      </div>
    );
  });

  const MessageInputBar = React.memo(({ onSendMessage, isSending, selectedAgent, autoFocus = false }: { onSendMessage: (message: string) => void; isSending: boolean; selectedAgent?: Agent; autoFocus?: boolean; }) => {
    const [inputValue, setInputValue] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };
    const handleSend = () => { if (inputValue.trim() && !isSending) { onSendMessage(inputValue.trim()); setInputValue(''); } };
    useEffect(() => { if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; } }, [inputValue]);
    useEffect(() => { if (autoFocus && textareaRef.current && !isSending) { textareaRef.current.focus(); } }, [autoFocus, isSending]);

    return (
      // Input bar with proper background and spacing
      <div className="w-full bg-zinc-900/95 backdrop-blur-md py-4">
        {/* Centered container with max width matching chat messages */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-3 shadow-lg backdrop-blur-sm">
              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  placeholder="Continue the conversation..."
                  className="w-full min-h-[48px] max-h-[200px] bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base text-white placeholder:text-zinc-400 resize-none custom-scrollbar px-3 py-2"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isSending}
                />
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-zinc-700/30 mt-2">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  {selectedAgent && (
                    <div className="flex items-center gap-1.5">
                      <span className={selectedAgent.color}>{selectedAgent.icon}</span>
                      <span>{selectedAgent.name}</span>
                    </div>
                  )}
                  <span className="text-zinc-500">• Press Enter to send, Shift+Enter for new line</span>
                </div>
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isSending}
                  size="sm"
                  className="bg-brown_sugar-600 hover:bg-brown_sugar-700 text-white flex-shrink-0 ml-3"
                >
                  {isSending ? <FastPulsatingDotsLoader /> : <><Send size={14} className="mr-1.5" />Send</>}
                </Button>
              </div>
            </div>
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
      <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-zinc-800 p-8 rounded-lg shadow-xl">
          <Terminal size={48} className="text-red-400 mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-zinc-100 mb-3">Error Occurred</h2>
          <p className="text-zinc-300 mb-6 leading-relaxed">{error}</p>
          <Button onClick={() => router.push('/dashboard/admin/barka-space-os')} variant="outline" className="w-full">
            Back to Space OS
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-zinc-900 text-white relative flex flex-col overflow-hidden">
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
        /* Smooth scrolling for chat messages */
        .chat-scroll-container {
          scroll-behavior: smooth;
        }
        /* Ensure input bar stays above content */
        .chat-input-overlay {
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
      `}</style>

      <div className="border-b border-zinc-800 bg-zinc-900/95 backdrop-blur-sm sticky top-0 z-20"> {/* Increased z-index */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5"> {/* Increased padding */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/admin/barka-space-os')}
                className="text-zinc-400 hover:text-zinc-100 px-2" // More compact back button
              >
                <ChevronLeft size={20} className="mr-1" /> {/* Icon for back */}
                Back
              </Button>
              <div className="h-6 w-px bg-zinc-700 hidden sm:block" /> {/* Hide separator on small screens */}
              <h1 className="text-lg sm:text-xl font-semibold text-zinc-100 flex items-center gap-2 truncate"> {/* Responsive text size, truncate */}
                <Terminal size={20} className="text-brown_sugar-400 flex-shrink-0" />
                <span className="truncate block max-w-[150px] sm:max-w-xs md:max-w-sm">
                  {activeConversation?.title || 'Barka Space OS'}
                </span>
              </h1>
              <Badge className="bg-brown_sugar-500/20 text-brown_sugar-300 hidden md:inline-flex"> {/* Hide on smaller screens */}
                Active Session
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant={debugMode ? "secondary" : "ghost"} // More prominent when ON
                size="sm"
                onClick={() => setDebugMode(!debugMode)}
                className={`text-zinc-300 hover:text-zinc-100 ${debugMode ? 'bg-zinc-700 text-white' : ''}`}
              >
                Debug {debugMode ? 'ON' : 'OFF'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Split into scrollable messages and fixed input */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Chat Messages scrollable area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar chat-scroll-container px-4 sm:px-6 lg:px-8 py-6 pb-6">
          {/* Constrain message width for readability, centered */}
          <div className="max-w-5xl mx-auto w-full">
            <ChatMessageList messages={messages} debugMode={debugMode} />
          </div>
        </div>

        {/* Message Input - Fixed at bottom, outside scrollable area */}
        <div className="flex-shrink-0 border-t border-zinc-800/50">
          <MessageInputBar
            onSendMessage={handleSendMessage}
            isSending={isSending}
            selectedAgent={selectedAgent}
            autoFocus={shouldAutoFocus}
          />
        </div>
      </div>
    </div>
  );
}