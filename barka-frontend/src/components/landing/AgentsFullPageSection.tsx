'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Zap, Settings, MessageSquare, FileText, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  title: string;
  description: string;
  detailedDescription: string;
  capabilities: string[];
  features: string[];
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  gradient: string;
}

const agents: Agent[] = [
  {
    id: 'gaia',
    name: 'Gaia',
    title: 'The Orchestrator',
    description: 'Your central AI coordinator that manages all specialized agents and ensures seamless project delivery across your entire organization.',
    detailedDescription: 'Gaia serves as the central nervous system of your project management ecosystem. It intelligently routes tasks, coordinates between different agents, and maintains a holistic view of all your projects. Think of Gaia as your AI project director who never sleeps, constantly optimizing workflows and ensuring nothing falls through the cracks.',
    capabilities: [
      'Multi-agent coordination and task routing',
      'Intelligent project oversight and monitoring',
      'Resource optimization across teams',
      'Real-time decision making and prioritization',
      'Cross-project dependency management',
      'Automated escalation and conflict resolution'
    ],
    features: [
      '24/7 project monitoring',
      'Predictive analytics for project outcomes',
      'Automated resource allocation',
      'Smart notification system',
      'Integration with all other agents'
    ],
    icon: <Zap className="w-12 h-12" />,
    color: 'text-brown_sugar-400',
    bgColor: 'bg-brown_sugar-500/20',
    gradient: 'from-brown_sugar-500/20 to-brown_sugar-600/30'
  },
  {
    id: 'project_manager',
    name: 'Project Manager',
    title: 'The Strategist',
    description: 'Advanced project management with intelligent planning, task assignment, and team coordination. Your AI project manager that never sleeps.',
    detailedDescription: 'The Project Manager agent combines traditional project management methodologies with AI-powered insights. It creates detailed project plans, assigns tasks based on team member skills and availability, tracks progress in real-time, and automatically adjusts timelines when needed. This agent ensures your projects stay on track without micromanagement.',
    capabilities: [
      'Automated project planning and scheduling',
      'Smart task assignment based on skills and workload',
      'Real-time progress tracking and reporting',
      'Dynamic timeline adjustment and optimization',
      'Team workload balancing and capacity planning',
      'Risk assessment and mitigation strategies'
    ],
    features: [
      'Gantt chart generation',
      'Milestone tracking',
      'Budget monitoring',
      'Team performance analytics',
      'Client progress reports'
    ],
    icon: <Settings className="w-12 h-12" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    gradient: 'from-blue-500/20 to-blue-600/30'
  },
  {
    id: 'discovery',
    name: 'Discovery Agent',
    title: 'The Investigator',
    description: 'Handles client discovery, requirement gathering, and stakeholder interviews to ensure every project starts with crystal-clear objectives.',
    detailedDescription: 'The Discovery Agent specializes in the crucial early phases of project development. It conducts thorough stakeholder interviews, analyzes business requirements, identifies potential risks and opportunities, and creates comprehensive project briefs. This agent ensures that every project begins with a solid foundation of understanding.',
    capabilities: [
      'Automated stakeholder interview scheduling',
      'Intelligent requirement gathering and analysis',
      'Risk assessment and opportunity identification',
      'Scope definition and boundary setting',
      'Competitive analysis and market research',
      'Technical feasibility assessment'
    ],
    features: [
      'Interview question generation',
      'Requirement documentation',
      'Stakeholder mapping',
      'Risk matrix creation',
      'Project scope validation'
    ],
    icon: <MessageSquare className="w-12 h-12" />,
    color: 'text-hunter_green-400',
    bgColor: 'bg-hunter_green-500/20',
    gradient: 'from-hunter_green-500/20 to-hunter_green-600/30'
  },
  {
    id: 'documentation',
    name: 'Documentation Agent',
    title: 'The Scribe',
    description: 'Generates comprehensive SRS documents, contracts, proposals, and technical documentation automatically from project requirements.',
    detailedDescription: 'The Documentation Agent transforms project requirements and discussions into professional, comprehensive documents. It creates Software Requirements Specifications (SRS), project proposals, contracts, technical documentation, and user manuals. This agent ensures all project documentation is consistent, up-to-date, and professionally formatted.',
    capabilities: [
      'Automated SRS generation from requirements',
      'Contract and proposal creation',
      'Technical documentation writing',
      'User manual and guide generation',
      'Document version control and updates',
      'Multi-format document export (PDF, Word, etc.)'
    ],
    features: [
      'Template-based document generation',
      'Real-time collaboration',
      'Document approval workflows',
      'Version history tracking',
      'Custom branding integration'
    ],
    icon: <FileText className="w-12 h-12" />,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    gradient: 'from-purple-500/20 to-purple-600/30'
  },
  {
    id: 'jarvis',
    name: 'Jarvis',
    title: 'The Coordinator',
    description: 'Intelligent scheduling and calendar management that handles meeting coordination, availability checking, and business hours enforcement.',
    detailedDescription: 'Jarvis is your intelligent scheduling assistant that manages all calendar-related activities. It coordinates meetings across multiple time zones, checks team availability, schedules client calls, manages project deadlines, and ensures optimal time allocation. Jarvis integrates with popular calendar systems and learns from your scheduling preferences.',
    capabilities: [
      'Smart meeting scheduling across time zones',
      'Team availability checking and coordination',
      'Automated calendar conflict resolution',
      'Meeting preparation and agenda creation',
      'Follow-up scheduling and reminders',
      'Integration with popular calendar platforms'
    ],
    features: [
      'Multi-timezone support',
      'Recurring meeting management',
      'Meeting room booking',
      'Automated reminders',
      'Calendar analytics and insights'
    ],
    icon: <Calendar className="w-12 h-12" />,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    gradient: 'from-orange-500/20 to-orange-600/30'
  }
];

const AgentsFullPageSection: React.FC = () => {
  const [currentAgent, setCurrentAgent] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const lastScrollTime = useRef(0);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!sectionRef.current) return;
      
      const rect = sectionRef.current.getBoundingClientRect();
      const isInSection = rect.top <= 0 && rect.bottom >= window.innerHeight;
      
      if (!isInSection) return;
      
      e.preventDefault();
      
      const now = Date.now();
      if (now - lastScrollTime.current < 1000 || isScrolling) return;
      
      lastScrollTime.current = now;
      setIsScrolling(true);
      
      if (e.deltaY > 0 && currentAgent < agents.length - 1) {
        setCurrentAgent(prev => prev + 1);
      } else if (e.deltaY < 0 && currentAgent > 0) {
        setCurrentAgent(prev => prev - 1);
      }
      
      setTimeout(() => setIsScrolling(false), 1000);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [currentAgent, isScrolling]);

  const agent = agents[currentAgent];

  return (
    <section 
      ref={sectionRef}
      id="agents" 
      className="min-h-screen bg-gradient-to-br from-rich_black-900 to-chocolate_cosmos-900 relative overflow-hidden"
    >
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className={`absolute top-20 left-10 w-96 h-96 bg-gradient-to-r ${agent.gradient} rounded-full blur-3xl opacity-30 transition-all duration-1000`} />
        <div className={`absolute bottom-20 right-10 w-72 h-72 bg-gradient-to-l ${agent.gradient} rounded-full blur-3xl opacity-20 transition-all duration-1000`} />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Side - Agent Info */}
          <div className="space-y-8">
            <div className="text-center lg:text-left">
              <div className={`inline-flex items-center justify-center w-24 h-24 ${agent.bgColor} rounded-3xl mb-6 transition-all duration-500`}>
                <div className={agent.color}>
                  {agent.icon}
                </div>
              </div>
              
              <h2 className="text-4xl lg:text-5xl font-bold text-seasalt-50 mb-4">
                {agent.name}
              </h2>
              
              <p className={`text-xl font-semibold ${agent.color} mb-6`}>
                {agent.title}
              </p>
              
              <p className="text-lg text-seasalt-300 leading-relaxed mb-8">
                {agent.detailedDescription}
              </p>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-center lg:justify-start space-x-4">
              <button
                onClick={() => currentAgent > 0 && setCurrentAgent(prev => prev - 1)}
                disabled={currentAgent === 0}
                className="p-3 rounded-full bg-rich_black-800/60 backdrop-blur-sm border border-brown_sugar-500/30 text-seasalt-300 hover:text-brown_sugar-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                <ChevronUp className="w-6 h-6" />
              </button>
              
              <div className="flex space-x-2">
                {agents.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentAgent(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      index === currentAgent 
                        ? 'bg-brown_sugar-400 scale-125' 
                        : 'bg-seasalt-600 hover:bg-seasalt-400'
                    }`}
                  />
                ))}
              </div>
              
              <button
                onClick={() => currentAgent < agents.length - 1 && setCurrentAgent(prev => prev + 1)}
                disabled={currentAgent === agents.length - 1}
                className="p-3 rounded-full bg-rich_black-800/60 backdrop-blur-sm border border-brown_sugar-500/30 text-seasalt-300 hover:text-brown_sugar-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                <ChevronDown className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Right Side - Capabilities & Features */}
          <div className="space-y-8">
            <div className="bg-rich_black-800/40 backdrop-blur-sm border border-brown_sugar-500/20 rounded-3xl p-8">
              <h3 className="text-2xl font-bold text-seasalt-50 mb-6">Core Capabilities</h3>
              <ul className="space-y-4">
                {agent.capabilities.map((capability, index) => (
                  <li key={index} className="flex items-start">
                    <div className={`w-2 h-2 ${agent.bgColor} rounded-full mt-3 mr-4 flex-shrink-0`} />
                    <span className="text-seasalt-300">{capability}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-rich_black-800/40 backdrop-blur-sm border border-brown_sugar-500/20 rounded-3xl p-8">
              <h3 className="text-2xl font-bold text-seasalt-50 mb-6">Key Features</h3>
              <ul className="space-y-4">
                {agent.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <div className={`w-2 h-2 ${agent.bgColor} rounded-full mt-3 mr-4 flex-shrink-0`} />
                    <span className="text-seasalt-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="text-center">
          <p className="text-seasalt-400 text-sm mb-2">
            {currentAgent + 1} of {agents.length}
          </p>
          <p className="text-seasalt-500 text-xs">
            Scroll to explore agents
          </p>
        </div>
      </div>
    </section>
  );
};

export default AgentsFullPageSection;
