'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import api from '@/lib/api';
import { ApiResponse, Conversation } from '@/types';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare } from 'lucide-react';

export default function ClientChatPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [client, setClient] = useState<any>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/auth/login');
      return;
    }

    // Only allow client role to access this page
    if (currentUser.role !== 'org_client') {
      router.push('/dashboard');
      return;
    }

    fetchClientAndRedirect();
  }, [router]);

  const fetchClientAndRedirect = async () => {
    try {
      // Fetch client information
      const clientResponse = await api.get<ApiResponse<any>>('/clients/me');

      if (clientResponse.data.success && clientResponse.data.data) {
        setClient(clientResponse.data.data);

        // Fetch conversations
        const conversationsResponse = await api.get<ApiResponse<Conversation[]>>('/conversations');

        if (conversationsResponse.data.success && conversationsResponse.data.data) {
          const conversations = conversationsResponse.data.data;

          // If there are conversations, redirect to the first one
          if (conversations.length > 0) {
            router.push(`/dashboard/client/chat/${conversations[0]._id}`);
            return;
          }
        }
      }

      // If we reach here, show the welcome screen
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setIsLoading(false);
    }
  };

  const createNewConversation = async () => {
    if (!client) return;

    try {
      setIsLoading(true);
      const response = await api.post<ApiResponse<Conversation>>('/conversations', {
        clientId: client._id,
        title: 'New Onboarding Conversation',
      });

      if (response.data.success && response.data.data) {
        const newConversation = response.data.data;
        router.push(`/dashboard/client/chat/${newConversation._id}`);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-primary/20 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-primary/20 rounded mb-3"></div>
          <div className="h-3 w-24 bg-primary/10 rounded"></div>
        </div>
      </div>
    );
  }

  // Welcome screen when no conversations exist
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="mb-6">
          <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Welcome to Barka Chat</h1>
          <p className="text-muted-foreground">
            Start a conversation with our AI assistant to help with your onboarding process.
          </p>
        </div>

        <Button onClick={createNewConversation} variant="default" size="lg">
          <Plus className="h-4 w-4 mr-2" />
          Start New Conversation
        </Button>
      </div>
    </div>
  );
}