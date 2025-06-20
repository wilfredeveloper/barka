"""
Business policy validation utilities for Jarvis scheduling agent.

This module provides functions to validate scheduling requests against
organization business policies, hours, and restrictions.
"""

import sys
import os
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List

# Add lib directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'lib'))

from models.organization_scheduling_config import OrganizationSchedulingConfig
from db import get_database

logger = logging.getLogger(__name__)

# Initialize database and models
db = get_database()
org_config_model = OrganizationSchedulingConfig(db)


def validate_business_hours(organization_id: str, start_datetime: datetime, end_datetime: datetime) -> Dict[str, Any]:
    """
    Validate that a meeting time falls within business hours.
    
    Args:
        organization_id: Organization identifier
        start_datetime: Meeting start time
        end_datetime: Meeting end time
        
    Returns:
        Validation result with success status and details
    """
    try:
        # Get day of week (monday, tuesday, etc.)
        day_name = start_datetime.strftime("%A").lower()
        start_time_str = start_datetime.strftime("%H:%M")
        end_time_str = end_datetime.strftime("%H:%M")
        
        # Check if start time is within business hours
        start_valid = org_config_model.is_business_hours(organization_id, day_name, start_time_str)
        end_valid = org_config_model.is_business_hours(organization_id, day_name, end_time_str)
        
        if not start_valid or not end_valid:
            business_hours = org_config_model.get_business_hours(organization_id)
            day_config = business_hours.get(day_name, {})
            
            if not day_config.get("enabled", False):
                return {
                    "valid": False,
                    "error": f"Meetings are not allowed on {day_name.title()}",
                    "business_hours": day_config
                }
            else:
                return {
                    "valid": False,
                    "error": f"Meeting time must be within business hours: {day_config.get('start', 'N/A')} - {day_config.get('end', 'N/A')}",
                    "business_hours": day_config
                }
        
        return {"valid": True, "message": "Meeting time is within business hours"}
        
    except Exception as e:
        logger.error(f"Error validating business hours: {e}")
        return {"valid": False, "error": f"Business hours validation failed: {str(e)}"}


def validate_meeting_duration(organization_id: str, meeting_type: str, duration_minutes: int) -> Dict[str, Any]:
    """
    Validate meeting duration against organization policies.
    
    Args:
        organization_id: Organization identifier
        meeting_type: Type of meeting
        duration_minutes: Requested duration in minutes
        
    Returns:
        Validation result with success status and details
    """
    try:
        config = org_config_model.get_config(organization_id)
        if not config:
            # Use defaults if no config found
            max_duration = 240  # 4 hours default
        else:
            max_duration = config.get("maxMeetingDurationMinutes", 240)
        
        # Check maximum duration
        if duration_minutes > max_duration:
            return {
                "valid": False,
                "error": f"Meeting duration ({duration_minutes} minutes) exceeds maximum allowed ({max_duration} minutes)"
            }
        
        # Check against meeting type defaults
        meeting_types = org_config_model.get_meeting_types(organization_id)
        if meeting_type in meeting_types:
            suggested_duration = meeting_types[meeting_type].get("duration", duration_minutes)
            
            # Allow some flexibility (±50% of suggested duration)
            min_allowed = suggested_duration * 0.5
            max_allowed = suggested_duration * 1.5
            
            if duration_minutes < min_allowed or duration_minutes > max_allowed:
                return {
                    "valid": False,
                    "error": f"Duration for {meeting_type} meetings should be between {int(min_allowed)} and {int(max_allowed)} minutes (suggested: {suggested_duration} minutes)",
                    "suggested_duration": suggested_duration
                }
        
        return {"valid": True, "message": "Meeting duration is acceptable"}
        
    except Exception as e:
        logger.error(f"Error validating meeting duration: {e}")
        return {"valid": False, "error": f"Duration validation failed: {str(e)}"}


def validate_advance_booking(organization_id: str, meeting_datetime: datetime) -> Dict[str, Any]:
    """
    Validate advance booking requirements.
    
    Args:
        organization_id: Organization identifier
        meeting_datetime: Requested meeting time
        
    Returns:
        Validation result with success status and details
    """
    try:
        config = org_config_model.get_config(organization_id)
        if not config:
            min_advance_hours = 2
            max_advance_days = 90
        else:
            min_advance_hours = config.get("minAdvanceBookingHours", 2)
            max_advance_days = config.get("maxAdvanceBookingDays", 90)
        
        now = datetime.utcnow()
        time_until_meeting = meeting_datetime - now
        
        # Check minimum advance booking
        min_advance = timedelta(hours=min_advance_hours)
        if time_until_meeting < min_advance:
            return {
                "valid": False,
                "error": f"Meetings must be scheduled at least {min_advance_hours} hours in advance"
            }
        
        # Check maximum advance booking
        max_advance = timedelta(days=max_advance_days)
        if time_until_meeting > max_advance:
            return {
                "valid": False,
                "error": f"Meetings cannot be scheduled more than {max_advance_days} days in advance"
            }
        
        return {"valid": True, "message": "Advance booking requirements met"}
        
    except Exception as e:
        logger.error(f"Error validating advance booking: {e}")
        return {"valid": False, "error": f"Advance booking validation failed: {str(e)}"}


def validate_weekend_booking(organization_id: str, meeting_datetime: datetime) -> Dict[str, Any]:
    """
    Validate weekend booking policies.
    
    Args:
        organization_id: Organization identifier
        meeting_datetime: Requested meeting time
        
    Returns:
        Validation result with success status and details
    """
    try:
        # Check if it's a weekend (Saturday = 5, Sunday = 6)
        if meeting_datetime.weekday() not in [5, 6]:
            return {"valid": True, "message": "Not a weekend"}
        
        config = org_config_model.get_config(organization_id)
        if not config:
            allow_weekend = False
        else:
            allow_weekend = config.get("allowWeekendBooking", False)
        
        if not allow_weekend:
            return {
                "valid": False,
                "error": "Weekend meetings are not allowed by organization policy"
            }
        
        return {"valid": True, "message": "Weekend booking is allowed"}
        
    except Exception as e:
        logger.error(f"Error validating weekend booking: {e}")
        return {"valid": False, "error": f"Weekend booking validation failed: {str(e)}"}


def check_blackout_periods(organization_id: str, start_datetime: datetime, end_datetime: datetime) -> Dict[str, Any]:
    """
    Check if meeting conflicts with blackout periods.
    
    Args:
        organization_id: Organization identifier
        start_datetime: Meeting start time
        end_datetime: Meeting end time
        
    Returns:
        Validation result with success status and details
    """
    try:
        config = org_config_model.get_config(organization_id)
        if not config:
            return {"valid": True, "message": "No blackout periods configured"}
        
        blackout_periods = config.get("blackoutPeriods", [])
        
        for period in blackout_periods:
            period_start = datetime.fromisoformat(period["start"])
            period_end = datetime.fromisoformat(period["end"])
            
            # Check for overlap
            if (start_datetime < period_end and end_datetime > period_start):
                return {
                    "valid": False,
                    "error": f"Meeting conflicts with blackout period: {period.get('name', 'Unavailable')} ({period['start']} - {period['end']})"
                }
        
        return {"valid": True, "message": "No blackout period conflicts"}
        
    except Exception as e:
        logger.error(f"Error checking blackout periods: {e}")
        return {"valid": False, "error": f"Blackout period check failed: {str(e)}"}


def validate_buffer_time(organization_id: str, start_datetime: datetime, existing_events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Validate buffer time requirements between meetings.
    
    Args:
        organization_id: Organization identifier
        start_datetime: New meeting start time
        existing_events: List of existing calendar events
        
    Returns:
        Validation result with success status and details
    """
    try:
        config = org_config_model.get_config(organization_id)
        if not config:
            buffer_minutes = 15
        else:
            buffer_minutes = config.get("bufferTimeMinutes", 15)
        
        buffer_time = timedelta(minutes=buffer_minutes)
        
        for event in existing_events:
            try:
                event_start = datetime.fromisoformat(event["start"].replace("Z", "+00:00"))
                event_end = datetime.fromisoformat(event["end"].replace("Z", "+00:00"))
                
                # Check if new meeting is too close to existing event
                if abs(start_datetime - event_end) < buffer_time or abs(start_datetime - event_start) < buffer_time:
                    return {
                        "valid": False,
                        "error": f"Meeting must have at least {buffer_minutes} minutes buffer from existing events",
                        "conflicting_event": event.get("summary", "Unknown event")
                    }
            except (ValueError, KeyError) as e:
                logger.warning(f"Error parsing event time: {e}")
                continue
        
        return {"valid": True, "message": "Buffer time requirements met"}
        
    except Exception as e:
        logger.error(f"Error validating buffer time: {e}")
        return {"valid": False, "error": f"Buffer time validation failed: {str(e)}"}


def validate_meeting_request_comprehensive(organization_id: str, meeting_data: Dict[str, Any], existing_events: List[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Comprehensive validation of a meeting request against all business policies.
    
    Args:
        organization_id: Organization identifier
        meeting_data: Meeting request data
        existing_events: Optional list of existing calendar events
        
    Returns:
        Comprehensive validation result
    """
    try:
        # Parse meeting times
        start_datetime = datetime.fromisoformat(meeting_data["start_datetime"])
        end_datetime = datetime.fromisoformat(meeting_data["end_datetime"])
        duration_minutes = int((end_datetime - start_datetime).total_seconds() / 60)
        meeting_type = meeting_data.get("meeting_type", "consultation")
        
        validation_results = []
        
        # Run all validations
        validations = [
            validate_business_hours(organization_id, start_datetime, end_datetime),
            validate_meeting_duration(organization_id, meeting_type, duration_minutes),
            validate_advance_booking(organization_id, start_datetime),
            validate_weekend_booking(organization_id, start_datetime),
            check_blackout_periods(organization_id, start_datetime, end_datetime)
        ]
        
        # Add buffer time validation if existing events provided
        if existing_events:
            validations.append(validate_buffer_time(organization_id, start_datetime, existing_events))
        
        # Collect all validation results
        all_valid = True
        errors = []
        warnings = []
        
        for result in validations:
            validation_results.append(result)
            if not result.get("valid", True):
                all_valid = False
                errors.append(result.get("error", "Unknown validation error"))
            elif result.get("warning"):
                warnings.append(result.get("warning"))
        
        return {
            "valid": all_valid,
            "errors": errors,
            "warnings": warnings,
            "validation_details": validation_results
        }
        
    except Exception as e:
        logger.error(f"Error in comprehensive meeting validation: {e}")
        return {
            "valid": False,
            "errors": [f"Validation failed: {str(e)}"],
            "warnings": [],
            "validation_details": []
        }
