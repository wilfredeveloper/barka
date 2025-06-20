'use client';

import React from 'react';

interface BrandedLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function BrandedLoader({ 
  message = "Loading your conversation...", 
  size = 'md',
  className = '' 
}: BrandedLoaderProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      {/* Barka Logo/Brand Element */}
      <div className="relative">
        {/* Outer rotating ring */}
        <div className={`${sizeClasses[size]} border-2 border-brown_sugar-200/20 border-t-brown_sugar-600 rounded-full animate-spin`}></div>
        
        {/* Inner pulsing dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 bg-brown_sugar-600 rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* Loading message */}
      <div className="text-center space-y-2">
        <p className={`${textSizeClasses[size]} font-medium text-seasalt-50`}>
          {message}
        </p>
        <div className="flex items-center justify-center space-x-1">
          <div className="w-1 h-1 bg-brown_sugar-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-1 h-1 bg-brown_sugar-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-1 h-1 bg-brown_sugar-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}

interface ChatLoadingScreenProps {
  clientName?: string;
  organizationName?: string;
}

export const ChatLoadingScreen = React.memo(({ clientName, organizationName }: ChatLoadingScreenProps) => {
  const messages = [
    "Connecting to your workspace...",
    "Loading your conversation history...",
    "Preparing your chat experience...",
    "Almost ready..."
  ];

  const [currentMessageIndex, setCurrentMessageIndex] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-white animate-in fade-in duration-300 z-10">
      {/* Brand Section */}
      <div className="mb-8 text-center">
        <div className="relative mb-6">
          {/* Main logo container */}
          <div className="w-20 h-20 mx-auto relative">
            {/* Outer rotating ring */}
            <div className="w-full h-full border-3 border-brown_sugar-200/20 border-t-brown_sugar-600 border-r-brown_sugar-500 rounded-full animate-spin"></div>
            
            {/* Inner brand element */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-gradient-to-br from-brown_sugar-600 to-brown_sugar-700 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">B</span>
              </div>
            </div>
          </div>
        </div>

        {/* Welcome text */}
        <h1 className="text-2xl font-semibold text-seasalt-50 mb-2">
          {clientName ? `Welcome back, ${clientName}` : 'Welcome to Barka'}
        </h1>
        {organizationName && (
          <p className="text-zinc-400 text-base">
            {organizationName}
          </p>
        )}
      </div>

      {/* Loading message with smooth transition */}
      <div className="text-center min-h-[3rem] flex items-center justify-center">
        <p className="text-brown_sugar-300 text-lg font-medium transition-opacity duration-500">
          {messages[currentMessageIndex]}
        </p>
      </div>

      {/* Progress indicator */}
      <div className="mt-6 w-48 h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-brown_sugar-600 to-brown_sugar-500 rounded-full animate-pulse"></div>
      </div>
    </div>
  );
});
ChatLoadingScreen.displayName = 'ChatLoadingScreen';

interface MessageLoadingIndicatorProps {
  className?: string;
}

export function MessageLoadingIndicator({ className = '' }: MessageLoadingIndicatorProps) {
  return (
    <div className={`flex items-center justify-center py-4 ${className}`}>
      <div className="flex items-center space-x-2 text-zinc-400">
        <div className="w-2 h-2 bg-brown_sugar-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-brown_sugar-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-brown_sugar-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        <span className="text-sm ml-2">Loading messages...</span>
      </div>
    </div>
  );
}
