"""
Delete event tool for Google Calendar integration with organization access control.
"""

from google.adk.tools.tool_context import ToolContext
from .calendar_utils import get_calendar_service
from .role_permissions import check_permission


def delete_event(
    event_id: str,
    confirm: bool,
    tool_context: ToolContext,
) -> dict:
    """
    Delete an event from Google Calendar (Admin Only).

    Args:
        event_id (str): The unique ID of the event to delete
        confirm (bool): Confirmation flag (must be set to True to delete)
        tool_context (ToolContext): Context for accessing and updating session state

    Returns:
        dict: Operation status and details
    """
    try:
        # Check permissions - only admins can delete events
        permission_check = check_permission(tool_context, "delete_events")
        if not permission_check["allowed"]:
            return {
                "status": "error",
                "message": f"Access denied: {permission_check['error']}. Only organization administrators can delete calendar events."
            }

        # Safety check - require explicit confirmation
        if not confirm:
            return {
                "status": "error",
                "message": "Please confirm deletion by setting confirm=True",
            }
        # Get calendar service
        service = get_calendar_service()
        if not service:
            return {
                "status": "error",
                "message": "Failed to authenticate with Google Calendar. Please check credentials.",
            }

        # Always use primary calendar
        calendar_id = "primary"

        # Call the Calendar API to delete the event
        service.events().delete(calendarId=calendar_id, eventId=event_id).execute()

        return {
            "status": "success",
            "message": f"Event {event_id} has been deleted successfully",
            "event_id": event_id,
        }

    except Exception as e:
        return {"status": "error", "message": f"Error deleting event: {str(e)}"}
