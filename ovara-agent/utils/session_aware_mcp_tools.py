"""
Session-Aware MCP Tools for Project Manager Agent

This module provides utilities to inject session state into MCP tool calls,
eliminating the need for users to provide basic identifiers like user_id,
client_id, and organization_id.
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

logger = logging.getLogger(__name__)


class MockToolContext:
    """Mock ToolContext that provides session state access for MCP tools"""
    
    def __init__(self, session_state: Dict[str, Any]):
        self.state = self.MockState(session_state)
        self.agent_name = "project_manager_agent"
        self.invocation_id = f"mcp_invocation_{datetime.now().timestamp()}"
        
    class MockState:
        """Mock state object that mimics Google ADK ToolContext.state"""
        
        def __init__(self, state_data: Dict[str, Any]):
            self._data = state_data or {}
            
        def get(self, key: str, default=None):
            """Get value from session state"""
            return self._data.get(key, default)
            
        def __setitem__(self, key: str, value: Any):
            """Set value in session state"""
            self._data[key] = value
            
        def __getitem__(self, key: str):
            """Get value from session state (dict-like access)"""
            return self._data[key]


class MCPParameterResolver:
    """Resolves MCP tool parameters from session state"""
    
    # Tool categories that require specific parameters
    USER_ID_REQUIRED_TOOLS = [
        'create_project', 'update_project', 'delete_project',
        'create_task', 'update_task', 'delete_task', 
        'create_team_member', 'update_team_member', 'delete_team_member'
    ]
    
    ORGANIZATION_ID_REQUIRED_TOOLS = [
        'list_projects', 'list_team_members', 'list_tasks', 'get_project_progress'
    ]
    
    CLIENT_ID_REQUIRED_TOOLS = [
        'create_task'  # Tasks require client_id
    ]
    
    @staticmethod
    def resolve_parameters(tool_name: str, args: Dict[str, Any], tool_context) -> Dict[str, Any]:
        """Auto-resolve missing parameters from session state"""
        
        if not tool_context or not hasattr(tool_context, 'state'):
            logger.warning(f"No tool context available for {tool_name}")
            return args
            
        resolved_args = args.copy()
        
        # Auto-inject user_id for operations that require it
        if tool_name in MCPParameterResolver.USER_ID_REQUIRED_TOOLS:
            if not resolved_args.get('user_id'):
                user_id = tool_context.state.get('user_id')
                if user_id:
                    resolved_args['user_id'] = user_id
                    logger.info(f"{tool_name}: Auto-resolved user_id from session state: {user_id}")
                else:
                    logger.warning(f"{tool_name}: No user_id found in session state")
                    
        # Auto-inject organization_id for list operations
        if tool_name in MCPParameterResolver.ORGANIZATION_ID_REQUIRED_TOOLS:
            if not resolved_args.get('organization_id'):
                org_id = tool_context.state.get('organization_id')
                if org_id:
                    resolved_args['organization_id'] = org_id
                    logger.info(f"{tool_name}: Auto-resolved organization_id from session state: {org_id}")
                else:
                    logger.warning(f"{tool_name}: No organization_id found in session state")
                    
        # Auto-inject client_id for task operations
        if tool_name in MCPParameterResolver.CLIENT_ID_REQUIRED_TOOLS:
            if not resolved_args.get('client_id'):
                client_id = tool_context.state.get('client_id')
                if client_id:
                    resolved_args['client_id'] = client_id
                    logger.info(f"{tool_name}: Auto-resolved client_id from session state: {client_id}")
                else:
                    logger.warning(f"{tool_name}: No client_id found in session state")
        
        # Apply role-based defaults and permissions
        user_role = tool_context.state.get('user_role', 'org_client')
        resolved_args = MCPParameterResolver._apply_role_based_defaults(resolved_args, user_role, tool_name)
        
        return resolved_args
    
    @staticmethod
    def _apply_role_based_defaults(args: Dict[str, Any], user_role: str, tool_name: str) -> Dict[str, Any]:
        """Apply role-based defaults and validate permissions"""

        # Get user permissions from role
        permissions = get_role_permissions(user_role)

        # Check permissions for destructive operations
        if tool_name.startswith('delete_') and not permissions.get('can_delete_projects', False):
            logger.warning(f"User role {user_role} does not have permission for {tool_name}")
            # Note: We still allow the operation but log the warning
            # The backend should enforce the actual permission check

        # Apply default values based on role and preferences - only for tools that accept these parameters
        if 'status' not in args or not args['status']:
            if 'project' in tool_name and tool_name in ['create_project', 'update_project']:
                args['status'] = 'planning'  # Default project status
            elif 'task' in tool_name and tool_name in ['create_task', 'update_task']:
                args['status'] = 'todo'  # Default task status

        # Only add priority for tools that accept it (not list operations)
        if ('priority' not in args or not args['priority']) and tool_name not in ['list_team_members', 'list_tasks', 'list_projects']:
            if tool_name in ['create_project', 'update_project', 'create_task', 'update_task']:
                args['priority'] = 'medium'  # Default priority

        return args


def get_role_permissions(user_role: str) -> Dict[str, bool]:
    """Get permissions based on user role"""
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


class SessionAwareMCPTool:
    """Wrapper that injects session state into MCP tool calls"""
    
    def __init__(self, original_tool, tool_name: str):
        self.original_tool = original_tool
        self.tool_name = tool_name
        self.name = getattr(original_tool, 'name', tool_name)
        
    async def run_async(self, args: Dict[str, Any], tool_context=None):
        """Enhanced run_async that auto-resolves parameters from session state"""

        # Resolve parameters using session state
        enhanced_args = MCPParameterResolver.resolve_parameters(
            self.tool_name, args, tool_context
        )

        logger.info(f"MCP Tool {self.tool_name}: Enhanced args = {enhanced_args}")

        # Call original tool with enhanced arguments using keyword-only arguments
        return await self.original_tool.run_async(args=enhanced_args, tool_context=tool_context)
    
    def __getattr__(self, name):
        """Delegate all other attributes to the original tool"""
        return getattr(self.original_tool, name)


# Global session state storage (will be set by MCP server)
_current_session_state: Optional[Dict[str, Any]] = None


def set_current_session_state(session_state: Dict[str, Any]):
    """Set the current session state for MCP tools"""
    global _current_session_state
    _current_session_state = session_state
    logger.info(f"Set current session state with keys: {list(session_state.keys())}")


def get_current_session_state() -> Optional[Dict[str, Any]]:
    """Get the current session state"""
    return _current_session_state


def create_mock_tool_context(session_state: Optional[Dict[str, Any]] = None) -> MockToolContext:
    """Create a mock tool context with session state"""
    state = session_state or get_current_session_state() or {}
    return MockToolContext(state)
