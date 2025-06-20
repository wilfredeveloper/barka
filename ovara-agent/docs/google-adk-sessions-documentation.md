# Session: Tracking Individual Conversations

Following our Introduction, let's dive into the Session. Think back to the idea of a "conversation thread." Just like you wouldn't start every text message from scratch, agents need context regarding the ongoing interaction. `Session` is the ADK object designed specifically to track and manage these individual conversation threads.

---

## The Session Object

When a user starts interacting with your agent, the `SessionService` creates a `Session` object (`google.adk.sessions.Session`). This object acts as the container holding everything related to that one specific chat thread.

### Key Properties:

* **Identification (id, appName, userId):** Unique labels for the conversation.

  * `id`: A unique identifier for this specific conversation thread, essential for retrieving it later. A `SessionService` object can handle multiple `Session`s.
  * `app_name`: Identifies which agent application this conversation belongs to.
  * `user_id`: Links the conversation to a particular user.

* **History (`events`)**: A chronological sequence of all interactions (`Event` objects – user messages, agent responses, tool actions) that have occurred within this specific thread.

* **Session State (`state`)**: A place to store temporary data relevant only to this specific, ongoing conversation. This acts as a scratchpad for the agent during the interaction.

* **Activity Tracking (`lastUpdateTime`)**: A timestamp indicating the last time an event occurred in this conversation thread.

### Example: Examining Session Properties

```python
from google.adk.sessions import InMemorySessionService, Session

# Create a simple session to examine its properties
temp_service = InMemorySessionService()
example_session = await temp_service.create_session(
    app_name="my_app",
    user_id="example_user",
    state={"initial_key": "initial_value"}  # State can be initialized
)

print("--- Examining Session Properties ---")
print(f"ID (`id`):                {example_session.id}")
print(f"Application Name (`app_name`): {example_session.app_name}")
print(f"User ID (`user_id`):         {example_session.user_id}")
print(f"State (`state`):           {example_session.state}")  # Note: Only shows initial state here
print(f"Events (`events`):         {example_session.events}")  # Initially empty
print(f"Last Update (`last_update_time`): {example_session.last_update_time:.2f}")
print("---------------------------------")

# Clean up (optional for this example)
temp_service = await temp_service.delete_session(app_name=example_session.app_name,
                            user_id=example_session.user_id, session_id=example_session.id)
print("The final status of temp_service - ", temp_service)
```

---

## Managing Sessions with a SessionService

As seen above, you don't typically create or manage `Session` objects directly. Instead, you use a `SessionService`. This service acts as the central manager responsible for the entire lifecycle of your conversation sessions.

### Core Responsibilities:

* **Starting New Conversations:** Creating fresh `Session` objects when a user begins an interaction.
* **Resuming Existing Conversations:** Retrieving a specific `Session` (using its ID).
* **Saving Progress:** Appending new interactions (`Event` objects) to a session's history.
* **Listing Conversations:** Finding the active session threads for a particular user and application.
* **Cleaning Up:** Deleting `Session` objects and their associated data when conversations are finished or no longer needed.

---

## SessionService Implementations

ADK provides different `SessionService` implementations depending on your storage and scalability needs:

### InMemorySessionService

* **How it works:** Stores all session data in the application's memory.
* **Persistence:** None (lost on app restart).
* **Requires:** Nothing extra.
* **Best for:** Quick development, testing, and examples.

```python
from google.adk.sessions import InMemorySessionService
session_service = InMemorySessionService()
```

### VertexAiSessionService

* **How it works:** Uses Google Cloud's Vertex AI infrastructure for session management.
* **Persistence:** Yes (scalable, reliable).
* **Requires:**

  * GCP project (`pip install vertexai`)
  * GCS bucket
  * Reasoning Engine ID
* **Best for:** Production-grade apps on Google Cloud.

```python
from google.adk.sessions import VertexAiSessionService

PROJECT_ID = "your-gcp-project-id"
LOCATION = "us-central1"
REASONING_ENGINE_APP_NAME = "projects/your-gcp-project-id/locations/us-central1/reasoningEngines/your-engine-id"

session_service = VertexAiSessionService(project=PROJECT_ID, location=LOCATION)
```

### DatabaseSessionService (Python Only)

* **How it works:** Uses a relational database (e.g., SQLite, PostgreSQL).
* **Persistence:** Yes.
* **Requires:** Configured database.
* **Best for:** Apps needing reliable, self-managed persistent storage.

```python
from google.adk.sessions import DatabaseSessionService

db_url = "sqlite:///./my_agent_data.db"
session_service = DatabaseSessionService(db_url=db_url)
```

---

## The Session Lifecycle

### Lifecycle Overview:

1. **Start or Resume:** `Runner` uses `SessionService` to `create_session` or `get_session`.
2. **Context Provided:** `Runner` retrieves the appropriate `Session` object.
3. **Agent Processing:** Agent uses `state` and `events` to process the user's message.
4. **Response & State Update:** Agent generates response and flags updates to `state`.
5. **Save Interaction:** `Runner` calls `sessionService.append_event(session, event)`.
6. **Ready for Next:** Response sent to user; updated session saved for next turn.
7. **End Conversation:** Call `sessionService.delete_session(...)` to clean up if needed.

This cycle highlights how the `SessionService` ensures conversational continuity by managing the history and state associated with each `Session` object.
