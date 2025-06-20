# Barka Frontend → Ovara Agent Integration

## Overview

The barka-frontend has been updated to connect directly to the ovara-agent WebSocket service instead of using HTTP API calls to barka-backend for chat functionality. This provides real-time streaming conversations with the AI agent.

## Changes Made

### 1. **New WebSocket Service** (`src/lib/websocket.ts`)
- **OvaraWebSocketService class** - Manages WebSocket connections to ovara-agent
- **Real-time messaging** - Handles streaming responses from AI agent
- **Connection management** - Automatic reconnection with exponential backoff
- **Event handling** - Proper message, connection, and error event handling

### 2. **Configuration** (`src/lib/ovara-config.ts`)
- **Environment-based URLs** - Configurable WebSocket and API endpoints
- **Connection settings** - Reconnection attempts, delays, and timeouts
- **Helper functions** - URL builders for WebSocket and API endpoints

### 3. **Updated Chat Page** (`src/app/dashboard/client/chat/[id]/page.tsx`)
- **WebSocket integration** - Replaced HTTP API calls with WebSocket messaging
- **Real-time UI updates** - Streaming message display with partial content
- **Connection status indicator** - Visual WebSocket connection status
- **Enhanced error handling** - Better error messages and recovery

### 4. **Environment Configuration** (`.env.local`)
```bash
NEXT_PUBLIC_OVARA_WS_URL=ws://localhost:8000
NEXT_PUBLIC_OVARA_API_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:5000/api  # Keep for non-chat operations
```

### 5. **Test Script** (`test-websocket-connection.js`)
- **Connection testing** - Verify WebSocket connectivity to ovara-agent
- **JWT token generation** - Test authentication flow
- **Message exchange** - Test bidirectional communication

## Technical Details

### WebSocket Connection Flow
1. **Authentication** - Uses JWT token from localStorage
2. **Connection** - Connects to `ws://localhost:8000/ws/{client_id}`
3. **Handshake** - Receives connection_established message with conversation info
4. **Messaging** - Real-time bidirectional message exchange
5. **Streaming** - Handles partial messages for streaming responses

### Message Format
```javascript
// Outgoing (User → Agent)
{
  mime_type: 'text/plain',
  data: 'User message content',
  role: 'user'
}

// Incoming (Agent → User)
{
  mime_type: 'text/plain',
  data: 'Agent response content',
  role: 'model',
  partial: true/false,
  turn_complete: true/false
}
```

### Connection Status Indicator
- **Green dot** - Connected and ready
- **Yellow dot (pulsing)** - Connecting
- **Red dot** - Connection error
- **Gray dot** - Disconnected

## Required Setup

### 1. **Ovara Agent Running**
```bash
cd ovara-agent
uvicorn app.main:app --port 8000
```

### 2. **Database Setup**
- Ensure test client exists in database with proper role (`org_client`)
- Client ID: `682d0ffc73b55d01943ae37a`
- Organization ID: `682c9c77fc264d7a085281e8`

### 3. **JWT Secret Alignment**
- Both ovara-agent and barka-frontend must use the same JWT secret
- Current secret: `mp9fv601` (configured in ovara-agent/.env)

### 4. **Frontend Development**
```bash
cd barka-frontend
npm run dev
```

## Testing

### 1. **WebSocket Connection Test**
```bash
cd barka-frontend
node test-websocket-connection.js
```

### 2. **Frontend Integration Test**
1. Start ovara-agent: `uvicorn app.main:app --port 8000`
2. Start frontend: `npm run dev`
3. Login with test credentials
4. Navigate to chat page
5. Verify connection status shows "Connected"
6. Send test message and verify real-time response

### 3. **Expected Behavior**
- ✅ WebSocket connects automatically when chat page loads
- ✅ Connection status indicator shows current state
- ✅ Messages send instantly via WebSocket
- ✅ Agent responses stream in real-time
- ✅ Automatic reconnection on connection loss

## Migration Notes

### What Changed
- **Chat messaging** - Now uses WebSocket instead of HTTP POST
- **Real-time updates** - Streaming responses instead of polling
- **Connection management** - Persistent WebSocket connection
- **Error handling** - Enhanced with connection status

### What Stayed the Same
- **Authentication** - Still uses JWT tokens from localStorage
- **UI/UX** - Same chat interface and user experience
- **Non-chat operations** - Still use barka-backend API (conversations, file uploads, etc.)
- **User management** - No changes to login/logout flow

### Backward Compatibility
- **Graceful degradation** - Falls back to error messages if WebSocket fails
- **Existing APIs** - Non-chat operations still use barka-backend
- **User sessions** - No impact on existing user authentication

## Troubleshooting

### Common Issues

**WebSocket Connection Failed**
- Verify ovara-agent is running on port 8000
- Check JWT token is valid and not expired
- Ensure client exists in database with correct role

**Authentication Errors**
- Verify JWT secret matches between frontend and ovara-agent
- Check client role is `org_client` in database
- Ensure user has access to the specified client

**Message Not Sending**
- Check WebSocket connection status indicator
- Verify network connectivity to localhost:8000
- Check browser console for error messages

### Debug Commands
```bash
# Test ovara-agent directly
cd ovara-agent
python simple_websocket_test.py

# Test frontend WebSocket
cd barka-frontend
node test-websocket-connection.js

# Check ovara-agent logs
cd ovara-agent
uvicorn app.main:app --port 8000 --log-level debug
```

## Next Steps

1. **Production Configuration** - Update URLs for production deployment
2. **Error Recovery** - Enhanced error handling and user feedback
3. **Performance Optimization** - Message batching and connection pooling
4. **Security Enhancements** - Token refresh and secure WebSocket connections
5. **Mobile Support** - WebSocket handling for mobile browsers

## Success Criteria

✅ **WebSocket Connection** - Frontend connects to ovara-agent successfully  
✅ **Real-time Messaging** - Messages send and receive instantly  
✅ **Streaming Responses** - Agent responses stream in real-time  
✅ **Connection Management** - Automatic reconnection and status indication  
✅ **Error Handling** - Graceful error recovery and user feedback  
✅ **Authentication** - JWT-based authentication working correctly  

The integration is now complete and ready for testing!
