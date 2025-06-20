"""
Organization Scheduling Configuration Model for Multi-Agent System

This model manages organization-specific scheduling policies, business hours,
meeting types, and configuration settings for the Jarvis scheduling agent.
"""

from datetime import datetime, time
from typing import Dict, List, Optional, Any
from bson import ObjectId
from pymongo import MongoClient
from pymongo.errors import PyMongoError
import logging

logger = logging.getLogger(__name__)


class OrganizationSchedulingConfig:
    """
    Organization Scheduling Configuration model for managing business scheduling policies.
    
    This class handles:
    - Business hours configuration
    - Meeting type definitions and durations
    - Scheduling policies and restrictions
    - Buffer times and availability rules
    - Holiday and blackout period management
    """
    
    # Default meeting types with durations (in minutes)
    DEFAULT_MEETING_TYPES = {
        "consultation": {"duration": 30, "description": "Initial consultation meeting"},
        "kickoff": {"duration": 60, "description": "Project kickoff meeting"},
        "review": {"duration": 45, "description": "Progress review meeting"},
        "demo": {"duration": 45, "description": "Product demonstration"},
        "planning": {"duration": 90, "description": "Project planning session"},
        "check_in": {"duration": 15, "description": "Quick status check-in"}
    }
    
    # Default business hours (24-hour format)
    DEFAULT_BUSINESS_HOURS = {
        "monday": {"start": "09:00", "end": "17:00", "enabled": True},
        "tuesday": {"start": "09:00", "end": "17:00", "enabled": True},
        "wednesday": {"start": "09:00", "end": "17:00", "enabled": True},
        "thursday": {"start": "09:00", "end": "17:00", "enabled": True},
        "friday": {"start": "09:00", "end": "17:00", "enabled": True},
        "saturday": {"start": "10:00", "end": "14:00", "enabled": False},
        "sunday": {"start": "10:00", "end": "14:00", "enabled": False}
    }
    
    def __init__(self, db):
        """
        Initialize OrganizationSchedulingConfig with database connection.
        
        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.collection = db["organization_scheduling_configs"]
        self._create_indexes()
    
    def _create_indexes(self):
        """Create database indexes for performance optimization."""
        try:
            # Index for organization-based queries
            self.collection.create_index([("organizationId", 1)])
            self.collection.create_index([("organizationId", 1), ("isActive", 1)])
            logger.debug("OrganizationSchedulingConfig indexes created successfully")
        except Exception as e:
            logger.warning(f"Failed to create OrganizationSchedulingConfig indexes: {e}")
    
    def create_config(self, organization_id: str, config_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Create scheduling configuration for an organization.
        
        Args:
            organization_id: MongoDB ObjectId of the organization
            config_data: Optional custom configuration data
            
        Returns:
            Dict containing the created configuration data
        """
        try:
            if not ObjectId.is_valid(organization_id):
                raise ValueError(f"Invalid organization_id: {organization_id}")
            
            # Check if config already exists
            existing_config = self.collection.find_one({"organizationId": ObjectId(organization_id)})
            if existing_config:
                raise ValueError(f"Configuration already exists for organization: {organization_id}")
            
            # Merge with defaults
            config = {
                "organizationId": ObjectId(organization_id),
                "businessHours": config_data.get("businessHours", self.DEFAULT_BUSINESS_HOURS) if config_data else self.DEFAULT_BUSINESS_HOURS,
                "meetingTypes": config_data.get("meetingTypes", self.DEFAULT_MEETING_TYPES) if config_data else self.DEFAULT_MEETING_TYPES,
                "bufferTimeMinutes": config_data.get("bufferTimeMinutes", 15) if config_data else 15,
                "maxMeetingDurationMinutes": config_data.get("maxMeetingDurationMinutes", 240) if config_data else 240,
                "minAdvanceBookingHours": config_data.get("minAdvanceBookingHours", 2) if config_data else 2,
                "maxAdvanceBookingDays": config_data.get("maxAdvanceBookingDays", 90) if config_data else 90,
                "allowWeekendBooking": config_data.get("allowWeekendBooking", False) if config_data else False,
                "timezone": config_data.get("timezone", "America/New_York") if config_data else "America/New_York",
                "blackoutPeriods": config_data.get("blackoutPeriods", []) if config_data else [],
                "holidayCalendar": config_data.get("holidayCalendar", []) if config_data else [],
                "isActive": True,
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
            }
            
            result = self.collection.insert_one(config)
            config["_id"] = str(result.inserted_id)
            
            logger.info(f"Created scheduling configuration for organization: {organization_id}")
            return self._convert_objectids_to_str(config)
            
        except Exception as e:
            logger.error(f"Error creating scheduling configuration: {e}")
            raise
    
    def get_config(self, organization_id: str) -> Optional[Dict[str, Any]]:
        """
        Get scheduling configuration for an organization.
        
        Args:
            organization_id: Organization identifier
            
        Returns:
            Configuration document or None if not found
        """
        try:
            if not ObjectId.is_valid(organization_id):
                raise ValueError(f"Invalid organization_id: {organization_id}")
            
            config = self.collection.find_one({
                "organizationId": ObjectId(organization_id),
                "isActive": True
            })
            
            if config:
                return self._convert_objectids_to_str(config)
            return None
            
        except Exception as e:
            logger.error(f"Error retrieving scheduling configuration: {e}")
            return None
    
    def update_config(self, organization_id: str, updates: Dict[str, Any]) -> bool:
        """
        Update scheduling configuration for an organization.
        
        Args:
            organization_id: Organization identifier
            updates: Dictionary of fields to update
            
        Returns:
            True if update was successful, False otherwise
        """
        try:
            if not ObjectId.is_valid(organization_id):
                raise ValueError(f"Invalid organization_id: {organization_id}")
            
            # Add update timestamp
            updates["updatedAt"] = datetime.utcnow()
            
            result = self.collection.update_one(
                {"organizationId": ObjectId(organization_id), "isActive": True},
                {"$set": updates}
            )
            
            if result.modified_count > 0:
                logger.info(f"Updated scheduling configuration for organization: {organization_id}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error updating scheduling configuration: {e}")
            return False
    
    def get_business_hours(self, organization_id: str) -> Dict[str, Any]:
        """
        Get business hours for an organization.
        
        Args:
            organization_id: Organization identifier
            
        Returns:
            Business hours configuration
        """
        config = self.get_config(organization_id)
        if config:
            return config.get("businessHours", self.DEFAULT_BUSINESS_HOURS)
        return self.DEFAULT_BUSINESS_HOURS
    
    def get_meeting_types(self, organization_id: str) -> Dict[str, Any]:
        """
        Get available meeting types for an organization.
        
        Args:
            organization_id: Organization identifier
            
        Returns:
            Meeting types configuration
        """
        config = self.get_config(organization_id)
        if config:
            return config.get("meetingTypes", self.DEFAULT_MEETING_TYPES)
        return self.DEFAULT_MEETING_TYPES
    
    def is_business_hours(self, organization_id: str, day_of_week: str, time_str: str) -> bool:
        """
        Check if a given time falls within business hours.
        
        Args:
            organization_id: Organization identifier
            day_of_week: Day name (e.g., 'monday', 'tuesday')
            time_str: Time in HH:MM format
            
        Returns:
            True if within business hours, False otherwise
        """
        try:
            business_hours = self.get_business_hours(organization_id)
            day_config = business_hours.get(day_of_week.lower())
            
            if not day_config or not day_config.get("enabled", False):
                return False
            
            time_obj = datetime.strptime(time_str, "%H:%M").time()
            start_time = datetime.strptime(day_config["start"], "%H:%M").time()
            end_time = datetime.strptime(day_config["end"], "%H:%M").time()
            
            return start_time <= time_obj <= end_time
            
        except Exception as e:
            logger.error(f"Error checking business hours: {e}")
            return False
    
    def _convert_objectids_to_str(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """Convert ObjectId fields to strings for JSON serialization."""
        if isinstance(doc, dict):
            for key, value in doc.items():
                if isinstance(value, ObjectId):
                    doc[key] = str(value)
                elif isinstance(value, dict):
                    doc[key] = self._convert_objectids_to_str(value)
                elif isinstance(value, list):
                    doc[key] = [self._convert_objectids_to_str(item) if isinstance(item, dict) else item for item in value]
        return doc
