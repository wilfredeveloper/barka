"""
Project Manager Agent Package

Comprehensive project management agent using Node.js MCP Server integration
for advanced project operations, task management, team coordination, and analytics.
"""

import os
import sys

# Add project root to sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from .agent import root_agent

__all__ = [
    'root_agent'
]
