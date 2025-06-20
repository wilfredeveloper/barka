"""
HTTP Endpoints for ovara-agent

This module provides HTTP-based chat functionality as an alternative to WebSocket
connections. It implements REST endpoints and Server-Sent Events for real-time
communication with the agent.
"""

import asyncio
import json
import logging
import uuid
from typing import Dict, Any, Optional, AsyncGenerator
from fastapi import APIRouter, HTTPException, Header, Query, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from starlette.status import HTTP_401_UNAUTHORIZED, HTTP_404_NOT_FOUND, HTTP_500_INTERNAL_SERVER_ERROR

from auth_handler import AuthenticationError
from chat_core import ChatCore, ChatSession
from config import config

logger = logging.getLogger(__name__)


# Request/Response Models
class ChatMessage(BaseModel):
    """Model for chat message requests."""
    content: str = Field(..., min_length=1, max_length=config.max_message_length)
    mime_type: str = Field(default="text/plain")
    role: str = Field(default="user")


class ChatResponse(BaseModel):
    """Model for chat response."""
    success: bool
    message_id: Optional[str] = None
    session_id: Optional[str] = None
    conversation_id: Optional[str] = None
    error: Optional[str] = None


class SessionStatus(BaseModel):
    """Model for session status response."""
    session_id: str
    client_id: str
    conversation_id: str
    is_active: bool
    created_at: Optional[str] = None


class ConnectionResponse(BaseModel):
    """Model for connection establishment response."""
    success: bool
    session_id: str
    client_id: str
    conversation_id: str
    connection_id: str
    timestamp: float


# Dependency to get chat core instance
async def get_chat_core() -> ChatCore:
    """Dependency to provide ChatCore instance."""
    # This will be injected by the main application
    from app.main import chat_core
    return chat_core


class HTTPChatEndpoints:
    """
    HTTP-based chat endpoints for ovara-agent.
    
    This class provides REST API endpoints that mirror the WebSocket functionality,
    allowing clients to interact with the agent using HTTP requests and Server-Sent Events.
    """
    
    def __init__(self, chat_core: ChatCore):
        """
        Initialize HTTP chat endpoints.
        
        Args:
            chat_core: ChatCore instance for handling chat operations
        """
        self.chat_core = chat_core
        self.router = APIRouter(prefix="/api/chat", tags=["chat"])
        self._setup_routes()
        
        # Track active streaming connections
        self.streaming_connections: Dict[str, bool] = {}
        
        logger.info("HTTPChatEndpoints initialized")
    
    def _setup_routes(self):
        """Setup HTTP routes."""
        self.router.post("/{client_id}/connect")(self.connect_chat)
        self.router.post("/{client_id}/send")(self.send_message)
        self.router.get("/{client_id}/stream")(self.stream_responses)
        self.router.get("/{client_id}/status")(self.get_session_status)
        self.router.delete("/{client_id}/disconnect")(self.disconnect_chat)
    
    async def _authenticate_request(self, token: str, client_id: str) -> Dict[str, Any]:
        """
        Authenticate HTTP request.
        
        Args:
            token: JWT token from Authorization header
            client_id: Client identifier
            
        Returns:
            Authentication information
            
        Raises:
            HTTPException: If authentication fails
        """
        try:
            if not token or not token.startswith("Bearer "):
                raise HTTPException(
                    status_code=HTTP_401_UNAUTHORIZED,
                    detail="Missing or invalid Authorization header"
                )
            
            jwt_token = token.replace("Bearer ", "")
            auth_info = await self.chat_core.authenticate_request(jwt_token, client_id)
            return auth_info
            
        except AuthenticationError as e:
            raise HTTPException(
                status_code=HTTP_401_UNAUTHORIZED,
                detail=f"Authentication failed: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            raise HTTPException(
                status_code=HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication error"
            )
    
    async def connect_chat(
        self,
        client_id: str,
        authorization: str = Header(...),
        conversation_id: Optional[str] = Query(None),
        is_audio: str = Query("false")
    ) -> ConnectionResponse:
        """
        Establish a chat connection and create a session.
        
        Args:
            client_id: MongoDB ObjectId of the client
            authorization: JWT token in Authorization header
            conversation_id: MongoDB ObjectId of existing conversation (optional)
            is_audio: Whether to enable audio mode
            
        Returns:
            Connection establishment response
        """
        try:
            # Authenticate request
            auth_info = await self._authenticate_request(authorization, client_id)
            user_id = auth_info['user_id']
            
            # Create chat session
            chat_session = await self.chat_core.create_chat_session(
                client_id=client_id,
                user_id=user_id,
                conversation_id=conversation_id,
                is_audio=(is_audio.lower() == "true")
            )
            
            # Generate connection ID for tracking
            connection_id = str(uuid.uuid4())
            
            logger.info(f"HTTP chat connection established: {chat_session.session_id}")
            
            return ConnectionResponse(
                success=True,
                session_id=chat_session.session_id,
                client_id=client_id,
                conversation_id=chat_session.conversation_id,
                connection_id=connection_id,
                timestamp=asyncio.get_event_loop().time()
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to establish chat connection: {e}")
            raise HTTPException(
                status_code=HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Connection failed: {str(e)}"
            )
    
    async def send_message(
        self,
        client_id: str,
        message: ChatMessage,
        authorization: str = Header(...),
        session_id: Optional[str] = Query(None)
    ) -> ChatResponse:
        """
        Send a message to the agent.
        
        Args:
            client_id: MongoDB ObjectId of the client
            message: Chat message to send
            authorization: JWT token in Authorization header
            session_id: Session identifier (optional, will use latest if not provided)
            
        Returns:
            Chat response
        """
        try:
            # Authenticate request
            auth_info = await self._authenticate_request(authorization, client_id)
            
            # Find active session
            chat_session = None
            if session_id:
                chat_session = await self.chat_core.get_chat_session(session_id)
            else:
                # Find the most recent active session for this client
                for session in self.chat_core.active_sessions.values():
                    if session.client_id == client_id and session.is_active:
                        chat_session = session
                        break
            
            if not chat_session:
                raise HTTPException(
                    status_code=HTTP_404_NOT_FOUND,
                    detail="No active chat session found. Please connect first."
                )
            
            # Save user message to database
            if message.content.strip():
                try:
                    saved_message = await self.chat_core.save_user_message(
                        conversation_id=chat_session.conversation_id,
                        content=message.content.strip(),
                        metadata={"mime_type": message.mime_type, "source": "http"}
                    )
                    message_id = saved_message.get("_id")
                except Exception as e:
                    logger.error(f"Failed to save user message: {e}")
                    message_id = None
            
            # Send message to agent
            success = await chat_session.send_message(
                content=message.content,
                mime_type=message.mime_type,
                role=message.role
            )
            
            if not success:
                raise HTTPException(
                    status_code=HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to send message to agent"
                )
            
            logger.debug(f"HTTP message sent to agent: {message.content[:100]}...")
            
            return ChatResponse(
                success=True,
                message_id=message_id,
                session_id=chat_session.session_id,
                conversation_id=chat_session.conversation_id
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to send message: {e}")
            raise HTTPException(
                status_code=HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Message sending failed: {str(e)}"
            )
    
    async def stream_responses(
        self,
        client_id: str,
        authorization: str = Header(...),
        session_id: Optional[str] = Query(None)
    ) -> StreamingResponse:
        """
        Stream agent responses using Server-Sent Events.
        
        Args:
            client_id: MongoDB ObjectId of the client
            authorization: JWT token in Authorization header
            session_id: Session identifier (optional)
            
        Returns:
            StreamingResponse with Server-Sent Events
        """
        try:
            # Authenticate request
            auth_info = await self._authenticate_request(authorization, client_id)
            
            # Find active session
            chat_session = None
            if session_id:
                chat_session = await self.chat_core.get_chat_session(session_id)
            else:
                # Find the most recent active session for this client
                for session in self.chat_core.active_sessions.values():
                    if session.client_id == client_id and session.is_active:
                        chat_session = session
                        break
            
            if not chat_session:
                raise HTTPException(
                    status_code=HTTP_404_NOT_FOUND,
                    detail="No active chat session found"
                )
            
            # Create event stream
            async def event_stream() -> AsyncGenerator[str, None]:
                """Generate Server-Sent Events from agent responses."""
                try:
                    current_response = ""
                    
                    async for event in chat_session.live_events:
                        if event is None:
                            continue
                        
                        # Handle different event types (similar to WebSocket implementation)
                        if hasattr(event, 'text') and event.text:
                            current_response += event.text
                            
                            # Send incremental response
                            event_data = {
                                "type": "text_chunk",
                                "content": event.text,
                                "partial_response": current_response
                            }
                            yield f"data: {json.dumps(event_data)}\n\n"
                        
                        # Handle turn completion
                        if hasattr(event, 'turn_complete') and (event.turn_complete or getattr(event, 'interrupted', False)):
                            # Save complete agent response
                            if current_response.strip():
                                try:
                                    await self.chat_core.save_agent_message(
                                        conversation_id=chat_session.conversation_id,
                                        content=current_response.strip(),
                                        metadata={"turn_complete": event.turn_complete, "source": "http"}
                                    )
                                except Exception as e:
                                    logger.error(f"Failed to save agent message: {e}")
                            
                            # Send completion event
                            completion_data = {
                                "type": "turn_complete",
                                "turn_complete": event.turn_complete,
                                "interrupted": getattr(event, 'interrupted', False),
                                "final_response": current_response
                            }
                            yield f"data: {json.dumps(completion_data)}\n\n"
                            
                            current_response = ""  # Reset for next response
                
                except Exception as e:
                    logger.error(f"Error in event stream: {e}")
                    error_data = {
                        "type": "error",
                        "error": str(e)
                    }
                    yield f"data: {json.dumps(error_data)}\n\n"
            
            return StreamingResponse(
                event_stream(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Cache-Control"
                }
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to create event stream: {e}")
            raise HTTPException(
                status_code=HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Streaming failed: {str(e)}"
            )

    async def get_session_status(
        self,
        client_id: str,
        authorization: str = Header(...),
        session_id: Optional[str] = Query(None)
    ) -> SessionStatus:
        """
        Get the status of a chat session.

        Args:
            client_id: MongoDB ObjectId of the client
            authorization: JWT token in Authorization header
            session_id: Session identifier (optional)

        Returns:
            Session status information
        """
        try:
            # Authenticate request
            auth_info = await self._authenticate_request(authorization, client_id)

            # Find session
            chat_session = None
            if session_id:
                chat_session = await self.chat_core.get_chat_session(session_id)
            else:
                # Find the most recent active session for this client
                for session in self.chat_core.active_sessions.values():
                    if session.client_id == client_id and session.is_active:
                        chat_session = session
                        break

            if not chat_session:
                raise HTTPException(
                    status_code=HTTP_404_NOT_FOUND,
                    detail="Chat session not found"
                )

            return SessionStatus(
                session_id=chat_session.session_id,
                client_id=chat_session.client_id,
                conversation_id=chat_session.conversation_id,
                is_active=chat_session.is_active
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to get session status: {e}")
            raise HTTPException(
                status_code=HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Status check failed: {str(e)}"
            )

    async def disconnect_chat(
        self,
        client_id: str,
        authorization: str = Header(...),
        session_id: Optional[str] = Query(None)
    ) -> ChatResponse:
        """
        Disconnect and close a chat session.

        Args:
            client_id: MongoDB ObjectId of the client
            authorization: JWT token in Authorization header
            session_id: Session identifier (optional)

        Returns:
            Disconnection response
        """
        try:
            # Authenticate request
            auth_info = await self._authenticate_request(authorization, client_id)

            # Find and close session
            session_closed = False
            if session_id:
                session_closed = await self.chat_core.close_chat_session(session_id)
            else:
                # Close all active sessions for this client
                sessions_to_close = [
                    session.session_id for session in self.chat_core.active_sessions.values()
                    if session.client_id == client_id and session.is_active
                ]
                for sid in sessions_to_close:
                    await self.chat_core.close_chat_session(sid)
                    session_closed = True

            if not session_closed:
                raise HTTPException(
                    status_code=HTTP_404_NOT_FOUND,
                    detail="No active chat session found to disconnect"
                )

            logger.info(f"HTTP chat session disconnected for client {client_id}")

            return ChatResponse(
                success=True,
                session_id=session_id,
                conversation_id=None
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to disconnect chat: {e}")
            raise HTTPException(
                status_code=HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Disconnection failed: {str(e)}"
            )
