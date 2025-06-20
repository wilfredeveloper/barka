## 🔁 Agent Lifecycle Callbacks

**Applicable to all agents inheriting from `BaseAgent` (e.g., `LlmAgent`, `SequentialAgent`, `ParallelAgent`), these callbacks manage the overall execution flow.**

---

### `before_agent_callback`

* **When:** Before the agent's main execution begins.
* **Purpose:** Set up resources, perform validation checks, log entry points, or modify the invocation context.
* **Behavior:** Returning a `types.Content` object skips the agent's execution and uses the returned content as the final response. Returning `None` allows normal execution to proceed.

### `after_agent_callback`

* **When:** After the agent's execution completes successfully.
* **Purpose:** Perform cleanup tasks, validate post-execution state, log completion, or modify the final output.
* **Behavior:** Returning a new `types.Content` object replaces the agent's original output. Returning `None` retains the original output.

---

## 🤖 LLM Interaction Callbacks

**Specific to `LlmAgent`, these callbacks manage interactions with the Large Language Model (LLM).**

### `before_model_callback`

* **When:** Just before sending a request to the LLM.
* **Purpose:** Inspect or modify the LLM request, add dynamic instructions, inject examples, implement guardrails, or apply caching mechanisms.
* **Behavior:** Returning an `LlmResponse` object skips the LLM call and uses the returned response directly. Returning `None` proceeds with the LLM call.

### `after_model_callback`

* **When:** Immediately after receiving a response from the LLM.
* **Purpose:** Inspect or modify the LLM response, log outputs, reformat responses, censor sensitive information, or extract structured data.
* **Behavior:** Returning a modified `LlmResponse` object replaces the original response. Returning `None` retains the original response.

---

## 🛠️ Tool Execution Callbacks

**These callbacks handle the execution of tools (e.g., `FunctionTool`, `AgentTool`) that the LLM may invoke.**

### `before_tool_callback`

* **When:** Just before a tool's `run_async` method is invoked.
* **Purpose:** Inspect or modify tool arguments, perform authorization checks, log tool usage, or implement caching.
* **Behavior:** Returning a dictionary skips the tool's execution and uses the returned dictionary as the result. Returning `None` proceeds with the tool's execution.

### `after_tool_callback`

* **When:** Immediately after a tool's `run_async` method completes successfully.
* **Purpose:** Inspect or modify the tool's result, log outputs, post-process results, or save data to the session state.
* **Behavior:** Returning a modified dictionary replaces the original tool response. Returning `None` retains the original response.

---

## 🧠 Practical Example: Modifying Tool Output

**Here's an example demonstrating the use of `after_tool_callback` to modify the output of a tool that retrieves capital cities:**

```python
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool
from google.adk.tools.tool_context import ToolContext
from google.adk.tools.base_tool import BaseTool
from typing import Optional, Dict, Any
from copy import deepcopy

# Define the tool function
def get_capital_city(country: str) -> Dict[str, str]:
    country_capitals = {
        "united states": "Washington, D.C.",
        "canada": "Ottawa",
        "france": "Paris",
        "germany": "Berlin",
    }
    return {"result": country_capitals.get(country.lower(), f"Capital not found for {country}")}

# Wrap the function into a FunctionTool
capital_tool = FunctionTool(func=get_capital_city)

# Define the after_tool_callback
def simple_after_tool_modifier(
    tool: BaseTool, args: Dict[str, Any], tool_context: ToolContext, tool_response: Dict
) -> Optional[Dict]:
    if tool.name == 'get_capital_city' and tool_response.get("result") == "Washington, D.C.":
        modified_response = deepcopy(tool_response)
        modified_response["result"] += " (Note: This is the capital of the USA)."
        modified_response["note_added_by_callback"] = True
        return modified_response
    return None

# Create the LlmAgent with the callback
my_llm_agent = LlmAgent(
    name="AfterToolCallbackAgent",
    model="gemini-2.0-flash",
    instruction="You are an agent that finds capital cities using the get_capital_city tool. Report the result clearly.",
    description="An LLM agent demonstrating after_tool_callback",
    tools=[capital_tool],
    after_tool_callback=simple_after_tool_modifier
)
```

**In this example, when the agent is asked about the capital of the United States, the `after_tool_callback` modifies the tool's response to add a note indicating that Washington, D.C. is the capital of the USA.**

---

**For more detailed information and additional examples, refer to the official [Google ADK documentation on callbacks](https://google.github.io/adk-docs/callbacks/types-of-callbacks/).**
