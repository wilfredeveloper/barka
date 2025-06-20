"""
Todos Tool for Barka Agent

This module provides functions to interact with the MongoDB todos collection
and manage client onboarding todos.
"""

import logging
import json
from typing import Dict, List, Optional, Any, Union
from bson import ObjectId
from datetime import datetime
from google.adk.tools.tool_context import ToolContext
from lib.utils import _validate_object_id, _convert_objectid_to_str


# Custom JSON encoder to handle datetime and ObjectId
class MongoJSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, datetime):
            return o.isoformat()
        if isinstance(o, ObjectId):
            return str(o)
        return super().default(o)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class TodosTool:
    """
    Tool for managing todos in the MongoDB database.
    Replicates the functionality of the manage_todos tool in the Node.js backend.
    """

    def __init__(self, db):
        """
        Initialize the TodosTool with a MongoDB database connection.

        Args:
            db: MongoDB database connection
        """
        self.db = db
        self.todos_collection = db["todos"]
        self.clients_collection = db["clients"]
        self.conversations_collection = db["conversations"]

    

    def get_next_actionable_todo(self, client_id: str) -> Dict[str, Any]:
        """
        Get the next actionable todo for a client.

        Args:
            client_id: MongoDB ObjectId of the client

        Returns:
            Dict: Response with success status and next todo or error message
        """
        if not _validate_object_id(client_id):
            return {
                "status": "error",
                "error": "Invalid client ID format provided."
            }

        try:
            # First try to find an in-progress todo
            in_progress_todo = self.todos_collection.find_one(
                {"client": ObjectId(client_id), "status": "in_progress"},
                sort=[("phase", 1), ("orderInPhase", 1)]
            )

            if in_progress_todo:
                # Convert ObjectId to string for JSON serialization
                in_progress_todo["_id"] = str(in_progress_todo["_id"])
                in_progress_todo["client"] = str(in_progress_todo["client"])
                in_progress_todo["organization"] = str(in_progress_todo["organization"])
                
                in_progress_todo_data = _convert_objectid_to_str(in_progress_todo)

                return {
                    "status": "success",
                    "nextTodo": in_progress_todo_data
                }

            # If no in-progress todo, find the next pending todo
            pending_todo = self.todos_collection.find_one(
                {"client": ObjectId(client_id), "status": "pending"},
                sort=[("phase", 1), ("orderInPhase", 1)]
            )

            if pending_todo:
                # Convert ObjectId to string for JSON serialization
                pending_todo["_id"] = str(pending_todo["_id"])
                pending_todo["client"] = str(pending_todo["client"])
                pending_todo["organization"] = str(pending_todo["organization"])
                
                pending_todo_data = _convert_objectid_to_str(pending_todo)

                return {
                    "status": "success",
                    "nextTodo": pending_todo_data
                }

            # No actionable todos found
            return {
                "status": "success",
                "message": "No actionable todos found. Onboarding might be complete or awaiting phase progression.",
                "nextTodo": None
            }

        except Exception as e:
            logger.error(f"Error getting next actionable todo: {str(e)}")
            return {
                "status": "error",
                "error": f"An internal error occurred: {str(e)}"
            }

    def get_todo_details(self, todo_id: str) -> Dict[str, Any]:
        """
        Get details for a specific todo.

        Args:
            todo_id: MongoDB ObjectId of the todo

        Returns:
            Dict: Response with success status and todo details or error message
        """
        if not _validate_object_id(todo_id):
            return {
                "status": "error",
                "error": "Invalid todo ID format provided."
            }

        try:
            todo = self.todos_collection.find_one({"_id": ObjectId(todo_id)})

            if not todo:
                return {
                    "status": "error",
                    "error": f"Todo with ID {todo_id} not found."
                }

            # Convert ObjectId to string for JSON serialization
            todo["_id"] = str(todo["_id"])
            todo["client"] = str(todo["client"])
            todo["organization"] = str(todo["organization"])
            
            todo_data = _convert_objectid_to_str(todo)

            return {
                "status": "success",
                "todo": todo_data
            }

        except Exception as e:
            logger.error(f"Error getting todo details: {str(e)}")
            return {
                "status": "error",
                "error": f"An internal error occurred: {str(e)}"
            }

    def list_todos(self, client_id: str, status_filter: Optional[str]) -> Dict[str, Any]:
        """
        List todos for a client, optionally filtered by status.

        Args:
            client_id: MongoDB ObjectId of the client
            status_filter: Optional status filter ('pending', 'in_progress', 'completed', 'skipped')

        Returns:
            Dict: Response with success status and list of todos or error message
        """
        if not _validate_object_id(client_id):
            return {
                "status": "error",
                "error": "Invalid client ID format provided."
            }

        try:
            query = {"client": ObjectId(client_id)}

            if status_filter:
                query["status"] = status_filter # type: ignore

            todos = list(self.todos_collection.find(
                query,
                sort=[("phase", 1), ("orderInPhase", 1)]
            ))

            # Convert ObjectId to string for JSON serialization
            todos_serializable = []
            for todo in todos:
                todos_serializable.append(_convert_objectid_to_str(todo))

            return {
                "status": "success",
                "count": len(todos),
                "todos": todos_serializable
            }

        except Exception as e:
            logger.error(f"Error listing todos: {str(e)}")
            return {
                "status": "error",
                "error": f"An internal error occurred: {str(e)}"
            }

    def get_todos_summary(self, client_id: str) -> Dict[str, Any]:
        """
        Get a summary of todos for a client.

        Args:
            client_id: MongoDB ObjectId of the client

        Returns:
            Dict: Response with success status and todos summary or error message
        """
        if not _validate_object_id(client_id):
            return {
                "status": "error",
                "error": "Invalid client ID format provided."
            }

        try:
            # Get client info
            client = self.clients_collection.find_one({"_id": ObjectId(client_id)})

            if not client:
                return {
                    "status": "error",
                    "error": f"Client with ID {client_id} not found."
                }

            # Get all todos for the client
            todos = list(self.todos_collection.find({"client": ObjectId(client_id)}))

            # Calculate progress
            progress = self._calculate_progress(client_id)

            # Count todos by status
            pending = sum(1 for todo in todos if todo["status"] == "pending")
            in_progress = sum(1 for todo in todos if todo["status"] == "in_progress")
            completed = sum(1 for todo in todos if todo["status"] == "completed")
            skipped = sum(1 for todo in todos if todo["status"] == "skipped")

            # Count todos by phase
            by_phase = {}
            for todo in todos:
                phase = todo.get("phase", "unknown")
                if phase not in by_phase:
                    by_phase[phase] = {
                        "total": 0,
                        "completed": 0,
                        "pending": 0,
                        "inProgress": 0,
                        "skipped": 0
                    }

                by_phase[phase]["total"] += 1

                if todo["status"] == "pending":
                    by_phase[phase]["pending"] += 1
                elif todo["status"] == "in_progress":
                    by_phase[phase]["inProgress"] += 1
                elif todo["status"] == "completed":
                    by_phase[phase]["completed"] += 1
                elif todo["status"] == "skipped":
                    by_phase[phase]["skipped"] += 1

            return {
                "status": "success",
                "summary": {
                    "clientId": client_id,
                    "clientName": client.get("name", "Unknown"),
                    "projectType": client.get("projectType", "Unknown"),
                    "progress": progress.get("overall", 0),
                    "totalTodos": len(todos),
                    "byStatus": {
                        "pending": pending,
                        "inProgress": in_progress,
                        "completed": completed,
                        "skipped": skipped
                    },
                    "byPhase": by_phase,
                    "phaseProgress": progress.get("byPhase", {})
                }
            }

        except Exception as e:
            logger.error(f"Error getting todos summary: {str(e)}")
            return {
                "status": "error",
                "error": f"An internal error occurred: {str(e)}"
            }

    def update_todo_status(self, todo_id: str, status: str, collected_info: str) -> Dict[str, Any]:
        """
        Update a todo's status, add collected information, and update progress.

        Args:
            todo_id: MongoDB ObjectId of the todo
            status: New status ('pending', 'in_progress', 'completed', 'skipped')
            collected_info: Optional string with collected information (will be added as a note)

        Returns:
            Dict: Response with success status, updated todo, progress info, and error message
        """
        if not _validate_object_id(todo_id):
            return {
                "status": "error",
                "error": "Invalid todo ID format provided."
            }

        valid_statuses = ['pending', 'in_progress', 'completed', 'skipped']
        if status not in valid_statuses:
            return {
                "status": "error",
                "error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            }

        # Handle empty collected_info
        if not collected_info:
            collected_info = ""

        try:
            # First get the todo
            todo = self.todos_collection.find_one({"_id": ObjectId(todo_id)})
            if not todo:
                return {
                    "status": "error",
                    "error": f"Todo with ID {todo_id} not found."
                }

            # Extract client_id from todo
            client_id = str(todo["client"])

            update_data = {"status": status}

            if status == "completed":
                update_data["completedAt"] = datetime.now().isoformat()

                # If collected_info is provided, store it
                if collected_info:
                    # Create a simple JSON object with the collected info and timestamp
                    collected_info_obj = {
                        "information": collected_info,
                        "timestamp": datetime.now().isoformat()
                    }
                    update_data["collectedInformation"] = json.dumps(collected_info_obj)
            else:
                update_data["completedAt"] = ""
                update_data["collectedInformation"] = json.dumps({})

            # Update the todo
            result = self.todos_collection.find_one_and_update(
                {"_id": ObjectId(todo_id)},
                {"$set": update_data},
                return_document=True
            )

            # Convert ObjectId to string for JSON serialization
            result_serializable = _convert_objectid_to_str(result)

            progress = self._calculate_and_update_progress(client_id)

            # If collected_info is provided, add it as a note
            note_result = None
            if collected_info:
                note = f"Status updated to '{status}'. Collected information: {collected_info}"
                note_result = self.add_note_to_todo(todo_id, note)
            
            return {
                "status": "success",
                "updatedTodo": result_serializable,
                "noteAdded": note_result["status"] == "success" if note_result else False,
                "progress": progress,
                "message": f"Todo status updated to {status}. Overall progress: {progress['overall']}%"
            }
        
        except Exception as e:
            logger.error(f"Error updating todo status: {str(e)}")
            return {
                "status": "error",
                "error": f"An internal error occurred: {str(e)}"
            }
    
    def get_completed_todos_with_info(self, client_id: str) -> Dict[str, Any]:
        """
        Get completed todos with their collected information.

        Args:
            client_id: MongoDB ObjectId of the client

        Returns:
            Dict: Response with success status and completed todos or error message
        """
        if not _validate_object_id(client_id):
            return {
                "status": "error",
                "error": "Invalid client ID format provided."
            }

        try:
            # Get completed todos
            completed_todos = list(self.todos_collection.find(
                {"client": ObjectId(client_id), "status": "completed"},
                sort=[("completedAt", 1)]
            ))

            # Format todos for agent consumption
            formatted_todos = []
            # Convert ObjectId to string for JSON serialization
            for todo in completed_todos:
                todo_serializable = _convert_objectid_to_str(todo)
                formatted_todos.append(todo_serializable)

            return {
                "status": "success",
                "count": len(completed_todos),
                "completedTodos": formatted_todos
            }

        except Exception as e:
            logger.error(f"Error getting completed todos: {str(e)}")
            return {
                "status": "error",
                "error": f"An internal error occurred: {str(e)}"
            }

    def add_note_to_todo(self, todo_id: str, note: str) -> Dict[str, Any]:
        """
        Add a note to a todo.

        Args:
            todo_id: MongoDB ObjectId of the todo
            note: Note content

        Returns:
            Dict: Response with success status and updated todo or error message
        """
        if not _validate_object_id(todo_id):
            return {
                "status": "error",
                "error": "Invalid todo ID format provided."
            }

        if not note:
            return {
                "status": "error",
                "error": "Note content is required."
            }

        try:
            # Add note to todo
            result = self.todos_collection.find_one_and_update(
                {"_id": ObjectId(todo_id)},
                {"$push": {"notes": {
                    "content": note,
                    "author": "agent",
                    "createdAt": datetime.now()
                }}},
                return_document=True
            )

            if not result:
                return {
                    "status": "error",
                    "error": f"Todo with ID {todo_id} not found."
                }

            # Convert ObjectId to string for JSON serialization
            result_serializable = _convert_objectid_to_str(result)

            return {
                "status": "success",
                "message": "Note added successfully.",
                "todo": result_serializable
            }

        except Exception as e:
            logger.error(f"Error adding note to todo: {str(e)}")
            return {
                "status": "error",
                "error": f"An internal error occurred: {str(e)}"
            }

    def _calculate_progress(self, client_id: str) -> Dict[str, Any]:
        """
        Calculate progress for a client's todos.

        Args:
            client_id: MongoDB ObjectId of the client

        Returns:
            Dict: Progress information
        """
        todos = list(self.todos_collection.find({"client": ObjectId(client_id)}))

        if not todos:
            return {
                "overall": 0,
                "byPhase": {},
                "totalTodos": 0,
                "completedTodos": 0
            }

        # Calculate weighted progress
        total_weight = 0
        completed_weight = 0
        phase_progress = {}
        phase_totals = {}

        # Initialize phase counters
        for todo in todos:
            phase = todo.get("phase", "unknown")
            if phase not in phase_totals:
                phase_totals[phase] = {
                    "total": 0,
                    "completed": 0,
                    "weight": 0,
                    "completedWeight": 0
                }

        # Calculate weights and progress
        for todo in todos:
            weight = todo.get("weight", 1)
            phase = todo.get("phase", "unknown")

            total_weight += weight
            phase_totals[phase]["total"] += 1
            phase_totals[phase]["weight"] += weight

            if todo["status"] == "completed":
                completed_weight += weight
                phase_totals[phase]["completed"] += 1
                phase_totals[phase]["completedWeight"] += weight

        # Calculate progress by phase
        for phase, data in phase_totals.items():
            total = data["total"]
            completed = data["completed"]
            weight = data["weight"]
            completed_weight = data["completedWeight"]

            phase_progress[phase] = {
                "count": {"total": total, "completed": completed},
                "percentage": round((completed / total) * 100) if total > 0 else 0,
                "weightedPercentage": round((completed_weight / weight) * 100) if weight > 0 else 0
            }

        # Calculate overall progress
        overall_progress = round((completed_weight / total_weight) * 100) if total_weight > 0 else 0

        return {
            "overall": overall_progress,
            "byPhase": phase_progress,
            "totalTodos": len(todos),
            "completedTodos": sum(1 for todo in todos if todo["status"] == "completed")
        }

    def _calculate_and_update_progress(self, client_id: str) -> Dict[str, Any]:
        """
        Calculate and update progress for a client.

        Args:
            client_id: MongoDB ObjectId of the client
        """
        progress = self._calculate_progress(client_id)

        # Update client progress
        self.clients_collection.update_one(
            {"_id": ObjectId(client_id)},
            {"$set": {"onboardingProgress": progress["overall"]}}
        )
        return {
            "overall": progress["overall"],
            "byPhase": progress["byPhase"],
            "totalTodos": progress["totalTodos"],
            "completedTodos": progress["completedTodos"]
        }

    def _update_memory_context(self, conversation_id: str, client_id: str,
                              todo_id: str, updated_todo: Dict) -> None:
        """
        Update memory context in conversation.

        Args:
            conversation_id: MongoDB ObjectId of the conversation
            client_id: MongoDB ObjectId of the client
            todo_id: MongoDB ObjectId of the todo
            updated_todo: Updated todo object
        """
        try:
            # Get conversation
            conversation = self.conversations_collection.find_one(
                {"_id": ObjectId(conversation_id)}
            )

            if not conversation or "memoryContext" not in conversation:
                logger.info(f"No memory context found in conversation {conversation_id}")
                return

            memory_context = conversation.get("memoryContext", {})

            # Check if the todo is already in the array
            completed_todos = memory_context.get("completedTodos", [])
            existing_index = -1

            for i, todo in enumerate(completed_todos):
                if str(todo.get("_id", "")) == todo_id:
                    existing_index = i
                    break

            if existing_index >= 0:
                # Update existing todo
                logger.info(f"Updating existing todo at index {existing_index} in memory context")
                completed_todos[existing_index] = updated_todo
            else:
                # Add new todo
                logger.info(f"Adding new completed todo to memory context")
                if "completedTodos" not in memory_context:
                    memory_context["completedTodos"] = []
                memory_context["completedTodos"].append(updated_todo)

            # Update progress information
            logger.info(f"Updating progress information in memory context")
            progress = self._calculate_progress(client_id)
            memory_context["progress"] = progress

            # Update conversation
            self.conversations_collection.update_one(
                {"_id": ObjectId(conversation_id)},
                {"$set": {"memoryContext": memory_context}}
            )

        except Exception as e:
            logger.error(f"Error updating memory context: {str(e)}")

    def manage_todos(self, action: str, client_id: str, todo_id: str, status: str, # type: ignore
                     collected_info: Optional[str], note: Optional[str]) -> str:
        """
        Manage todos for a client.

        Args:
            action: Action to perform
            payload: Payload for the action

        Returns:
            str: JSON string with the response
        """
        try:
            if action == "get_next_actionable_todo":
                if not client_id:
                    return json.dumps({
                        "status": "error",
                        "error": "Client ID is required for get_next_actionable_todo."
                    }, cls=MongoJSONEncoder)
                return json.dumps(self.get_next_actionable_todo(client_id), cls=MongoJSONEncoder)

            elif action == "update_todo_status":
                if not all([client_id, todo_id, status]):
                    return json.dumps({
                        "status": "error",
                        "error": "todoId, status, and clientId are required for update_todo_status."
                    }, cls=MongoJSONEncoder)

                return json.dumps(self.update_todo_status(
                    client_id, todo_id, status
                ), cls=MongoJSONEncoder)

            elif action == "get_todo_details":
                if not todo_id:
                    return json.dumps({
                        "status": "error",
                        "error": "todoId is required for get_todo_details."
                    }, cls=MongoJSONEncoder)
                return json.dumps(self.get_todo_details(todo_id), cls=MongoJSONEncoder)

            elif action == "list_todos":
                if not client_id:
                    return json.dumps({
                        "status": "error",
                        "error": "Client ID is required for list_todos."
                    }, cls=MongoJSONEncoder)

                return json.dumps(self.list_todos(client_id, status), cls=MongoJSONEncoder)

            elif action == "get_todos_summary":
                if not client_id:
                    return json.dumps({
                        "status": "error",
                        "error": "Client ID is required for get_todos_summary."
                    }, cls=MongoJSONEncoder)

                return json.dumps(self.get_todos_summary(client_id), cls=MongoJSONEncoder)

            elif action == "get_completed_todos_with_info":
                if not client_id:
                    return json.dumps({
                        "status": "error",
                        "error": "Client ID is required for get_completed_todos_with_info."
                    }, cls=MongoJSONEncoder)

                return json.dumps(self.get_completed_todos_with_info(client_id), cls=MongoJSONEncoder)

            # elif action == "add_note_to_todo":
            #     if not all([todo_id, note]):
            #         return json.dumps({
            #             "status": "error",
            #             "error": "todoId and note are required for add_note_to_todo."
            #         }, cls=MongoJSONEncoder)

            #     return json.dumps(self.add_note_to_todo(todo_id, note), cls=MongoJSONEncoder)

            else:
                return json.dumps({
                    "status": "error",
                    "error": f"Unknown action: {action}"
                }, cls=MongoJSONEncoder)

        except Exception as e:
            logger.error(f"Error in manage_todos_tool (action: {action}): {str(e)}")
            return json.dumps({
                "status": "error",
                "error": f"An internal error occurred: {str(e)}"
            }, cls=MongoJSONEncoder)


# ADK-style tool functions for persistent memory
def get_next_actionable_todo_persistent(tool_context: ToolContext, client_id: Optional[str] = None) -> dict:
    """
    Get the next actionable todo for a client with session persistence.

    Args:
        tool_context: Context for accessing and updating session state
        client_id: MongoDB ObjectId of the client (optional - will read from session state if not provided)

    Returns:
        dict: Response with success status and next todo or error message
    """
    from lib.db import get_database

    # Auto-resolve client_id from session state if not provided
    if not client_id and tool_context:
        client_id = tool_context.state.get("client_id")
        if client_id:
            print(f"--- Tool: get_next_actionable_todo_persistent using client_id from session state: '{client_id}' ---")
        else:
            print("--- Tool: get_next_actionable_todo_persistent - no client_id in session state ---")
    else:
        print(f"--- Tool: get_next_actionable_todo_persistent called with explicit client_id: '{client_id}' ---")

    if not client_id:
        return {
            "status": "error",
            "error": "Client ID is required to access your onboarding progress. Please provide your client ID."
        }

    if not _validate_object_id(client_id):
        return {
            "status": "error",
            "error": "Invalid client ID format provided."
        }

    try:
        db = get_database()
        todos_collection = db["todos"]

        # First try to find an in-progress todo
        in_progress_todo = todos_collection.find_one(
            {"client": ObjectId(client_id), "status": "in_progress"},
            sort=[("phase", 1), ("orderInPhase", 1)]
        )

        if in_progress_todo:
            in_progress_todo_data = _convert_objectid_to_str(in_progress_todo)

            # Store in session state for persistence
            if tool_context:
                current_todos = tool_context.state.get("barka_current_todos", {})
                current_todos[client_id] = {
                    "current_todo": in_progress_todo_data,
                    "status": "in_progress",
                    "last_accessed": datetime.now().isoformat()
                }
                tool_context.state["barka_current_todos"] = current_todos

                # Also ensure client_id is stored in session state for future use
                tool_context.state["client_id"] = client_id

            return {
                "status": "success",
                "nextTodo": in_progress_todo_data
            }

        # If no in-progress todo, find the next pending todo
        pending_todo = todos_collection.find_one(
            {"client": ObjectId(client_id), "status": "pending"},
            sort=[("phase", 1), ("orderInPhase", 1)]
        )

        if pending_todo:
            pending_todo_data = _convert_objectid_to_str(pending_todo)

            # Store in session state for persistence
            if tool_context:
                current_todos = tool_context.state.get("barka_current_todos", {})
                current_todos[client_id] = {
                    "current_todo": pending_todo_data,
                    "status": "pending",
                    "last_accessed": datetime.now().isoformat()
                }
                tool_context.state["barka_current_todos"] = current_todos

                # Also ensure client_id is stored in session state for future use
                tool_context.state["client_id"] = client_id

            return {
                "status": "success",
                "nextTodo": pending_todo_data
            }

        # No actionable todos found
        return {
            "status": "success",
            "message": "No actionable todos found. Onboarding might be complete or awaiting phase progression.",
            "nextTodo": None
        }

    except Exception as e:
        logger.error(f"Error getting next actionable todo: {str(e)}")
        return {
            "status": "error",
            "error": f"An internal error occurred: {str(e)}"
        }


def update_todo_status_persistent(todo_id: str, status: str, collected_info: str, tool_context: ToolContext) -> dict:
    """
    Update a todo's status with session persistence.

    Args:
        todo_id: MongoDB ObjectId of the todo
        status: New status ('pending', 'in_progress', 'completed', 'skipped')
        collected_info: Optional string with collected information
        tool_context: Context for accessing and updating session state

    Returns:
        dict: Response with success status, updated todo, and progress info
    """
    from lib.db import get_database

    print(f"--- Tool: update_todo_status_persistent called for todo '{todo_id}' with status '{status}' ---")

    if not _validate_object_id(todo_id):
        return {
            "status": "error",
            "error": "Invalid todo ID format provided."
        }

    valid_statuses = ['pending', 'in_progress', 'completed', 'skipped']
    if status not in valid_statuses:
        return {
            "status": "error",
            "error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        }

    # Handle empty collected_info
    if not collected_info:
        collected_info = ""

    try:
        db = get_database()
        todos_collection = db["todos"]
        clients_collection = db["clients"]

        # First get the todo
        todo = todos_collection.find_one({"_id": ObjectId(todo_id)})
        if not todo:
            return {
                "status": "error",
                "error": f"Todo with ID {todo_id} not found."
            }

        # Extract client_id from todo
        client_id = str(todo["client"])

        update_data = {"status": status}

        if status == "completed":
            update_data["completedAt"] = datetime.now().isoformat()

            # If collected_info is provided, store it
            if collected_info:
                collected_info_obj = {
                    "information": collected_info,
                    "timestamp": datetime.now().isoformat()
                }
                update_data["collectedInformation"] = json.dumps(collected_info_obj)
        else:
            update_data["completedAt"] = ""
            update_data["collectedInformation"] = json.dumps({})

        # Update the todo
        result = todos_collection.find_one_and_update(
            {"_id": ObjectId(todo_id)},
            {"$set": update_data},
            return_document=True
        )

        result_serializable = _convert_objectid_to_str(result)

        # Calculate progress
        todos_tool = TodosTool(db)
        progress = todos_tool._calculate_and_update_progress(client_id)

        # Store todo updates in session state for persistence
        todo_updates = tool_context.state.get("barka_todo_updates", [])
        update_record = {
            "todo_id": todo_id,
            "client_id": client_id,
            "old_status": todo.get("status"),
            "new_status": status,
            "collected_info": collected_info,
            "updated_at": datetime.now().isoformat(),
            "progress_after": progress
        }
        todo_updates.append(update_record)

        # Keep only last 20 updates
        if len(todo_updates) > 20:
            todo_updates = todo_updates[-20:]
        tool_context.state["barka_todo_updates"] = todo_updates

        # Update current todos cache
        current_todos = tool_context.state.get("barka_current_todos", {})
        if client_id in current_todos:
            current_todos[client_id]["current_todo"] = result_serializable
            current_todos[client_id]["last_accessed"] = datetime.now().isoformat()
            tool_context.state["barka_current_todos"] = current_todos

        return {
            "status": "success",
            "updatedTodo": result_serializable,
            "progress": progress,
            "message": f"Todo status updated to {status}. Overall progress: {progress['overall']}%"
        }

    except Exception as e:
        logger.error(f"Error updating todo status: {str(e)}")
        return {
            "status": "error",
            "error": f"An internal error occurred: {str(e)}"
        }
