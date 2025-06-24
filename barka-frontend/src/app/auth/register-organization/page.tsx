'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import api from '@/lib/api';

const registerOrganizationSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  organizationName: z.string().min(1, 'Organization name is required'),
  organizationType: z.string().min(1, 'Organization type is required'),
  teamSize: z.string().min(1, 'Team size is required'),
  clientsPerMonth: z.string().min(1, 'Clients per month is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterOrganizationFormValues = z.infer<typeof registerOrganizationSchema>;

export default function RegisterOrganizationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<RegisterOrganizationFormValues>({
    resolver: zodResolver(registerOrganizationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      organizationName: '',
      organizationType: '',
      teamSize: '',
      clientsPerMonth: '',
    },
  });

  const onSubmit = async (data: RegisterOrganizationFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const { confirmPassword, ...submitData } = data;
      const response = await api.post('/auth/register-with-organization', submitData);

      if (response.data.success) {
        setSuccess(true);
        // Don't redirect immediately, show success message first
      } else {
        setError(response.data.message || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <Card className="bg-black border-gray-800">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <CardTitle className="text-white">Check Your Email!</CardTitle>
              <CardDescription className="text-gray-400">
                We've sent a verification link to your email address
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center text-gray-300">
                <p className="mb-4">
                  Please check your email and click the verification link to activate your account and access your dashboard.
                </p>
                <p className="text-sm text-gray-400">
                  Didn't receive the email? Check your spam folder or{' '}
                  <button 
                    onClick={() => setSuccess(false)}
                    className="text-green-500 hover:underline"
                  >
                    try again
                  </button>
                </p>
              </div>
              
              <div className="pt-4 border-t border-gray-800">
                <Link href="/auth/login">
                  <Button variant="outline" className="w-full border-gray-800 text-white hover:bg-gray-800">
                    Back to Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Create Your Organization</h1>
          <p className="text-sm text-gray-400 mt-2">
            Set up your account and organization in one step
          </p>
        </div>

        <Card className="bg-black border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Get Started</CardTitle>
            <CardDescription className="text-gray-400">
              Create your admin account and organization
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">First Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="John"
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
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Last Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Doe"
                            {...field}
                            className="bg-black border-gray-800 text-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="john@company.com"
                          {...field}
                          className="bg-black border-gray-800 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
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
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Confirm Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...field}
                            className="bg-black border-gray-800 text-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="border-t border-gray-800 pt-4">
                  <h3 className="text-white font-medium mb-4">Organization Details</h3>
                  
                  <FormField
                    control={form.control}
                    name="organizationName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Organization Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Your Company Name"
                            {...field}
                            className="bg-black border-gray-800 text-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <FormField
                      control={form.control}
                      name="organizationType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-black border-gray-800 text-white">
                                <SelectValue placeholder="Select type" />
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

                    <FormField
                      control={form.control}
                      name="teamSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Team Size</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-black border-gray-800 text-white">
                                <SelectValue placeholder="Select size" />
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
                  </div>

                  <FormField
                    control={form.control}
                    name="clientsPerMonth"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel className="text-white">Clients Per Month</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-black border-gray-800 text-white">
                              <SelectValue placeholder="Select range" />
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
                </div>

                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating Account...' : 'Create Account & Organization'}
                </Button>

                <div className="text-center text-sm text-gray-400">
                  Already have an account?{' '}
                  <Link href="/auth/login" className="text-green-500 hover:underline">
                    Sign in
                  </Link>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
