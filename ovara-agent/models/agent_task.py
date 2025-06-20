"""
Agent Task Model for Multi-Agent System

This model manages tasks assigned to different agents in the multi-agent system,
providing task tracking, dependency management, and execution monitoring.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from bson import ObjectId
from pymongo import MongoClient
from pymongo.errors import PyMongoError
import logging
import uuid

logger = logging.getLogger(__name__)


class AgentTask:
    """
    Agent Task model for managing tasks across the multi-agent system.
    
    This class handles:
    - Task creation and assignment
    - Task status tracking
    - Dependency management
    - Performance monitoring
    """
    
    # Task types
    TASK_TYPES = [
        "document_generation",
        "project_planning", 
        "scheduling",
        "approval",
        "notification",
        "onboarding",
        "analysis"
    ]
    
    # Task statuses
    TASK_STATUSES = [
        "pending",
        "in_progress", 
        "completed",
        "failed",
        "cancelled"
    ]
    
    # Priority levels
    PRIORITY_LEVELS = ["low", "medium", "high", "urgent"]
    
    def __init__(self, db):
        """
        Initialize AgentTask with database connection.
        
        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.collection = db["agent_tasks"]
        self._create_indexes()
    
    def _create_indexes(self):
        """Create database indexes for performance optimization."""
        try:
            # Index for agent and status queries
            self.collection.create_index([("agentName", 1), ("status", 1)])
            self.collection.create_index([("clientId", 1), ("taskType", 1)])
            self.collection.create_index([("status", 1), ("priority", 1), ("assignedAt", 1)])
            self.collection.create_index([("taskId", 1)], unique=True)
            self.collection.create_index([("organizationId", 1), ("createdAt", -1)])
            logger.debug("AgentTask indexes created successfully")
        except Exception as e:
            logger.warning(f"Failed to create AgentTask indexes: {e}")
    
    def create_task(self, agent_name: str, client_id: str, organization_id: str,
                   task_type: str, task_input: Dict[str, Any],
                   priority: str = "medium", dependencies: Optional[List[str]] = None,
                   estimated_duration: Optional[int] = None) -> Dict[str, Any]:
        """
        Create a new agent task.
        
        Args:
            agent_name: Name of the agent to assign the task
            client_id: MongoDB ObjectId of the client
            organization_id: MongoDB ObjectId of the organization
            task_type: Type of task (must be in TASK_TYPES)
            task_input: Input data for the task
            priority: Task priority (default: medium)
            dependencies: List of task IDs this task depends on
            estimated_duration: Estimated duration in minutes
            
        Returns:
            Dict containing the created task data
            
        Raises:
            ValueError: If validation fails
            RuntimeError: If database operation fails
        """
        try:
            # Validate inputs
            if task_type not in self.TASK_TYPES:
                raise ValueError(f"Invalid task_type: {task_type}. Must be one of {self.TASK_TYPES}")
            
            if priority not in self.PRIORITY_LEVELS:
                raise ValueError(f"Invalid priority: {priority}. Must be one of {self.PRIORITY_LEVELS}")
            
            if not ObjectId.is_valid(client_id):
                raise ValueError(f"Invalid client_id: {client_id}")
            
            if not ObjectId.is_valid(organization_id):
                raise ValueError(f"Invalid organization_id: {organization_id}")
            
            # Generate unique task ID
            task_id = str(uuid.uuid4())
            
            # Create task document
            task_doc = {
                "taskId": task_id,
                "agentName": agent_name,
                "clientId": ObjectId(client_id),
                "organizationId": ObjectId(organization_id),
                "taskType": task_type,
                "priority": priority,
                "status": "pending",
                "input": task_input,
                "output": None,
                "dependencies": dependencies or [],
                "assignedAt": datetime.utcnow(),
                "startedAt": None,
                "completedAt": None,
                "estimatedDuration": estimated_duration,
                "actualDuration": None,
                "errorDetails": None,
                "retryCount": 0,
                "maxRetries": 3,
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
            }
            
            # Insert task
            result = self.collection.insert_one(task_doc)
            task_doc["_id"] = result.inserted_id
            
            logger.info(f"Created task {task_id} for agent {agent_name}")
            return self._convert_objectids_to_str(task_doc)
            
        except ValueError:
            raise
        except PyMongoError as e:
            logger.error(f"Database error creating task: {e}")
            raise RuntimeError(f"Database error: {e}")
        except Exception as e:
            logger.error(f"Unexpected error creating task: {e}")
            raise RuntimeError(f"Unexpected error: {e}")
    
    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """
        Get task by task ID.
        
        Args:
            task_id: Task identifier
            
        Returns:
            Task document or None if not found
        """
        try:
            task = self.collection.find_one({"taskId": task_id})
            return self._convert_objectids_to_str(task) if task else None
        except Exception as e:
            logger.error(f"Error retrieving task {task_id}: {e}")
            return None
    
    def update_task_status(self, task_id: str, status: str, 
                          output: Optional[Dict[str, Any]] = None,
                          error_details: Optional[Dict[str, Any]] = None) -> bool:
        """
        Update task status and output.
        
        Args:
            task_id: Task identifier
            status: New status (must be in TASK_STATUSES)
            output: Task output data (for completed tasks)
            error_details: Error information (for failed tasks)
            
        Returns:
            True if update successful, False otherwise
        """
        try:
            if status not in self.TASK_STATUSES:
                raise ValueError(f"Invalid status: {status}. Must be one of {self.TASK_STATUSES}")
            
            update_data = {
                "status": status,
                "updatedAt": datetime.utcnow()
            }
            
            # Set timestamps based on status
            if status == "in_progress" and not self.collection.find_one({"taskId": task_id, "startedAt": {"$ne": None}}):
                update_data["startedAt"] = datetime.utcnow()
            elif status in ["completed", "failed", "cancelled"]:
                update_data["completedAt"] = datetime.utcnow()
                
                # Calculate actual duration if task was started
                task = self.collection.find_one({"taskId": task_id})
                if task and task.get("startedAt"):
                    duration = (datetime.utcnow() - task["startedAt"]).total_seconds() / 60
                    update_data["actualDuration"] = round(duration, 2)
            
            # Add output or error details
            if output is not None:
                update_data["output"] = output
            if error_details is not None:
                update_data["errorDetails"] = error_details
            
            result = self.collection.update_one(
                {"taskId": task_id},
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                logger.info(f"Updated task {task_id} status to {status}")
                return True
            else:
                logger.warning(f"Failed to update task {task_id} status")
                return False
                
        except Exception as e:
            logger.error(f"Error updating task status: {e}")
            return False
    
    def get_agent_tasks(self, agent_name: str, status: Optional[str] = None,
                       limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get tasks assigned to a specific agent.
        
        Args:
            agent_name: Agent name
            status: Optional status filter
            limit: Maximum number of tasks to return
            
        Returns:
            List of task documents
        """
        try:
            query = {"agentName": agent_name}
            if status:
                query["status"] = status
            
            tasks = list(self.collection.find(query)
                        .sort("assignedAt", -1)
                        .limit(limit))
            
            return [self._convert_objectids_to_str(task) for task in tasks]
            
        except Exception as e:
            logger.error(f"Error retrieving agent tasks: {e}")
            return []
    
    def get_client_tasks(self, client_id: str, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get all tasks for a client.
        
        Args:
            client_id: Client identifier
            status: Optional status filter
            
        Returns:
            List of task documents
        """
        try:
            if not ObjectId.is_valid(client_id):
                raise ValueError(f"Invalid client_id: {client_id}")
            
            query = {"clientId": ObjectId(client_id)}
            if status:
                query["status"] = status
            
            tasks = list(self.collection.find(query).sort("assignedAt", -1))
            return [self._convert_objectids_to_str(task) for task in tasks]
            
        except Exception as e:
            logger.error(f"Error retrieving client tasks: {e}")
            return []
    
    def get_pending_tasks(self, agent_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get pending tasks, optionally filtered by agent.
        
        Args:
            agent_name: Optional agent name filter
            
        Returns:
            List of pending task documents sorted by priority and assignment time
        """
        try:
            query = {"status": "pending"}
            if agent_name:
                query["agentName"] = agent_name
            
            # Sort by priority (urgent first) then by assignment time
            priority_order = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
            
            tasks = list(self.collection.find(query))
            
            # Sort tasks by priority and then by assignment time
            tasks.sort(key=lambda x: (priority_order.get(x["priority"], 4), x["assignedAt"]))
            
            return [self._convert_objectids_to_str(task) for task in tasks]
            
        except Exception as e:
            logger.error(f"Error retrieving pending tasks: {e}")
            return []
    
    def increment_retry_count(self, task_id: str) -> bool:
        """
        Increment retry count for a failed task.
        
        Args:
            task_id: Task identifier
            
        Returns:
            True if increment successful, False otherwise
        """
        try:
            result = self.collection.update_one(
                {"taskId": task_id},
                {
                    "$inc": {"retryCount": 1},
                    "$set": {"updatedAt": datetime.utcnow()}
                }
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Error incrementing retry count for task {task_id}: {e}")
            return False
    
    def _convert_objectids_to_str(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """Convert ObjectId fields to strings for JSON serialization."""
        if not doc:
            return doc
        
        # Convert ObjectId fields to strings
        for field in ["_id", "clientId", "organizationId"]:
            if field in doc and doc[field] is not None:
                doc[field] = str(doc[field])
        
        return doc
