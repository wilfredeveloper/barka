'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Zap, Users, Calendar } from 'lucide-react';

const HeroSection: React.FC = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-rich_black-900 via-rich_black-800 to-chocolate_cosmos-900" />

      {/* Glassmorphism Background Elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-brown_sugar-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-hunter_green-500/15 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brown_sugar-400/10 rounded-full blur-3xl" />

      {/* Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          {/* Logo and Brand */}
          <div className="flex justify-center mb-8">
            <div className="relative animate-scale-in">
              <div className="absolute inset-0 bg-brown_sugar-400/20 rounded-full blur-xl scale-110 animate-glow" />
              <div className="relative w-24 h-24 lg:w-32 lg:h-32 bg-rich_black-800/80 backdrop-blur-sm rounded-full border border-brown_sugar-500/30 shadow-2xl flex items-center justify-center hover-lift">
                <Image
                  src="/barka-logo.svg"
                  alt="Barka Platform"
                  width={60}
                  height={60}
                  className="lg:w-20 lg:h-20"
                  priority
                />
              </div>
            </div>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-seasalt-50 mb-6 font-supply leading-tight animate-fade-in-up">
            Project Management,{' '}
            <span className="relative">
              <span className="text-brown_sugar-400">Minus the hustle</span>
              <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-brown_sugar-400 to-brown_sugar-500 rounded-full animate-scale-in" />
            </span>
          </h1>

          {/* Tagline */}
          <div className="flex items-center justify-center mb-8">
            <div className="bg-rich_black-800/60 backdrop-blur-sm border border-brown_sugar-500/30 rounded-full px-6 py-3 shadow-lg">
              <p className="text-lg lg:text-xl text-seasalt-200 font-medium flex items-center">
                <Sparkles className="w-5 h-5 text-brown_sugar-400 mr-2" />
                AI junior chief of staff for software agencies
              </p>
            </div>
          </div>

          {/* Description */}
          <p className="text-lg lg:text-xl text-seasalt-300 mb-12 max-w-4xl mx-auto leading-relaxed">
            We leverage AI agents as the operating system to reduce your manual coordination work.
            Get the visibility you need to adjust, stay on track, and communicate with all parties involved—
            <span className="font-semibold text-brown_sugar-400"> without the micromanagement</span>.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <a href="#waitlist">
              <Button
                size="lg"
                className="bg-brown_sugar-500 hover:bg-brown_sugar-600 text-seasalt-50 px-8 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
              >
                Join the Waitlist
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </a>
            <Link href="/auth/login">
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-brown_sugar-400 text-brown_sugar-400 hover:bg-brown_sugar-500/20 px-8 py-4 text-lg font-semibold backdrop-blur-sm bg-rich_black-800/60"
              >
                Sign In
              </Button>
            </Link>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                icon: <Zap className="w-6 h-6 text-brown_sugar-500" />,
                title: 'AI-Powered Automation',
                description: 'Let our agents handle planning, execution, and communication'
              },
              {
                icon: <Users className="w-6 h-6 text-hunter_green-500" />,
                title: 'Built for Agencies',
                description: 'Designed specifically for software development companies'
              },
              {
                icon: <Calendar className="w-6 h-6 text-brown_sugar-500" />,
                title: 'Smart Coordination',
                description: 'Automated scheduling and project coordination'
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-rich_black-800/40 backdrop-blur-sm border border-brown_sugar-500/20 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover-lift animate-fade-in-up"
                style={{
                  animationDelay: `${(index + 3) * 200}ms`,
                  animationFillMode: 'both'
                }}
              >
                <div className="flex items-center justify-center w-12 h-12 bg-brown_sugar-500/20 rounded-full mb-4 mx-auto" style={{ animationDelay: `${index * 500}ms` }}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-seasalt-100 mb-2">
                  {feature.title}
                </h3>
                <p className="text-seasalt-300 text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-brown_sugar-400 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-brown_sugar-400 rounded-full mt-2 animate-pulse" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
