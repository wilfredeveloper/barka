"""
SRS Generator Tool for Documentation Agent

This tool handles Software Requirements Specification (SRS) generation
based on discovery findings and project requirements.
"""

import logging
from typing import Dict, Any, Optional, List
from bson import ObjectId
from datetime import datetime
from google.adk.tools import FunctionTool
from google.adk.tools.tool_context import ToolContext

logger = logging.getLogger(__name__)


class SRSGeneratorTool:
    """Tool for generating Software Requirements Specifications."""
    
    def __init__(self, db):
        """Initialize with database connection."""
        self.db = db
        self.srs_documents_collection = db["srs_documents"]
        self.clients_collection = db["clients"]
        self.requirements_collection = db["project_requirements"]
        
    def generate_srs(self, client_id: str, project_name: str, 
                    functional_requirements: List[Dict[str, Any]],
                    non_functional_requirements: List[Dict[str, Any]],
                    system_overview: str, assumptions: List[str] = None,
                    constraints: List[str] = None) -> Dict[str, Any]:
        """
        Generate a comprehensive Software Requirements Specification.
        
        Args:
            client_id: Client identifier
            project_name: Name of the project
            functional_requirements: List of functional requirements
            non_functional_requirements: List of non-functional requirements
            system_overview: High-level system description
            assumptions: Project assumptions
            constraints: Project constraints
            
        Returns:
            Dict containing the generated SRS document data
        """
        try:
            # Validate client exists
            client = self.clients_collection.find_one({"_id": ObjectId(client_id)})
            if not client:
                return {
                    "status": "error",
                    "error": "Client not found"
                }
            
            # Generate SRS content structure
            srs_content = {
                "introduction": {
                    "purpose": f"This Software Requirements Specification (SRS) describes the functional and non-functional requirements for {project_name}.",
                    "scope": system_overview,
                    "definitions": [],
                    "references": [],
                    "overview": "This document provides a comprehensive description of the software requirements."
                },
                "overall_description": {
                    "product_perspective": system_overview,
                    "product_functions": [req["title"] for req in functional_requirements[:5]],
                    "user_characteristics": [],
                    "constraints": constraints or [],
                    "assumptions": assumptions or []
                },
                "specific_requirements": {
                    "functional_requirements": functional_requirements,
                    "non_functional_requirements": non_functional_requirements,
                    "interface_requirements": [],
                    "performance_requirements": [req for req in non_functional_requirements if req.get("category") == "performance"]
                },
                "appendices": {
                    "glossary": [],
                    "analysis_models": [],
                    "issues_list": []
                }
            }
            
            # Create SRS document
            srs_doc = {
                "clientId": ObjectId(client_id),
                "organizationId": client["organization"],
                "projectName": project_name,
                "documentType": "SRS",
                "version": "1.0",
                "content": srs_content,
                "status": "draft",
                "generatedAt": datetime.utcnow(),
                "lastModified": datetime.utcnow(),
                "approvalStatus": "pending",
                "metadata": {
                    "functionalReqCount": len(functional_requirements),
                    "nonFunctionalReqCount": len(non_functional_requirements),
                    "totalPages": self._estimate_pages(srs_content)
                }
            }
            
            # Insert SRS document
            result = self.srs_documents_collection.insert_one(srs_doc)
            srs_doc["_id"] = result.inserted_id
            
            logger.info(f"Generated SRS document {result.inserted_id} for client {client_id}")
            
            return {
                "status": "success",
                "srsDocument": {
                    "id": str(result.inserted_id),
                    "projectName": project_name,
                    "version": "1.0",
                    "functionalReqCount": len(functional_requirements),
                    "nonFunctionalReqCount": len(non_functional_requirements),
                    "estimatedPages": srs_doc["metadata"]["totalPages"],
                    "status": "draft"
                }
            }
            
        except Exception as e:
            logger.error(f"Error generating SRS: {str(e)}")
            return {
                "status": "error",
                "error": f"Failed to generate SRS: {str(e)}"
            }
    
    def get_srs_document(self, client_id: str, document_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Get SRS document(s) for a client.
        
        Args:
            client_id: Client identifier
            document_id: Optional specific document ID
            
        Returns:
            Dict containing the SRS document data
        """
        try:
            if document_id:
                # Get specific document
                doc = self.srs_documents_collection.find_one({
                    "_id": ObjectId(document_id),
                    "clientId": ObjectId(client_id)
                })
                
                if not doc:
                    return {
                        "status": "error",
                        "error": "SRS document not found"
                    }
                
                # Format document
                formatted_doc = {
                    "id": str(doc["_id"]),
                    "projectName": doc["projectName"],
                    "documentType": doc["documentType"],
                    "version": doc["version"],
                    "content": doc["content"],
                    "status": doc["status"],
                    "approvalStatus": doc["approvalStatus"],
                    "metadata": doc["metadata"],
                    "generatedAt": doc["generatedAt"].isoformat(),
                    "lastModified": doc["lastModified"].isoformat()
                }
                
                return {
                    "status": "success",
                    "srsDocument": formatted_doc
                }
            else:
                # Get all SRS documents for client
                docs = list(self.srs_documents_collection.find({
                    "clientId": ObjectId(client_id),
                    "documentType": "SRS"
                }).sort("generatedAt", -1))
                
                # Format documents
                formatted_docs = []
                for doc in docs:
                    formatted_docs.append({
                        "id": str(doc["_id"]),
                        "projectName": doc["projectName"],
                        "version": doc["version"],
                        "status": doc["status"],
                        "approvalStatus": doc["approvalStatus"],
                        "functionalReqCount": doc["metadata"]["functionalReqCount"],
                        "nonFunctionalReqCount": doc["metadata"]["nonFunctionalReqCount"],
                        "estimatedPages": doc["metadata"]["totalPages"],
                        "generatedAt": doc["generatedAt"].isoformat()
                    })
                
                return {
                    "status": "success",
                    "srsDocuments": formatted_docs,
                    "total": len(formatted_docs)
                }
            
        except Exception as e:
            logger.error(f"Error getting SRS document: {str(e)}")
            return {
                "status": "error",
                "error": f"Failed to get SRS document: {str(e)}"
            }
    
    def _estimate_pages(self, content: Dict[str, Any]) -> int:
        """Estimate the number of pages for the SRS document."""
        # Simple estimation based on content sections
        base_pages = 5  # Introduction, overview, etc.
        functional_pages = len(content["specific_requirements"]["functional_requirements"]) // 3
        non_functional_pages = len(content["specific_requirements"]["non_functional_requirements"]) // 5
        return base_pages + functional_pages + non_functional_pages


# Session-aware wrapper functions for ADK integration
def generate_srs_persistent(tool_context: ToolContext, project_name: str,
                          functional_requirements: List[Dict[str, Any]],
                          non_functional_requirements: List[Dict[str, Any]],
                          system_overview: str, assumptions: Optional[List[str]],
                          constraints: Optional[List[str]], client_id: Optional[str]) -> Dict[str, Any]:
    """Generate SRS with automatic session state access."""
    # Auto-resolve client_id from session state if not provided
    if not client_id:
        client_id = tool_context.state.get("client_id")
        if client_id:
            logger.info(f"generate_srs using client_id from session state: '{client_id}'")
        else:
            logger.info("generate_srs - no client_id in session state")

    if not client_id:
        return {
            "status": "error",
            "error": "Client ID is required to generate SRS. Please provide your client ID."
        }

    # Store client_id back to session state for future use
    tool_context.state["client_id"] = client_id
    
    # Get database connection from tool context or initialize
    from lib.db import get_database
    db = get_database()
    tool = SRSGeneratorTool(db)
    
    return tool.generate_srs(client_id, project_name, functional_requirements,
                           non_functional_requirements, system_overview, assumptions, constraints)


def get_srs_document_persistent(tool_context: ToolContext, document_id: Optional[str] = None,
                              client_id: Optional[str] = None) -> Dict[str, Any]:
    """Get SRS document with automatic session state access.

    Args:
        tool_context: ADK tool context with session state
        document_id: Optional specific document ID to retrieve
        client_id: Optional client ID (will be auto-resolved from session if not provided)

    Returns:
        Dict containing SRS document data or error message
    """
    try:
        # Debug: Log the entire session state to understand what's available
        logger.info(f"get_srs_document_persistent called with document_id='{document_id}', client_id='{client_id}'")
        # logger.info(f"Session state keys: {list(tool_context.state.keys())}")
        logger.info(f"Full session state: {tool_context.state}")

        # Auto-resolve client_id from session state if not provided
        if not client_id:
            client_id = tool_context.state.get("client_id")
            if client_id:
                logger.info(f"get_srs_document using client_id from session state: '{client_id}'")
            else:
                logger.info("get_srs_document - no client_id in session state")
    except Exception as e:
        logger.error(f"Error in get_srs_document_persistent setup: {e}")
        return {
            "status": "error",
            "error": f"Tool setup error: {str(e)}"
        }

    if not client_id:
        return {
            "status": "error",
            "error": "Client ID is required to get SRS document. Please provide your client ID."
        }

    try:
        # Store client_id back to session state for future use
        tool_context.state["client_id"] = client_id

        # Get database connection from tool context or initialize
        from lib.db import get_database
        db = get_database()
        tool = SRSGeneratorTool(db)

        return tool.get_srs_document(client_id, document_id)

    except Exception as e:
        logger.error(f"Error in get_srs_document_persistent execution: {e}")
        return {
            "status": "error",
            "error": f"Failed to retrieve SRS document: {str(e)}"
        }


# ADK Function Tools
generate_srs_tool = FunctionTool(func=generate_srs_persistent)
get_srs_document_tool = FunctionTool(func=get_srs_document_persistent)

# Export the persistent functions for agent imports
generate_srs_persistent = generate_srs_persistent
get_srs_document_persistent = get_srs_document_persistent
