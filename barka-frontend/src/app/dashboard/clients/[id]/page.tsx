'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Edit,
  Trash2,
  MessageSquare,
  FileText,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Mail,
  Building,
  Tag,
  BarChart,
  Plus,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Client,
  ConversationListItem,
  Document as DocumentType,
  ClientStatus,
  ProjectType,
  EstimatedDuration,
  ApiResponse,
  ConversationStatus
} from '@/types';

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [isRefreshingProgress, setIsRefreshingProgress] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/auth/login');
      return;
    }
    setUser(currentUser);

    // Resolve params and set client ID
    const resolveParams = async () => {
      const resolvedParams = await params;
      setClientId(resolvedParams.id);
    };

    resolveParams();
  }, [params, router]);

  // Fetch client data when clientId is available
  useEffect(() => {
    if (!clientId) return;
    fetchClientData();
  }, [clientId]);

  const fetchClientData = async () => {
    if (!clientId) return;

    try {
      setIsLoading(true);

      // Fetch client details
      const clientResponse = await api.get<ApiResponse<Client>>(`/clients/${clientId}`);

      if (clientResponse.data.success && clientResponse.data.data) {
        // Convert API response to match our Client interface
        const clientData = clientResponse.data.data;

        // Ensure we have the correct structure
        const formattedClient: Client = {
          ...clientData,
          _id: clientData._id,
          id: clientData._id, // Add id field for compatibility
          user: typeof clientData.user === 'string'
            ? { _id: clientData.user, firstName: 'Unknown', lastName: 'User', email: '' }
            : clientData.user,
          organization: typeof clientData.organization === 'string'
            ? { _id: clientData.organization, name: 'Unknown Organization' }
            : clientData.organization
        };

        setClient(formattedClient);
      } else {
        console.error('API error:', clientResponse.data.message);
      }

      // Fetch client conversations
      const conversationsResponse = await api.get<ApiResponse<any[]>>(`/conversations?client=${clientId}`);

      if (conversationsResponse.data.success && conversationsResponse.data.data) {
        // Transform the API response to match our ConversationListItem interface
        const conversationList: ConversationListItem[] = conversationsResponse.data.data.map(conv => ({
          id: conv._id,
          title: conv.title,
          clientName: conv.client?.user ? `${conv.client.user.firstName} ${conv.client.user.lastName}` : 'Unknown Client',
          clientId: conv.client?._id,
          lastMessageAt: formatDate(conv.lastMessageAt || conv.updatedAt),
          status: conv.status as ConversationStatus,
          messageCount: conv.messageCount || 0,
          lastMessage: conv.lastMessage?.content
        }));

        setConversations(conversationList);
      } else {
        console.error('API error:', conversationsResponse.data.message);
      }

      // Fetch client documents
      const documentsResponse = await api.get<ApiResponse<any[]>>(`/documents?client=${clientId}`);

      if (documentsResponse.data.success && documentsResponse.data.data) {
        // Transform the API response to match our DocumentType interface
        const documentList: DocumentType[] = documentsResponse.data.data.map(doc => ({
          _id: doc._id,
          id: doc._id, // Add id field for compatibility
          name: doc.name,
          client: doc.client,
          organization: doc.organization,
          type: doc.type,
          size: doc.size,
          url: doc.url,
          path: doc.path,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt
        }));

        setDocuments(documentList);
      } else {
        console.error('API error:', documentsResponse.data.message);
      }
    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!clientId) return;

    try {
      setIsDeleting(true);
      const response = await api.delete<ApiResponse<any>>(`/clients/${clientId}`);

      if (response.data.success) {
        router.push('/dashboard/clients');
      } else {
        console.error('API error:', response.data.message);
      }
    } catch (error) {
      console.error('Error deleting client:', error);
    } finally {
      setIsDeleting(false);
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

  const formatProjectType = (type: ProjectType | string): string => {
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
        return client?.projectTypeOther || 'Other';
      default:
        return type;
    }
  };

  const formatDuration = (duration: EstimatedDuration | string): string => {
    switch (duration) {
      case '1-4_weeks':
        return '1-4 Weeks';
      case '1-3_months':
        return '1-3 Months';
      case '3-6_months':
        return '3-6 Months';
      case '6+_months':
        return '6+ Months';
      default:
        return duration;
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleRefreshProgress = async () => {
    if (!clientId) return;

    setIsRefreshingProgress(true);
    try {
      const result = await clientsApi.refreshClientProgress(clientId);
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="icon" className="animate-pulse">
            <div className="h-8 w-8 bg-primary/20 rounded-full"></div>
          </Button>
          <div className="animate-pulse">
            <div className="h-6 w-48 bg-primary/20 rounded mb-2"></div>
            <div className="h-4 w-32 bg-primary/10 rounded"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="animate-pulse">
                  <div className="h-5 w-32 bg-primary/20 rounded mb-2"></div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center">
                      <div className="h-8 w-8 bg-primary/10 rounded-full mr-4"></div>
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="animate-pulse">
                  <div className="h-5 w-32 bg-primary/20 rounded mb-2"></div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center">
                      <div className="h-8 w-8 bg-primary/10 rounded-full mr-4"></div>
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle size={48} className="text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Client Not Found</h2>
        <p className="text-muted-foreground mb-6">The client you're looking for doesn't exist or you don't have permission to view it.</p>
        <Button asChild>
          <Link href="/dashboard/clients">
            <ArrowLeft size={16} className="mr-2" />
            Back to Clients
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="h-9 w-9">
            <Link href="/dashboard/clients">
              <ArrowLeft size={16} />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{client.user.firstName} {client.user.lastName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={getStatusColor(client.status)}>
                {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
              </Badge>
              <span className="text-sm text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">{formatProjectType(client.projectType)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4 md:mt-0">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/clients/${clientId || ''}/edit`}>
              <Edit size={16} className="mr-2" />
              Edit Client
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 size={16} className="mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the client
                  and all associated data including conversations and documents.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteClient}
                  className="bg-destructive text-destructive-foreground"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="overview">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="conversations">Conversations</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Client Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Full Name</p>
                        <p className="text-sm text-muted-foreground">{client.user.firstName} {client.user.lastName}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Email</p>
                        <p className="text-sm text-muted-foreground">{client.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Organization</p>
                        <p className="text-sm text-muted-foreground">{client.organization.name}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Tag className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Project Type</p>
                        <p className="text-sm text-muted-foreground">{formatProjectType(client.projectType)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Budget</p>
                        <p className="text-sm text-muted-foreground">
                          {client.budget ? `$${client.budget.toLocaleString()}` : 'Not specified'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Timeline</p>
                        <p className="text-sm text-muted-foreground">
                          {client.timeline?.estimatedDuration
                            ? formatDuration(client.timeline.estimatedDuration)
                            : 'Not specified'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Start Date</p>
                        <p className="text-sm text-muted-foreground">
                          {client.timeline?.startDate
                            ? formatDate(client.timeline.startDate)
                            : 'Not specified'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">End Date</p>
                        <p className="text-sm text-muted-foreground">
                          {client.timeline?.endDate
                            ? formatDate(client.timeline.endDate)
                            : 'Not specified'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Onboarding Progress</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefreshProgress}
                    disabled={isRefreshingProgress}
                    className="h-8 w-8 p-0"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshingProgress ? 'animate-spin' : ''}`} />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{client.onboardingProgress}% Complete</span>
                      {client.onboardingProgress === 100 && (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Completed
                        </Badge>
                      )}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-primary h-2.5 rounded-full"
                        style={{ width: `${client.onboardingProgress}%` }}
                      ></div>
                    </div>
                    {client.onboardingCompletedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Completed on {formatDate(client.onboardingCompletedAt)}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {client.requirements && client.requirements.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Project Requirements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc pl-5 space-y-1">
                      {client.requirements.map((req, index) => (
                        <li key={index} className="text-sm">{req}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {client.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-line">{client.notes}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="conversations">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Conversations</CardTitle>
                  <Button size="sm" asChild>
                    <Link href={`/dashboard/conversations/new?client=${clientId || ''}`}>
                      <Plus size={16} className="mr-2" />
                      New Conversation
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {conversations.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare size={36} className="mx-auto text-gray-300 mb-3" />
                      <h3 className="text-lg font-medium mb-1">No conversations yet</h3>
                      <p className="text-muted-foreground mb-4">Start a new conversation with this client</p>
                      <Button asChild>
                        <Link href={`/dashboard/conversations/new?client=${clientId || ''}`}>
                          <Plus size={16} className="mr-2" />
                          New Conversation
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {conversations.map((conversation) => (
                        <div key={conversation.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-start gap-3">
                            <div className="bg-primary/10 p-2 rounded-full">
                              <MessageSquare size={20} className="text-primary" />
                            </div>
                            <div>
                              <Link href={`/dashboard/conversations/${conversation.id}`} className="font-medium hover:underline">
                                {conversation.title}
                              </Link>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className={getStatusColor(conversation.status)}>
                                  {conversation.status.charAt(0).toUpperCase() + conversation.status.slice(1)}
                                </Badge>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground">{conversation.lastMessageAt}</span>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground">{conversation.messageCount} messages</span>
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/dashboard/conversations/${conversation.id}`}>
                              <ArrowLeft size={16} className="rotate-180" />
                            </Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Documents</CardTitle>
                  <Button size="sm" asChild>
                    <Link href={`/dashboard/documents/upload?client=${clientId || ''}`}>
                      <Plus size={16} className="mr-2" />
                      Upload Document
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {documents.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText size={36} className="mx-auto text-gray-300 mb-3" />
                      <h3 className="text-lg font-medium mb-1">No documents yet</h3>
                      <p className="text-muted-foreground mb-4">Upload documents for this client</p>
                      <Button asChild>
                        <Link href={`/dashboard/documents/upload?client=${clientId || ''}`}>
                          <Plus size={16} className="mr-2" />
                          Upload Document
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {documents.map((document) => (
                        <div key={document.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-start gap-3">
                            <div className="bg-primary/10 p-2 rounded-full">
                              <FileText size={20} className="text-primary" />
                            </div>
                            <div>
                              <Link href={`/dashboard/documents/${document.id}`} className="font-medium hover:underline">
                                {document.name}
                              </Link>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground">{document.type.toUpperCase()}</span>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground">{formatFileSize(document.size)}</span>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground">{formatDate(document.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/dashboard/documents/${document.id}`}>
                              <ArrowLeft size={16} className="rotate-180" />
                            </Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full justify-start" asChild>
                <Link href={`/dashboard/conversations/new?client=${clientId || ''}`}>
                  <MessageSquare size={16} className="mr-2" />
                  Start New Conversation
                </Link>
              </Button>
              <Button className="w-full justify-start" asChild>
                <Link href={`/dashboard/documents/upload?client=${clientId || ''}`}>
                  <FileText size={16} className="mr-2" />
                  Upload Document
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href={`/dashboard/clients/${clientId || ''}/edit`}>
                  <Edit size={16} className="mr-2" />
                  Edit Client Details
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Client Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={16} className="text-muted-foreground" />
                    <span className="text-sm">Conversations</span>
                  </div>
                  <span className="font-medium">{conversations.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-muted-foreground" />
                    <span className="text-sm">Documents</span>
                  </div>
                  <span className="font-medium">{documents.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-muted-foreground" />
                    <span className="text-sm">Client Since</span>
                  </div>
                  <span className="font-medium">{formatDate(client.createdAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
