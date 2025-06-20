# Session Initialization Flow: Frontend → Backend → Ovara Agent

This document traces how the initial session state is created when a new conversation starts, following the complete flow from frontend to ovara-agent.

## Complete Flow Overview

```
Frontend → Backend → Ovara Agent
   ↓         ↓           ↓
Create    Create      Process
Convo     Session     Initial State
```

## Detailed Step-by-Step Flow

### 1. Frontend: Create New Conversation

**Location**: `barka-frontend/src/components/chat-sidebar.tsx` (line 103)

```typescript
const response = await api.post<ApiResponse<Conversation>>('/conversations', {
  clientId: client._id,
  title: 'New Onboarding Conversation',
});
```

**What happens**:
- User clicks "New Conversation" button
- Frontend gets current client information
- Makes POST request to `/api/conversations` with `clientId` and `title`

### 2. Backend: Create Conversation & ADK Session

**Location**: `barka-backend/controllers/conversationController.js` (lines 232-325)

#### 2.1 Create Conversation Document
```javascript
const conversation = await Conversation.create(conversationData);
```

#### 2.2 Generate Session Identifiers
```javascript
const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
const appName = "orchestrator";
let userId, userFullName, userRole, userEmail;
```

#### 2.3 Determine User Context
```javascript
if (conversationData.conversationType === "client") {
  userId = clientId;
  const clientWithUser = await Client.findById(clientId).populate('user', 'firstName lastName email');
  userFullName = `${clientWithUser.user.firstName} ${clientWithUser.user.lastName}`.trim();
  userEmail = clientWithUser.user.email;
  userRole = "client";
} else {
  userId = organizationId;
  userFullName = `${req.user.firstName} ${req.user.lastName}`.trim();
  userEmail = req.user.email;
  userRole = req.user.role;
}
```

#### 2.4 Build Initial State Object
```javascript
const initialState = {
  conversation_id: conversation._id.toString(),
  current_agent: "orchestrator_agent",
  agent_history: [],
  user_name: userFullName || "there",
  user_full_name: userFullName,
  user_role: userRole,
  user_email: userEmail,
  conversation_type: conversationData.conversationType,
  onboarding: {
    status: "not_started",
    phase: null,
    current_todo: null,
    progress: 0
  },
  scheduling: {
    meetings: [],
    availability: {},
    preferences: {}
  },
  user_preferences: {},
  session_metadata: {
    created_at: new Date().toISOString(),
    frontend_conversation_id: conversation._id.toString()
  }
};

// Add type-specific fields
if (conversationData.conversationType === "client") {
  initialState.client_id = clientId;
  initialState.organization_id = conversationData.organization.toString();
} else {
  initialState.organization_id = organizationId;
  initialState.user_id = req.user.id;
  
  if (req.user.role === 'org_admin') {
    initialState.client_id = req.user.id;
  }
}
```

#### 2.5 Send to Ovara Agent
```javascript
const adkUrl = `${ADK_BASE_URL}/apps/${appName}/users/${userId}/sessions/${sessionId}`;
const adkResponse = await axios.post(adkUrl, initialState, {
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000
});
```

#### 2.6 Update Conversation with Session Info
```javascript
conversation.adkSessionId = sessionId;
conversation.adkUserId = userId;
conversation.adkAppName = appName;
await conversation.save();
```

### 3. Ovara Agent: Process Initial State

**Location**: `ovara-agent/app/main.py` (lines 217-285)

#### 3.1 Receive Session Creation Request
```python
@app.post("/apps/{app_name}/users/{user_id}/sessions/{session_id}")
async def create_session_with_id(
    app_name: str,
    user_id: str,
    session_id: str,
    state: Optional[Dict[str, Any]] = None
):
```

#### 3.2 Check for Existing Session
```python
existing_session = await session_service.get_session(
    app_name=app_name,
    user_id=user_id,
    session_id=session_id
)
if existing_session:
    return existing_session  # Return existing if found
```

#### 3.3 Process Initial State
```python
if state:
    logger.info(f"Creating session with provided initial state")
    initial_state = create_initial_state(**state)
else:
    logger.info(f"Creating session with default initial state")
    initial_state = create_initial_state()
```

#### 3.4 Enhance Initial State
**Location**: `ovara-agent/app/main.py` (lines 131-208)

```python
def create_initial_state(
    client_id: Optional[str] = None,
    organization_id: Optional[str] = None,
    conversation_id: Optional[str] = None,
    user_name: Optional[str] = None,
    user_id: Optional[str] = None,
    user_role: Optional[str] = None,
    user_email: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    
    user_role = user_role or "org_client"
    permissions = get_role_permissions(user_role)
    
    return {
        # Core identifiers (REQUIRED for MCP tools)
        "client_id": client_id,
        "organization_id": organization_id,
        "conversation_id": conversation_id,
        "user_id": user_id or "default_user",
        
        # User context
        "user_name": user_name or "there",
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
        
        # Agent tracking
        "current_agent": kwargs.get("current_agent", "Gaia"),
        "agent_history": [],
        
        # Agent-specific states
        "onboarding": kwargs.get("onboarding", {
            "status": "not_started",
            "phase": None,
            "project_type": None,
            "todos": [],
            "requirements": {},
            "client_info": {}
        }),
        
        "scheduling": kwargs.get("scheduling", {
            "meetings": [],
            "availability": {},
            "preferences": {},
            "pending_actions": []
        }),
        
        # Shared state
        "user_preferences": kwargs.get("user_preferences", {}),
        "session_metadata": {
            "created_at": datetime.now().isoformat(),
            "last_active": datetime.now().isoformat(),
            "frontend_conversation_id": conversation_id
        }
    }
```

#### 3.5 Create Session in Database
```python
new_session = await session_service.create_session(
    app_name=app_name,
    user_id=user_id,
    session_id=session_id,
    state=initial_state
)
```

## Key Data Transformations

### From Backend to Ovara Agent

**Backend sends**:
```javascript
{
  conversation_id: "6855290e93c63efe226ac12f",
  current_agent: "orchestrator_agent",
  user_name: "Victor Wilfred",
  user_role: "org_admin",
  client_id: "68520b45df9a17bd55e3d691",
  organization_id: "68520b8adf9a17bd55e3d695",
  // ... other fields
}
```

**Ovara Agent enhances to**:
```python
{
  "client_id": "68520b45df9a17bd55e3d691",
  "organization_id": "68520b8adf9a17bd55e3d695", 
  "conversation_id": "6855290e93c63efe226ac12f",
  "user_id": "68520b45df9a17bd55e3d691",
  "user_name": "Victor Wilfred",
  "user_full_name": "Victor Wilfred",
  "user_role": "org_admin",
  "user_email": "wilfredeveloper@gmail.com",
  "project_management": {
    "active_project_id": None,
    "user_permissions": {
      "can_create_projects": True,
      "can_delete_projects": True,
      "can_manage_team": True,
      "can_view_analytics": True,
      "can_edit_organization": True
    },
    // ... preferences
  },
  "current_agent": "orchestrator_agent",
  "agent_history": [],
  "onboarding": {
    "status": "not_started",
    "phase": None,
    "current_todo": None,
    "progress": 0
  },
  "scheduling": {
    "meetings": [],
    "availability": {},
    "preferences": {}
  },
  "session_metadata": {
    "created_at": "2025-06-20T09:25:34.810821",
    "last_active": "2025-06-20T09:25:34.810836",
    "frontend_conversation_id": "6855290e93c63efe226ac12f"
  }
}
```

## Session State Usage

Once created, the session state is used by:

1. **MCP Tools**: Access `client_id`, `organization_id` for database queries
2. **Agent Logic**: Use `user_role`, `user_permissions` for access control
3. **Personalization**: Use `user_name`, `user_email` for personalized responses
4. **Agent Handoffs**: Track `current_agent`, `agent_history` for seamless transitions
5. **Feature States**: Maintain `onboarding`, `scheduling`, `project_management` contexts

## Error Handling

- If ADK session creation fails, conversation is still created
- Frontend can create session later via `/agent/create-session` endpoint
- Session state is validated and enhanced with defaults for missing fields
- Existing sessions are returned if session ID already exists

This flow ensures that every conversation has a rich, contextual session state that enables personalized, role-based agent interactions while maintaining data consistency across the entire platform.
