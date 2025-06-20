"""
WebSocket Connection Manager for Ovara Agent

This module provides centralized management of WebSocket connections,
including connection tracking, authentication, and real-time features.
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, Set, Optional, List, Any
from fastapi import WebSocket, WebSocketDisconnect
from dataclasses import dataclass, field

# Configure logging
logger = logging.getLogger(__name__)


@dataclass
class ConnectionInfo:
    """Information about a WebSocket connection."""
    websocket: WebSocket
    client_id: str
    user_id: str
    session_id: str
    conversation_id: Optional[str]
    connected_at: datetime = field(default_factory=datetime.utcnow)
    last_activity: datetime = field(default_factory=datetime.utcnow)
    is_authenticated: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)

    def update_activity(self):
        """Update the last activity timestamp."""
        self.last_activity = datetime.utcnow()

    def to_dict(self) -> Dict[str, Any]:
        """Convert connection info to dictionary."""
        return {
            "client_id": self.client_id,
            "user_id": self.user_id,
            "session_id": self.session_id,
            "conversation_id": self.conversation_id,
            "connected_at": self.connected_at.isoformat(),
            "last_activity": self.last_activity.isoformat(),
            "is_authenticated": self.is_authenticated,
            "metadata": self.metadata
        }


class WebSocketManager:
    """
    Centralized WebSocket connection manager.
    
    Handles connection tracking, authentication, broadcasting,
    and real-time features for multiple clients.
    """

    def __init__(self):
        """Initialize the WebSocket manager."""
        # Active connections by connection ID
        self.connections: Dict[str, ConnectionInfo] = {}
        
        # Client ID to connection ID mapping (for quick lookup)
        self.client_connections: Dict[str, Set[str]] = {}
        
        # Conversation ID to connection IDs mapping
        self.conversation_connections: Dict[str, Set[str]] = {}
        
        # Lock for thread-safe operations
        self._lock = asyncio.Lock()
        
        logger.info("WebSocketManager initialized")

    def _generate_connection_id(self, client_id: str, websocket: WebSocket) -> str:
        """Generate a unique connection ID."""
        timestamp = int(time.time() * 1000)
        return f"{client_id}_{timestamp}_{id(websocket)}"

    async def add_connection(self, websocket: WebSocket, client_id: str, user_id: str,
                           session_id: str, conversation_id: Optional[str] = None,
                           metadata: Dict[str, Any] = None) -> str:
        """
        Add a new WebSocket connection with deduplication.

        Args:
            websocket: WebSocket instance
            client_id: Client identifier
            user_id: User identifier
            session_id: Session identifier
            conversation_id: Conversation identifier (optional)
            metadata: Additional connection metadata

        Returns:
            str: Connection ID
        """
        async with self._lock:
            # Check for existing connections for the same client and conversation
            existing_connections = []
            if client_id in self.client_connections:
                for existing_conn_id in list(self.client_connections[client_id]):
                    existing_conn = self.connections.get(existing_conn_id)
                    if existing_conn and existing_conn.conversation_id == conversation_id:
                        existing_connections.append(existing_conn_id)

            # Close existing connections for the same client/conversation
            for existing_conn_id in existing_connections:
                existing_conn = self.connections.get(existing_conn_id)
                if existing_conn:
                    try:
                        logger.info(f"Closing duplicate connection {existing_conn_id} for client {client_id}")
                        await existing_conn.websocket.close(code=1000, reason="Duplicate connection replaced")
                    except Exception as e:
                        logger.warning(f"Failed to close existing connection {existing_conn_id}: {e}")

                    # Remove the old connection
                    await self._remove_connection_internal(existing_conn_id)

            connection_id = self._generate_connection_id(client_id, websocket)

            # Create connection info
            connection_info = ConnectionInfo(
                websocket=websocket,
                client_id=client_id,
                user_id=user_id,
                session_id=session_id,
                conversation_id=conversation_id,
                metadata=metadata or {}
            )

            # Store connection
            self.connections[connection_id] = connection_info

            # Update client mapping
            if client_id not in self.client_connections:
                self.client_connections[client_id] = set()
            self.client_connections[client_id].add(connection_id)

            # Update conversation mapping
            if conversation_id:
                if conversation_id not in self.conversation_connections:
                    self.conversation_connections[conversation_id] = set()
                self.conversation_connections[conversation_id].add(connection_id)

            logger.info(f"Added connection {connection_id} for client {client_id}")
            return connection_id

    async def _remove_connection_internal(self, connection_id: str) -> bool:
        """
        Internal method to remove a connection without acquiring the lock.
        Should only be called when the lock is already held.
        """
        if connection_id not in self.connections:
            return False

        connection_info = self.connections[connection_id]
        client_id = connection_info.client_id
        conversation_id = connection_info.conversation_id

        # Remove from connections
        del self.connections[connection_id]

        # Update client mapping
        if client_id in self.client_connections:
            self.client_connections[client_id].discard(connection_id)
            if not self.client_connections[client_id]:
                del self.client_connections[client_id]

        # Update conversation mapping
        if conversation_id and conversation_id in self.conversation_connections:
            self.conversation_connections[conversation_id].discard(connection_id)
            if not self.conversation_connections[conversation_id]:
                del self.conversation_connections[conversation_id]

        logger.info(f"Removed connection {connection_id} for client {client_id}")
        return True

    async def remove_connection(self, connection_id: str) -> bool:
        """
        Remove a WebSocket connection.

        Args:
            connection_id: Connection identifier

        Returns:
            bool: True if connection was removed
        """
        async with self._lock:
            return await self._remove_connection_internal(connection_id)

    async def get_connection(self, connection_id: str) -> Optional[ConnectionInfo]:
        """Get connection info by connection ID."""
        return self.connections.get(connection_id)

    async def get_client_connections(self, client_id: str) -> List[ConnectionInfo]:
        """Get all connections for a specific client."""
        connection_ids = self.client_connections.get(client_id, set())
        return [self.connections[conn_id] for conn_id in connection_ids 
                if conn_id in self.connections]

    async def get_conversation_connections(self, conversation_id: str) -> List[ConnectionInfo]:
        """Get all connections for a specific conversation."""
        connection_ids = self.conversation_connections.get(conversation_id, set())
        return [self.connections[conn_id] for conn_id in connection_ids 
                if conn_id in self.connections]

    async def send_to_connection(self, connection_id: str, message: Dict[str, Any]) -> bool:
        """
        Send a message to a specific connection.

        Args:
            connection_id: Connection identifier
            message: Message to send

        Returns:
            bool: True if message was sent successfully
        """
        connection_info = self.connections.get(connection_id)
        if not connection_info:
            return False

        try:
            await connection_info.websocket.send_text(json.dumps(message))
            connection_info.update_activity()
            return True
        except Exception as e:
            logger.error(f"Failed to send message to connection {connection_id}: {e}")
            # Remove dead connection
            await self.remove_connection(connection_id)
            return False

    async def send_to_client(self, client_id: str, message: Dict[str, Any]) -> int:
        """
        Send a message to all connections of a specific client.

        Args:
            client_id: Client identifier
            message: Message to send

        Returns:
            int: Number of connections that received the message
        """
        connections = await self.get_client_connections(client_id)
        sent_count = 0
        
        for connection_info in connections:
            try:
                await connection_info.websocket.send_text(json.dumps(message))
                connection_info.update_activity()
                sent_count += 1
            except Exception as e:
                logger.error(f"Failed to send message to client {client_id}: {e}")
                # Remove dead connection
                await self.remove_connection(self._get_connection_id(connection_info))
        
        return sent_count

    async def send_to_conversation(self, conversation_id: str, message: Dict[str, Any], 
                                 exclude_client_id: Optional[str] = None) -> int:
        """
        Send a message to all connections in a conversation.

        Args:
            conversation_id: Conversation identifier
            message: Message to send
            exclude_client_id: Client ID to exclude from broadcast

        Returns:
            int: Number of connections that received the message
        """
        connections = await self.get_conversation_connections(conversation_id)
        sent_count = 0
        
        for connection_info in connections:
            if exclude_client_id and connection_info.client_id == exclude_client_id:
                continue
                
            try:
                await connection_info.websocket.send_text(json.dumps(message))
                connection_info.update_activity()
                sent_count += 1
            except Exception as e:
                logger.error(f"Failed to send message to conversation {conversation_id}: {e}")
                # Remove dead connection
                await self.remove_connection(self._get_connection_id(connection_info))
        
        return sent_count

    def _get_connection_id(self, connection_info: ConnectionInfo) -> str:
        """Get connection ID for a connection info object."""
        for conn_id, info in self.connections.items():
            if info is connection_info:
                return conn_id
        return ""

    async def authenticate_connection(self, connection_id: str) -> bool:
        """Mark a connection as authenticated."""
        connection_info = self.connections.get(connection_id)
        if connection_info:
            connection_info.is_authenticated = True
            logger.info(f"Connection {connection_id} authenticated")
            return True
        return False

    async def get_connection_stats(self) -> Dict[str, Any]:
        """Get statistics about current connections."""
        total_connections = len(self.connections)
        authenticated_connections = sum(1 for conn in self.connections.values() 
                                      if conn.is_authenticated)
        unique_clients = len(self.client_connections)
        active_conversations = len(self.conversation_connections)
        
        return {
            "total_connections": total_connections,
            "authenticated_connections": authenticated_connections,
            "unique_clients": unique_clients,
            "active_conversations": active_conversations,
            "timestamp": datetime.utcnow().isoformat()
        }

    async def cleanup_inactive_connections(self, max_inactive_minutes: int = 30) -> int:
        """
        Clean up inactive connections.

        Args:
            max_inactive_minutes: Maximum minutes of inactivity before cleanup

        Returns:
            int: Number of connections cleaned up
        """
        cutoff_time = datetime.utcnow() - timedelta(minutes=max_inactive_minutes)
        inactive_connections = []
        
        for connection_id, connection_info in self.connections.items():
            if connection_info.last_activity < cutoff_time:
                inactive_connections.append(connection_id)
        
        cleaned_count = 0
        for connection_id in inactive_connections:
            try:
                connection_info = self.connections.get(connection_id)
                if connection_info:
                    await connection_info.websocket.close(code=1000, reason="Inactive connection")
                await self.remove_connection(connection_id)
                cleaned_count += 1
            except Exception as e:
                logger.error(f"Error cleaning up connection {connection_id}: {e}")
        
        if cleaned_count > 0:
            logger.info(f"Cleaned up {cleaned_count} inactive connections")
        
        return cleaned_count


# Global WebSocket manager instance
websocket_manager = WebSocketManager()
