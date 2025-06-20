"""
Agent Session Model for Multi-Agent System

This model tracks agent sessions and handoffs between different agents
in the multi-agent system, providing coordination and context management.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from bson import ObjectId
from pymongo import MongoClient
from pymongo.errors import PyMongoError
import logging

logger = logging.getLogger(__name__)


class AgentSession:
    """
    Agent Session model for tracking multi-agent workflows and handoffs.
    
    This class manages the lifecycle of agent sessions, including:
    - Current active agent tracking
    - Agent handoff history
    - Shared state between agents
    - Session status management
    """
    
    def __init__(self, db):
        """
        Initialize AgentSession with database connection.
        
        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.collection = db["agent_sessions"]
        self._create_indexes()
    
    def _create_indexes(self):
        """Create database indexes for performance optimization."""
        try:
            # Index for client and organization queries
            self.collection.create_index([("clientId", 1), ("status", 1)])
            self.collection.create_index([("organizationId", 1), ("createdAt", -1)])
            self.collection.create_index([("sessionId", 1)], unique=True)
            self.collection.create_index([("currentAgent", 1), ("status", 1)])
            logger.debug("AgentSession indexes created successfully")
        except Exception as e:
            logger.warning(f"Failed to create AgentSession indexes: {e}")
    
    def create_session(self, session_id: str, client_id: str, organization_id: str, 
                      conversation_id: Optional[str] = None, 
                      initial_agent: str = "orchestrator_agent") -> Dict[str, Any]:
        """
        Create a new agent session.
        
        Args:
            session_id: Unique session identifier
            client_id: MongoDB ObjectId of the client
            organization_id: MongoDB ObjectId of the organization
            conversation_id: MongoDB ObjectId of the conversation (optional)
            initial_agent: Name of the initial agent (default: orchestrator_agent)
            
        Returns:
            Dict containing the created session data
            
        Raises:
            ValueError: If validation fails
            RuntimeError: If database operation fails
        """
        try:
            # Validate ObjectIds
            if not ObjectId.is_valid(client_id):
                raise ValueError(f"Invalid client_id: {client_id}")
            if not ObjectId.is_valid(organization_id):
                raise ValueError(f"Invalid organization_id: {organization_id}")
            if conversation_id and not ObjectId.is_valid(conversation_id):
                raise ValueError(f"Invalid conversation_id: {conversation_id}")
            
            # Create session document
            session_doc = {
                "sessionId": session_id,
                "clientId": ObjectId(client_id),
                "organizationId": ObjectId(organization_id),
                "conversationId": ObjectId(conversation_id) if conversation_id else None,
                "currentAgent": initial_agent,
                "agentHistory": [{
                    "agent": initial_agent,
                    "startTime": datetime.utcnow(),
                    "endTime": None,
                    "context": {},
                    "handoffReason": "session_start"
                }],
                "sharedState": {},
                "status": "active",
                "metadata": {},
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
            }
            
            # Insert session
            result = self.collection.insert_one(session_doc)
            session_doc["_id"] = result.inserted_id
            
            logger.info(f"Created agent session {session_id} for client {client_id}")
            return self._convert_objectids_to_str(session_doc)
            
        except ValueError:
            raise
        except PyMongoError as e:
            logger.error(f"Database error creating agent session: {e}")
            raise RuntimeError(f"Database error: {e}")
        except Exception as e:
            logger.error(f"Unexpected error creating agent session: {e}")
            raise RuntimeError(f"Unexpected error: {e}")
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get agent session by session ID.
        
        Args:
            session_id: Session identifier
            
        Returns:
            Session document or None if not found
        """
        try:
            session = self.collection.find_one({"sessionId": session_id})
            return self._convert_objectids_to_str(session) if session else None
        except Exception as e:
            logger.error(f"Error retrieving agent session {session_id}: {e}")
            return None
    
    def handoff_agent(self, session_id: str, from_agent: str, to_agent: str, 
                     reason: str, context: Optional[Dict[str, Any]] = None) -> bool:
        """
        Perform agent handoff within a session.
        
        Args:
            session_id: Session identifier
            from_agent: Current agent name
            to_agent: Target agent name
            reason: Reason for handoff
            context: Additional context for handoff
            
        Returns:
            True if handoff successful, False otherwise
        """
        try:
            now = datetime.utcnow()
            
            # Update current agent history entry end time
            self.collection.update_one(
                {
                    "sessionId": session_id,
                    "agentHistory.agent": from_agent,
                    "agentHistory.endTime": None
                },
                {
                    "$set": {
                        "agentHistory.$.endTime": now
                    }
                }
            )
            
            # Add new agent history entry and update current agent
            result = self.collection.update_one(
                {"sessionId": session_id},
                {
                    "$set": {
                        "currentAgent": to_agent,
                        "updatedAt": now
                    },
                    "$push": {
                        "agentHistory": {
                            "agent": to_agent,
                            "startTime": now,
                            "endTime": None,
                            "context": context or {},
                            "handoffReason": reason
                        }
                    }
                }
            )
            
            if result.modified_count > 0:
                logger.info(f"Agent handoff: {from_agent} -> {to_agent} in session {session_id}")
                return True
            else:
                logger.warning(f"Failed to perform agent handoff in session {session_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error performing agent handoff: {e}")
            return False
    
    def update_shared_state(self, session_id: str, state_updates: Dict[str, Any]) -> bool:
        """
        Update shared state for a session.
        
        Args:
            session_id: Session identifier
            state_updates: Dictionary of state updates
            
        Returns:
            True if update successful, False otherwise
        """
        try:
            # Build update operations for nested state updates
            update_ops = {}
            for key, value in state_updates.items():
                update_ops[f"sharedState.{key}"] = value
            
            update_ops["updatedAt"] = datetime.utcnow()
            
            result = self.collection.update_one(
                {"sessionId": session_id},
                {"$set": update_ops}
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Error updating shared state for session {session_id}: {e}")
            return False
    
    def get_client_sessions(self, client_id: str, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get all sessions for a client.
        
        Args:
            client_id: Client identifier
            status: Optional status filter
            
        Returns:
            List of session documents
        """
        try:
            if not ObjectId.is_valid(client_id):
                raise ValueError(f"Invalid client_id: {client_id}")
            
            query = {"clientId": ObjectId(client_id)}
            if status:
                query["status"] = status
            
            sessions = list(self.collection.find(query).sort("createdAt", -1))
            return [self._convert_objectids_to_str(session) for session in sessions]
            
        except Exception as e:
            logger.error(f"Error retrieving client sessions: {e}")
            return []
    
    def close_session(self, session_id: str) -> bool:
        """
        Close an agent session.
        
        Args:
            session_id: Session identifier
            
        Returns:
            True if session closed successfully, False otherwise
        """
        try:
            now = datetime.utcnow()
            
            # Update current agent history entry end time
            self.collection.update_one(
                {
                    "sessionId": session_id,
                    "agentHistory.endTime": None
                },
                {
                    "$set": {
                        "agentHistory.$.endTime": now
                    }
                }
            )
            
            # Update session status
            result = self.collection.update_one(
                {"sessionId": session_id},
                {
                    "$set": {
                        "status": "completed",
                        "updatedAt": now
                    }
                }
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Error closing session {session_id}: {e}")
            return False
    
    def _convert_objectids_to_str(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """Convert ObjectId fields to strings for JSON serialization."""
        if not doc:
            return doc
        
        # Convert ObjectId fields to strings
        for field in ["_id", "clientId", "organizationId", "conversationId"]:
            if field in doc and doc[field] is not None:
                doc[field] = str(doc[field])
        
        return doc
