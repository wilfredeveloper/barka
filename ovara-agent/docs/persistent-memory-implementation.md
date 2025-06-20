# Persistent Memory Implementation in Ovara-Agent

This document explains how to implement persistent memory in the ovara-agent multi-agent system, similar to the project manager agent example.

## Overview

Persistent memory allows agents to store and retrieve information across conversation sessions, providing:
- Contextual awareness of previous interactions
- Elimination of redundant questions
- Progressive conversation building
- Seamless user experience

## Implementation Pattern

### 1. Tool Function Signature

ADK-style tools must include `tool_context: ToolContext` parameter:

```python
from google.adk.tools.tool_context import ToolContext

def your_tool_function(param1: str, param2: int, tool_context: ToolContext) -> dict:
    """
    Your tool function with persistent memory.
    
    Args:
        param1: Your regular parameters
        param2: Your regular parameters  
        tool_context: Context for accessing and updating session state
    
    Returns:
        dict: Your tool response
    """
```

### 2. State Management

Use `tool_context.state` to store and retrieve persistent data:

```python
# Get data from state
cached_data = tool_context.state.get("your_cache_key", {})

# Store data in state
tool_context.state["your_cache_key"] = new_data

# Update existing data
existing_list = tool_context.state.get("your_list", [])
existing_list.append(new_item)
tool_context.state["your_list"] = existing_list
```

## Implementation Examples

### Jarvis Agent (Calendar Management)

**Modified Tools:**
- `create_event()` - Stores created events in session state
- `list_events()` - Caches recent queries for context

**State Structure:**
```python
{
    "jarvis_events": [
        {
            "event_id": "event_123",
            "summary": "Meeting Title",
            "created_at": "2025-01-15T10:00:00",
            "calendar_id": "primary"
        }
    ],
    "jarvis_recent_queries": [
        {
            "type": "list_events",
            "start_date": "2025-01-15",
            "days": 7,
            "result_count": 5,
            "queried_at": "2025-01-15T10:00:00"
        }
    ]
}
```

### Barka Agent (Onboarding)

**Modified Tools:**
- `get_client_info_persistent()` - Caches client information
- `get_next_actionable_todo_persistent()` - Tracks current todos
- `update_todo_status_persistent()` - Records todo updates

**State Structure:**
```python
{
    "barka_client_cache": {
        "client_id_123": {
            "client_data": {...},
            "last_accessed": "2025-01-15T10:00:00"
        }
    },
    "barka_current_todos": {
        "client_id_123": {
            "current_todo": {...},
            "status": "in_progress",
            "last_accessed": "2025-01-15T10:00:00"
        }
    },
    "barka_todo_updates": [
        {
            "todo_id": "todo_456",
            "client_id": "client_123",
            "old_status": "pending",
            "new_status": "completed",
            "updated_at": "2025-01-15T10:00:00"
        }
    ]
}
```

## Agent Configuration

### 1. Update Tool Imports

```python
# Import ADK-style tools
from .tools.your_tool import your_persistent_tool

# Update agent definition
root_agent = Agent(
    name="your_agent",
    model="gemini-2.0-flash-exp",
    description="Your agent description",
    instruction=your_system_prompt,
    tools=[
        your_persistent_tool,  # ADK-style tool with tool_context
        # ... other tools
    ],
)
```

### 2. Update System Prompts

Add persistent memory information to agent instructions:

```python
instruction = """
You are [Agent Name]...

## Persistent Memory
You have persistent memory across conversations through session state. You remember:
- [Specific data types your agent remembers]
- [Context from previous interactions]
- [User preferences and history]

This allows you to provide contextual assistance and reference previous interactions naturally.
"""
```

## Database Integration

The system uses Google ADK's `DatabaseSessionService` for persistence:

```python
from google.adk.sessions import DatabaseSessionService

# Setup database session service
db_url = "sqlite:///./ovara_agent_data.db"
session_service = DatabaseSessionService(db_url=db_url)
```

Session data is automatically persisted to the database and restored when sessions resume.

## Best Practices

### 1. State Key Naming
Use prefixed keys to avoid conflicts:
- `jarvis_*` for Jarvis agent state
- `barka_*` for Barka agent state
- `orchestrator_*` for orchestrator state

### 2. Data Cleanup
Implement cleanup logic to prevent state bloat:

```python
# Keep only last N items
recent_items = tool_context.state.get("your_list", [])
if len(recent_items) > 20:
    recent_items = recent_items[-20:]
tool_context.state["your_list"] = recent_items
```

### 3. Error Handling
Always handle missing state gracefully:

```python
cached_data = tool_context.state.get("your_cache", {})
if not cached_data:
    # Handle first-time usage
    cached_data = initialize_default_data()
```

## Testing

Use the provided test script to verify persistent memory:

```bash
cd ovara-agent
python scripts/test_persistent_memory.py
```

## Benefits

1. **Contextual Conversations**: Agents remember previous interactions
2. **Reduced Redundancy**: No need to re-ask for known information  
3. **Progressive Building**: Each conversation builds on previous ones
4. **Better UX**: Seamless experience across sessions
5. **Efficiency**: Faster interactions with cached data

## Migration Path

1. **Phase 1**: Implement ADK-style tools alongside existing ones
2. **Phase 2**: Update agent configurations to use new tools
3. **Phase 3**: Test persistent memory functionality
4. **Phase 4**: Remove legacy tools once stable

This approach ensures backward compatibility while adding persistent memory capabilities.
