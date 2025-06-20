"""
Authentication Handler for ovara-agent

This module provides JWT authentication functionality that integrates with
the existing barka-backend authentication system. It validates JWT tokens
and ensures clients have proper access to conversations and sessions.
"""

import os
import jwt
import logging
import sys
from datetime import datetime
from typing import Dict, Any, Optional
from bson import ObjectId
from pymongo.errors import PyMongoError
from lib.utils import _validate_object_id

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)


class AuthenticationError(Exception):
    """Custom exception for authentication failures."""
    pass


class AuthHandler:
    """
    Handles JWT authentication and client validation for ovara-agent.
    
    This class provides methods to validate JWT tokens from barka-backend,
    extract user information, and verify client access permissions.
    """
    
    def __init__(self, db, jwt_secret: str = None):
        """
        Initialize the authentication handler.
        
        Args:
            db: MongoDB database instance
            jwt_secret: JWT secret key (defaults to environment variable)
        """
        self.db = db
        self.users_collection = db["users"]
        self.clients_collection = db["clients"]
        self.organizations_collection = db["organizations"]
        
        # Get JWT secret from environment or parameter
        self.jwt_secret = jwt_secret or os.getenv("JWT_SECRET")
        if not self.jwt_secret:
            raise ValueError("JWT_SECRET must be provided or set in environment variables")
        
        logger.info("AuthHandler initialized")
    
    def decode_jwt_token(self, token: str) -> Dict[str, Any]:
        """
        Decode and validate a JWT token.
        
        Args:
            token: JWT token string
            
        Returns:
            Dict containing decoded token payload
            
        Raises:
            AuthenticationError: If token is invalid or expired
        """
        try:
            # Remove 'Bearer ' prefix if present
            if token.startswith('Bearer '):
                token = token[7:]
            
            # Decode the token
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=["HS256"]
            )
            
            # Validate required fields
            required_fields = ["id", "email", "role"]
            for field in required_fields:
                if field not in payload:
                    raise AuthenticationError(f"Missing required field in token: {field}")
            
            # Check token expiration
            if "exp" in payload:
                exp_timestamp = payload["exp"]
                if datetime.utcnow().timestamp() > exp_timestamp:
                    raise AuthenticationError("Token has expired")
            
            logger.debug(f"Successfully decoded token for user {payload['id']}")
            return payload
            
        except jwt.ExpiredSignatureError:
            raise AuthenticationError("Token has expired")
        except jwt.InvalidTokenError as e:
            raise AuthenticationError(f"Invalid token: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error decoding token: {e}")
            raise AuthenticationError(f"Token validation failed: {str(e)}")
    
    async def validate_user_access(self, user_id: str) -> Dict[str, Any]:
        """
        Validate user exists and is active.
        
        Args:
            user_id: MongoDB ObjectId of the user
            
        Returns:
            Dict containing user information
            
        Raises:
            AuthenticationError: If user validation fails
        """
        try:
            if not _validate_object_id(user_id):
                raise AuthenticationError(f"Invalid user ID format: {user_id}")
            
            user = self.users_collection.find_one({"_id": ObjectId(user_id)})
            if not user:
                raise AuthenticationError(f"User not found: {user_id}")
            
            if not user.get("isActive", True):
                raise AuthenticationError(f"User account is inactive: {user_id}")
            
            # Get organization info if user has one
            organization = None
            if user.get("organization"):
                organization = self.organizations_collection.find_one(
                    {"_id": ObjectId(user["organization"])}
                )
            
            user_info = {
                "user_id": str(user["_id"]),
                "email": user["email"],
                "role": user["role"],
                "first_name": user.get("firstName", ""),
                "last_name": user.get("lastName", ""),
                "organization_id": str(user["organization"]) if user.get("organization") else None,
                "organization": organization
            }
            
            logger.debug(f"Validated user access for {user_id}")
            return user_info
            
        except AuthenticationError:
            raise
        except PyMongoError as e:
            logger.error(f"Database error validating user: {e}")
            raise AuthenticationError(f"Database error: {e}")
        except Exception as e:
            logger.error(f"Unexpected error validating user: {e}")
            raise AuthenticationError(f"User validation failed: {e}")
    
    async def validate_client_access(self, user_id: str, client_id: str) -> Dict[str, Any]:
        """
        Validate that a user has access to a specific client.
        
        Args:
            user_id: MongoDB ObjectId of the user
            client_id: MongoDB ObjectId of the client
            
        Returns:
            Dict containing client and access information
            
        Raises:
            AuthenticationError: If access validation fails
        """
        try:
            # Validate user first
            user_info = await self.validate_user_access(user_id)
            
            # Validate client ID format
            if not _validate_object_id(client_id):
                raise AuthenticationError(f"Invalid client ID format: {client_id}")
            
            # Get client information
            client = self.clients_collection.find_one({"_id": ObjectId(client_id)})
            if not client:
                raise AuthenticationError(f"Client not found: {client_id}")
            
            # Check access permissions based on user role
            user_role = user_info["role"]
            
            if user_role == "super_admin":
                # Super admin has access to all clients
                access_granted = True
            elif user_role == "org_admin":
                # Org admin can access clients in their organization
                access_granted = (
                    user_info["organization_id"] and 
                    str(client["organization"]) == user_info["organization_id"]
                )
            elif user_role == "org_client":
                # Client can only access their own record
                access_granted = str(client["user"]) == user_id
            else:
                access_granted = False
            
            if not access_granted:
                raise AuthenticationError(
                    f"User {user_id} does not have access to client {client_id}"
                )
            
            # Get organization info
            organization = None
            if client.get("organization"):
                organization = self.organizations_collection.find_one(
                    {"_id": ObjectId(client["organization"])}
                )
            
            access_info = {
                "user": user_info,
                "client": {
                    "client_id": str(client["_id"]),
                    "user_id": str(client["user"]),
                    "organization_id": str(client["organization"]) if client.get("organization") else None,
                    "project_type": client.get("projectType"),
                    "status": client.get("status")
                },
                "organization": organization,
                "access_level": user_role
            }
            
            logger.info(f"Validated client access: user {user_id} -> client {client_id}")
            return access_info
            
        except AuthenticationError:
            raise
        except PyMongoError as e:
            logger.error(f"Database error validating client access: {e}")
            raise AuthenticationError(f"Database error: {e}")
        except Exception as e:
            logger.error(f"Unexpected error validating client access: {e}")
            raise AuthenticationError(f"Client access validation failed: {e}")
    
    async def authenticate_websocket_request(self, token: str, client_id: str) -> Dict[str, Any]:
        """
        Authenticate a WebSocket connection request.
        
        Args:
            token: JWT token string
            client_id: MongoDB ObjectId of the client
            
        Returns:
            Dict containing authentication and access information
            
        Raises:
            AuthenticationError: If authentication fails
        """
        try:
            # Decode and validate token
            token_payload = self.decode_jwt_token(token)
            user_id = token_payload["id"]
            
            # Validate client access
            access_info = await self.validate_client_access(user_id, client_id)
            
            # Combine token and access information
            auth_info = {
                "token_payload": token_payload,
                "access_info": access_info,
                "authenticated": True,
                "user_id": user_id,
                "client_id": client_id,
                "organization_id": access_info["client"]["organization_id"],
                "user_role": access_info["user"]["role"]
            }
            
            logger.info(f"Authenticated WebSocket request: user {user_id} -> client {client_id}")
            return auth_info
            
        except AuthenticationError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error in WebSocket authentication: {e}")
            raise AuthenticationError(f"WebSocket authentication failed: {e}")
    
    def create_session_context(self, auth_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create session context from authentication information.
        
        Args:
            auth_info: Authentication information from authenticate_websocket_request
            
        Returns:
            Dict containing session context
        """
        try:
            context = {
                "user_id": auth_info["user_id"],
                "client_id": auth_info["client_id"],
                "organization_id": auth_info["organization_id"],
                "user_role": auth_info["user_role"],
                "user_email": auth_info["access_info"]["user"]["email"],
                "user_name": f"{auth_info['access_info']['user']['first_name']} {auth_info['access_info']['user']['last_name']}".strip(),
                "client_project_type": auth_info["access_info"]["client"]["project_type"],
                "client_status": auth_info["access_info"]["client"]["status"],
                "authenticated_at": datetime.utcnow().isoformat()
            }
            
            logger.debug(f"Created session context for user {auth_info['user_id']}")
            return context
            
        except Exception as e:
            logger.error(f"Failed to create session context: {e}")
            return {}
