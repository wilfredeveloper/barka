# Project Manager Agent - Comprehensive Initial State Specification

## Overview
This document defines the comprehensive initial state structure required for the Project Manager Agent to eliminate user prompts for basic identifiers and provide seamless UX.

## Current Problem
The Project Manager Agent's MCP server tools currently require users to provide:
- `user_id` (required for most operations)
- `client_id` (required for tasks, optional for projects/team members)  
- `organization_id` (required for list operations)
- `project_id` (optional, for filtering)
- `user_role` (for permissions)

## Solution: Enhanced Initial State Structure

### Core Identifiers (Required)
```python
{
    # Primary identifiers from barka-backend session creation
    "client_id": "682d0ffc73b55d01943ae37a",           # MongoDB ObjectId as string
    "organization_id": "682c9c77fc264d7a085281e8",      # MongoDB ObjectId as string  
    "conversation_id": "674a1b2c3d4e5f6789abcdef",      # MongoDB ObjectId as string
    "user_id": "user_12345",                            # ADK user identifier
    
    # User context for personalization
    "user_name": "John Smith",                          # Display name
    "user_full_name": "John Smith",                     # Full formal name
    "user_role": "org_client",                          # Role: org_client, org_admin, org_member
    "user_email": "john@company.com",                   # User email (if available)
}
```

### Project Management Context (Enhanced)
```python
{
    # Project management specific state
    "project_management": {
        "active_project_id": None,                      # Currently selected project
        "default_project_status": "planning",           # Default status for new projects
        "default_task_status": "todo",                  # Default status for new tasks
        "default_priority": "medium",                   # Default priority level
        "user_permissions": {
            "can_create_projects": True,
            "can_delete_projects": False,               # Based on user_role
            "can_manage_team": False,                   # Based on user_role
            "can_view_analytics": True
        },
        "preferences": {
            "default_view": "list",                     # list, kanban, calendar
            "items_per_page": 20,
            "show_completed_tasks": False,
            "notification_preferences": {
                "task_assignments": True,
                "project_updates": True,
                "deadline_reminders": True
            }
        }
    }
}
```

### Agent Coordination State
```python
{
    # Agent tracking and coordination
    "current_agent": "Gaia",
    "agent_history": [],
    "agent_context": {
        "last_action": None,
        "pending_handoffs": [],
        "shared_context": {}
    }
}
```

### Session Metadata
```python
{
    "session_metadata": {
        "created_at": "2025-01-15T10:00:00Z",
        "last_active": "2025-01-15T10:00:00Z", 
        "frontend_conversation_id": "674a1b2c3d4e5f6789abcdef",
        "session_type": "project_management",
        "platform": "barka_frontend"
    }
}
```

## Complete Initial State Template

```python
def create_project_manager_initial_state(
    client_id: str,
    organization_id: str, 
    conversation_id: str,
    user_id: str,
    user_name: str = "there",
    user_role: str = "org_client",
    user_email: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Create comprehensive initial state for Project Manager Agent."""
    
    # Determine permissions based on user role
    permissions = get_role_permissions(user_role)
    
    return {
        # Core identifiers (REQUIRED for MCP tools)
        "client_id": client_id,
        "organization_id": organization_id,
        "conversation_id": conversation_id,
        "user_id": user_id,
        
        # User context
        "user_name": user_name,
        "user_full_name": user_name,
        "user_role": user_role,
        "user_email": user_email,
        
        # Project management context
        "project_management": {
            "active_project_id": None,
            "default_project_status": "planning",
            "default_task_status": "todo", 
            "default_priority": "medium",
            "user_permissions": permissions,
            "preferences": {
                "default_view": "list",
                "items_per_page": 20,
                "show_completed_tasks": False,
                "notification_preferences": {
                    "task_assignments": True,
                    "project_updates": True,
                    "deadline_reminders": True
                }
            }
        },
        
        # Agent coordination
        "current_agent": "Gaia",
        "agent_history": [],
        
        # Session metadata
        "session_metadata": {
            "created_at": datetime.now().isoformat(),
            "last_active": datetime.now().isoformat(),
            "frontend_conversation_id": conversation_id,
            "session_type": "project_management",
            "platform": "barka_frontend"
        },
        
        # Compatibility with other agents
        "onboarding": kwargs.get("onboarding", {"status": "not_started"}),
        "scheduling": kwargs.get("scheduling", {"meetings": [], "availability": {}}),
        "user_preferences": kwargs.get("user_preferences", {})
    }

def get_role_permissions(user_role: str) -> Dict[str, bool]:
    """Get permissions based on user role."""
    role_permissions = {
        "org_admin": {
            "can_create_projects": True,
            "can_delete_projects": True,
            "can_manage_team": True,
            "can_view_analytics": True,
            "can_edit_organization": True
        },
        "org_member": {
            "can_create_projects": True,
            "can_delete_projects": False,
            "can_manage_team": False,
            "can_view_analytics": True,
            "can_edit_organization": False
        },
        "org_client": {
            "can_create_projects": False,
            "can_delete_projects": False,
            "can_manage_team": False,
            "can_view_analytics": False,
            "can_edit_organization": False
        }
    }
    return role_permissions.get(user_role, role_permissions["org_client"])
```

## Key Benefits

1. **Eliminates User Prompts**: All required MCP tool parameters available in session state
2. **Role-Based Permissions**: Automatic permission handling based on user role
3. **Personalization**: User preferences and context for better UX
4. **Agent Coordination**: Proper state for multi-agent workflows
5. **Backward Compatibility**: Works with existing agent patterns
