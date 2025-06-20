/**
 * Todo Generator Utility
 * 
 * This utility generates default todos for clients based on their project type
 * and other parameters. These todos guide the Barka agent in collecting
 * information during the onboarding process.
 */

const Todo = require('../models/Todo');
const logger = require('./logger');

/**
 * Generate default todos for a client
 * @param {string} clientId - The client ID
 * @param {string} organizationId - The organization ID
 * @param {string} projectType - The project type
 * @param {Object} options - Additional options
 * @returns {Promise<Array>} - Array of created todos
 */
async function generateDefaultTodos(clientId, organizationId, projectType, options = {}) {
  try {
    logger.info(`Generating default todos for client ${clientId} with project type ${projectType}`);
    
    // Get the appropriate todo template based on project type
    const todoTemplate = getTodoTemplateByProjectType(projectType);
    
    // Create todos in the database
    const todos = [];
    
    for (const todoData of todoTemplate) {
      const todo = await Todo.create({
        client: clientId,
        organization: organizationId,
        title: todoData.title,
        description: todoData.description,
        priority: todoData.priority || 'medium',
        weight: todoData.weight || 1,
        phase: todoData.phase || 'initial',
        orderInPhase: todoData.orderInPhase || 0,
        status: 'pending'
      });
      
      todos.push(todo);
    }
    
    logger.info(`Created ${todos.length} todos for client ${clientId}`);
    return todos;
  } catch (error) {
    logger.error(`Error generating todos: ${error.message}`, error);
    throw error;
  }
}

/**
 * Get todo template based on project type
 * @param {string} projectType - The project type
 * @returns {Array} - Array of todo templates
 */
function getTodoTemplateByProjectType(projectType) {
  switch (projectType) {
    case 'web_development':
      return getWebDevelopmentTodos();
    case 'mobile_app':
      return getMobileAppTodos();
    case 'design':
      return getDesignTodos();
    case 'marketing':
      return getMarketingTodos();
    default:
      return getGenericTodos();
  }
}

/**
 * Get todos for web development projects
 * @returns {Array} - Array of todo templates
 */
function getWebDevelopmentTodos() {
  return [
    // Initial Phase
    {
      title: 'Collect basic project information',
      description: 'Gather general information about the web project including purpose, target audience, and main goals.',
      priority: 'high',
      weight: 3,
      phase: 'initial',
      orderInPhase: 0
    },
    {
      title: 'Identify key stakeholders',
      description: 'Identify the main decision makers and stakeholders for the project.',
      priority: 'medium',
      weight: 2,
      phase: 'initial',
      orderInPhase: 1
    },
    
    // Requirements Phase
    {
      title: 'Define website functionality requirements',
      description: 'Collect detailed information about required features and functionality (e.g., user accounts, e-commerce, forms, etc.).',
      priority: 'critical',
      weight: 5,
      phase: 'requirements',
      orderInPhase: 0
    },
    {
      title: 'Identify content requirements',
      description: 'Determine what content will be needed (text, images, videos) and who will provide it.',
      priority: 'high',
      weight: 3,
      phase: 'requirements',
      orderInPhase: 1
    },
    {
      title: 'Define technical requirements',
      description: 'Gather information about technical requirements like hosting, domain, SSL, third-party integrations, etc.',
      priority: 'high',
      weight: 4,
      phase: 'requirements',
      orderInPhase: 2
    },
    
    // Design Phase
    {
      title: 'Collect design preferences',
      description: 'Gather information about design preferences, including color schemes, style references, and brand guidelines.',
      priority: 'high',
      weight: 4,
      phase: 'design',
      orderInPhase: 0
    },
    {
      title: 'Identify competitor websites',
      description: 'Collect information about competitor websites, including what the client likes and dislikes about them.',
      priority: 'medium',
      weight: 2,
      phase: 'design',
      orderInPhase: 1
    },
    
    // Technical Phase
    {
      title: 'Define technology stack',
      description: 'Determine the preferred technology stack, CMS, frameworks, or any specific technical requirements.',
      priority: 'high',
      weight: 4,
      phase: 'technical',
      orderInPhase: 0
    },
    {
      title: 'Identify integration requirements',
      description: 'Gather information about required third-party integrations (payment gateways, CRM, marketing tools, etc.).',
      priority: 'medium',
      weight: 3,
      phase: 'technical',
      orderInPhase: 1
    },
    
    // Financial Phase
    {
      title: 'Establish budget constraints',
      description: 'Determine the project budget and any financial constraints that might impact development.',
      priority: 'high',
      weight: 3,
      phase: 'financial',
      orderInPhase: 0
    },
    {
      title: 'Define payment milestones',
      description: 'Establish payment schedule and milestones for the project.',
      priority: 'medium',
      weight: 2,
      phase: 'financial',
      orderInPhase: 1
    },
    
    // Final Phase
    {
      title: 'Confirm project timeline',
      description: 'Finalize the project timeline, including key milestones and delivery dates.',
      priority: 'high',
      weight: 3,
      phase: 'final',
      orderInPhase: 0
    },
    {
      title: 'Review and confirm all requirements',
      description: 'Review all collected information and confirm that all requirements are accurately captured.',
      priority: 'critical',
      weight: 5,
      phase: 'final',
      orderInPhase: 1
    }
  ];
}

/**
 * Get todos for mobile app projects
 * @returns {Array} - Array of todo templates
 */
function getMobileAppTodos() {
  return [
    // Initial Phase
    {
      title: 'Collect basic app information',
      description: 'Gather general information about the mobile app including purpose, target audience, and main goals.',
      priority: 'high',
      weight: 3,
      phase: 'initial',
      orderInPhase: 0
    },
    {
      title: 'Identify target platforms',
      description: 'Determine which platforms the app will target (iOS, Android, or both) and any specific device requirements.',
      priority: 'high',
      weight: 4,
      phase: 'initial',
      orderInPhase: 1
    },
    
    // Requirements Phase
    {
      title: 'Define app functionality requirements',
      description: 'Collect detailed information about required features and functionality of the mobile app.',
      priority: 'critical',
      weight: 5,
      phase: 'requirements',
      orderInPhase: 0
    },
    {
      title: 'Identify user flows',
      description: 'Map out the main user flows and journeys through the app.',
      priority: 'high',
      weight: 4,
      phase: 'requirements',
      orderInPhase: 1
    },
    {
      title: 'Define offline capabilities',
      description: 'Determine what functionality should be available offline and how data synchronization should work.',
      priority: 'medium',
      weight: 3,
      phase: 'requirements',
      orderInPhase: 2
    },
    
    // Design Phase
    {
      title: 'Collect UI/UX preferences',
      description: 'Gather information about design preferences, including UI style, navigation patterns, and reference apps.',
      priority: 'high',
      weight: 4,
      phase: 'design',
      orderInPhase: 0
    },
    {
      title: 'Define brand integration requirements',
      description: 'Determine how the brand should be integrated into the app design.',
      priority: 'medium',
      weight: 3,
      phase: 'design',
      orderInPhase: 1
    },
    
    // Technical Phase
    {
      title: 'Define technology approach',
      description: 'Determine whether to use native, hybrid, or cross-platform development approach.',
      priority: 'critical',
      weight: 5,
      phase: 'technical',
      orderInPhase: 0
    },
    {
      title: 'Identify backend requirements',
      description: 'Gather information about backend services, APIs, and data storage requirements.',
      priority: 'high',
      weight: 4,
      phase: 'technical',
      orderInPhase: 1
    },
    {
      title: 'Define device feature requirements',
      description: 'Identify which device features the app will use (camera, GPS, notifications, etc.).',
      priority: 'high',
      weight: 3,
      phase: 'technical',
      orderInPhase: 2
    },
    
    // Financial Phase
    {
      title: 'Establish budget constraints',
      description: 'Determine the project budget and any financial constraints that might impact development.',
      priority: 'high',
      weight: 3,
      phase: 'financial',
      orderInPhase: 0
    },
    {
      title: 'Define app monetization strategy',
      description: 'Determine how the app will be monetized (paid app, in-app purchases, subscriptions, ads, etc.).',
      priority: 'medium',
      weight: 3,
      phase: 'financial',
      orderInPhase: 1
    },
    
    // Final Phase
    {
      title: 'Confirm project timeline',
      description: 'Finalize the project timeline, including key milestones and delivery dates.',
      priority: 'high',
      weight: 3,
      phase: 'final',
      orderInPhase: 0
    },
    {
      title: 'Define app store submission strategy',
      description: 'Plan for app store submission, including required assets and approval process.',
      priority: 'medium',
      weight: 3,
      phase: 'final',
      orderInPhase: 1
    },
    {
      title: 'Review and confirm all requirements',
      description: 'Review all collected information and confirm that all requirements are accurately captured.',
      priority: 'critical',
      weight: 5,
      phase: 'final',
      orderInPhase: 2
    }
  ];
}

/**
 * Get todos for design projects
 * @returns {Array} - Array of todo templates
 */
function getDesignTodos() {
  // Implementation similar to above functions
  return getGenericTodos(); // Placeholder
}

/**
 * Get todos for marketing projects
 * @returns {Array} - Array of todo templates
 */
function getMarketingTodos() {
  // Implementation similar to above functions
  return getGenericTodos(); // Placeholder
}

/**
 * Get generic todos for any project type
 * @returns {Array} - Array of todo templates
 */
function getGenericTodos() {
  return [
    // Initial Phase
    {
      title: 'Collect basic project information',
      description: 'Gather general information about the project including purpose, target audience, and main goals.',
      priority: 'high',
      weight: 3,
      phase: 'initial',
      orderInPhase: 0
    },
    {
      title: 'Identify key stakeholders',
      description: 'Identify the main decision makers and stakeholders for the project.',
      priority: 'medium',
      weight: 2,
      phase: 'initial',
      orderInPhase: 1
    },
    
    // Requirements Phase
    {
      title: 'Define project requirements',
      description: 'Collect detailed information about required deliverables and functionality.',
      priority: 'critical',
      weight: 5,
      phase: 'requirements',
      orderInPhase: 0
    },
    {
      title: 'Identify success criteria',
      description: 'Determine how the success of the project will be measured.',
      priority: 'high',
      weight: 3,
      phase: 'requirements',
      orderInPhase: 1
    },
    
    // Financial Phase
    {
      title: 'Establish budget constraints',
      description: 'Determine the project budget and any financial constraints.',
      priority: 'high',
      weight: 3,
      phase: 'financial',
      orderInPhase: 0
    },
    
    // Final Phase
    {
      title: 'Confirm project timeline',
      description: 'Finalize the project timeline, including key milestones and delivery dates.',
      priority: 'high',
      weight: 3,
      phase: 'final',
      orderInPhase: 0
    },
    {
      title: 'Review and confirm all requirements',
      description: 'Review all collected information and confirm that all requirements are accurately captured.',
      priority: 'critical',
      weight: 5,
      phase: 'final',
      orderInPhase: 1
    }
  ];
}

module.exports = {
  generateDefaultTodos
};
