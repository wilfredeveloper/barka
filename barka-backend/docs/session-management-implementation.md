# ADK Session Management Implementation

This document explains the new session management strategy implemented for the ovara-agent system to solve custom initial state injection and conversation continuity problems.

## Problem Solved

**Previous Issues:**
- ADK CLI `adk api_server` didn't allow custom initial state injection
- Frontend created new sessions on every page load (inefficient)
- No proper mapping between frontend conversation IDs and ADK session IDs
- Lost conversation context when resuming existing conversations

**Solution:**
- Create ADK sessions only for new conversations
- Store ADK session IDs in MongoDB conversations
- Retrieve existing session data using ADK REST API
- Maintain conversation continuity across sessions

## Architecture Overview

### New Data Flow

**New Conversation:**
```
Frontend → Backend → Create ADK Session with Custom State → Store session_id in MongoDB → Return conversation_id
```

**Existing Conversation:**
```
Frontend → Backend → Fetch conversation → Get session_id → Call ADK API → Return full session data
```

### Database Schema Changes

**Conversation Model Updates:**
```javascript
// Added to barka-backend/models/Conversation.js
adkSessionId: {
  type: String,
  index: true,
  sparse: true
},
adkUserId: {
  type: String,
  index: true,
  sparse: true
},
adkAppName: {
  type: String,
  default: "orchestrator"
}
```

## API Endpoints

### 1. Create Session with Custom State

**Endpoint:** `POST /api/agent/adk/create-session`

**Purpose:** Create new ADK session with custom initial state for new conversations

**Request Body:**
```javascript
{
  "conversationId": "mongodb_conversation_id",
  "clientId": "682d0ffc73b55d01943ae37a",
  "organizationId": "682c9c77fc264d7a085281e8"
}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "sessionId": "session-1234567890-abc123",
    "userId": "682d0ffc73b55d01943ae37a",
    "appName": "orchestrator",
    "conversationId": "mongodb_conversation_id",
    "adkResponse": { /* ADK session creation response */ }
  }
}
```

**Custom Initial State Injected:**
```javascript
{
  client_id: "682d0ffc73b55d01943ae37a",
  organization_id: "682c9c77fc264d7a085281e8",
  conversation_id: "mongodb_conversation_id",
  current_agent: "orchestrator_agent",
  agent_history: [],
  onboarding: {
    status: "not_started",
    phase: null,
    current_todo: null,
    progress: 0
  },
  scheduling: {
    meetings: [],
    availability: {},
    preferences: {}
  },
  user_preferences: {},
  session_metadata: {
    created_at: "2025-01-15T10:00:00Z",
    frontend_conversation_id: "mongodb_conversation_id"
  }
}
```

### 2. Retrieve Existing Session Data

**Endpoint:** `GET /api/agent/adk/conversation/:conversationId`

**Purpose:** Get complete ADK session data for existing conversations

**Response:**
```javascript
{
  "success": true,
  "data": {
    "conversation": {
      "id": "mongodb_conversation_id",
      "title": "Project Discussion",
      "status": "active",
      "lastMessageAt": "2025-01-15T10:30:00Z",
      "client": { /* client data */ },
      "organization": { /* org data */ },
      "adkSessionId": "session-1234567890-abc123",
      "adkUserId": "682d0ffc73b55d01943ae37a",
      "adkAppName": "orchestrator"
    },
    "session": {
      "id": "session-1234567890-abc123",
      "app_name": "orchestrator",
      "user_id": "682d0ffc73b55d01943ae37a",
      "state": { /* persistent memory state */ },
      "events": [ /* all conversation events */ ],
      "last_update_time": 1642248000
    },
    "messages": [
      {
        "id": "event_123",
        "author": "user",
        "content": { /* message content */ },
        "timestamp": 1642248000,
        "turn_complete": true,
        "actions": { /* agent actions */ },
        "metadata": { /* event metadata */ }
      }
    ]
  }
}
```

## Frontend Integration

### Updated ADK Client Methods

**Create Session for New Conversation:**
```typescript
async createSessionForNewConversation(
  conversationId: string,
  clientId: string,
  organizationId: string
): Promise<string | null>
```

**Get Existing Session:**
```typescript
async getExistingSession(conversationId: string): Promise<ADKSessionData | null>
```

**Convert Session Messages:**
```typescript
convertSessionMessagesToFrontend(sessionData: ADKSessionData): ADKMessage[]
```

### Usage Pattern

```typescript
// For new conversations
const sessionId = await adkClient.createSessionForNewConversation(
  conversationId,
  clientId,
  organizationId
);

// For existing conversations
const sessionData = await adkClient.getExistingSession(conversationId);
if (sessionData) {
  const messages = adkClient.convertSessionMessagesToFrontend(sessionData);
  // Render messages in UI
} else {
  // No session found, create new one
  const sessionId = await adkClient.createSessionForNewConversation(
    conversationId,
    clientId,
    organizationId
  );
}
```

## Benefits

### 1. Efficient Session Management
- ✅ No unnecessary session creation on page loads
- ✅ Sessions created only when needed
- ✅ Proper session lifecycle management

### 2. Custom Initial State Injection
- ✅ Solves the ADK CLI limitation
- ✅ Client context available from session start
- ✅ Persistent memory initialized correctly

### 3. Conversation Continuity
- ✅ Perfect resume capability for existing conversations
- ✅ Complete message history preservation
- ✅ Agent context and state maintained

### 4. Full ADK Feature Access
- ✅ Agent transfers with complete context
- ✅ Tool call history and debugging
- ✅ Event metadata and timing
- ✅ Persistent memory across sessions

### 5. Clean Architecture
- ✅ Proper separation of concerns
- ✅ MongoDB for business logic
- ✅ ADK for session management
- ✅ Clear mapping between systems

## Testing

**Test Script:** `barka-backend/scripts/test-session-management.js`

**Run Tests:**
```bash
cd barka-backend
node scripts/test-session-management.js
```

**Tests Verify:**
- Session creation with custom initial state
- Conversation-to-session mapping
- Session data retrieval
- Data consistency across requests
- Database updates and persistence

## Migration Guide

### For Existing Conversations

Existing conversations without ADK sessions will:
1. Return `needsSessionCreation: true` when retrieved
2. Require new session creation using the new endpoint
3. Maintain all existing MongoDB data

### Backward Compatibility

- Legacy `createSession()` method maintained
- Existing API endpoints unchanged
- Gradual migration supported

## Production Considerations

### Database Indexing
- `adkSessionId` and `adkUserId` fields are indexed
- Sparse indexes allow null values efficiently
- Fast lookups for session retrieval

### Error Handling
- ADK server unavailability handled gracefully
- Session expiration detection and recovery
- Conversation-session mapping validation

### Scalability
- ADK handles session scaling concerns
- MongoDB handles business logic scaling
- Independent optimization possible

This implementation provides a robust, scalable solution for ADK session management while maintaining clean architecture and full feature access.
