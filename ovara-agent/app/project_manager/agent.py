import os
import sys
import logging
from pathlib import Path
from dotenv import load_dotenv

# Add project root to sys.path BEFORE importing utils
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
# Force project root to be first in sys.path to ensure proper imports
if project_root in sys.path:
    sys.path.remove(project_root)
sys.path.insert(0, project_root)

from google.adk.agents import Agent
# Import session-aware MCPToolset with configurable timeout and session state injection
from google.adk.tools.mcp_tool.mcp_toolset import StdioServerParameters
from utils.custom_adk_patches import SessionAwareMCPToolset as MCPToolset
from .prompt import project_manager_system_prompt

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Memory tools removed - will be rebuilt fresh

# Calculate absolute path to the Python MCP server
# The Python MCP server is located at ovara-agent/mcp_server.py
mcp_server_path = str(Path(__file__).parent.parent.parent / "mcp_server.py")

logger.info(f"Project Manager Agent initializing with Python MCP server path: {mcp_server_path}")

# Verify Python MCP server exists
if not os.path.exists(mcp_server_path):
    logger.error(f"Python MCP server not found at: {mcp_server_path}")
    raise FileNotFoundError(f"Python MCP server not found at: {mcp_server_path}")

# Create the Project Manager Agent with Python MCP integration
root_agent = Agent(
    name="project_manager_agent",
    model="gemini-2.0-flash-exp",
    description="Comprehensive project management agent with advanced capabilities for project operations, task management, team coordination, analytics, and AI-powered resource optimization through Python MCP Server integration.",
    instruction=project_manager_system_prompt,
    tools=[
        # Python MCP Toolset for Project Management Server
        MCPToolset(
            connection_params=StdioServerParameters(
                command="python3",
                args=[mcp_server_path],
                # Environment variables for the MCP server
                env={
                    "MONGODB_URI": os.getenv("MONGODB_URI", "mongodb://localhost:27017/orka_pro"),
                    "DEBUG": "false"
                }
            )
        ),
        # Memory tools removed - will be rebuilt fresh
    ],
)

logger.info("Project Manager Agent initialized successfully with Python MCP integration")
