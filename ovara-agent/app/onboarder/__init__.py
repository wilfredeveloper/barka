"""
Barka Agent Package
"""

import os
import sys

# Add project root to sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from .agent import root_agent
from lib.db import get_database, get_client, get_collection, close_connection
from app.onboarder.tools import TodosTool

__all__ = [
    'root_agent',
    'get_database',
    'get_client',
    'get_collection',
    'close_connection',
    'TodosTool'
]
