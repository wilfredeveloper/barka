"""
Configuration Management for ovara-agent

This module provides centralized configuration management for the ovara-agent,
including connection mode switching between WebSocket and HTTP modes.
"""

import os
import logging
from enum import Enum
from typing import Optional, Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class ConnectionMode(Enum):
    """Supported connection modes for ovara-agent."""
    WEBSOCKET = "websocket"
    HTTP = "http"


class Config:
    """
    Centralized configuration management for ovara-agent.
    
    This class handles all configuration settings including connection mode,
    server settings, authentication, and feature flags.
    """
    
    def __init__(self):
        """Initialize configuration from environment variables."""
        self._load_config()
        self._validate_config()
    
    def _load_config(self):
        """Load configuration from environment variables."""
        # Connection Mode Configuration
        connection_mode_str = os.getenv("CONNECTION_MODE", "websocket").lower()
        try:
            self.connection_mode = ConnectionMode(connection_mode_str)
        except ValueError:
            logger.warning(f"Invalid CONNECTION_MODE '{connection_mode_str}', defaulting to websocket")
            self.connection_mode = ConnectionMode.WEBSOCKET
        
        # Server Configuration
        self.host = os.getenv("HOST", "0.0.0.0")
        self.port = int(os.getenv("PORT", 8000))
        
        # Authentication
        self.jwt_secret = os.getenv("JWT_SECRET")
        
        # Database
        self.mongodb_uri = os.getenv("MONGODB_URI")
        
        # Google API Configuration
        self.google_api_key = os.getenv("GOOGLE_API_KEY")
        self.google_application_credentials = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        self.google_application_credentials_json = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON")
        
        # Groq API
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        
        # Qdrant Configuration
        self.qdrant_api_key = os.getenv("QDRANT_API_KEY")
        self.qdrant_url = os.getenv("QDRANT_URL")
        
        # Logging Configuration
        self.log_level = os.getenv("LOG_LEVEL", "INFO").upper()
        self.debug = os.getenv("DEBUG", "false").lower() == "true"
        
        # Session Configuration
        self.session_max_age_hours = int(os.getenv("SESSION_MAX_AGE_HOURS", 24))
        self.session_cleanup_interval_hours = int(os.getenv("SESSION_CLEANUP_INTERVAL_HOURS", 6))
        
        # Message Configuration
        self.max_conversation_history = int(os.getenv("MAX_CONVERSATION_HISTORY", 50))
        self.max_message_length = int(os.getenv("MAX_MESSAGE_LENGTH", 10000))
        
        # WebSocket Configuration
        self.websocket_timeout_seconds = int(os.getenv("WEBSOCKET_TIMEOUT_SECONDS", 100))
        self.websocket_ping_interval = int(os.getenv("WEBSOCKET_PING_INTERVAL", 30))
        
        # Feature Flags
        self.enable_legacy_endpoints = os.getenv("ENABLE_LEGACY_ENDPOINTS", "true").lower() == "true"

        # Memory System Configuration
        self.memory_service_type = os.getenv("MEMORY_SERVICE_TYPE", "hybrid")
        self.mem0_api_key = os.getenv("MEM0_API_KEY")
        self.mem0_base_url = os.getenv("MEM0_BASE_URL", "https://api.mem0.ai")
        self.enable_memory_encryption = os.getenv("ENABLE_MEMORY_ENCRYPTION", "true").lower() == "true"
        self.memory_encryption_key = os.getenv("MEMORY_ENCRYPTION_KEY")
        self.memory_retention_days = int(os.getenv("MEMORY_RETENTION_DAYS", 365))
        self.enable_user_memory_control = os.getenv("ENABLE_USER_MEMORY_CONTROL", "true").lower() == "true"

        # Application Settings
        self.app_name = "Barka"

        logger.info(f"Configuration loaded - Connection Mode: {self.connection_mode.value}")
    
    def _validate_config(self):
        """Validate required configuration settings."""
        required_settings = {
            "JWT_SECRET": self.jwt_secret,
            "MONGODB_URI": self.mongodb_uri,
            "GOOGLE_API_KEY": self.google_api_key,
        }
        
        missing_settings = [key for key, value in required_settings.items() if not value]
        
        if missing_settings:
            raise ValueError(f"Missing required environment variables: {', '.join(missing_settings)}")
        
        logger.info("Configuration validation passed")
    
    @property
    def is_websocket_mode(self) -> bool:
        """Check if the application is running in WebSocket mode."""
        return self.connection_mode == ConnectionMode.WEBSOCKET
    
    @property
    def is_http_mode(self) -> bool:
        """Check if the application is running in HTTP mode."""
        return self.connection_mode == ConnectionMode.HTTP
    
    def get_connection_config(self) -> Dict[str, Any]:
        """Get connection-specific configuration."""
        if self.is_websocket_mode:
            return {
                "mode": "websocket",
                "timeout_seconds": self.websocket_timeout_seconds,
                "ping_interval": self.websocket_ping_interval,
            }
        else:
            return {
                "mode": "http",
                "streaming": True,
                "timeout_seconds": 100,  # HTTP timeout
            }
    
    def __repr__(self) -> str:
        """String representation of configuration."""
        return f"Config(mode={self.connection_mode.value}, host={self.host}, port={self.port})"


# Global configuration instance
config = Config()
