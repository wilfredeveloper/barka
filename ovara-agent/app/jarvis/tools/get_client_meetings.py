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

# Initialize database
db = get_database()
scheduled_event_model = ScheduledEvent(db)


def get_client_meetings_tool(tool_context: ToolContext, days_ahead: int = 30) -> dict:
    """
    Get upcoming meetings for a client.

    The client_id is automatically read from the session state.

    Args:
        tool_context: ADK tool context containing session state
        days_ahead: Number of days to look ahead

    Returns:
        Dict with client meetings
    """
    try:
        # Get client_id from session state
        session_state = tool_context.state
        client_id = session_state.get("client_id")

        if not client_id:
            return {
                "success": False,
                "error": "Client ID not found in session state",
                "meetings": [],
                "message": "Session state missing client information"
            }

        meetings = scheduled_event_model.get_client_events(client_id, days_ahead=days_ahead)

        return {
            "success": True,
            "client_id": client_id,
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
