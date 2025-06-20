"""
Organization configuration management tools for Jarvis scheduling agent.

This module provides tools to manage and access organization-specific
scheduling configurations and business policies.
"""

import sys
import os
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from google.adk.tools.tool_context import ToolContext

# Add lib directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'lib'))

from models.organization_scheduling_config import OrganizationSchedulingConfig
from db import get_database
from .role_permissions import get_user_from_context, is_admin_user

logger = logging.getLogger(__name__)

# Initialize database and models
db = get_database()
org_config_model = OrganizationSchedulingConfig(db)


def serialize_config_for_session(config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Serialize organization config for session state storage.

    Converts datetime objects to ISO strings to make the config JSON serializable.

    Args:
        config: Organization configuration dictionary

    Returns:
        Serialized configuration safe for JSON storage
    """
    if not config:
        return config

    # Create a copy to avoid modifying the original
    serialized_config = config.copy()

    # Convert datetime objects to ISO strings
    for key, value in serialized_config.items():
        if isinstance(value, datetime):
            serialized_config[key] = value.isoformat()

    return serialized_config


def load_organization_config_to_state(tool_context: ToolContext) -> Dict[str, Any]:
    """
    Load organization scheduling configuration into session state.
    
    Args:
        tool_context: ADK tool context containing session state
        
    Returns:
        Result of loading configuration
    """
    try:
        user_info = get_user_from_context(tool_context)
        if not user_info:
            return {"success": False, "error": "User information not found"}
        
        organization_id = user_info.get("organization_id")
        if not organization_id:
            return {"success": False, "error": "Organization ID not found"}
        
        # Get organization configuration
        config = org_config_model.get_config(organization_id)
        if not config:
            # Create default configuration if none exists
            config = org_config_model.create_config(organization_id)
        
        # Serialize config for session state (convert datetime objects to strings)
        serialized_config = serialize_config_for_session(config)

        # Store in session state
        tool_context.state["organization_scheduling_config"] = serialized_config
        tool_context.state["organization_id"] = organization_id
        
        logger.info(f"Loaded organization scheduling config for org: {organization_id}")
        
        return {
            "success": True,
            "message": "Organization configuration loaded successfully",
            "config": config
        }
        
    except Exception as e:
        logger.error(f"Error loading organization config: {e}")
        return {"success": False, "error": f"Failed to load configuration: {str(e)}"}


def get_organization_business_hours(tool_context: ToolContext) -> Dict[str, Any]:
    """
    Get organization business hours from session state or database.
    
    Args:
        tool_context: ADK tool context containing session state
        
    Returns:
        Business hours configuration
    """
    try:
        # Try to get from session state first
        config = tool_context.state.get("organization_scheduling_config")
        if config:
            return {
                "success": True,
                "business_hours": config.get("businessHours", {}),
                "timezone": config.get("timezone", "America/New_York")
            }
        
        # Fallback to database
        user_info = get_user_from_context(tool_context)
        if user_info and user_info.get("organization_id"):
            business_hours = org_config_model.get_business_hours(user_info["organization_id"])
            return {
                "success": True,
                "business_hours": business_hours,
                "timezone": "America/New_York"  # Default timezone
            }
        
        # Return defaults
        return {
            "success": True,
            "business_hours": org_config_model.DEFAULT_BUSINESS_HOURS,
            "timezone": "America/New_York"
        }
        
    except Exception as e:
        logger.error(f"Error getting business hours: {e}")
        return {"success": False, "error": f"Failed to get business hours: {str(e)}"}


def get_organization_meeting_types(tool_context: ToolContext) -> Dict[str, Any]:
    """
    Get organization meeting types from session state or database.
    
    Args:
        tool_context: ADK tool context containing session state
        
    Returns:
        Meeting types configuration
    """
    try:
        # Try to get from session state first
        config = tool_context.state.get("organization_scheduling_config")
        if config:
            return {
                "success": True,
                "meeting_types": config.get("meetingTypes", {})
            }
        
        # Fallback to database
        user_info = get_user_from_context(tool_context)
        if user_info and user_info.get("organization_id"):
            meeting_types = org_config_model.get_meeting_types(user_info["organization_id"])
            return {
                "success": True,
                "meeting_types": meeting_types
            }
        
        # Return defaults
        return {
            "success": True,
            "meeting_types": org_config_model.DEFAULT_MEETING_TYPES
        }
        
    except Exception as e:
        logger.error(f"Error getting meeting types: {e}")
        return {"success": False, "error": f"Failed to get meeting types: {str(e)}"}


def update_organization_config_tool(
    tool_context: ToolContext,
    config_updates: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Update organization scheduling configuration (admin only).
    
    Args:
        tool_context: ADK tool context containing session state
        config_updates: Dictionary of configuration updates
        
    Returns:
        Result of configuration update
    """
    try:
        user_info = get_user_from_context(tool_context)
        if not user_info:
            return {"success": False, "error": "User information not found"}
        
        # Check if user is admin
        if not is_admin_user(user_info.get("role")):
            return {"success": False, "error": "Only administrators can update organization configuration"}
        
        organization_id = user_info.get("organization_id")
        if not organization_id:
            return {"success": False, "error": "Organization ID not found"}
        
        # Update configuration
        success = org_config_model.update_config(organization_id, config_updates)
        
        if success:
            # Reload configuration in session state
            updated_config = org_config_model.get_config(organization_id)
            serialized_config = serialize_config_for_session(updated_config)
            tool_context.state["organization_scheduling_config"] = serialized_config
            
            return {
                "success": True,
                "message": "Organization configuration updated successfully",
                "updated_config": updated_config
            }
        else:
            return {"success": False, "error": "Failed to update configuration"}
        
    except Exception as e:
        logger.error(f"Error updating organization config: {e}")
        return {"success": False, "error": f"Failed to update configuration: {str(e)}"}


def get_scheduling_policies(tool_context: ToolContext) -> Dict[str, Any]:
    """
    Get organization scheduling policies and restrictions.
    
    Args:
        tool_context: ADK tool context containing session state
        
    Returns:
        Scheduling policies configuration
    """
    try:
        # Try to get from session state first
        config = tool_context.state.get("organization_scheduling_config")
        if not config:
            # Load configuration if not in state
            load_result = load_organization_config_to_state(tool_context)
            if not load_result.get("success"):
                return load_result
            config = tool_context.state.get("organization_scheduling_config")
        
        policies = {
            "buffer_time_minutes": config.get("bufferTimeMinutes", 15),
            "max_meeting_duration_minutes": config.get("maxMeetingDurationMinutes", 240),
            "min_advance_booking_hours": config.get("minAdvanceBookingHours", 2),
            "max_advance_booking_days": config.get("maxAdvanceBookingDays", 90),
            "allow_weekend_booking": config.get("allowWeekendBooking", False),
            "timezone": config.get("timezone", "America/New_York"),
            "blackout_periods": config.get("blackoutPeriods", []),
            "holiday_calendar": config.get("holidayCalendar", [])
        }
        
        return {
            "success": True,
            "policies": policies
        }
        
    except Exception as e:
        logger.error(f"Error getting scheduling policies: {e}")
        return {"success": False, "error": f"Failed to get scheduling policies: {str(e)}"}


def create_default_organization_config(organization_id: str) -> Dict[str, Any]:
    """
    Create default organization configuration.
    
    Args:
        organization_id: Organization identifier
        
    Returns:
        Result of configuration creation
    """
    try:
        config = org_config_model.create_config(organization_id)
        
        return {
            "success": True,
            "message": "Default organization configuration created",
            "config": config
        }
        
    except Exception as e:
        logger.error(f"Error creating default organization config: {e}")
        return {"success": False, "error": f"Failed to create configuration: {str(e)}"}


def ensure_organization_config_loaded(tool_context: ToolContext) -> bool:
    """
    Ensure organization configuration is loaded in session state.
    
    Args:
        tool_context: ADK tool context containing session state
        
    Returns:
        True if configuration is loaded, False otherwise
    """
    try:
        # Check if already loaded
        if tool_context.state.get("organization_scheduling_config"):
            return True
        
        # Try to load
        result = load_organization_config_to_state(tool_context)
        return result.get("success", False)
        
    except Exception as e:
        logger.error(f"Error ensuring organization config loaded: {e}")
        return False
