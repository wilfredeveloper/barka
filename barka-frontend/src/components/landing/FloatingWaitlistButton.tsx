'use client';

import React, { useState, useEffect } from 'react';
import { ArrowUp, Mail } from 'lucide-react';

const FloatingWaitlistButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Show button when user scrolls down 300px
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToWaitlist = () => {
    const waitlistSection = document.getElementById('waitlist');
    if (waitlistSection) {
      waitlistSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={scrollToWaitlist}
        className="group bg-brown_sugar-500 hover:bg-brown_sugar-600 text-seasalt-50 p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110"
        aria-label="Join Waitlist"
      >
        <div className="flex items-center space-x-2">
          <Mail className="w-6 h-6" />
          <span className="hidden group-hover:block text-sm font-semibold whitespace-nowrap">
            Join Waitlist
          </span>
        </div>
        
        {/* Pulse animation */}
        <div className="absolute inset-0 rounded-full bg-brown_sugar-400 animate-ping opacity-20" />
      </button>
    </div>
  );
};

export default FloatingWaitlistButton;
