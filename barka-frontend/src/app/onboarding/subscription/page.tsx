'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MouseGradient } from '@/components/ui/mouse-gradient';
import { BackgroundEffects } from '@/components/ui/background-effects';
import { isAuthenticated } from '@/lib/auth';
import api from '@/lib/api';

const pricingPlans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    description: 'Perfect for small agencies just getting started',
    features: [
      'Up to 5 team members',
      'Up to 10 clients',
      'Basic client onboarding templates',
      'Email notifications',
      'Standard support',
    ],
    limitations: [
      'No custom branding',
      'No API access',
      'Limited integrations',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 99,
    description: 'Ideal for growing agencies with more clients',
    features: [
      'Up to 20 team members',
      'Up to 50 clients',
      'Advanced onboarding templates',
      'Email & SMS notifications',
      'Priority support',
      'Custom branding',
      'Basic API access',
      'Popular integrations',
    ],
    limitations: [
      'Limited analytics',
    ],
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 249,
    description: 'For established agencies with complex needs',
    features: [
      'Unlimited team members',
      'Unlimited clients',
      'Custom onboarding workflows',
      'Advanced notifications',
      'Dedicated support',
      'Custom branding',
      'Full API access',
      'All integrations',
      'Advanced analytics',
      'White-label option',
    ],
    limitations: [],
  },
];

export default function SubscriptionPage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is authenticated
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/auth/login');
    }
  }, [router]);

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) return;

    setIsLoading(true);
    setError(null);

    try {
      // Call the subscription API endpoint
      await api.post('/subscriptions', { planId: selectedPlan });

      // Show success state
      setIsSuccess(true);

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: any) {
      console.error('Subscription error:', err);
      setError(err.response?.data?.message || 'Failed to create subscription. Please try again.');
      setIsLoading(false);
    }
    // Note: We don't set isLoading to false on success to maintain the loading state until redirect
  };

  const handleSkip = () => {
    router.push('/dashboard');
  };

  return (
    <div className="relative min-h-screen dotted-background">
      {/* Background effects */}
      <BackgroundEffects />

      {/* Mouse following gradient */}
      <MouseGradient />

      <div className="max-w-5xl mx-auto pt-10 px-4 relative z-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-black mb-2">Choose Your Plan</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Select the plan that best fits your agency's needs. All plans include a 14-day free trial.
          </p>
        </div>

      {/* Success message */}
      {isSuccess && (
        <div className="bg-[#FF5C28]/20 border border-[#FF5C28]/30 text-[#FF5C28] p-4 rounded-md mb-6 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-medium">Subscription successful!</p>
            <p className="text-sm">Redirecting you to the dashboard...</p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-400 p-4 rounded-md mb-6 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-medium">Subscription failed</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {pricingPlans.map((plan) => (
          <motion.div
            key={plan.id}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Card
              className={`bg-black border-gray-800 h-full flex flex-col ${
                selectedPlan === plan.id ? 'ring-2 ring-[#FF5C28]' : ''
              } ${plan.popular ? 'border-[#FF5C28]' : ''}`}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-white">{plan.name}</CardTitle>
                    <CardDescription className="text-gray-400">{plan.description}</CardDescription>
                  </div>
                  {plan.popular && (
                    <Badge className="bg-[#FF5C28] text-white">Popular</Badge>
                  )}
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-white">${plan.price}</span>
                  <span className="text-gray-400 ml-1">/month</span>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-white mb-2">Features</h4>
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <Check className="h-5 w-5 text-[#FF5C28] mr-2 shrink-0" />
                          <span className="text-gray-300 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {plan.limitations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-white mb-2">Limitations</h4>
                      <ul className="space-y-2">
                        {plan.limitations.map((limitation, index) => (
                          <li key={index} className="flex items-start">
                            <X className="h-5 w-5 text-red-500 mr-2 shrink-0" />
                            <span className="text-gray-300 text-sm">{limitation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className={`w-full ${
                    selectedPlan === plan.id
                      ? 'bg-[#FF5C28] hover:bg-[#FF7A4D] text-white'
                      : 'bg-gray-800 hover:bg-gray-700 text-white'
                  }`}
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  {selectedPlan === plan.id ? 'Selected' : 'Select Plan'}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          className="border-gray-800 text-white"
          onClick={handleSkip}
          disabled={isLoading || isSuccess}
        >
          Skip for now
        </Button>

        <Button
          className="bg-green-500 hover:bg-green-600 text-white min-w-[200px]"
          disabled={!selectedPlan || isLoading || isSuccess}
          onClick={handleSubscribe}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Processing...</span>
            </div>
          ) : 'Start 14-day Free Trial'}
        </Button>
      </div>
      </div>
    </div>
  );
}
