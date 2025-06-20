# Project Manager Agent - Session State Implementation Plan

## Overview
Step-by-step plan to modify the Project Manager Agent and its MCP tools to use session state instead of prompting users for basic identifiers.

## Current Architecture Issues

1. **MCP Server Gap**: MCP server calls ADK tools with `tool_context=None`
2. **Missing State Access**: MCP tools can't access session state
3. **User Prompts**: Tools require manual input for `user_id`, `client_id`, `organization_id`
4. **No Role Permissions**: No automatic role-based access control

## Implementation Strategy

### Phase 1: Enhanced MCP Tool Context Passing

**Problem**: MCP server currently passes `tool_context=None` to ADK tools
**Solution**: Create a session-aware MCP tool wrapper that injects session state

#### Step 1.1: Create Session-Aware MCP Tool Wrapper
```python
# File: ovara-agent/utils/session_aware_mcp_tools.py
class SessionAwareMCPTool:
    """Wrapper that injects session state into MCP tool calls"""
    
    def __init__(self, original_tool, session_state_provider):
        self.original_tool = original_tool
        self.session_state_provider = session_state_provider
    
    async def run_async(self, args, tool_context=None):
        # Inject session state into args
        enhanced_args = self._inject_session_state(args, tool_context)
        return await self.original_tool.run_async(enhanced_args, tool_context)
    
    def _inject_session_state(self, args, tool_context):
        """Inject session state values for missing required parameters"""
        if not tool_context:
            return args
            
        enhanced_args = args.copy()
        
        # Auto-inject common identifiers if missing
        if 'user_id' not in enhanced_args or not enhanced_args['user_id']:
            enhanced_args['user_id'] = tool_context.state.get('user_id')
            
        if 'client_id' not in enhanced_args or not enhanced_args['client_id']:
            enhanced_args['client_id'] = tool_context.state.get('client_id')
            
        if 'organization_id' not in enhanced_args or not enhanced_args['organization_id']:
            enhanced_args['organization_id'] = tool_context.state.get('organization_id')
            
        return enhanced_args
```

#### Step 1.2: Modify MCP Server to Pass Tool Context
```python
# File: ovara-agent/mcp_server.py
@app.call_tool()
async def call_mcp_tool(name: str, arguments: dict) -> List[mcp_types.TextContent]:
    """Enhanced MCP handler with session state support"""
    
    # Get session state from global context or arguments
    session_state = get_current_session_state()  # New function
    
    # Create mock tool context with session state
    mock_tool_context = create_mock_tool_context(session_state)
    
    if name in ADK_PROJECT_TOOLS:
        adk_tool_instance = ADK_PROJECT_TOOLS[name]
        
        # Use session-aware wrapper
        session_aware_tool = SessionAwareMCPTool(adk_tool_instance, session_state)
        
        try:
            adk_tool_response = await session_aware_tool.run_async(
                args=arguments,
                tool_context=mock_tool_context,  # Pass actual context
            )
            # ... rest of implementation
```

### Phase 2: Enhanced Initial State Integration

#### Step 2.1: Update Barka Backend Session Creation
```python
# File: barka-backend/routes/agent.js
const initialState = {
    // Existing state...
    client_id: clientId,
    organization_id: organizationId,
    conversation_id: conversationId,
    user_name: userFullName || "there",
    
    // NEW: Enhanced project management state
    user_id: userId,  // Add ADK user_id
    user_role: userRole || "org_client",  // Add user role
    user_email: userEmail,  // Add user email if available
    
    project_management: {
        active_project_id: null,
        default_project_status: "planning",
        default_task_status: "todo",
        default_priority: "medium",
        user_permissions: getUserPermissions(userRole),
        preferences: getDefaultPreferences()
    }
};
```

#### Step 2.2: Update Ovara Agent Initial State Template
```python
# File: ovara-agent/app/main.py
def create_initial_state(
    client_id: Optional[str] = None,
    organization_id: Optional[str] = None,
    conversation_id: Optional[str] = None,
    user_name: Optional[str] = None,
    user_id: Optional[str] = None,  # NEW
    user_role: Optional[str] = None,  # NEW
    user_email: Optional[str] = None,  # NEW
    **kwargs
) -> Dict[str, Any]:
    """Enhanced initial state with project management context"""
    
    base_state = {
        # Core identifiers
        "client_id": client_id,
        "organization_id": organization_id, 
        "conversation_id": conversation_id,
        "user_id": user_id or "default_user",
        
        # User context
        "user_name": user_name or "there",
        "user_full_name": user_name,
        "user_role": user_role or "org_client",
        "user_email": user_email,
        
        # Project management context
        "project_management": create_project_management_state(user_role),
        
        # Existing state...
        "current_agent": kwargs.get("current_agent", "Gaia"),
        # ... rest of existing state
    }
    
    return base_state
```

### Phase 3: MCP Tool Parameter Auto-Resolution

#### Step 3.1: Create Parameter Resolution Utilities
```python
# File: ovara-agent/utils/mcp_parameter_resolver.py
class MCPParameterResolver:
    """Resolves MCP tool parameters from session state"""
    
    @staticmethod
    def resolve_parameters(tool_name: str, args: dict, tool_context) -> dict:
        """Auto-resolve missing parameters from session state"""
        
        resolved_args = args.copy()
        
        # Parameter resolution rules by tool category
        if tool_name.startswith(('create_', 'update_', 'delete_')):
            # Operations that require user_id
            if not resolved_args.get('user_id'):
                resolved_args['user_id'] = tool_context.state.get('user_id')
                
        if tool_name.startswith('list_'):
            # List operations that require organization_id
            if not resolved_args.get('organization_id'):
                resolved_args['organization_id'] = tool_context.state.get('organization_id')
                
        if 'task' in tool_name:
            # Task operations that require client_id
            if not resolved_args.get('client_id'):
                resolved_args['client_id'] = tool_context.state.get('client_id')
                
        # Apply role-based defaults
        user_role = tool_context.state.get('user_role', 'org_client')
        resolved_args = apply_role_based_defaults(resolved_args, user_role)
        
        return resolved_args
```

### Phase 4: Agent Integration Updates

#### Step 4.1: Update Project Manager Agent Prompt
```python
# File: ovara-agent/app/project_manager/prompt.py
project_manager_system_prompt = f"""
# Project Manager Agent - Enhanced with Session State

You have access to comprehensive session state that eliminates the need to ask users for:
- User ID: Available as {{user_id}} in session state
- Client ID: Available as {{client_id}} in session state  
- Organization ID: Available as {{organization_id}} in session state
- User Role: Available as {{user_role}} for permissions

## Session State Access Pattern
All MCP tools automatically receive session state. You should:
1. NEVER ask users for user_id, client_id, or organization_id
2. Use role-based permissions from session state
3. Provide personalized responses using {{user_name}}

## Available Tools with Auto-Resolution
- create_project: Automatically uses user_id from session
- list_projects: Automatically uses organization_id from session
- create_task: Automatically uses user_id and client_id from session
- All tools: Respect user_role permissions automatically

## User Personalization
- Address user by name: {{user_name}}
- Respect user role: {{user_role}}
- Apply user preferences from session state
"""
```

## Implementation Checklist

### Backend Changes
- [ ] Update barka-backend session creation with enhanced initial state
- [ ] Add user role and permissions to session creation
- [ ] Test session state injection

### MCP Server Changes  
- [ ] Create session-aware MCP tool wrapper
- [ ] Implement parameter auto-resolution
- [ ] Add mock tool context creation
- [ ] Update MCP server tool calling logic

### Agent Changes
- [ ] Update project manager agent prompt
- [ ] Enhance initial state template
- [ ] Add role-based permission handling
- [ ] Test agent with session state

### Testing & Validation
- [ ] Test all MCP tools with auto-resolved parameters
- [ ] Verify no user prompts for basic identifiers
- [ ] Test role-based permissions
- [ ] Validate cross-agent compatibility

## Success Criteria
1. ✅ No user prompts for user_id, client_id, organization_id
2. ✅ Automatic role-based permissions
3. ✅ Personalized responses using session state
4. ✅ Seamless UX matching other agents
5. ✅ Backward compatibility maintained
