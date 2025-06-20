"""
Client Info Tool for Barka Agent

This module provides functions to interact with the MongoDB clients collection
and retrieve client information.
"""

import logging
import json
from typing import Dict, Any, Optional
from bson import ObjectId
from datetime import datetime
from google.adk.tools.tool_context import ToolContext

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Custom JSON encoder to handle datetime and ObjectId
class MongoJSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, datetime):
            return o.isoformat()
        if isinstance(o, ObjectId):
            return str(o)
        return super().default(o)

class ClientInfoTool:
    """
    Tool for retrieving client information from the MongoDB database.
    """

    def __init__(self, db):
        """
        Initialize the ClientInfoTool with a MongoDB database connection.

        Args:
            db: MongoDB database connection
        """
        self.db = db
        self.clients_collection = db["clients"]
        self.organizations_collection = db["organizations"]

    def get_client_info(self, client_id: str) -> Dict[str, Any]:
        """
        Get detailed information about a client.

        Args:
            client_id: MongoDB ObjectId of the client

        Returns:
            Dict: Response with success status and client information or error message
        """
        from lib.utils import _validate_object_id, _convert_objectid_to_str
        
        if not _validate_object_id(client_id):
            return {
                "status": "error",
                "error": "Invalid client ID format provided."
            }

        try:
            # Get client information
            client = self.clients_collection.find_one({"_id": ObjectId(client_id)})

            if not client:
                return {
                    "status": "error",
                    "error": f"Client with ID {client_id} not found."
                }

            # Get user information if it exists
            if "user" in client and client["user"]:
                user = self.db["users"].find_one({"_id": ObjectId(client["user"])})
                if user:
                    client["userInfo"] = {
                        "name": f"{user.get('firstName', '')} {user.get('lastName', '')}".strip(),
                        "email": user.get("email", "Unknown")
                    }

            # Get organization information if it exists
            if "organization" in client and client["organization"]:
                organization = self.organizations_collection.find_one(
                    {"_id": ObjectId(client["organization"])}
                )

                if organization:
                    client["organizationInfo"] = {
                        "name": organization.get("name", "Unknown"),
                        "industry": organization.get("industry", "Unknown"),
                        "size": organization.get("size", "Unknown")
                    }

            # Remove sensitive information
            if "password" in client:
                del client["password"]
            if "passwordResetToken" in client:
                del client["passwordResetToken"]

            # Convert all ObjectId instances to strings recursively
            client_data = _convert_objectid_to_str(client)

            return {
                "status": "success",
                "client": client_data
            }

        except Exception as e:
            logger.error(f"Error getting client info: {str(e)}")
            return {
                "status": "error",
                "error": f"An internal error occurred: {str(e)}"
            }

    def manage_client_info(self, action: str, client_id: Optional[str]) -> str:
        """
        Main entry point for the client info tool.

        Args:
            action: Action to perform (e.g., "get_client_info")
            client_id: MongoDB ObjectId of the client, optional

        Returns:
            str: JSON string with the response
        """
        try:
            if action == "get_client_info":
                if not client_id:
                    return json.dumps({
                        "status": "error",
                        "error": "Client ID is required for get_client_info."
                    })
                return json.dumps(self.get_client_info(client_id), cls=MongoJSONEncoder)
            else:
                return json.dumps({
                    "status": "error",
                    "error": f"Unknown action: {action}"
                })

        except Exception as e:
            logger.error(f"Error in manage_client_info (action: {action}): {str(e)}")
            return json.dumps({
                "status": "error",
                "error": f"An internal error occurred: {str(e)}"
            })


# ADK-style tool functions for persistent memory
def get_client_info_persistent(tool_context: ToolContext, client_id: Optional[str] = None) -> dict:
    """
    Get detailed information about a client with session persistence.

    Args:
        tool_context: Context for accessing and updating session state
        client_id: MongoDB ObjectId of the client (optional - will read from session state if not provided)

    Returns:
        dict: Response with success status and client information or error message
    """
    from lib.db import get_database
    from lib.utils import _validate_object_id, _convert_objectid_to_str

    # Auto-resolve client_id from session state if not provided
    if not client_id and tool_context:
        client_id = tool_context.state.get("client_id")
        if client_id:
            print(f"--- Tool: get_client_info_persistent using client_id from session state: '{client_id}' ---")
        else:
            print("--- Tool: get_client_info_persistent - no client_id in session state ---")
    else:
        print(f"--- Tool: get_client_info_persistent called with explicit client_id: '{client_id}' ---")

    if not client_id:
        return {
            "status": "error",
            "error": "Client ID is required. Please provide your client ID to access your information."
        }

    if not _validate_object_id(client_id):
        return {
            "status": "error",
            "error": "Invalid client ID format provided."
        }

    try:
        db = get_database()
        clients_collection = db["clients"]
        organizations_collection = db["organizations"]

        # Get client information
        client = clients_collection.find_one({"_id": ObjectId(client_id)})

        if not client:
            return {
                "status": "error",
                "error": f"Client with ID {client_id} not found."
            }

        # Get user information if it exists
        if "user" in client and client["user"]:
            user = db["users"].find_one({"_id": ObjectId(client["user"])})
            if user:
                client["userInfo"] = {
                    "name": f"{user.get('firstName', '')} {user.get('lastName', '')}".strip(),
                    "email": user.get("email", "Unknown")
                }

        # Get organization information if it exists
        if "organization" in client and client["organization"]:
            organization = organizations_collection.find_one(
                {"_id": ObjectId(client["organization"])}
            )

            if organization:
                client["organizationInfo"] = {
                    "name": organization.get("name", "Unknown"),
                    "industry": organization.get("industry", "Unknown"),
                    "size": organization.get("size", "Unknown")
                }

        # Remove sensitive information
        if "password" in client:
            del client["password"]
        if "passwordResetToken" in client:
            del client["passwordResetToken"]

        # Convert all ObjectId instances to strings recursively
        client_data = _convert_objectid_to_str(client)

        # Store client info in session state for persistence
        if tool_context:
            client_cache = tool_context.state.get("barka_client_cache", {})
            client_cache[client_id] = {
                "client_data": client_data,
                "last_accessed": datetime.now().isoformat()
            }
            tool_context.state["barka_client_cache"] = client_cache

            # Also ensure client_id is stored in session state for future use
            tool_context.state["client_id"] = client_id

        return {
            "status": "success",
            "client": client_data
        }

    except Exception as e:
        logger.error(f"Error getting client info: {str(e)}")
        return {
            "status": "error",
            "error": f"An internal error occurred: {str(e)}"
        }
