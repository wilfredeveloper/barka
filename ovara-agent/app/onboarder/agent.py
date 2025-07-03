import os
import sys
from google.adk.agents import Agent
from google.adk.tools import FunctionTool
from google.adk.tools.tool_context import ToolContext
from typing import Optional
import logging
from .prompt import barka_system_prompt
from .tools import TodosTool, ClientInfoTool

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# # Add project root to sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Import database connection
from lib.db import get_database


# Initialize database connection
db = get_database()

# Initialize tools
client_info_tool = ClientInfoTool(db)

todos_tools = TodosTool(db)

# Import ADK-style tools for persistent memory
from .tools.client_info_tool import get_client_info_persistent
from .tools.todos_tool import get_next_actionable_todo_persistent, update_todo_status_persistent

# Session-aware wrapper functions for legacy tools
def get_todos_summary_with_session_state(tool_context: ToolContext, client_id: Optional[str] = None) -> dict:
    """Get todos summary with automatic session state access."""
    # Auto-resolve client_id from session state if not provided
    if not client_id:
        client_id = tool_context.state.get("client_id")
        if client_id:
            logger.info(f"get_todos_summary using client_id from session state: '{client_id}'")
        else:
            logger.info("get_todos_summary - no client_id in session state")

    if not client_id:
        return {
            "status": "error",
            "error": "Client ID is required to get todos summary. Please provide your client ID."
        }

    # Store client_id back to session state for future use
    tool_context.state["client_id"] = client_id

    return todos_tools.get_todos_summary(client_id)

def list_todos_with_session_state(tool_context: ToolContext, client_id: Optional[str] = None, status_filter: Optional[str] = None) -> dict:
    """List todos with automatic session state access."""
    # Auto-resolve client_id from session state if not provided
    if not client_id:
        client_id = tool_context.state.get("client_id")
        if client_id:
            logger.info(f"list_todos using client_id from session state: '{client_id}'")
        else:
            logger.info("list_todos - no client_id in session state")

    if not client_id:
        return {
            "status": "error",
            "error": "Client ID is required to list todos. Please provide your client ID."
        }

    # Store client_id back to session state for future use
    tool_context.state["client_id"] = client_id

    return todos_tools.list_todos(client_id, status_filter)

# Legacy tools (keeping for backward compatibility) - now with session state support
get_next_actionable_todo_tool = FunctionTool(func=todos_tools.get_next_actionable_todo)
update_todo_status_tool = FunctionTool(func=todos_tools.update_todo_status)
get_todo_details_tool = FunctionTool(func=todos_tools.get_todo_details)
get_todos_summary_tool = FunctionTool(func=get_todos_summary_with_session_state)
list_todos_tool = FunctionTool(func=list_todos_with_session_state)
add_note_to_todo_tool = FunctionTool(func=todos_tools.add_note_to_todo)


clients_collection = db["clients"]
organizations_collection = db["organizations"]


root_agent = Agent(
    name="barka",
    model="gemini-2.5-pro",
    description="Handles client onboarding, project information management, and requirement gathering for design and software agencies.",
    instruction=barka_system_prompt,
    tools=[
        # ADK-style tools with persistent memory
        get_client_info_persistent,
        get_next_actionable_todo_persistent,
        update_todo_status_persistent,
        # Legacy tools for additional functionality
        get_todo_details_tool,
        get_todos_summary_tool,
        list_todos_tool,
        add_note_to_todo_tool
    ],
)
