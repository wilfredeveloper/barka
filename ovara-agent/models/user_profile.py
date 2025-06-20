"""
User Profile Model for Memory and Personalization System

This model manages comprehensive user profiles including:
- Basic user information and preferences
- Communication style and interaction patterns
- Interest tracking and scoring
- Privacy settings and data control
"""

import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from bson import ObjectId
from pymongo.errors import DuplicateKeyError, PyMongoError

logger = logging.getLogger(__name__)


class UserProfile:
    """
    User Profile model for managing comprehensive user information and preferences.
    
    This class handles:
    - User profile creation and management
    - Interest tracking and scoring
    - Communication style preferences
    - Privacy settings and data control
    - Profile analytics and insights
    """
    
    # Communication styles
    COMMUNICATION_STYLES = [
        "formal",
        "casual", 
        "technical",
        "friendly",
        "concise",
        "detailed"
    ]
    
    # Experience levels
    EXPERIENCE_LEVELS = [
        "beginner",
        "intermediate", 
        "advanced",
        "expert"
    ]
    
    # Privacy levels
    PRIVACY_LEVELS = [
        "minimal",    # Store only essential information
        "standard",   # Store preferences and basic patterns
        "enhanced",   # Store detailed interaction patterns
        "full"        # Store comprehensive personalization data
    ]
    
    def __init__(self, db):
        """
        Initialize UserProfile with database connection.
        
        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.collection = db["user_profiles"]
        self._create_indexes()
    
    def _create_indexes(self):
        """Create necessary indexes for the user profiles collection."""
        try:
            # Unique index on user_id
            self.collection.create_index("userId", unique=True)
            
            # Index on organization for multi-tenant queries
            self.collection.create_index("organizationId")
            
            # Index on last updated for cleanup operations
            self.collection.create_index("lastUpdated")
            
            # Index on privacy level for compliance queries
            self.collection.create_index("privacySettings.level")
            
            logger.info("User profile indexes created successfully")
        except Exception as e:
            logger.error(f"Error creating user profile indexes: {e}")
    
    def create_profile(self, user_id: str, organization_id: str, 
                      initial_data: Optional[Dict] = None) -> Dict:
        """
        Create a new user profile.
        
        Args:
            user_id: Unique identifier for the user
            organization_id: Organization the user belongs to
            initial_data: Optional initial profile data
            
        Returns:
            dict: Created profile document
        """
        try:
            # Default profile structure
            profile_doc = {
                "userId": user_id,
                "organizationId": organization_id,
                "basicInfo": {
                    "name": initial_data.get("name", "") if initial_data else "",
                    "email": initial_data.get("email", "") if initial_data else "",
                    "role": initial_data.get("role", "") if initial_data else "",
                    "timezone": initial_data.get("timezone", "UTC") if initial_data else "UTC"
                },
                "preferences": {
                    "communicationStyle": "friendly",
                    "responseLength": "balanced",  # concise, balanced, detailed
                    "technicalLevel": "intermediate",
                    "language": "en",
                    "notifications": {
                        "email": True,
                        "inApp": True,
                        "reminders": True
                    }
                },
                "interests": {},  # topic -> score mapping
                "interactionPatterns": {
                    "totalInteractions": 0,
                    "averageSessionLength": 0,
                    "preferredTimeOfDay": [],
                    "commonTopics": [],
                    "responsePatterns": {}
                },
                "privacySettings": {
                    "level": "standard",
                    "dataRetentionDays": 365,
                    "allowPersonalization": True,
                    "allowAnalytics": True,
                    "shareWithOrganization": True
                },
                "metadata": {
                    "version": "1.0",
                    "source": "system"
                },
                "createdAt": datetime.now(timezone.utc),
                "lastUpdated": datetime.now(timezone.utc)
            }
            
            # Merge with initial data if provided
            if initial_data:
                self._merge_profile_data(profile_doc, initial_data)
            
            result = self.collection.insert_one(profile_doc)
            profile_doc["_id"] = result.inserted_id
            
            logger.info(f"Created user profile for user {user_id}")
            return profile_doc
            
        except DuplicateKeyError:
            logger.warning(f"User profile already exists for user {user_id}")
            return self.get_profile(user_id)
        except Exception as e:
            logger.error(f"Error creating user profile: {e}")
            raise
    
    def get_profile(self, user_id: str) -> Optional[Dict]:
        """
        Get user profile by user ID.
        
        Args:
            user_id: User identifier
            
        Returns:
            dict: User profile document or None if not found
        """
        try:
            profile = self.collection.find_one({"userId": user_id})
            if profile:
                logger.debug(f"Retrieved profile for user {user_id}")
            return profile
        except Exception as e:
            logger.error(f"Error retrieving user profile: {e}")
            return None

    def update_profile(self, user_id: str, updates: Dict) -> bool:
        """
        Update user profile with new data.

        Args:
            user_id: User identifier
            updates: Dictionary of updates to apply

        Returns:
            bool: True if update was successful
        """
        try:
            # Add timestamp to updates
            updates["lastUpdated"] = datetime.now(timezone.utc)

            result = self.collection.update_one(
                {"userId": user_id},
                {"$set": updates}
            )

            if result.modified_count > 0:
                logger.info(f"Updated profile for user {user_id}")
                return True
            else:
                logger.warning(f"No profile found to update for user {user_id}")
                return False

        except Exception as e:
            logger.error(f"Error updating user profile: {e}")
            return False

    def track_interest(self, user_id: str, topic: str, score: float) -> bool:
        """
        Track user interest in a topic with scoring.

        Args:
            user_id: User identifier
            topic: Topic of interest
            score: Interest score (0.0-1.0)

        Returns:
            bool: True if tracking was successful
        """
        try:
            # Use the maximum score if topic already exists
            result = self.collection.update_one(
                {"userId": user_id},
                {
                    "$max": {f"interests.{topic}": score},
                    "$set": {"lastUpdated": datetime.now(timezone.utc)}
                }
            )

            if result.modified_count > 0:
                logger.debug(f"Tracked interest '{topic}' for user {user_id} with score {score}")
                return True
            return False

        except Exception as e:
            logger.error(f"Error tracking user interest: {e}")
            return False

    def get_user_interests(self, user_id: str, limit: int = 10) -> List[Dict]:
        """
        Get top user interests sorted by score.

        Args:
            user_id: User identifier
            limit: Maximum number of interests to return

        Returns:
            list: List of interests with scores
        """
        try:
            profile = self.get_profile(user_id)
            if not profile or "interests" not in profile:
                return []

            interests = profile["interests"]
            sorted_interests = sorted(
                [(topic, score) for topic, score in interests.items()],
                key=lambda x: x[1],
                reverse=True
            )

            return [
                {"topic": topic, "score": score}
                for topic, score in sorted_interests[:limit]
            ]

        except Exception as e:
            logger.error(f"Error getting user interests: {e}")
            return []

    def update_interaction_patterns(self, user_id: str, session_data: Dict) -> bool:
        """
        Update user interaction patterns based on session data.

        Args:
            user_id: User identifier
            session_data: Session interaction data

        Returns:
            bool: True if update was successful
        """
        try:
            # Increment interaction count
            self.collection.update_one(
                {"userId": user_id},
                {
                    "$inc": {"interactionPatterns.totalInteractions": 1},
                    "$set": {"lastUpdated": datetime.now(timezone.utc)}
                }
            )

            # Update session length average if provided
            if "sessionLength" in session_data:
                profile = self.get_profile(user_id)
                if profile:
                    current_avg = profile.get("interactionPatterns", {}).get("averageSessionLength", 0)
                    total_interactions = profile.get("interactionPatterns", {}).get("totalInteractions", 1)

                    new_avg = ((current_avg * (total_interactions - 1)) + session_data["sessionLength"]) / total_interactions

                    self.collection.update_one(
                        {"userId": user_id},
                        {"$set": {"interactionPatterns.averageSessionLength": new_avg}}
                    )

            logger.debug(f"Updated interaction patterns for user {user_id}")
            return True

        except Exception as e:
            logger.error(f"Error updating interaction patterns: {e}")
            return False

    def delete_profile(self, user_id: str) -> bool:
        """
        Delete user profile (for privacy compliance).

        Args:
            user_id: User identifier

        Returns:
            bool: True if deletion was successful
        """
        try:
            result = self.collection.delete_one({"userId": user_id})

            if result.deleted_count > 0:
                logger.info(f"Deleted profile for user {user_id}")
                return True
            else:
                logger.warning(f"No profile found to delete for user {user_id}")
                return False

        except Exception as e:
            logger.error(f"Error deleting user profile: {e}")
            return False

    def _merge_profile_data(self, profile_doc: Dict, data: Dict):
        """
        Merge additional data into profile document.

        Args:
            profile_doc: Base profile document
            data: Additional data to merge
        """
        for key, value in data.items():
            if key in ["basicInfo", "preferences", "privacySettings"]:
                if isinstance(value, dict):
                    profile_doc[key].update(value)
                else:
                    profile_doc[key] = value
            elif key not in ["_id", "userId", "organizationId", "createdAt", "lastUpdated"]:
                profile_doc[key] = value
