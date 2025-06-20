'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Send,
  PaperclipIcon,
  Loader2,
  Plus,
  AlertCircle,
  ChevronDown,
  Save,
  Share2,
  PlusSquare,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getCurrentUser } from '@/lib/auth';
import api from '@/lib/api';
import { adkClient, ADKMessage, ADKSessionInfo } from '@/lib/adk-client';
import { ApiResponse, Message, MessageSender, Conversation, ClientResponse } from '@/types';
import { adkSessionService } from '@/lib/adk-session-service';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { useConversation } from '@/contexts/ConversationContext';
import { ChatLoadingScreen } from '@/components/ui/branded-loader';


// Define error type for axios errors
interface ApiError {
  response?: {
    data?: {
      message?: string;
      errors?: Array<{
        path: string;
        msg: string;
      }>;
    };
  };
}

// =================================================================
// START: New/Refactored Child Components for Performance and Layout
// =================================================================

const PulsatingDotsLoader = React.memo(() => (
  <div className="flex items-center space-x-1 py-2">
    <span className="pulsating-dot"></span>
    <span className="pulsating-dot"></span>
    <span className="pulsating-dot"></span>
  </div>
));
PulsatingDotsLoader.displayName = 'PulsatingDotsLoader';

// ----- Helper Functions (can be moved to a utils file) -----
const getAgentInitials = (agentName: string): string => {
  if (!agentName) return 'AG';
  const name = agentName.toLowerCase();
  if (name.includes('orchestrator')) return 'OR';
  return name.substring(0, 2).toUpperCase();
};

const getAgentColor = (agentName: string): string => {
  if (!agentName) return 'bg-muted';
  switch (agentName.toLowerCase()) {
    case 'jarvis': return 'bg-brown_sugar-600';
    case 'barka': return 'bg-hunter_green-600';
    case 'orchestrator': case 'orchestrator_agent': return 'bg-brown_sugar-700';
    default: return 'bg-brown_sugar-500';
  }
};

const getAgentTextColor = (agentName: string): string => {
  if (!agentName) return 'text-muted-foreground';
  switch (agentName.toLowerCase()) {
    case 'jarvis': return 'text-brown_sugar-400';
    case 'barka': return 'text-hunter_green-400';
    case 'orchestrator': case 'orchestrator_agent': return 'text-brown_sugar-300';
    default: return 'text-brown_sugar-400';
  }
};

const getAgentDisplayName = (agentName: string): string => {
  if (!agentName) return 'Agent';
  return agentName.toLowerCase().replace('_agent', '');
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};


// ----- ChatMessage Component -----
const ChatMessage = React.memo(({ message, debugMode }: { message: Message, debugMode: boolean }) => {
  const isUser = message.sender === 'user';
  const isThinking = message.sender === 'agent' && message.content === 'Thinking...';

  return (
    <div
      className={`flex w-full gap-3 items-start chat-message-container ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* FIX 2: Agent avatar and name in a fixed-width container to prevent layout shifts */}
      {!isUser && !isThinking && (
        <div className="flex-shrink-0 w-16 flex flex-col items-center gap-1 mt-1 text-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ${message.metadata?.author ? getAgentColor(message.metadata.author) : 'bg-zinc-600'}`}>
            {message.metadata?.author ? getAgentInitials(message.metadata.author) : 'AG'}
          </div>
          <span className={`text-xs font-medium truncate w-full ${message.metadata?.author ? getAgentTextColor(message.metadata.author) : 'text-zinc-400'}`}>
            {message.metadata?.author ? getAgentDisplayName(message.metadata.author) : 'agent'}
          </span>
        </div>
      )}

      {/* Message Content */}
      <div className={`max-w-[80%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        {isThinking ? (
          <div className="p-3 rounded-lg text-zinc-400 bg-zinc-800 inline-block">
            <PulsatingDotsLoader />
          </div>
        ) : (
          <div className={`p-3 rounded-xl shadow-sm w-fit message-bubble ${isUser ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-100'}`}>
            {/* Debug Info */}
            {debugMode && !isUser && message.metadata && (
              <div className="mb-3 p-2 bg-zinc-900/50 border border-zinc-700/50 rounded-md">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <span className="font-medium">🤖 {message.metadata.author || 'Agent'}</span>
                  {message.metadata.messageType === 'function_call' && (
                    <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full">Function Call</span>
                  )}
                  {message.metadata.messageType === 'function_response' && (
                    <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">Function Response</span>
                  )}
                  {message.metadata.messageType === 'transfer' && (
                    <span className="bg-hunter_green-500/20 text-hunter_green-300 px-2 py-0.5 rounded-full">Agent Transfer</span>
                  )}
                  {message.metadata.invocation_id && (
                    <span className="bg-zinc-700/50 text-zinc-300 px-2 py-0.5 rounded-full font-mono text-xs">
                      {message.metadata.invocation_id.slice(-8)}
                    </span>
                  )}
                </div>
                {/* Show function call details */}
                {message.metadata.functionCall && (
                  <div className="mt-2 text-xs text-zinc-300">
                    <div className="font-mono">
                      <span className="text-yellow-400">{message.metadata.functionCall.name}</span>
                      <span className="text-zinc-400">(</span>
                      <span className="text-zinc-300">{JSON.stringify(message.metadata.functionCall.args, null, 2)}</span>
                      <span className="text-zinc-400">)</span>
                    </div>
                  </div>
                )}
                {/* Show agent transfer details */}
                {message.metadata.agentTransfer && (
                  <div className="mt-2 text-xs text-zinc-300">
                    <span className="text-zinc-400">From:</span> <span className="text-hunter_green-300">{message.metadata.agentTransfer.fromAgent}</span>
                    <span className="text-zinc-400 mx-2">→</span>
                    <span className="text-zinc-400">To:</span> <span className="text-hunter_green-300">{message.metadata.agentTransfer.toAgent}</span>
                  </div>
                )}
              </div>
            )}

            {/* Message Content with Markdown */}
            {isUser ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
            ) : (
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    // Custom styling for markdown elements
                    p: ({ children }) => <p className="mb-2 last:mb-0 text-sm leading-relaxed">{children}</p>,
                    h1: ({ children }) => <h1 className="text-lg font-semibold mb-2 text-zinc-100">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-base font-semibold mb-2 text-zinc-100">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 text-zinc-100">{children}</h3>,
                    ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="text-sm">{children}</li>,
                    code: ({ children, className }) => {
                      const isInline = !className;
                      return isInline ? (
                        <code className="bg-zinc-700 text-zinc-200 px-1 py-0.5 rounded text-xs font-mono">{children}</code>
                      ) : (
                        <code className={className}>{children}</code>
                      );
                    },
                    pre: ({ children }) => (
                      <pre className="bg-zinc-900 border border-zinc-700 rounded-md p-3 overflow-x-auto mb-2">
                        {children}
                      </pre>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-zinc-600 pl-3 italic text-zinc-300 mb-2">
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
                    strong: ({ children }) => <strong className="font-semibold text-zinc-100">{children}</strong>,
                    em: ({ children }) => <em className="italic text-zinc-200">{children}</em>,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2.5 border-t border-zinc-600/50 pt-2.5 space-y-1.5">
                {message.attachments.map((attachment) => (
                  <a
                    key={attachment._id}
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-xs text-primary hover:underline hover:text-primary/80"
                  >
                    <PaperclipIcon size={13} className="mr-1.5 flex-shrink-0" />
                    <span className="truncate">{attachment.name}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
        <div className={`text-xs text-zinc-500 mt-1.5 px-1 ${isUser ? 'self-end' : 'self-start'}`}>
          {formatTime(message.createdAt)}
        </div>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-16 flex flex-col items-center gap-1 mt-1 text-center">
          <div className="w-8 h-8 rounded-full bg-zinc-600 flex items-center justify-center text-white text-xs font-semibold">
            You
          </div>
        </div>
      )}
    </div>
  );
});
ChatMessage.displayName = 'ChatMessage';


// ----- ChatMessageList Component -----
const ChatMessageList = React.memo(({ messages, debugMode }: { messages: Message[], debugMode: boolean }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Smooth scroll to the bottom when new messages are added
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredMessages = useMemo(() => {
    return messages.filter(message => !(
      !debugMode && message.sender === 'agent' && message.metadata &&
      (message.metadata.messageType === 'function_call' || message.metadata.messageType === 'function_response' || message.metadata.isDebugOnly)
    ));
  }, [messages, debugMode]);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pt-6 pb-28 space-y-5 flex-1">
      {filteredMessages.map(message => (
        <ChatMessage key={message._id} message={message} debugMode={debugMode} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
});
ChatMessageList.displayName = 'ChatMessageList';

// ----- MessageInputBar Component -----
// FIX 1: This component now manages its own state for the text input.
// This prevents the entire page from re-rendering on every keystroke.
const MessageInputBar = React.memo(({
  onSendMessage,
  onFileUpload,
  isSending,
  isWelcomeScreen,
  activeConversation,
  initialPrompt = ''
}: {
  onSendMessage: (message: string) => void;
  onFileUpload: () => void;
  isSending: boolean;
  isWelcomeScreen: boolean;
  activeConversation: Conversation | null;
  initialPrompt?: string;
}) => {
  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialPrompt) {
        setInputValue(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 200);
      textareaRef.current.style.height = newHeight + 'px';
    }
  }, [inputValue]);

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`w-full ${isWelcomeScreen ? 'max-w-2xl my-8 pb-2 mx-auto' : 'max-w-3xl mx-auto p-2'} border border-success/20 border-1 rounded-lg`}>
      <div className="glass-surface rounded-xl overflow-hidden">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            placeholder={isWelcomeScreen ? "Try asking me something about your project..." : "Reply to Barka..."}
            className={`w-full ${isWelcomeScreen ? 'min-h-[120px]' : 'min-h-[10px]'} max-h-[400px] bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base text-white placeholder:text-zinc-400 chat-textarea-optimized custom-scrollbar`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
          />
        </div>
        <div className="flex items-center justify-between p-2">
          <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white" onClick={onFileUpload} disabled={isSending}>
            <PaperclipIcon size={20} />
          </Button>
          <Button variant="success" size="icon" onClick={handleSend} disabled={(!inputValue.trim() && (!activeConversation)) || isSending}>
            {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={16} />}
          </Button>
        </div>
      </div>
    </div>
  );
});
MessageInputBar.displayName = 'MessageInputBar';

// ----- SuggestedQuestions Component -----
const SuggestedQuestions = React.memo(({ onQuestionClick, clientId, conversations, currentConversationId }: {
  onQuestionClick: (prompt: string) => void;
  clientId: string;
  conversations: Conversation[];
  currentConversationId?: string;
}) => {
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generationMethod, setGenerationMethod] = useState<'ai' | 'default'>('default');

  useEffect(() => {
    const fetchSuggestedQuestions = async () => {
      try {
        setIsLoading(true);

        console.log('🔍 SuggestedQuestions: Starting fetch with conversations:', conversations?.length || 0);

        // Wait for conversations to be loaded
        if (!conversations || conversations.length === 0) {
          console.log('⏳ SuggestedQuestions: No conversations yet, using defaults');
          setSuggestedQuestions([
            'Help me get started with the onboarding process for my project.',
            'I need help collecting and organizing my project requirements.',
            'I\'d like to schedule a meeting with the team.',
            'Help me manage my project and track progress.',
            'What are the next steps for my project?'
          ]);
          setGenerationMethod('default');
          return;
        }

        // Find the latest conversation with messages (excluding current conversation if it's new/empty)
        const eligibleConversations = conversations
          .filter(conv =>
            conv.adkSessionId &&
            conv.adkUserId &&
            conv.lastMessageAt &&
            conv._id !== currentConversationId // Exclude current conversation
          )
          .sort((a, b) => new Date(b.lastMessageAt!).getTime() - new Date(a.lastMessageAt!).getTime());

        const latestConversation = eligibleConversations[0];

        console.log('🔍 SuggestedQuestions: Current conversation ID:', currentConversationId);
        console.log('🔍 SuggestedQuestions: Eligible conversations:', eligibleConversations.length);
        console.log('🔍 SuggestedQuestions: Latest conversation found:', latestConversation?.title || 'None');

        if (!latestConversation) {
          // No previous conversations, use default questions
          console.log('⚠️ SuggestedQuestions: No suitable conversation found (excluding current), using defaults');
          console.log('📋 Available conversations:', conversations.map(c => ({ id: c._id, title: c.title, current: c._id === currentConversationId })));
          setSuggestedQuestions([
            'Help me get started with the onboarding process for my project.',
            'I need help collecting and organizing my project requirements.',
            'I\'d like to schedule a meeting with the team.',
            'Help me manage my project and track progress.',
            'What are the next steps for my project?'
          ]);
          setGenerationMethod('default');
          return;
        }

        // TEMPORARILY DISABLED: Don't fetch messages from other conversations on page load
        // This was causing unnecessary session fetches and confusing the frontend
        console.log('⚠️ SuggestedQuestions: Skipping message fetch to avoid session conflicts');
        console.log('📋 SuggestedQuestions: Using default questions instead of fetching from:', latestConversation._id);

        // Use default questions instead of fetching from other conversations
        setSuggestedQuestions([
          'Help me get started with the onboarding process for my project.',
          'I need help collecting and organizing my project requirements.',
          'I\'d like to schedule a meeting with the team.',
          'Help me manage my project and track progress.',
          'What are the next steps for my project?'
        ]);
        setGenerationMethod('default');
        return;

        // TODO: Re-enable this feature after fixing session isolation
        // The issue is that fetching messages from other conversations triggers
        // session fetches that interfere with the current conversation loading
        /*
        // Fetch messages from ovara-agent using ADK session service
        console.log('📡 SuggestedQuestions: Fetching messages for conversation:', latestConversation._id);
        const formattedMessages = await adkSessionService.getFormattedMessages(latestConversation._id, {
          filter: 'all',
          includeDebugInfo: false,
          includeSystemMessages: false,
          sortOrder: 'desc'
        });

        console.log('📨 SuggestedQuestions: Retrieved messages:', formattedMessages?.length || 0);

        if (!formattedMessages || formattedMessages.length === 0) {
          // No messages found, use default questions
          console.log('⚠️ SuggestedQuestions: No messages found, using defaults');
          setSuggestedQuestions([
            'Help me get started with the onboarding process for my project.',
            'I need help collecting and organizing my project requirements.',
            'I\'d like to schedule a meeting with the team.',
            'Help me manage my project and track progress.',
            'What are the next steps for my project?'
          ]);
          setGenerationMethod('default');
          return;
        }
        */

        // DISABLED: Groq API call was here but removed since we're using default questions
        // This was part of the AI-generated suggestions feature that was causing session conflicts
      } catch (error) {
        console.error('❌ SuggestedQuestions: Failed to fetch suggested questions:', error);
        // Fallback to default questions
        setSuggestedQuestions([
          'Help me get started with the onboarding process for my project.',
          'I need help collecting and organizing my project requirements.',
          'I\'d like to schedule a meeting with the team.',
          'Help me manage my project and track progress.',
          'What are the next steps for my project?'
        ]);
        setGenerationMethod('default');
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch if we have client ID and conversations have been loaded
    if (clientId && conversations !== undefined) {
      console.log('🚀 SuggestedQuestions: Starting fetch process...');
      fetchSuggestedQuestions();
    } else {
      console.log('⏳ SuggestedQuestions: Waiting for clientId and conversations...', { clientId: !!clientId, conversations: conversations?.length });
    }
  }, [clientId, conversations, currentConversationId]);

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto mt-6">
        <h3 className="text-lg font-medium mb-4 text-center text-seasalt-50">
          Suggested questions
        </h3>
        <ul className="space-y-2">
          {[...Array(5)].map((_, index) => (
            <li key={index} className="animate-pulse">
              <div className="h-4 bg-zinc-700/50 rounded w-full"></div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-6">
      <div className="flex items-center justify-center gap-2 mb-4">
        <h3 className="text-lg font-medium text-seasalt-50">
          Suggested questions
        </h3>
        <div className="group relative">
          <Info className="h-4 w-4 text-zinc-400 hover:text-brown_sugar-400 cursor-help transition-colors" />
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-800 text-zinc-200 text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none w-64 z-50">
            {generationMethod === 'ai'
              ? "These questions were generated by AI based on your recent conversation history to help you continue where you left off."
              : "These are default starter questions to help you get started with your project."
            }
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-zinc-800"></div>
          </div>
        </div>
      </div>
      <ul className="space-y-2">
        {suggestedQuestions.map((question, index) => (
          <li key={index}>
            <button
              onClick={() => onQuestionClick(question)}
              className="w-full text-left text-zinc-300 hover:text-brown_sugar-300 transition-colors duration-200 text-sm"
            >
              • {question}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
});
SuggestedQuestions.displayName = 'SuggestedQuestions';

// =================================================================
// END: New/Refactored Child Components
// =================================================================

export default function SingleChatPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.id as string;

  const [, setUser] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const {
    conversations,
    activeConversation,
    setConversations,
    setActiveConversation,
    updateConversationTitle,
    addConversation
  } = useConversation();
  const [messages, setMessages] = useState<Message[]>([]);
  // FIX 1: `newMessage` state is removed from the main component.
  // const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // This state is to pre-fill the textarea from the welcome screen cards
  const [initialPrompt, setInitialPrompt] = useState('');

  // ADK state
  const [adkConnected, setAdkConnected] = useState(false);
  const [adkStatus, setAdkStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [sessionInfo, setSessionInfo] = useState<ADKSessionInfo | null>(null);
  const [hasCheckedForMessages, setHasCheckedForMessages] = useState(false);

  // Debug mode state
  const [debugMode, setDebugMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('chat-debug-mode') === 'true';
    }
    return false;
  });

  // Title generation state
  const titleGeneratedRef = useRef(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/auth/login');
      return;
    }
    if (currentUser.role !== 'org_client') {
      router.push('/dashboard');
      return;
    }
    setUser(currentUser);
    fetchClientInfo(currentUser.id);
  }, [router]);

  const fetchClientInfo = async (_userId: string) => {
    try {
      setError(null);
      const response = await api.get<ApiResponse<ClientResponse>>('/clients/me');
      if (response.data.success && response.data.data) {
        setClient(response.data.data);
        fetchConversations();
      } else {
        setError(response.data.message || 'Failed to fetch client information');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error fetching client information:', error);
      setError('Failed to fetch client information. Please try again.');
      setIsLoading(false);
    }
  };

  // All other hooks (useEffect, etc.) remain largely the same,
  // but they will now be more performant because they are not
  // re-running on every keystroke.

  // ADK initialization and cleanup
  useEffect(() => {
    if (!client || !conversationId) return;

    let isEffectActive = true; // Flag to prevent state updates after cleanup

    const initializeADK = async () => {
      try {
        if (!isEffectActive) return;

        setAdkStatus('connecting');
        setIsLoadingMessages(true);

        // Check server status first
        const serverOnline = await adkClient.checkServerStatus();
        if (!serverOnline) {
          if (isEffectActive) {
            setError('ADK server is not available. Please make sure it is running.');
            setAdkStatus('error');
            setIsLoadingMessages(false);
          }
          return;
        }

        // Use the new ADK session service to get or create session
        console.log('Loading ADK session for conversation:', conversationId);
        const sessionData = await adkSessionService.getOrCreateSession(
          conversationId,
          client._id,
          client.organization
        );

        if (sessionData) {
          console.log('ADK session loaded successfully');

          // Get formatted messages for display
          const formattedMessages = await adkSessionService.getFormattedMessages(conversationId, {
            filter: 'all',
            includeDebugInfo: debugMode,
            includeSystemMessages: true,
            sortOrder: 'asc'
          });

          // Convert formatted messages to frontend Message format
          const frontendMessages: Message[] = formattedMessages.map(fmsg => ({
            _id: fmsg.id,
            conversation: conversationId,
            sender: (fmsg.authorType === 'user' ? 'user' : 'agent') as MessageSender,
            content: fmsg.content,
            createdAt: fmsg.timestampISO,
            attachments: [],
            metadata: {
              author: fmsg.author,
              messageType: fmsg.messageType,
              functionCall: fmsg.functionCall,
              functionResponse: fmsg.functionResponse,
              agentTransfer: fmsg.agentTransfer,
              isDebugOnly: fmsg.isDebugOnly,
              ...fmsg.metadata
            }
          }));

          if (isEffectActive) {
            setMessages(frontendMessages);
            setSessionInfo({
              sessionId: sessionData.conversation.adkSessionId,
              userId: sessionData.conversation.adkUserId,
              appName: sessionData.conversation.adkAppName,
              isConnected: true,
              conversationId
            });
            setAdkConnected(true);
            setAdkStatus('connected');
            setIsLoadingMessages(false);
            setHasCheckedForMessages(true);
            console.log('ADK session initialized:', sessionData.conversation.adkSessionId);
          }
        } else {
          if (isEffectActive) {
            setError('Failed to initialize ADK session. Please try again.');
            setAdkStatus('error');
            setIsLoadingMessages(false);
            setHasCheckedForMessages(true);
          }
        }

      } catch (error) {
        if (isEffectActive) {
          console.error('Failed to initialize ADK:', error);
          setError('Failed to connect to chat service. Please refresh the page.');
          setAdkStatus('error');
          setIsLoadingMessages(false);
          setHasCheckedForMessages(true);
        }
      }
    };

    initializeADK();

    // Cleanup on unmount or dependency change
    return () => {
      isEffectActive = false;
      console.log('Cleaning up ADK connection for conversation:', conversationId);
      adkClient.disconnect();
      setAdkConnected(false);
      setAdkStatus('disconnected');
    };
  }, [client?._id, conversationId]); // More specific dependencies

  const handleADKResponse = (adkMessages: ADKMessage[]) => {
    console.log('Received ADK messages:', adkMessages);

    // Remove any temporary "Thinking..." messages and add new messages instantly
    setMessages(prev => {
      // Filter out thinking messages
      const filteredMessages = prev.filter(msg => msg.content !== 'Thinking...');

      // Convert ADK messages to frontend format for instant display
      const newMessages: Message[] = adkMessages.map(adkMsg => ({
        _id: `adk-${Date.now()}-${Math.random().toString(36).substring(2)}`,
        conversation: conversationId,
        sender: 'agent',
        content: adkMsg.content,
        createdAt: new Date().toISOString(),
        attachments: [],
        metadata: {
          author: adkMsg.author,
          type: adkMsg.type,
          functionCall: adkMsg.functionCall,
          messageType: adkMsg.type === 'function_call' ? 'function_call' : 'text',
          isDebugOnly: adkMsg.type === 'function_call'
        }
      }));

      return [...filteredMessages, ...newMessages];
    });

    setIsSending(false);

    // Optional: Sync with backend in background without blocking UI
    // This ensures data consistency without affecting user experience
    setTimeout(async () => {
      try {
        const formattedMessages = await adkSessionService.getFormattedMessages(conversationId, {
          filter: 'all',
          includeDebugInfo: debugMode,
          includeSystemMessages: true,
          sortOrder: 'asc'
        });

        // Only update if we have more complete data
        if (formattedMessages.length > 0) {
          const frontendMessages: Message[] = formattedMessages.map(fmsg => ({
            _id: fmsg.id,
            conversation: conversationId,
            sender: (fmsg.authorType === 'user' ? 'user' : 'agent') as MessageSender,
            content: fmsg.content,
            createdAt: fmsg.timestampISO,
            attachments: [],
            metadata: {
              author: fmsg.author,
              messageType: fmsg.messageType,
              functionCall: fmsg.functionCall,
              functionResponse: fmsg.functionResponse,
              agentTransfer: fmsg.agentTransfer,
              isDebugOnly: fmsg.isDebugOnly,
              ...fmsg.metadata
            }
          }));

          setMessages(frontendMessages);
        }
      } catch (error) {
        console.error('Background sync failed:', error);
        // Silently fail - user already has the message displayed
      }
    }, 100); // Small delay to avoid blocking the UI
  };

  // Debug mode toggle handler
  const toggleDebugMode = () => {
    const newDebugMode = !debugMode;
    setDebugMode(newDebugMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('chat-debug-mode', newDebugMode.toString());
    }
  };



  // Function to generate conversation title using Groq
  const generateConversationTitle = async (conversationId: string, messages: Message[]) => {
    try {
      // Get the first few messages for better context (up to 3 messages)
      const contextMessages = messages.slice(0, 3).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      const response = await api.post('/conversations/generate-title', {
        conversationId,
        messages: contextMessages
      });

      if (response.data.success && response.data.data?.title) {
        const newTitle = response.data.data.title;

        // Use the conversation context to update title across all components
        updateConversationTitle(conversationId, newTitle);

        console.log('Generated title:', newTitle);
      }
    } catch (error) {
      console.error('Failed to generate conversation title:', error);
      // Silently fail - don't show error to user for title generation
    }
  };

  // Check if we should generate a title after message updates
  useEffect(() => {
    // Generate title after the first user message and agent response (2 messages total)
    if (messages.length >= 2 && !titleGeneratedRef.current && activeConversation && !activeConversation.titleGenerated) {
      titleGeneratedRef.current = true;
      generateConversationTitle(activeConversation._id, messages);
    }
  }, [messages.length, activeConversation]);

  const fetchConversations = async () => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await api.get<ApiResponse<Conversation[]>>('/conversations');
      if (response.data.success && response.data.data) {
        setConversations(response.data.data);
        const conversation = response.data.data.find(conv => conv._id === conversationId);
        if (conversation) {
          setActiveConversation(conversation);
          // Messages are now loaded via ADK session service in the ADK initialization effect
          // No need to fetch messages separately
          setIsLoading(false);
          // Keep isLoadingMessages true until ADK loads the messages
        } else {
          // If specific conversation not found, try to pick the first or handle gracefully
          if (response.data.data.length > 0 && !conversationId) {
            // router.push(`/dashboard/client/chat/${response.data.data[0]._id}`);
            // Stay on current page if no ID, will show welcome screen
            setIsLoading(false);
          } else if (conversationId) {
            setError('Conversation not found. Select a conversation or start a new one.');
            setIsLoading(false);
          } else {
            setIsLoading(false); // No conversations and no ID, show welcome screen
          }
        }
      } else {
        setError(response.data.message || 'Failed to fetch conversations');
        setIsLoading(false);
      }
    } catch (error: unknown) {
      const apiError = error as ApiError;
      setError(apiError.response?.data?.message || 'Failed to fetch conversations. Please try again.');
      setIsLoading(false);
    }
  };



  // FIX 1: `handleSendMessage` now accepts the message content as an argument.
  const handleSendMessage = async (messageContent: string) => {
    if (!messageContent.trim()) {
      return;
    }

    if (!adkConnected || !sessionInfo) {
      setError('Not connected to chat service. Please refresh the page.');
      return;
    }

    try {
      setError(null);
      setIsSending(true);

      // Create user message immediately
      const userMessage: Message = {
        _id: `user-${Date.now()}`,
        conversation: conversationId,
        sender: 'user',
        content: messageContent,
        createdAt: new Date().toISOString(),
        attachments: []
      };

      // Create temporary "Thinking..." message for agent
      const tempAgentMessage: Message = {
        _id: `temp-agent-${Date.now()}`,
        conversation: conversationId,
        sender: 'agent',
        content: 'Thinking...',
        createdAt: new Date().toISOString(),
        attachments: []
      };

      // Add both messages to UI
      setMessages(prevMessages => [...prevMessages, userMessage, tempAgentMessage]);

      // Send message via ADK
      const adkMessages = await adkClient.sendMessage(
        sessionInfo.userId,
        sessionInfo.sessionId,
        messageContent
      );

      console.log('Message sent via ADK:', messageContent);

      // Handle the response
      if (adkMessages.length > 0) {
        handleADKResponse(adkMessages);
      } else {
        // No response received, remove thinking message and show error
        setMessages(prevMessages => prevMessages.filter(msg => msg._id !== tempAgentMessage._id));
        setError('No response received from agent. Please try again.');
        setIsSending(false);
      }

    } catch (error: unknown) {
      console.error('Failed to send message:', error);
      setError('Failed to send message. Please try again.');
      setIsSending(false);
      setMessages(prevMessages => prevMessages.filter(msg => !msg._id.startsWith('temp-')));
    }
  };

  const handleFileUpload = () => {
    if (!activeConversation && !client) {
      setError("Please select or start a new conversation first to upload files.");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let currentConversation = activeConversation;

    // If no active conversation, create one first
    if (!currentConversation && client) {
      setIsSending(true); // Show loading state
      try {
        const createConvResponse = await api.post<ApiResponse<Conversation>>('/conversations', {
          clientId: client._id,
          title: `File Upload: ${files[0].name}`,
        });
        if (createConvResponse.data.success && createConvResponse.data.data) {
          currentConversation = createConvResponse.data.data;
          addConversation(currentConversation);
          setActiveConversation(currentConversation);
          // Don't use router.push here as it will trigger a page reload and duplicate fetching
          // Instead, just update the URL without a full navigation
          window.history.pushState({}, '', `/dashboard/client/chat/${currentConversation!._id}`);
          setMessages([]); // Start with empty messages for the new chat
        } else {
          setError(createConvResponse.data.message || 'Failed to create conversation for file upload.');
          setIsSending(false);
          return;
        }
      } catch (err) {
        setError('Failed to create conversation for file upload.');
        setIsSending(false);
        return;
      }
    }

    if (!currentConversation) { // Should not happen if above logic is correct
      setError("No active conversation to upload file to.");
      setIsSending(false);
      return;
    }


    setIsSending(true); // Ensure sending state is true
    try {
      // Create a temporary message for the file upload
      const tempFileMessage: Message = {
        _id: `temp-file-${Date.now()}`,
        conversation: currentConversation._id,
        sender: 'user',
        content: `Uploading file: ${files[0].name}...`,
        attachments: [],
        createdAt: new Date().toISOString(),
      };
      setMessages(prevMessages => [...prevMessages, tempFileMessage]);

      // Prepare and send the file upload request
      const formData = new FormData();
      formData.append('file', files[0]);
      formData.append('conversationId', currentConversation._id);

      const response = await api.post<ApiResponse<any>>('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        // Replace the temporary file message with the real one
        const fileMessage: Message = {
          _id: response.data.data._id || tempFileMessage._id,
          conversation: currentConversation._id,
          sender: 'user',
          content: `Uploaded file: ${files[0].name}`,
          attachments: [response.data.data],
          createdAt: new Date().toISOString(),
        };
        setMessages(prevMessages => prevMessages.map(msg => msg._id === tempFileMessage._id ? fileMessage : msg));

        // Add a temporary "Thinking..." message for the agent
        const tempAgentMessage: Message = {
          _id: `temp-agent-${Date.now()}`,
          conversation: currentConversation._id,
          sender: 'agent',
          content: 'Thinking...',
          createdAt: new Date().toISOString(),
          attachments: []
        };
        setMessages(prevMessages => [...prevMessages, tempAgentMessage]);

        // Use the new combined endpoint to get the agent response
        // First, we need to send a message about the file upload
        const fileUploadMessage = `I've uploaded a file: ${files[0].name}`;
        const chatResponse = await api.post<ApiResponse<{ userMessage: Message, agentMessage: Message }>>(`/conversations/${currentConversation._id}/chat`, {
          content: fileUploadMessage
        });

        // Replace the temporary agent message with the real one from the server
        if (chatResponse.data.success && chatResponse.data.data) {
          const { agentMessage } = chatResponse.data.data;
          if (agentMessage) {
            setMessages(prevMessages => prevMessages.map(msg =>
              msg._id === tempAgentMessage._id ? agentMessage : msg
            ));
          }
        } else {
          setMessages(prevMessages => prevMessages.map(msg =>
            msg._id === tempAgentMessage._id ?
              { ...tempAgentMessage, content: chatResponse.data.message || 'Error processing file.' } :
              msg
          ));
        }
      } else {
        setMessages(prevMessages => prevMessages.filter(msg => msg._id !== tempFileMessage._id));
        setError(response.data.message || 'Failed to upload file');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      setError('Failed to upload file. Please try again.');
      setMessages(prevMessages => prevMessages.filter(msg => !msg._id.startsWith('temp-')));
    } finally {
      setIsSending(false);
    }
  };



  const handleCardClick = (prompt: string) => {
    // Just set the initial prompt for the input component
    setInitialPrompt(prompt);
  };

  const createNewConversation = async () => {
    if (!client) {
      setError('Cannot create conversation: Client information not available');
      return;
    }
    try {
      setError(null);
      setIsLoading(true); // Or a different state for creating convo
      const response = await api.post<ApiResponse<Conversation>>('/conversations', {
        clientId: client._id,
        title: 'New Onboarding Conversation',
      });
      if (response.data.success && response.data.data) {
        const newConversation = response.data.data;
        addConversation(newConversation);
        setActiveConversation(newConversation);
        // Don't use router.push here as it will trigger a page reload and duplicate fetching
        // Instead, just update the URL without a full navigation
        window.history.pushState({}, '', `/dashboard/client/chat/${newConversation._id}`);
        setMessages([]); // Start with empty messages for the new chat
        // setActiveConversation(newConversation); // Already handled by navigation and subsequent fetch
        // setMessages([]);
      } else {
        setError(response.data.message || 'Failed to create conversation');
      }
    } catch (error: unknown) {
      const apiError = error as ApiError;
      setError(apiError.response?.data?.message || 'Failed to create conversation. Please try again.');
    } finally {
      setIsLoading(false); // Or reset creating convo state
    }
  };



  if (isLoading && !client) { // Show full page loader only if client info is not yet fetched
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-900">
        <ChatLoadingScreen />
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
      @keyframes pulsate {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.3; transform: scale(0.75); }
      }
      .pulsating-dot {
        animation: pulsate 1.4s infinite ease-in-out;
        display: inline-block;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background-color: currentColor;
      }
      .pulsating-dot:nth-child(1) { animation-delay: -0.28s; }
      .pulsating-dot:nth-child(2) { animation-delay: -0.14s; }
      .pulsating-dot:nth-child(3) { animation-delay: 0s; }
    `}</style>
      <div className="flex flex-col bg-zinc-800 rounded-lg h-[95vh] text-white overflow-hidden">
        {/* Top Navigation */}
        <div className="flex items-center justify-between p-3 border-b border-zinc-700 bg-zinc-850 shadow-sm">
          <div className="flex items-center gap-2">
            {/* Simplified for "Chat Prompt" feel */}
            {/* <Button variant="ghost" size="icon" asChild className="text-zinc-400 hover:text-white hover:bg-zinc-700">
            <Link href="/dashboard/client">
              <ArrowLeft size={18} />
            </Link>
          </Button> */}
            <h1 className="text-lg font-semibold text-zinc-100 ml-2">
              {messages.length > 0 && activeConversation ? activeConversation.title : "Chat Prompt"}
            </h1>
            {messages.length > 0 && activeConversation && (
              <Button
                variant="ghost"
                size="icon"
                onClick={createNewConversation}
                title="New Conversation"
                className="text-zinc-400 hover:text-white hover:bg-zinc-700"
              >
                <Plus size={18} />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* ADK Connection Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-800/50">
              <div className={`w-2 h-2 rounded-full ${adkStatus === 'connected' ? 'bg-hunter_green-400' :
                  adkStatus === 'connecting' ? 'bg-brown_sugar-400 animate-pulse' :
                    adkStatus === 'error' ? 'bg-destructive' : 'bg-muted'
                }`} />
              <span className="text-xs text-zinc-400">
                {adkStatus === 'connected' ? 'Connected' :
                  adkStatus === 'connecting' ? 'Connecting...' :
                    adkStatus === 'error' ? 'Error' : 'Disconnected'}
              </span>
            </div>

            {/* Debug Mode Toggle */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-800/50">
              <span className="text-xs text-zinc-400">Debug Mode</span>
              <button
                onClick={toggleDebugMode}
                className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-zinc-900 ${debugMode ? 'bg-primary' : 'bg-zinc-600'
                  }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${debugMode ? 'translate-x-3.5' : 'translate-x-0.5'
                    }`}
                />
              </button>
            </div>

            {/* Example icons like in the image - replace with actual functionality */}
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white"><Save size={18} /></Button>
            {/* <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white"><Code2 size={18} /></Button> */}
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white"><Share2 size={18} /></Button>
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white"><PlusSquare size={18} /></Button>
            {/* <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white"><Undo2 size={18} /></Button> */}
            {/* <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white"><Redo2 size={18} /></Button> */}

            <div className="relative group">
              <Button
                variant="ghost"
                size="sm"
                className="text-zinc-300 hover:text-white hover:bg-zinc-700 flex items-center gap-1.5 px-3 py-1.5"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <span>Conversations</span>
                <ChevronDown size={16} className={`transition-transform ${sidebarOpen ? 'rotate-180' : ''}`} />
              </Button>
              {sidebarOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-zinc-800 border border-zinc-700 rounded-lg shadow-2xl z-50 max-h-[70vh] overflow-y-auto">
                  <div className="p-2">
                    <Button
                      variant="ghost"
                      onClick={() => { createNewConversation(); setSidebarOpen(false); }}
                      className="w-full justify-start rounded-md px-3 py-2.5 text-zinc-200 hover:bg-zinc-700 hover:text-white text-sm"
                    >
                      <Plus size={16} className="mr-2.5" />
                      New conversation
                    </Button>
                  </div>
                  <div className="border-t border-zinc-700 pt-1">
                    {conversations.length === 0 ? (
                      <div className="text-center py-4 px-3">
                        <p className="text-zinc-500 text-xs">No conversations yet</p>
                      </div>
                    ) : (
                      <div className="py-1">
                        {conversations.map((conversation) => (
                          <button
                            key={conversation._id}
                            className={`w-full text-left px-4 py-2.5 hover:bg-zinc-700 transition-colors text-sm rounded-md ${activeConversation?._id === conversation._id ? 'bg-zinc-700 text-white font-medium' : 'text-zinc-300'
                              }`}
                            onClick={() => {
                              router.push(`/dashboard/client/chat/${conversation._id}`);
                              setSidebarOpen(false);
                            }}
                          >
                            <span className="truncate block">{conversation.title || 'Onboarding Conversation'}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white"><MoreHorizontal size={18}/></Button> */}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-grow overflow-y-auto flex flex-col relative">
          {error && !(isLoading || isLoadingMessages) && (
            <div className="w-full max-w-3xl mx-auto mt-4 relative z-20">
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg flex items-start shadow-md">
                <AlertCircle className="h-5 w-5 mr-2.5 mt-0.5 flex-shrink-0 text-red-400" />
                <div>
                  <p className="font-medium text-red-200">Error</p>
                  <p className="text-sm text-red-300/90">{error}</p>
                </div>
              </div>
            </div>
          )}

          {(isLoading || isLoadingMessages) && client && ( // Show branded loading for messages if client is loaded
            <ChatLoadingScreen
              clientName={client?.user?.firstName}
              organizationName={client?.organization?.name}
            />
          )}

          {!isLoading && !isLoadingMessages && hasCheckedForMessages && messages.length === 0 ? (
            // Welcome Screen
            <div className="flex flex-col flex-grow items-center justify-center p-6 text-center relative">
              {/* Content */}
              <div className="relative z-10 w-full">
                <h1 className="text-4xl lg:text-5xl font-semibold font-geist-sans mb-4 text-success">
                  Great to see you {client?.user?.firstName || 'Barka'}
                </h1>
                <p className="text-zinc-400 mb-8 max-w-lg text-base lg:text-lg mx-auto">
                  Welcome to <span className='font-semibold'>{client.organization.name}</span>. How can I help you today?
                </p>

                {/* Input area */}
                <MessageInputBar
                  onSendMessage={handleSendMessage}
                  onFileUpload={handleFileUpload}
                  isSending={isSending}
                  isWelcomeScreen={true}
                  activeConversation={activeConversation}
                  initialPrompt={initialPrompt}
                />

                {/* Suggested Questions - Now positioned below input */}
                {client?._id && (
                  <SuggestedQuestions
                    onQuestionClick={handleCardClick}
                    clientId={client._id}
                    conversations={conversations || []}
                    currentConversationId={conversationId}
                  />
                )}
              </div>
            </div>
          ) : (
            !isLoading && !isLoadingMessages && (
              // Chat Messages Area - Now uses the performant ChatMessageList component
              <ChatMessageList messages={messages} debugMode={debugMode} />
            )
          )}
        </div>

        {/* Fixed Bottom Input Area */}
        {!isLoading && !isLoadingMessages && client && messages.length > 0 && (
          <div className="sticky bottom-0 w-full py-6 bg-zinc-800">
            <MessageInputBar
              onSendMessage={handleSendMessage}
              onFileUpload={handleFileUpload}
              isSending={isSending}
              isWelcomeScreen={false}
              activeConversation={activeConversation}
              initialPrompt={initialPrompt}
            />
             <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
          </div>
        )}
      </div>
    </>
  );
}
