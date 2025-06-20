"""
Role-based permissions and access control utilities for Jarvis scheduling agent.

This module provides functions to check user roles and enforce permissions
for calendar operations and scheduling activities.
"""

import sys
import os
import logging
from typing import Dict, Any, Optional
from google.adk.tools.tool_context import ToolContext

# Add lib directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'lib'))

from db import get_database

logger = logging.getLogger(__name__)

# User roles (matching barka-backend User model)
ROLES = {
    "ORG_CLIENT": "org_client",
    "ORG_ADMIN": "org_admin",
    "SUPER_ADMIN": "super_admin"
}

# Initialize database
db = get_database()


def normalize_organization_id(organization_id) -> Optional[str]:
    """
    Normalize organization ID to string format.

    Args:
        organization_id: Organization ID (can be string, dict, or None)

    Returns:
        Normalized organization ID string or None
    """
    if not organization_id:
        return None

    if isinstance(organization_id, str):
        return organization_id

    if isinstance(organization_id, dict):
        return organization_id.get("_id") or organization_id.get("id")

    # Try to convert to string if it's another type
    try:
        return str(organization_id)
    except:
        return None


def get_user_role(user_id: str) -> Optional[str]:
    """
    Get user role from database.
    
    Args:
        user_id: User identifier
        
    Returns:
        User role string or None if not found
    """
    try:
        users_collection = db["users"]
        user = users_collection.find_one({"_id": user_id})
        
        if user:
            return user.get("role")
        return None
        
    except Exception as e:
        logger.error(f"Error retrieving user role: {e}")
        return None


def get_user_from_context(tool_context: ToolContext) -> Optional[Dict[str, Any]]:
    """
    Extract user information from tool context.

    Args:
        tool_context: ADK tool context containing session state

    Returns:
        User information dictionary or None
    """
    try:
        # Try to get user_id from session state (direct)
        user_id = tool_context.state.get("user_id")
        client_id = tool_context.state.get("client_id")
        organization_id = tool_context.state.get("organization_id")

        logger.debug(f"Direct session values - user_id: {user_id}, client_id: {client_id}, organization_id: {organization_id}")

        # Normalize organization_id using utility function
        organization_id = normalize_organization_id(organization_id)
        logger.debug(f"Normalized organization_id: {organization_id}")

        # If no direct user_id, try to extract from client cache
        if not user_id and client_id:
            client_cache = tool_context.state.get("barka_client_cache", {})
            client_data = client_cache.get(client_id, {}).get("client_data", {})
            user_id = client_data.get("user")

            # Also try to get user info from cache if available
            if client_data.get("userInfo"):
                user_info = client_data["userInfo"]
                # Try to get user role from database
                if user_id:
                    users_collection = db["users"]
                    user = users_collection.find_one({"_id": user_id})
                    if user:
                        return {
                            "user_id": user_id,
                            "client_id": client_id,
                            "organization_id": organization_id,
                            "role": user.get("role", "org_client"),  # Default to client role
                            "email": user_info.get("email"),
                            "first_name": user_info.get("name", "").split(" ")[0] if user_info.get("name") else "",
                            "last_name": " ".join(user_info.get("name", "").split(" ")[1:]) if user_info.get("name") else ""
                        }

        # If we have user_id, get user from database
        if user_id:
            users_collection = db["users"]
            user = users_collection.find_one({"_id": user_id})

            if user:
                return {
                    "user_id": user_id,
                    "client_id": client_id,
                    "organization_id": organization_id,
                    "role": user.get("role"),
                    "email": user.get("email"),
                    "first_name": user.get("firstName"),
                    "last_name": user.get("lastName")
                }

        # Fallback: if we have client_id and organization_id but no user, assume client role
        if client_id and organization_id:
            logger.info(f"Using fallback client role for client_id: {client_id}")
            return {
                "user_id": None,
                "client_id": client_id,
                "organization_id": organization_id,
                "role": "org_client",  # Default to client role
                "email": None,
                "first_name": tool_context.state.get("user_name", ""),
                "last_name": ""
            }

        logger.warning("No user information found in session state")
        return None

    except Exception as e:
        logger.error(f"Error extracting user from context: {e}")
        return None


def is_admin_user(role: str) -> bool:
    """
    Check if user has admin privileges.
    
    Args:
        role: User role string
        
    Returns:
        True if user is admin, False otherwise
    """
    return role in [ROLES["ORG_ADMIN"], ROLES["SUPER_ADMIN"]]


def is_client_user(role: str) -> bool:
    """
    Check if user is a client.
    
    Args:
        role: User role string
        
    Returns:
        True if user is client, False otherwise
    """
    return role == ROLES["ORG_CLIENT"]


def can_create_events(role: str) -> bool:
    """
    Check if user can create calendar events.
    
    Args:
        role: User role string
        
    Returns:
        True if user can create events, False otherwise
    """
    # Only admins can create events directly
    # Clients can only request meetings through scheduling tools
    return is_admin_user(role)


def can_edit_events(role: str) -> bool:
    """
    Check if user can edit calendar events.
    
    Args:
        role: User role string
        
    Returns:
        True if user can edit events, False otherwise
    """
    # Only admins can edit events
    return is_admin_user(role)


def can_delete_events(role: str) -> bool:
    """
    Check if user can delete calendar events.
    
    Args:
        role: User role string
        
    Returns:
        True if user can delete events, False otherwise
    """
    # Only admins can delete events
    return is_admin_user(role)


def can_view_full_calendar(role: str) -> bool:
    """
    Check if user can view the full organization calendar.
    
    Args:
        role: User role string
        
    Returns:
        True if user can view full calendar, False otherwise
    """
    # Only admins can view full calendar
    # Clients can only see their own meetings
    return is_admin_user(role)


def can_schedule_meetings(role: str) -> bool:
    """
    Check if user can schedule meetings.
    
    Args:
        role: User role string
        
    Returns:
        True if user can schedule meetings, False otherwise
    """
    # Both clients and admins can schedule meetings
    # But with different restrictions
    return True


def validate_meeting_request(user_info: Dict[str, Any], meeting_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate a meeting request based on user role and organization policies.
    
    Args:
        user_info: User information dictionary
        meeting_data: Meeting request data
        
    Returns:
        Validation result with success status and any errors
    """
    try:
        role = user_info.get("role")
        
        # Basic validation
        if not role:
            return {"valid": False, "error": "User role not found"}
        
        # Check if user can schedule meetings
        if not can_schedule_meetings(role):
            return {"valid": False, "error": "User does not have permission to schedule meetings"}
        
        # Client-specific validations
        if is_client_user(role):
            # Clients can only schedule business-related meetings
            meeting_type = meeting_data.get("meeting_type", "").lower()
            allowed_types = ["consultation", "kickoff", "review", "demo", "planning", "check_in"]
            
            if meeting_type not in allowed_types:
                return {"valid": False, "error": f"Meeting type '{meeting_type}' not allowed for clients"}
            
            # Check if meeting is for their own organization
            user_org_id = user_info.get("organization_id")
            meeting_org_id = meeting_data.get("organization_id")
            
            if user_org_id != meeting_org_id:
                return {"valid": False, "error": "Clients can only schedule meetings for their own organization"}
        
        return {"valid": True}
        
    except Exception as e:
        logger.error(f"Error validating meeting request: {e}")
        return {"valid": False, "error": f"Validation error: {str(e)}"}


def get_filtered_events_for_user(events: list, user_info: Dict[str, Any]) -> list:
    """
    Filter calendar events based on user role and permissions.
    
    Args:
        events: List of calendar events
        user_info: User information dictionary
        
    Returns:
        Filtered list of events the user is allowed to see
    """
    try:
        role = user_info.get("role")
        
        # Admins can see all events
        if is_admin_user(role):
            return events
        
        # Clients can only see their own meetings
        if is_client_user(role):
            client_id = user_info.get("client_id")
            user_email = user_info.get("email")
            
            filtered_events = []
            for event in events:
                # Check if client is an attendee or if it's their meeting
                attendees = event.get("attendees", [])
                attendee_emails = [attendee.get("email", "") for attendee in attendees]
                
                # Include event if client is an attendee or if it mentions their client ID
                if (user_email in attendee_emails or 
                    client_id in event.get("description", "") or
                    client_id in event.get("summary", "")):
                    filtered_events.append(event)
            
            return filtered_events
        
        # Default: return empty list for unknown roles
        return []
        
    except Exception as e:
        logger.error(f"Error filtering events for user: {e}")
        return []


def check_permission(tool_context: ToolContext, required_permission: str) -> Dict[str, Any]:
    """
    Check if user has required permission for an operation.
    
    Args:
        tool_context: ADK tool context
        required_permission: Permission to check (create_events, edit_events, delete_events, etc.)
        
    Returns:
        Permission check result with user info and permission status
    """
    try:
        user_info = get_user_from_context(tool_context)
        
        if not user_info:
            return {
                "allowed": False,
                "error": "User information not found in session",
                "user_info": None
            }
        
        role = user_info.get("role")
        
        # Check specific permissions
        permission_checks = {
            "create_events": can_create_events,
            "edit_events": can_edit_events,
            "delete_events": can_delete_events,
            "view_full_calendar": can_view_full_calendar,
            "schedule_meetings": can_schedule_meetings
        }
        
        check_function = permission_checks.get(required_permission)
        if not check_function:
            return {
                "allowed": False,
                "error": f"Unknown permission: {required_permission}",
                "user_info": user_info
            }
        
        allowed = check_function(role)
        
        return {
            "allowed": allowed,
            "error": None if allowed else f"User does not have {required_permission} permission",
            "user_info": user_info
        }
        
    except Exception as e:
        logger.error(f"Error checking permission: {e}")
        return {
            "allowed": False,
            "error": f"Permission check failed: {str(e)}",
            "user_info": None
        }
