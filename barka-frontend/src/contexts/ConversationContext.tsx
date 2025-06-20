'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Conversation } from '@/types';

interface ConversationContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (conversation: Conversation | null) => void;
  updateConversationTitle: (conversationId: string, title: string) => void;
  addConversation: (conversation: Conversation) => void;
  removeConversation: (conversationId: string) => void;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

interface ConversationProviderProps {
  children: ReactNode;
}

export function ConversationProvider({ children }: ConversationProviderProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  const updateConversationTitle = useCallback((conversationId: string, title: string) => {
    // Update conversations list
    setConversations(prev => 
      prev.map(conv => 
        conv._id === conversationId 
          ? { ...conv, title } 
          : conv
      )
    );

    // Update active conversation if it matches
    setActiveConversation(prev => 
      prev && prev._id === conversationId 
        ? { ...prev, title }
        : prev
    );
  }, []);

  const addConversation = useCallback((conversation: Conversation) => {
    setConversations(prev => [conversation, ...prev]);
  }, []);

  const removeConversation = useCallback((conversationId: string) => {
    setConversations(prev => prev.filter(conv => conv._id !== conversationId));
    setActiveConversation(prev => 
      prev && prev._id === conversationId ? null : prev
    );
  }, []);

  const value: ConversationContextType = {
    conversations,
    activeConversation,
    setConversations,
    setActiveConversation,
    updateConversationTitle,
    addConversation,
    removeConversation,
  };

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversation() {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error('useConversation must be used within a ConversationProvider');
  }
  return context;
}
