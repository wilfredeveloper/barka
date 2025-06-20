#!/usr/bin/env python3
"""
Python MCP Server for Barka Project Management
Converts the Node.js MCP server to Python for native Google ADK integration
"""

import asyncio
import json
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any, Union

# MCP Server Imports
import mcp.server.stdio
from mcp import types as mcp_types
from mcp.server.lowlevel import NotificationOptions, Server
from mcp.server.models import InitializationOptions

# ADK Tool Imports
from google.adk.tools.function_tool import FunctionTool
from google.adk.tools.mcp_tool.conversion_utils import adk_to_mcp_tool_type

# MongoDB imports
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from bson import ObjectId
from bson.errors import InvalidId

# Environment setup
from dotenv import load_dotenv
load_dotenv()

# Session-aware MCP tools
from utils.session_aware_mcp_tools import (
    SessionAwareMCPTool,
    set_current_session_state,
    create_mock_tool_context,
    MCPParameterResolver
)

# --- Logging Setup ---
LOG_FILE_PATH = os.path.join(os.path.dirname(__file__), "mcp_server_activity.log")
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE_PATH, mode="w"),
        logging.StreamHandler(sys.stdout)
    ],
)
logger = logging.getLogger(__name__)

# --- Database Configuration ---
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/orka_pro")
DATABASE_NAME = "orka_pro"

class DatabaseManager:
    """MongoDB database manager for the MCP server with lazy connection"""

    def __init__(self):
        self.client: Optional[MongoClient] = None
        self.db = None
        self._connected = False

    def _ensure_connection(self):
        """Ensure database connection is established (lazy connection)"""
        if not self._connected:
            try:
                self.client = MongoClient(MONGODB_URI)
                self.db = self.client[DATABASE_NAME]
                # Test connection
                self.client.admin.command('ping')
                self._connected = True
                logger.info(f"Connected to MongoDB: {DATABASE_NAME}")
            except Exception as e:
                logger.error(f"Failed to connect to MongoDB: {e}")
                raise Exception(f"Database connection failed: {e}")

    def disconnect(self):
        """Disconnect from MongoDB"""
        if self.client:
            self.client.close()
            self._connected = False
            logger.info("Disconnected from MongoDB")

    def get_collection(self, collection_name: str):
        """Get a MongoDB collection (connects if needed)"""
        self._ensure_connection()
        return self.db[collection_name]

# Global database manager
db_manager = DatabaseManager()

# --- Utility Functions ---
def validate_object_id(id_str: str) -> bool:
    """Validate if string is a valid MongoDB ObjectId"""
    try:
        ObjectId(id_str)
        return True
    except InvalidId:
        return False

def convert_object_ids(data: Any) -> Any:
    """Convert ObjectId instances and datetime objects to JSON-serializable formats recursively"""
    if isinstance(data, ObjectId):
        return str(data)
    elif isinstance(data, datetime):
        return data.isoformat()
    elif isinstance(data, dict):
        return {key: convert_object_ids(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [convert_object_ids(item) for item in data]
    else:
        return data

def create_response(status: str = "success", data: Any = None, error_message: str = None) -> Dict:
    """Create standardized response format"""
    response = {"status": status}
    if data is not None:
        response["data"] = convert_object_ids(data)
    if error_message:
        response["error_message"] = error_message
    return response

# --- Project Operations Functions ---
def create_project(name: str, user_id: str, description: Optional[str], client_id: Optional[str],
                  organization_id: Optional[str], start_date: Optional[str], end_date: Optional[str],
                  budget: Optional[float], status: Optional[str],
                  priority: Optional[str], tags: Optional[List[str]]) -> Dict:
    """Create a new project"""
    try:
        if not name or not user_id:
            return create_response("error", error_message="name and user_id are required")

        projects = db_manager.get_collection("projects")

        project_data = {
            "name": name,
            "description": description or "",
            "status": status or "planning",
            "priority": priority or "medium",
            "tags": tags or [],
            "createdBy": user_id,
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc)
        }

        # Add optional fields
        if client_id:
            project_data["client"] = ObjectId(client_id)
        if organization_id:
            project_data["organization"] = ObjectId(organization_id)
        if start_date:
            project_data["startDate"] = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        if end_date:
            project_data["endDate"] = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        if budget is not None:
            project_data["budget"] = budget
            
        result = projects.insert_one(project_data)
        project_data["_id"] = result.inserted_id
        
        logger.info(f"Created project: {name} with ID: {result.inserted_id}")
        return create_response("success", project_data)
        
    except Exception as e:
        logger.error(f"Error creating project: {e}")
        return create_response("error", error_message=str(e))

def get_project(project_id: str, client_id: Optional[str], organization_id: Optional[str]) -> Dict:
    """Get comprehensive project details including team members, tasks, and documents.

    This tool retrieves a single project from the database with all related information
    populated, similar to what the frontend receives when viewing a project detail page.
    The client_id and organization_id parameters are OPTIONAL and used for access control/scoping.

    Args:
        project_id (str): Required. The MongoDB ObjectId of the project to retrieve.
        client_id (Optional[str]): Optional. If provided, only returns the project if it
                                 belongs to this client. Used for access control.
        organization_id (Optional[str]): Optional. If provided, only returns the project if it
                                       belongs to this organization. Used for access control.

    Returns:
        Dict: Response with status 'success' and comprehensive project data including:
            - Basic project information (name, description, status, priority, etc.)
            - Populated client information (if available)
            - Populated organization information (if available)
            - Project manager details (if assigned)
            - Team members list with their details
            - All project tasks with assignee information
            - Linked documents (if any)
            - Calendar events (if any)
            - Progress metrics and statistics
            - Status history and audit trail

    Usage Examples:
        - get_project("507f1f77bcf86cd799439011") - Gets comprehensive project details
        - get_project("507f1f77bcf86cd799439011", client_id="507f1f77bcf86cd799439012") - With client filter
        - get_project("507f1f77bcf86cd799439011", organization_id="507f1f77bcf86cd799439013") - With org filter
    """
    try:
        if not validate_object_id(project_id):
            return create_response("error", error_message="Invalid project_id format")

        # Get collections
        projects = db_manager.get_collection("projects")
        tasks = db_manager.get_collection("tasks")
        team_members = db_manager.get_collection("team_members")
        clients = db_manager.get_collection("clients")
        organizations = db_manager.get_collection("organizations")

        # Build query with optional filters
        query = {"_id": ObjectId(project_id)}
        if client_id:
            if not validate_object_id(client_id):
                return create_response("error", error_message="Invalid client_id format")
            query["client"] = ObjectId(client_id)
        if organization_id:
            if not validate_object_id(organization_id):
                return create_response("error", error_message="Invalid organization_id format")
            query["organization"] = ObjectId(organization_id)

        # Get the base project
        project = projects.find_one(query)
        if not project:
            return create_response("error", error_message="Project not found")

        # Convert ObjectId to string for JSON serialization
        project["_id"] = str(project["_id"])
        project["id"] = project["_id"]  # Add id field for frontend compatibility

        # Populate client information
        if project.get("client"):
            client_id_obj = project["client"]
            if isinstance(client_id_obj, ObjectId):
                client = clients.find_one({"_id": client_id_obj})
                if client:
                    client["_id"] = str(client["_id"])
                    # If client has user reference, populate it
                    if client.get("user") and isinstance(client["user"], ObjectId):
                        users = db_manager.get_collection("users")
                        user = users.find_one({"_id": client["user"]},
                                            {"firstName": 1, "lastName": 1, "email": 1})
                        if user:
                            user["_id"] = str(user["_id"])
                            client["user"] = user
                    project["client"] = client

        # Populate organization information
        if project.get("organization"):
            org_id_obj = project["organization"]
            if isinstance(org_id_obj, ObjectId):
                organization = organizations.find_one({"_id": org_id_obj})
                if organization:
                    organization["_id"] = str(organization["_id"])
                    organization["id"] = organization["_id"]
                    project["organization"] = organization

        # Populate project manager
        if project.get("projectManager"):
            pm_id_obj = project["projectManager"]
            if isinstance(pm_id_obj, ObjectId):
                project_manager = team_members.find_one({"_id": pm_id_obj})
                if project_manager:
                    project_manager["_id"] = str(project_manager["_id"])
                    project["projectManager"] = project_manager

        # Populate team members
        team_member_ids = project.get("teamMembers", [])
        if team_member_ids:
            team_member_object_ids = [ObjectId(tm_id) if isinstance(tm_id, str) else tm_id
                                    for tm_id in team_member_ids if tm_id]
            if team_member_object_ids:
                team_cursor = team_members.find({"_id": {"$in": team_member_object_ids}})
                team_list = []
                for member in team_cursor:
                    member["_id"] = str(member["_id"])
                    team_list.append(member)
                project["teamMembers"] = team_list

        # Get all project tasks with assignee information
        task_cursor = tasks.find({"project": ObjectId(project_id)})
        task_list = []
        for task in task_cursor:
            task["_id"] = str(task["_id"])
            task["id"] = task["_id"]

            # Convert project reference to string
            if task.get("project"):
                task["project"] = str(task["project"])

            # Populate assignedTo if present
            if task.get("assignedTo"):
                assignee_id = task["assignedTo"]
                if isinstance(assignee_id, ObjectId):
                    assignee = team_members.find_one({"_id": assignee_id},
                                                   {"name": 1, "email": 1, "role": 1})
                    if assignee:
                        assignee["_id"] = str(assignee["_id"])
                        task["assignedTo"] = assignee

            # Convert other ObjectId fields to strings
            for field in ["client", "organization", "createdBy", "updatedBy"]:
                if task.get(field) and isinstance(task[field], ObjectId):
                    task[field] = str(task[field])

            task_list.append(task)

        project["tasks"] = task_list

        # Calculate progress metrics based on tasks
        total_tasks = len(task_list)
        completed_tasks = len([t for t in task_list if t.get("status") == "completed"])
        in_progress_tasks = len([t for t in task_list if t.get("status") == "in_progress"])
        not_started_tasks = len([t for t in task_list if t.get("status") == "not_started"])

        completion_percentage = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0

        project["progress"] = {
            "completionPercentage": round(completion_percentage, 2),
            "totalTasks": total_tasks,
            "completedTasks": completed_tasks,
            "inProgressTasks": in_progress_tasks,
            "notStartedTasks": not_started_tasks
        }

        # Convert other ObjectId fields to strings
        for field in ["client", "organization", "createdBy", "lastModifiedBy", "updatedBy"]:
            if project.get(field) and isinstance(project[field], ObjectId):
                project[field] = str(project[field])

        # Handle documents and calendar events if they exist
        if project.get("documents"):
            for doc in project["documents"]:
                if isinstance(doc.get("documentId"), ObjectId):
                    doc["documentId"] = str(doc["documentId"])

        if project.get("linkedDocuments"):
            project["linkedDocuments"] = [str(doc_id) if isinstance(doc_id, ObjectId) else doc_id
                                        for doc_id in project["linkedDocuments"]]

        if project.get("calendarEvents"):
            project["calendarEvents"] = [str(event_id) if isinstance(event_id, ObjectId) else event_id
                                       for event_id in project["calendarEvents"]]

        # Handle status history
        if project.get("statusHistory"):
            for status_entry in project["statusHistory"]:
                if isinstance(status_entry.get("changedBy"), ObjectId):
                    status_entry["changedBy"] = str(status_entry["changedBy"])
                if status_entry.get("_id") and isinstance(status_entry["_id"], ObjectId):
                    status_entry["_id"] = str(status_entry["_id"])
                    status_entry["id"] = status_entry["_id"]

        logger.info(f"Retrieved comprehensive project details: {project_id}")
        return create_response("success", project)

    except Exception as e:
        logger.error(f"Error getting project details: {e}")
        return create_response("error", error_message=str(e))

def list_projects(organization_id: str) -> Dict:
    """List projects for an organization with default pagination and resolved entity names

    Args:
        organization_id: Required organization ID to scope projects

    Returns:
        Dict containing projects with both IDs and human-readable names for all entity references
    """
    try:
        # Get collections
        projects = db_manager.get_collection("projects")
        clients = db_manager.get_collection("clients")
        team_members = db_manager.get_collection("team_members")
        users = db_manager.get_collection("users")

        # Set defaults for pagination
        page = 1
        limit = 20

        # Handle both ObjectId and string formats for organization field
        query = {
            "$or": [
                {"organization": ObjectId(organization_id)},
                {"organization": organization_id}
            ]
        }

        skip = (page - 1) * limit

        # Debug logging
        logger.info(f"list_projects query: {query}")
        logger.info(f"organization_id: {organization_id}")

        cursor = projects.find(query).skip(skip).limit(limit).sort("createdAt", -1)

        project_list = list(cursor)
        total = projects.count_documents(query)

        # Enhance each project with resolved names
        for project in project_list:
            # Convert ObjectId to string for JSON serialization
            project["_id"] = str(project["_id"])
            project["id"] = project["_id"]  # Add id field for frontend compatibility

            # Resolve client information
            if project.get("client"):
                client_id = project["client"]
                if isinstance(client_id, ObjectId):
                    client = clients.find_one({"_id": client_id})
                    if client:
                        # Get user information for client name
                        client_name = "Unknown Client"
                        if client.get("user"):
                            user = users.find_one({"_id": client["user"]},
                                                {"firstName": 1, "lastName": 1, "email": 1})
                            if user:
                                first_name = user.get("firstName", "")
                                last_name = user.get("lastName", "")
                                client_name = f"{first_name} {last_name}".strip() or user.get("email", "Unknown Client")

                        # Store both ID and name
                        project["client_id"] = str(client_id)
                        project["client_name"] = client_name
                        project["client"] = str(client_id)  # Keep original field as string

            # Resolve project manager information
            if project.get("projectManager"):
                pm_id = project["projectManager"]
                if isinstance(pm_id, ObjectId):
                    pm = team_members.find_one({"_id": pm_id})
                    if pm:
                        project["project_manager_id"] = str(pm_id)
                        project["project_manager_name"] = pm.get("name", "Unknown Manager")
                        project["projectManager"] = str(pm_id)  # Keep original field as string

            # Resolve team members information
            team_member_ids = project.get("teamMembers", [])
            if team_member_ids:
                team_member_object_ids = [ObjectId(tm_id) if isinstance(tm_id, str) else tm_id
                                        for tm_id in team_member_ids if tm_id]
                if team_member_object_ids:
                    team_cursor = team_members.find({"_id": {"$in": team_member_object_ids}})
                    team_names = []
                    team_ids = []
                    for member in team_cursor:
                        team_ids.append(str(member["_id"]))
                        team_names.append(member.get("name", "Unknown Member"))

                    project["team_member_ids"] = team_ids
                    project["team_member_names"] = team_names
                    project["teamMembers"] = team_ids  # Keep original field as string array

            # Convert other ObjectId fields to strings
            for field in ["organization", "createdBy", "lastModifiedBy", "updatedBy"]:
                if project.get(field) and isinstance(project[field], ObjectId):
                    project[field] = str(project[field])

        # Debug logging
        logger.info(f"Found {total} total projects matching query")
        logger.info(f"Returning {len(project_list)} projects for page {page}")

        result = {
            "projects": project_list,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }

        logger.info(f"Listed {len(project_list)} projects with resolved names (page {page})")
        return create_response("success", result)

    except Exception as e:
        logger.error(f"Error listing projects: {e}")
        return create_response("error", error_message=str(e))

def update_project(project_id: str, user_id: str, name: Optional[str], description: Optional[str],
                  status: Optional[str], priority: Optional[str], tags: Optional[List[str]],
                  start_date: Optional[str], end_date: Optional[str], budget: Optional[float]) -> Dict:
    """Update an existing project"""
    try:
        if not validate_object_id(project_id) or not user_id:
            return create_response("error", error_message="Valid project_id and user_id are required")

        projects = db_manager.get_collection("projects")

        # Build update data
        update_data = {"updatedAt": datetime.now(timezone.utc), "updatedBy": user_id}

        if name is not None:
            update_data["name"] = name
        if description is not None:
            update_data["description"] = description
        if status is not None:
            update_data["status"] = status
        if priority is not None:
            update_data["priority"] = priority
        if tags is not None:
            update_data["tags"] = tags
        if start_date is not None:
            update_data["startDate"] = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        if end_date is not None:
            update_data["endDate"] = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        if budget is not None:
            update_data["budget"] = budget

        result = projects.update_one(
            {"_id": ObjectId(project_id)},
            {"$set": update_data}
        )

        if result.matched_count == 0:
            return create_response("error", error_message="Project not found")

        # Get updated project
        updated_project = projects.find_one({"_id": ObjectId(project_id)})

        logger.info(f"Updated project: {project_id}")
        return create_response("success", updated_project)

    except Exception as e:
        logger.error(f"Error updating project: {e}")
        return create_response("error", error_message=str(e))

def delete_project(project_id: str, user_id: str) -> Dict:
    """Delete a project"""
    try:
        if not validate_object_id(project_id) or not user_id:
            return create_response("error", error_message="Valid project_id and user_id are required")

        projects = db_manager.get_collection("projects")

        result = projects.delete_one({"_id": ObjectId(project_id)})

        if result.deleted_count == 0:
            return create_response("error", error_message="Project not found")

        logger.info(f"Deleted project: {project_id}")
        return create_response("success", {"deleted": True, "project_id": project_id})

    except Exception as e:
        logger.error(f"Error deleting project: {e}")
        return create_response("error", error_message=str(e))

def search_projects(search_term: str, client_id: Optional[str], organization_id: Optional[str]) -> Dict:
    """Search projects by name, description, or tags"""
    try:
        if not search_term:
            return create_response("error", error_message="search_term is required")

        projects = db_manager.get_collection("projects")

        # Build search query
        search_query = {
            "$or": [
                {"name": {"$regex": search_term, "$options": "i"}},
                {"description": {"$regex": search_term, "$options": "i"}},
                {"tags": {"$in": [search_term]}}
            ]
        }

        # Add scope filters
        if client_id:
            search_query["client"] = ObjectId(client_id)
        if organization_id:
            # Handle both ObjectId and string formats for organization field
            search_query["$or"] = [
                {"organization": ObjectId(organization_id)},
                {"organization": organization_id}
            ]

        cursor = projects.find(search_query).sort("createdAt", -1)
        project_list = list(cursor)

        logger.info(f"Found {len(project_list)} projects matching '{search_term}'")
        return create_response("success", {"projects": project_list, "search_term": search_term})

    except Exception as e:
        logger.error(f"Error searching projects: {e}")
        return create_response("error", error_message=str(e))

def get_project_tasks(project_id: str) -> Dict:
    """Get all tasks for a project"""
    try:
        if not validate_object_id(project_id):
            return create_response("error", error_message="Valid project_id is required")

        tasks = db_manager.get_collection("tasks")

        cursor = tasks.find({"project": ObjectId(project_id)}).sort("createdAt", -1)
        task_list = list(cursor)

        logger.info(f"Found {len(task_list)} tasks for project: {project_id}")
        return create_response("success", {"tasks": task_list, "project_id": project_id})

    except Exception as e:
        logger.error(f"Error getting project tasks: {e}")
        return create_response("error", error_message=str(e))

# --- Task Operations Functions ---
def create_task(title: str, user_id: str, organization_id: str,
               description: Optional[str], project_id: Optional[str],
               client_id: Optional[str], assignee_id: Optional[str],
               status: Optional[str], priority: Optional[str],
               due_date: Optional[str], estimated_hours: Optional[float],
               tags: Optional[List[str]]) -> Dict:
    """Create a new task with automatic client_id resolution from project

    Args:
        title: Task title/name
        user_id: ID of user creating the task
        organization_id: Required organization ID for scoping
        description: Optional task description
        project_id: Optional project ID - if provided, client_id will be resolved from project
        client_id: Optional client ID - used if no project_id provided, or as override
        assignee_id: Optional team member to assign task to
        status: Task status (default: "not_started")
        priority: Task priority (default: "medium")
        due_date: Optional due date in ISO format
        estimated_hours: Optional estimated hours for completion
        tags: Optional list of tags

    Returns:
        Dict with success/error status and task data

    Note: Either project_id or client_id should be provided. If project_id is given,
          client_id will be automatically resolved from the project.
    """
    try:
        if not title or not user_id or not organization_id:
            return create_response("error", error_message="title, user_id, and organization_id are required")

        tasks = db_manager.get_collection("tasks")
        projects = db_manager.get_collection("projects")

        # Validate organization_id
        if not validate_object_id(organization_id):
            return create_response("error", error_message="Invalid organization_id format")

        # Resolve client_id from project if project_id is provided
        resolved_client_id = client_id
        if project_id:
            if not validate_object_id(project_id):
                return create_response("error", error_message="Invalid project_id format")

            project = projects.find_one({"_id": ObjectId(project_id)})
            if not project:
                return create_response("error", error_message="Project not found")

            # Get client_id from project if it exists
            if project.get("client"):
                resolved_client_id = str(project["client"])
                logger.info(f"Resolved client_id from project: {resolved_client_id}")

        # Validate resolved client_id if present
        if resolved_client_id and not validate_object_id(resolved_client_id):
            return create_response("error", error_message="Invalid client_id format")

        task_data = {
            "name": title,  # Changed from "title" to "name" to match backend schema
            "description": description or "",
            "organization": ObjectId(organization_id),  # Required field
            "status": status or "not_started",  # Changed from "todo" to "not_started" to match backend
            "priority": priority or "medium",
            "tags": tags or [],
            "createdBy": user_id,
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc)
        }

        # Add client if resolved
        if resolved_client_id:
            task_data["client"] = ObjectId(resolved_client_id)

        # Add optional fields
        if project_id:
            task_data["project"] = ObjectId(project_id)
        if assignee_id:
            if not validate_object_id(assignee_id):
                return create_response("error", error_message="Invalid assignee_id format")
            task_data["assignedTo"] = ObjectId(assignee_id)
        if due_date:
            task_data["dueDate"] = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
        if estimated_hours is not None:
            task_data["estimatedHours"] = estimated_hours

        result = tasks.insert_one(task_data)
        task_data["_id"] = result.inserted_id

        logger.info(f"Created task: {title} with ID: {result.inserted_id}")
        return create_response("success", task_data)

    except Exception as e:
        logger.error(f"Error creating task: {e}")
        return create_response("error", error_message=str(e))

def get_task(task_id: str, organization_id: Optional[str]) -> Dict:
    """Get a task by ID"""
    try:
        if not validate_object_id(task_id):
            return create_response("error", error_message="Invalid task_id format")

        tasks = db_manager.get_collection("tasks")

        query = {"_id": ObjectId(task_id)}
        # Note: client_id and organization_id filtering would need to be implemented
        # based on project relationships if needed

        task = tasks.find_one(query)

        if not task:
            return create_response("error", error_message="Task not found")

        logger.info(f"Retrieved task: {task_id}")
        return create_response("success", task)

    except Exception as e:
        logger.error(f"Error getting task: {e}")
        return create_response("error", error_message=str(e))

def list_tasks(organization_id: str) -> Dict:
    """List tasks for an organization with default pagination and resolved entity names

    Args:
        organization_id: Required organization ID to scope tasks

    Returns:
        Dict containing tasks with both IDs and human-readable names for all entity references
    """
    try:
        # Get collections
        tasks = db_manager.get_collection("tasks")
        projects = db_manager.get_collection("projects")
        team_members = db_manager.get_collection("team_members")
        clients = db_manager.get_collection("clients")
        users = db_manager.get_collection("users")

        # Set defaults for pagination
        page = 1
        limit = 20

        # Handle both ObjectId and string formats for organization field
        query = {
            "$or": [
                {"organization": ObjectId(organization_id)},
                {"organization": organization_id}
            ]
        }

        skip = (page - 1) * limit
        cursor = tasks.find(query).skip(skip).limit(limit).sort("createdAt", -1)

        task_list = list(cursor)
        total = tasks.count_documents(query)

        # Enhance each task with resolved names
        for task in task_list:
            # Convert ObjectId to string for JSON serialization
            task["_id"] = str(task["_id"])
            task["id"] = task["_id"]  # Add id field for frontend compatibility

            # Resolve assignee information
            if task.get("assignedTo"):
                assignee_id = task["assignedTo"]
                if isinstance(assignee_id, ObjectId):
                    assignee = team_members.find_one({"_id": assignee_id})
                    if assignee:
                        task["assignee_id"] = str(assignee_id)
                        task["assignee_name"] = assignee.get("name", "Unknown Assignee")
                        task["assignedTo"] = str(assignee_id)  # Keep original field as string

            # Resolve project information
            if task.get("project"):
                project_id = task["project"]
                if isinstance(project_id, ObjectId):
                    project = projects.find_one({"_id": project_id})
                    if project:
                        task["project_id"] = str(project_id)
                        task["project_name"] = project.get("name", "Unknown Project")
                        task["project"] = str(project_id)  # Keep original field as string

            # Resolve client information
            if task.get("client"):
                client_id = task["client"]
                if isinstance(client_id, ObjectId):
                    client = clients.find_one({"_id": client_id})
                    if client:
                        # Get user information for client name
                        client_name = "Unknown Client"
                        if client.get("user"):
                            user = users.find_one({"_id": client["user"]},
                                                {"firstName": 1, "lastName": 1, "email": 1})
                            if user:
                                first_name = user.get("firstName", "")
                                last_name = user.get("lastName", "")
                                client_name = f"{first_name} {last_name}".strip() or user.get("email", "Unknown Client")

                        task["client_id"] = str(client_id)
                        task["client_name"] = client_name
                        task["client"] = str(client_id)  # Keep original field as string

            # Convert other ObjectId fields to strings
            for field in ["organization", "createdBy", "updatedBy"]:
                if task.get(field) and isinstance(task[field], ObjectId):
                    task[field] = str(task[field])

        result = {
            "tasks": task_list,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }

        logger.info(f"Listed {len(task_list)} tasks with resolved names for organization {organization_id} (page {page})")
        return create_response("success", result)

    except Exception as e:
        logger.error(f"Error listing tasks: {e}")
        return create_response("error", error_message=str(e))

def update_task(task_id: str, user_id: str, title: Optional[str], description: Optional[str],
               status: Optional[str], priority: Optional[str], assignee_id: Optional[str],
               due_date: Optional[str], estimated_hours: Optional[float],
               tags: Optional[List[str]]) -> Dict:
    """Update an existing task"""
    try:
        if not validate_object_id(task_id) or not user_id:
            return create_response("error", error_message="Valid task_id and user_id are required")

        tasks = db_manager.get_collection("tasks")

        # Build update data
        update_data = {"updatedAt": datetime.now(timezone.utc), "updatedBy": user_id}

        if title is not None:
            update_data["name"] = title  # Changed from "title" to "name" to match backend schema
        if description is not None:
            update_data["description"] = description
        if status is not None:
            update_data["status"] = status
        if priority is not None:
            update_data["priority"] = priority
        if assignee_id is not None:
            if assignee_id and not validate_object_id(assignee_id):
                return create_response("error", error_message="Invalid assignee_id format")
            update_data["assignedTo"] = ObjectId(assignee_id) if assignee_id else None
        if due_date is not None:
            update_data["dueDate"] = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
        if estimated_hours is not None:
            update_data["estimatedHours"] = estimated_hours
        if tags is not None:
            update_data["tags"] = tags

        result = tasks.update_one(
            {"_id": ObjectId(task_id)},
            {"$set": update_data}
        )

        if result.matched_count == 0:
            return create_response("error", error_message="Task not found")

        # Get updated task
        updated_task = tasks.find_one({"_id": ObjectId(task_id)})

        logger.info(f"Updated task: {task_id}")
        return create_response("success", updated_task)

    except Exception as e:
        logger.error(f"Error updating task: {e}")
        return create_response("error", error_message=str(e))

def delete_task(task_id: str, user_id: str) -> Dict:
    """Delete a task"""
    try:
        if not validate_object_id(task_id) or not user_id:
            return create_response("error", error_message="Valid task_id and user_id are required")

        tasks = db_manager.get_collection("tasks")

        result = tasks.delete_one({"_id": ObjectId(task_id)})

        if result.deleted_count == 0:
            return create_response("error", error_message="Task not found")

        logger.info(f"Deleted task: {task_id}")
        return create_response("success", {"deleted": True, "task_id": task_id})

    except Exception as e:
        logger.error(f"Error deleting task: {e}")
        return create_response("error", error_message=str(e))

def add_task_comment(task_id: str, comment_content: str, user_id: str) -> Dict:
    """Add a comment to a task"""
    try:
        if not validate_object_id(task_id) or not comment_content or not user_id:
            return create_response("error", error_message="Valid task_id, comment_content, and user_id are required")

        tasks = db_manager.get_collection("tasks")

        comment = {
            "content": comment_content,
            "createdBy": user_id,
            "createdAt": datetime.now(timezone.utc)
        }

        result = tasks.update_one(
            {"_id": ObjectId(task_id)},
            {
                "$push": {"comments": comment},
                "$set": {"updatedAt": datetime.now(timezone.utc)}
            }
        )

        if result.matched_count == 0:
            return create_response("error", error_message="Task not found")

        logger.info(f"Added comment to task: {task_id}")
        return create_response("success", {"comment_added": True, "comment": comment})

    except Exception as e:
        logger.error(f"Error adding task comment: {e}")
        return create_response("error", error_message=str(e))

# --- Team Operations Functions ---
def create_team_member(name: str, email: str, user_id: str, role: Optional[str],
                      skills: Optional[List[str]], expertise: Optional[List[str]],
                      hourly_rate: Optional[float], availability: Optional[str],
                      client_id: Optional[str], organization_id: Optional[str]) -> Dict:
    """Create a new team member"""
    try:
        if not name or not email or not user_id:
            return create_response("error", error_message="name, email, and user_id are required")

        team_members = db_manager.get_collection("team_members")

        # Check if email already exists
        existing = team_members.find_one({"email": email})
        if existing:
            return create_response("error", error_message="Team member with this email already exists")

        member_data = {
            "name": name,
            "email": email,
            "role": role or "developer",
            "skills": skills or [],
            "expertise": expertise or [],
            "availability": availability or "available",
            "createdBy": user_id,
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc)
        }

        # Add optional fields
        if client_id:
            member_data["client"] = ObjectId(client_id)
        if organization_id:
            member_data["organization"] = ObjectId(organization_id)
        if hourly_rate is not None:
            member_data["hourlyRate"] = hourly_rate

        result = team_members.insert_one(member_data)
        member_data["_id"] = result.inserted_id

        logger.info(f"Created team member: {name} with ID: {result.inserted_id}")
        return create_response("success", member_data)

    except Exception as e:
        logger.error(f"Error creating team member: {e}")
        return create_response("error", error_message=str(e))

def get_team_member(member_id: str, organization_id: Optional[str]) -> Dict:
    """Get a team member by ID

    Args:
        member_id: Required team member ID to retrieve
        organization_id: Optional organization ID to scope the search

    Returns:
        Dict containing the team member data or error message
    """
    try:
        if not validate_object_id(member_id):
            return create_response("error", error_message="Invalid member_id format")

        team_members = db_manager.get_collection("team_members")

        query = {"_id": ObjectId(member_id)}
        if organization_id:
            # Handle both ObjectId and string formats for organization field
            query["$or"] = [
                {"organization": ObjectId(organization_id)},
                {"organization": organization_id}
            ]

        member = team_members.find_one(query)

        if not member:
            return create_response("error", error_message="Team member not found")

        logger.info(f"Retrieved team member: {member_id}")
        return create_response("success", member)

    except Exception as e:
        logger.error(f"Error getting team member: {e}")
        return create_response("error", error_message=str(e))

def list_team_members(organization_id: str) -> Dict:
    """List team members for an organization with nested task details including project information

    Args:
        organization_id: Required organization ID to scope team members

    Returns:
        Dict containing team members list with nested task details, project info, and pagination
    """
    try:
        # Get collections
        team_members = db_manager.get_collection("team_members")
        tasks = db_manager.get_collection("tasks")
        projects = db_manager.get_collection("projects")

        # Set defaults for pagination
        page = 1
        limit = 20

        # Handle both ObjectId and string formats for organization field
        query = {
            "$or": [
                {"organization": ObjectId(organization_id)},
                {"organization": organization_id}
            ]
        }

        skip = (page - 1) * limit
        cursor = team_members.find(query).skip(skip).limit(limit).sort("createdAt", -1)

        member_list = list(cursor)
        total = team_members.count_documents(query)

        # Get additional collections for name resolution
        clients = db_manager.get_collection("clients")
        users = db_manager.get_collection("users")

        # Enhance each team member with task details
        for member in member_list:
            member_id = member["_id"]

            # Convert ObjectId to string for JSON serialization
            member["_id"] = str(member["_id"])
            member["id"] = member["_id"]  # Add id field for frontend compatibility

            # Convert other ObjectId fields to strings
            for field in ["organization", "client", "createdBy", "updatedBy"]:
                if member.get(field) and isinstance(member[field], ObjectId):
                    member[field] = str(member[field])

            # Get all tasks assigned to this team member
            assigned_tasks_cursor = tasks.find({
                "assignedTo": ObjectId(member_id)
            }).sort("dueDate", 1)  # Sort by due date

            assigned_tasks = list(assigned_tasks_cursor)

            # Enhance tasks with project and client information
            enhanced_tasks = []
            for task in assigned_tasks:
                # Convert ObjectId fields to strings
                task["_id"] = str(task["_id"])
                task["id"] = task["_id"]

                # Convert other ObjectId fields
                for field in ["project", "assignedTo", "client", "organization", "createdBy", "updatedBy"]:
                    if task.get(field) and isinstance(task[field], ObjectId):
                        task[field] = str(task[field])

                # Get project information if task belongs to a project
                project_info = None
                if task.get("project"):
                    project = projects.find_one({"_id": ObjectId(task["project"])})
                    if project:
                        project_info = {
                            "_id": str(project["_id"]),
                            "id": str(project["_id"]),
                            "name": project.get("name", "Unknown Project"),
                            "status": project.get("status", "unknown"),
                            "priority": project.get("priority", "medium"),
                            "dueDate": project.get("dueDate"),
                            "startDate": project.get("startDate")
                        }

                # Get client information if task belongs to a client
                client_info = None
                if task.get("client"):
                    client = clients.find_one({"_id": ObjectId(task["client"])})
                    if client:
                        # Get user information for client name
                        client_name = "Unknown Client"
                        if client.get("user"):
                            user = users.find_one({"_id": client["user"]},
                                                {"firstName": 1, "lastName": 1, "email": 1})
                            if user:
                                first_name = user.get("firstName", "")
                                last_name = user.get("lastName", "")
                                client_name = f"{first_name} {last_name}".strip() or user.get("email", "Unknown Client")

                        client_info = {
                            "_id": str(client["_id"]),
                            "id": str(client["_id"]),
                            "name": client_name
                        }

                # Create enhanced task object
                enhanced_task = {
                    "_id": task["_id"],
                    "id": task["id"],
                    "name": task.get("name", task.get("title", "Untitled Task")),  # Handle both name and title fields
                    "description": task.get("description", ""),
                    "status": task.get("status", "not_started"),
                    "priority": task.get("priority", "medium"),
                    "dueDate": task.get("dueDate"),
                    "estimatedHours": task.get("estimatedHours", 0),
                    "tags": task.get("tags", []),
                    "createdAt": task.get("createdAt"),
                    "updatedAt": task.get("updatedAt"),
                    "project": project_info,  # Nested project information
                    "client": client_info,    # Nested client information
                    "assignedTo": str(member_id)  # Reference back to team member
                }

                enhanced_tasks.append(enhanced_task)

            # Calculate task statistics for this team member
            total_tasks = len(enhanced_tasks)
            completed_tasks = len([t for t in enhanced_tasks if t["status"] == "completed"])
            in_progress_tasks = len([t for t in enhanced_tasks if t["status"] == "in_progress"])
            not_started_tasks = len([t for t in enhanced_tasks if t["status"] == "not_started"])
            overdue_tasks = 0

            # Count overdue tasks
            from datetime import datetime, timezone
            current_date = datetime.now(timezone.utc)
            for task in enhanced_tasks:
                if (task.get("dueDate") and task["status"] != "completed" and
                    isinstance(task["dueDate"], datetime) and task["dueDate"] < current_date):
                    overdue_tasks += 1

            # Add task information to team member
            member["tasks"] = {
                "assigned_tasks": enhanced_tasks,
                "task_summary": {
                    "total_tasks": total_tasks,
                    "completed_tasks": completed_tasks,
                    "in_progress_tasks": in_progress_tasks,
                    "not_started_tasks": not_started_tasks,
                    "overdue_tasks": overdue_tasks
                }
            }

            # Update workload information based on current tasks
            active_tasks = [t for t in enhanced_tasks if t["status"] in ["not_started", "in_progress"]]
            total_hours_allocated = sum(t.get("estimatedHours", 0) for t in active_tasks)

            # Get or create workload object
            workload = member.get("workload", {})
            workload.update({
                "currentTasks": len(active_tasks),
                "totalHoursAllocated": total_hours_allocated,
                "utilizationPercentage": min(
                    round((total_hours_allocated / 40) * 100) if total_hours_allocated > 0 else 0,
                    100
                )
            })
            member["workload"] = workload

        result = {
            "team_members": member_list,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }

        logger.info(f"Listed {len(member_list)} team members with task details (page {page})")
        return create_response("success", result)

    except Exception as e:
        logger.error(f"Error listing team members with task details: {e}")
        return create_response("error", error_message=str(e))

def update_team_member(member_id: str, user_id: str, name: Optional[str], email: Optional[str],
                      role: Optional[str], availability: Optional[str],
                      hourly_rate: Optional[float]) -> Dict:
    """Update an existing team member"""
    try:
        if not validate_object_id(member_id) or not user_id:
            return create_response("error", error_message="Valid member_id and user_id are required")

        team_members = db_manager.get_collection("team_members")

        # Build update data
        update_data = {"updatedAt": datetime.now(timezone.utc), "updatedBy": user_id}

        if name is not None:
            update_data["name"] = name
        if email is not None:
            # Check if email already exists for another member
            existing = team_members.find_one({"email": email, "_id": {"$ne": ObjectId(member_id)}})
            if existing:
                return create_response("error", error_message="Email already exists for another team member")
            update_data["email"] = email
        if role is not None:
            update_data["role"] = role
        if availability is not None:
            update_data["availability"] = availability
        if hourly_rate is not None:
            update_data["hourlyRate"] = hourly_rate

        result = team_members.update_one(
            {"_id": ObjectId(member_id)},
            {"$set": update_data}
        )

        if result.matched_count == 0:
            return create_response("error", error_message="Team member not found")

        # Get updated member
        updated_member = team_members.find_one({"_id": ObjectId(member_id)})

        logger.info(f"Updated team member: {member_id}")
        return create_response("success", updated_member)

    except Exception as e:
        logger.error(f"Error updating team member: {e}")
        return create_response("error", error_message=str(e))

def delete_team_member(member_id: str, user_id: str) -> Dict:
    """Delete a team member"""
    try:
        if not validate_object_id(member_id) or not user_id:
            return create_response("error", error_message="Valid member_id and user_id are required")

        team_members = db_manager.get_collection("team_members")

        result = team_members.delete_one({"_id": ObjectId(member_id)})

        if result.deleted_count == 0:
            return create_response("error", error_message="Team member not found")

        logger.info(f"Deleted team member: {member_id}")
        return create_response("success", {"deleted": True, "member_id": member_id})

    except Exception as e:
        logger.error(f"Error deleting team member: {e}")
        return create_response("error", error_message=str(e))

def find_available_team_members(organization_id: Optional[str],
                               skill_required: Optional[str]) -> Dict:
    """Find available team members, optionally filtered by skill

    Args:
        organization_id: Optional organization ID to scope the search
        skill_required: Optional skill to filter by

    Returns:
        Dict containing available team members or error message
    """
    try:
        team_members = db_manager.get_collection("team_members")

        query = {"availability": "available"}
        if organization_id:
            # Handle both ObjectId and string formats for organization field
            query["$or"] = [
                {"organization": ObjectId(organization_id)},
                {"organization": organization_id}
            ]
        if skill_required:
            query["skills"] = {"$in": [skill_required]}

        cursor = team_members.find(query).sort("name", 1)
        member_list = list(cursor)

        logger.info(f"Found {len(member_list)} available team members")
        return create_response("success", {"available_members": member_list})

    except Exception as e:
        logger.error(f"Error finding available team members: {e}")
        return create_response("error", error_message=str(e))

def get_team_member_workload(member_id: str, organization_id: Optional[str]) -> Dict:
    """Get comprehensive workload information for a team member

    This function provides detailed workload analysis including:
    - Current workload metrics (tasks, hours, utilization)
    - Capacity information (hours per week, availability)
    - Active assigned tasks with project details
    - Current projects
    - Automatically updates workload calculations

    Args:
        member_id: Required team member ID to get workload for
        organization_id: Optional organization ID to scope the search

    Returns:
        Dict containing comprehensive workload data or error message
    """
    try:
        if not validate_object_id(member_id):
            return create_response("error", error_message="Invalid member_id format")

        team_members = db_manager.get_collection("team_members")
        tasks = db_manager.get_collection("tasks")
        projects = db_manager.get_collection("projects")

        # Build query for team member
        query = {"_id": ObjectId(member_id)}
        if organization_id:
            # Handle both ObjectId and string formats for organization field
            query["$or"] = [
                {"organization": ObjectId(organization_id)},
                {"organization": organization_id}
            ]

        # Get team member
        team_member = team_members.find_one(query)
        if not team_member:
            return create_response("error", error_message="Team member not found")

        # Get active assigned tasks (not_started and in_progress)
        assigned_tasks_cursor = tasks.find({
            "assignedTo": ObjectId(member_id),
            "status": {"$in": ["not_started", "in_progress"]},
            "isActive": {"$ne": False}  # Include tasks where isActive is not explicitly False
        }).sort("dueDate", 1)

        assigned_tasks = list(assigned_tasks_cursor)

        # Calculate workload metrics
        current_tasks = len(assigned_tasks)
        total_hours_allocated = sum(task.get("estimatedHours", 0) for task in assigned_tasks)

        # Get capacity from team member
        capacity = team_member.get("capacity", {})
        hours_per_week = capacity.get("hoursPerWeek", 40)

        # Calculate utilization percentage
        utilization_percentage = min(
            round((total_hours_allocated / hours_per_week) * 100) if hours_per_week > 0 else 0,
            100
        )

        # Update workload in database
        updated_workload = {
            "currentTasks": current_tasks,
            "totalHoursAllocated": total_hours_allocated,
            "utilizationPercentage": utilization_percentage
        }

        team_members.update_one(
            {"_id": ObjectId(member_id)},
            {"$set": {"workload": updated_workload}}
        )

        # Get project details for assigned tasks
        for task in assigned_tasks:
            if "project" in task and task["project"]:
                project = projects.find_one({"_id": ObjectId(task["project"])})
                if project:
                    task["projectInfo"] = {
                        "name": project.get("name", "Unknown"),
                        "status": project.get("status", "unknown")
                    }

        # Get current projects
        current_project_ids = team_member.get("currentProjects", [])
        current_projects = []
        if current_project_ids:
            current_projects_cursor = projects.find({
                "_id": {"$in": [ObjectId(pid) for pid in current_project_ids if validate_object_id(str(pid))]}
            })
            current_projects = list(current_projects_cursor)

        # Build comprehensive workload response
        workload_data = {
            "teamMember": {
                "_id": str(team_member["_id"]),
                "name": team_member.get("name", ""),
                "email": team_member.get("email", ""),
                "role": team_member.get("role", "")
            },
            "workload": updated_workload,
            "capacity": capacity,
            "availabilityStatus": team_member.get("availabilityStatus", team_member.get("availability", "unknown")),
            "assignedTasks": assigned_tasks,
            "currentProjects": current_projects,
            "performance": team_member.get("performance", {}),
            "lastUpdated": datetime.now(timezone.utc).isoformat()
        }

        logger.info(f"Retrieved comprehensive workload for team member: {member_id}")
        return create_response("success", workload_data)

    except Exception as e:
        logger.error(f"Error getting team member workload: {e}")
        return create_response("error", error_message=str(e))

# --- Search Operations Functions ---
def cross_search(search_term: str, entity_types: Optional[List[str]],
                client_id: Optional[str], organization_id: Optional[str],
                page: Optional[int], limit: Optional[int]) -> Dict:
    """Search across projects, tasks, team members, and clients"""
    try:
        if not search_term:
            return create_response("error", error_message="search_term is required")

        # Set defaults for optional parameters
        page = page or 1
        limit = limit or 20

        # Default to all entity types if not specified
        if not entity_types:
            entity_types = ["projects", "tasks", "team_members", "clients"]

        results = {}

        # Search projects
        if "projects" in entity_types:
            projects = db_manager.get_collection("projects")
            project_query = {
                "$or": [
                    {"name": {"$regex": search_term, "$options": "i"}},
                    {"description": {"$regex": search_term, "$options": "i"}},
                    {"tags": {"$in": [search_term]}}
                ]
            }
            if client_id:
                project_query["client"] = ObjectId(client_id)
            if organization_id:
                project_query["organization"] = ObjectId(organization_id)

            project_results = list(projects.find(project_query).limit(limit))
            results["projects"] = project_results

        # Search tasks
        if "tasks" in entity_types:
            tasks = db_manager.get_collection("tasks")
            task_query = {
                "$or": [
                    {"name": {"$regex": search_term, "$options": "i"}},  # Changed from "title" to "name"
                    {"description": {"$regex": search_term, "$options": "i"}},
                    {"tags": {"$in": [search_term]}}
                ]
            }
            task_results = list(tasks.find(task_query).limit(limit))
            results["tasks"] = task_results

        # Search clients
        if "clients" in entity_types:
            clients = db_manager.get_collection("clients")
            client_query = {
                "$or": [
                    {"name": {"$regex": search_term, "$options": "i"}},
                    {"email": {"$regex": search_term, "$options": "i"}},
                    {"projectType": {"$regex": search_term, "$options": "i"}},
                    {"status": {"$regex": search_term, "$options": "i"}}
                ]
            }
            if organization_id:
                client_query["organization"] = ObjectId(organization_id)

            client_results = list(clients.find(client_query).limit(limit))
            results["clients"] = client_results

        # Search team members
        if "team_members" in entity_types:
            team_members = db_manager.get_collection("team_members")
            member_query = {
                "$or": [
                    {"name": {"$regex": search_term, "$options": "i"}},
                    {"email": {"$regex": search_term, "$options": "i"}},
                    {"role": {"$regex": search_term, "$options": "i"}},
                    {"skills": {"$in": [search_term]}},
                    {"expertise": {"$in": [search_term]}}
                ]
            }
            if client_id:
                member_query["client"] = ObjectId(client_id)
            if organization_id:
                member_query["organization"] = ObjectId(organization_id)

            member_results = list(team_members.find(member_query).limit(limit))
            results["team_members"] = member_results

        total_results = sum(len(results.get(entity, [])) for entity in entity_types)

        logger.info(f"Cross search for '{search_term}' found {total_results} results")
        return create_response("success", {"search_results": results, "search_term": search_term})

    except Exception as e:
        logger.error(f"Error in cross search: {e}")
        return create_response("error", error_message=str(e))

# --- Client Operations Functions ---
def list_clients(organization_id: str) -> Dict:
    """List clients for an organization with default pagination

    Args:
        organization_id: Required organization ID to scope clients
    """
    try:
        if not organization_id:
            return create_response("error", error_message="organization_id is required")

        if not validate_object_id(organization_id):
            return create_response("error", error_message="Invalid organization_id format")

        clients = db_manager.get_collection("clients")

        # Set defaults for pagination
        page = 1
        limit = 20

        # Build query for organization
        query = {"organization": ObjectId(organization_id)}

        skip = (page - 1) * limit

        # Debug logging
        logger.info(f"list_clients query: {query}")
        logger.info(f"organization_id: {organization_id}")

        # Get clients with populated user information
        cursor = clients.find(query).skip(skip).limit(limit).sort("createdAt", -1)
        client_list = list(cursor)
        total = clients.count_documents(query)

        # Populate user information and remove sensitive data
        users = db_manager.get_collection("users")
        organizations = db_manager.get_collection("organizations")

        for client in client_list:
            # Get user information (excluding sensitive fields)
            if "user" in client and client["user"]:
                user = users.find_one(
                    {"_id": ObjectId(client["user"])},
                    {"password": 0, "resetPasswordToken": 0, "resetPasswordExpire": 0}  # Exclude sensitive fields
                )
                if user:
                    client["userInfo"] = user

            # Get organization information
            if "organization" in client and client["organization"]:
                organization = organizations.find_one({"_id": ObjectId(client["organization"])})
                if organization:
                    client["organizationInfo"] = {
                        "name": organization.get("name", "Unknown"),
                        "contactEmail": organization.get("contactEmail", ""),
                        "website": organization.get("website", "")
                    }

        # Debug logging
        logger.info(f"Found {total} total clients matching query")
        logger.info(f"Returning {len(client_list)} clients for page {page}")

        result = {
            "clients": client_list,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }

        logger.info(f"Listed {len(client_list)} clients (page {page})")
        return create_response("success", result)

    except Exception as e:
        logger.error(f"Error listing clients: {e}")
        return create_response("error", error_message=str(e))

def get_client(organization_id: str, client_id: Optional[str] = None,
               client_name: Optional[str] = None, project_id: Optional[str] = None) -> Dict:
    """Get a single client by ID, name, or project association with comprehensive details

    This tool provides flexible client lookup capabilities for the project manager agent.
    It can find clients by direct ID, by name (first/last name or email), or by project association.

    Args:
        organization_id: Required organization ID to scope the search
        client_id: Optional direct client ID lookup
        client_name: Optional client name search (searches firstName, lastName, email)
        project_id: Optional project ID to find the client associated with that project

    Returns:
        Dict with comprehensive client information including user details, organization info,
        associated projects, and contact information

    Usage Examples:
        - get_client(org_id, client_id="123") - Direct ID lookup
        - get_client(org_id, client_name="John Doe") - Name search
        - get_client(org_id, client_name="john@example.com") - Email search
        - get_client(org_id, project_id="456") - Find client by project

    Note: Provide only ONE of client_id, client_name, or project_id for best results.
    """
    try:
        if not organization_id:
            return create_response("error", error_message="organization_id is required")

        if not validate_object_id(organization_id):
            return create_response("error", error_message="Invalid organization_id format")

        # Validate that at least one search parameter is provided
        search_params = [client_id, client_name, project_id]
        provided_params = [p for p in search_params if p]

        if len(provided_params) == 0:
            return create_response("error", error_message="At least one of client_id, client_name, or project_id must be provided")

        if len(provided_params) > 1:
            return create_response("error", error_message="Please provide only one search parameter: client_id, client_name, or project_id")

        clients = db_manager.get_collection("clients")
        users = db_manager.get_collection("users")
        organizations = db_manager.get_collection("organizations")
        projects = db_manager.get_collection("projects")

        client = None
        search_method = None

        # Method 1: Direct client_id lookup
        if client_id:
            if not validate_object_id(client_id):
                return create_response("error", error_message="Invalid client_id format")

            client = clients.find_one({
                "_id": ObjectId(client_id),
                "organization": ObjectId(organization_id)
            })
            search_method = "client_id"

        # Method 2: Find client by project association
        elif project_id:
            if not validate_object_id(project_id):
                return create_response("error", error_message="Invalid project_id format")

            # First find the project to get its client
            project = projects.find_one({
                "_id": ObjectId(project_id),
                "organization": ObjectId(organization_id)
            })

            if not project:
                return create_response("error", error_message="Project not found")

            if not project.get("client"):
                return create_response("error", error_message="Project has no associated client")

            # Now get the client
            client = clients.find_one({
                "_id": project["client"],
                "organization": ObjectId(organization_id)
            })
            search_method = "project_id"

        # Method 3: Search by client name (firstName, lastName, or email)
        elif client_name:
            search_term = client_name.strip()

            # First, get all clients in the organization
            org_clients = list(clients.find({"organization": ObjectId(organization_id)}))

            # Search through clients and their associated users
            for potential_client in org_clients:
                if potential_client.get("user"):
                    user = users.find_one({"_id": ObjectId(potential_client["user"])})
                    if user:
                        # Check various name fields
                        first_name = user.get("firstName", "").lower()
                        last_name = user.get("lastName", "").lower()
                        email = user.get("email", "").lower()
                        full_name = f"{first_name} {last_name}".strip()

                        search_lower = search_term.lower()

                        # Match against various combinations
                        if (search_lower in first_name or
                            search_lower in last_name or
                            search_lower in full_name or
                            search_lower in email or
                            first_name.startswith(search_lower) or
                            last_name.startswith(search_lower) or
                            email == search_lower):
                            client = potential_client
                            break

            search_method = "client_name"

        if not client:
            if search_method == "client_id":
                return create_response("error", error_message="Client not found with the provided client_id")
            elif search_method == "project_id":
                return create_response("error", error_message="No client found for the specified project")
            elif search_method == "client_name":
                return create_response("error", error_message=f"No client found matching name '{client_name}'")
            else:
                return create_response("error", error_message="Client not found")

        # Enhance client with comprehensive information
        enhanced_client = dict(client)
        enhanced_client["_id"] = str(enhanced_client["_id"])
        enhanced_client["id"] = enhanced_client["_id"]

        # Convert ObjectId fields to strings
        for field in ["organization", "user", "createdBy", "updatedBy"]:
            if enhanced_client.get(field) and isinstance(enhanced_client[field], ObjectId):
                enhanced_client[field] = str(enhanced_client[field])

        # Populate user information (excluding sensitive fields)
        if enhanced_client.get("user"):
            user = users.find_one(
                {"_id": ObjectId(enhanced_client["user"])},
                {"password": 0, "resetPasswordToken": 0, "resetPasswordExpire": 0}
            )
            if user:
                user["_id"] = str(user["_id"])
                user["id"] = user["_id"]
                enhanced_client["userInfo"] = user

        # Populate organization information
        if enhanced_client.get("organization"):
            organization = organizations.find_one({"_id": ObjectId(enhanced_client["organization"])})
            if organization:
                organization["_id"] = str(organization["_id"])
                organization["id"] = organization["_id"]
                enhanced_client["organizationInfo"] = {
                    "_id": organization["_id"],
                    "id": organization["_id"],
                    "name": organization.get("name", "Unknown"),
                    "contactEmail": organization.get("contactEmail", ""),
                    "website": organization.get("website", "")
                }

        # Get associated projects for this client
        client_projects = list(projects.find({
            "client": ObjectId(enhanced_client["_id"]),
            "organization": ObjectId(organization_id)
        }))

        # Enhance project information
        enhanced_projects = []
        for project in client_projects:
            project_info = {
                "_id": str(project["_id"]),
                "id": str(project["_id"]),
                "name": project.get("name", "Untitled Project"),
                "status": project.get("status", "unknown"),
                "priority": project.get("priority", "medium"),
                "startDate": project.get("startDate"),
                "dueDate": project.get("dueDate"),
                "budget": project.get("budget"),
                "currency": project.get("currency", "USD")
            }
            enhanced_projects.append(project_info)

        enhanced_client["associatedProjects"] = enhanced_projects
        enhanced_client["projectCount"] = len(enhanced_projects)

        # Add search metadata
        enhanced_client["searchMetadata"] = {
            "searchMethod": search_method,
            "searchTerm": client_id or client_name or project_id,
            "foundAt": datetime.now(timezone.utc).isoformat()
        }

        logger.info(f"Found client via {search_method}: {enhanced_client.get('_id')}")
        return create_response("success", enhanced_client)

    except Exception as e:
        logger.error(f"Error getting client: {e}")
        return create_response("error", error_message=str(e))

# --- Analytics Operations Functions ---
def get_project_progress(organization_id: str, project_id: Optional[str] = None) -> Dict:
    """Get project progress analytics for an organization

    Args:
        organization_id: Required organization ID to scope projects
        project_id: Optional specific project ID to get progress for

    Returns:
        Dict containing project progress data or error message
    """
    try:
        if not validate_object_id(organization_id):
            return create_response("error", error_message="Invalid organization_id format")

        projects = db_manager.get_collection("projects")
        tasks = db_manager.get_collection("tasks")

        # Build project query - organization_id is required
        project_query = {"organization": ObjectId(organization_id)}

        if project_id:
            if not validate_object_id(project_id):
                return create_response("error", error_message="Invalid project_id format")
            project_query["_id"] = ObjectId(project_id)

        project_list = list(projects.find(project_query))

        progress_data = []
        for project in project_list:
            project_id_str = str(project["_id"])

            # Get task statistics for this project
            total_tasks = tasks.count_documents({"project": ObjectId(project_id_str)})
            completed_tasks = tasks.count_documents({"project": ObjectId(project_id_str), "status": "completed"})
            in_progress_tasks = tasks.count_documents({"project": ObjectId(project_id_str), "status": "in_progress"})
            not_started_tasks = tasks.count_documents({"project": ObjectId(project_id_str), "status": "not_started"})

            progress_percentage = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0

            progress_info = {
                "project_id": project_id_str,
                "project_name": project.get("name", ""),
                "total_tasks": total_tasks,
                "completed_tasks": completed_tasks,
                "in_progress_tasks": in_progress_tasks,
                "not_started_tasks": not_started_tasks,  # Changed from todo_tasks to not_started_tasks
                "progress_percentage": round(progress_percentage, 2),
                "status": project.get("status", "unknown")
            }
            progress_data.append(progress_info)

        logger.info(f"Generated progress analytics for {len(progress_data)} projects")
        return create_response("success", {"project_progress": progress_data})

    except Exception as e:
        logger.error(f"Error getting project progress: {e}")
        return create_response("error", error_message=str(e))

def get_team_performance(team_member_id: str, organization_id: str) -> Dict:
    """
    Get team member performance analytics for a specific team member within an organization.

    This function calculates real-time performance metrics by analyzing task assignments
    and completion rates for the specified team member.

    Args:
        team_member_id (str): The unique identifier of the team member
        organization_id (str): The organization identifier to scope the query

    Returns:
        Dict: Performance data including:
            - member_id: Team member identifier
            - member_name: Team member's name
            - role: Team member's role
            - assigned_tasks: Total number of tasks assigned
            - completed_tasks: Number of completed tasks
            - in_progress_tasks: Number of tasks currently in progress
            - completion_rate: Percentage of completed tasks (0-100)
            - availability: Team member's availability status

    Example:
        result = get_team_performance("member123", "org456")
        # Returns: {"status": "success", "data": {"team_performance": [...]}}
    """
    try:
        # Validate required parameters
        if not validate_object_id(team_member_id):
            return create_response("error", error_message="Invalid team_member_id format")
        if not validate_object_id(organization_id):
            return create_response("error", error_message="Invalid organization_id format")

        team_members = db_manager.get_collection("team_members")
        tasks = db_manager.get_collection("tasks")

        # Build team member query with required parameters
        member_query = {
            "_id": ObjectId(team_member_id),
            "organization": ObjectId(organization_id)
        }

        member_list = list(team_members.find(member_query))

        performance_data = []
        for member in member_list:
            member_id_str = str(member["_id"])

            # Get task statistics for this team member (using assignedTo field, not assigneeId)
            assigned_tasks = tasks.count_documents({"assignedTo": ObjectId(member_id_str)})
            completed_tasks = tasks.count_documents({"assignedTo": ObjectId(member_id_str), "status": "completed"})
            in_progress_tasks = tasks.count_documents({"assignedTo": ObjectId(member_id_str), "status": "in_progress"})

            completion_rate = (completed_tasks / assigned_tasks * 100) if assigned_tasks > 0 else 0

            performance_info = {
                "member_id": member_id_str,
                "member_name": member.get("name", ""),
                "role": member.get("role", ""),
                "assigned_tasks": assigned_tasks,
                "completed_tasks": completed_tasks,
                "in_progress_tasks": in_progress_tasks,
                "completion_rate": round(completion_rate, 2),
                "availability": member.get("availability", "unknown")
            }
            performance_data.append(performance_info)

        logger.info(f"Generated performance analytics for {len(performance_data)} team members")
        return create_response("success", {"team_performance": performance_data})

    except Exception as e:
        logger.error(f"Error getting team performance: {e}")
        return create_response("error", error_message=str(e))

# --- MCP Server Setup ---
logger.info("Creating MCP Server instance for Barka Project Management...")
app = Server("barka-project-manager")

# ADK Tools Dictionary - will be populated with all project management functions
ADK_PROJECT_TOOLS = {
    # Project Operations (7 tools)
    "create_project": FunctionTool(func=create_project),
    "get_project": FunctionTool(func=get_project),
    "list_projects": FunctionTool(func=list_projects),
    "update_project": FunctionTool(func=update_project),
    "delete_project": FunctionTool(func=delete_project),
    "search_projects": FunctionTool(func=search_projects),
    "get_project_tasks": FunctionTool(func=get_project_tasks),

    # Task Operations (6 tools)
    "create_task": FunctionTool(func=create_task),
    "get_task": FunctionTool(func=get_task),
    "list_tasks": FunctionTool(func=list_tasks),
    "update_task": FunctionTool(func=update_task),
    "delete_task": FunctionTool(func=delete_task),
    "add_task_comment": FunctionTool(func=add_task_comment),

    # Team Operations (7 tools)
    "create_team_member": FunctionTool(func=create_team_member),
    "get_team_member": FunctionTool(func=get_team_member),
    "list_team_members": FunctionTool(func=list_team_members),
    "update_team_member": FunctionTool(func=update_team_member),
    "delete_team_member": FunctionTool(func=delete_team_member),
    "find_available_team_members": FunctionTool(func=find_available_team_members),
    "get_team_member_workload": FunctionTool(func=get_team_member_workload),

    # Search Operations (1 tool)
    "cross_search": FunctionTool(func=cross_search),

    # Client Operations (2 tools)
    "list_clients": FunctionTool(func=list_clients),
    "get_client": FunctionTool(func=get_client),

    # Analytics Operations (2 tools)
    "get_project_progress": FunctionTool(func=get_project_progress),
    "get_team_performance": FunctionTool(func=get_team_performance),
}

@app.list_tools()
async def list_mcp_tools() -> List[mcp_types.Tool]:
    """MCP handler to list tools this server exposes."""
    logger.info("MCP Server: Received list_tools request.")
    mcp_tools_list = []
    
    for tool_name, adk_tool_instance in ADK_PROJECT_TOOLS.items():
        if not adk_tool_instance.name:
            adk_tool_instance.name = tool_name

        mcp_tool_schema = adk_to_mcp_tool_type(adk_tool_instance)
        logger.info(f"MCP Server: Advertising tool: {mcp_tool_schema.name}")
        mcp_tools_list.append(mcp_tool_schema)
        
    return mcp_tools_list

@app.call_tool()
async def call_mcp_tool(name: str, arguments: dict) -> List[mcp_types.TextContent]:
    """Enhanced MCP handler with session state support for parameter auto-resolution."""
    logger.info(f"MCP Server: Received call_tool request for '{name}' with args: {arguments}")

    if name in ADK_PROJECT_TOOLS:
        adk_tool_instance = ADK_PROJECT_TOOLS[name]

        # Extract session state from arguments if provided
        session_state = arguments.pop('_session_state', None)

        # Create mock tool context with session state
        mock_tool_context = create_mock_tool_context(session_state)

        # Create session-aware tool wrapper
        session_aware_tool = SessionAwareMCPTool(adk_tool_instance, name)

        try:
            # Use session-aware tool that auto-resolves parameters
            adk_tool_response = await session_aware_tool.run_async(
                args=arguments,
                tool_context=mock_tool_context,
            )
            logger.info(f"MCP Server: ADK tool '{name}' executed successfully with session state support")
            response_text = json.dumps(adk_tool_response, indent=2)
            return [mcp_types.TextContent(type="text", text=response_text)]

        except Exception as e:
            logger.error(f"MCP Server: Error executing ADK tool '{name}': {e}", exc_info=True)
            error_payload = create_response("error", error_message=f"Failed to execute tool '{name}': {str(e)}")
            error_text = json.dumps(error_payload)
            return [mcp_types.TextContent(type="text", text=error_text)]
    else:
        logger.warning(f"MCP Server: Tool '{name}' not found/exposed by this server.")
        error_payload = create_response("error", error_message=f"Tool '{name}' not implemented by this server.")
        error_text = json.dumps(error_payload)
        return [mcp_types.TextContent(type="text", text=error_text)]

# --- MCP Server Runner ---
async def run_mcp_stdio_server():
    """Runs the MCP server, listening for connections over standard input/output."""
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        logger.info("MCP Stdio Server: Starting handshake with client...")
        await app.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name=app.name,
                server_version="1.0.0",
                capabilities=app.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )
        logger.info("MCP Stdio Server: Run loop finished or client disconnected.")

if __name__ == "__main__":
    logger.info("Launching Barka Project Management MCP Server via stdio...")
    try:
        # Start MCP server (database connection will be lazy)
        asyncio.run(run_mcp_stdio_server())
    except KeyboardInterrupt:
        logger.info("\nMCP Server (stdio) stopped by user.")
    except Exception as e:
        logger.critical(f"MCP Server (stdio) encountered an unhandled error: {e}", exc_info=True)
    finally:
        db_manager.disconnect()
        logger.info("MCP Server (stdio) process exiting.")
