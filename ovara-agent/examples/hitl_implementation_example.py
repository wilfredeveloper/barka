"""
Example implementation of Human-in-the-Loop (HITL) patterns for MCP server tools.

This demonstrates how to add confirmation requirements to potentially risky operations
while maintaining a smooth user experience.
"""

import hashlib
import time
from typing import Dict, Optional, List
from datetime import datetime, timezone

# Example: Enhanced delete_project with HITL confirmation
def delete_project_with_hitl(project_id: str, user_id: str, confirmation_token: Optional[str] = None) -> Dict:
    """
    Delete a project with Human-in-the-Loop confirmation.
    
    First call returns confirmation request.
    Second call with valid confirmation_token executes deletion.
    """
    try:
        if not validate_object_id(project_id) or not user_id:
            return create_response("error", error_message="Valid project_id and user_id are required")

        # If no confirmation token provided, return confirmation request
        if not confirmation_token:
            return request_deletion_confirmation(project_id, user_id)
        
        # Validate confirmation token
        if not validate_confirmation_token(confirmation_token, project_id, user_id, "delete_project"):
            return create_response("error", error_message="Invalid or expired confirmation token")
        
        # Execute the actual deletion
        return execute_project_deletion(project_id, user_id)
        
    except Exception as e:
        logger.error(f"Error in delete_project_with_hitl: {e}")
        return create_response("error", error_message=str(e))


def request_deletion_confirmation(project_id: str, user_id: str) -> Dict:
    """Generate confirmation request with project details and impact analysis."""
    
    # Get project details for impact analysis
    projects = db_manager.get_collection("projects")
    project = projects.find_one({"_id": ObjectId(project_id)})
    
    if not project:
        return create_response("error", error_message="Project not found")
    
    # Analyze impact
    impact_analysis = analyze_deletion_impact(project_id)
    
    # Generate confirmation token (valid for 5 minutes)
    confirmation_token = generate_confirmation_token(project_id, user_id, "delete_project")
    
    confirmation_data = {
        "operation": "delete_project",
        "requires_confirmation": True,
        "confirmation_token": confirmation_token,
        "expires_at": datetime.now(timezone.utc).isoformat(),
        "project_details": {
            "id": str(project["_id"]),
            "name": project.get("name"),
            "description": project.get("description"),
            "status": project.get("status"),
            "created_at": project.get("createdAt")
        },
        "impact_analysis": impact_analysis,
        "confirmation_message": f"""
⚠️ **DELETION CONFIRMATION REQUIRED**

**Project**: {project.get('name')}
**Impact**: This will permanently delete:
- Project data and history
- {impact_analysis['task_count']} associated tasks
- {impact_analysis['comment_count']} comments and updates
- Team assignments for {impact_analysis['team_member_count']} members

**⚠️ This action cannot be undone.**

To proceed, call this function again with the confirmation_token.
To cancel, simply don't provide the token.
        """.strip()
    }
    
    return create_response("confirmation_required", confirmation_data)


def analyze_deletion_impact(project_id: str) -> Dict:
    """Analyze the impact of deleting a project."""
    
    tasks = db_manager.get_collection("tasks")
    
    # Count associated tasks
    task_count = tasks.count_documents({"projectId": project_id})
    
    # Count comments across all tasks
    pipeline = [
        {"$match": {"projectId": project_id}},
        {"$project": {"comment_count": {"$size": {"$ifNull": ["$comments", []]}}}},
        {"$group": {"_id": None, "total_comments": {"$sum": "$comment_count"}}}
    ]
    comment_result = list(tasks.aggregate(pipeline))
    comment_count = comment_result[0]["total_comments"] if comment_result else 0
    
    # Count unique team members assigned to tasks
    pipeline = [
        {"$match": {"projectId": project_id, "assigneeId": {"$exists": True}}},
        {"$group": {"_id": "$assigneeId"}},
        {"$count": "unique_assignees"}
    ]
    assignee_result = list(tasks.aggregate(pipeline))
    team_member_count = assignee_result[0]["unique_assignees"] if assignee_result else 0
    
    return {
        "task_count": task_count,
        "comment_count": comment_count,
        "team_member_count": team_member_count,
        "risk_level": "high" if task_count > 5 or team_member_count > 2 else "medium"
    }


def generate_confirmation_token(project_id: str, user_id: str, operation: str) -> str:
    """Generate a secure confirmation token."""
    
    # Create token data
    timestamp = str(int(time.time()))
    token_data = f"{project_id}:{user_id}:{operation}:{timestamp}"
    
    # Add secret salt (in production, use environment variable)
    secret_salt = "your-secret-salt-here"  # Replace with secure secret
    token_with_salt = f"{token_data}:{secret_salt}"
    
    # Generate hash
    token_hash = hashlib.sha256(token_with_salt.encode()).hexdigest()
    
    # Return token (timestamp:hash)
    return f"{timestamp}:{token_hash}"


def validate_confirmation_token(token: str, project_id: str, user_id: str, operation: str) -> bool:
    """Validate confirmation token and check expiration."""
    
    try:
        # Parse token
        timestamp_str, token_hash = token.split(":", 1)
        timestamp = int(timestamp_str)
        
        # Check expiration (5 minutes = 300 seconds)
        current_time = int(time.time())
        if current_time - timestamp > 300:
            return False
        
        # Regenerate expected token
        expected_token = generate_confirmation_token(project_id, user_id, operation)
        expected_hash = expected_token.split(":", 1)[1]
        
        # Compare hashes
        return token_hash == expected_hash
        
    except (ValueError, IndexError):
        return False


def execute_project_deletion(project_id: str, user_id: str) -> Dict:
    """Execute the actual project deletion after confirmation."""
    
    projects = db_manager.get_collection("projects")
    tasks = db_manager.get_collection("tasks")
    
    # Delete associated tasks first
    task_deletion_result = tasks.delete_many({"projectId": project_id})
    
    # Delete the project
    project_deletion_result = projects.delete_one({"_id": ObjectId(project_id)})
    
    if project_deletion_result.deleted_count == 0:
        return create_response("error", error_message="Project not found or already deleted")
    
    deletion_summary = {
        "project_deleted": True,
        "project_id": project_id,
        "tasks_deleted": task_deletion_result.deleted_count,
        "deleted_by": user_id,
        "deleted_at": datetime.now(timezone.utc).isoformat()
    }
    
    logger.info(f"Project deleted with confirmation: {project_id} by {user_id}")
    return create_response("success", deletion_summary)


# Example: Enhanced update_project with conditional HITL
def update_project_with_hitl(project_id: str, user_id: str, name: Optional[str] = None, 
                           status: Optional[str] = None, confirmation_token: Optional[str] = None,
                           **other_fields) -> Dict:
    """
    Update project with HITL for critical changes.
    
    Some changes (like status to 'completed' or 'cancelled') require confirmation.
    """
    
    # Determine if confirmation is needed
    needs_confirmation = requires_update_confirmation(status, other_fields)
    
    if needs_confirmation and not confirmation_token:
        return request_update_confirmation(project_id, user_id, status, other_fields)
    
    if needs_confirmation and not validate_confirmation_token(confirmation_token, project_id, user_id, "update_project"):
        return create_response("error", error_message="Invalid or expired confirmation token")
    
    # Execute the update
    return execute_project_update(project_id, user_id, name, status, **other_fields)


def requires_update_confirmation(status: Optional[str], other_fields: Dict) -> bool:
    """Determine if project update requires confirmation."""
    
    # Status changes to final states require confirmation
    if status in ['completed', 'cancelled', 'archived']:
        return True
    
    # Budget changes over certain threshold require confirmation
    if 'budget' in other_fields and other_fields['budget']:
        # In real implementation, compare with current budget
        return True
    
    # End date changes require confirmation
    if 'end_date' in other_fields:
        return True
    
    return False


# Agent Integration Example
def agent_delete_project_workflow(project_id: str, user_id: str, user_message: str) -> str:
    """
    Example of how the agent would handle HITL deletion workflow.
    """
    
    # First attempt - request confirmation
    result = delete_project_with_hitl(project_id, user_id)
    
    if result["status"] == "confirmation_required":
        # Store confirmation token for next interaction
        confirmation_token = result["data"]["confirmation_token"]
        
        # Return confirmation message to user
        return result["data"]["confirmation_message"] + f"\n\n*Confirmation token stored for next interaction*"
    
    elif result["status"] == "success":
        # Deletion completed
        data = result["data"]
        return f"""
✅ **Project Successfully Deleted**

- Project: {project_id}
- Tasks deleted: {data['tasks_deleted']}
- Deleted at: {data['deleted_at']}

The project and all associated data have been permanently removed.
        """.strip()
    
    else:
        # Error occurred
        return f"❌ Error: {result.get('error_message', 'Unknown error occurred')}"


# Usage in MCP Server
"""
To integrate this into your MCP server:

1. Replace existing delete_project function with delete_project_with_hitl
2. Update the ADK_PROJECT_TOOLS dictionary:
   "delete_project": FunctionTool(func=delete_project_with_hitl)
3. Update agent prompt to handle confirmation workflow
4. Test with various scenarios
"""
