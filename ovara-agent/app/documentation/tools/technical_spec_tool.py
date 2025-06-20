"""
Technical Specification Tool for Documentation Agent
"""

import logging
from typing import Dict, Any, Optional, List
from bson import ObjectId
from datetime import datetime
from google.adk.tools import FunctionTool
from google.adk.tools.tool_context import ToolContext

logger = logging.getLogger(__name__)


class TechnicalSpecTool:
    """Tool for generating technical specifications."""
    
    def __init__(self, db):
        self.db = db
        self.tech_specs_collection = db["technical_specifications"]
        self.clients_collection = db["clients"]
        
    def generate_technical_spec(self, client_id: str, project_name: str,
                              architecture: Dict[str, Any], technology_stack: List[str],
                              api_specifications: List[Dict[str, Any]],
                              database_design: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a technical specification document."""
        try:
            client = self.clients_collection.find_one({"_id": ObjectId(client_id)})
            if not client:
                return {"status": "error", "error": "Client not found"}
            
            tech_spec_content = {
                "system_architecture": architecture,
                "technology_stack": {
                    "frontend": [tech for tech in technology_stack if any(x in tech.lower() for x in ['react', 'vue', 'angular', 'html', 'css', 'js'])],
                    "backend": [tech for tech in technology_stack if any(x in tech.lower() for x in ['node', 'python', 'java', 'php', 'ruby'])],
                    "database": [tech for tech in technology_stack if any(x in tech.lower() for x in ['mongo', 'mysql', 'postgres', 'redis'])],
                    "other": [tech for tech in technology_stack if not any(x in tech.lower() for x in ['react', 'vue', 'angular', 'html', 'css', 'js', 'node', 'python', 'java', 'php', 'ruby', 'mongo', 'mysql', 'postgres', 'redis'])]
                },
                "api_specifications": api_specifications,
                "database_design": database_design,
                "security_considerations": [
                    "Authentication and authorization implementation",
                    "Data encryption in transit and at rest",
                    "Input validation and sanitization",
                    "Regular security audits and updates"
                ],
                "performance_requirements": [
                    "Page load times under 3 seconds",
                    "API response times under 500ms",
                    "Support for concurrent users",
                    "Scalable architecture design"
                ],
                "deployment_strategy": {
                    "environment_setup": "Development, Staging, Production",
                    "ci_cd_pipeline": "Automated testing and deployment",
                    "monitoring": "Application and infrastructure monitoring",
                    "backup_strategy": "Regular automated backups"
                }
            }
            
            tech_spec_doc = {
                "clientId": ObjectId(client_id),
                "organizationId": client["organization"],
                "projectName": project_name,
                "documentType": "TECHNICAL_SPEC",
                "content": tech_spec_content,
                "status": "draft",
                "generatedAt": datetime.utcnow(),
                "metadata": {
                    "technologyCount": len(technology_stack),
                    "apiEndpoints": len(api_specifications),
                    "complexity": "medium"
                }
            }
            
            result = self.tech_specs_collection.insert_one(tech_spec_doc)
            logger.info(f"Generated technical spec {result.inserted_id} for client {client_id}")
            
            return {
                "status": "success",
                "technicalSpec": {
                    "id": str(result.inserted_id),
                    "projectName": project_name,
                    "technologyCount": len(technology_stack),
                    "apiEndpoints": len(api_specifications),
                    "status": "draft"
                }
            }
            
        except Exception as e:
            logger.error(f"Error generating technical spec: {str(e)}")
            return {"status": "error", "error": f"Failed to generate technical spec: {str(e)}"}
    
    def get_technical_spec(self, client_id: str, spec_id: Optional[str] = None) -> Dict[str, Any]:
        """Get technical specification(s) for a client."""
        try:
            if spec_id:
                spec = self.tech_specs_collection.find_one({
                    "_id": ObjectId(spec_id),
                    "clientId": ObjectId(client_id)
                })
                if not spec:
                    return {"status": "error", "error": "Technical specification not found"}
                
                return {
                    "status": "success",
                    "technicalSpec": {
                        "id": str(spec["_id"]),
                        "projectName": spec["projectName"],
                        "content": spec["content"],
                        "status": spec["status"],
                        "metadata": spec["metadata"],
                        "generatedAt": spec["generatedAt"].isoformat()
                    }
                }
            else:
                specs = list(self.tech_specs_collection.find({
                    "clientId": ObjectId(client_id)
                }).sort("generatedAt", -1))
                
                return {
                    "status": "success",
                    "technicalSpecs": [
                        {
                            "id": str(s["_id"]),
                            "projectName": s["projectName"],
                            "status": s["status"],
                            "metadata": s["metadata"],
                            "generatedAt": s["generatedAt"].isoformat()
                        } for s in specs
                    ],
                    "total": len(specs)
                }
            
        except Exception as e:
            logger.error(f"Error getting technical spec: {str(e)}")
            return {"status": "error", "error": f"Failed to get technical spec: {str(e)}"}


def generate_technical_spec_persistent(tool_context: ToolContext, project_name: str,
                                     architecture: Dict[str, Any], technology_stack: List[str],
                                     api_specifications: List[Dict[str, Any]],
                                     database_design: Dict[str, Any],
                                     client_id: Optional[str]) -> Dict[str, Any]:
    """Generate technical spec with automatic session state access."""
    # Auto-resolve client_id from session state if not provided
    if not client_id:
        client_id = tool_context.state.get("client_id")
        if client_id:
            logger.info(f"generate_technical_spec using client_id from session state: '{client_id}'")
        else:
            logger.info("generate_technical_spec - no client_id in session state")

    if not client_id:
        return {
            "status": "error",
            "error": "Client ID is required to generate technical spec. Please provide your client ID."
        }

    # Store client_id back to session state for future use
    tool_context.state["client_id"] = client_id
    from lib.db import get_database
    db = get_database()
    tool = TechnicalSpecTool(db)
    return tool.generate_technical_spec(client_id, project_name, architecture, technology_stack, api_specifications, database_design)


def get_technical_spec_persistent(tool_context: ToolContext, spec_id: Optional[str],
                                client_id: Optional[str]) -> Dict[str, Any]:
    """Get technical spec with automatic session state access."""
    # Auto-resolve client_id from session state if not provided
    if not client_id:
        client_id = tool_context.state.get("client_id")
        if client_id:
            logger.info(f"get_technical_spec using client_id from session state: '{client_id}'")
        else:
            logger.info("get_technical_spec - no client_id in session state")

    if not client_id:
        return {
            "status": "error",
            "error": "Client ID is required to get technical spec. Please provide your client ID."
        }

    # Store client_id back to session state for future use
    tool_context.state["client_id"] = client_id
    from lib.db import get_database
    db = get_database()
    tool = TechnicalSpecTool(db)
    return tool.get_technical_spec(client_id, spec_id)


# ADK Function Tools
generate_technical_spec_tool = FunctionTool(func=generate_technical_spec_persistent)
get_technical_spec_tool = FunctionTool(func=get_technical_spec_persistent)

# Export the persistent functions for agent imports
generate_technical_spec_persistent = generate_technical_spec_persistent
get_technical_spec_persistent = get_technical_spec_persistent
