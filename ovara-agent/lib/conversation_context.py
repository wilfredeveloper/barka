"""
Conversation Context Builder for ovara-agent

This module provides functionality to build conversation context for Google ADK
agent sessions, enabling conversation resumption and maintaining context across
disconnections. It converts database message history into formats suitable for
the Google ADK agent.
"""

import logging
import sys
from typing import Dict, Any, List, Optional
from google.genai import types
from lib.message_handler import MessageHandler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)


class ConversationContextBuilder:
    """
    Builds conversation context for Google ADK agent sessions.
    
    This class takes message history from the database and converts it into
    the appropriate format for Google ADK agent initialization, enabling
    conversation resumption and context continuity.
    """
    
    def __init__(self, message_handler: MessageHandler):
        """
        Initialize the conversation context builder.
        
        Args:
            message_handler: MessageHandler instance for database operations
        """
        self.message_handler = message_handler
        logger.info("ConversationContextBuilder initialized")
    
    def _convert_message_to_content(self, message: Dict[str, Any]) -> Optional[types.Content]:
        """
        Convert a database message to Google ADK Content format.
        
        Args:
            message: Message document from database
            
        Returns:
            types.Content object or None if conversion fails
        """
        try:
            sender = message.get("sender")
            content_text = message.get("content", "")
            
            if not content_text.strip():
                logger.debug(f"Skipping empty message {message.get('_id')}")
                return None
            
            # Map database sender to Google ADK role
            role_mapping = {
                "user": "user",
                "agent": "model",
                "system": "model"  # Treat system messages as model messages
            }
            
            role = role_mapping.get(sender, "user")
            
            # Create Content with text part
            content = types.Content(
                role=role,
                parts=[types.Part.from_text(text=content_text)]
            )
            
            logger.debug(f"Converted message {message.get('_id')} to Content (role: {role})")
            return content
            
        except Exception as e:
            logger.error(f"Failed to convert message to Content: {e}")
            return None
    
    async def build_conversation_context(self, conversation_id: str, 
                                       max_messages: int = 50) -> List[types.Content]:
        """
        Build conversation context from message history.
        
        Args:
            conversation_id: MongoDB ObjectId of the conversation
            max_messages: Maximum number of messages to include in context
            
        Returns:
            List of types.Content objects for agent initialization
            
        Raises:
            RuntimeError: If context building fails
        """
        try:
            # Load conversation history
            messages = await self.message_handler.load_conversation_history(
                conversation_id=conversation_id,
                limit=max_messages,
                include_system=False
            )
            
            if not messages:
                logger.info(f"No message history found for conversation {conversation_id}")
                return []
            
            # Convert messages to Content objects
            content_list = []
            for message in messages:
                content = self._convert_message_to_content(message)
                if content:
                    content_list.append(content)
            
            logger.info(f"Built context with {len(content_list)} messages for conversation {conversation_id}")
            return content_list
            
        except Exception as e:
            logger.error(f"Failed to build conversation context: {e}")
            raise RuntimeError(f"Context building failed: {e}")
    
    async def build_session_context(self, client_id: str, conversation_id: str = None,
                                  max_messages: int = 50) -> Dict[str, Any]:
        """
        Build complete session context including conversation and client info.
        
        Args:
            client_id: MongoDB ObjectId of the client
            conversation_id: MongoDB ObjectId of the conversation (optional)
            max_messages: Maximum number of messages to include
            
        Returns:
            Dict containing session context data
            
        Raises:
            RuntimeError: If context building fails
        """
        try:
            context = {
                "client_id": client_id,
                "conversation_id": conversation_id,
                "conversation_history": [],
                "conversation_summary": None,
                "client_conversations": []
            }
            
            # If conversation_id provided, build conversation context
            if conversation_id:
                # Get conversation history
                context["conversation_history"] = await self.build_conversation_context(
                    conversation_id=conversation_id,
                    max_messages=max_messages
                )
                
                # Get conversation summary
                try:
                    context["conversation_summary"] = await self.message_handler.get_conversation_summary(
                        conversation_id
                    )
                except Exception as e:
                    logger.warning(f"Failed to get conversation summary: {e}")
                    context["conversation_summary"] = None
            
            # Get recent conversations for the client
            try:
                context["client_conversations"] = await self.message_handler.get_client_conversations(
                    client_id=client_id,
                    limit=5
                )
            except Exception as e:
                logger.warning(f"Failed to get client conversations: {e}")
                context["client_conversations"] = []
            
            logger.info(f"Built session context for client {client_id}")
            return context
            
        except Exception as e:
            logger.error(f"Failed to build session context: {e}")
            raise RuntimeError(f"Session context building failed: {e}")
    
    def format_context_for_agent(self, context: Dict[str, Any]) -> str:
        """
        Format session context into a string suitable for agent prompts.
        
        Args:
            context: Session context data
            
        Returns:
            Formatted context string
        """
        try:
            context_parts = []
            
            # Add conversation summary if available
            if context.get("conversation_summary"):
                summary = context["conversation_summary"]
                context_parts.append(f"Current conversation: {summary.get('title', 'Untitled')}")
                context_parts.append(f"Messages in conversation: {summary.get('message_count', 0)}")
                
                if summary.get("last_message_at"):
                    context_parts.append(f"Last activity: {summary['last_message_at']}")
            
            # Add client conversation count
            client_conversations = context.get("client_conversations", [])
            if client_conversations:
                context_parts.append(f"Client has {len(client_conversations)} total conversations")
            
            # Add conversation history summary
            history = context.get("conversation_history", [])
            if history:
                context_parts.append(f"Conversation history loaded: {len(history)} messages")
            
            formatted_context = "\n".join(context_parts) if context_parts else "New conversation"
            
            logger.debug(f"Formatted context: {formatted_context}")
            return formatted_context
            
        except Exception as e:
            logger.error(f"Failed to format context for agent: {e}")
            return "Context unavailable"
    
    async def create_conversation_if_needed(self, client_id: str, 
                                          conversation_id: str = None,
                                          title: str = "New Conversation") -> str:
        """
        Create a new conversation if needed or validate existing one.
        
        Args:
            client_id: MongoDB ObjectId of the client
            conversation_id: MongoDB ObjectId of existing conversation (optional)
            title: Title for new conversation
            
        Returns:
            str: Conversation ID (existing or newly created)
            
        Raises:
            RuntimeError: If conversation creation/validation fails
        """
        try:
            conversation = await self.message_handler.create_or_get_conversation(
                client_id=client_id,
                conversation_id=conversation_id,
                title=title
            )
            
            result_conversation_id = conversation["_id"]
            logger.info(f"Using conversation {result_conversation_id} for client {client_id}")
            return result_conversation_id
            
        except Exception as e:
            logger.error(f"Failed to create/get conversation: {e}")
            raise RuntimeError(f"Conversation setup failed: {e}")
    
    def get_context_summary_for_logging(self, context: Dict[str, Any]) -> str:
        """
        Get a brief summary of context for logging purposes.
        
        Args:
            context: Session context data
            
        Returns:
            Brief context summary string
        """
        try:
            summary_parts = []
            
            if context.get("conversation_id"):
                summary_parts.append(f"conv:{context['conversation_id'][:8]}...")
            
            history_count = len(context.get("conversation_history", []))
            if history_count > 0:
                summary_parts.append(f"history:{history_count}msgs")
            
            conversations_count = len(context.get("client_conversations", []))
            if conversations_count > 0:
                summary_parts.append(f"total:{conversations_count}convs")
            
            return " | ".join(summary_parts) if summary_parts else "new_session"
            
        except Exception as e:
            logger.error(f"Failed to create context summary: {e}")
            return "context_error"
