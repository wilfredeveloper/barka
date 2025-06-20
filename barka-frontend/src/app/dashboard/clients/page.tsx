'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  MessageSquare,
  FileText,
  Eye,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { getCurrentUser } from '@/lib/auth';
import api from '@/lib/api';
import { clientsApi } from '@/lib/api/clients';
import { useToast } from '@/hooks/use-toast';
import { ClientListItem, ClientStatus, ApiResponse } from '@/types';

export default function ClientsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [refreshingProgress, setRefreshingProgress] = useState<string | null>(null);
  const { toast } = useToast();
  const [projectTypeFilter, setProjectTypeFilter] = useState<string>('all');
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/auth/login');
      return;
    }
    setUser(currentUser);

    // Fetch clients
    fetchClients();
  }, [router]);

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<ApiResponse<any[]>>('/clients');

      if (response.data.success) {
        // Transform the API response to match our ClientListItem interface
        const clientList: ClientListItem[] = response.data.data.map(client => ({
          id: client._id,
          name: client.user ? `${client.user.firstName} ${client.user.lastName}` : 'Unknown',
          email: client.user?.email,
          projectType: formatProjectType(client.projectType, client.projectTypeOther),
          status: client.status as ClientStatus,
          onboardingProgress: client.onboardingProgress || 0,
          lastActivity: formatDate(client.updatedAt)
        }));

        setClients(clientList);
      } else {
        console.error('API error:', response.data.message);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to format project type
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

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;

    try {
      const response = await api.delete<ApiResponse<any>>(`/clients/${clientToDelete}`);

      if (response.data.success) {
        // Remove the deleted client from the state
        setClients(clients.filter(client => client.id !== clientToDelete));
        setClientToDelete(null);
      } else {
        console.error('API error:', response.data.message);
      }
    } catch (error) {
      console.error('Error deleting client:', error);
    }
  };

  const getStatusColor = (status: ClientStatus | string): string => {
    switch (status) {
      case 'onboarding':
        return 'bg-blue-100 text-blue-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleRefreshProgress = async (clientId: string) => {
    setRefreshingProgress(clientId);
    try {
      const result = await clientsApi.refreshClientProgress(clientId);

      // Update the client in the list
      setClients(prevClients =>
        prevClients.map(client =>
          client.id === clientId
            ? { ...client, onboardingProgress: result.client.onboardingProgress }
            : client
        )
      );

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
      setRefreshingProgress(null);
    }
  };

  // Filter clients based on search query and filters
  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (client.email && client.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = !statusFilter || statusFilter === 'all' || client.status === statusFilter;
    const matchesProjectType = !projectTypeFilter || projectTypeFilter === 'all' ||
                              client.projectType.toLowerCase().includes(projectTypeFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesProjectType;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-primary/20 rounded mb-2"></div>
            <div className="h-4 w-64 bg-primary/10 rounded"></div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="animate-pulse">
              <div className="h-6 w-32 bg-primary/20 rounded mb-2"></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-48"></div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                  </div>
                  <div className="h-8 bg-gray-200 rounded w-20"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-muted-foreground">Manage and view all your clients</p>
        </div>
        <Button className="mt-4 md:mt-0" asChild>
          <Link href="/dashboard/clients/new">
            <Plus size={16} className="mr-2" />
            Add New Client
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="onboarding">Onboarding</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={projectTypeFilter} onValueChange={setProjectTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  <SelectItem value="web_development">Web Development</SelectItem>
                  <SelectItem value="mobile_app">Mobile App</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium">No clients found</h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery || (statusFilter && statusFilter !== 'all') || (projectTypeFilter && projectTypeFilter !== 'all')
                  ? "Try adjusting your search or filters"
                  : "Add your first client to get started"}
              </p>
              <Button asChild>
                <Link href="/dashboard/clients/new">
                  <Plus size={16} className="mr-2" />
                  Add New Client
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Project Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">
                        <Link href={`/dashboard/clients/${client.id}`} className="hover:underline">
                          {client.name}
                        </Link>
                      </TableCell>
                      <TableCell>{client.projectType}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(client.status)}>
                          {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className="bg-primary h-2.5 rounded-full"
                            style={{ width: `${client.onboardingProgress}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500 mt-1">{client.onboardingProgress}%</span>
                      </TableCell>
                      <TableCell>{client.lastActivity}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/dashboard/clients/${client.id}`}>
                              <Eye size={16} />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/dashboard/conversations?client=${client.id}`}>
                              <MessageSquare size={16} />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/dashboard/documents?client=${client.id}`}>
                              <FileText size={16} />
                            </Link>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/clients/${client.id}/edit`}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/clients/${client.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleRefreshProgress(client.id)}
                                disabled={refreshingProgress === client.id}
                              >
                                <RefreshCw className={`mr-2 h-4 w-4 ${refreshingProgress === client.id ? 'animate-spin' : ''}`} />
                                Refresh Progress
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => {
                                    e.preventDefault();
                                    setClientToDelete(client.id);
                                  }}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will permanently delete the client
                                      and all associated data.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setClientToDelete(null)}>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteClient} className="bg-destructive text-destructive-foreground">
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
