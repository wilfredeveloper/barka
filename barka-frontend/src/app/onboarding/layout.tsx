import React from 'react';
import Image from 'next/image';

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black dotted-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center mb-8">
          <Image 
            src="/barka-logo.png" 
            alt="Barka" 
            width={140} 
            height={50} 
            priority
            className="Barka-logo"
          />
        </div>
        {children}
      </div>
    </div>
  );
}
