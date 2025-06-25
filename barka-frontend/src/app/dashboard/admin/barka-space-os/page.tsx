'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import api from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { adkSessionService } from '@/lib/adk-session-service';

// Types

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







// Optimistic Message Component for smooth UX
const OptimisticMessageDisplay = React.memo(({ message, isThinking }: { message: string; isThinking: boolean }) => (
  <div className="space-y-4 p-4">
    {/* User Message */}
    <div className="flex gap-3 mb-4 justify-end">
      <div className="max-w-[80%] flex flex-col items-end">
        <div className="p-3 rounded-xl shadow-sm w-fit bg-zinc-700 text-white">
          <div className="whitespace-pre-wrap">{message}</div>
        </div>
      </div>
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brown_sugar-600 flex items-center justify-center">
        <User size={16} className="text-white" />
      </div>
    </div>

    {/* Thinking Indicator */}
    {isThinking && (
      <div className="flex gap-3 mb-4 justify-start">
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
            Agent
          </span>
        </div>
        <div className="max-w-[80%] flex flex-col items-start">
          <div className="p-3 rounded-lg text-zinc-400 bg-zinc-800 inline-block">
            <FastPulsatingDotsLoader />
          </div>
        </div>
      </div>
    )}
  </div>
));

// Message Input Component
const MessageInputBar = React.memo(({
  onSendMessage,
  isSending,
  isWelcomeScreen = false,
  selectedAgent,
  autoFocus = false
}: {
  onSendMessage: (message: string) => void;
  isSending: boolean;
  isWelcomeScreen?: boolean;
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
    <div className={`w-full ${isWelcomeScreen ? 'max-w-2xl my-8 pb-2 mx-auto' : 'max-w-3xl mx-auto p-2'} border border-brown_sugar-500/20 border-1 rounded-lg`}>
      <div className="glass-surface rounded-xl overflow-hidden">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            placeholder={isWelcomeScreen ? `Send a command to ${selectedAgent?.name || 'the agent'}...` : "Continue the conversation..."}
            className={`w-full ${isWelcomeScreen ? 'min-h-[120px]' : 'min-h-[10px]'} max-h-[400px] bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base text-white placeholder:text-zinc-400 chat-textarea-optimized custom-scrollbar`}
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





export default function BarkaSpaceOSPage() {
  const router = useRouter();

  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent>(AVAILABLE_AGENTS[0]);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Optimistic UI state for smooth conversation creation
  const [optimisticMessage, setOptimisticMessage] = useState<string | null>(null);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [showOptimisticUI, setShowOptimisticUI] = useState(false);

  // Initialize user and setup
  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get current user using the same method as project manager test
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
        console.log('Barka Space OS initialized for user:', currentUser);

      } catch (error: any) {
        console.error('Failed to initialize Barka Space OS:', error);
        setError(error.message || 'Failed to initialize Barka Space OS');
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [router]);







  // Create new conversation with optimistic UI updates
  const createNewConversation = useCallback(async (initialMessage: string) => {
    if (!user) {
      console.error('No user available for conversation creation');
      return null;
    }

    try {
      // Immediately show optimistic UI with user message
      setOptimisticMessage(initialMessage);
      setShowOptimisticUI(true);
      setIsCreatingConversation(true);
      setIsSending(true);

      console.log('Creating new conversation for admin user:', user.id);
      console.log('User organization:', user.organization);

      // Use the same pattern as project manager test page
      const conversationPayload: any = {
        title: `Barka Space OS - ${new Date().toLocaleString()}`,
        organizationId: user.organization,
        conversationType: 'admin'
      };

      // Only add clientId for non-admin users (this shouldn't happen in admin page)
      if (user.role === 'org_client') {
        conversationPayload.clientId = user.id;
      }

      const testConversationResponse = await api.post('/conversations', conversationPayload);

      if (!testConversationResponse.data.success) {
        throw new Error('Failed to create conversation');
      }

      const newConversationId = testConversationResponse.data.data._id;
      console.log('Conversation created:', newConversationId);

      // Get ADK session (should already be created by conversation creation)
      console.log('Getting ADK session for admin conversation...');
      const sessionData = await adkSessionService.getConversationSession(newConversationId);

      if (!sessionData) {
        throw new Error('Failed to create ADK session');
      }

      console.log('ADK session retrieved:', sessionData.session.id);

      // Store the initial message in sessionStorage for the new conversation
      sessionStorage.setItem(`initialMessage_${newConversationId}`, initialMessage);

      // Add a small delay to show the thinking state before navigation
      await new Promise(resolve => setTimeout(resolve, 800));

      // Redirect to the conversation page with the new conversation ID
      router.push(`/dashboard/admin/barka-space-os/${newConversationId}`);

      return newConversationId;
    } catch (error: any) {
      console.error('Failed to create conversation:', error);
      setError(error.message || 'Failed to create conversation');

      // Reset optimistic UI on error
      setShowOptimisticUI(false);
      setOptimisticMessage(null);
      setIsCreatingConversation(false);
      setIsSending(false);
      return null;
    }
  }, [user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Terminal size={48} className="text-brown_sugar-400 mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-semibold text-zinc-100 mb-2">Initializing Barka Space OS</h2>
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
          <Button onClick={() => router.push('/dashboard')} variant="outline">
            Return to Dashboard
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
                onClick={() => router.push('/dashboard')}
                className="text-zinc-400 hover:text-zinc-100"
              >
                ← Back to Dashboard
              </Button>
              <div className="h-6 w-px bg-zinc-700" />
              <h1 className="text-xl font-semibold text-zinc-100 flex items-center gap-2">
                <Terminal size={20} className="text-brown_sugar-400" />
                Barka Space OS
              </h1>
              <Badge className="bg-brown_sugar-500/20 text-brown_sugar-300">
                Command Center
              </Badge>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Debug toggle removed for welcome screen */}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 relative">

        <div className="flex flex-col h-[calc(100vh-8rem)]">
          {showOptimisticUI ? (
            /* Optimistic Conversation UI - Smooth transition to conversation view */
            <>
              {/* Chat Messages Area */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <OptimisticMessageDisplay
                  message={optimisticMessage || ''}
                  isThinking={isCreatingConversation}
                />
              </div>

              {/* Message Input - Disabled during creation */}
              <div className="sticky bottom-0 bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-800 pt-4">
                <MessageInputBar
                  onSendMessage={() => {}} // Disabled during creation
                  isSending={true}
                  selectedAgent={selectedAgent}
                  autoFocus={false}
                />
              </div>
            </>
          ) : (
            /* Welcome Screen */
            <div className="flex-1 flex flex-col items-center justify-center pt-16">
              <div className="text-center max-w-2xl">
                <div className="mb-8">
                  <Terminal size={48} className="text-brown_sugar-400 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-zinc-100 mb-2">Welcome to Barka Space OS</h2>
                  <p className="text-zinc-400">
                    High-performance command center for agent conversations. Start a conversation to begin.
                  </p>
                </div>

                {/* Quick Start */}
                <div className="space-y-4">
                  <MessageInputBar
                    onSendMessage={(message) => createNewConversation(message)}
                    isSending={isSending}
                    isWelcomeScreen={true}
                    selectedAgent={selectedAgent}
                    autoFocus={false}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
