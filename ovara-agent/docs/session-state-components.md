# Session State Components and Their Roles

This document explains each component of the initial session state and how it's used throughout the system.

## Core Identifiers

### Required for MCP Tools
```json
{
  "client_id": "68520b45df9a17bd55e3d691",
  "organization_id": "68520b8adf9a17bd55e3d695", 
  "conversation_id": "6855290e93c63efe226ac12f",
  "user_id": "68520b45df9a17bd55e3d691"
}
```

**Purpose**: These IDs are essential for:
- MCP server tools to query the correct data scope
- Database operations (projects, tasks, team members)
- Access control and data isolation
- Conversation context tracking

**Usage**: Every MCP tool function uses these IDs to ensure users only see their organization's data.

## User Context

### Personal Information
```json
{
  "user_name": "Victor Wilfred",
  "user_full_name": "Victor Wilfred", 
  "user_role": "org_admin",
  "user_email": "wilfredeveloper@gmail.com"
}
```

**Purpose**: 
- Personalized agent responses ("Hello Victor")
- Role-based access control
- Email notifications and communications
- Audit trail for actions

**Usage**: Agents use this for personalization and permission checks.

## Project Management Context

### User Permissions
```json
{
  "project_management": {
    "user_permissions": {
      "can_create_projects": true,
      "can_delete_projects": true,
      "can_manage_team": true,
      "can_view_analytics": true,
      "can_edit_organization": true
    }
  }
}
```

**Purpose**: Fine-grained access control for project management features.

**Usage**: Project manager agent checks these before allowing operations.

### Default Settings
```json
{
  "project_management": {
    "active_project_id": null,
    "default_project_status": "planning",
    "default_task_status": "todo", 
    "default_priority": "medium"
  }
}
```

**Purpose**: Consistent defaults for new projects and tasks.

**Usage**: When creating new items, these defaults are applied.

### User Preferences
```json
{
  "project_management": {
    "preferences": {
      "default_view": "list",
      "items_per_page": 20,
      "show_completed_tasks": false,
      "notification_preferences": {
        "task_assignments": true,
        "project_updates": true,
        "deadline_reminders": true
      }
    }
  }
}
```

**Purpose**: Customize user experience and notification settings.

**Usage**: Frontend and agents respect these preferences for display and notifications.

## Agent Management

### Current Agent Tracking
```json
{
  "current_agent": "orchestrator_agent",
  "agent_history": []
}
```

**Purpose**: Track which agent is currently handling the conversation.

**Usage**: 
- Orchestrator agent uses this for handoff decisions
- System knows which agent to route messages to
- History provides context for agent transitions

## Feature-Specific States

### Onboarding State
```json
{
  "onboarding": {
    "status": "not_started",
    "phase": null,
    "current_todo": null,
    "progress": 0
  }
}
```

**Purpose**: Track client onboarding progress through the Barka agent.

**Usage**: Barka agent uses this to:
- Resume onboarding where it left off
- Track completion progress
- Provide contextual assistance

### Scheduling State
```json
{
  "scheduling": {
    "meetings": [],
    "availability": {},
    "preferences": {}
  }
}
```

**Purpose**: Maintain scheduling context for Jarvis agent.

**Usage**: Jarvis agent uses this to:
- Track scheduled meetings
- Remember availability preferences
- Provide scheduling assistance

## Session Metadata

### Tracking Information
```json
{
  "session_metadata": {
    "created_at": "2025-06-20T09:25:34.810821",
    "last_active": "2025-06-20T09:25:34.810836", 
    "frontend_conversation_id": "6855290e93c63efe226ac12f"
  }
}
```

**Purpose**: 
- Session lifecycle management
- Performance monitoring
- Debugging and troubleshooting
- Frontend-backend correlation

## State Evolution

### How State Changes Over Time

1. **Initial Creation**: Backend provides basic context
2. **Enhancement**: Ovara agent adds project management context and permissions
3. **Runtime Updates**: Agents update state as conversation progresses
4. **Persistence**: All changes are saved to session database

### Example State Evolution

**Initial (from backend)**:
```json
{
  "conversation_id": "123",
  "user_name": "John",
  "user_role": "org_admin"
}
```

**Enhanced (by ovara agent)**:
```json
{
  "conversation_id": "123",
  "user_name": "John", 
  "user_role": "org_admin",
  "project_management": { /* full context */ },
  "current_agent": "orchestrator_agent",
  "onboarding": { /* state */ }
}
```

**During conversation**:
```json
{
  "conversation_id": "123",
  "user_name": "John",
  "user_role": "org_admin", 
  "project_management": {
    "active_project_id": "456", // Updated during conversation
    /* other context */
  },
  "current_agent": "project_manager_agent", // Changed via handoff
  "agent_history": [
    {"agent": "orchestrator_agent", "handoff_reason": "project_management_request"}
  ]
}
```

## Key Benefits

### 1. Contextual Conversations
- Agents have full context about user, organization, and current state
- No need to re-ask for basic information
- Seamless handoffs between agents

### 2. Personalized Experience
- Role-based permissions and features
- User preferences respected
- Personalized greetings and responses

### 3. Data Isolation
- Organization-scoped data access
- Secure multi-tenant architecture
- Proper access controls

### 4. Stateful Interactions
- Resume conversations where they left off
- Track progress across sessions
- Maintain context between agent handoffs

### 5. Debugging and Monitoring
- Full audit trail of agent interactions
- Session lifecycle tracking
- Performance monitoring capabilities

This rich session state enables the Barka platform to provide intelligent, contextual, and personalized agent interactions while maintaining security and data isolation across organizations.
