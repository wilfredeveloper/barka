"""
Requirement Gathering Tool for Discovery Agent

This tool handles comprehensive requirement gathering including functional,
non-functional, and business requirements for projects.
"""

import logging
from typing import Dict, Any, Optional, List
from bson import ObjectId
from datetime import datetime
from google.adk.tools import FunctionTool
from google.adk.tools.tool_context import ToolContext

logger = logging.getLogger(__name__)


class RequirementGatheringTool:
    """Tool for managing project requirements during discovery phase."""
    
    def __init__(self, db):
        """Initialize with database connection."""
        self.db = db
        self.requirements_collection = db["project_requirements"]
        self.clients_collection = db["clients"]
        
    def create_requirement(self, client_id: str, requirement_type: str, 
                          title: str, description: str, priority: str = "medium",
                          category: str = "functional", acceptance_criteria: List[str] = None) -> Dict[str, Any]:
        """
        Create a new project requirement.
        
        Args:
            client_id: Client identifier
            requirement_type: Type of requirement (functional, non-functional, business)
            title: Requirement title
            description: Detailed requirement description
            priority: Priority level (low, medium, high, critical)
            category: Requirement category
            acceptance_criteria: List of acceptance criteria
            
        Returns:
            Dict containing the created requirement data
        """
        try:
            # Validate client exists
            client = self.clients_collection.find_one({"_id": ObjectId(client_id)})
            if not client:
                return {
                    "status": "error",
                    "error": "Client not found"
                }
            
            # Create requirement document
            requirement_doc = {
                "clientId": ObjectId(client_id),
                "organizationId": client["organization"],
                "type": requirement_type,
                "title": title,
                "description": description,
                "priority": priority,
                "category": category,
                "acceptanceCriteria": acceptance_criteria or [],
                "status": "draft",
                "source": "discovery_interview",
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
            }
            
            # Insert requirement
            result = self.requirements_collection.insert_one(requirement_doc)
            requirement_doc["_id"] = result.inserted_id
            
            logger.info(f"Created requirement {result.inserted_id} for client {client_id}")
            
            return {
                "status": "success",
                "requirement": {
                    "id": str(result.inserted_id),
                    "title": title,
                    "type": requirement_type,
                    "priority": priority,
                    "category": category
                }
            }
            
        except Exception as e:
            logger.error(f"Error creating requirement: {str(e)}")
            return {
                "status": "error",
                "error": f"Failed to create requirement: {str(e)}"
            }
    
    def list_requirements(self, client_id: str, requirement_type: Optional[str] = None) -> Dict[str, Any]:
        """
        List all requirements for a client.
        
        Args:
            client_id: Client identifier
            requirement_type: Optional filter by requirement type
            
        Returns:
            Dict containing the list of requirements
        """
        try:
            # Build query
            query = {"clientId": ObjectId(client_id)}
            if requirement_type:
                query["type"] = requirement_type
            
            # Get requirements
            requirements = list(self.requirements_collection.find(query).sort("createdAt", 1))
            
            # Format requirements
            formatted_requirements = []
            for req in requirements:
                formatted_requirements.append({
                    "id": str(req["_id"]),
                    "title": req["title"],
                    "description": req["description"],
                    "type": req["type"],
                    "priority": req["priority"],
                    "category": req["category"],
                    "status": req["status"],
                    "acceptanceCriteria": req.get("acceptanceCriteria", []),
                    "createdAt": req["createdAt"].isoformat()
                })
            
            return {
                "status": "success",
                "requirements": formatted_requirements,
                "total": len(formatted_requirements)
            }
            
        except Exception as e:
            logger.error(f"Error listing requirements: {str(e)}")
            return {
                "status": "error",
                "error": f"Failed to list requirements: {str(e)}"
            }
    
    def update_requirement_status(self, requirement_id: str, status: str, notes: Optional[str] = None) -> Dict[str, Any]:
        """
        Update requirement status.
        
        Args:
            requirement_id: Requirement identifier
            status: New status (draft, approved, rejected, implemented)
            notes: Optional notes about the status change
            
        Returns:
            Dict containing the update result
        """
        try:
            # Update requirement
            update_data = {
                "status": status,
                "updatedAt": datetime.utcnow()
            }
            
            if notes:
                update_data["statusNotes"] = notes
            
            result = self.requirements_collection.update_one(
                {"_id": ObjectId(requirement_id)},
                {"$set": update_data}
            )
            
            if result.matched_count == 0:
                return {
                    "status": "error",
                    "error": "Requirement not found"
                }
            
            logger.info(f"Updated requirement {requirement_id} status to {status}")
            
            return {
                "status": "success",
                "message": f"Requirement status updated to {status}"
            }
            
        except Exception as e:
            logger.error(f"Error updating requirement status: {str(e)}")
            return {
                "status": "error",
                "error": f"Failed to update requirement status: {str(e)}"
            }


# Session-aware wrapper functions for ADK integration
def create_requirement_persistent(tool_context: ToolContext, requirement_type: str,
                                title: str, description: str, priority: str,
                                category: str, acceptance_criteria: Optional[List[str]],
                                client_id: Optional[str]) -> Dict[str, Any]:
    """Create a requirement with automatic session state access."""
    # Auto-resolve client_id from session state if not provided
    if not client_id:
        client_id = tool_context.state.get("client_id")
        if client_id:
            logger.info(f"create_requirement using client_id from session state: '{client_id}'")
        else:
            logger.info("create_requirement - no client_id in session state")

    if not client_id:
        return {
            "status": "error",
            "error": "Client ID is required to create requirement. Please provide your client ID."
        }

    # Store client_id back to session state for future use
    tool_context.state["client_id"] = client_id
    
    # Get database connection from tool context or initialize
    from lib.db import get_database
    db = get_database()
    tool = RequirementGatheringTool(db)
    
    return tool.create_requirement(client_id, requirement_type, title, description,
                                   priority or "medium", category or "functional", acceptance_criteria or [])


def list_requirements_persistent(tool_context: ToolContext, requirement_type: Optional[str],
                               client_id: Optional[str]) -> Dict[str, Any]:
    """List requirements with automatic session state access."""
    # Auto-resolve client_id from session state if not provided
    if not client_id:
        client_id = tool_context.state.get("client_id")
        if client_id:
            logger.info(f"list_requirements using client_id from session state: '{client_id}'")
        else:
            logger.info("list_requirements - no client_id in session state")

    if not client_id:
        return {
            "status": "error",
            "error": "Client ID is required to list requirements. Please provide your client ID."
        }

    # Store client_id back to session state for future use
    tool_context.state["client_id"] = client_id
    
    # Get database connection from tool context or initialize
    from lib.db import get_database
    db = get_database()
    tool = RequirementGatheringTool(db)
    
    return tool.list_requirements(client_id, requirement_type)


# ADK Function Tools
create_requirement_tool = FunctionTool(func=create_requirement_persistent)
list_requirements_tool = FunctionTool(func=list_requirements_persistent)
