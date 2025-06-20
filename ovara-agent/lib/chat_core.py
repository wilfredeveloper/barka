"""
Core Chat Logic for ovara-agent

This module provides connection-agnostic chat functionality that can be used
by both WebSocket and HTTP implementations. It handles session management,
message processing, and agent communication.
"""

import asyncio
import json
import logging
import sys
from typing import Dict, Any, Optional, Tuple, AsyncIterable, Callable
from google.adk.agents import LiveRequestQueue
from google.adk.events.event import Event
from google.genai import types
import os

# Add lib directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lib'))

from database_session_service import DatabaseSessionService
from message_handler import MessageHandler
from conversation_context import ConversationContextBuilder
from auth_handler import AuthHandler, AuthenticationError
from config import config

logger = logging.getLogger(__name__)


class ChatSession:
    """
    Represents an active chat session with agent communication channels.
    
    This class encapsulates the session state, agent communication queues,
    and provides methods for sending/receiving messages.
    """
    
    def __init__(self, session_id: str, client_id: str, user_id: str,
                 conversation_id: str, live_events: AsyncIterable[Event],
                 live_request_queue: LiveRequestQueue, session: Any):
        """
        Initialize a chat session.
        
        Args:
            session_id: Unique session identifier
            client_id: MongoDB ObjectId of the client
            user_id: MongoDB ObjectId of the user
            conversation_id: MongoDB ObjectId of the conversation
            live_events: Agent event stream
            live_request_queue: Queue for sending requests to agent
            session: Google ADK session object
        """
        self.session_id = session_id
        self.client_id = client_id
        self.user_id = user_id
        self.conversation_id = conversation_id
        self.live_events = live_events
        self.live_request_queue = live_request_queue
        self.session = session
        self.is_active = True
        self.current_response = ""
        
        logger.info(f"Created chat session {session_id} for client {client_id}")
    
    async def send_message(self, content: str, mime_type: str = "text/plain", 
                          role: str = "user") -> bool:
        """
        Send a message to the agent.
        
        Args:
            content: Message content
            mime_type: MIME type of the content
            role: Role of the sender (user/agent)
            
        Returns:
            bool: True if message was sent successfully
        """
        try:
            if mime_type == "text/plain":
                # Create content for agent
                agent_content = types.Content(
                    role=role, 
                    parts=[types.Part.from_text(text=content)]
                )
                self.live_request_queue.send_content(content=agent_content)
                logger.debug(f"Sent message to agent: {content[:100]}...")
                return True
            else:
                logger.warning(f"Unsupported mime_type: {mime_type}")
                return False
        except Exception as e:
            logger.error(f"Failed to send message to agent: {e}")
            return False
    
    def close(self):
        """Close the chat session."""
        self.is_active = False
        logger.info(f"Closed chat session {self.session_id}")


class ChatCore:
    """
    Core chat functionality that is connection-agnostic.
    
    This class provides the main chat operations that can be used by both
    WebSocket and HTTP implementations.
    """
    
    def __init__(self, db, session_service: DatabaseSessionService,
                 message_handler: MessageHandler, context_builder: ConversationContextBuilder,
                 auth_handler: AuthHandler):
        """
        Initialize the chat core.
        
        Args:
            db: MongoDB database instance
            session_service: Database session service
            message_handler: Message persistence handler
            context_builder: Conversation context builder
            auth_handler: Authentication handler
        """
        self.db = db
        self.session_service = session_service
        self.message_handler = message_handler
        self.context_builder = context_builder
        self.auth_handler = auth_handler
        
        # Active sessions tracking
        self.active_sessions: Dict[str, ChatSession] = {}
        
        logger.info("ChatCore initialized")
    
    async def authenticate_request(self, token: str, client_id: str) -> Dict[str, Any]:
        """
        Authenticate a chat request.
        
        Args:
            token: JWT authentication token
            client_id: MongoDB ObjectId of the client
            
        Returns:
            Dict containing authentication information
            
        Raises:
            AuthenticationError: If authentication fails
        """
        return await self.auth_handler.authenticate_websocket_request(token, client_id)
    
    async def create_chat_session(self, client_id: str, user_id: str, 
                                 conversation_id: Optional[str] = None,
                                 is_audio: bool = False) -> ChatSession:
        """
        Create a new chat session with agent communication.
        
        Args:
            client_id: MongoDB ObjectId of the client
            user_id: MongoDB ObjectId of the user
            conversation_id: MongoDB ObjectId of existing conversation (optional)
            is_audio: Whether to enable audio mode
            
        Returns:
            ChatSession: Active chat session
            
        Raises:
            RuntimeError: If session creation fails
        """
        try:
            # Import here to avoid circular imports
            from app.main import start_agent_session_with_context
            
            # Start agent session with context
            live_events, live_request_queue, session, actual_conversation_id = await start_agent_session_with_context(
                client_id=client_id,
                conversation_id=conversation_id,
                is_audio=is_audio
            )
            
            # Create session ID
            session_id = f"{client_id}_{actual_conversation_id}_{int(asyncio.get_event_loop().time())}"
            
            # Create chat session
            chat_session = ChatSession(
                session_id=session_id,
                client_id=client_id,
                user_id=user_id,
                conversation_id=actual_conversation_id,
                live_events=live_events,
                live_request_queue=live_request_queue,
                session=session
            )
            
            # Store active session
            self.active_sessions[session_id] = chat_session
            
            logger.info(f"Created chat session {session_id}")
            return chat_session
            
        except Exception as e:
            logger.error(f"Failed to create chat session: {e}")
            raise RuntimeError(f"Chat session creation failed: {e}")
    
    async def get_chat_session(self, session_id: str) -> Optional[ChatSession]:
        """
        Get an active chat session by ID.
        
        Args:
            session_id: Session identifier
            
        Returns:
            ChatSession or None if not found
        """
        return self.active_sessions.get(session_id)
    
    async def close_chat_session(self, session_id: str) -> bool:
        """
        Close and remove a chat session.
        
        Args:
            session_id: Session identifier
            
        Returns:
            bool: True if session was closed successfully
        """
        chat_session = self.active_sessions.get(session_id)
        if chat_session:
            chat_session.close()
            del self.active_sessions[session_id]
            logger.info(f"Closed chat session {session_id}")
            return True
        return False
    
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
        """
        return await self.message_handler.save_user_message(
            conversation_id=conversation_id,
            content=content,
            metadata=metadata or {}
        )
    
    async def save_agent_message(self, conversation_id: str, content: str,
                                metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Save an agent message to the database.
        
        Args:
            conversation_id: MongoDB ObjectId of the conversation
            content: Message content
            metadata: Additional message metadata
            
        Returns:
            Dict containing saved message data
        """
        return await self.message_handler.save_agent_message(
            conversation_id=conversation_id,
            content=content,
            metadata=metadata or {}
        )
