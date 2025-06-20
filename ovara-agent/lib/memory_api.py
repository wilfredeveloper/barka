"""
Memory API Endpoints for ovara-agent - DISABLED

Memory tools have been removed and will be rebuilt fresh.
This file is kept for reference but all endpoints are disabled.
"""

import logging
from fastapi import APIRouter

# Memory tools removed - will be rebuilt fresh

logger = logging.getLogger(__name__)

# Create router
memory_router = APIRouter(prefix="/api/memory", tags=["memory"])

# All endpoints disabled - memory tools will be rebuilt fresh
@memory_router.get("/status")
async def memory_status():
    """Status endpoint for memory API."""
    return {
        "status": "disabled",
        "message": "Memory tools have been removed and will be rebuilt fresh"
    }
