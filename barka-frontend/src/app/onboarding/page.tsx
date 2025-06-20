'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { FluidStepper } from '@/components/ui/fluid-stepper';
import { MouseGradient } from '@/components/ui/mouse-gradient';
import { BackgroundEffects } from '@/components/ui/background-effects';
import { isAuthenticated, getCurrentUser } from '@/lib/auth';
import api from '@/lib/api';

// Define the schema for each step
const organizationSchema = z.object({
  organizationName: z.string().min(2, { message: 'Organization name must be at least 2 characters' }),
  organizationType: z.enum(['design_agency', 'software_agency', 'marketing_agency', 'other'], {
    required_error: 'Please select an organization type',
  }),
  otherType: z.string().optional(),
});

const teamSchema = z.object({
  teamSize: z.enum(['1-5', '6-20', '21-50', '51-100', '100+'], {
    required_error: 'Please select a team size',
  }),
  departments: z.array(z.string()).min(1, { message: 'Please select at least one department' }),
  customDepartments: z.string().optional(),
});

const clientsSchema = z.object({
  clientsPerMonth: z.enum(['1-5', '6-10', '11-20', '20+'], {
    required_error: 'Please select the number of clients',
  }),
  onboardingChallenges: z.array(z.string()).min(1, { message: 'Please select at least one challenge' }),
  otherChallenges: z.string().optional(),
});

// Define the types
type OrganizationFormValues = z.infer<typeof organizationSchema>;
type TeamFormValues = z.infer<typeof teamSchema>;
type ClientsFormValues = z.infer<typeof clientsSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [progress, setProgress] = useState(25);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    organizationName: '',
    organizationType: '',
    otherType: '',
    teamSize: '',
    departments: [] as string[],
    customDepartments: '',
    clientsPerMonth: '',
    onboardingChallenges: [] as string[],
    otherChallenges: '',
  });

  // Check if user is authenticated
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/auth/login');
    }
  }, [router]);

  // Organization form
  const organizationForm = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      organizationName: formData.organizationName,
      organizationType: formData.organizationType as any,
      otherType: formData.otherType,
    },
  });

  // Team form
  const teamForm = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      teamSize: formData.teamSize as any,
      departments: formData.departments,
      customDepartments: formData.customDepartments,
    },
  });

  // Clients form
  const clientsForm = useForm<ClientsFormValues>({
    resolver: zodResolver(clientsSchema),
    defaultValues: {
      clientsPerMonth: formData.clientsPerMonth as any,
      onboardingChallenges: formData.onboardingChallenges,
      otherChallenges: formData.otherChallenges,
    },
  });

  const handleOrganizationSubmit = (data: OrganizationFormValues) => {
    setFormData({ ...formData, ...data });
    setStep(2);
    setProgress(50);
  };

  const handleTeamSubmit = (data: TeamFormValues) => {
    setFormData({ ...formData, ...data });
    setStep(3);
    setProgress(75);
  };

  const handleClientsSubmit = async (data: ClientsFormValues) => {
    setIsLoading(true);
    setError(null);

    const completeFormData = {
      ...formData,
      ...data,
    };

    try {
      // Update progress to show submission is in progress
      setProgress(90);

      // Save organization data to the backend using the onboarding endpoint
      await api.post('/organizations/onboarding', completeFormData);

      // Update progress to 100% and show success state
      setProgress(100);
      setIsSuccess(true);

      // Redirect to subscription page after a short delay
      setTimeout(() => {
        router.push('/onboarding/subscription');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save organization data. Please try again.');
      setProgress(75);
      setIsLoading(false);
    }
    // Note: We don't set isLoading to false on success because we want to keep the loading state until redirect
  };

  const goBack = () => {
    if (step === 2) {
      setStep(1);
      setProgress(25);
    } else if (step === 3) {
      setStep(2);
      setProgress(50);
    }
  };

  return (
    <div className="relative min-h-screen mt-[5rem]">
      {/* Background effects */}
      <BackgroundEffects />

      {/* Mouse following gradient */}
      <MouseGradient />

      <div className="max-w-2xl mx-auto pt-10 px-4 relative z-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Set up your organization</h1>
          <p className="text-gray-600">Let's get your organization set up with Barka</p>
        </div>

        <FluidStepper
          steps={['Organization', 'Team', 'Clients', 'Subscription']}
          currentStep={step}
          isSubmitting={isLoading && step === 3}
        />

      <Card className="backdrop-blur-md border-[#FF7A4D] p-6 bg-transparent">
        <CardContent className="pt-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="organization"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Form {...organizationForm}>
                  <form onSubmit={organizationForm.handleSubmit(handleOrganizationSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <FormField
                        control={organizationForm.control}
                        name="organizationName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Organization Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter your organization name"
                                {...field}
                                className="bg-black border-gray-800 text-white"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={organizationForm.control}
                        name="organizationType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Organization Type</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="bg-black border-gray-800 text-white">
                                  <SelectValue placeholder="Select organization type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-black border-gray-800 text-white">
                                <SelectItem value="design_agency">Design Agency</SelectItem>
                                <SelectItem value="software_agency">Software Agency</SelectItem>
                                <SelectItem value="marketing_agency">Marketing Agency</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {organizationForm.watch('organizationType') === 'other' && (
                        <FormField
                          control={organizationForm.control}
                          name="otherType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Please specify</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter your organization type"
                                  {...field}
                                  className="bg-black border-gray-800 text-white"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        className="bg-[#FF5C28] hover:bg-[#FF7A4D] text-white"
                      >
                        Next
                      </Button>
                    </div>
                  </form>
                </Form>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="team"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Form {...teamForm}>
                  <form onSubmit={teamForm.handleSubmit(handleTeamSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <FormField
                        control={teamForm.control}
                        name="teamSize"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Team Size</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="bg-black border-gray-800 text-white">
                                  <SelectValue placeholder="Select team size" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-black border-gray-800 text-white">
                                <SelectItem value="1-5">1-5 employees</SelectItem>
                                <SelectItem value="6-20">6-20 employees</SelectItem>
                                <SelectItem value="21-50">21-50 employees</SelectItem>
                                <SelectItem value="51-100">51-100 employees</SelectItem>
                                <SelectItem value="100+">100+ employees</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={teamForm.control}
                        name="departments"
                        render={() => (
                          <FormItem>
                            <div className="mb-4">
                              <FormLabel className="text-white">Departments</FormLabel>
                              <FormDescription className="text-gray-400">
                                Select all departments in your organization
                              </FormDescription>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              {['Design', 'Development', 'Marketing', 'Sales', 'Customer Support', 'HR', 'Finance', 'Operations'].map((department) => (
                                <FormField
                                  key={department}
                                  control={teamForm.control}
                                  name="departments"
                                  render={({ field }) => {
                                    return (
                                      <FormItem
                                        key={department}
                                        className="flex flex-row items-start space-x-3 space-y-0"
                                      >
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(department)}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...field.value, department])
                                                : field.onChange(
                                                    field.value?.filter(
                                                      (value) => value !== department
                                                    )
                                                  )
                                            }}
                                          />
                                        </FormControl>
                                        <FormLabel className="text-white font-normal">
                                          {department}
                                        </FormLabel>
                                      </FormItem>
                                    )
                                  }}
                                />
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={teamForm.control}
                        name="customDepartments"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Other Departments</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Enter any other departments (comma separated)"
                                {...field}
                                className="bg-black border-gray-800 text-white"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={goBack}
                        className="border-gray-800 text-white"
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        className="bg-[#FF5C28] hover:bg-[#FF7A4D] text-white"
                      >
                        Next
                      </Button>
                    </div>
                  </form>
                </Form>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="clients"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Form {...clientsForm}>
                  <form onSubmit={clientsForm.handleSubmit(handleClientsSubmit)} className="space-y-6">
                    {/* Success message */}
                    {isSuccess && (
                      <div className="bg-[#FF5C28]/20 border border-[#FF5C28]/30 text-[#FF5C28] p-4 rounded-md mb-6 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="font-medium">Organization created successfully!</p>
                          <p className="text-sm">Redirecting to subscription options...</p>
                        </div>
                      </div>
                    )}

                    {/* Error message */}
                    {error && (
                      <div className="bg-red-500/10 text-red-500 p-3 rounded-md text-sm flex items-start">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span>{error}</span>
                      </div>
                    )}

                    <div className="space-y-4">
                      <FormField
                        control={clientsForm.control}
                        name="clientsPerMonth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">New Clients Per Month</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="bg-black border-gray-800 text-white">
                                  <SelectValue placeholder="Select number of clients" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-black border-gray-800 text-white">
                                <SelectItem value="1-5">1-5 clients</SelectItem>
                                <SelectItem value="6-10">6-10 clients</SelectItem>
                                <SelectItem value="11-20">11-20 clients</SelectItem>
                                <SelectItem value="20+">20+ clients</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={clientsForm.control}
                        name="onboardingChallenges"
                        render={() => (
                          <FormItem>
                            <div className="mb-4">
                              <FormLabel className="text-white">Onboarding Challenges</FormLabel>
                              <FormDescription className="text-gray-400">
                                What challenges do you face when onboarding new clients?
                              </FormDescription>
                            </div>
                            <div className="space-y-2">
                              {[
                                'Time-consuming process',
                                'Inconsistent information collection',
                                'Difficulty tracking progress',
                                'Poor client communication',
                                'Manual data entry',
                                'Lack of standardization',
                                'Client delays in providing information'
                              ].map((challenge) => (
                                <FormField
                                  key={challenge}
                                  control={clientsForm.control}
                                  name="onboardingChallenges"
                                  render={({ field }) => {
                                    return (
                                      <FormItem
                                        key={challenge}
                                        className="flex flex-row items-start space-x-3 space-y-0"
                                      >
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(challenge)}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...field.value, challenge])
                                                : field.onChange(
                                                    field.value?.filter(
                                                      (value) => value !== challenge
                                                    )
                                                  )
                                            }}
                                          />
                                        </FormControl>
                                        <FormLabel className="text-white font-normal">
                                          {challenge}
                                        </FormLabel>
                                      </FormItem>
                                    )
                                  }}
                                />
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={clientsForm.control}
                        name="otherChallenges"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Other Challenges</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe any other onboarding challenges"
                                {...field}
                                className="bg-black border-gray-800 text-white"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={goBack}
                        className="border-gray-800 text-white"
                        disabled={isLoading || isSuccess}
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        className="bg-[#FF5C28] hover:bg-[#FF7A4D] text-white min-w-[150px]"
                        disabled={isLoading || isSuccess}
                      >
                        {isLoading ? (
                          <div className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Processing...</span>
                          </div>
                        ) : 'Complete Setup'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
