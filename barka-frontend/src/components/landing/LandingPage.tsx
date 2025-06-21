'use client';

import React from 'react';
import LandingNavbar from './LandingNavbar';
import HeroSection from './HeroSection';
import WaitlistSection from './WaitlistSection';
import AgentsFullPageSection from './AgentsFullPageSection';
import PlatformMessaging from './PlatformMessaging';
import Footer from './Footer';
import FloatingWaitlistButton from './FloatingWaitlistButton';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rich_black-900 via-rich_black-800 to-chocolate_cosmos-900">
      {/* Navigation */}
      <LandingNavbar />
      
      {/* Hero Section */}
      <HeroSection />
      
      {/* Waitlist Section */}
      <WaitlistSection />
      
      {/* Platform Messaging */}
      <PlatformMessaging />
      
      {/* AI Agents Showcase */}
      <AgentsFullPageSection />
      
      {/* Footer */}
      <Footer />

      {/* Floating Waitlist Button */}
      <FloatingWaitlistButton />
    </div>
  );
};

export default LandingPage;
