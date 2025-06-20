# Ovara Agent Documentation

## Project Overview

Ovara Agent is a sophisticated AI assistant built on Google's AI Development Kit (ADK) with MongoDB-backed session persistence. The system provides conversation management, user authentication, and real-time communication capabilities.

## Implementation Phases

### ✅ Phase 1: Core Infrastructure (COMPLETED)
**Status:** All tests passing
**Components:** Database session service, message handling, authentication, conversation context
**Documentation:** [Phase 1 Implementation](./phase1-implementation.md)

### ✅ Phase 2: WebSocket Integration (COMPLETED)
**Status:** All tests passing
**Components:** WebSocket connection manager, real-time messaging, enhanced frontend, monitoring APIs
**Documentation:** [Phase 2 Implementation](./phase2-implementation.md)

### 🚧 Phase 3: Advanced Features (PLANNED)
**Components:** Enhanced AI capabilities, performance optimizations, monitoring dashboard

## Quick Start

### Prerequisites
- Python 3.10+
- MongoDB instance
- Google ADK installed

### Installation
```bash
# Activate virtual environment
source env/bin/activate

# Install dependencies
pip install -r requirements.txt

# Test the implementation
python test_phase1.py
```

### Environment Setup
```bash
export MONGODB_URI="mongodb://localhost:27017"
export MONGODB_DB_NAME="barka"
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Ovara Agent Architecture                 │
├─────────────────────────────────────────────────────────────┤
│  Enhanced Frontend ←→ WebSocket Manager ←→ Google ADK       │
│       ↓                      ↓                             │
│  Client ID Mgmt ←→ Connection Tracking ←→ Session Service   │
│       ↓                      ↓                ↓            │
│  Auth Handler ←→ Message Handler ←→ Conversation Context    │
│                              ↓                             │
│                         MongoDB Database                   │
│                              ↓                             │
│                    [Real-time Broadcasting]                │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### WebSocket Manager (Phase 2)
- **File:** `lib/websocket_manager.py`
- **Purpose:** Centralized WebSocket connection management
- **Features:** Multi-client support, real-time broadcasting, connection lifecycle

### Enhanced WebSocket Endpoint (Phase 2)
- **File:** `app/main.py` (enhanced)
- **Purpose:** Advanced WebSocket handling with authentication
- **Features:** Connection registration, monitoring APIs, graceful cleanup

### Database Session Service
- **File:** `lib/database_session_service.py`
- **Purpose:** MongoDB-backed Google ADK session management
- **Features:** Session persistence, event tracking, cleanup

### Message Handler
- **File:** `lib/message_handler.py`
- **Purpose:** Conversation message management
- **Features:** CRUD operations, threading, validation

### Authentication Handler
- **File:** `lib/auth_handler.py`
- **Purpose:** JWT-based user authentication
- **Features:** Token management, user validation

### Conversation Context Builder
- **File:** `lib/conversation_context.py`
- **Purpose:** AI conversation context preparation
- **Features:** History aggregation, context formatting

## Testing

### Run All Tests
```bash
# Phase 1 tests (Core Infrastructure)
python test_phase1.py

# Phase 2 tests (WebSocket Integration)
python test_phase2.py
```

### Expected Output

**Phase 1 Tests:**
```
🚀 Starting Phase 1 Implementation Tests
✅ Database connection successful
✅ DatabaseSessionService initialized
✅ Session creation successful
✅ Session retrieval successful
✅ Session cleanup successful
✅ MessageHandler initialized
✅ ConversationContextBuilder initialized
✅ AuthHandler initialized
✅ Integration test completed
```

**Phase 2 Tests:**
```
🚀 Starting Phase 2 Implementation Tests
✅ WebSocket connection management
✅ Client ID and authentication integration
✅ Real-time messaging and broadcasting
✅ Connection state management
✅ Error handling and cleanup
✅ Session-WebSocket integration
🏁 Phase 2 Implementation Tests Completed Successfully!
```

## Database Schema

### Key Collections
- `sessions` - Google ADK session data
- `conversations` - Conversation threads
- `messages` - Individual messages
- `clients` - Client information
- `users` - User authentication data

## Configuration

### Required Environment Variables
```bash
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=barka
```

### Optional Configuration
- JWT secret for authentication
- Session timeout settings
- Database connection pooling

## Development

### Project Structure
```
ovara-agent/
├── lib/                    # Core library components
│   ├── database_session_service.py
│   ├── message_handler.py
│   ├── auth_handler.py
│   ├── conversation_context.py
│   └── db.py
├── app/                    # Application components
│   ├── jarvis/            # Jarvis AI agent
│   └── main.py
├── scripts/               # Utility scripts
├── docs/                  # Documentation
└── test_phase1.py        # Test suite
```

### Adding New Components
1. Create component in `lib/` directory
2. Add tests to test suite
3. Update documentation
4. Ensure Google ADK compatibility

## Troubleshooting

### Common Issues

**MongoDB Connection Failed**
```bash
# Check MongoDB status
sudo systemctl status mongod

# Test connection
python scripts/test_db_connection.py
```

**Import Errors**
```bash
# Ensure virtual environment is activated
source env/bin/activate

# Install missing dependencies
pip install -r requirements.txt
```

**Session Creation Errors**
- Verify client data exists in database
- Check session ID uniqueness
- Validate MongoDB indexes

### Debug Tools
- `scripts/test_db_connection.py` - Test database connectivity
- `scripts/check_test_db.py` - Verify database state
- `scripts/find_client.py` - Search for client data

## Contributing

### Development Workflow
1. Create feature branch
2. Implement changes with tests
3. Run test suite: `python test_phase1.py`
4. Update documentation
5. Submit pull request

### Code Standards
- Follow Google ADK patterns
- Maintain MongoDB compatibility
- Include comprehensive error handling
- Add logging for debugging

## Support

### Documentation
- [Phase 1 Implementation](./phase1-implementation.md)
- [Google ADK Sessions](./google-adk-sessions-documentation.md)

### Getting Help
- Check test output for specific errors
- Review logs for debugging information
- Verify environment configuration
- Test individual components

## License

This project is part of the Barka ecosystem and follows the project's licensing terms.
