"""
Suggest meeting times tool for Jarvis agent.
"""

from datetime import datetime, timedelta
from .list_events import list_events


def suggest_meeting_times_tool(date: str, duration_minutes: int,
                              business_hours_start: str,
                              business_hours_end: str) -> dict:
    """
    Suggest available meeting times for a given date.

    Args:
        date: Date to check (YYYY-MM-DD)
        duration_minutes: Required meeting duration in minutes
        business_hours_start: Business hours start time (HH:MM), defaults to "09:00" if not provided
        business_hours_end: Business hours end time (HH:MM), defaults to "17:00" if not provided

    Returns:
        Dict with suggested time slots
    """
    try:
        # Set default business hours if not provided
        if not business_hours_start:
            business_hours_start = "09:00"
        if not business_hours_end:
            business_hours_end = "17:00"
        # Try to get existing events for the day
        try:
            events_result = list_events(start_date=date, days=1)
        except Exception as e:
            # If calendar access fails, return empty suggestions with warning
            return {
                "success": False,
                "error": f"Google Calendar unavailable: {str(e)}",
                "suggestions": [],
                "message": "Cannot suggest meeting times without calendar access"
            }
        
        if events_result.get("status") != "success":
            return {
                "success": False,
                "error": events_result.get("message", "Failed to retrieve calendar events"),
                "suggestions": []
            }
        
        events = events_result.get("events", [])
        
        # Parse business hours
        business_start = datetime.strptime(f"{date} {business_hours_start}", "%Y-%m-%d %H:%M")
        business_end = datetime.strptime(f"{date} {business_hours_end}", "%Y-%m-%d %H:%M")
        
        # Create list of busy periods
        busy_periods = []
        for event in events:
            event_start = datetime.fromisoformat(event["start"].replace("Z", "+00:00"))
            event_end = datetime.fromisoformat(event["end"].replace("Z", "+00:00"))
            busy_periods.append((event_start, event_end))
        
        # Sort busy periods by start time
        busy_periods.sort(key=lambda x: x[0])
        
        # Find available slots
        suggestions = []
        current_time = business_start
        
        for busy_start, busy_end in busy_periods:
            # Check if there's a gap before this busy period
            if current_time + timedelta(minutes=duration_minutes) <= busy_start:
                suggestions.append({
                    "start_time": current_time.strftime("%H:%M"),
                    "end_time": (current_time + timedelta(minutes=duration_minutes)).strftime("%H:%M"),
                    "duration_minutes": duration_minutes
                })
            
            # Move current time to end of busy period
            current_time = max(current_time, busy_end)
        
        # Check if there's time after the last busy period
        if current_time + timedelta(minutes=duration_minutes) <= business_end:
            suggestions.append({
                "start_time": current_time.strftime("%H:%M"),
                "end_time": (current_time + timedelta(minutes=duration_minutes)).strftime("%H:%M"),
                "duration_minutes": duration_minutes
            })
        
        return {
            "success": True,
            "date": date,
            "suggestions": suggestions[:5],  # Limit to 5 suggestions
            "message": f"Found {len(suggestions)} available time slots"
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "suggestions": [],
            "message": f"Error suggesting meeting times: {str(e)}"
        }
