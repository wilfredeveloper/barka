# Introduction: What are Callbacks and Why Use Them?

Callbacks are a cornerstone feature of ADK, providing a powerful mechanism to hook into an agent's execution process. They allow you to observe, customize, and even control the agent's behavior at specific, predefined points without modifying the core ADK framework code.

### What are they?

In essence, callbacks are standard functions that you define. You then associate these functions with an agent when you create it. The ADK framework automatically calls your functions at key stages, letting you observe or intervene. Think of it like checkpoints during the agent's process:

* **Before the agent starts its main work on a request, and after it finishes**:

  * The **Before Agent** callback executes right before this main work begins for that specific request.
  * The **After Agent** callback executes right after the agent has finished all its steps for that request and has prepared the final result, but just before the result is returned.

This "main work" encompasses the agent's entire process for handling that single request. This might involve deciding to call an LLM, actually calling the LLM, deciding to use a tool, using the tool, processing the results, and finally putting together the answer. These callbacks essentially wrap the whole sequence from receiving the input to producing the final output for that one interaction.

* **Before sending a request to, or after receiving a response from, the Large Language Model (LLM)**:

  * These callbacks (**Before Model**, **After Model**) allow you to inspect or modify the data going to and coming from the LLM specifically.

* **Before executing a tool (like a Python function or another agent) or after it finishes**:

  * Similarly, **Before Tool** and **After Tool** callbacks give you control points specifically around the execution of tools invoked by the agent.

![intro\_components.png](intro_components.png)

### Why use them?

Callbacks unlock significant flexibility and enable advanced agent capabilities:

* **Observe & Debug**: Log detailed information at critical steps for monitoring and troubleshooting.
* **Customize & Control**: Modify data flowing through the agent (like LLM requests or tool results) or even bypass certain steps entirely based on your logic.
* **Implement Guardrails**: Enforce safety rules, validate inputs/outputs, or prevent disallowed operations.
* **Manage State**: Read or dynamically update the agent's session state during execution.
* **Integrate & Enhance**: Trigger external actions (API calls, notifications) or add features like caching.

---

## The Callback Mechanism: Interception and Control

When the ADK framework encounters a point where a callback can run (e.g., just before calling the LLM), it checks if you provided a corresponding callback function for that agent. If you did, the framework executes your function.

### Context is Key

Your callback function isn't called in isolation. The framework provides special context objects (`CallbackContext` or `ToolContext`) as arguments. These objects contain vital information about the current state of the agent's execution, including the invocation details, session state, and potentially references to services like artifacts or memory.

### Controlling the Flow (The Core Mechanism)

The most powerful aspect of callbacks lies in how their return value influences the agent's subsequent actions. This is how you intercept and control the execution flow:

#### `return None` (Allow Default Behavior)

* This is the standard way to signal that your callback has finished its work (e.g., logging, inspection, minor modifications to mutable input arguments like `llm_request`) and that the ADK agent should proceed with its normal operation.
* For `before_*` callbacks (before\_agent, before\_model, before\_tool), returning `None` means the next step in the sequence will occur.
* For `after_*` callbacks (after\_agent, after\_model, after\_tool), returning `None` means the result just produced by the preceding step will be used as is.

#### `return <Specific Object>` (Override Default Behavior)

Returning a specific type of object (instead of None) is how you override the ADK agent's default behavior. The framework will use the object you return and skip or replace the normal result.

| Callback Type           | Return Type     | Description                                                                            |
| ----------------------- | --------------- | -------------------------------------------------------------------------------------- |
| `before_agent_callback` | `types.Content` | Skips agent's main execution logic. Useful for short-circuiting or access control.     |
| `before_model_callback` | `LlmResponse`   | Skips the call to the LLM. Useful for input guardrails, prompt validation, or caching. |
| `before_tool_callback`  | `dict` / `Map`  | Skips tool execution. Ideal for policy checks or mocking results.                      |
| `after_agent_callback`  | `types.Content` | Replaces the agent's output.                                                           |
| `after_model_callback`  | `LlmResponse`   | Replaces the LLM's response.                                                           |
| `after_tool_callback`   | `dict` / `Map`  | Replaces the tool's result.                                                            |

---

## Conceptual Code Example (Guardrail)

This example demonstrates the common pattern for a guardrail using `before_model_callback`.

```python
from google.adk.agents import LlmAgent
from google.adk.agents.callback_context import CallbackContext
from google.adk.models import LlmResponse, LlmRequest
from google.adk.runners import Runner
from typing import Optional
from google.genai import types
from google.adk.sessions import InMemorySessionService

GEMINI_2_FLASH = "gemini-2.0-flash"

# --- Define the Callback Function ---
def simple_before_model_modifier(
    callback_context: CallbackContext, llm_request: LlmRequest
) -> Optional[LlmResponse]:
    agent_name = callback_context.agent_name
    print(f"[Callback] Before model call for agent: {agent_name}")

    last_user_message = ""
    if llm_request.contents and llm_request.contents[-1].role == 'user':
        if llm_request.contents[-1].parts:
            last_user_message = llm_request.contents[-1].parts[0].text
    print(f"[Callback] Inspecting last user message: '{last_user_message}'")

    original_instruction = llm_request.config.system_instruction or types.Content(role="system", parts=[])
    prefix = "[Modified by Callback] "
    if not isinstance(original_instruction, types.Content):
        original_instruction = types.Content(role="system", parts=[types.Part(text=str(original_instruction))])
    if not original_instruction.parts:
        original_instruction.parts.append(types.Part(text=""))

    modified_text = prefix + (original_instruction.parts[0].text or "")
    original_instruction.parts[0].text = modified_text
    llm_request.config.system_instruction = original_instruction
    print(f"[Callback] Modified system instruction to: '{modified_text}'")

    if "BLOCK" in last_user_message.upper():
        print("[Callback] 'BLOCK' keyword found. Skipping LLM call.")
        return LlmResponse(
            content=types.Content(
                role="model",
                parts=[types.Part(text="LLM call was blocked by before_model_callback.")],
            )
        )
    else:
        print("[Callback] Proceeding with LLM call.")
        return None

# Create LlmAgent and Assign Callback
my_llm_agent = LlmAgent(
    name="ModelCallbackAgent",
    model=GEMINI_2_FLASH,
    instruction="You are a helpful assistant.",
    description="An LLM agent demonstrating before_model_callback",
    before_model_callback=simple_before_model_modifier
)

APP_NAME = "guardrail_app"
USER_ID = "user_1"
SESSION_ID = "session_001"

# Session and Runner
session_service = InMemorySessionService()
session = session_service.create_session(app_name=APP_NAME, user_id=USER_ID, session_id=SESSION_ID)
runner = Runner(agent=my_llm_agent, app_name=APP_NAME, session_service=session_service)

# Agent Interaction
def call_agent(query):
    content = types.Content(role='user', parts=[types.Part(text=query)])
    events = runner.run(user_id=USER_ID, session_id=SESSION_ID, new_message=content)
    for event in events:
        if event.is_final_response():
            final_response = event.content.parts[0].text
            print("Agent Response: ", final_response)

call_agent("callback example")
```

By understanding this mechanism of returning `None` versus returning specific objects, you can precisely control the agent's execution path, making callbacks an essential tool for building sophisticated and reliable agents with ADK.
