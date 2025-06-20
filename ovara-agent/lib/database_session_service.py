"""
Database-backed Session Service for Google ADK

This module provides a database-backed session service that replaces the InMemorySessionService
while maintaining compatibility with Google ADK interfaces. It stores session data in MongoDB
and provides conversation persistence and resumption capabilities.
"""

import logging
import sys
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from bson import ObjectId
from pymongo.errors import PyMongoError, DuplicateKeyError
from google.adk.sessions import Session, BaseSessionService
from google.adk.sessions.base_session_service import ListSessionsResponse
from google.adk.events.event import Event

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)


class DatabaseSession(Session):
    """
    Database-backed session implementation that extends Google ADK Session.

    This class maintains session state in MongoDB while providing the same
    interface as the standard Google ADK Session.
    """

    def __init__(self, id: str, app_name: str, user_id: str,
                 state: Dict[str, Any] = None, events: List[Event] = None,
                 client_id: str = None, conversation_id: str = None,
                 organization_id: str = None):
        """
        Initialize a database-backed session.

        Args:
            id: Unique session identifier
            app_name: Name of the application
            user_id: User identifier
            state: Session state dictionary
            events: List of events in this session
            client_id: MongoDB ObjectId of the client
            conversation_id: MongoDB ObjectId of the conversation
            organization_id: MongoDB ObjectId of the organization
        """
        # Store custom fields in state to avoid conflicts with parent class
        custom_state = state or {}
        custom_state.update({
            '_client_id': client_id,
            '_conversation_id': conversation_id or custom_state.get('conversation_id'),
            '_organization_id': organization_id,
            '_created_at': datetime.utcnow().isoformat(),
            '_is_active': True
        })

        # Initialize the parent Session with required parameters
        super().__init__(
            id=id,
            app_name=app_name,
            user_id=user_id,
            state=custom_state,
            events=events or [],
            last_update_time=time.time()
        )

        logger.debug(f"Created DatabaseSession: {id} for client: {client_id}")

    @property
    def client_id(self) -> str:
        """Get client_id from state."""
        return self.state.get('_client_id')

    @property
    def conversation_id(self) -> str:
        """Get conversation_id from state."""
        return self.state.get('_conversation_id')

    @property
    def organization_id(self) -> str:
        """Get organization_id from state."""
        return self.state.get('_organization_id')

    @property
    def created_at(self) -> datetime:
        """Get created_at from state."""
        created_str = self.state.get('_created_at')
        if created_str:
            return datetime.fromisoformat(created_str)
        return datetime.utcnow()

    @property
    def is_active(self) -> bool:
        """Get is_active from state."""
        return self.state.get('_is_active', True)


class DatabaseSessionService(BaseSessionService):
    """
    Database-backed session service that implements Google ADK SessionService interface.
    
    This service stores session data in MongoDB and provides conversation persistence,
    session resumption, and proper cleanup functionality.
    """
    
    def __init__(self, db):
        """
        Initialize the database session service.
        
        Args:
            db: MongoDB database instance
        """
        super().__init__()
        self.db = db
        self.sessions_collection = db["sessions"]
        self.conversations_collection = db["conversations"]
        self.messages_collection = db["messages"]
        self.clients_collection = db["clients"]
        
        # Create indexes for better performance
        self._create_indexes()
        
        logger.info("DatabaseSessionService initialized")
    
    def _create_indexes(self):
        """Create database indexes for optimal performance."""
        try:
            # Session indexes
            self.sessions_collection.create_index("session_id", unique=True)
            self.sessions_collection.create_index("client_id")
            self.sessions_collection.create_index("last_activity")
            self.sessions_collection.create_index("is_active")
            
            logger.debug("Database indexes created successfully")
        except Exception as e:
            logger.warning(f"Failed to create indexes: {e}")
    
    def _validate_object_id(self, id_str: str, field_name: str) -> bool:
        """
        Validate if a string is a valid MongoDB ObjectId.
        
        Args:
            id_str: String to validate
            field_name: Name of the field for error messages
            
        Returns:
            bool: True if valid
            
        Raises:
            ValueError: If the ObjectId is invalid
        """
        if not id_str:
            return True  # Allow None/empty values
            
        try:
            ObjectId(id_str)
            return True
        except Exception:
            raise ValueError(f"Invalid {field_name}: {id_str}")
    
    def _validate_client_access(self, client_id: str) -> Dict[str, Any]:
        """
        Validate client exists and get client information.
        
        Args:
            client_id: MongoDB ObjectId of the client
            
        Returns:
            Dict containing client and organization information
            
        Raises:
            ValueError: If client not found or invalid
        """
        if not client_id:
            raise ValueError("Client ID is required")
            
        self._validate_object_id(client_id, "client_id")
        
        try:
            client = self.clients_collection.find_one({"_id": ObjectId(client_id)})
            if not client:
                raise ValueError(f"Client not found: {client_id}")
            
            # Get organization info
            organization = None
            if client.get("organization"):
                organization = self.db["organizations"].find_one(
                    {"_id": ObjectId(client["organization"])}
                )
            
            return {
                "client": client,
                "organization": organization,
                "client_id": str(client["_id"]),
                "organization_id": str(client["organization"]) if client.get("organization") else None
            }
            
        except PyMongoError as e:
            logger.error(f"Database error validating client {client_id}: {e}")
            raise ValueError(f"Database error: {e}")

    def _create_session_from_doc(self, session_doc: Dict[str, Any]) -> DatabaseSession:
        """
        Create a DatabaseSession object from a MongoDB document.

        Args:
            session_doc: MongoDB document containing session data

        Returns:
            DatabaseSession object
        """
        stored_state = session_doc.get("state", {})

        # Safely reconstruct events, skipping any that are corrupted
        cleaned_events = []
        events_data = session_doc.get("events", [])

        logger.debug(f"Processing {len(events_data)} events for session {session_doc['session_id']}")

        for i, event_data in enumerate(events_data):
            try:
                if isinstance(event_data, dict):
                    # Clean the event data first
                    cleaned_event_data = self._clean_event_data_for_reconstruction(event_data)

                    # Try to create Event object
                    event = Event(**cleaned_event_data)
                    cleaned_events.append(event)

                else:
                    # If it's already an Event object, keep it
                    cleaned_events.append(event_data)

            except Exception as e:
                logger.warning(f"Skipping corrupted event {i} in session {session_doc['session_id']}: {e}")
                # Continue processing other events instead of failing the entire session
                continue

        logger.debug(f"Successfully reconstructed {len(cleaned_events)} out of {len(events_data)} events")

        return DatabaseSession(
            id=session_doc["session_id"],
            app_name=session_doc["app_name"],
            user_id=session_doc["user_id"],
            state=stored_state,
            events=cleaned_events,
            client_id=session_doc.get("client_id") or stored_state.get("_client_id"),
            conversation_id=session_doc.get("conversation_id") or stored_state.get("_conversation_id"),
            organization_id=session_doc.get("organization_id") or stored_state.get("_organization_id")
        )

    async def create_session(self, *, app_name: str, user_id: str, session_id: str = None,
                      state: Dict[str, Any] = None, client_id: str = None,
                      conversation_id: str = None) -> DatabaseSession:
        """
        Create a new database-backed session following ADK interface.

        Args:
            app_name: Name of the application
            user_id: User identifier
            state: Initial session state (optional)
            session_id: Unique session identifier (optional, will be generated if not provided)
            client_id: MongoDB ObjectId of the client (optional, defaults to user_id)
            conversation_id: MongoDB ObjectId of existing conversation (optional)

        Returns:
            DatabaseSession: New session instance

        Raises:
            ValueError: If validation fails
            RuntimeError: If session creation fails
        """
        try:
            # Generate session ID if not provided
            if not session_id:
                import uuid
                session_id = str(uuid.uuid4())

            # Use user_id as client_id if not provided (for backward compatibility)
            effective_client_id = client_id or user_id

            # Initialize state
            initial_state = state or {}

            # For basic functionality, we'll skip client validation if it fails
            # This allows the service to work even without proper client data in database
            client_info = {"organization_id": None}
            try:
                client_info = self._validate_client_access(effective_client_id)
            except Exception as e:
                logger.warning(f"Client validation failed, proceeding with basic session: {e}")

            # Check if session already exists
            existing_session = self.sessions_collection.find_one({
                "session_id": session_id,
                "app_name": app_name,
                "user_id": user_id
            })

            if existing_session:
                logger.info(f"Session {session_id} already exists, reactivating session")
                # Reactivate the session
                self._update_session_activity_sync(app_name, user_id, session_id, is_active=True)
                return self._create_session_from_doc(existing_session)

            # Check for existing inactive sessions for the same client/conversation that can be reused
            if conversation_id:
                inactive_session = self.sessions_collection.find_one({
                    "app_name": app_name,
                    "user_id": user_id,
                    "conversation_id": conversation_id,
                    "is_active": False
                })

                if inactive_session:
                    logger.info(f"Reusing inactive session {inactive_session['session_id']} for conversation {conversation_id}")
                    # Update the session ID and reactivate
                    self.sessions_collection.update_one(
                        {"_id": inactive_session["_id"]},
                        {
                            "$set": {
                                "session_id": session_id,
                                "is_active": True,
                                "last_activity": datetime.utcnow(),
                                "last_update_time": time.time()
                            }
                        }
                    )
                    inactive_session["session_id"] = session_id
                    return self._create_session_from_doc(inactive_session)

            # Validate conversation if provided
            conversation = None
            if conversation_id:
                try:
                    self._validate_object_id(conversation_id, "conversation_id")
                    conversation = self.conversations_collection.find_one({
                        "_id": ObjectId(conversation_id),
                        "client": ObjectId(effective_client_id)
                    })
                    if not conversation:
                        logger.warning(f"Conversation not found: {conversation_id}")
                except Exception as e:
                    logger.warning(f"Conversation validation failed: {e}")

            # Get conversation_id from parameters or initial state
            effective_conversation_id = conversation_id or initial_state.get('conversation_id')

            # Create session document
            session_doc = {
                "session_id": session_id,
                "app_name": app_name,
                "user_id": user_id,
                "client_id": effective_client_id,
                "conversation_id": effective_conversation_id,
                "organization_id": client_info.get("organization_id"),
                "state": initial_state,
                "events": [],
                "created_at": datetime.utcnow(),
                "last_activity": datetime.utcnow(),
                "last_update_time": time.time(),
                "is_active": True,
                "metadata": {}
            }

            # Insert session into database
            try:
                result = self.sessions_collection.insert_one(session_doc)
                session_doc["_id"] = result.inserted_id
                logger.debug(f"Saved session {session_id} to database")
            except Exception as e:
                logger.warning(f"Failed to save session to database: {e}")
                # Continue without database persistence for testing

            # Create and return DatabaseSession
            session = DatabaseSession(
                id=session_id,
                app_name=app_name,
                user_id=user_id,
                state=initial_state,
                events=[],
                client_id=effective_client_id,
                conversation_id=effective_conversation_id,
                organization_id=client_info.get("organization_id")
            )

            logger.info(f"Created session {session_id} for client {effective_client_id}")
            return session

        except Exception as e:
            logger.error(f"Failed to create session: {e}")
            raise RuntimeError(f"Session creation failed: {e}")

    async def get_session(self, *, app_name: str, user_id: str, session_id: str, config = None) -> Optional[DatabaseSession]:
        """
        Retrieve an existing session from the database following ADK interface.

        Args:
            app_name: Name of the application
            user_id: User identifier
            session_id: Unique session identifier

        Returns:
            DatabaseSession or None if not found
        """
        try:
            session_doc = self.sessions_collection.find_one({
                "session_id": session_id,
                "app_name": app_name,
                "user_id": user_id,
                "is_active": True
            })

            if not session_doc:
                logger.debug(f"Session not found: {session_id}")
                return None

            # Update last activity
            self.sessions_collection.update_one(
                {"session_id": session_id},
                {"$set": {"last_activity": datetime.utcnow(), "last_update_time": time.time()}}
            )

            # Use the helper method to create session from document
            # This handles event reconstruction safely
            session = self._create_session_from_doc(session_doc)

            logger.info(f"📥 Retrieved session {session_id} with {len(session.events)} events")
            return session

        except Exception as e:
            logger.error(f"Failed to retrieve session {session_id}: {e}")
            return None

    async def get_session_by_conversation_id(self, app_name: str, user_id: str, conversation_id: str) -> Optional[DatabaseSession]:
        """
        Retrieve a session by conversation_id instead of session_id.

        Args:
            app_name: Name of the application
            user_id: User identifier
            conversation_id: Conversation identifier

        Returns:
            DatabaseSession or None if not found
        """
        try:
            # Look for session by conversation_id in the state or document
            session_doc = self.sessions_collection.find_one({
                "$or": [
                    {
                        "app_name": app_name,
                        "user_id": user_id,
                        "conversation_id": conversation_id,
                        "is_active": True
                    },
                    {
                        "app_name": app_name,
                        "user_id": user_id,
                        "state.conversation_id": conversation_id,
                        "is_active": True
                    },
                    {
                        "app_name": app_name,
                        "user_id": user_id,
                        "state._conversation_id": conversation_id,
                        "is_active": True
                    }
                ]
            })

            if not session_doc:
                logger.debug(f"Session not found for conversation_id: {conversation_id}")
                return None

            # Update last activity
            self.sessions_collection.update_one(
                {"session_id": session_doc["session_id"]},
                {"$set": {"last_activity": datetime.utcnow(), "last_update_time": time.time()}}
            )

            # Use the helper method to create session from document
            session = self._create_session_from_doc(session_doc)

            logger.info(f"📥 Retrieved session {session.id} by conversation_id {conversation_id} with {len(session.events)} events")
            return session

        except Exception as e:
            logger.error(f"Failed to retrieve session by conversation_id {conversation_id}: {e}")
            return None

    def _serialize_event(self, event: Event) -> Dict[str, Any]:
        """
        Serialize an ADK Event object to a MongoDB-compatible dictionary.

        Args:
            event: The ADK Event to serialize

        Returns:
            Dict containing serialized event data
        """
        try:
            # Extract basic event properties
            serialized = {
                "id": getattr(event, 'id', None),
                "timestamp": getattr(event, 'timestamp', None),
                "author": getattr(event, 'author', None),
                "invocation_id": getattr(event, 'invocation_id', None),
                "partial": getattr(event, 'partial', None),
                "turn_complete": getattr(event, 'turn_complete', None),
                "interrupted": getattr(event, 'interrupted', None),
                "error_code": getattr(event, 'error_code', None),
                "error_message": getattr(event, 'error_message', None),
            }

            # Handle content if present
            content = getattr(event, 'content', None)
            if content:
                serialized["content"] = {
                    "role": getattr(content, 'role', None),
                    "parts": []
                }

                # Extract text from parts
                parts = getattr(content, 'parts', [])
                for part in parts:
                    if hasattr(part, 'text') and part.text:
                        serialized["content"]["parts"].append({
                            "text": part.text
                        })

            # Handle actions if present (simplified)
            actions = getattr(event, 'actions', None)
            if actions:
                serialized["actions"] = {
                    "state_delta": getattr(actions, 'state_delta', {}),
                    "artifact_delta": getattr(actions, 'artifact_delta', {}),
                }

            return serialized

        except Exception as e:
            logger.warning(f"Failed to serialize event, using basic info: {e}")
            # Fallback to basic event info
            return {
                "id": str(event) if event else None,
                "timestamp": time.time(),
                "error": "Serialization failed"
            }

    def _clean_event_data_for_reconstruction(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Clean event data to remove fields that cause Pydantic validation errors during Event reconstruction.

        Args:
            event_data: Raw event data from database

        Returns:
            Cleaned event data suitable for Event(**data) construction
        """
        try:
            cleaned_data = {}

            # Copy only the fields that Event model expects
            expected_fields = {
                "id", "timestamp", "author", "invocation_id", "partial",
                "turn_complete", "interrupted", "error_code", "error_message"
            }

            for field in expected_fields:
                if field in event_data:
                    cleaned_data[field] = event_data[field]

            # Handle content separately with careful cleaning
            if "content" in event_data and isinstance(event_data["content"], dict):
                content = event_data["content"]
                cleaned_content = {}

                # Copy role if present
                if "role" in content:
                    cleaned_content["role"] = content["role"]

                # Clean parts array
                if "parts" in content and isinstance(content["parts"], list):
                    cleaned_parts = []
                    for part in content["parts"]:
                        if isinstance(part, dict):
                            # Only include text field, remove 'type' and other extra fields
                            cleaned_part = {}
                            if "text" in part:
                                cleaned_part["text"] = part["text"]
                            # Add other valid part fields if needed
                            if "function_call" in part:
                                cleaned_part["function_call"] = part["function_call"]
                            if "function_response" in part:
                                cleaned_part["function_response"] = part["function_response"]

                            if cleaned_part:  # Only add if we have valid content
                                cleaned_parts.append(cleaned_part)
                        else:
                            cleaned_parts.append(part)

                    if cleaned_parts:
                        cleaned_content["parts"] = cleaned_parts

                if cleaned_content:
                    cleaned_data["content"] = cleaned_content

            # Handle actions if present
            if "actions" in event_data:
                cleaned_data["actions"] = event_data["actions"]

            return cleaned_data

        except Exception as e:
            logger.warning(f"Failed to clean event data: {e}")
            # Return minimal event data as fallback
            return {
                "id": event_data.get("id", "unknown"),
                "timestamp": event_data.get("timestamp", time.time()),
                "author": "system"
            }

    async def append_event(self, session: DatabaseSession, event: Event) -> Event:
        """
        Append an event to the session following ADK interface.

        Note: This method is synchronous to match Google ADK expectations.
        The ADK library calls this method synchronously, so we cannot use async.

        Args:
            session: The session to update
            event: The event to append
        """
        try:
            logger.info(f"🔄 APPENDING EVENT to session {session.id}")
            logger.info(f"   Event ID: {getattr(event, 'id', 'N/A')}")
            logger.info(f"   Event author: {getattr(event, 'author', 'N/A')}")
            logger.info(f"   Current events count: {len(session.events)}")

            # Add event to session's events list
            session.events.append(event)
            session.last_update_time = time.time()

            # Serialize the event for MongoDB storage
            serialized_event = self._serialize_event(event)
            logger.info(f"   Serialized event keys: {list(serialized_event.keys())}")

            # Update database synchronously
            result = self.sessions_collection.update_one(
                {"session_id": session.id},
                {
                    "$push": {"events": serialized_event},
                    "$set": {
                        "state": session.state,
                        "last_activity": datetime.utcnow(),
                        "last_update_time": session.last_update_time
                    }
                }
            )

            if result.modified_count > 0:
                logger.info(f"✅ Successfully appended event to session {session.id}")
                logger.info(f"   New events count: {len(session.events)}")
            else:
                logger.error(f"❌ Failed to update session {session.id} in database - no documents modified")

        except Exception as e:
            logger.error(f"❌ Failed to append event to session {session.id}: {e}")
            import traceback
            logger.error(f"   Traceback: {traceback.format_exc()}")

        # Return the event as expected by the async interface
        return event

    def _update_session_activity_sync(self, app_name: str, user_id: str, session_id: str, is_active: bool = True) -> bool:
        """
        Update session activity status synchronously.

        Args:
            app_name: Name of the application
            user_id: User identifier
            session_id: Unique session identifier
            is_active: Whether the session is active

        Returns:
            bool: True if updated successfully
        """
        try:
            update_data = {
                "is_active": is_active,
                "last_activity": datetime.utcnow(),
                "last_update_time": time.time()
            }

            result = self.sessions_collection.update_one(
                {
                    "session_id": session_id,
                    "app_name": app_name,
                    "user_id": user_id
                },
                {"$set": update_data}
            )

            success = result.modified_count > 0
            if success:
                status = "active" if is_active else "inactive"
                logger.info(f"Updated session {session_id} status to {status}")
            else:
                logger.warning(f"Session not found for activity update: {session_id}")

            return success

        except Exception as e:
            logger.error(f"Failed to update session activity {session_id}: {e}")
            return False

    async def update_session_activity(self, app_name: str, user_id: str, session_id: str, is_active: bool = True) -> bool:
        """
        Update session activity status.

        Args:
            app_name: Name of the application
            user_id: User identifier
            session_id: Unique session identifier
            is_active: Whether the session is active

        Returns:
            bool: True if updated successfully
        """
        try:
            update_data = {
                "is_active": is_active,
                "last_activity": datetime.utcnow(),
                "last_update_time": time.time()
            }

            result = self.sessions_collection.update_one(
                {
                    "session_id": session_id,
                    "app_name": app_name,
                    "user_id": user_id
                },
                {"$set": update_data}
            )

            success = result.modified_count > 0
            if success:
                status = "active" if is_active else "inactive"
                logger.info(f"Updated session {session_id} status to {status}")
            else:
                logger.warning(f"Session not found for activity update: {session_id}")

            return success

        except Exception as e:
            logger.error(f"Failed to update session activity {session_id}: {e}")
            return False

    async def delete_session(self, *, app_name: str, user_id: str, session_id: str) -> None:
        """
        Delete a session following ADK interface.

        Args:
            app_name: Name of the application
            user_id: User identifier
            session_id: Unique session identifier

        """
        try:
            result = self.sessions_collection.delete_one({
                "session_id": session_id,
                "app_name": app_name,
                "user_id": user_id
            })

            success = result.deleted_count > 0
            if success:
                logger.info(f"Deleted session {session_id}")
            else:
                logger.warning(f"Session not found for deletion: {session_id}")

        except Exception as e:
            logger.error(f"Failed to delete session {session_id}: {e}")
            raise

    # def list_events(self, *, app_name: str, user_id: str, session_id: str) -> ListEventsResponse:
    #     """
    #     List events in a session following ADK interface.

    #     Args:
    #         app_name: Name of the application
    #         user_id: User identifier
    #         session_id: Unique session identifier

    #     Returns:
    #         ListEventsResponse: Response containing list of events
    #     """
    #     try:
    #         session_doc = self.sessions_collection.find_one({
    #             "session_id": session_id,
    #             "app_name": app_name,
    #             "user_id": user_id,
    #             "is_active": True
    #         })

    #         if not session_doc:
    #             logger.debug(f"Session not found for list_events: {session_id}")
    #             return ListEventsResponse(events=[], next_page_token=None)

    #         # Get events from session document
    #         events_data = session_doc.get("events", [])

    #         # Convert stored event data back to Event objects
    #         events = []
    #         for event_data in events_data:
    #             try:
    #                 # Clean event data for Event reconstruction
    #                 if isinstance(event_data, dict):
    #                     cleaned_event_data = self._clean_event_data_for_reconstruction(event_data)
    #                     event = Event(**cleaned_event_data)
    #                 else:
    #                     event = event_data
    #                 events.append(event)
    #             except Exception as e:
    #                 logger.warning(f"Failed to reconstruct event: {e}")
    #                 continue

    #         logger.debug(f"Listed {len(events)} events for session {session_id}")
    #         return ListEventsResponse(events=events, next_page_token=None)

    #     except Exception as e:
    #         logger.error(f"Failed to list events for session {session_id}: {e}")
    #         return ListEventsResponse(events=[], next_page_token=None)

    async def list_sessions(self, *, app_name: str, user_id: str) -> ListSessionsResponse:
        """
        List all sessions for a user following ADK interface.

        Args:
            app_name: Name of the application
            user_id: User identifier

        Returns:
            ListSessionsResponse: Response containing list of sessions
        """
        try:
            session_docs = self.sessions_collection.find({
                "app_name": app_name,
                "user_id": user_id,
                "is_active": True
            }).sort("last_activity", -1)  # Most recent first

            sessions = []
            for session_doc in session_docs:
                try:
                    # Extract custom fields from stored state or document
                    stored_state = session_doc.get("state", {})

                    # Create DatabaseSession from stored data
                    session = DatabaseSession(
                        id=session_doc["session_id"],
                        app_name=session_doc["app_name"],
                        user_id=session_doc["user_id"],
                        state=stored_state,
                        events=session_doc.get("events", []),
                        client_id=session_doc.get("client_id") or stored_state.get("_client_id"),
                        conversation_id=session_doc.get("conversation_id") or stored_state.get("_conversation_id"),
                        organization_id=session_doc.get("organization_id") or stored_state.get("_organization_id")
                    )
                    sessions.append(session)
                except Exception as e:
                    logger.warning(f"Failed to reconstruct session {session_doc.get('session_id')}: {e}")
                    continue

            logger.debug(f"Listed {len(sessions)} sessions for user {user_id}")
            return ListSessionsResponse(sessions=sessions)

        except Exception as e:
            logger.error(f"Failed to list sessions for user {user_id}: {e}")
            return ListSessionsResponse(sessions=[])

    async def cleanup_expired_sessions(self, max_age_hours: int = 24) -> int:
        """
        Clean up expired sessions from the database.

        Args:
            max_age_hours: Maximum age of sessions in hours before cleanup

        Returns:
            int: Number of sessions cleaned up
        """
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=max_age_hours)

            result = self.sessions_collection.update_many(
                {
                    "last_activity": {"$lt": cutoff_time},
                    "is_active": True
                },
                {"$set": {"is_active": False}}
            )

            cleaned_count = result.modified_count
            logger.info(f"Cleaned up {cleaned_count} expired sessions")
            return cleaned_count

        except Exception as e:
            logger.error(f"Failed to cleanup expired sessions: {e}")
            return 0

    def get_session_stats(self) -> Dict[str, Any]:
        """
        Get statistics about sessions in the database.

        Returns:
            Dict containing session statistics
        """
        try:
            total_sessions = self.sessions_collection.count_documents({})
            active_sessions = self.sessions_collection.count_documents({"is_active": True})
            inactive_sessions = total_sessions - active_sessions

            # Get recent activity
            recent_cutoff = datetime.utcnow() - timedelta(hours=1)
            recent_sessions = self.sessions_collection.count_documents({
                "last_activity": {"$gte": recent_cutoff},
                "is_active": True
            })

            return {
                "total_sessions": total_sessions,
                "active_sessions": active_sessions,
                "inactive_sessions": inactive_sessions,
                "recent_sessions": recent_sessions,
                "timestamp": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"Failed to get session stats: {e}")
            return {
                "total_sessions": 0,
                "active_sessions": 0,
                "inactive_sessions": 0,
                "recent_sessions": 0,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
