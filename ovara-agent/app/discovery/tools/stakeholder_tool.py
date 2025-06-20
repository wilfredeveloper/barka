"""
Stakeholder Management Tool for Discovery Agent

This tool handles stakeholder identification, contact management, and
interview scheduling for comprehensive project discovery.
"""

import logging
from typing import Dict, Any, Optional, List
from bson import ObjectId
from datetime import datetime
from google.adk.tools import FunctionTool
from google.adk.tools.tool_context import ToolContext

logger = logging.getLogger(__name__)


class StakeholderTool:
    """Tool for managing project stakeholders during discovery phase."""
    
    def __init__(self, db):
        """Initialize with database connection."""
        self.db = db
        self.stakeholders_collection = db["project_stakeholders"]
        self.clients_collection = db["clients"]
        
    def add_stakeholder(self, client_id: str, name: str, role: str, 
                       email: Optional[str] = None, phone: Optional[str] = None,
                       department: Optional[str] = None, influence_level: str = "medium",
                       interview_priority: str = "medium") -> Dict[str, Any]:
        """
        Add a new project stakeholder.
        
        Args:
            client_id: Client identifier
            name: Stakeholder name
            role: Stakeholder role/title
            email: Email address
            phone: Phone number
            department: Department/team
            influence_level: Level of influence (low, medium, high)
            interview_priority: Priority for interview (low, medium, high, critical)
            
        Returns:
            Dict containing the created stakeholder data
        """
        try:
            # Validate client exists
            client = self.clients_collection.find_one({"_id": ObjectId(client_id)})
            if not client:
                return {
                    "status": "error",
                    "error": "Client not found"
                }
            
            # Create stakeholder document
            stakeholder_doc = {
                "clientId": ObjectId(client_id),
                "organizationId": client["organization"],
                "name": name,
                "role": role,
                "email": email,
                "phone": phone,
                "department": department,
                "influenceLevel": influence_level,
                "interviewPriority": interview_priority,
                "interviewStatus": "pending",
                "interviewNotes": [],
                "contactAttempts": [],
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
            }
            
            # Insert stakeholder
            result = self.stakeholders_collection.insert_one(stakeholder_doc)
            stakeholder_doc["_id"] = result.inserted_id
            
            logger.info(f"Added stakeholder {result.inserted_id} for client {client_id}")
            
            return {
                "status": "success",
                "stakeholder": {
                    "id": str(result.inserted_id),
                    "name": name,
                    "role": role,
                    "email": email,
                    "influenceLevel": influence_level,
                    "interviewPriority": interview_priority
                }
            }
            
        except Exception as e:
            logger.error(f"Error adding stakeholder: {str(e)}")
            return {
                "status": "error",
                "error": f"Failed to add stakeholder: {str(e)}"
            }
    
    def list_stakeholders(self, client_id: str, interview_status: Optional[str] = None) -> Dict[str, Any]:
        """
        List all stakeholders for a client.
        
        Args:
            client_id: Client identifier
            interview_status: Optional filter by interview status
            
        Returns:
            Dict containing the list of stakeholders
        """
        try:
            # Build query
            query = {"clientId": ObjectId(client_id)}
            if interview_status:
                query["interviewStatus"] = interview_status
            
            # Get stakeholders
            stakeholders = list(self.stakeholders_collection.find(query).sort("interviewPriority", -1))
            
            # Format stakeholders
            formatted_stakeholders = []
            for stakeholder in stakeholders:
                formatted_stakeholders.append({
                    "id": str(stakeholder["_id"]),
                    "name": stakeholder["name"],
                    "role": stakeholder["role"],
                    "email": stakeholder.get("email"),
                    "phone": stakeholder.get("phone"),
                    "department": stakeholder.get("department"),
                    "influenceLevel": stakeholder["influenceLevel"],
                    "interviewPriority": stakeholder["interviewPriority"],
                    "interviewStatus": stakeholder["interviewStatus"],
                    "createdAt": stakeholder["createdAt"].isoformat()
                })
            
            return {
                "status": "success",
                "stakeholders": formatted_stakeholders,
                "total": len(formatted_stakeholders)
            }
            
        except Exception as e:
            logger.error(f"Error listing stakeholders: {str(e)}")
            return {
                "status": "error",
                "error": f"Failed to list stakeholders: {str(e)}"
            }
    
    def update_interview_status(self, stakeholder_id: str, status: str, 
                              notes: Optional[str] = None) -> Dict[str, Any]:
        """
        Update stakeholder interview status.
        
        Args:
            stakeholder_id: Stakeholder identifier
            status: New status (pending, scheduled, completed, cancelled)
            notes: Optional interview notes
            
        Returns:
            Dict containing the update result
        """
        try:
            # Update stakeholder
            update_data = {
                "interviewStatus": status,
                "updatedAt": datetime.utcnow()
            }
            
            if notes:
                update_data["$push"] = {"interviewNotes": {
                    "note": notes,
                    "timestamp": datetime.utcnow()
                }}
            
            result = self.stakeholders_collection.update_one(
                {"_id": ObjectId(stakeholder_id)},
                {"$set": update_data} if not notes else {"$set": update_data, "$push": update_data["$push"]}
            )
            
            if result.matched_count == 0:
                return {
                    "status": "error",
                    "error": "Stakeholder not found"
                }
            
            logger.info(f"Updated stakeholder {stakeholder_id} interview status to {status}")
            
            return {
                "status": "success",
                "message": f"Interview status updated to {status}"
            }
            
        except Exception as e:
            logger.error(f"Error updating interview status: {str(e)}")
            return {
                "status": "error",
                "error": f"Failed to update interview status: {str(e)}"
            }
    
    def add_contact_attempt(self, stakeholder_id: str, method: str, 
                           outcome: str, notes: Optional[str] = None) -> Dict[str, Any]:
        """
        Record a contact attempt with a stakeholder.
        
        Args:
            stakeholder_id: Stakeholder identifier
            method: Contact method (email, phone, in-person)
            outcome: Outcome (successful, no-response, declined)
            notes: Optional notes about the contact attempt
            
        Returns:
            Dict containing the update result
        """
        try:
            # Add contact attempt
            contact_attempt = {
                "method": method,
                "outcome": outcome,
                "notes": notes,
                "timestamp": datetime.utcnow()
            }
            
            result = self.stakeholders_collection.update_one(
                {"_id": ObjectId(stakeholder_id)},
                {
                    "$push": {"contactAttempts": contact_attempt},
                    "$set": {"updatedAt": datetime.utcnow()}
                }
            )
            
            if result.matched_count == 0:
                return {
                    "status": "error",
                    "error": "Stakeholder not found"
                }
            
            logger.info(f"Added contact attempt for stakeholder {stakeholder_id}")
            
            return {
                "status": "success",
                "message": "Contact attempt recorded"
            }
            
        except Exception as e:
            logger.error(f"Error adding contact attempt: {str(e)}")
            return {
                "status": "error",
                "error": f"Failed to record contact attempt: {str(e)}"
            }


# Session-aware wrapper functions for ADK integration
def add_stakeholder_persistent(tool_context: ToolContext, name: str, role: str,
                             email: Optional[str], phone: Optional[str],
                             department: Optional[str], influence_level: str,
                             interview_priority: str, client_id: Optional[str]) -> Dict[str, Any]:
    """Add a stakeholder with automatic session state access."""
    # Auto-resolve client_id from session state if not provided
    if not client_id:
        client_id = tool_context.state.get("client_id")
        if client_id:
            logger.info(f"add_stakeholder using client_id from session state: '{client_id}'")
        else:
            logger.info("add_stakeholder - no client_id in session state")

    if not client_id:
        return {
            "status": "error",
            "error": "Client ID is required to add stakeholder. Please provide your client ID."
        }

    # Store client_id back to session state for future use
    tool_context.state["client_id"] = client_id
    
    # Get database connection from tool context or initialize
    from lib.db import get_database
    db = get_database()
    tool = StakeholderTool(db)
    
    return tool.add_stakeholder(client_id, name, role, email, phone, department,
                               influence_level or "medium", interview_priority or "medium")


def list_stakeholders_persistent(tool_context: ToolContext, interview_status: Optional[str],
                               client_id: Optional[str]) -> Dict[str, Any]:
    """List stakeholders with automatic session state access."""
    # Auto-resolve client_id from session state if not provided
    if not client_id:
        client_id = tool_context.state.get("client_id")
        if client_id:
            logger.info(f"list_stakeholders using client_id from session state: '{client_id}'")
        else:
            logger.info("list_stakeholders - no client_id in session state")

    if not client_id:
        return {
            "status": "error",
            "error": "Client ID is required to list stakeholders. Please provide your client ID."
        }

    # Store client_id back to session state for future use
    tool_context.state["client_id"] = client_id
    
    # Get database connection from tool context or initialize
    from lib.db import get_database
    db = get_database()
    tool = StakeholderTool(db)
    
    return tool.list_stakeholders(client_id, interview_status)


# ADK Function Tools
add_stakeholder_tool = FunctionTool(func=add_stakeholder_persistent)
list_stakeholders_tool = FunctionTool(func=list_stakeholders_persistent)
