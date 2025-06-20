"""
Check availability tool for Jarvis agent with business policy validation.
"""

import logging
from datetime import datetime
from google.adk.tools.tool_context import ToolContext
from .list_events import list_events
from .business_policy_validator import validate_business_hours, validate_weekend_booking, check_blackout_periods
from .role_permissions import get_user_from_context, normalize_organization_id
from .organization_config import ensure_organization_config_loaded

logger = logging.getLogger(__name__)


def check_availability_tool(date: str, start_time: str, end_time: str, tool_context: ToolContext) -> dict:
    """
    Check calendar availability for a specific time slot with business policy validation.

    Args:
        date: Date to check (YYYY-MM-DD)
        start_time: Start time (HH:MM)
        end_time: End time (HH:MM)
        tool_context: ADK tool context containing session state

    Returns:
        Dict with availability information
    """
    try:
        # Debug logging
        logger.info(f"Checking availability for {date} {start_time}-{end_time}")

        # Ensure organization config is loaded
        ensure_organization_config_loaded(tool_context)

        # Get user information
        user_info = get_user_from_context(tool_context)
        logger.debug(f"Extracted user info: {user_info}")

        # Try to get organization_id from user_info or fallback to session state
        organization_id = None
        if user_info:
            organization_id = user_info.get("organization_id")

        # Fallback: try to get organization_id directly from session state
        if not organization_id:
            organization_id = tool_context.state.get("organization_id")

        # Normalize organization_id using utility function
        organization_id = normalize_organization_id(organization_id)
        logger.debug(f"Normalized organization_id: {organization_id}")

        if not organization_id:
            logger.warning("No organization_id found in session state or user info")
            return {
                "available": False,
                "error": "Organization ID not found in session",
                "message": "Organization context required to check availability"
            }

        logger.info(f"Using organization_id: {organization_id}")

        # Parse requested time slot
        requested_start = datetime.strptime(f"{date} {start_time}", "%Y-%m-%d %H:%M")
        requested_end = datetime.strptime(f"{date} {end_time}", "%Y-%m-%d %H:%M")

        # Business policy validations
        policy_violations = []

        # Check business hours
        business_hours_check = validate_business_hours(organization_id, requested_start, requested_end)
        if not business_hours_check["valid"]:
            policy_violations.append(business_hours_check["error"])

        # Check weekend policy
        weekend_check = validate_weekend_booking(organization_id, requested_start)
        if not weekend_check["valid"]:
            policy_violations.append(weekend_check["error"])

        # Check blackout periods
        blackout_check = check_blackout_periods(organization_id, requested_start, requested_end)
        if not blackout_check["valid"]:
            policy_violations.append(blackout_check["error"])
        # Try to use Jarvis list_events to check for conflicts
        try:
            events_result = list_events(start_date=date, days=1, tool_context=tool_context)
        except Exception as e:
            # If calendar access fails, return policy violations if any
            if policy_violations:
                return {
                    "available": False,
                    "conflicts": [],
                    "policy_violations": policy_violations,
                    "warning": f"Google Calendar unavailable: {str(e)}",
                    "message": f"Time slot violates organization policies: {'; '.join(policy_violations)}"
                }
            return {
                "available": True,
                "conflicts": [],
                "warning": f"Google Calendar unavailable: {str(e)}",
                "message": "Time slot assumed available (calendar check failed)"
            }
        
        if events_result.get("status") == "success":
            events = events_result.get("events", [])

            # Check for conflicts
            conflicts = []
            for event in events:
                try:
                    event_start = datetime.fromisoformat(event["start"].replace("Z", "+00:00"))
                    event_end = datetime.fromisoformat(event["end"].replace("Z", "+00:00"))

                    # Check if there's overlap
                    if (requested_start < event_end and requested_end > event_start):
                        conflicts.append({
                            "title": event["summary"],
                            "start": event["start"],
                            "end": event["end"]
                        })
                except (ValueError, KeyError) as e:
                    print(f"Warning: Error parsing event time: {e}")
                    continue

            # Determine overall availability
            calendar_available = len(conflicts) == 0
            policy_compliant = len(policy_violations) == 0
            overall_available = calendar_available and policy_compliant

            # Build response message
            messages = []
            if not calendar_available:
                messages.append(f"Found {len(conflicts)} calendar conflicts")
            if not policy_compliant:
                messages.append(f"Violates organization policies: {'; '.join(policy_violations)}")
            if overall_available:
                messages.append("Time slot is available")

            return {
                "available": overall_available,
                "conflicts": conflicts,
                "policy_violations": policy_violations,
                "message": "; ".join(messages) if messages else "Time slot checked"
            }
        else:
            return {
                "available": False,
                "error": events_result.get("message", "Failed to check calendar"),
                "message": "Could not check availability"
            }
            
    except Exception as e:
        return {
            "available": False,
            "error": str(e),
            "message": f"Error checking availability: {str(e)}"
        }
