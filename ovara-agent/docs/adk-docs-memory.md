# Memory: Long-Term Knowledge with MemoryService

We've seen how `Session` tracks the history (events) and temporary data (state) for a single, ongoing conversation. But what if an agent needs to recall information from past conversations or access external knowledge bases? This is where the concept of **Long-Term Knowledge** and the **MemoryService** come into play.

---

## 💡 Think of it this way:
- **Session / State**: Like your short-term memory during one specific chat.
- **Long-Term Knowledge (MemoryService)**: Like a searchable archive or knowledge library the agent can consult, potentially containing information from many past chats or other sources.

---

## 🧠 The MemoryService Role
The `BaseMemoryService` defines the interface for managing this searchable, long-term knowledge store. Its primary responsibilities are:

- **Ingesting Information (`add_session_to_memory`)**: Taking the contents of a (usually completed) `Session` and adding relevant information to the long-term knowledge store.
- **Searching Information (`search_memory`)**: Allowing an agent (typically via a Tool) to query the knowledge store and retrieve relevant snippets or context based on a search query.

---

## 🔧 MemoryService Implementations
ADK provides different ways to implement this long-term knowledge store:

### 1. `InMemoryMemoryService`
- **How it works**: Stores session information in the application's memory and performs basic keyword matching for searches.
- **Persistence**: ❌ None. All stored knowledge is lost if the application restarts.
- **Requires**: Nothing extra.
- **Best for**: Prototyping, simple testing, scenarios where only basic keyword recall is needed and persistence isn't required.

```python
from google.adk.memory import InMemoryMemoryService
memory_service = InMemoryMemoryService()
```

---

### 2. `VertexAiRagMemoryService`
- **How it works**: Leverages Google Cloud's Vertex AI RAG (Retrieval-Augmented Generation) service. It ingests session data into a specified RAG Corpus and uses powerful semantic search capabilities for retrieval.
- **Persistence**: ✅ Yes.
- **Requires**:
  - A Google Cloud project
  - Appropriate permissions
  - Necessary SDKs (`pip install google-adk[vertexai]`)
  - A pre-configured Vertex AI RAG Corpus resource name/ID
- **Best for**: Production applications needing scalable, persistent, and semantically relevant knowledge retrieval.

```python
# Requires: pip install google-adk[vertexai]
# Plus GCP setup, RAG Corpus, and authentication
from google.adk.memory import VertexAiRagMemoryService

RAG_CORPUS_RESOURCE_NAME = "projects/your-gcp-project-id/locations/us-central1/ragCorpora/your-corpus-id"
SIMILARITY_TOP_K = 5
VECTOR_DISTANCE_THRESHOLD = 0.7

memory_service = VertexAiRagMemoryService(
    rag_corpus=RAG_CORPUS_RESOURCE_NAME,
    similarity_top_k=SIMILARITY_TOP_K,
    vector_distance_threshold=VECTOR_DISTANCE_THRESHOLD
)
```

---

## 🔁 How Memory Works in Practice

1. **Session Interaction**: A user interacts with an agent via a `Session`, managed by a `SessionService`.
2. **Ingestion into Memory**: When a session is complete or has valuable info, your app calls `memory_service.add_session_to_memory(session)`.
3. **Later Query**: In a future session, the user might ask a question requiring past context.
4. **Agent Uses Memory Tool**: The agent, equipped with the `load_memory` tool, calls it with a search query.
5. **Search Execution**: The tool calls `memory_service.search_memory(app_name, user_id, query)`.
6. **Results Returned**: The MemoryService returns a `SearchMemoryResponse` with relevant snippets.
7. **Agent Uses Results**: The agent uses this info to respond intelligently.

---

## ✅ Example: Adding and Searching Memory
This demo uses `InMemoryMemoryService` for simplicity.

```python
import asyncio
from google.adk.agents import LlmAgent
from google.adk.sessions import InMemorySessionService, Session
from google.adk.memory import InMemoryMemoryService
from google.adk.runners import Runner
from google.adk.tools import load_memory
from google.genai.types import Content, Part

APP_NAME = "memory_example_app"
USER_ID = "mem_user"
MODEL = "gemini-2.0-flash"

info_capture_agent = LlmAgent(
    model=MODEL,
    name="InfoCaptureAgent",
    instruction="Acknowledge the user's statement."
)

memory_recall_agent = LlmAgent(
    model=MODEL,
    name="MemoryRecallAgent",
    instruction="Answer the user's question. Use the 'load_memory' tool if needed.",
    tools=[load_memory]
)

session_service = InMemorySessionService()
memory_service = InMemoryMemoryService()

runner = Runner(
    agent=info_capture_agent,
    app_name=APP_NAME,
    session_service=session_service,
    memory_service=memory_service
)

# Turn 1: Capture Info
print("--- Turn 1: Capturing Information ---")
session1_id = "session_info"
session1 = await runner.session_service.create_session(app_name=APP_NAME, user_id=USER_ID, session_id=session1_id)
user_input1 = Content(parts=[Part(text="My favorite project is Project Alpha.")], role="user")

final_response_text = "(No final response)"
async for event in runner.run_async(user_id=USER_ID, session_id=session1_id, new_message=user_input1):
    if event.is_final_response() and event.content and event.content.parts:
        final_response_text = event.content.parts[0].text
print(f"Agent 1 Response: {final_response_text}")

# Add to Memory
print("\n--- Adding Session 1 to Memory ---")
completed_session1 = await runner.session_service.get_session(app_name=APP_NAME, user_id=USER_ID, session_id=session1_id)
memory_service = await memory_service.add_session_to_memory(completed_session1)
print("Session added to memory.")

# Turn 2: Recall Info
print("\n--- Turn 2: Recalling Information ---")
session2_id = "session_recall"
session2 = await runner.session_service.create_session(app_name=APP_NAME, user_id=USER_ID, session_id=session2_id)

runner.agent = memory_recall_agent
user_input2 = Content(parts=[Part(text="What is my favorite project?")], role="user")

print("Running MemoryRecallAgent...")
final_response_text_2 = "(No final response)"
async for event in runner.run_async(user_id=USER_ID, session_id=session2_id, new_message=user_input2):
    print(f"  Event: {event.author} - Type: {'Text' if event.content and event.content.parts and event.content.parts[0].text else ''}"
          f"{'FuncCall' if event.get_function_calls() else ''}"
          f"{'FuncResp' if event.get_function_responses() else ''}")
    if event.is_final_response() and event.content and event.content.parts:
        final_response_text_2 = event.content.parts[0].text
        print(f"Agent 2 Final Response: {final_response_text_2}")
        break
```

---

### 🧪 What Happens in Turn 2:
1. User says: "What is my favorite project?"
2. Agent calls `load_memory` with query: *favorite project*
3. Tool internally calls `memory_service.search_memory(...)`
4. Finds: *"My favorite project is Project Alpha."*
5. Tool returns result to agent
6. Agent responds: **"Your favorite project is Project Alpha."**
