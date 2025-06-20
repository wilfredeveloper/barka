# Orchestrator Agent Package
"""
The Orchestrator Agent is the main coordinator for the multi-agent system.
It handles request routing, agent handoffs, and workflow coordination.
"""

from .agent import root_agent

__all__ = ["root_agent"]
