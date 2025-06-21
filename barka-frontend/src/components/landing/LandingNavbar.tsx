'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

const LandingNavbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: 'Features', href: '#features' },
    { name: 'AI Agents', href: '#agents' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'About', href: '#about' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? 'bg-rich_black-900/95 backdrop-blur-xl border-b border-brown_sugar-500/10 shadow-2xl'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-18 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative w-8 h-8 lg:w-10 lg:h-10 transition-transform duration-300 group-hover:scale-110">
              <Image
                src="/barka-logo.svg"
                alt="Barka Platform"
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className="text-lg lg:text-xl font-bold text-seasalt-50 font-supply tracking-tight">
              Barka
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="px-4 py-2 text-seasalt-300 hover:text-brown_sugar-400 hover:bg-brown_sugar-500/10 rounded-lg transition-all duration-200 font-medium text-sm"
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            <Link href="/auth/login">
              <Button
                variant="ghost"
                size="sm"
                className="text-seasalt-300 hover:text-brown_sugar-400 hover:bg-brown_sugar-500/10 px-4 py-2 h-9"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button
                size="sm"
                className="bg-brown_sugar-500 hover:bg-brown_sugar-600 text-seasalt-50 shadow-lg hover:shadow-xl transition-all duration-200 px-4 py-2 h-9 rounded-lg"
              >
                Get Started
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-brown_sugar-500/10 transition-all duration-200"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 text-seasalt-300" />
            ) : (
              <Menu className="w-5 h-5 text-seasalt-300" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-rich_black-900/98 backdrop-blur-xl border-b border-brown_sugar-500/10 shadow-2xl">
            <div className="px-6 py-8 space-y-6">
              <div className="space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="block text-seasalt-300 hover:text-brown_sugar-400 hover:bg-brown_sugar-500/10 transition-all duration-200 font-medium py-3 px-4 rounded-lg"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
              <div className="pt-4 space-y-3 border-t border-brown_sugar-500/20">
                <Link href="/auth/login" className="block">
                  <Button
                    variant="ghost"
                    className="w-full text-seasalt-300 hover:text-brown_sugar-400 hover:bg-brown_sugar-500/10 h-11"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup" className="block">
                  <Button
                    className="w-full bg-brown_sugar-500 hover:bg-brown_sugar-600 text-seasalt-50 shadow-lg h-11"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default LandingNavbar;
