'use client';

import React from 'react';
import { Zap, Settings, MessageSquare, FileText, Calendar, ArrowRight } from 'lucide-react';
import useScrollAnimation from '@/hooks/useScrollAnimation';

interface Agent {
  id: string;
  name: string;
  title: string;
  description: string;
  capabilities: string[];
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const agents: Agent[] = [
  {
    id: 'gaia',
    name: 'Gaia',
    title: 'The Orchestrator',
    description: 'Your central AI coordinator that manages all specialized agents and ensures seamless project delivery across your entire organization.',
    capabilities: [
      'Multi-agent coordination',
      'Intelligent task routing',
      'Project oversight',
      'Resource optimization'
    ],
    icon: <Zap className="w-8 h-8" />,
    color: 'text-brown_sugar-600',
    bgColor: 'bg-brown_sugar-50'
  },
  {
    id: 'project_manager',
    name: 'Project Manager',
    title: 'The Strategist',
    description: 'Advanced project management with intelligent planning, task assignment, and team coordination. Your AI project manager that never sleeps.',
    capabilities: [
      'Automated project planning',
      'Smart task assignment',
      'Team workload balancing',
      'Progress tracking'
    ],
    icon: <Settings className="w-8 h-8" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    id: 'discovery',
    name: 'Discovery Agent',
    title: 'The Investigator',
    description: 'Handles client discovery, requirement gathering, and stakeholder interviews to ensure every project starts with crystal-clear objectives.',
    capabilities: [
      'Client requirement analysis',
      'Stakeholder interviews',
      'Scope definition',
      'Risk assessment'
    ],
    icon: <MessageSquare className="w-8 h-8" />,
    color: 'text-hunter_green-600',
    bgColor: 'bg-hunter_green-50'
  },
  {
    id: 'documentation',
    name: 'Documentation Agent',
    title: 'The Scribe',
    description: 'Generates comprehensive SRS documents, contracts, proposals, and technical documentation automatically from project requirements.',
    capabilities: [
      'SRS generation',
      'Contract drafting',
      'Proposal creation',
      'Technical documentation'
    ],
    icon: <FileText className="w-8 h-8" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  {
    id: 'jarvis',
    name: 'Jarvis',
    title: 'The Coordinator',
    description: 'Intelligent scheduling and calendar management that handles meeting coordination, availability checking, and business hours enforcement.',
    capabilities: [
      'Smart scheduling',
      'Calendar coordination',
      'Meeting optimization',
      'Availability management'
    ],
    icon: <Calendar className="w-8 h-8" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  }
];

const AgentsSection: React.FC = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation({ threshold: 0.2 });
  const { ref: ctaRef, isVisible: ctaVisible } = useScrollAnimation();

  return (
    <section id="agents" className="py-20 bg-gradient-to-br from-seasalt-50 to-brown_sugar-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div
          ref={headerRef}
          className={`text-center mb-16 transition-all duration-1000 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-rich_black-900 mb-4">
            Meet Your AI Team
          </h2>
          <p className="text-lg text-rich_black-600 max-w-3xl mx-auto">
            Five specialized AI agents working together to eliminate the manual coordination work
            that slows down your projects. Each agent is an expert in their domain,
            collaborating seamlessly to deliver exceptional results.
          </p>
        </div>

        {/* Agents Grid */}
        <div
          ref={gridRef}
          className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8"
        >
          {agents.map((agent, index) => (
            <div
              key={agent.id}
              className={`group relative bg-seasalt-50/60 backdrop-blur-sm border border-brown_sugar-200/30 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105 hover-lift ${
                index === 0 ? 'xl:col-span-3 xl:max-w-2xl xl:mx-auto' : ''
              } ${
                gridVisible
                  ? `opacity-100 translate-y-0 transition-delay-[${index * 100}ms]`
                  : 'opacity-0 translate-y-10'
              }`}
              style={{
                transitionDelay: gridVisible ? `${index * 100}ms` : '0ms',
                transitionDuration: '800ms'
              }}
            >
              {/* Agent Icon */}
              <div className={`inline-flex items-center justify-center w-16 h-16 ${agent.bgColor} rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <div className={agent.color}>
                  {agent.icon}
                </div>
              </div>

              {/* Agent Info */}
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-rich_black-900 mb-2">
                  {agent.name}
                </h3>
                <p className={`text-sm font-semibold ${agent.color} mb-4`}>
                  {agent.title}
                </p>
                <p className="text-rich_black-600 leading-relaxed">
                  {agent.description}
                </p>
              </div>

              {/* Capabilities */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-rich_black-800 uppercase tracking-wide">
                  Key Capabilities
                </h4>
                <ul className="space-y-2">
                  {agent.capabilities.map((capability, capIndex) => (
                    <li key={capIndex} className="flex items-center text-sm text-rich_black-600">
                      <div className={`w-2 h-2 ${agent.bgColor} rounded-full mr-3 flex-shrink-0`} />
                      {capability}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Hover Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-brown_sugar-500/5 to-hunter_green-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div
          ref={ctaRef}
          className={`text-center mt-16 transition-all duration-1000 ${
            ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="bg-seasalt-50/60 backdrop-blur-sm border border-brown_sugar-200/30 rounded-3xl p-8 shadow-lg hover-lift">
            <h3 className="text-2xl font-bold text-rich_black-900 mb-4">
              Ready to Transform Your Project Management?
            </h3>
            <p className="text-rich_black-600 mb-6 max-w-2xl mx-auto">
              These AI agents work together 24/7 to ensure your projects run smoothly,
              your team stays coordinated, and your clients remain happy.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#waitlist"
                className="inline-flex items-center px-8 py-4 bg-brown_sugar-500 hover:bg-brown_sugar-600 text-seasalt-50 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover-glow"
              >
                Get Early Access
                <ArrowRight className="ml-2 w-5 h-5" />
              </a>
              <a
                href="#features"
                className="inline-flex items-center px-8 py-4 border-2 border-brown_sugar-300 text-brown_sugar-700 hover:bg-brown_sugar-50 font-semibold rounded-xl backdrop-blur-sm bg-seasalt-50/60 transition-all duration-300 hover-lift"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AgentsSection;
