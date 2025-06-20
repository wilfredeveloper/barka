from bson import ObjectId
import datetime
from typing import Any
from google.genai import types


# ANSI color codes for terminal output
class Colors:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    UNDERLINE = "\033[4m"

    # Foreground colors
    BLACK = "\033[30m"
    RED = "\033[31m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    BLUE = "\033[34m"
    MAGENTA = "\033[35m"
    CYAN = "\033[36m"
    WHITE = "\033[37m"

    # Background colors
    BG_BLACK = "\033[40m"
    BG_RED = "\033[41m"
    BG_GREEN = "\033[42m"
    BG_YELLOW = "\033[43m"
    BG_BLUE = "\033[44m"
    BG_MAGENTA = "\033[45m"
    BG_CYAN = "\033[46m"
    BG_WHITE = "\033[47m"


def display_state(
    session_service, app_name, user_id, session_id, label="Current State"
):
    """Display the current session state in a formatted way."""
    try:
        session = session_service.get_session(
            app_name=app_name, user_id=user_id, session_id=session_id
        )

        # Format the output with clear sections
        print(f"\n{'-' * 10} {label} {'-' * 10}")

        # Client identifiers
        client_id = session.state.get("client_id", "Not set")
        org_id = session.state.get("organization_id", "Not set")
        conv_id = session.state.get("conversation_id", "Not set")
        print(f"🆔 Client ID: {client_id}")
        print(f"🏢 Organization ID: {org_id}")
        print(f"💬 Conversation ID: {conv_id}")
        
        # Agent tracking
        current_agent = session.state.get("current_agent", "orchestrator_agent")
        agent_history = session.state.get("agent_history", [])
        print(f"🤖 Current Agent: {current_agent}")
        if agent_history:
            print(f"📜 Agent History: {' → '.join(agent_history)}")
        
        # Onboarding state
        onboarding = session.state.get("onboarding", {})
        print(f"📋 Onboarding Status: {onboarding.get('status', 'not_started')}")
        if onboarding.get("phase"):
            print(f"🔄 Current Phase: {onboarding.get('phase')}")
        if onboarding.get("project_type"):
            print(f"📊 Project Type: {onboarding.get('project_type')}")
        
        # Show todos if any exist
        todos = onboarding.get("todos", [])
        if todos:
            print("📝 Todos:")
            for idx, todo in enumerate(todos, 1):
                status = "✅" if todo.get("completed") else "⏳"
                print(f"  {idx}. {status} {todo.get('title')}")
        
        # Scheduling state
        scheduling = session.state.get("scheduling", {})
        meetings = scheduling.get("meetings", [])
        if meetings:
            print("📅 Meetings:")
            for idx, meeting in enumerate(meetings, 1):
                print(f"  {idx}. {meeting.get('title')} - {meeting.get('date')}")
        
        # Session metadata
        metadata = session.state.get("session_metadata", {})
        if metadata:
            print(f"⏱️ Created: {metadata.get('created_at', 'Unknown')}")
            print(f"⏱️ Last Active: {metadata.get('last_active', 'Unknown')}")

        print("-" * (22 + len(label)))
    except Exception as e:
        print(f"Error displaying state: {e}")


async def process_agent_response(event):
    """Process and display agent response events."""
    # Log basic event info
    print(f"Event ID: {event.id}, Author: {event.author}")

    # Check for specific parts first
    has_specific_part = False
    if event.content and event.content.parts:
        for part in event.content.parts:
            if hasattr(part, "executable_code") and part.executable_code:
                # Access the actual code string via .code
                print(
                    f"  Debug: Agent generated code:\n```python\n{part.executable_code.code}\n```"
                )
                has_specific_part = True
            elif hasattr(part, "code_execution_result") and part.code_execution_result:
                # Access outcome and output correctly
                print(
                    f"  Debug: Code Execution Result: {part.code_execution_result.outcome} - Output:\n{part.code_execution_result.output}"
                )
                has_specific_part = True
            elif hasattr(part, "tool_response") and part.tool_response:
                # Print tool response information
                print(f"  Tool Response: {part.tool_response.output}")
                has_specific_part = True
            # Also print any text parts found in any event for debugging
            elif hasattr(part, "text") and part.text and not part.text.isspace():
                print(f"  Text: '{part.text.strip()}'")

    # Check for final response after specific parts
    final_response = None
    if event.is_final_response():
        if (
            event.content
            and event.content.parts
            and hasattr(event.content.parts[0], "text")
            and event.content.parts[0].text
        ):
            final_response = event.content.parts[0].text.strip()
            # Use colors and formatting to make the final response stand out
            print(
                f"\n{Colors.BG_BLUE}{Colors.WHITE}{Colors.BOLD}╔══ AGENT RESPONSE ═════════════════════════════════════════{Colors.RESET}"
            )
            print(f"{Colors.CYAN}{Colors.BOLD}{final_response}{Colors.RESET}")
            print(
                f"{Colors.BG_BLUE}{Colors.WHITE}{Colors.BOLD}╚═════════════════════════════════════════════════════════════{Colors.RESET}\n"
            )
        else:
            print(
                f"\n{Colors.BG_RED}{Colors.WHITE}{Colors.BOLD}==> Final Agent Response: [No text content in final event]{Colors.RESET}\n"
            )

    return final_response


async def call_agent_async(runner, user_id, session_id, query):
    """Call the agent asynchronously with the user's query."""
    content = types.Content(role="user", parts=[types.Part(text=query)])
    print(
        f"\n{Colors.BG_GREEN}{Colors.BLACK}{Colors.BOLD}--- Running Query: {query} ---{Colors.RESET}"
    )
    final_response_text = None

    # Display state before processing
    display_state(
        runner.session_service,
        runner.app_name,
        user_id,
        session_id,
        "State BEFORE processing",
    )

    try:
        async for event in runner.run_async(
            user_id=user_id, session_id=session_id, new_message=content
        ):
            # Process each event and get the final response if available
            response = await process_agent_response(event)
            if response:
                final_response_text = response
    except Exception as e:
        print(f"Error during agent call: {e}")

    # Display state after processing the message
    display_state(
        runner.session_service,
        runner.app_name,
        user_id,
        session_id,
        "State AFTER processing",
    )

    return final_response_text


def _validate_object_id(id_str: str) -> bool:
    """
    Validate if a string is a valid MongoDB ObjectId.

    Args:
        id_str: String to validate

    Returns:
        bool: True if valid, False otherwise
    """
    try:
        ObjectId(id_str)
        return True
    except:
        return False

def _convert_objectid_to_str(obj: Any) -> Any:
    """
    Recursively convert all ObjectId and datetime instances to strings in a nested structure.

    Args:
        obj: Any Python object that might contain ObjectId or datetime instances

    Returns:
        The same object with all ObjectId and datetime instances converted to strings
    """
    if isinstance(obj, ObjectId):
        return str(obj)
    elif isinstance(obj, datetime.datetime):
        return obj.isoformat()
    elif isinstance(obj, list):
        return [_convert_objectid_to_str(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: _convert_objectid_to_str(value) for key, value in obj.items()}
    else:
        return obj
