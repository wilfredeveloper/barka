"""
List clients tool for Jarvis agent - Admin only functionality.
"""

import sys
import os
from google.adk.tools.tool_context import ToolContext

# Add lib directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'lib'))

from db import get_database
from bson import ObjectId

# Initialize database
db = get_database()


def list_clients_for_scheduling_tool(tool_context: ToolContext) -> dict:
    """
    List clients in the organization for scheduling purposes (Admin only).

    This tool helps administrators identify client IDs when scheduling meetings
    on behalf of clients.

    Args:
        tool_context: ADK tool context containing session state

    Returns:
        Dict with list of clients and their IDs
    """
    try:
        # Import role checking function
        from .role_permissions import get_user_from_context, is_admin_user
        
        # Get user information for permission checking
        user_info = get_user_from_context(tool_context)
        if not user_info:
            return {
                "success": False,
                "error": "User information not found in session",
                "clients": [],
                "message": "Authentication required"
            }
        
        user_role = user_info.get("role")
        
        # Only admins can list clients for scheduling
        if not is_admin_user(user_role):
            return {
                "success": False,
                "error": "Only administrators can list clients for scheduling",
                "clients": [],
                "message": "Permission denied"
            }
        
        session_state = tool_context.state
        organization_id = session_state.get("organization_id")
        
        if not organization_id:
            return {
                "success": False,
                "error": "Organization ID not found in session state",
                "clients": [],
                "message": "Session state missing organization information"
            }
        
        # Get clients for the organization
        clients_collection = db["clients"]
        clients = list(clients_collection.find(
            {"organization": ObjectId(organization_id)},
            {
                "_id": 1,
                "user": 1,
                "companyName": 1,
                "contactEmail": 1,
                "status": 1
            }
        ).sort("companyName", 1))
        
        # Format clients for response
        formatted_clients = []
        for client in clients:
            # Get user information if available
            user_info_doc = None
            if client.get("user"):
                users_collection = db["users"]
                user_info_doc = users_collection.find_one(
                    {"_id": client["user"]},
                    {"firstName": 1, "lastName": 1, "email": 1}
                )
            
            formatted_client = {
                "client_id": str(client["_id"]),
                "company_name": client.get("companyName", ""),
                "contact_email": client.get("contactEmail", ""),
                "status": client.get("status", "active"),
                "user_name": "",
                "user_email": ""
            }
            
            if user_info_doc:
                formatted_client["user_name"] = f"{user_info_doc.get('firstName', '')} {user_info_doc.get('lastName', '')}".strip()
                formatted_client["user_email"] = user_info_doc.get("email", "")
            
            formatted_clients.append(formatted_client)
        
        return {
            "success": True,
            "organization_id": organization_id,
            "clients": formatted_clients,
            "count": len(formatted_clients),
            "message": f"Found {len(formatted_clients)} clients in organization"
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "clients": [],
            "message": f"Error retrieving clients: {str(e)}"
        }
