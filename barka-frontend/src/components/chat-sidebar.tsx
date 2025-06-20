'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  MessageSquare,
  Plus,
  ChevronDown,
  Trash2,
  MoreHorizontal,
  Settings,
  LayoutDashboard,
  LogOut,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getCurrentUser, logout } from '@/lib/auth';
import api from '@/lib/api';
import { ApiResponse, Conversation } from '@/types';
import Image from 'next/image';
import { useConversation } from '@/contexts/ConversationContext';

interface ChatSidebarProps {
  user: any;
}

export function ChatSidebar({ user }: ChatSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    conversations,
    setConversations,
    addConversation,
    removeConversation
  } = useConversation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === 'org_client') {
      fetchConversations();
    }
  }, [user]);

  const fetchConversations = async () => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await api.get<ApiResponse<Conversation[]>>('/conversations');
      
      if (response.data.success && response.data.data) {
        setConversations(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch conversations');
      }
    } catch (error: unknown) {
      console.error('Error fetching conversations:', error);
      setError('Failed to fetch conversations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const createNewConversation = async () => {
    try {
      const clientResponse = await api.get<ApiResponse<any>>('/clients/me');
      
      if (!clientResponse.data.success || !clientResponse.data.data) {
        setError('Cannot create conversation: Client information not available');
        return;
      }

      const client = clientResponse.data.data;
      const response = await api.post<ApiResponse<Conversation>>('/conversations', {
        clientId: client._id,
        title: 'New Onboarding Conversation',
      });

      if (response.data.success && response.data.data) {
        const newConversation = response.data.data;
        addConversation(newConversation);

        // Log ADK session info if available
        if (newConversation.adkSessionId) {
          console.log(`New conversation created with ADK session: ${newConversation.adkSessionId}`);
        } else {
          console.log('New conversation created, ADK session will be created when chat loads');
        }

        router.push(`/dashboard/client/chat/${newConversation._id}`);
      } else {
        setError(response.data.message || 'Failed to create conversation');
      }
    } catch (error: unknown) {
      console.error('Error creating conversation:', error);
      setError('Failed to create conversation. Please try again.');
    }
  };

  const deleteConversation = async (conversationId: string) => {
    if (!confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api.delete(`/conversations/${conversationId}`);
      
      if (response.data.success) {
        removeConversation(conversationId);

        // If we're currently viewing the deleted conversation, redirect
        if (pathname === `/dashboard/client/chat/${conversationId}`) {
          router.push('/dashboard/client/chat');
        }
      } else {
        setError(response.data.message || 'Failed to delete conversation');
      }
    } catch (error: unknown) {
      console.error('Error deleting conversation:', error);
      setError('Failed to delete conversation. Please try again.');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const isClient = user?.role === 'org_client';

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={isClient ? "/dashboard/client" : "/dashboard"}>
                <div className="flex aspect-square size-12 items-center justify-center rounded-lg text-primary-foreground">
                  <Image
                    src="/barka-logo.svg"
                    alt="Barka"
                    width={400}
                    height={300}
                    priority
                    className="Barka-logo"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Barka</span>
                  <span className="truncate text-xs">AI Assistant</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href={isClient ? "/dashboard/client" : "/dashboard"}>
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              {isClient && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/dashboard/client/profile">
                      <Settings />
                      <span>Profile Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Chats Section - Only for clients */}
        {isClient && (
          <SidebarGroup>
            <Collapsible defaultOpen className="group/collapsible">
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center justify-between">
                  Chats
                  <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {/* New Chat Button */}
                    <SidebarMenuItem>
                      <SidebarMenuButton onClick={createNewConversation}>
                        <Plus />
                        <span>New Chat</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* Conversations List */}
                    {isLoading ? (
                      <SidebarMenuItem>
                        <div className="flex items-center space-x-2 p-2">
                          <div className="h-4 w-4 animate-pulse bg-muted rounded"></div>
                          <div className="h-4 flex-1 animate-pulse bg-muted rounded"></div>
                        </div>
                      </SidebarMenuItem>
                    ) : error ? (
                      <SidebarMenuItem>
                        <div className="p-2 text-xs text-destructive">
                          {error}
                        </div>
                      </SidebarMenuItem>
                    ) : conversations.length === 0 ? (
                      <SidebarMenuItem>
                        <div className="p-2 text-xs text-muted-foreground">
                          No conversations yet
                        </div>
                      </SidebarMenuItem>
                    ) : (
                      conversations.map((conversation) => (
                        <SidebarMenuItem key={conversation._id}>
                          <SidebarMenuButton 
                            asChild
                            isActive={pathname === `/dashboard/client/chat/${conversation._id}`}
                          >
                            <Link href={`/dashboard/client/chat/${conversation._id}`}>
                              <MessageSquare />
                              <span className="truncate">
                                {conversation.title || 'Onboarding Conversation'}
                              </span>
                            </Link>
                          </SidebarMenuButton>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <SidebarMenuAction showOnHover>
                                <MoreHorizontal />
                                <span className="sr-only">More</span>
                              </SidebarMenuAction>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              className="w-48"
                              side="right"
                              align="start"
                            >
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => deleteConversation(conversation._id)}
                              >
                                <Trash2 />
                                Delete conversation
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </SidebarMenuItem>
                      ))
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <span className="text-xs font-bold">
                      {user?.firstName?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user?.firstName} {user?.lastName}
                    </span>
                    <span className="truncate text-xs">
                      {user?.role === 'org_admin' ? 'Organization Admin' :
                       user?.role === 'super_admin' ? 'Super Admin' :
                       'Organization Client'}
                    </span>
                  </div>
                  <ChevronDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
