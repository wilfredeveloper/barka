"""
Proposal Generator Tool for Documentation Agent
"""

import logging
from typing import Dict, Any, Optional, List
from bson import ObjectId
from datetime import datetime
from google.adk.tools import FunctionTool
from google.adk.tools.tool_context import ToolContext

logger = logging.getLogger(__name__)


class ProposalGeneratorTool:
    """Tool for generating project proposals."""
    
    def __init__(self, db):
        self.db = db
        self.proposals_collection = db["project_proposals"]
        self.clients_collection = db["clients"]
        
    def generate_proposal(self, client_id: str, project_name: str, 
                         executive_summary: str, scope: List[str],
                         timeline_weeks: int, budget: float) -> Dict[str, Any]:
        """Generate a project proposal."""
        try:
            client = self.clients_collection.find_one({"_id": ObjectId(client_id)})
            if not client:
                return {"status": "error", "error": "Client not found"}
            
            proposal_content = {
                "executive_summary": executive_summary,
                "project_scope": scope,
                "timeline": f"{timeline_weeks} weeks",
                "budget": budget,
                "methodology": "Agile development with regular client feedback",
                "team_structure": "Dedicated project team with specialized roles",
                "deliverables": scope,
                "next_steps": [
                    "Contract signing and project kickoff",
                    "Discovery and planning phase",
                    "Development and testing",
                    "Deployment and handover"
                ]
            }
            
            proposal_doc = {
                "clientId": ObjectId(client_id),
                "organizationId": client["organization"],
                "projectName": project_name,
                "documentType": "PROPOSAL",
                "content": proposal_content,
                "budget": budget,
                "timelineWeeks": timeline_weeks,
                "status": "draft",
                "generatedAt": datetime.utcnow()
            }
            
            result = self.proposals_collection.insert_one(proposal_doc)
            logger.info(f"Generated proposal {result.inserted_id} for client {client_id}")
            
            return {
                "status": "success",
                "proposal": {
                    "id": str(result.inserted_id),
                    "projectName": project_name,
                    "budget": budget,
                    "timelineWeeks": timeline_weeks
                }
            }
            
        except Exception as e:
            logger.error(f"Error generating proposal: {str(e)}")
            return {"status": "error", "error": f"Failed to generate proposal: {str(e)}"}
    
    def get_proposal_document(self, client_id: str, proposal_id: Optional[str] = None) -> Dict[str, Any]:
        """Get proposal document(s) for a client."""
        try:
            if proposal_id:
                proposal = self.proposals_collection.find_one({
                    "_id": ObjectId(proposal_id),
                    "clientId": ObjectId(client_id)
                })
                if not proposal:
                    return {"status": "error", "error": "Proposal not found"}
                
                return {
                    "status": "success",
                    "proposal": {
                        "id": str(proposal["_id"]),
                        "projectName": proposal["projectName"],
                        "content": proposal["content"],
                        "budget": proposal["budget"],
                        "timelineWeeks": proposal["timelineWeeks"],
                        "status": proposal["status"],
                        "generatedAt": proposal["generatedAt"].isoformat()
                    }
                }
            else:
                proposals = list(self.proposals_collection.find({
                    "clientId": ObjectId(client_id)
                }).sort("generatedAt", -1))
                
                return {
                    "status": "success",
                    "proposals": [
                        {
                            "id": str(p["_id"]),
                            "projectName": p["projectName"],
                            "budget": p["budget"],
                            "timelineWeeks": p["timelineWeeks"],
                            "status": p["status"],
                            "generatedAt": p["generatedAt"].isoformat()
                        } for p in proposals
                    ],
                    "total": len(proposals)
                }
            
        except Exception as e:
            logger.error(f"Error getting proposal: {str(e)}")
            return {"status": "error", "error": f"Failed to get proposal: {str(e)}"}


def generate_proposal_persistent(tool_context: ToolContext, project_name: str,
                               executive_summary: str, scope: List[str],
                               timeline_weeks: int, budget: float,
                               client_id: Optional[str]) -> Dict[str, Any]:
    """Generate proposal with automatic session state access."""
    # Auto-resolve client_id from session state if not provided
    if not client_id:
        client_id = tool_context.state.get("client_id")
        if client_id:
            logger.info(f"generate_proposal using client_id from session state: '{client_id}'")
        else:
            logger.info("generate_proposal - no client_id in session state")

    if not client_id:
        return {
            "status": "error",
            "error": "Client ID is required to generate proposal. Please provide your client ID."
        }

    # Store client_id back to session state for future use
    tool_context.state["client_id"] = client_id
    from lib.db import get_database
    db = get_database()
    tool = ProposalGeneratorTool(db)
    return tool.generate_proposal(client_id, project_name, executive_summary, scope, timeline_weeks, budget)


def get_proposal_document_persistent(tool_context: ToolContext, proposal_id: Optional[str],
                                   client_id: Optional[str]) -> Dict[str, Any]:
    """Get proposal document with automatic session state access."""
    # Auto-resolve client_id from session state if not provided
    if not client_id:
        client_id = tool_context.state.get("client_id")
        if client_id:
            logger.info(f"get_proposal_document using client_id from session state: '{client_id}'")
        else:
            logger.info("get_proposal_document - no client_id in session state")

    if not client_id:
        return {
            "status": "error",
            "error": "Client ID is required to get proposal document. Please provide your client ID."
        }

    # Store client_id back to session state for future use
    tool_context.state["client_id"] = client_id
    from lib.db import get_database
    db = get_database()
    tool = ProposalGeneratorTool(db)
    return tool.get_proposal_document(client_id, proposal_id)


# ADK Function Tools
generate_proposal_tool = FunctionTool(func=generate_proposal_persistent)
get_proposal_document_tool = FunctionTool(func=get_proposal_document_persistent)

# Export the persistent functions for agent imports
generate_proposal_persistent = generate_proposal_persistent
get_proposal_document_persistent = get_proposal_document_persistent
