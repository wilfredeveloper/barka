export interface SlideData {
  id: string;
  title: string;
  subtitle?: string;
  content: SlideContent;
  type: 'title' | 'content' | 'table' | 'interactive' | 'cta';
}

export interface SlideContent {
  heading?: string;
  subheading?: string;
  text?: string;
  bullets?: string[];
  table?: TableData;
  interactive?: InteractiveContent;
  cta?: CTAContent;
}

export interface TableData {
  headers?: string[];
  rows: Array<{
    [key: string]: string | number;
  }>;
}

export interface InteractiveContent {
  buttons: Array<{
    id: string;
    label: string;
    action: string;
  }>;
  outputContainer: boolean;
}

export interface CTAContent {
  mainText: string;
  benefits: string[];
  contact: {
    email: string;
    buttonText: string;
  };
}

export const pitchDeckSlides: SlideData[] = [
  {
    id: 'slide-1',
    title: 'Barka Platform',
    subtitle: 'Project Management, Minus the Hustle',
    type: 'title',
    content: {
      text: 'AI-Powered Project Management for Software Development Companies'
    }
  },
  {
    id: 'slide-2',
    title: 'The Problem',
    subtitle: 'What Software Agencies Face Daily',
    type: 'content',
    content: {
      bullets: [
        '70% of projects fail to deliver what was promised.',
        '53% of software projects exceed their budget (by an average of 189%).',
        'PMs spend 80% of their time on rework due to unclear requirements or changes.',
        'Poor communication costs US businesses an estimated $1.2 trillion annually.',
        '91% of project managers report project management issues in their organizations.',
        'Lack of effective collaboration technology affects 54% of PM professionals.'
      ],
      text: 'Result: Your PMs are bogged down in coordination, not focused on strategy.'
    }
  },
  {
    id: 'slide-3',
    title: 'Our Solution',
    subtitle: 'AI Junior Chief of Staff',
    type: 'content',
    content: {
      heading: "We're Not Another Asana or ClickUp",
      text: 'Traditional PM tools make you work harder. Barka makes your projects work smarter with AI agents.',
      subheading: 'Key Difference: AI agents as the operating system, not features bolted on top'
    }
  },
  {
    id: 'slide-4',
    title: 'Meet Your AI Team',
    subtitle: '5 Specialized AI Agents Working 24/7',
    type: 'table',
    content: {
      table: {
        headers: ['Agent', 'Role & Focus'],
        rows: [
          { agent: 'Gaia', role: 'The Orchestrator: Multi-agent coordination & project oversight' },
          { agent: 'Project Manager', role: 'The Strategist: Task planning & resource optimization' },
          { agent: 'Communication Agent', role: 'The Connector: Client updates & team coordination' },
          { agent: 'Documentation Agent', role: 'The Recorder: Meeting notes & project documentation' },
          { agent: 'Jarvis', role: 'The Coordinator: Smart scheduling & calendar management' }
        ]
      }
    }
  },
  {
    id: 'slide-5',
    title: 'Core Features',
    subtitle: 'AI-Powered Automation',
    type: 'interactive',
    content: {
      bullets: [
        'AI-First Approach: Let agents handle planning, execution, and communication',
        'Built for Agencies: Designed specifically for software development companies',
        'Smart Coordination: Automated scheduling and project coordination'
      ],
      interactive: {
        buttons: [
          { id: 'generate-tasks', label: '✨ Generate Project Tasks', action: 'generateTasks' },
          { id: 'summarize-notes', label: '✨ Summarize Meeting Notes', action: 'summarizeNotes' }
        ],
        outputContainer: true
      }
    }
  },
  {
    id: 'slide-6',
    title: 'Why Software Agencies Choose Barka',
    type: 'content',
    content: {
      bullets: [
        'Built for Software Agencies: Designed specifically for software development companies who need sophisticated project coordination without the overhead.',
        'AI-First Approach: Unlike traditional PM tools, we use AI agents as the operating system, not just features bolted on top of legacy systems.',
        'Reduce Manual Work: Eliminate 80% of manual coordination tasks. Let your PMs focus on strategy while AI handles operational details.',
        'Scale Without Chaos: Handle more projects and clients without proportionally increasing management overhead or team stress.'
      ]
    }
  },
  {
    id: 'slide-7',
    title: 'Impact & Results',
    subtitle: 'Measurable Outcomes',
    type: 'table',
    content: {
      table: {
        rows: [
          { metric: '80%', description: 'Reduction in manual coordination tasks.' },
          { metric: '25%', description: 'Increase in team productivity through effective communication.' },
          { metric: '28x', description: 'Less money wasted by organizations using proven PM practices.' },
          { metric: '5', description: 'Specialized AI agents working for you.' },
          { metric: '24/7', description: 'Continuous project monitoring.' }
        ]
      },
      text: 'Transform your agency operations with intelligent automation'
    }
  },
  {
    id: 'slide-8',
    title: 'Target Market',
    subtitle: 'Perfect for Software Development Companies',
    type: 'content',
    content: {
      bullets: [
        'Agencies managing multiple client projects',
        'Development teams struggling with coordination overhead',
        'Growing companies that need to scale without chaos',
        'Project managers who want to focus on strategy, not admin'
      ]
    }
  },
  {
    id: 'slide-9',
    title: 'The Vision',
    subtitle: 'Project Management, Minus the Hustle',
    type: 'content',
    content: {
      heading: 'Before vs After Barka',
      bullets: [
        'Before: Manual coordination consuming your day, Constant firefighting and status updates, PMs buried in administrative tasks',
        'After: AI handles routine coordination automatically, PMs focus on strategic planning and client relationships, Projects run smoothly with minimal manual intervention'
      ]
    }
  },
  {
    id: 'slide-10',
    title: 'Call to Action',
    subtitle: 'Be the First to Experience the Future',
    type: 'cta',
    content: {
      cta: {
        mainText: '🚀 Join Our Exclusive Waitlist',
        benefits: [
          'First to experience the platform',
          'Influence product development',
          'Special launch pricing',
          'Direct access to our team'
        ],
        contact: {
          email: 'hello@barka.ai',
          buttonText: 'Join Waitlist Now!'
        }
      },
      text: 'Transform how your agency manages projects with AI-powered automation.'
    }
  }
];
