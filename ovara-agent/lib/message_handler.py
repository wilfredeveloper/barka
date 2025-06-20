"""
Message Persistence Handler for ovara-agent

This module provides message storage and retrieval functionality that integrates
with the existing barka-backend MongoDB schemas. It handles saving user and agent
messages, conversation management, and message history loading for session resumption.
"""

import logging
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from bson import ObjectId
from pymongo.errors import PyMongoError
from lib.utils import _validate_object_id, _convert_objectid_to_str

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)


class MessageHandler:
    """
    Handles message persistence and conversation management for ovara-agent.
    
    This class provides methods to save messages, manage conversations, and load
    conversation history while maintaining compatibility with barka-backend schemas.
    """
    
    def __init__(self, db):
        """
        Initialize the message handler.
        
        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.messages_collection = db["messages"]
        self.conversations_collection = db["conversations"]
        self.clients_collection = db["clients"]
        
        logger.info("MessageHandler initialized")
    
    async def create_or_get_conversation(self, client_id: str, conversation_id: str = None, 
                                       title: str = "New Conversation") -> Dict[str, Any]:
        """
        Create a new conversation or retrieve an existing one.
        
        Args:
            client_id: MongoDB ObjectId of the client
            conversation_id: MongoDB ObjectId of existing conversation (optional)
            title: Title for new conversation
            
        Returns:
            Dict containing conversation data
            
        Raises:
            ValueError: If validation fails
            RuntimeError: If database operation fails
        """
        try:
            if not _validate_object_id(client_id):
                raise ValueError(f"Invalid client_id: {client_id}")
            
            # If conversation_id provided, try to retrieve existing conversation
            if conversation_id:
                if not _validate_object_id(conversation_id):
                    raise ValueError(f"Invalid conversation_id: {conversation_id}")
                
                conversation = self.conversations_collection.find_one({
                    "_id": ObjectId(conversation_id),
                    "client": ObjectId(client_id)
                })
                
                if conversation:
                    logger.debug(f"Retrieved existing conversation {conversation_id}")
                    return _convert_objectid_to_str(conversation)
                else:
                    logger.warning(f"Conversation {conversation_id} not found for client {client_id}")
            
            # Get client info for organization
            client = self.clients_collection.find_one({"_id": ObjectId(client_id)})
            if not client:
                raise ValueError(f"Client not found: {client_id}")
            
            organization_id = client.get("organization")
            if not organization_id:
                raise ValueError(f"Client {client_id} has no organization")
            
            # Create new conversation
            conversation_doc = {
                "client": ObjectId(client_id),
                "organization": ObjectId(organization_id),
                "title": title,
                "status": "active",
                "lastMessageAt": datetime.utcnow(),
                "metadata": {},
                "tags": [],
                "memoryContext": {},
                "extractedInformation": {}
            }
            
            result = self.conversations_collection.insert_one(conversation_doc)
            conversation_doc["_id"] = result.inserted_id
            
            logger.info(f"Created new conversation {result.inserted_id} for client {client_id}")
            return _convert_objectid_to_str(conversation_doc)
            
        except ValueError:
            raise
        except PyMongoError as e:
            logger.error(f"Database error in create_or_get_conversation: {e}")
            raise RuntimeError(f"Database error: {e}")
        except Exception as e:
            logger.error(f"Unexpected error in create_or_get_conversation: {e}")
            raise RuntimeError(f"Unexpected error: {e}")
    
    async def save_user_message(self, conversation_id: str, content: str, 
                              metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Save a user message to the database.
        
        Args:
            conversation_id: MongoDB ObjectId of the conversation
            content: Message content
            metadata: Additional message metadata
            
        Returns:
            Dict containing saved message data
            
        Raises:
            ValueError: If validation fails
            RuntimeError: If database operation fails
        """
        try:
            if not _validate_object_id(conversation_id):
                raise ValueError(f"Invalid conversation_id: {conversation_id}")
            
            if not content or not content.strip():
                raise ValueError("Message content cannot be empty")
            
            # Check for duplicate messages within the last 5 seconds
            five_seconds_ago = datetime.utcnow() - timedelta(seconds=5)
            
            # Find recent duplicate messages
            recent_duplicates = list(self.messages_collection.find({
                "conversation": ObjectId(conversation_id),
                "sender": "user",
                "content": content.strip(),
                "createdAt": {"$gte": five_seconds_ago}
            }).sort("createdAt", -1).limit(1))
            
            # If duplicate found, return it instead of creating a new one
            if recent_duplicates:
                logger.info(f"Found duplicate user message in conversation {conversation_id}, using existing message")
                return _convert_objectid_to_str(recent_duplicates[0])
            
            # Create message document with explicit timestamps
            now = datetime.utcnow()
            message_doc = {
                "conversation": ObjectId(conversation_id),
                "sender": "user",
                "content": content.strip(),
                "structuredContent": None,
                "isImportant": False,
                "readByAdmin": False,
                "hasAttachment": False,
                "attachments": [],
                "metadata": metadata or {},
                "createdAt": now,
                "updatedAt": now
            }
            
            # Insert message
            result = self.messages_collection.insert_one(message_doc)
            message_doc["_id"] = result.inserted_id
            
            # Update conversation lastMessageAt
            self.conversations_collection.update_one(
                {"_id": ObjectId(conversation_id)},
                {"$set": {"lastMessageAt": now}}
            )
            
            logger.info(f"Saved user message {result.inserted_id} to conversation {conversation_id}")
            return _convert_objectid_to_str(message_doc)
            
        except ValueError:
            raise
        except PyMongoError as e:
            logger.error(f"Database error saving user message: {e}")
            raise RuntimeError(f"Database error: {e}")
        except Exception as e:
            logger.error(f"Unexpected error saving user message: {e}")
            raise RuntimeError(f"Unexpected error: {e}")
    
    async def save_agent_message(self, conversation_id: str, content: str, 
                               structured_content: Dict[str, Any] = None,
                               metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Save an agent message to the database.
        
        Args:
            conversation_id: MongoDB ObjectId of the conversation
            content: Message content
            structured_content: Structured data like tool calls
            metadata: Additional message metadata
            
        Returns:
            Dict containing saved message data
            
        Raises:
            ValueError: If validation fails
            RuntimeError: If database operation fails
        """
        try:
            if not _validate_object_id(conversation_id):
                raise ValueError(f"Invalid conversation_id: {conversation_id}")
            
            if not content or not content.strip():
                raise ValueError("Message content cannot be empty")
            
            # Check for duplicate messages within the last 5 seconds
            five_seconds_ago = datetime.utcnow() - timedelta(seconds=5)
            
            # Find recent duplicate messages
            recent_duplicates = list(self.messages_collection.find({
                "conversation": ObjectId(conversation_id),
                "sender": "agent",
                "content": content.strip(),
                "createdAt": {"$gte": five_seconds_ago}
            }).sort("createdAt", -1).limit(1))
            
            # If duplicate found, return it instead of creating a new one
            if recent_duplicates:
                logger.info(f"Found duplicate agent message in conversation {conversation_id}, using existing message")
                return _convert_objectid_to_str(recent_duplicates[0])
            
            # Create message document with explicit timestamps
            now = datetime.utcnow()
            message_doc = {
                "conversation": ObjectId(conversation_id),
                "sender": "agent",
                "content": content.strip(),
                "structuredContent": structured_content,
                "isImportant": False,
                "readByAdmin": False,
                "hasAttachment": False,
                "attachments": [],
                "metadata": metadata or {},
                "createdAt": now,
                "updatedAt": now
            }
            
            # Insert message
            result = self.messages_collection.insert_one(message_doc)
            message_doc["_id"] = result.inserted_id
            
            # Update conversation lastMessageAt
            self.conversations_collection.update_one(
                {"_id": ObjectId(conversation_id)},
                {"$set": {"lastMessageAt": now}}
            )
            
            logger.info(f"Saved agent message {result.inserted_id} to conversation {conversation_id}")
            return _convert_objectid_to_str(message_doc)
            
        except ValueError:
            raise
        except PyMongoError as e:
            logger.error(f"Database error saving agent message: {e}")
            raise RuntimeError(f"Database error: {e}")
        except Exception as e:
            logger.error(f"Unexpected error saving agent message: {e}")
            raise RuntimeError(f"Unexpected error: {e}")

    async def load_conversation_history(self, conversation_id: str, limit: int = 50,
                                      include_system: bool = False) -> List[Dict[str, Any]]:
        """
        Load conversation history for session resumption.

        Args:
            conversation_id: MongoDB ObjectId of the conversation
            limit: Maximum number of messages to load
            include_system: Whether to include system messages

        Returns:
            List of message documents ordered by creation time

        Raises:
            ValueError: If validation fails
            RuntimeError: If database operation fails
        """
        try:
            if not _validate_object_id(conversation_id):
                raise ValueError(f"Invalid conversation_id: {conversation_id}")

            # Build query
            query = {"conversation": ObjectId(conversation_id)}
            if not include_system:
                query["sender"] = {"$in": ["user", "agent"]}

            # Load messages
            messages = list(self.messages_collection.find(query)
                          .sort("createdAt", 1)  # Ascending order for chronological history
                          .limit(limit))

            # Convert ObjectIds to strings
            messages_serializable = [_convert_objectid_to_str(msg) for msg in messages]

            logger.debug(f"Loaded {len(messages)} messages for conversation {conversation_id}")
            return messages_serializable

        except ValueError:
            raise
        except PyMongoError as e:
            logger.error(f"Database error loading conversation history: {e}")
            raise RuntimeError(f"Database error: {e}")
        except Exception as e:
            logger.error(f"Unexpected error loading conversation history: {e}")
            raise RuntimeError(f"Unexpected error: {e}")

    async def get_conversation_summary(self, conversation_id: str) -> Dict[str, Any]:
        """
        Get summary information about a conversation.

        Args:
            conversation_id: MongoDB ObjectId of the conversation

        Returns:
            Dict containing conversation summary

        Raises:
            ValueError: If validation fails
            RuntimeError: If database operation fails
        """
        try:
            if not _validate_object_id(conversation_id):
                raise ValueError(f"Invalid conversation_id: {conversation_id}")

            # Get conversation
            conversation = self.conversations_collection.find_one(
                {"_id": ObjectId(conversation_id)}
            )

            if not conversation:
                raise ValueError(f"Conversation not found: {conversation_id}")

            # Get message count and latest message
            message_count = self.messages_collection.count_documents(
                {"conversation": ObjectId(conversation_id)}
            )

            latest_message = self.messages_collection.find_one(
                {"conversation": ObjectId(conversation_id)},
                sort=[("createdAt", -1)]
            )

            summary = {
                "conversation_id": conversation_id,
                "title": conversation.get("title", "Untitled"),
                "status": conversation.get("status", "active"),
                "message_count": message_count,
                "created_at": conversation.get("createdAt"),
                "last_message_at": conversation.get("lastMessageAt"),
                "latest_message": _convert_objectid_to_str(latest_message) if latest_message else None,
                "client_id": str(conversation["client"]),
                "organization_id": str(conversation["organization"])
            }

            logger.debug(f"Generated summary for conversation {conversation_id}")
            return summary

        except ValueError:
            raise
        except PyMongoError as e:
            logger.error(f"Database error getting conversation summary: {e}")
            raise RuntimeError(f"Database error: {e}")
        except Exception as e:
            logger.error(f"Unexpected error getting conversation summary: {e}")
            raise RuntimeError(f"Unexpected error: {e}")

    async def update_conversation_status(self, conversation_id: str, status: str) -> bool:
        """
        Update the status of a conversation.

        Args:
            conversation_id: MongoDB ObjectId of the conversation
            status: New status ('active', 'completed', 'archived')

        Returns:
            bool: True if updated successfully

        Raises:
            ValueError: If validation fails
        """
        try:
            if not _validate_object_id(conversation_id):
                raise ValueError(f"Invalid conversation_id: {conversation_id}")

            valid_statuses = ["active", "completed", "archived"]
            if status not in valid_statuses:
                raise ValueError(f"Invalid status: {status}. Must be one of {valid_statuses}")

            result = self.conversations_collection.update_one(
                {"_id": ObjectId(conversation_id)},
                {"$set": {"status": status, "updatedAt": datetime.utcnow()}}
            )

            success = result.modified_count > 0
            if success:
                logger.info(f"Updated conversation {conversation_id} status to {status}")
            else:
                logger.warning(f"Conversation {conversation_id} not found for status update")

            return success

        except ValueError:
            raise
        except PyMongoError as e:
            logger.error(f"Database error updating conversation status: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error updating conversation status: {e}")
            return False

    async def get_client_conversations(self, client_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get recent conversations for a client.

        Args:
            client_id: MongoDB ObjectId of the client
            limit: Maximum number of conversations to return

        Returns:
            List of conversation documents

        Raises:
            ValueError: If validation fails
            RuntimeError: If database operation fails
        """
        try:
            if not _validate_object_id(client_id):
                raise ValueError(f"Invalid client_id: {client_id}")

            conversations = list(self.conversations_collection.find(
                {"client": ObjectId(client_id)}
            ).sort("lastMessageAt", -1).limit(limit))

            # Convert ObjectIds to strings
            conversations_serializable = [_convert_objectid_to_str(conv) for conv in conversations]

            logger.debug(f"Retrieved {len(conversations)} conversations for client {client_id}")
            return conversations_serializable

        except ValueError:
            raise
        except PyMongoError as e:
            logger.error(f"Database error getting client conversations: {e}")
            raise RuntimeError(f"Database error: {e}")
        except Exception as e:
            logger.error(f"Unexpected error getting client conversations: {e}")
            raise RuntimeError(f"Unexpected error: {e}")
