import asyncio
import base64
import json
import os
import sys
from pathlib import Path
from typing import AsyncIterable, Dict, Any, List, Optional
from datetime import datetime
import logging

# Add the project root to sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from google.adk.runners import Runner
from lib.database_session_service import DatabaseSessionService
from lib.db import get_database
from google.genai import types

# Import Gaia - the main orchestrator agent
from app.orchestrator.agent import root_agent
# Import the new MCP-based project manager agent
from app.project_manager.agent import root_agent as mcp_project_manager_agent
from lib.utils import call_agent_async
# Memory API removed - will be rebuilt fresh
# from lib.memory_api import memory_router

# Import and setup clean logging
import sys
sys.path.append('..')
from logging_config import setup_clean_logging, setup_debug_logging

load_dotenv()

# Setup logging based on environment variable
if os.getenv('DEBUG_LOGGING', 'false').lower() == 'true':
    setup_debug_logging()
    print("🐛 Debug logging enabled - all logs will be shown")
else:
    setup_clean_logging()
    print("✨ Clean logging enabled - System Instruction sections filtered")

logger = logging.getLogger(__name__)

# Setup MongoDB database session service
try:
    db = get_database()
    session_service = DatabaseSessionService(db)
    logger.info("✅ MongoDB session service initialized successfully")
except Exception as e:
    logger.error(f"❌ Failed to initialize MongoDB session service: {e}")
    raise

# Create FastAPI app
app = FastAPI(title="Ovara Agent API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Memory API router removed - will be rebuilt fresh
# app.include_router(memory_router)

# Pydantic models for request/response
class SessionCreateRequest(BaseModel):
    client_id: Optional[str] = None
    organization_id: Optional[str] = None
    conversation_id: Optional[str] = None
    current_agent: str = "Gaia"
    onboarding: Optional[Dict[str, Any]] = None
    scheduling: Optional[Dict[str, Any]] = None
    user_preferences: Optional[Dict[str, Any]] = None
    user_name: Optional[str] = None  # Add user name to avoid DB fetch

class AgentRunRequest(BaseModel):
    app_name: str
    user_id: str
    session_id: str
    new_message: Dict[str, Any]
    streaming: bool = False

class SessionResponse(BaseModel):
    id: str
    app_name: str
    user_id: str
    state: Dict[str, Any]
    events: List[Dict[str, Any]]
    last_update_time: float


def get_role_permissions(user_role: str) -> Dict[str, bool]:
    """Get permissions based on user role"""
    role_permissions = {
        "org_admin": {
            "can_create_projects": True,
            "can_delete_projects": True,
            "can_manage_team": True,
            "can_view_analytics": True,
            "can_edit_organization": True
        },
        "org_member": {
            "can_create_projects": True,
            "can_delete_projects": False,
            "can_manage_team": False,
            "can_view_analytics": True,
            "can_edit_organization": False
        },
        "org_client": {
            "can_create_projects": False,
            "can_delete_projects": False,
            "can_manage_team": False,
            "can_view_analytics": False,
            "can_edit_organization": False
        }
    }
    return role_permissions.get(user_role, role_permissions["org_client"])


# Define initial state template for new sessions
def create_initial_state(
    client_id: Optional[str] = None,
    organization_id: Optional[str] = None,
    conversation_id: Optional[str] = None,
    user_name: Optional[str] = None,
    user_id: Optional[str] = None,
    user_role: Optional[str] = None,
    user_email: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Create initial state for a new session with custom parameters."""

    # Determine user permissions based on role
    user_role = user_role or "org_client"
    permissions = get_role_permissions(user_role)

    return {
        # Core identifiers (REQUIRED for MCP tools)
        "client_id": client_id,
        "organization_id": organization_id,
        "conversation_id": conversation_id,
        "user_id": user_id or "default_user",

        # User context for personalization and permissions
        "user_name": user_name or "there",  # Fallback to generic greeting
        "user_full_name": user_name,  # Keep full name for formal contexts
        "user_role": user_role,
        "user_email": user_email,

        # Project management context
        "project_management": {
            "active_project_id": None,
            "default_project_status": "planning",
            "default_task_status": "todo",
            "default_priority": "medium",
            "user_permissions": permissions,
            "preferences": {
                "default_view": "list",
                "items_per_page": 10,
                "show_completed_tasks": False,
                "notification_preferences": {
                    "task_assignments": True,
                    "project_updates": True,
                    "deadline_reminders": True
                }
            }
        },

        # Agent tracking
        "current_agent": kwargs.get("current_agent", "Gaia"),
        "agent_history": [],

        # Barka (onboarding) specific state
        "onboarding": kwargs.get("onboarding", {
            "status": "not_started",
            "phase": None,
            "project_type": None,
            "todos": [],
            "requirements": {},
            "client_info": {}
        }),

        # Jarvis (scheduling) specific state
        "scheduling": kwargs.get("scheduling", {
            "meetings": [],
            "availability": {},
            "preferences": {},
            "pending_actions": []
        }),

        # Shared state for all agents
        "user_preferences": kwargs.get("user_preferences", {}),
        "session_metadata": {
            "created_at": datetime.now().isoformat(),
            "last_active": datetime.now().isoformat(),
            "frontend_conversation_id": conversation_id
        }
    }

# FastAPI endpoints

@app.get("/list-apps")
async def list_apps():
    """List available apps."""
    return ["orchestrator"]  # Keep "orchestrator" for frontend compatibility

@app.post("/apps/{app_name}/users/{user_id}/sessions/{session_id}")
async def create_session_with_id(
    app_name: str,
    user_id: str,
    session_id: str,
    state: Optional[Dict[str, Any]] = None
):
    """Create a new session with a specific ID and optional initial state."""
    try:
        logger.info(f"\n\n=========Creating session {session_id} for user {user_id} in app {app_name}=========")
        if state:
            logger.info(f"Received initial state: {state}")

        # Check if session already exists
        try:
            existing_session = await session_service.get_session(
                app_name=app_name,
                user_id=user_id,
                session_id=session_id
            )
            if existing_session:
                logger.info(f"Session {session_id} already exists, returning existing session")
                logger.info(f"Existing session state: {existing_session.state}")
                return SessionResponse(
                    id=existing_session.id,
                    app_name=existing_session.app_name,
                    user_id=existing_session.user_id,
                    state=existing_session.state,
                    events=[event.__dict__ for event in existing_session.events],
                    last_update_time=existing_session.last_update_time
                )
        except Exception:
            # Session doesn't exist, continue with creation
            pass

        # Create initial state from provided state or defaults
        if state:
            logger.info(f"\n\n=========Creating session with provided initial state=========")
            initial_state = create_initial_state(**state)
        else:
            logger.info(f"\n\n=========Creating session with default initial state=========")
            initial_state = create_initial_state()

        logger.info(f"\n\n=========Creating new session=========")
        logger.info(f"Initial session state: {initial_state}")
        logger.info("=========================================")

        # Create new session
        new_session = await session_service.create_session(
            app_name=app_name,
            user_id=user_id,
            session_id=session_id,
            state=initial_state
        )

        logger.info(f"Successfully created session {session_id}")

        return SessionResponse(
            id=new_session.id,
            app_name=new_session.app_name,
            user_id=new_session.user_id,
            state=new_session.state,
            events=[event.__dict__ for event in new_session.events],
            last_update_time=new_session.last_update_time
        )

    except Exception as e:
        logger.error(f"Error creating session: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")

@app.get("/apps/{app_name}/users/{user_id}/sessions/{session_id}")
async def get_session(app_name: str, user_id: str, session_id: str):
    """Get session data."""
    try:
        logger.info(f"Getting session {session_id} for user {user_id} in app {app_name}")

        session = await session_service.get_session(
            app_name=app_name,
            user_id=user_id,
            session_id=session_id
        )

        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        logger.info("\n\n=========Found session successfully=========")
        logger.info(f"Session state: {session.state}")
        logger.info("=========================================")
        return SessionResponse(
            id=session.id,
            app_name=session.app_name,
            user_id=session.user_id,
            state=session.state,
            events=[event.__dict__ for event in session.events],
            last_update_time=session.last_update_time
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting session: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get session: {str(e)}")

@app.get("/apps/{app_name}/users/{user_id}/sessions")
async def list_sessions(app_name: str, user_id: str):
    """List sessions for a user."""
    try:
        sessions_list = await session_service.list_sessions(
            app_name=app_name,
            user_id=user_id
        )

        return [
            SessionResponse(
                id=session.id,
                app_name=session.app_name,
                user_id=session.user_id,
                state=session.state,
                events=[event.__dict__ for event in session.events],
                last_update_time=session.last_update_time
            )
            for session in sessions_list.sessions
        ]

    except Exception as e:
        logger.error(f"Error listing sessions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list sessions: {str(e)}")

@app.get("/apps/{app_name}/users/{user_id}/sessions/by-conversation/{conversation_id}")
async def get_session_by_conversation_id(app_name: str, user_id: str, conversation_id: str):
    """Get session data by conversation ID instead of session ID."""
    try:
        logger.info(f"Getting session by conversation_id {conversation_id} for user {user_id} in app {app_name}")

        # Find session by conversation_id
        session = await session_service.get_session_by_conversation_id(
            app_name=app_name,
            user_id=user_id,
            conversation_id=conversation_id
        )

        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        logger.info("\n\n=========Found session by conversation_id successfully=========")
        logger.info(f"Session ID: {session.id}")
        logger.info(f"Conversation ID: {conversation_id}")
        logger.info(f"Events count: {len(session.events)}")
        logger.info("=========================================")

        return SessionResponse(
            id=session.id,
            app_name=session.app_name,
            user_id=session.user_id,
            state=session.state,
            events=[event.__dict__ for event in session.events],
            last_update_time=session.last_update_time
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting session by conversation_id: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get session: {str(e)}")

@app.post("/run")
async def agent_run(request: AgentRunRequest):
    """Run agent with a message and return events."""
    try:
        logger.info(f"Running agent for session {request.session_id}")

        # Create runner
        runner = Runner(
            app_name=request.app_name,
            agent=root_agent,
            session_service=session_service,
        )

        # Convert new_message to Content
        if isinstance(request.new_message, dict):
            if "parts" in request.new_message:
                # Handle Content-like structure
                parts = []
                for part_data in request.new_message["parts"]:
                    if "text" in part_data:
                        parts.append(types.Part(text=part_data["text"]))
                content = types.Content(
                    role=request.new_message.get("role", "user"),
                    parts=parts
                )
            elif "text" in request.new_message:
                # Handle simple text message
                content = types.Content(
                    role="user",
                    parts=[types.Part(text=request.new_message["text"])]
                )
            else:
                raise ValueError("Invalid message format")
        else:
            # Assume it's a string
            content = types.Content(
                role="user",
                parts=[types.Part(text=str(request.new_message))]
            )

        # Let ADK Runner handle session management and event persistence
        # The runner will automatically:
        # 1. Retrieve the session using our session_service
        # 2. Process the agent interactions
        # 3. Call append_event for each event (this will trigger our logging)
        # 4. Return events after they're saved to the session

        events = []
        async for event in runner.run_async(
            user_id=request.user_id,
            session_id=request.session_id,
            new_message=content
        ):
            # Convert event to dict for JSON serialization
            # Note: At this point, the event should already be saved to the session
            event_dict = {
                "id": event.id,
                "author": event.author,
                "timestamp": event.timestamp,
                "turn_complete": getattr(event, 'turn_complete', False),
                "partial": getattr(event, 'partial', False),
                "interrupted": getattr(event, 'interrupted', False),
                "error_code": getattr(event, 'error_code', None),
                "error_message": getattr(event, 'error_message', None),
                "invocation_id": getattr(event, 'invocation_id', ''),
                "actions": getattr(event, 'actions', {}).__dict__ if hasattr(getattr(event, 'actions', {}), '__dict__') else getattr(event, 'actions', {}),
                "content": None
            }

            # Handle content
            if event.content and event.content.parts:
                parts = []
                for part in event.content.parts:
                    part_dict = {}
                    if hasattr(part, 'text') and part.text:
                        part_dict['text'] = part.text
                    if hasattr(part, 'function_call') and part.function_call:
                        part_dict['function_call'] = {
                            'name': part.function_call.name,
                            'args': part.function_call.args,
                            'id': part.function_call.id
                        }
                    if hasattr(part, 'function_response') and part.function_response:
                        part_dict['function_response'] = {
                            'name': part.function_response.name,
                            'response': part.function_response.response,
                            'id': part.function_response.id
                        }
                    parts.append(part_dict)

                event_dict["content"] = {
                    "role": event.content.role,
                    "parts": parts
                }

            events.append(event_dict)

        logger.info(f"Agent run completed with {len(events)} events (events should now be persisted in session)")
        return events

    except Exception as e:
        logger.error(f"Error running agent: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to run agent: {str(e)}")

@app.post("/run_sse")
async def agent_run_sse(request: AgentRunRequest):
    """Run agent with streaming response."""
    try:
        logger.info(f"Running agent with SSE for session {request.session_id}")

        # Create runner
        runner = Runner(
            app_name=request.app_name,
            agent=root_agent,
            session_service=session_service,
        )

        # Convert new_message to Content (same logic as above)
        if isinstance(request.new_message, dict):
            if "parts" in request.new_message:
                parts = []
                for part_data in request.new_message["parts"]:
                    if "text" in part_data:
                        parts.append(types.Part(text=part_data["text"]))
                content = types.Content(
                    role=request.new_message.get("role", "user"),
                    parts=parts
                )
            elif "text" in request.new_message:
                content = types.Content(
                    role="user",
                    parts=[types.Part(text=request.new_message["text"])]
                )
            else:
                raise ValueError("Invalid message format")
        else:
            content = types.Content(
                role="user",
                parts=[types.Part(text=str(request.new_message))]
            )

        async def event_generator():
            """Generate SSE events."""
            try:
                async for event in runner.run_async(
                    user_id=request.user_id,
                    session_id=request.session_id,
                    new_message=content
                ):
                    # Convert event to dict (same logic as above)
                    event_dict = {
                        "id": event.id,
                        "author": event.author,
                        "timestamp": event.timestamp,
                        "turn_complete": getattr(event, 'turn_complete', False),
                        "partial": getattr(event, 'partial', False),
                        "interrupted": getattr(event, 'interrupted', False),
                        "error_code": getattr(event, 'error_code', None),
                        "error_message": getattr(event, 'error_message', None),
                        "invocation_id": getattr(event, 'invocation_id', ''),
                        "actions": getattr(event, 'actions', {}).__dict__ if hasattr(getattr(event, 'actions', {}), '__dict__') else getattr(event, 'actions', {}),
                        "content": None
                    }

                    # Handle content (same logic as above)
                    if event.content and event.content.parts:
                        parts = []
                        for part in event.content.parts:
                            part_dict = {}
                            if hasattr(part, 'text') and part.text:
                                part_dict['text'] = part.text
                            if hasattr(part, 'function_call') and part.function_call:
                                part_dict['function_call'] = {
                                    'name': part.function_call.name,
                                    'args': part.function_call.args,
                                    'id': part.function_call.id
                                }
                            if hasattr(part, 'function_response') and part.function_response:
                                part_dict['function_response'] = {
                                    'name': part.function_response.name,
                                    'response': part.function_response.response,
                                    'id': part.function_response.id
                                }
                            parts.append(part_dict)

                        event_dict["content"] = {
                            "role": event.content.role,
                            "parts": parts
                        }

                    # Yield SSE formatted data
                    yield f"data: {json.dumps(event_dict)}\n\n"

            except Exception as e:
                logger.error(f"Error in SSE stream: {e}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )

    except Exception as e:
        logger.error(f"Error setting up SSE stream: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to setup SSE stream: {str(e)}")

# Legacy CLI function for backward compatibility
async def main_async():
    """Legacy CLI interface for backward compatibility."""
    APP_NAME = "orchestrator"
    USER_ID = "ovara_user"

    # Check for existing sessions for this user
    existing_sessions = await session_service.list_sessions(
        app_name=APP_NAME,
        user_id=USER_ID,
    )

    # If there's an existing session, use it, otherwise create a new one
    if existing_sessions and len(existing_sessions.sessions) > 0:
        # Use the most recent session
        SESSION_ID = existing_sessions.sessions[0].id
        print(f"Continuing existing session: {SESSION_ID}")
    else:
        # Create a new session with initial state
        import uuid
        SESSION_ID = str(uuid.uuid4())
        initial_state = create_initial_state()
        new_session = await session_service.create_session(
            app_name=APP_NAME,
            user_id=USER_ID,
            session_id=SESSION_ID,
            state=initial_state,
        )
        print(f"Created new session: {SESSION_ID}")

    # Create a runner with Gaia (the main orchestrator agent)
    runner = Runner(
        app_name=APP_NAME,
        agent=root_agent,
        session_service=session_service,
    )

    # Interactive conversation loop
    print("\nWelcome to Ovara Agent!")
    print("Your conversation will be remembered across interactions.")
    print("Type 'exit' or 'quit' to end the conversation.\n")

    while True:
        # Get user input
        user_input = input("You: ")

        # Check if user wants to exit
        if user_input.lower() in ["exit", "quit"]:
            print("Ending conversation. Your data has been saved to the database.")
            break

        # Process the user query through the agent
        await call_agent_async(runner, USER_ID, SESSION_ID, user_input)

if __name__ == "__main__":
    import uvicorn
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "cli":
        # Run CLI mode
        asyncio.run(main_async())
    else:
        # Run FastAPI server with reload
        uvicorn.run("main:app", host="0.0.0.0", port=5566, reload=True)
