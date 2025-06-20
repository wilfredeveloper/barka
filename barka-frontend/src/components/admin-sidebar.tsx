'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  LogOut,
  FolderKanban,
  CheckSquare,
  UserCheck,
  ChevronDown,
  TestTube,
  Terminal,
  Plus,
  MessageSquare,
  Calendar,
  MoreHorizontal,
  Trash2,
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
  SidebarSeparator,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { logout, getCurrentUser } from '@/lib/auth';
import Image from 'next/image';
import api from '@/lib/api';

interface AdminSidebarProps {
  user: any;
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const isAdmin = user?.role === 'org_admin' || user?.role === 'super_admin';

  return (
    <Sidebar collapsible="icon" className="admin-sidebar">
      <style jsx global>{`
        .admin-sidebar [data-sidebar="content"] {
          scrollbar-width: thin;
          scrollbar-color: hsl(var(--sidebar-primary)) transparent;
        }

        .admin-sidebar [data-sidebar="content"]::-webkit-scrollbar {
          width: 8px;
        }

        .admin-sidebar [data-sidebar="content"]::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 4px;
        }

        .admin-sidebar [data-sidebar="content"]::-webkit-scrollbar-thumb {
          background: linear-gradient(
            135deg,
            hsl(var(--sidebar-primary) / 0.6),
            hsl(var(--sidebar-accent) / 0.8)
          );
          border-radius: 4px;
          border: 1px solid hsl(var(--sidebar-border) / 0.3);
          transition: all 0.2s ease;
        }

        .admin-sidebar [data-sidebar="content"]::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(
            135deg,
            hsl(var(--sidebar-primary) / 0.8),
            hsl(var(--sidebar-accent) / 1)
          );
          border-color: hsl(var(--sidebar-primary) / 0.5);
          transform: scaleY(1.1);
        }

        .admin-sidebar [data-sidebar="content"]::-webkit-scrollbar-thumb:active {
          background: linear-gradient(
            135deg,
            hsl(var(--sidebar-primary)),
            hsl(var(--sidebar-accent))
          );
        }

        /* Smooth scrolling for the sidebar content */
        .admin-sidebar [data-sidebar="content"] {
          scroll-behavior: smooth;
        }

        /* Add subtle shadow to scrollbar area when scrolling */
        .admin-sidebar [data-sidebar="content"]:hover::-webkit-scrollbar-thumb {
          box-shadow:
            0 2px 4px hsl(var(--sidebar-background) / 0.3),
            inset 0 1px 0 hsl(var(--sidebar-primary) / 0.2);
        }
      `}</style>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
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
                  <span className="truncate text-xs">Admin Dashboard</span>
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
                <SidebarMenuButton asChild isActive={pathname === '/dashboard'}>
                  <Link href="/dashboard">
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Admin Management */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/clients')}>
                    <Link href="/dashboard/clients">
                      <Users />
                      <span>Clients</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/projects')}>
                    <Link href="/dashboard/projects">
                      <FolderKanban />
                      <span>Projects</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/tasks')}>
                    <Link href="/dashboard/tasks">
                      <CheckSquare />
                      <span>Tasks</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/team')}>
                    <Link href="/dashboard/team">
                      <UserCheck />
                      <span>Team</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/dashboard/admin/barka-space-os/events')}
                    className="bg-gradient-to-r from-blue-600/20 to-blue-500/20 hover:from-blue-600/30 hover:to-blue-500/30 border border-blue-500/30 text-blue-100 font-medium"
                  >
                    <Link href="/dashboard/admin/barka-space-os/events">
                      <Calendar className="text-blue-400" />
                      <span>Events Management</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarSeparator />

        {/* Content */}
        <SidebarGroup>
          <SidebarGroupLabel>Content</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/documents')}>
                  <Link href="/dashboard/documents">
                    <FileText />
                    <span>Documents</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Command Center - Only for admins */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Command Center</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/dashboard/admin/barka-space-os') && !pathname.includes('/events')}
                    className="bg-gradient-to-r from-brown_sugar-600/20 to-brown_sugar-500/20 hover:from-brown_sugar-600/30 hover:to-brown_sugar-500/30 border border-brown_sugar-500/30 text-brown_sugar-100 font-medium"
                  >
                    <Link href="/dashboard/admin/barka-space-os">
                      <Terminal className="text-brown_sugar-400" />
                      <span>Barka Space OS</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Space OS Conversations - Only show when on Space OS page */}
        {isAdmin && (
          <SpaceOSConversations />
        )}

        <SidebarSeparator />

        {/* Settings */}
        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/settings')}>
                  <Link href="/dashboard/settings">
                    <Settings />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Project Manager Test - Only for admins */}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/admin/project-manager-test')}>
                    <Link href="/dashboard/admin/project-manager-test">
                      <TestTube />
                      <span>Project Manager Test</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
                      {user?.firstName?.[0]?.toUpperCase() || 'A'}
                    </span>
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user?.firstName} {user?.lastName}
                    </span>
                    <span className="truncate text-xs">
                      {user?.role === 'org_admin' ? 'Organization Admin' :
                       user?.role === 'super_admin' ? 'Super Admin' :
                       'Admin'}
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

// Space OS Conversations Component - Matching client sidebar pattern
function SpaceOSConversations() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const loadConversations = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await api.get('/conversations');
        if (response.data.success && response.data.data) {
          // Filter for admin conversations or show all for now
          const adminConversations = response.data.data.filter((conv: any) =>
            conv.title?.includes('Admin') || conv.title?.includes('Space OS') ||
            conv.type === 'admin_test' || !conv.client // Conversations without a client are likely admin conversations
          );
          setConversations(adminConversations);
        }
      } catch (error) {
        console.log('No existing conversations found');
        setError('Failed to load conversations');
        setConversations([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();
  }, []);

  const createNewConversation = async () => {
    try {
      // Get current user for proper conversation creation
      const currentUser = getCurrentUser();
      if (!currentUser) {
        setError('User not found');
        return;
      }

      // Use the same pattern as project manager test page
      const conversationPayload: any = {
        title: `Space OS Session - ${new Date().toLocaleString()}`,
        organizationId: currentUser.organization,
        type: 'admin_test'
      };

      // Only add clientId for non-admin users
      if (currentUser.role === 'org_client') {
        conversationPayload.clientId = currentUser.id;
      }

      const response = await api.post('/conversations', conversationPayload);

      if (response.data.success && response.data.data) {
        const newConversation = response.data.data;
        setConversations(prev => [newConversation, ...prev]);
        setActiveConversation(newConversation);

        // Emit event to notify Space OS page
        window.dispatchEvent(new CustomEvent('spaceOSConversationSelected', {
          detail: newConversation
        }));
      }
    } catch (error: any) {
      console.error('Failed to create conversation:', error);
      setError(error.response?.data?.message || 'Failed to create conversation');
    }
  };

  const selectConversation = (conversation: any) => {
    setActiveConversation(conversation);
    // Emit event to notify Space OS page
    window.dispatchEvent(new CustomEvent('spaceOSConversationSelected', {
      detail: conversation
    }));
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      setIsDeleting(true);
      setError(null);

      const response = await api.delete(`/conversations/${conversationId}`);

      if (response.data.success) {
        // Remove conversation from the list
        setConversations(prev => prev.filter(conv => conv._id !== conversationId));

        // If we're currently viewing the deleted conversation, redirect
        if (pathname === `/dashboard/admin/barka-space-os/${conversationId}`) {
          router.push('/dashboard/admin/barka-space-os');
        }

        // Clear active conversation if it was the deleted one
        if (activeConversation?._id === conversationId) {
          setActiveConversation(null);
        }
      } else {
        setError(response.data.message || 'Failed to delete conversation');
      }
    } catch (error: unknown) {
      console.error('Error deleting conversation:', error);
      setError('Failed to delete conversation. Please try again.');
    } finally {
      setIsDeleting(false);
      setConversationToDelete(null);
    }
  };

  const handleDeleteClick = (conversation: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setConversationToDelete(conversation);
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Space OS Conversations</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {/* New Conversation Button */}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={createNewConversation}>
              <Plus />
              <span>New Session</span>
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
                No sessions yet
              </div>
            </SidebarMenuItem>
          ) : (
            conversations.map((conversation) => (
              <SidebarMenuItem key={conversation._id}>
                <Link href={`/dashboard/admin/barka-space-os/${conversation._id}`}>
                  <SidebarMenuButton
                    onClick={() => selectConversation(conversation)}
                    isActive={activeConversation?._id === conversation._id}
                  >
                    <MessageSquare />
                    <span className="truncate">
                      {conversation.title || 'Space OS Session'}
                    </span>
                  </SidebarMenuButton>
                </Link>

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
                      onClick={(e) => handleDeleteClick(conversation, e)}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!conversationToDelete} onOpenChange={() => setConversationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{conversationToDelete?.title || 'this conversation'}"?
              This action cannot be undone and will permanently remove all messages in this conversation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => conversationToDelete && deleteConversation(conversationToDelete._id)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarGroup>
  );
}
