'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import api from '@/lib/api';

const organizationSchema = z.object({
  organizationName: z.string().min(1, 'Organization name is required'),
  organizationType: z.string().min(1, 'Organization type is required'),
  otherType: z.string().optional(),
  teamSize: z.string().min(1, 'Team size is required'),
  departments: z.array(z.string()).optional(),
  clientsPerMonth: z.string().min(1, 'Clients per month is required'),
  onboardingChallenges: z.array(z.string()).optional(),
});

type OrganizationFormValues = z.infer<typeof organizationSchema>;

export default function OrganizationOnboardingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      organizationName: '',
      organizationType: '',
      otherType: '',
      teamSize: '',
      departments: [],
      clientsPerMonth: '',
      onboardingChallenges: [],
    },
  });

  const onSubmit = async (data: OrganizationFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post('/organizations/onboarding', data);

      if (response.data.success) {
        // Update localStorage with new user data if provided
        if (response.data.updatedUser) {
          localStorage.setItem('user', JSON.stringify(response.data.updatedUser));
        }
        
        // Update token if provided
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
        }

        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        setError(response.data.message || 'Failed to create organization');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create organization. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Complete Your Setup</h1>
          <p className="text-sm text-gray-400 mt-2">
            Create your organization to get started
          </p>
        </div>

        <Card className="bg-black border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Organization Details</CardTitle>
            <CardDescription className="text-gray-400">
              Tell us about your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {error && (
                  <div className="bg-red-500/10 text-red-500 p-3 rounded-md text-sm">
                    {error}
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="organizationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Organization Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Your organization name"
                          {...field}
                          className="bg-black border-gray-800 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="organizationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Organization Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-black border-gray-800 text-white">
                            <SelectValue placeholder="Select organization type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="design_agency">Design Agency</SelectItem>
                          <SelectItem value="development_agency">Development Agency</SelectItem>
                          <SelectItem value="marketing_agency">Marketing Agency</SelectItem>
                          <SelectItem value="consulting">Consulting</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch('organizationType') === 'other' && (
                  <FormField
                    control={form.control}
                    name="otherType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Specify Type</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Describe your organization type"
                            {...field}
                            className="bg-black border-gray-800 text-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="teamSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Team Size</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-black border-gray-800 text-white">
                            <SelectValue placeholder="Select team size" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1-5">1-5 people</SelectItem>
                          <SelectItem value="6-10">6-10 people</SelectItem>
                          <SelectItem value="11-25">11-25 people</SelectItem>
                          <SelectItem value="26-50">26-50 people</SelectItem>
                          <SelectItem value="50+">50+ people</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientsPerMonth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Clients Per Month</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-black border-gray-800 text-white">
                            <SelectValue placeholder="Select clients per month" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1-5">1-5 clients</SelectItem>
                          <SelectItem value="6-10">6-10 clients</SelectItem>
                          <SelectItem value="11-20">11-20 clients</SelectItem>
                          <SelectItem value="21-50">21-50 clients</SelectItem>
                          <SelectItem value="50+">50+ clients</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating Organization...' : 'Complete Setup'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
