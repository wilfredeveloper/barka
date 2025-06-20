"""
Schedule client meeting tool for Jarvis agent with organization policy validation.
"""

import sys
import os
from datetime import datetime, timedelta
from typing import List
from google.adk.tools.tool_context import ToolContext

# Add lib directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'lib'))

from models.scheduled_event import ScheduledEvent
from db import get_database

# Import calendar tools and validation
from .calendar_utils import get_calendar_service, parse_datetime
from .role_permissions import get_user_from_context, validate_meeting_request
from .business_policy_validator import validate_meeting_request_comprehensive
from .organization_config import ensure_organization_config_loaded
from .list_events import list_events

# Initialize database
db = get_database()
scheduled_event_model = ScheduledEvent(db)


def create_calendar_event_internal(title: str, description: str, start_datetime: str,
                                 end_datetime: str, attendee_emails: List[str]) -> dict:
    """
    Internal function to create Google Calendar events for scheduling tools.
    This bypasses permission checks since scheduling tools have already validated the request.

    Args:
        title: Event title
        description: Event description
        start_datetime: Start datetime in ISO format
        end_datetime: End datetime in ISO format
        attendee_emails: List of attendee email addresses

    Returns:
        Dict with calendar creation result
    """
    try:
        # Get calendar service
        service = get_calendar_service()
        if not service:
            return {
                "status": "error",
                "message": "Failed to authenticate with Google Calendar"
            }

        # Parse datetime strings to datetime objects for timezone handling
        start_dt = parse_datetime(start_datetime.replace('T', ' ').replace('Z', ''))
        end_dt = parse_datetime(end_datetime.replace('T', ' ').replace('Z', ''))

        if not start_dt or not end_dt:
            return {
                "status": "error",
                "message": "Invalid datetime format"
            }

        # Create event body
        event_body = {
            "summary": title,
            "description": description,
            "start": {
                "dateTime": start_dt.isoformat(),
                "timeZone": "America/New_York"  # Default timezone
            },
            "end": {
                "dateTime": end_dt.isoformat(),
                "timeZone": "America/New_York"
            },
            "reminders": {
                "useDefault": False,
                "overrides": [
                    {"method": "email", "minutes": 24 * 60},  # 1 day before
                    {"method": "popup", "minutes": 30}       # 30 minutes before
                ]
            }
        }

        # Add attendees if provided
        if attendee_emails:
            event_body["attendees"] = [{"email": email} for email in attendee_emails]

        # Create the event
        event = service.events().insert(calendarId="primary", body=event_body).execute()

        return {
            "status": "success",
            "message": "Calendar event created successfully",
            "event_id": event["id"],
            "html_link": event.get("htmlLink", "")
        }

    except Exception as e:
        return {
            "status": "error",
            "message": f"Error creating calendar event: {str(e)}"
        }


def schedule_client_meeting_tool(meeting_type: str, title: str, description: str,
                                duration_minutes: int, preferred_date: str, preferred_time: str,
                                attendee_emails: List[str], tool_context: ToolContext) -> dict:
    """
    Schedule a meeting for a client with project context and organization policy validation.

    The client_id and organization_id are automatically read from the session state.

    Args:
        meeting_type: Type of meeting (kickoff, review, demo, planning, check_in) - case insensitive
        title: Meeting title
        description: Meeting description
        duration_minutes: Meeting duration in minutes
        preferred_date: Preferred date (YYYY-MM-DD)
        preferred_time: Preferred time (HH:MM)
        attendee_emails: List of attendee email addresses
        tool_context: ADK tool context containing session state

    Returns:
        Dict with scheduling result
    """
    try:
        # Normalize meeting type to lowercase for consistency
        meeting_type = meeting_type.lower().strip()

        # Validate meeting type early
        valid_meeting_types = ["consultation", "kickoff", "review", "demo", "planning", "check_in"]
        if meeting_type not in valid_meeting_types:
            return {
                "success": False,
                "error": f"Invalid meeting type '{meeting_type}'. Must be one of: {', '.join(valid_meeting_types)}",
                "message": "Meeting type validation failed"
            }

        # Ensure organization config is loaded
        ensure_organization_config_loaded(tool_context)

        # Get user information and validate permissions
        user_info = get_user_from_context(tool_context)
        if not user_info:
            return {
                "success": False,
                "error": "User information not found in session",
                "message": "Authentication required to schedule meetings"
            }

        # Get client_id and organization_id from session state
        session_state = tool_context.state
        actual_client_id = session_state.get("client_id")
        actual_organization_id = session_state.get("organization_id")

        if not actual_client_id:
            return {
                "success": False,
                "error": "Client ID not found in session state",
                "message": "Session state missing client information"
            }

        if not actual_organization_id:
            return {
                "success": False,
                "error": "Organization ID not found in session state",
                "message": "Session state missing organization information"
            }

        # Validate meeting request based on user role
        meeting_data = {
            "meeting_type": meeting_type,
            "organization_id": actual_organization_id
        }
        validation_result = validate_meeting_request(user_info, meeting_data)
        if not validation_result["valid"]:
            return {
                "success": False,
                "error": validation_result["error"],
                "message": "Meeting request validation failed"
            }
        # Parse datetime
        start_datetime = f"{preferred_date} {preferred_time}"

        # Calculate end time
        start_dt = datetime.strptime(start_datetime, "%Y-%m-%d %H:%M")
        end_dt = start_dt + timedelta(minutes=duration_minutes)
        end_datetime = end_dt.strftime("%Y-%m-%d %H:%M")

        # Get existing events for conflict checking
        try:
            events_result = list_events(preferred_date, 1, tool_context)
            existing_events = events_result.get("events", []) if events_result.get("status") == "success" else []
        except Exception as e:
            existing_events = []
            print(f"Warning: Could not fetch existing events for validation: {e}")

        # Comprehensive business policy validation
        comprehensive_validation = validate_meeting_request_comprehensive(
            actual_organization_id,
            {
                "start_datetime": start_dt.isoformat(),
                "end_datetime": end_dt.isoformat(),
                "meeting_type": meeting_type
            },
            existing_events
        )

        if not comprehensive_validation["valid"]:
            return {
                "success": False,
                "error": "; ".join(comprehensive_validation["errors"]),
                "warnings": comprehensive_validation.get("warnings", []),
                "message": "Meeting request violates organization policies"
            }
        
        # Try to create calendar event directly (bypassing permission checks for scheduling tools)
        try:
            calendar_result = create_calendar_event_internal(
                title=title,
                description=description,
                start_datetime=start_datetime,
                end_datetime=end_datetime,
                attendee_emails=attendee_emails
            )
        except Exception as e:
            # If calendar creation fails completely, create a fallback result
            calendar_result = {
                "status": "error",
                "message": f"Google Calendar unavailable: {str(e)}"
            }

        if calendar_result.get("status") == "success":
            # Store in our scheduled events collection
            event_data = scheduled_event_model.create_event(
                client_id=actual_client_id,
                organization_id=actual_organization_id,
                event_type=meeting_type,
                title=title,
                description=description,
                start_time=start_dt,
                end_time=end_dt,
                attendees=[{"email": email, "name": "", "role": ""} for email in attendee_emails],
                calendar_event_id=calendar_result.get("event_id")
            )

            return {
                "success": True,
                "event_id": event_data["_id"],
                "calendar_event_id": calendar_result.get("event_id"),
                "message": f"Meeting '{title}' scheduled successfully",
                "start_time": start_datetime,
                "end_time": end_datetime,
                "calendar_link": calendar_result.get("html_link")
            }
        else:
            # Even if calendar creation fails, store the event in our database
            # This allows the system to track meetings even without Google Calendar
            try:
                event_data = scheduled_event_model.create_event(
                    client_id=actual_client_id,
                    organization_id=actual_organization_id,
                    event_type=meeting_type,
                    title=title,
                    description=description,
                    start_time=start_dt,
                    end_time=end_dt,
                    attendees=[{"email": email, "name": "", "role": ""} for email in attendee_emails],
                    calendar_event_id=None
                )

                return {
                    "success": True,
                    "event_id": event_data["_id"],
                    "calendar_event_id": None,
                    "message": f"Meeting '{title}' scheduled in system (Google Calendar unavailable: {calendar_result.get('message', 'Unknown error')})",
                    "start_time": start_datetime,
                    "end_time": end_datetime,
                    "calendar_link": None,
                    "warning": "Google Calendar integration unavailable"
                }
            except Exception as db_error:
                return {
                    "success": False,
                    "error": f"Calendar error: {calendar_result.get('message', 'Unknown error')}. Database error: {str(db_error)}",
                    "message": "Failed to schedule meeting"
                }
            
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": f"Error scheduling meeting: {str(e)}"
        }
