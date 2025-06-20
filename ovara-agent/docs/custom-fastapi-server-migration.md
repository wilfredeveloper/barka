# Custom FastAPI Server Migration Guide

## Overview

This document describes the migration from Google ADK's built-in FastAPI server (`adk api_server`) to a custom FastAPI server implementation that provides enhanced control over session creation and initial state management.

## Migration Benefits

### Enhanced Session Control
- **Custom Initial State**: Pass user context (client_id, organization_id, conversation_id) during session creation
- **Flexible State Management**: Support for complex initial state structures
- **Better Integration**: Seamless integration with existing MongoDB-based frontend architecture

### Maintained Compatibility
- **Same Endpoints**: All endpoints expected by `barka-backend/routes/agent.js` are preserved
- **Same Response Format**: Response structures match ADK's format for frontend compatibility
- **Same Agent Workflow**: Multi-agent orchestration and handoffs work identically

## Architecture Changes

### Before (ADK Built-in Server)
```
Frontend → barka-backend → ADK api_server (port 5566)
                          ↓
                      Google ADK Session Service
                          ↓
                      SQLite Database
```

### After (Custom FastAPI Server)
```
Frontend → barka-backend → Custom FastAPI Server (port 5566)
                          ↓
                      Google ADK Session Service + Custom Logic
                          ↓
                      SQLite Database
```

## Implementation Details

### Key Files Modified
- `ovara-agent/app/main.py`: Extended to include FastAPI server with custom endpoints
- Added session creation with initial state support
- Maintained backward compatibility with CLI mode

### New Endpoints Implemented

#### 1. Session Management
- `POST /apps/{app_name}/users/{user_id}/sessions/{session_id}` - Create session with initial state
- `GET /apps/{app_name}/users/{user_id}/sessions/{session_id}` - Get session data
- `GET /apps/{app_name}/users/{user_id}/sessions` - List user sessions

#### 2. Agent Interaction
- `POST /run` - Send message to agent (returns all events)
- `POST /run_sse` - Send message with streaming response
- `GET /list-apps` - List available apps

### Enhanced Session Creation

The custom server supports passing initial state during session creation:

```json
POST /apps/orchestrator/users/{user_id}/sessions/{session_id}
{
  "client_id": "682d0ffc73b55d01943ae37a",
  "organization_id": "682c9c77fc264d7a085281e8",
  "conversation_id": "conv_123",
  "current_agent": "orchestrator_agent",
  "onboarding": {
    "status": "not_started",
    "phase": null,
    "project_type": null
  },
  "scheduling": {
    "meetings": [],
    "availability": {}
  }
}
```

## Usage Instructions

### Starting the Custom Server

#### Option 1: Using the Startup Script
```bash
cd ovara-agent
./scripts/start_custom_server.sh
```

#### Option 2: Direct Python Execution
```bash
cd ovara-agent
source env/bin/activate
cd app
python main.py
```

#### Option 3: CLI Mode (Legacy)
```bash
cd ovara-agent
source env/bin/activate
cd app
python main.py cli
```

### Testing the Server

Run the comprehensive test suite:
```bash
cd ovara-agent
source env/bin/activate
python scripts/test_custom_fastapi_server.py
```

### API Documentation

Access the interactive API documentation at:
- **Swagger UI**: http://localhost:5566/docs
- **ReDoc**: http://localhost:5566/redoc

## Backend Integration

The custom server is fully compatible with the existing `barka-backend/routes/agent.js` proxy routes:

- `POST /api/agent/adk/create-session` → `POST /apps/{app}/users/{user}/sessions/{session}`
- `GET /api/agent/adk/conversation/{id}` → `GET /apps/{app}/users/{user}/sessions/{session}`
- `POST /api/agent/adk/run` → `POST /run`

No changes are required to the backend proxy routes.

## Configuration

### Environment Variables
The server uses the same environment variables as the original implementation:
- `MONGODB_URI`: MongoDB connection string
- `GOOGLE_API_KEY`: Google API key for ADK
- `JWT_SECRET`: JWT secret for authentication
- `PORT`: Server port (defaults to 5566)

### Database
- Uses the same SQLite database (`ovara_agent_data.db`) for ADK sessions
- Maintains compatibility with existing session data
- No migration required for existing sessions

## Monitoring and Logging

### Server Logs
The server provides detailed logging for:
- Session creation and retrieval
- Agent runs and responses
- Error handling and debugging

### Health Checks
- `GET /list-apps` - Basic health check endpoint
- Returns `["orchestrator"]` when server is healthy

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using port 5566
lsof -i :5566

# Kill existing process if needed
kill -9 <PID>
```

#### Import Errors
```bash
# Ensure virtual environment is activated
source env/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### Session Creation Failures
- Check MongoDB connection
- Verify Google ADK credentials
- Check SQLite database permissions

### Testing Individual Endpoints

#### Create Session
```bash
curl -X POST "http://localhost:5566/apps/orchestrator/users/test/sessions/test123" \
  -H "Content-Type: application/json" \
  -d '{"client_id": "test_client", "organization_id": "test_org"}'
```

#### Send Message
```bash
curl -X POST "http://localhost:5566/run" \
  -H "Content-Type: application/json" \
  -d '{
    "app_name": "orchestrator",
    "user_id": "test",
    "session_id": "test123",
    "new_message": {"text": "Hello"}
  }'
```

## Migration Checklist

- [x] Custom FastAPI server implementation
- [x] Session creation with initial state support
- [x] All required endpoints implemented
- [x] Backend compatibility maintained
- [x] Agent workflow preserved
- [x] Comprehensive testing suite
- [x] Startup scripts and documentation
- [x] Error handling and logging
- [x] Health check endpoints

## Next Steps

1. **Production Deployment**: Configure for production environment
2. **Performance Optimization**: Add caching and connection pooling
3. **Security Enhancements**: Add authentication middleware
4. **Monitoring**: Integrate with monitoring systems
5. **Load Balancing**: Configure for high availability

## Support

For issues or questions regarding the custom FastAPI server:
1. Check the logs in the terminal where the server is running
2. Run the test suite to verify functionality
3. Check the API documentation at `/docs`
4. Review this migration guide for troubleshooting steps
