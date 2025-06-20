Agent Development Kit (ADK) Context Documentation
What is Context?
In the Agent Development Kit (ADK), "context" refers to the essential bundle of information available to your agent and its tools during specific operations. It acts as the necessary background knowledge and resources needed to handle a task or conversation turn effectively.
Agents often require more than just the latest user message to perform well. Context enables:

Maintaining State: Remembering details across multiple conversation steps (e.g., user preferences, previous calculations, shopping cart items) via session state.
Passing Data: Sharing information discovered or generated in one step (e.g., LLM call or tool execution) with subsequent steps using session state.
Accessing Services: Interacting with framework capabilities like:
Artifact Storage: Saving or loading files/data (e.g., PDFs, images, configuration files) associated with the session.
Memory: Searching past interactions or external knowledge sources connected to the user.
Authentication: Requesting and retrieving credentials for secure external API access.
Identity and Tracking: Knowing the current agent (agent.name) and uniquely identifying the request-response cycle (invocation_id) for logging and debugging.


Tool-Specific Actions: Enabling specialized operations within tools, such as requesting authentication or searching memory, requiring access to interaction details.

The InvocationContext is the central object holding this information for a single user-request-to-final-response cycle (an invocation). The ADK framework creates and passes it implicitly to your agent code, callbacks, and tools.
Conceptual Pseudocode: How the Framework Provides Context
# Internal Logic (Framework)
runner = Runner(agent=my_root_agent, session_service=..., artifact_service=...)
user_message = types.Content(...)
session = session_service.get_session(...) # Or create new

# Inside runner.run_async(...)
# 1. Framework creates the main context
invocation_context = InvocationContext(
    invocation_id="unique-id-for-this-run",
    session=session,
    user_content=user_message,
    agent=my_root_agent,
    session_service=session_service,
    artifact_service=artifact_service,
    memory_service=memory_service,
    # ... other fields ...
)

# 2. Framework calls agent's run method, passing context
await my_root_agent.run_async(invocation_context)

As a developer, you work with context objects provided in method arguments.
Types of Context
ADK provides specialized context objects tailored to specific situations, ensuring appropriate tools and permissions without exposing the full complexity of InvocationContext.
1. InvocationContext

Where Used: In agent's core implementation methods (_run_async_impl, _run_live_impl).
Purpose: Provides access to the entire state of the current invocation.
Key Contents:
Session (state and events)
Current agent instance
invocation_id
Initial user_content
Configured services (artifact_service, memory_service, session_service)
Fields for live/streaming modes


Use Case: Used when core logic needs session or service access, or to control the invocation (e.g., ctx.end_invocation = True).

Example:
from google.adk.agents import BaseAgent
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event
from typing import AsyncGenerator

class MyAgent(BaseAgent):
    async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
        agent_name = ctx.agent.name
        session_id = ctx.session.id
        print(f"Agent {agent_name} running in session {session_id} for invocation {ctx.invocation_id}")
        yield # ... event ...

2. ReadonlyContext

Where Used: In scenarios requiring read-only access (e.g., InstructionProvider functions). Base class for other contexts.
Purpose: Offers a safe, read-only view of fundamental details.
Key Contents: invocation_id, agent_name, read-only state.

Example:
from google.adk.agents import ReadonlyContext

def my_instruction_provider(context: ReadonlyContext) -> str:
    user_tier = context.state().get("user_tier", "standard")
    return f"Process the request for a {user_tier} user."

3. CallbackContext

Where Used: In agent/model lifecycle callbacks (before_agent_callback, after_agent_callback, before_model_callback, after_model_callback).
Purpose: Facilitates state inspection/modification, artifact interaction, and invocation details in callbacks.
Key Capabilities:
Mutable state property for read/write access.
Artifact methods: load_artifact, save_artifact.
Direct user_content access.



Example:
from google.adk.agents.callback_context import CallbackContext
from google.adk.models import LlmRequest
from google.genai import types
from typing import Optional

def my_before_model_cb(callback_context: CallbackContext, request: LlmRequest) -> Optional[types.Content]:
    call_count = callback_context.state.get("model_calls", 0)
    callback_context.state["model_calls"] = call_count + 1
    print(f"Preparing model call #{call_count + 1} for invocation {callback_context.invocation_id}")
    return None

4. ToolContext

Where Used: In functions backing FunctionTools and tool execution callbacks (before_tool_callback, after_tool_callback).
Purpose: Extends CallbackContext with tool-specific methods like authentication and memory search.
Key Capabilities:
Authentication: request_credential, get_auth_response.
Artifact listing: list_artifacts.
Memory search: search_memory.
function_call_id for linking authentication requests.
actions for signaling state changes or auth requests.



Example:
from google.adk.tools import ToolContext
from typing import Dict, Any

def search_external_api(query: str, tool_context: ToolContext) -> Dict[str, Any]:
    api_key = tool_context.state.get("api_key")
    if not api_key:
        auth_config = AuthConfig(...)
        tool_context.request_credential(auth_config)
        tool_context.actions.requested_auth_configs[tool_context.function_call_id] = auth_config
        return {"status": "Auth Required"}
    print(f"Tool executing for query '{query}' using API key. Invocation: {tool_context.invocation_id}")
    return {"result": f"Data for {query} fetched."}

Common Tasks Using Context
Accessing Information

Reading Session State:

from google.adk.tools import ToolContext

def my_tool(tool_context: ToolContext, **kwargs):
    user_pref = tool_context.state.get("user_display_preference", "default_mode")
    api_endpoint = tool_context.state.get("app:api_endpoint")
    print(f"Using API endpoint: {api_endpoint}")


Getting Identifiers:

from google.adk.tools import ToolContext

def log_tool_usage(tool_context: ToolContext, **kwargs):
    agent_name = tool_context.agent_name
    inv_id = tool_context.invocation_id
    func_call_id = getattr(tool_context, 'function_call_id', 'N/A')
    print(f"Log: Invocation={inv_id}, Agent={agent_name}, FunctionCallID={func_call_id}")


Accessing Initial User Input:

from google.adk.agents.callback_context import CallbackContext

def check_initial_intent(callback_context: CallbackContext, **kwargs):
    initial_text = callback_context.user_content.parts[0].text if callback_context.user_content and callback_context.user_content.parts else "Non-text input"
    print(f"This invocation started with user input: '{initial_text}'")

Managing Session State

Passing Data Between Tools:

from google.adk.tools import ToolContext
import uuid

def get_user_profile(tool_context: ToolContext) -> dict:
    user_id = str(uuid.uuid4())
    tool_context.state["temp:current_user_id"] = user_id
    return {"profile_status": "ID generated"}

def get_user_orders(tool_context: ToolContext) -> dict:
    user_id = tool_context.state.get("temp:current_user_id")
    if not user_id:
        return {"error": "User ID not found in state"}
    print(f"Fetching orders for user ID: {user_id}")
    return {"orders": ["order123", "order456"]}


Updating User Preferences:

from google.adk.tools import ToolContext

def set_user_preference(tool_context: ToolContext, preference: str, value: str) -> dict:
    state_key = f"user:{preference}"
    tool_context.state[state_key] = value
    print(f"Set user preference '{preference}' to '{value}'")
    return {"status": "Preference updated"}


Note: Use prefixes (app:, user:, temp:) with persistent SessionService for broader scope (app-wide, user-wide, or invocation-specific).

Working with Artifacts

Saving Document Reference:

from google.adk.agents import CallbackContext
from google.genai import types

def save_document_reference(context: CallbackContext, file_path: str) -> None:
    try:
        artifact_part = types.Part(text=file_path)
        version = context.save_artifact("document_to_summarize.txt", artifact_part)
        print(f"Saved document reference '{file_path}' as artifact version {version}")
        context.state["temp:doc_artifact_name"] = "document_to_summarize.txt"
    except ValueError as e:
        print(f"Error saving artifact: {e}")


Summarizing Document:

from google.adk.tools import ToolContext
from google.genai import types

def summarize_document_tool(tool_context: ToolContext) -> dict:
    artifact_name = tool_context.state.get("temp:doc_artifact_name")
    if not artifact_name:
        return {"error": "Document artifact name not found in state."}
    try:
        artifact_part = tool_context.load_artifact(artifact_name)
        if not artifact_part or not artifact_part.text:
            return {"error": f"Could not load artifact: {artifact_name}"}
        file_path = artifact_part.text
        # Simulate reading document content
        document_content = ""  # Replace with actual file reading logic
        if not document_content:
            return {"error": "Failed to read document content."}
        summary = f"Summary of content from {file_path}"
        return {"summary": summary}
    except ValueError as e:
        return {"error": f"Artifact service error: {e}"}


Listing Artifacts:

from google.adk.tools import ToolContext

def check_available_docs(tool_context: ToolContext) -> dict:
    try:
        artifact_keys = tool_context.list_artifacts()
        print(f"Available artifacts: {artifact_keys}")
        return {"available_docs": artifact_keys}
    except ValueError as e:
        return {"error": f"Artifact service error: {e}"}

Handling Tool Authentication
from google.adk.tools import ToolContext
from google.adk.auth import AuthConfig

MY_API_AUTH_CONFIG = AuthConfig(...)
AUTH_STATE_KEY = "user:my_api_credential"

def call_secure_api(tool_context: ToolContext, request_data: str) -> dict:
    credential = tool_context.state.get(AUTH_STATE_KEY)
    if not credential:
        try:
            tool_context.request_credential(MY_API_AUTH_CONFIG)
            return {"status": "Authentication required. Please provide credentials."}
        except ValueError as e:
            return {"error": f"Auth error: {e}"}
    try:
        auth_credential_obj = tool_context.get_auth_response(MY_API_AUTH_CONFIG)
        api_key = auth_credential_obj.api_key
        tool_context.state[AUTH_STATE_KEY] = auth_credential_obj.model_dump()
        print(f"Using retrieved credential to call API with data: {request_data}")
        api_result = f"API result for {request_data}"
        return {"result": api_result}
    except Exception as e:
        return {"error": f"Failed to use credential: {e}"}

Leveraging Memory
from google.adk.tools import ToolContext

def find_related_info(tool_context: ToolContext, topic: str) -> dict:
    try:
        search_results = tool_context.search_memory(f"Information about {topic}")
        if search_results.results:
            print(f"Found {len(search_results.results)} memory results for '{topic}'")
            top_result_text = search_results.results[0].text
            return {"memory_snippet": top_result_text}
        return {"message": "No relevant memories found."}
    except ValueError as e:
        return {"error": f"Memory service error: {e}"}

Advanced: Direct InvocationContext Usage
from google.adk.agents import BaseAgent
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event
from typing import AsyncGenerator

class MyControllingAgent(BaseAgent):
    async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
        if not ctx.memory_service:
            print("Memory service is not available for this invocation.")
        if ctx.session.state.get("critical_error_flag"):
            print("Critical error detected, ending invocation.")
            ctx.end_invocation = True
            yield Event(author=self.name, invocation_id=ctx.invocation_id, content="Stopping due to critical error.")
            return
        yield # ... event ...

Key Takeaways & Best Practices

Use the Right Context: Choose ToolContext, CallbackContext, or ReadonlyContext based on the task. Use InvocationContext only in core agent methods when necessary.
State for Data Flow: Use context.state to share data, remember preferences, and manage conversational memory. Use prefixes (app:, user:, temp:) thoughtfully.
Artifacts for Files: Use save_artifact and load_artifact for file references or large data blobs, storing references and loading content on demand.
Tracked Changes: State and artifact modifications are automatically tracked via EventActions and persisted by SessionService.
Start Simple: Begin with state and artifact usage, then explore authentication, memory, and advanced InvocationContext features as needed.

By leveraging these context objects, you can build sophisticated, stateful, and capable agents with ADK.
