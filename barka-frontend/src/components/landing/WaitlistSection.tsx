'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, Mail, User, Building, Briefcase, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface WaitlistFormData {
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  role: string;
}

const WaitlistSection: React.FC = () => {
  const [formData, setFormData] = useState<WaitlistFormData>({
    email: '',
    firstName: '',
    lastName: '',
    company: '',
    role: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<number | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post('/waitlist', {
        ...formData,
        source: 'landing_page',
      });

      if (response.data.success) {
        setIsSuccess(true);
        setPosition(response.data.data.position);
        setFormData({
          email: '',
          firstName: '',
          lastName: '',
          company: '',
          role: '',
        });
      }
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <section id="waitlist" className="py-20 bg-gradient-to-br from-hunter_green-900 to-rich_black-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-rich_black-800/60 backdrop-blur-sm border border-hunter_green-500/30 rounded-3xl p-12 shadow-2xl">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-hunter_green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-hunter_green-600" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-seasalt-50 mb-4">
              Welcome to the Barka Family! 🎉
            </h2>
            <p className="text-lg text-seasalt-300 mb-6">
              You're successfully on our waitlist! We'll notify you as soon as we launch.
            </p>
            {position && (
              <div className="bg-hunter_green-50 border border-hunter_green-200 rounded-xl p-4 mb-6">
                <p className="text-hunter_green-800 font-semibold">
                  You're #{position} on our waitlist
                </p>
              </div>
            )}
            <Button
              onClick={() => setIsSuccess(false)}
              variant="outline"
              className="border-hunter_green-300 text-hunter_green-700 hover:bg-hunter_green-50"
            >
              Add Another Email
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="waitlist" className="py-20 bg-gradient-to-br from-brown_sugar-900 to-rich_black-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-seasalt-50 mb-4">
            Be the First to Experience the Future
          </h2>
          <p className="text-lg text-seasalt-300 max-w-2xl mx-auto">
            Join our exclusive waitlist and get early access to Barka Platform.
            Transform how your agency manages projects with AI-powered automation.
          </p>
        </div>

        <div className="bg-rich_black-800/60 backdrop-blur-sm border border-brown_sugar-500/30 rounded-3xl p-8 lg:p-12 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-brown_sugar-400" />
              </div>
              <Input
                type="email"
                name="email"
                placeholder="Enter your email address"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="pl-12 h-14 text-lg bg-rich_black-700/80 border-brown_sugar-500/50 focus:border-brown_sugar-400 focus:ring-brown_sugar-400/20 text-seasalt-100 placeholder:text-seasalt-400"
              />
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-brown_sugar-400" />
                </div>
                <Input
                  type="text"
                  name="firstName"
                  placeholder="First name"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="pl-12 h-14 text-lg bg-rich_black-700/80 border-brown_sugar-500/50 focus:border-brown_sugar-400 focus:ring-brown_sugar-400/20 text-seasalt-100 placeholder:text-seasalt-400"
                />
              </div>
              <div className="relative">
                <Input
                  type="text"
                  name="lastName"
                  placeholder="Last name"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="h-14 text-lg bg-rich_black-700/80 border-brown_sugar-500/50 focus:border-brown_sugar-400 focus:ring-brown_sugar-400/20 text-seasalt-100 placeholder:text-seasalt-400"
                />
              </div>
            </div>

            {/* Company and Role Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Building className="h-5 w-5 text-brown_sugar-400" />
                </div>
                <Input
                  type="text"
                  name="company"
                  placeholder="Company name"
                  value={formData.company}
                  onChange={handleInputChange}
                  className="pl-12 h-14 text-lg bg-rich_black-700/80 border-brown_sugar-500/50 focus:border-brown_sugar-400 focus:ring-brown_sugar-400/20 text-seasalt-100 placeholder:text-seasalt-400"
                />
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Briefcase className="h-5 w-5 text-brown_sugar-400" />
                </div>
                <Input
                  type="text"
                  name="role"
                  placeholder="Your role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="pl-12 h-14 text-lg bg-rich_black-700/80 border-brown_sugar-500/50 focus:border-brown_sugar-400 focus:ring-brown_sugar-400/20 text-seasalt-100 placeholder:text-seasalt-400"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-chocolate_cosmos-50 border border-chocolate_cosmos-200 rounded-xl p-4">
                <p className="text-chocolate_cosmos-800 text-center">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading || !formData.email}
              className="w-full h-14 text-lg font-semibold bg-brown_sugar-500 hover:bg-brown_sugar-600 text-seasalt-50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Joining Waitlist...
                </>
              ) : (
                'Join the Waitlist'
              )}
            </Button>

            <p className="text-sm text-seasalt-400 text-center">
              We'll never spam you. Unsubscribe at any time.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
};

export default WaitlistSection;
