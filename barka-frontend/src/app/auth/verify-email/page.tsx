'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import api from '@/lib/api';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'resending'>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const emailParam = searchParams.get('email');

    if (!token || !emailParam) {
      setStatus('error');
      setMessage('Invalid verification link. Please check your email for the correct link.');
      return;
    }

    setEmail(emailParam);
    verifyEmail(token, emailParam);
  }, [searchParams]);

  const verifyEmail = async (token: string, email: string) => {
    try {
      const response = await api.post('/auth/verify-email', { token, email });

      if (response.data.success) {
        setStatus('success');
        setMessage('Email verified successfully! Your account is now active.');
        
        // Store the auth data
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(response.data.message || 'Verification failed');
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Verification failed. Please try again.');
    }
  };

  const resendVerification = async () => {
    if (!email) return;

    setStatus('resending');
    try {
      const response = await api.post('/auth/resend-verification', { email });

      if (response.data.success) {
        setMessage('Verification email sent! Please check your inbox.');
      } else {
        setStatus('error');
        setMessage(response.data.message || 'Failed to resend verification email');
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Failed to resend verification email');
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full"></div>
        );
      case 'success':
        return (
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'resending':
        return (
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        );
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'loading':
        return 'Verifying Your Email...';
      case 'success':
        return 'Email Verified!';
      case 'error':
        return 'Verification Failed';
      case 'resending':
        return 'Sending Email...';
    }
  };

  const getDescription = () => {
    switch (status) {
      case 'loading':
        return 'Please wait while we verify your email address';
      case 'success':
        return 'Your account is now active. Redirecting to dashboard...';
      case 'error':
        return 'There was a problem verifying your email';
      case 'resending':
        return 'Sending a new verification email to your inbox';
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Card className="bg-black border-gray-800">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
              {getIcon()}
            </div>
            <CardTitle className="text-white">{getTitle()}</CardTitle>
            <CardDescription className="text-gray-400">
              {getDescription()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-gray-300">
              <p className="mb-4">{message}</p>
              
              {status === 'success' && (
                <div className="bg-green-500/10 text-green-500 p-3 rounded-md text-sm">
                  <p className="font-medium">Welcome to Barka!</p>
                  <p>You'll be redirected to your dashboard shortly.</p>
                </div>
              )}

              {status === 'error' && email && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-400">
                    Need a new verification link?
                  </p>
                  <Button 
                    onClick={resendVerification}
                    variant="outline"
                    className="border-gray-800 text-white hover:bg-gray-800"
                    disabled={status === 'resending'}
                  >
                    {status === 'resending' ? 'Sending...' : 'Resend Verification Email'}
                  </Button>
                </div>
              )}
            </div>
            
            <div className="pt-4 border-t border-gray-800 space-y-2">
              {status === 'success' ? (
                <Button 
                  onClick={() => router.push('/dashboard')}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  Go to Dashboard
                </Button>
              ) : (
                <Link href="/auth/login">
                  <Button variant="outline" className="w-full border-gray-800 text-white hover:bg-gray-800">
                    Back to Login
                  </Button>
                </Link>
              )}
              
              <div className="text-center">
                <Link href="/auth/register-organization" className="text-sm text-gray-400 hover:text-green-500">
                  Need to create a new account?
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
