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
import { ClientFormValues, ProjectType, ClientStatus, ApiResponse } from '@/types';

// Define the form schema
const clientFormSchema = z.object({
  firstName: z.string().min(1, { message: 'First name is required' }).default(''),
  lastName: z.string().min(1, { message: 'Last name is required' }),
  email: z.string().email({ message: 'Invalid email address' }),
  projectType: z.string().min(1, { message: 'Project type is required' }) as z.ZodType<ProjectType>,
  projectTypeOther: z.string().optional().nullable(),
  budget: z.coerce.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.string().default('onboarding') as z.ZodType<ClientStatus>,
});

export default function NewClientPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize form with default values
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      projectType: '',
      projectTypeOther: null,
      budget: null,
      status: 'onboarding',
      notes: null,
    },
  });

  // Get the current user
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/auth/login');
      return;
    }
    setUser(currentUser);
  }, [router]);

  // Handle form submission
  const onSubmit = async (data: ClientFormValues) => {
    try {
      setIsLoading(true);

      // First, create a new user with client role
      const userResponse = await api.post<ApiResponse<any>>('/users', {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        role: 'org_client',
        // The backend will generate a random password and send an email
      });

      if (!userResponse.data.success) {
        throw new Error(userResponse.data.message || 'Failed to create user');
      }

      // Now create the client with the new user ID
      const clientData = {
        userId: userResponse.data.data._id,
        projectType: data.projectType,
        projectTypeOther: data.projectTypeOther === '' ? null : data.projectTypeOther,
        budget: data.budget,
        notes: data.notes,
        status: data.status,
      };

      const clientResponse = await api.post<ApiResponse<any>>('/clients', clientData);

      if (clientResponse.data.success) {
        toast({
          title: 'Success',
          description: 'Client created successfully',
        });

        // Redirect to the new client's page
        router.push(`/dashboard/clients/${clientResponse.data.data._id}`);
      } else {
        console.error('API error:', clientResponse.data.message);
        toast({
          title: 'Error',
          description: clientResponse.data.message || 'Failed to create client. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error creating client:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create client. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state if the current user is still being fetched
  if (!user) {
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

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Button variant="outline" size="icon" asChild className="h-9 w-9">
          <Link href="/dashboard/clients">
            <ArrowLeft size={16} />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Add New Client</h1>
          <p className="text-muted-foreground">Create a new client and user account</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Client</CardTitle>
          <CardDescription>
            Create a new client by entering their details below. This will create a new user account and send an invitation email.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              {/* First Name */}
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter first name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Last Name */}
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter last name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter email address" {...field} />
                    </FormControl>
                    <FormDescription>
                      The client will receive an invitation email at this address.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                <Link href="/dashboard/clients">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                    Creating...
                  </div>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Create Client
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
