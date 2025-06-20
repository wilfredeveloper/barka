'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser } from '@/lib/auth';
import api from '@/lib/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

// Define the form schema
const clientFormSchema = z.object({
  projectType: z.string().min(1, { message: 'Project type is required' }),
  projectTypeOther: z.string().optional().nullable(),
  budget: z.coerce.number().optional().nullable(),
  timeline: z.object({
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    estimatedDuration: z.string().optional().nullable(),
  }).optional().nullable(),
  requirements: z.array(z.string()).optional().default([]),
  notes: z.string().optional().nullable(),
  status: z.string(),
  onboardingProgress: z.coerce.number().min(0).max(100).optional().nullable(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

export default function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingClient, setIsLoadingClient] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);

  // Initialize form with empty values
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      projectType: '',
      projectTypeOther: null,
      budget: null,
      status: 'onboarding',
      onboardingProgress: 0,
      timeline: {
        startDate: null,
        endDate: null,
        estimatedDuration: null,
      },
      requirements: [],
      notes: null,
    },
  });

  // Get the current user and resolve params
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

    const fetchClient = async () => {
      try {
        setIsLoadingClient(true);
        const response = await api.get(`/api/clients/${clientId}`);

        if (response.data.success) {
          const clientData = response.data.data;
          setClient(clientData);

          // Format the data for the form
          form.reset({
            projectType: clientData.projectType || '',
            projectTypeOther: clientData.projectTypeOther || null,
            budget: clientData.budget || null,
            timeline: {
              startDate: clientData.timeline?.startDate ? new Date(clientData.timeline.startDate).toISOString().split('T')[0] : null,
              endDate: clientData.timeline?.endDate ? new Date(clientData.timeline.endDate).toISOString().split('T')[0] : null,
              estimatedDuration: clientData.timeline?.estimatedDuration || null,
            },
            requirements: clientData.requirements || [],
            notes: clientData.notes || null,
            status: clientData.status || 'onboarding',
            onboardingProgress: clientData.onboardingProgress || 0,
          });
        } else {
          console.error('API error:', response.data.message);
          toast({
            title: 'Error',
            description: 'Failed to load client data. Please try again.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error fetching client:', error);
        toast({
          title: 'Error',
          description: 'Failed to load client data. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingClient(false);
      }
    };

    fetchClient();
  }, [clientId, toast, form]);

  // Handle form submission
  const onSubmit = async (data: ClientFormValues) => {
    try {
      setIsLoading(true);

      // Format requirements as an array if it's a string
      if (typeof data.requirements === 'string') {
        data.requirements = (data.requirements as unknown as string)
          .split('\n')
          .filter(req => req.trim() !== '');
      }

      const response = await api.put(`/api/clients/${clientId}`, data);

      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Client updated successfully',
        });

        // Redirect back to the client page
        router.push(`/dashboard/clients/${clientId}`);
      } else {
        console.error('API error:', response.data.message);
        toast({
          title: 'Error',
          description: response.data.message || 'Failed to update client. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error updating client:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update client. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state if client data is still being fetched
  if (isLoadingClient) {
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

        <Card>
          <CardHeader>
            <div className="animate-pulse">
              <div className="h-5 w-32 bg-primary/20 rounded mb-2"></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-10 bg-gray-200 rounded w-full"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error if client not found
  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold mb-2">Client Not Found</h2>
        <p className="text-muted-foreground mb-6">The client you're trying to edit doesn't exist or you don't have permission to edit it.</p>
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
      <div className="flex items-center gap-2 mb-6">
        <Button variant="outline" size="icon" asChild className="h-9 w-9">
          <Link href={`/dashboard/clients/${clientId || ''}`}>
            <ArrowLeft size={16} />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit Client</h1>
          <p className="text-muted-foreground">
            {client.user?.firstName} {client.user?.lastName} ({client.user?.email})
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
          <CardDescription>
            Update the client's information. All fields are optional except for Project Type and Status.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              {/* Project Type */}
              <FormField
                control={form.control}
                name="projectType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="web_development">Web Development</SelectItem>
                        <SelectItem value="mobile_app">Mobile App</SelectItem>
                        <SelectItem value="design">Design</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Project Type Other (conditional) */}
              {form.watch('projectType') === 'other' && (
                <FormField
                  control={form.control}
                  name="projectTypeOther"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Other Project Type</FormLabel>
                      <FormControl>
                        <Input placeholder="Specify project type" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="onboarding">Onboarding</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Onboarding Progress */}
              <FormField
                control={form.control}
                name="onboardingProgress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Onboarding Progress (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Enter progress percentage"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter a value between 0 and 100 to indicate the client's onboarding progress.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Budget */}
              <FormField
                control={form.control}
                name="budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget (Optional)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Enter budget amount" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter the estimated budget for this project.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Timeline - Estimated Duration */}
              <FormField
                control={form.control}
                name="timeline.estimatedDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Duration (Optional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select estimated duration" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1-4_weeks">1-4 Weeks</SelectItem>
                        <SelectItem value="1-3_months">1-3 Months</SelectItem>
                        <SelectItem value="3-6_months">3-6 Months</SelectItem>
                        <SelectItem value="6+_months">6+ Months</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Timeline - Start Date */}
              <FormField
                control={form.control}
                name="timeline.startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Timeline - End Date */}
              <FormField
                control={form.control}
                name="timeline.endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter any additional notes about this client or project"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" asChild>
                <Link href={`/dashboard/clients/${clientId || ''}`}>Cancel</Link>
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                    Updating...
                  </div>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Update Client
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
