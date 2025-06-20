"""
User Memory Model for Persistent Memory Storage

This model manages user memories including:
- Conversation memories and context
- Factual information about users
- Episodic memories from interactions
- Semantic relationships between concepts
- Privacy-controlled memory access
"""

import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from bson import ObjectId
from pymongo.errors import PyMongoError
import hashlib
import json

logger = logging.getLogger(__name__)


class UserMemory:
    """
    User Memory model for managing persistent memory storage.
    
    This class handles:
    - Memory creation and storage
    - Memory retrieval and search
    - Privacy-controlled access
    - Memory lifecycle management
    - Semantic memory relationships
    """
    
    # Memory types
    MEMORY_TYPES = [
        "factual",      # Facts about the user
        "preference",   # User preferences
        "episodic",     # Specific interactions/events
        "semantic",     # Concepts and relationships
        "behavioral",   # Behavioral patterns
        "contextual"    # Contextual information
    ]
    
    # Memory importance levels
    IMPORTANCE_LEVELS = [
        "low",
        "medium", 
        "high",
        "critical"
    ]
    
    # Privacy levels
    PRIVACY_LEVELS = [
        "private",      # User only
        "organization", # User + organization
        "system"        # System-wide (anonymized)
    ]
    
    def __init__(self, db):
        """
        Initialize UserMemory with database connection.
        
        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.collection = db["user_memories"]
        self._create_indexes()
    
    def _create_indexes(self):
        """Create necessary indexes for the user memories collection."""
        try:
            # Compound index on user_id and memory_type
            self.collection.create_index([("userId", 1), ("memoryType", 1)])
            
            # Index on organization for multi-tenant queries
            self.collection.create_index("organizationId")
            
            # Index on created date for temporal queries
            self.collection.create_index("createdAt")
            
            # Index on importance for priority queries
            self.collection.create_index("importance")
            
            # Text index for content search
            self.collection.create_index([("content", "text"), ("summary", "text")])
            
            # Index on tags for categorization
            self.collection.create_index("tags")
            
            # Index on privacy level for access control
            self.collection.create_index("privacyLevel")
            
            logger.info("User memory indexes created successfully")
        except Exception as e:
            logger.error(f"Error creating user memory indexes: {e}")
    
    def store_memory(self, user_id: str, organization_id: str, content: str,
                    memory_type: str = "factual", importance: str = "medium",
                    privacy_level: str = "private", tags: List[str] = None,
                    metadata: Dict = None) -> Optional[str]:
        """
        Store a new memory for a user.
        
        Args:
            user_id: User identifier
            organization_id: Organization identifier
            content: Memory content
            memory_type: Type of memory
            importance: Importance level
            privacy_level: Privacy level
            tags: Optional tags for categorization
            metadata: Optional metadata
            
        Returns:
            str: Memory ID if successful, None otherwise
        """
        try:
            # Generate content hash for deduplication
            content_hash = hashlib.sha256(content.encode()).hexdigest()
            
            # Check for duplicate memory
            existing = self.collection.find_one({
                "userId": user_id,
                "contentHash": content_hash
            })
            
            if existing:
                logger.debug(f"Memory already exists for user {user_id}")
                return str(existing["_id"])
            
            # Create memory document
            memory_doc = {
                "userId": user_id,
                "organizationId": organization_id,
                "content": content,
                "contentHash": content_hash,
                "memoryType": memory_type,
                "importance": importance,
                "privacyLevel": privacy_level,
                "tags": tags or [],
                "summary": self._generate_summary(content),
                "accessCount": 0,
                "lastAccessed": None,
                "metadata": metadata or {},
                "createdAt": datetime.now(timezone.utc),
                "updatedAt": datetime.now(timezone.utc)
            }
            
            result = self.collection.insert_one(memory_doc)
            memory_id = str(result.inserted_id)
            
            logger.info(f"Stored memory {memory_id} for user {user_id}")
            return memory_id
            
        except Exception as e:
            logger.error(f"Error storing memory: {e}")
            return None
    
    def retrieve_memory(self, memory_id: str, user_id: str) -> Optional[Dict]:
        """
        Retrieve a specific memory by ID with privacy check.
        
        Args:
            memory_id: Memory identifier
            user_id: User identifier (for privacy check)
            
        Returns:
            dict: Memory document or None if not found/not accessible
        """
        try:
            memory = self.collection.find_one({
                "_id": ObjectId(memory_id),
                "userId": user_id  # Ensure user can only access their own memories
            })
            
            if memory:
                # Update access tracking
                self.collection.update_one(
                    {"_id": ObjectId(memory_id)},
                    {
                        "$inc": {"accessCount": 1},
                        "$set": {"lastAccessed": datetime.now(timezone.utc)}
                    }
                )
                
                logger.debug(f"Retrieved memory {memory_id} for user {user_id}")
            
            return memory
            
        except Exception as e:
            logger.error(f"Error retrieving memory: {e}")
            return None
    
    def search_memories(self, user_id: str, query: str = None, 
                       memory_type: str = None, tags: List[str] = None,
                       importance: str = None, limit: int = 10) -> List[Dict]:
        """
        Search user memories with various filters.
        
        Args:
            user_id: User identifier
            query: Text search query
            memory_type: Filter by memory type
            tags: Filter by tags
            importance: Filter by importance
            limit: Maximum number of results
            
        Returns:
            list: List of matching memory documents
        """
        try:
            # Build search filter
            search_filter = {"userId": user_id}
            
            if memory_type:
                search_filter["memoryType"] = memory_type
            
            if importance:
                search_filter["importance"] = importance
                
            if tags:
                search_filter["tags"] = {"$in": tags}
            
            # Build query
            if query:
                search_filter["$text"] = {"$search": query}
                cursor = self.collection.find(search_filter).sort([("score", {"$meta": "textScore"})])
            else:
                cursor = self.collection.find(search_filter).sort("createdAt", -1)
            
            memories = list(cursor.limit(limit))
            
            logger.debug(f"Found {len(memories)} memories for user {user_id}")
            return memories
            
        except Exception as e:
            logger.error(f"Error searching memories: {e}")
            return []
    
    def update_memory(self, memory_id: str, user_id: str, updates: Dict) -> bool:
        """
        Update a memory with privacy check.
        
        Args:
            memory_id: Memory identifier
            user_id: User identifier (for privacy check)
            updates: Updates to apply
            
        Returns:
            bool: True if update was successful
        """
        try:
            # Add timestamp to updates
            updates["updatedAt"] = datetime.now(timezone.utc)
            
            result = self.collection.update_one(
                {
                    "_id": ObjectId(memory_id),
                    "userId": user_id  # Ensure user can only update their own memories
                },
                {"$set": updates}
            )
            
            if result.modified_count > 0:
                logger.info(f"Updated memory {memory_id} for user {user_id}")
                return True
            else:
                logger.warning(f"No memory found to update: {memory_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error updating memory: {e}")
            return False
    
    def delete_memory(self, memory_id: str, user_id: str) -> bool:
        """
        Delete a memory with privacy check.
        
        Args:
            memory_id: Memory identifier
            user_id: User identifier (for privacy check)
            
        Returns:
            bool: True if deletion was successful
        """
        try:
            result = self.collection.delete_one({
                "_id": ObjectId(memory_id),
                "userId": user_id  # Ensure user can only delete their own memories
            })
            
            if result.deleted_count > 0:
                logger.info(f"Deleted memory {memory_id} for user {user_id}")
                return True
            else:
                logger.warning(f"No memory found to delete: {memory_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error deleting memory: {e}")
            return False

    def delete_all_user_memories(self, user_id: str) -> int:
        """
        Delete all memories for a user (for privacy compliance).

        Args:
            user_id: User identifier

        Returns:
            int: Number of memories deleted
        """
        try:
            result = self.collection.delete_many({"userId": user_id})

            logger.info(f"Deleted {result.deleted_count} memories for user {user_id}")
            return result.deleted_count

        except Exception as e:
            logger.error(f"Error deleting all user memories: {e}")
            return 0

    def get_memory_stats(self, user_id: str) -> Dict:
        """
        Get memory statistics for a user.

        Args:
            user_id: User identifier

        Returns:
            dict: Memory statistics
        """
        try:
            pipeline = [
                {"$match": {"userId": user_id}},
                {"$group": {
                    "_id": "$memoryType",
                    "count": {"$sum": 1},
                    "totalAccess": {"$sum": "$accessCount"}
                }}
            ]

            type_stats = list(self.collection.aggregate(pipeline))

            total_memories = self.collection.count_documents({"userId": user_id})

            return {
                "totalMemories": total_memories,
                "typeBreakdown": type_stats,
                "lastUpdated": datetime.now(timezone.utc)
            }

        except Exception as e:
            logger.error(f"Error getting memory stats: {e}")
            return {}

    def _generate_summary(self, content: str, max_length: int = 100) -> str:
        """
        Generate a summary of memory content.

        Args:
            content: Full content
            max_length: Maximum summary length

        Returns:
            str: Content summary
        """
        if len(content) <= max_length:
            return content

        # Simple truncation with ellipsis
        # In production, you might want to use an LLM for better summarization
        return content[:max_length-3] + "..."
