"""
Create event tool for Google Calendar integration with organization access control.
"""

import datetime
from google.adk.tools.tool_context import ToolContext

from .calendar_utils import get_calendar_service, parse_datetime
from .role_permissions import check_permission
from .organization_config import ensure_organization_config_loaded


def create_event(
    summary: str,
    start_time: str,
    end_time: str,
    tool_context: ToolContext,
) -> dict:
    """
    Create a new event in Google Calendar (Admin Only).

    Args:
        summary (str): Event title/summary
        start_time (str): Start time (e.g., "2023-12-31 14:00")
        end_time (str): End time (e.g., "2023-12-31 15:00")
        tool_context (ToolContext): Context for accessing and updating session state

    Returns:
        dict: Information about the created event or error details
    """
    try:
        # Check permissions - only admins can create events directly
        permission_check = check_permission(tool_context, "create_events")
        if not permission_check["allowed"]:
            return {
                "status": "error",
                "message": f"Access denied: {permission_check['error']}. Clients should use the meeting scheduling tools instead."
            }

        # Ensure organization config is loaded
        ensure_organization_config_loaded(tool_context)
        # Get calendar service
        service = get_calendar_service()
        if not service:
            return {
                "status": "error",
                "message": "Failed to authenticate with Google Calendar. Please check credentials.",
            }

        # Always use primary calendar
        calendar_id = "primary"

        # Parse times
        start_dt = parse_datetime(start_time)
        end_dt = parse_datetime(end_time)

        if not start_dt or not end_dt:
            return {
                "status": "error",
                "message": "Invalid date/time format. Please use YYYY-MM-DD HH:MM format.",
            }

        # Dynamically determine timezone
        timezone_id = "America/New_York"  # Default to Eastern Time

        try:
            # Try to get the timezone from the calendar settings
            settings = service.settings().list().execute()
            for setting in settings.get("items", []):
                if setting.get("id") == "timezone":
                    timezone_id = setting.get("value")
                    break
        except Exception:
            # If we can't get it from settings, we'll use the default
            pass

        # Create event body without type annotations
        event_body = {}

        # Add summary
        event_body["summary"] = summary

        # Add start and end times with the dynamically determined timezone
        event_body["start"] = {
            "dateTime": start_dt.isoformat(),
            "timeZone": timezone_id,
        }
        event_body["end"] = {"dateTime": end_dt.isoformat(), "timeZone": timezone_id}

        # Call the Calendar API to create the event
        event = (
            service.events().insert(calendarId=calendar_id, body=event_body).execute()
        )

        # Store event in session state for persistence
        events = tool_context.state.get("jarvis_events", [])
        event_data = {
            "event_id": event["id"],
            "summary": summary,
            "start_time": start_time,
            "end_time": end_time,
            "event_link": event.get("htmlLink", ""),
            "created_at": datetime.datetime.now().isoformat(),
            "calendar_id": calendar_id
        }
        events.append(event_data)
        tool_context.state["jarvis_events"] = events

        return {
            "status": "success",
            "message": "Event created successfully",
            "event_id": event["id"],
            "event_link": event.get("htmlLink", ""),
        }

    except Exception as e:
        return {"status": "error", "message": f"Error creating event: {str(e)}"}
