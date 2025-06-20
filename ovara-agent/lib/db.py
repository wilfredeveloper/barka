"""
MongoDB Database Connection Module for Barka Agent

This module provides functions to connect to MongoDB and interact with the database.
"""

import os
import sys
import logging
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Get MongoDB URI from environment variables
MONGODB_URI = os.getenv("MONGODB_URI")

# Global client variable
_client = None

def get_client():
    """
    Get or create a MongoDB client instance.

    Returns:
        MongoClient: MongoDB client instance
    """
    global _client

    if _client is None:
        if not MONGODB_URI:
            raise ValueError("MONGODB_URI environment variable is not set")

        try:
            logger.info("Connecting to MongoDB...")
            _client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
            # Verify connection is successful
            _client.admin.command('ping')
            logger.info("Successfully connected to MongoDB")
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise

    return _client

def get_database(db_name="orka_pro"):
    """
    Get a database instance.

    Args:
        db_name (str): Name of the database to connect to

    Returns:
        Database: MongoDB database instance
    """
    client = get_client()
    return client[db_name]

def get_collection(collection_name, db_name="orka_pro"):
    """
    Get a collection instance.

    Args:
        collection_name (str): Name of the collection
        db_name (str): Name of the database

    Returns:
        Collection: MongoDB collection instance
    """
    db = get_database(db_name)
    return db[collection_name]

def close_connection():
    """
    Close the MongoDB connection.
    """
    global _client

    if _client:
        logger.info("Closing MongoDB connection")
        _client.close()
        _client = None
