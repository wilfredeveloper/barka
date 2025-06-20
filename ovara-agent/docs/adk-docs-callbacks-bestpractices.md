## Design Patterns and Best Practices for Callbacks

Callbacks offer powerful hooks into the agent lifecycle. Here are common design patterns illustrating how to leverage them effectively in ADK, followed by best practices for implementation.

---

### Design Patterns

These patterns demonstrate typical ways to enhance or control agent behavior using callbacks:

#### 1. Guardrails & Policy Enforcement

* **Pattern**: Intercept requests before they reach the LLM or tools to enforce rules.
* **How**: Use `before_model_callback` to inspect the `LlmRequest` prompt or `before_tool_callback` to inspect tool arguments. If a policy violation is detected (e.g., forbidden topics, profanity), return a predefined response (`LlmResponse` or `dict/Map`) to block the operation and optionally update `context.state` to log the violation.
* **Example**: A `before_model_callback` checks `llm_request.contents` for sensitive keywords and returns a standard "Cannot process this request" `LlmResponse` if found, preventing the LLM call.

#### 2. Dynamic State Management

* **Pattern**: Read from and write to session state within callbacks to make agent behavior context-aware and pass data between steps.
* **How**: Access `callback_context.state` or `tool_context.state`. Modifications (`state['key'] = value`) are automatically tracked in the subsequent `Event.actions.state_delta` for persistence by the `SessionService`.
* **Example**: An `after_tool_callback` saves a `transaction_id` from the tool's result to `tool_context.state['last_transaction_id']`. A later `before_agent_callback` might read `state['user_tier']` to customize the agent's greeting.

#### 3. Logging and Monitoring

* **Pattern**: Add detailed logging at specific lifecycle points for observability and debugging.
* **How**: Implement callbacks (e.g., `before_agent_callback`, `after_tool_callback`, `after_model_callback`) to print or send structured logs containing information like agent name, tool name, invocation ID, and relevant data from the context or arguments.
* **Example**: Log messages like `INFO: [Invocation: e-123] Before Tool: search_api - Args: {'query': 'ADK'}`.

#### 4. Caching

* **Pattern**: Avoid redundant LLM calls or tool executions by caching results.
* **How**: In `before_model_callback` or `before_tool_callback`, generate a cache key based on the request/arguments. Check `context.state` (or an external cache) for this key. If found, return the cached `LlmResponse` or result directly. If not, allow the operation and use the corresponding `after_` callback to store the result.
* **Example**: `before_tool_callback` for `get_stock_price(symbol)` checks `state[f"cache:stock:{symbol}"]`. If present, returns the cached price; otherwise, allows the API call and `after_tool_callback` saves the result.

#### 5. Request/Response Modification

* **Pattern**: Alter data just before it's sent to the LLM/tool or just after it's received.
* **How**:

  * `before_model_callback`: Modify `llm_request` (e.g., add system instructions).
  * `after_model_callback`: Modify the returned `LlmResponse` (e.g., format text).
  * `before_tool_callback`: Modify the tool `args`.
  * `after_tool_callback`: Modify the tool `response`.
* **Example**: `before_model_callback` appends "User language preference: Spanish" to `llm_request.config.system_instruction` if `context.state['lang'] == 'es'`.

#### 6. Conditional Skipping of Steps

* **Pattern**: Prevent standard operations (agent run, LLM call, tool execution) based on conditions.
* **How**: Return a value from a `before_` callback (`Content`, `LlmResponse`, or `dict`). The framework interprets this as the result, skipping normal execution.
* **Example**: `before_tool_callback` checks `tool_context.state['api_quota_exceeded']`. If true, returns `{'error': 'API quota exceeded'}`.

#### 7. Tool-Specific Actions (Authentication & Summarization Control)

* **Pattern**: Handle tool-specific actions like authentication and summarization control.
* **How**:

  * **Authentication**: Use `tool_context.request_credential(auth_config)` in `before_tool_callback`.
  * **Summarization**: Set `tool_context.actions.skip_summarization = True` to bypass default LLM summarization.
* **Example**: A `before_tool_callback` checks for an auth token in `state`; if missing, calls `request_credential`. An `after_tool_callback` might set `skip_summarization = True` for structured JSON.

#### 8. Artifact Handling

* **Pattern**: Save or load session-related files or large data blobs.
* **How**: Use `callback_context.save_artifact / await tool_context.save_artifact` to store data. Use `load_artifact` to retrieve artifacts. Changes are tracked via `Event.actions.artifact_delta`.
* **Example**: An `after_tool_callback` for "generate\_report" saves a file using `await tool_context.save_artifact("report.pdf", report_part)`. A `before_agent_callback` might load a config using `callback_context.load_artifact("agent_config.json")`.

---

### Best Practices for Callbacks

* **Keep Focused**: Each callback should have a single purpose.
* **Mind Performance**: Avoid blocking operations. Offload if necessary.
* **Handle Errors Gracefully**: Use `try...except` / `catch` blocks. Log errors and handle them cleanly.
* **Manage State Carefully**:

  * Use specific keys.
  * Prefer scoped prefixes like `State.APP_PREFIX`, `State.USER_PREFIX`, `State.TEMP_PREFIX`.
* **Consider Idempotency**: External side-effect operations should ideally be idempotent.
* **Test Thoroughly**: Unit test with mock contexts; perform integration tests.
* **Ensure Clarity**: Use descriptive names and clear docstrings.
* **Use Correct Context Type**: Use `CallbackContext` for agent/model and `ToolContext` for tools.

By applying these patterns and best practices, you can effectively use callbacks to create more robust, observable, and customized agent behaviors in ADK.
