#!/bin/bash

# Test script to examine ADK session response structure using curl
# This script creates a session with the specified user ID and analyzes the event shapes

set -e

# Configuration
BASE_URL="http://localhost:5566"
USER_ID="6852d3b1a6122b5f94dcde59"
APP_NAME="orchestrator"
SESSION_ID="test-session-$(date +%s)-$(openssl rand -hex 3)"

echo "🧪 ADK Session Structure Analysis"
echo "================================"
echo "User ID: $USER_ID"
echo "Session ID: $SESSION_ID"
echo "App Name: $APP_NAME"
echo ""

# Step 1: Create ADK Session
echo "📝 Step 1: Creating ADK Session..."
SESSION_URL="$BASE_URL/apps/$APP_NAME/users/$USER_ID/sessions/$SESSION_ID"
echo "   URL: $SESSION_URL"

# Create initial state JSON
INITIAL_STATE=$(cat <<EOF
{
  "client_id": "$USER_ID",
  "organization_id": "test_org_id",
  "conversation_id": "test_conversation_$(date +%s)",
  "current_agent": "orchestrator_agent",
  "agent_history": [],
  "onboarding": {
    "status": "not_started",
    "phase": null,
    "current_todo": null,
    "progress": 0
  },
  "scheduling": {
    "meetings": [],
    "availability": {},
    "preferences": {}
  },
  "user_preferences": {},
  "session_metadata": {
    "created_at": "$(date -Iseconds)",
    "session_type": "test_analysis",
    "platform": "test_script"
  }
}
EOF
)

echo "📤 Creating session..."
SESSION_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$SESSION_URL" \
  -H "Content-Type: application/json" \
  -d "$INITIAL_STATE" \
  --connect-timeout 10 \
  --max-time 30)

# Extract HTTP status code
HTTP_STATUS=$(echo "$SESSION_RESPONSE" | tail -n1)
SESSION_DATA=$(echo "$SESSION_RESPONSE" | head -n -1)

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Session created successfully"
  echo "📊 Initial Session Structure:"
  echo "$SESSION_DATA" | jq '.' 2>/dev/null || echo "$SESSION_DATA"
  echo ""
else
  echo "❌ Session creation failed: HTTP $HTTP_STATUS"
  echo "$SESSION_DATA"
  exit 1
fi

# Step 2: Send Message to Agent
echo "💬 Step 2: Sending Message to Agent..."
RUN_URL="$BASE_URL/run"
echo "   URL: $RUN_URL"

# Create message JSON
MESSAGE_DATA=$(cat <<EOF
{
  "app_name": "$APP_NAME",
  "user_id": "$USER_ID",
  "session_id": "$SESSION_ID",
  "new_message": {
    "text": "Hello! I need help with project management. Can you show me my current projects and tasks?"
  },
  "streaming": false
}
EOF
)

echo "📤 Sending message..."
MESSAGE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$RUN_URL" \
  -H "Content-Type: application/json" \
  -d "$MESSAGE_DATA" \
  --connect-timeout 10 \
  --max-time 45)

# Extract HTTP status code
HTTP_STATUS=$(echo "$MESSAGE_RESPONSE" | tail -n1)
MESSAGE_RESULT=$(echo "$MESSAGE_RESPONSE" | head -n -1)

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Message sent successfully"
  echo "📊 Agent Response Structure:"
  echo "$MESSAGE_RESULT" | jq '.' 2>/dev/null || echo "$MESSAGE_RESULT"
  echo ""
else
  echo "❌ Message sending failed: HTTP $HTTP_STATUS"
  echo "$MESSAGE_RESULT"
  echo "⚠️ Continuing to check session state..."
fi

# Wait for processing
echo "⏳ Waiting for agent processing..."
sleep 3

# Step 3: Retrieve Final Session State
echo "🔍 Step 3: Retrieving Final Session State..."
echo "   URL: $SESSION_URL"

FINAL_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$SESSION_URL" \
  -H "Content-Type: application/json" \
  --connect-timeout 10 \
  --max-time 30)

# Extract HTTP status code
HTTP_STATUS=$(echo "$FINAL_RESPONSE" | tail -n1)
FINAL_DATA=$(echo "$FINAL_RESPONSE" | head -n -1)

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Session state retrieved successfully"
  echo "📊 Final Session Structure:"
  echo "$FINAL_DATA" | jq '.' 2>/dev/null || echo "$FINAL_DATA"
  
  # Analyze events structure
  echo ""
  echo "🎯 Event Analysis:"
  
  # Extract events count
  EVENTS_COUNT=$(echo "$FINAL_DATA" | jq '.events | length' 2>/dev/null || echo "0")
  echo "Total Events: $EVENTS_COUNT"
  
  if [ "$EVENTS_COUNT" -gt 0 ]; then
    echo ""
    echo "Event Details:"
    echo "$FINAL_DATA" | jq '.events[] | {
      id: .id,
      author: .author,
      timestamp: .timestamp,
      invocation_id: .invocation_id,
      content_parts_count: (.content.parts | length),
      content_preview: (.content.parts[0].text // .content.parts[0].functionCall.name // "No text/function"),
      actions: .actions,
      turn_complete: .turn_complete
    }' 2>/dev/null || echo "Could not parse events with jq"
  fi
  
else
  echo "❌ Session retrieval failed: HTTP $HTTP_STATUS"
  echo "$FINAL_DATA"
fi

echo ""
echo "🎉 Analysis Complete!"
echo "Check the output above for event structures and message formats."
