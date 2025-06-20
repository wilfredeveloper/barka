"""
Contract Generator Tool for Documentation Agent

This tool handles contract generation including terms, conditions,
payment schedules, and legal protections.
"""

import logging
from typing import Dict, Any, Optional, List
from bson import ObjectId
from datetime import datetime, timedelta
from google.adk.tools import FunctionTool
from google.adk.tools.tool_context import ToolContext

logger = logging.getLogger(__name__)


class ContractGeneratorTool:
    """Tool for generating project contracts and legal agreements."""
    
    def __init__(self, db):
        """Initialize with database connection."""
        self.db = db
        self.contracts_collection = db["project_contracts"]
        self.clients_collection = db["clients"]
        
    def generate_contract(self, client_id: str, project_name: str, 
                         project_scope: str, deliverables: List[Dict[str, Any]],
                         total_cost: float, payment_schedule: List[Dict[str, Any]],
                         timeline_weeks: int, terms_conditions: List[str] = None) -> Dict[str, Any]:
        """Generate a comprehensive project contract."""
        try:
            client = self.clients_collection.find_one({"_id": ObjectId(client_id)})
            if not client:
                return {"status": "error", "error": "Client not found"}
            
            # Calculate contract dates
            start_date = datetime.utcnow()
            end_date = start_date + timedelta(weeks=timeline_weeks)
            
            # Generate contract content
            contract_content = {
                "parties": {
                    "client": {
                        "name": f"{client.get('firstName', '')} {client.get('lastName', '')}".strip(),
                        "organization": str(client.get("organization", "")),
                        "email": client.get("email", "")
                    },
                    "service_provider": {
                        "name": "Orka PRO Services",
                        "address": "Professional Software Development Services",
                        "contact": "contact@orkapro.com"
                    }
                },
                "project_details": {
                    "name": project_name,
                    "scope": project_scope,
                    "deliverables": deliverables,
                    "start_date": start_date.strftime("%Y-%m-%d"),
                    "end_date": end_date.strftime("%Y-%m-%d"),
                    "estimated_duration_weeks": timeline_weeks
                },
                "financial_terms": {
                    "total_cost": total_cost,
                    "currency": "USD",
                    "payment_schedule": payment_schedule,
                    "late_payment_fee": "1.5% per month",
                    "expense_policy": "Client responsible for third-party services and licenses"
                },
                "terms_and_conditions": terms_conditions or self._get_default_terms(),
                "intellectual_property": {
                    "ownership": "Client owns final deliverables upon full payment",
                    "work_for_hire": "All work performed is considered work for hire",
                    "confidentiality": "Both parties agree to maintain confidentiality"
                },
                "termination": {
                    "notice_period": "30 days written notice",
                    "payment_upon_termination": "Payment due for work completed",
                    "deliverable_handover": "All completed work to be delivered"
                }
            }
            
            contract_doc = {
                "clientId": ObjectId(client_id),
                "organizationId": client["organization"],
                "projectName": project_name,
                "documentType": "CONTRACT",
                "version": "1.0",
                "content": contract_content,
                "status": "draft",
                "totalCost": total_cost,
                "timelineWeeks": timeline_weeks,
                "generatedAt": datetime.utcnow(),
                "lastModified": datetime.utcnow(),
                "signatureStatus": "pending",
                "metadata": {
                    "deliverablesCount": len(deliverables),
                    "paymentMilestones": len(payment_schedule),
                    "contractValue": total_cost
                }
            }
            
            result = self.contracts_collection.insert_one(contract_doc)
            logger.info(f"Generated contract {result.inserted_id} for client {client_id}")
            
            return {
                "status": "success",
                "contract": {
                    "id": str(result.inserted_id),
                    "projectName": project_name,
                    "totalCost": total_cost,
                    "timelineWeeks": timeline_weeks,
                    "deliverablesCount": len(deliverables),
                    "status": "draft"
                }
            }
            
        except Exception as e:
            logger.error(f"Error generating contract: {str(e)}")
            return {"status": "error", "error": f"Failed to generate contract: {str(e)}"}
    
    def get_contract_document(self, client_id: str, contract_id: Optional[str] = None) -> Dict[str, Any]:
        """Get contract document(s) for a client."""
        try:
            if contract_id:
                contract = self.contracts_collection.find_one({
                    "_id": ObjectId(contract_id),
                    "clientId": ObjectId(client_id)
                })
                
                if not contract:
                    return {"status": "error", "error": "Contract not found"}
                
                formatted_contract = {
                    "id": str(contract["_id"]),
                    "projectName": contract["projectName"],
                    "version": contract["version"],
                    "content": contract["content"],
                    "status": contract["status"],
                    "signatureStatus": contract["signatureStatus"],
                    "totalCost": contract["totalCost"],
                    "timelineWeeks": contract["timelineWeeks"],
                    "metadata": contract["metadata"],
                    "generatedAt": contract["generatedAt"].isoformat()
                }
                
                return {"status": "success", "contract": formatted_contract}
            else:
                contracts = list(self.contracts_collection.find({
                    "clientId": ObjectId(client_id)
                }).sort("generatedAt", -1))
                
                formatted_contracts = []
                for contract in contracts:
                    formatted_contracts.append({
                        "id": str(contract["_id"]),
                        "projectName": contract["projectName"],
                        "version": contract["version"],
                        "status": contract["status"],
                        "signatureStatus": contract["signatureStatus"],
                        "totalCost": contract["totalCost"],
                        "timelineWeeks": contract["timelineWeeks"],
                        "generatedAt": contract["generatedAt"].isoformat()
                    })
                
                return {
                    "status": "success",
                    "contracts": formatted_contracts,
                    "total": len(formatted_contracts)
                }
            
        except Exception as e:
            logger.error(f"Error getting contract: {str(e)}")
            return {"status": "error", "error": f"Failed to get contract: {str(e)}"}
    
    def _get_default_terms(self) -> List[str]:
        """Get default contract terms and conditions."""
        return [
            "Payment terms: Net 30 days from invoice date",
            "Scope changes require written approval and may affect timeline and cost",
            "Client responsible for providing timely feedback and approvals",
            "Service provider retains right to use project as portfolio example",
            "Force majeure clause applies to unforeseeable circumstances",
            "Governing law: [Jurisdiction to be specified]",
            "Dispute resolution through mediation before litigation",
            "Client warrants authority to enter into this agreement"
        ]


# Session-aware wrapper functions for ADK integration
def generate_contract_persistent(tool_context: ToolContext, project_name: str,
                               project_scope: str, deliverables: List[Dict[str, Any]],
                               total_cost: float, payment_schedule: List[Dict[str, Any]],
                               timeline_weeks: int, terms_conditions: Optional[List[str]],
                               client_id: Optional[str]) -> Dict[str, Any]:
    """Generate contract with automatic session state access."""
    # Auto-resolve client_id from session state if not provided
    if not client_id:
        client_id = tool_context.state.get("client_id")
        if client_id:
            logger.info(f"generate_contract using client_id from session state: '{client_id}'")
        else:
            logger.info("generate_contract - no client_id in session state")

    if not client_id:
        return {
            "status": "error",
            "error": "Client ID is required to generate contract. Please provide your client ID."
        }

    # Store client_id back to session state for future use
    tool_context.state["client_id"] = client_id
    
    from lib.db import get_database
    db = get_database()
    tool = ContractGeneratorTool(db)
    
    return tool.generate_contract(client_id, project_name, project_scope, deliverables,
                                total_cost, payment_schedule, timeline_weeks, terms_conditions)


def get_contract_document_persistent(tool_context: ToolContext, contract_id: Optional[str],
                                   client_id: Optional[str]) -> Dict[str, Any]:
    """Get contract document with automatic session state access."""
    # Auto-resolve client_id from session state if not provided
    if not client_id:
        client_id = tool_context.state.get("client_id")
        if client_id:
            logger.info(f"get_contract_document using client_id from session state: '{client_id}'")
        else:
            logger.info("get_contract_document - no client_id in session state")

    if not client_id:
        return {
            "status": "error",
            "error": "Client ID is required to get contract document. Please provide your client ID."
        }

    # Store client_id back to session state for future use
    tool_context.state["client_id"] = client_id
    
    from lib.db import get_database
    db = get_database()
    tool = ContractGeneratorTool(db)
    
    return tool.get_contract_document(client_id, contract_id)


# ADK Function Tools
generate_contract_tool = FunctionTool(func=generate_contract_persistent)
get_contract_document_tool = FunctionTool(func=get_contract_document_persistent)

# Export the persistent functions for agent imports
generate_contract_persistent = generate_contract_persistent
get_contract_document_persistent = get_contract_document_persistent
