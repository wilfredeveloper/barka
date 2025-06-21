'use client';

import React from 'react';
import {
  Target,
  Zap,
  Users,
  TrendingUp,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight
} from 'lucide-react';
import useScrollAnimation from '@/hooks/useScrollAnimation';

const PlatformMessaging: React.FC = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: comparisonRef, isVisible: comparisonVisible } = useScrollAnimation();
  const { ref: benefitsRef, isVisible: benefitsVisible } = useScrollAnimation();
  const { ref: visionRef, isVisible: visionVisible } = useScrollAnimation();

  const problems = [
    'Endless status meetings and check-ins',
    'Manual task assignment and tracking',
    'Constant context switching between tools',
    'Micromanaging team members',
    'Missing project deadlines',
    'Poor client communication'
  ];

  const solutions = [
    'AI agents provide real-time updates',
    'Intelligent automated task distribution',
    'Single platform for all project needs',
    'Autonomous team coordination',
    'Predictive timeline management',
    'Automated client communication'
  ];

  const benefits = [
    {
      icon: <Target className="w-8 h-8 text-brown_sugar-600" />,
      title: 'Built for Software Agencies',
      description: 'Designed specifically for software development companies and agencies who need sophisticated project coordination without the overhead.'
    },
    {
      icon: <Zap className="w-8 h-8 text-hunter_green-600" />,
      title: 'AI-First Approach',
      description: 'Unlike traditional PM tools, we use AI agents as the operating system, not just features bolted on top of legacy systems.'
    },
    {
      icon: <Users className="w-8 h-8 text-blue-600" />,
      title: 'Reduce Manual Work',
      description: 'Eliminate 80% of manual coordination tasks. Let your PMs focus on strategy while AI handles the operational details.'
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-purple-600" />,
      title: 'Scale Without Chaos',
      description: 'Handle more projects and clients without proportionally increasing your management overhead or team stress.'
    }
  ];

  return (
    <section id="features" className="py-20 bg-gradient-to-br from-chocolate_cosmos-900 to-rich_black-900 text-seasalt-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Value Proposition */}
        <div
          ref={headerRef}
          className={`text-center mb-20 transition-all duration-1000 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">
            We're Not Another{' '}
            <span className="text-brown_sugar-400">Asana or ClickUp</span>
          </h2>
          <p className="text-xl lg:text-2xl text-seasalt-200 max-w-4xl mx-auto leading-relaxed">
            Traditional project management tools make you work harder.
            Barka makes your projects work smarter with AI agents that act as your
            <span className="text-brown_sugar-400 font-semibold"> junior chief of staff</span>.
          </p>
        </div>

        {/* Problem vs Solution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
          {/* Problems */}
          <div className="bg-chocolate_cosmos-800/20 backdrop-blur-sm border border-chocolate_cosmos-400/30 rounded-3xl p-8">
            <div className="flex items-center mb-6">
              <XCircle className="w-8 h-8 text-chocolate_cosmos-400 mr-3" />
              <h3 className="text-2xl font-bold text-seasalt-50">
                Traditional PM Tools Force You To:
              </h3>
            </div>
            <ul className="space-y-4">
              {problems.map((problem, index) => (
                <li key={index} className="flex items-start">
                  <div className="w-2 h-2 bg-chocolate_cosmos-400 rounded-full mt-3 mr-4 flex-shrink-0" />
                  <span className="text-seasalt-200">{problem}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Solutions */}
          <div className="bg-hunter_green-800/20 backdrop-blur-sm border border-hunter_green-400/30 rounded-3xl p-8">
            <div className="flex items-center mb-6">
              <CheckCircle className="w-8 h-8 text-hunter_green-400 mr-3" />
              <h3 className="text-2xl font-bold text-seasalt-50">
                Barka AI Agents Handle:
              </h3>
            </div>
            <ul className="space-y-4">
              {solutions.map((solution, index) => (
                <li key={index} className="flex items-start">
                  <div className="w-2 h-2 bg-hunter_green-400 rounded-full mt-3 mr-4 flex-shrink-0" />
                  <span className="text-seasalt-200">{solution}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Key Benefits */}
        <div className="mb-20">
          <h3 className="text-3xl font-bold text-center mb-12">
            Why Software Agencies Choose Barka
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="bg-rich_black-800/20 backdrop-blur-sm border border-brown_sugar-500/20 rounded-3xl p-8 hover:bg-rich_black-700/30 transition-all duration-300"
              >
                <div className="flex items-center mb-4">
                  <div className="bg-brown_sugar-500/20 rounded-2xl p-3 mr-4">
                    {benefit.icon}
                  </div>
                  <h4 className="text-xl font-bold text-seasalt-50">
                    {benefit.title}
                  </h4>
                </div>
                <p className="text-seasalt-200 leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* The Vision */}
        <div className="bg-gradient-to-r from-brown_sugar-600/20 to-hunter_green-600/20 backdrop-blur-sm border border-brown_sugar-500/30 rounded-3xl p-12 text-center">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-3xl lg:text-4xl font-bold mb-6">
              Project Management Should Be About{' '}
              <span className="text-brown_sugar-400">Vision</span>, Not{' '}
              <span className="text-chocolate_cosmos-400">Micromanagement</span>
            </h3>
            <p className="text-lg lg:text-xl text-seasalt-200 mb-8 leading-relaxed">
              A project manager should be able to define what's being done, who's doing it, 
              and how far along they are in the process. They should have enough visibility 
              to adjust course, stay on track, and communicate with all parties involved—
              <span className="text-brown_sugar-400 font-semibold"> minus the hustle</span>.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#waitlist"
                className="inline-flex items-center px-8 py-4 bg-brown_sugar-500 hover:bg-brown_sugar-600 text-seasalt-50 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                Join the Revolution
                <ArrowRight className="ml-2 w-5 h-5" />
              </a>
              <div className="flex items-center text-seasalt-300">
                <Clock className="w-5 h-5 mr-2" />
                <span>Early access launching soon</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {[
            { number: '80%', label: 'Reduction in manual coordination' },
            { number: '5', label: 'Specialized AI agents working for you' },
            { number: '24/7', label: 'Continuous project monitoring' }
          ].map((stat, index) => (
            <div key={index} className="bg-rich_black-800/20 backdrop-blur-sm border border-brown_sugar-500/20 rounded-2xl p-6">
              <div className="text-4xl font-bold text-brown_sugar-400 mb-2">
                {stat.number}
              </div>
              <div className="text-seasalt-200">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PlatformMessaging;
