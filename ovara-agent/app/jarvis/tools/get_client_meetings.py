"""
Get client meetings tool for Jarvis agent.
"""

import sys
import os
from google.adk.tools.tool_context import ToolContext

# Add lib directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'lib'))

from models.scheduled_event import ScheduledEvent
from db import get_database
from typing import Optional

# Initialize database
db = get_database()
scheduled_event_model = ScheduledEvent(db)


def get_client_meetings_tool(client_id: Optional[str], tool_context: ToolContext, days_ahead: int = 30) -> dict:
    """
    Get upcoming meetings for a client.

    For regular client users: client_id is automatically read from session state.
    For admin users: client_id can be provided to view meetings for any client.

    Args:
        client_id: Optional client ID for admin users to view meetings for specific clients
        tool_context: ADK tool context containing session state
        days_ahead: Number of days to look ahead

    Returns:
        Dict with client meetings
    """
    try:
        # Import role checking function
        from .role_permissions import get_user_from_context, is_admin_user

        # Get user information for permission checking
        user_info = get_user_from_context(tool_context)
        if not user_info:
            return {
                "success": False,
                "error": "User information not found in session",
                "meetings": [],
                "message": "Authentication required"
            }

        user_role = user_info.get("role")
        session_state = tool_context.state
        session_client_id = session_state.get("client_id")

        # Determine actual client_id based on user role and parameters
        if client_id:
            # Admin provided explicit client_id
            if not is_admin_user(user_role):
                return {
                    "success": False,
                    "error": "Only administrators can view meetings for other clients",
                    "meetings": [],
                    "message": "Permission denied"
                }
            actual_client_id = client_id
        else:
            # Use session client_id for regular clients
            actual_client_id = session_client_id

            # For non-admin users, client_id is required
            if not is_admin_user(user_role) and not actual_client_id:
                return {
                    "success": False,
                    "error": "Client ID not found in session state",
                    "meetings": [],
                    "message": "Session state missing client information"
                }

            # For admin users without client_id, return organization-wide meetings
            if is_admin_user(user_role) and not actual_client_id:
                organization_id = session_state.get("organization_id")
                if not organization_id:
                    return {
                        "success": False,
                        "error": "Organization ID not found in session state",
                        "meetings": [],
                        "message": "Session state missing organization information"
                    }

                # Get all meetings for the organization
                meetings = scheduled_event_model.get_organization_events(organization_id, days_ahead=days_ahead)

                return {
                    "success": True,
                    "organization_id": organization_id,
                    "meetings": meetings,
                    "count": len(meetings),
                    "message": f"Found {len(meetings)} upcoming organization meetings"
                }

        meetings = scheduled_event_model.get_client_events(actual_client_id, days_ahead=days_ahead)

        return {
            "success": True,
            "client_id": actual_client_id,
            "meetings": meetings,
            "count": len(meetings),
            "message": f"Found {len(meetings)} upcoming meetings"
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "meetings": [],
            "message": f"Error retrieving client meetings: {str(e)}"
        }
