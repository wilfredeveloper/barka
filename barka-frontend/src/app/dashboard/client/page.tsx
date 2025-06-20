'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MessageSquare,
  FileText,
  User,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MeetingsWidget } from '@/components/ui/meetings-widget';
import { getCurrentUser } from '@/lib/auth';
import api from '@/lib/api';
import { clientsApi } from '@/lib/api/clients';
import { useToast } from '@/hooks/use-toast';
import { ApiResponse, Client, ConversationListItem } from '@/types';

export default function ClientDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [isRefreshingProgress, setIsRefreshingProgress] = useState(false);
  const { toast } = useToast();

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

    setUser(currentUser);

    // Check if this is the first login
    const lastLogin = localStorage.getItem('lastLogin');
    if (!lastLogin) {
      setIsFirstLogin(true);
      localStorage.setItem('lastLogin', new Date().toISOString());
    }

    // Fetch client data
    fetchClientData(currentUser.id);
  }, [router]);

  const fetchClientData = async (userId: string) => {
    try {
      setIsLoading(true);
      
      // Fetch client data
      const clientResponse = await api.get<ApiResponse<any[]>>('/clients/me');
      
      if (clientResponse.data.success && clientResponse.data.data) {
        setClient(clientResponse.data.data);
      }

      // Fetch conversations
      const conversationsResponse = await api.get<ApiResponse<any[]>>('/conversations');
      
      if (conversationsResponse.data.success) {
        // Transform the API response to match our ConversationListItem interface
        const conversationList: ConversationListItem[] = conversationsResponse.data.data.map(conv => ({
          id: conv._id,
          title: conv.title || 'Onboarding Conversation',
          clientName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
          clientId: user?.id,
          lastMessageAt: formatDate(conv.lastMessageAt || conv.createdAt),
          status: conv.status,
          messageCount: conv.messageCount || 0,
          lastMessage: conv.lastMessage
        }));

        setConversations(conversationList);
      }
    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      return `${Math.floor(diffDays / 7)} weeks ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Format project type for display
  const formatProjectType = (type: string, otherType?: string): string => {
    switch (type) {
      case 'web_development':
        return 'Web Development';
      case 'mobile_app':
        return 'Mobile App';
      case 'design':
        return 'Design';
      case 'marketing':
        return 'Marketing';
      case 'other':
        return otherType || 'Other';
      default:
        return type;
    }
  };

  const handleRefreshProgress = async () => {
    if (!client) return;

    setIsRefreshingProgress(true);
    try {
      const result = await clientsApi.refreshMyProgress();
      setClient(result.client);
      toast({
        title: "Progress Updated",
        description: result.message,
      });
    } catch (error) {
      console.error('Error refreshing progress:', error);
      toast({
        title: "Error",
        description: "Failed to refresh progress. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshingProgress(false);
    }
  };

  // Get status color for badges
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'onboarding':
        return 'bg-primary/10 text-primary';
      case 'active':
        return 'bg-hunter_green-100 text-hunter_green-800';
      case 'paused':
        return 'bg-brown_sugar-100 text-brown_sugar-800';
      case 'completed':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-primary/20 rounded mb-2"></div>
            <div className="h-4 w-64 bg-primary/10 rounded"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-32 bg-primary/20 rounded"></div>
            <div className="h-32 bg-primary/10 rounded"></div>
          </div>
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-32 bg-primary/20 rounded"></div>
            <div className="h-32 bg-primary/10 rounded"></div>
          </div>
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-32 bg-primary/20 rounded"></div>
            <div className="h-64 bg-primary/10 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {isFirstLogin && (
        <Card className="mb-6 border-primary bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-primary">Welcome to Barka!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-primary">
              This is your first login. For security reasons, please update your password in your profile settings.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="text-primary border-primary" asChild>
              <Link href="/dashboard/client/profile">
                Update Password <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      )}

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {user?.firstName}!</h1>
          <p className="text-muted-foreground">
            Your project onboarding dashboard
          </p>
        </div>
        <Button className="mt-4 md:mt-0" asChild>
          <Link href="/dashboard/client/chat">
            <MessageSquare size={16} className="mr-2" />
            Chat with Barka
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Information */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
            <CardDescription>
              Details about your current project
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {client ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Project Type:</span>
                  <span className="font-medium">
                    {formatProjectType(client.projectType, client.projectTypeOther)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="outline" className={getStatusColor(client.status)}>
                    {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Onboarding Progress:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{client.onboardingProgress || 0}%</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRefreshProgress}
                      disabled={isRefreshingProgress}
                      className="h-6 w-6 p-0"
                    >
                      <RefreshCw className={`h-3 w-3 ${isRefreshingProgress ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
                <div className="w-full">
                  <Progress value={client.onboardingProgress || 0} className="h-2" />
                </div>
                {client.budget && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Budget:</span>
                    <span className="font-medium">${client.budget.toLocaleString()}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6">
                <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p>No project information available yet.</p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/dashboard/client/profile">
                <User size={16} className="mr-2" />
                View Profile
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Recent Conversations */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Recent Conversations</CardTitle>
            <CardDescription>
              Your conversations with Barka
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-[200px]">
            {conversations.length > 0 ? (
              <div className="space-y-4">
                {conversations.slice(0, 3).map((conversation) => (
                  <div key={conversation.id} className="flex items-start space-x-4">
                    <div className="bg-primary/10 rounded-full p-2">
                      <MessageSquare size={20} className="text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/dashboard/client/chat/${conversation.id}`}
                          className="font-medium hover:underline"
                        >
                          {conversation.title}
                        </Link>
                        <Badge variant="outline" className="text-xs">
                          {conversation.messageCount} messages
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Last activity: {conversation.lastMessageAt}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p>No conversations yet. Start chatting with Barka to begin your onboarding process.</p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/dashboard/client/chat">
                <MessageSquare size={16} className="mr-2" />
                View All Conversations
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Meetings Widget */}
        <MeetingsWidget className="h-fit" />
      </div>
    </div>
  );
}
