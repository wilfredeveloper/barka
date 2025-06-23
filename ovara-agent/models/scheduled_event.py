"""
Scheduled Event Model for Multi-Agent System

This model manages scheduled events and meetings for clients,
integrating with the scheduler agent and Google Calendar.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from bson import ObjectId
from pymongo import MongoClient
from pymongo.errors import PyMongoError
import logging

logger = logging.getLogger(__name__)


class ScheduledEvent:
    """
    Scheduled Event model for managing client meetings and events.
    
    This class handles:
    - Event creation and management
    - Calendar integration tracking
    - Attendee management
    - Event status tracking
    """
    
    # Event types
    EVENT_TYPES = [
        "kickoff",
        "review", 
        "demo",
        "planning",
        "check_in"
    ]
    
    # Event statuses
    EVENT_STATUSES = [
        "scheduled",
        "confirmed",
        "cancelled", 
        "completed"
    ]
    
    # Attendee statuses
    ATTENDEE_STATUSES = ["pending", "accepted", "declined"]
    
    def __init__(self, db):
        """
        Initialize ScheduledEvent with database connection.
        
        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.collection = db["scheduled_events"]
        self._create_indexes()
    
    def _create_indexes(self):
        """Create database indexes for performance optimization."""
        try:
            # Index for client and time-based queries
            self.collection.create_index([("clientId", 1), ("startTime", 1)])
            self.collection.create_index([("organizationId", 1), ("startTime", 1)])
            self.collection.create_index([("startTime", 1), ("status", 1)])
            self.collection.create_index([("calendarEventId", 1)])
            logger.debug("ScheduledEvent indexes created successfully")
        except Exception as e:
            logger.warning(f"Failed to create ScheduledEvent indexes: {e}")
    
    def create_event(self, client_id: Optional[str], organization_id: str, event_type: str,
                    title: str, start_time: datetime, end_time: datetime,
                    description: Optional[str] = None, attendees: Optional[List[Dict]] = None,
                    location: Optional[str] = None, meeting_link: Optional[str] = None,
                    calendar_event_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a new scheduled event.

        Args:
            client_id: MongoDB ObjectId of the client (optional for admin internal meetings)
            organization_id: MongoDB ObjectId of the organization
            event_type: Type of event (must be in EVENT_TYPES)
            title: Event title
            start_time: Event start time
            end_time: Event end time
            description: Event description (optional)
            attendees: List of attendee dictionaries (optional)
            location: Event location (optional)
            meeting_link: Online meeting link (optional)
            calendar_event_id: External calendar system ID (optional)

        Returns:
            Dict containing the created event data

        Raises:
            ValueError: If validation fails
            RuntimeError: If database operation fails
        """
        try:
            # Validate inputs
            if event_type not in self.EVENT_TYPES:
                raise ValueError(f"Invalid event_type: {event_type}. Must be one of {self.EVENT_TYPES}")

            # client_id is optional for admin internal meetings
            if client_id and not ObjectId.is_valid(client_id):
                raise ValueError(f"Invalid client_id: {client_id}")

            if not ObjectId.is_valid(organization_id):
                raise ValueError(f"Invalid organization_id: {organization_id}")
            
            if start_time >= end_time:
                raise ValueError("Start time must be before end time")
            
            # Validate attendees format
            if attendees:
                for attendee in attendees:
                    if not isinstance(attendee, dict) or "email" not in attendee:
                        raise ValueError("Each attendee must be a dict with 'email' field")
                    # Set default status if not provided
                    if "status" not in attendee:
                        attendee["status"] = "pending"
            
            # Create event document
            event_doc = {
                "clientId": ObjectId(client_id) if client_id else None,
                "organizationId": ObjectId(organization_id),
                "scheduledBy": "scheduler_agent",
                "eventType": event_type,
                "title": title,
                "description": description or "",
                "startTime": start_time,
                "endTime": end_time,
                "attendees": attendees or [],
                "location": location,
                "meetingLink": meeting_link,
                "calendarEventId": calendar_event_id,
                "status": "scheduled",
                "reminders": [
                    {"type": "email", "minutesBefore": 60, "sent": False},
                    {"type": "notification", "minutesBefore": 15, "sent": False}
                ],
                "metadata": {},
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
            }
            
            # Insert event
            result = self.collection.insert_one(event_doc)
            event_doc["_id"] = result.inserted_id
            
            logger.info(f"Created scheduled event '{title}' for client {client_id}")
            return self._convert_objectids_to_str(event_doc)
            
        except ValueError:
            raise
        except PyMongoError as e:
            logger.error(f"Database error creating scheduled event: {e}")
            raise RuntimeError(f"Database error: {e}")
        except Exception as e:
            logger.error(f"Unexpected error creating scheduled event: {e}")
            raise RuntimeError(f"Unexpected error: {e}")
    
    def get_event(self, event_id: str) -> Optional[Dict[str, Any]]:
        """
        Get event by event ID.
        
        Args:
            event_id: Event identifier
            
        Returns:
            Event document or None if not found
        """
        try:
            if not ObjectId.is_valid(event_id):
                return None
            
            event = self.collection.find_one({"_id": ObjectId(event_id)})
            return self._convert_objectids_to_str(event) if event else None
        except Exception as e:
            logger.error(f"Error retrieving event {event_id}: {e}")
            return None
    
    def get_client_events(self, client_id: str, days_ahead: int = 30,
                         status: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get events for a client within a time range.

        Args:
            client_id: Client identifier
            days_ahead: Number of days to look ahead
            status: Optional status filter

        Returns:
            List of event documents
        """
        try:
            if not ObjectId.is_valid(client_id):
                raise ValueError(f"Invalid client_id: {client_id}")

            # Calculate time range
            now = datetime.utcnow()
            end_date = now + timedelta(days=days_ahead)

            query = {
                "clientId": ObjectId(client_id),
                "startTime": {"$gte": now, "$lte": end_date}
            }

            if status:
                query["status"] = status

            events = list(self.collection.find(query).sort("startTime", 1))
            return [self._convert_objectids_to_str(event) for event in events]

        except Exception as e:
            logger.error(f"Error retrieving client events: {e}")
            return []

    def get_organization_events(self, organization_id: str, days_ahead: int = 30,
                               status: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get events for an organization within a time range.

        Args:
            organization_id: Organization identifier
            days_ahead: Number of days to look ahead
            status: Optional status filter

        Returns:
            List of event documents
        """
        try:
            if not ObjectId.is_valid(organization_id):
                raise ValueError(f"Invalid organization_id: {organization_id}")

            # Calculate time range
            now = datetime.utcnow()
            end_date = now + timedelta(days=days_ahead)

            query = {
                "organizationId": ObjectId(organization_id),
                "startTime": {"$gte": now, "$lte": end_date}
            }

            if status:
                query["status"] = status

            events = list(self.collection.find(query).sort("startTime", 1))
            return [self._convert_objectids_to_str(event) for event in events]

        except Exception as e:
            logger.error(f"Error retrieving organization events: {e}")
            return []
    
    def update_event_status(self, event_id: str, status: str) -> bool:
        """
        Update event status.
        
        Args:
            event_id: Event identifier
            status: New status (must be in EVENT_STATUSES)
            
        Returns:
            True if update successful, False otherwise
        """
        try:
            if not ObjectId.is_valid(event_id):
                return False
            
            if status not in self.EVENT_STATUSES:
                raise ValueError(f"Invalid status: {status}. Must be one of {self.EVENT_STATUSES}")
            
            result = self.collection.update_one(
                {"_id": ObjectId(event_id)},
                {
                    "$set": {
                        "status": status,
                        "updatedAt": datetime.utcnow()
                    }
                }
            )
            
            if result.modified_count > 0:
                logger.info(f"Updated event {event_id} status to {status}")
                return True
            else:
                logger.warning(f"Failed to update event {event_id} status")
                return False
                
        except Exception as e:
            logger.error(f"Error updating event status: {e}")
            return False
    
    def update_attendee_response(self, event_id: str, attendee_email: str, 
                               response_status: str) -> bool:
        """
        Update attendee response status.
        
        Args:
            event_id: Event identifier
            attendee_email: Attendee email address
            response_status: Response status (must be in ATTENDEE_STATUSES)
            
        Returns:
            True if update successful, False otherwise
        """
        try:
            if not ObjectId.is_valid(event_id):
                return False
            
            if response_status not in self.ATTENDEE_STATUSES:
                raise ValueError(f"Invalid response_status: {response_status}. Must be one of {self.ATTENDEE_STATUSES}")
            
            result = self.collection.update_one(
                {
                    "_id": ObjectId(event_id),
                    "attendees.email": attendee_email
                },
                {
                    "$set": {
                        "attendees.$.status": response_status,
                        "updatedAt": datetime.utcnow()
                    }
                }
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Error updating attendee response: {e}")
            return False
    
    def get_upcoming_events(self, hours_ahead: int = 24) -> List[Dict[str, Any]]:
        """
        Get upcoming events within specified hours.
        
        Args:
            hours_ahead: Number of hours to look ahead
            
        Returns:
            List of upcoming event documents
        """
        try:
            now = datetime.utcnow()
            end_time = now + timedelta(hours=hours_ahead)
            
            events = list(self.collection.find({
                "startTime": {"$gte": now, "$lte": end_time},
                "status": {"$in": ["scheduled", "confirmed"]}
            }).sort("startTime", 1))
            
            return [self._convert_objectids_to_str(event) for event in events]
            
        except Exception as e:
            logger.error(f"Error retrieving upcoming events: {e}")
            return []
    
    def mark_reminder_sent(self, event_id: str, reminder_type: str, 
                          minutes_before: int) -> bool:
        """
        Mark a reminder as sent.
        
        Args:
            event_id: Event identifier
            reminder_type: Type of reminder (email, notification)
            minutes_before: Minutes before event
            
        Returns:
            True if update successful, False otherwise
        """
        try:
            if not ObjectId.is_valid(event_id):
                return False
            
            result = self.collection.update_one(
                {
                    "_id": ObjectId(event_id),
                    "reminders": {
                        "$elemMatch": {
                            "type": reminder_type,
                            "minutesBefore": minutes_before
                        }
                    }
                },
                {
                    "$set": {
                        "reminders.$.sent": True,
                        "updatedAt": datetime.utcnow()
                    }
                }
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Error marking reminder as sent: {e}")
            return False
    
    def _convert_objectids_to_str(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """Convert ObjectId fields to strings for JSON serialization."""
        if not doc:
            return doc
        
        # Convert ObjectId fields to strings
        for field in ["_id", "clientId", "organizationId"]:
            if field in doc and doc[field] is not None:
                doc[field] = str(doc[field])
        
        return doc
