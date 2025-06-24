'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();

  // Redirect to the new secure registration page
  useEffect(() => {
    router.replace('/auth/register-organization');
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold">Redirecting...</h1>
          <p className="text-gray-400 mt-2">
            Taking you to the secure registration page
          </p>
        </div>
      </div>
    </div>
  );
}
