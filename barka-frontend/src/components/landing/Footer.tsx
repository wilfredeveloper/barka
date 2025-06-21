'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Twitter, Linkedin, Github } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gradient-to-br from-rich_black-900 to-chocolate_cosmos-900 text-seasalt-50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Section */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center space-x-3 mb-6">
              <div className="relative w-10 h-10">
                <Image
                  src="/barka-logo.svg"
                  alt="Barka Platform"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-2xl font-bold font-supply">Barka</span>
            </Link>
            <p className="text-seasalt-300 mb-6 max-w-md leading-relaxed">
              AI-powered project management for software development companies and agencies. 
              Project management, minus the hustle.
            </p>
            <div className="flex space-x-4">
              <a
                href="mailto:hello@barka.ai"
                className="w-10 h-10 bg-brown_sugar-500/20 hover:bg-brown_sugar-500/30 rounded-lg flex items-center justify-center transition-colors"
              >
                <Mail className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-brown_sugar-500/20 hover:bg-brown_sugar-500/30 rounded-lg flex items-center justify-center transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-brown_sugar-500/20 hover:bg-brown_sugar-500/30 rounded-lg flex items-center justify-center transition-colors"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-brown_sugar-500/20 hover:bg-brown_sugar-500/30 rounded-lg flex items-center justify-center transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Product</h3>
            <ul className="space-y-3">
              <li>
                <a href="#features" className="text-seasalt-300 hover:text-brown_sugar-400 transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#agents" className="text-seasalt-300 hover:text-brown_sugar-400 transition-colors">
                  AI Agents
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-seasalt-300 hover:text-brown_sugar-400 transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#waitlist" className="text-seasalt-300 hover:text-brown_sugar-400 transition-colors">
                  Early Access
                </a>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Company</h3>
            <ul className="space-y-3">
              <li>
                <a href="#about" className="text-seasalt-300 hover:text-brown_sugar-400 transition-colors">
                  About
                </a>
              </li>
              <li>
                <Link href="/auth/login" className="text-seasalt-300 hover:text-brown_sugar-400 transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/auth/signup" className="text-seasalt-300 hover:text-brown_sugar-400 transition-colors">
                  Sign Up
                </Link>
              </li>
              <li>
                <a href="#" className="text-seasalt-300 hover:text-brown_sugar-400 transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-seasalt-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-seasalt-400 text-sm">
            © 2024 Barka Platform. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-seasalt-400 hover:text-brown_sugar-400 text-sm transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-seasalt-400 hover:text-brown_sugar-400 text-sm transition-colors">
              Terms of Service
            </a>
            <a href="#" className="text-seasalt-400 hover:text-brown_sugar-400 text-sm transition-colors">
              Cookie Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
