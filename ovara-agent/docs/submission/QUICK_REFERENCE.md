# Ovara Agent System - Quick Reference Guide

## System Overview
Multi-agent AI system built on Google ADK with hierarchical agent architecture for comprehensive project management.

## Agent Quick Reference

### 🎯 Gaia (Orchestrator)
- **Model**: gemini-2.0-flash-exp
- **Role**: Central coordinator and request router
- **Entry Point**: `app/orchestrator/agent.py`
- **Key Function**: Analyzes requests and routes to appropriate specialized agents

### 🔍 Discovery Agent
- **Model**: gemini-2.0-flash-exp  
- **Role**: Client discovery and requirement gathering
- **Entry Point**: `app/discovery/agent.py`
- **Key Tools**: Requirements, stakeholders, client info management

### 📄 Documentation Agent
- **Model**: gemini-2.0-flash-exp
- **Role**: Professional document generation
- **Entry Point**: `app/documentation/agent.py`
- **Key Tools**: SRS, contracts, proposals, technical specs

### 📅 Jarvis Agent
- **Model**: gemini-2.0-flash-exp
- **Role**: Scheduling and calendar management
- **Entry Point**: `app/jarvis/agent.py`
- **Key Features**: Role-based access, business policy enforcement

### 📋 Project Manager Agent
- **Model**: gemini-2.5-flash-lite-preview-06-17
- **Role**: Advanced project management with MCP integration
- **Entry Point**: `app/project_manager/agent.py`
- **Key Feature**: Python MCP Server integration for comprehensive project tools

## Key Files and Locations

### Core System Files
```
ovara-agent/
├── app/main.py                    # FastAPI server and entry point
├── mcp_server.py                  # Python MCP server for project management
├── lib/database_session_service.py # Session management
└── lib/db.py                      # MongoDB connection
```

### Agent Definitions
```
app/
├── orchestrator/agent.py          # Gaia orchestrator
├── discovery/agent.py             # Discovery agent
├── documentation/agent.py         # Documentation agent
├── jarvis/agent.py                # Jarvis scheduling agent
└── project_manager/agent.py       # Project manager with MCP
```

### Documentation
```
docs/
├── OVARA_AGENT_ARCHITECTURE.md    # Complete architecture documentation
├── AGENT_FUNCTIONALITY_GUIDE.md   # Detailed agent functionality
├── QUICK_REFERENCE.md             # This file
└── seamless-handover-architecture.md # ADK implementation details
```

## Running the System

### Local Development
```bash
# Navigate to ovara-agent directory
cd ovara-agent

# Activate virtual environment
source env/bin/activate  # Linux/Mac
# or
env\Scripts\activate     # Windows

# Navigate to app directory
cd app

# Run the system
python main.py
```

### Environment Variables
Required in `.env` file:
```
MONGODB_URI=mongodb://localhost:27017/orka_pro
DEBUG=false
DEBUG_LOGGING=false
```

## API Endpoints

### Core Endpoints
- `POST /run` - Execute agent with message
- `POST /sessions` - Create new session
- `GET /sessions/{session_id}` - Get session details
- `GET /health` - Health check

### Session Management
- `GET /sessions/user/{user_id}` - List user sessions
- `DELETE /sessions/{session_id}` - Delete session

## Agent Communication Patterns

### Request Flow
```
User → Frontend → main.py → ADK Runner → Gaia → Specialized Agent → Tools → Response
```

### Handoff Pattern
```python
# Example: Jarvis needs team info from Project Manager
if user_needs_team_info:
    team_info = project_manager_agent.get_team_members()
    schedule_meeting_with_team(team_info)
```

## MCP Server Integration

### Project Manager Tools
**Project Management**:
- `list_projects`, `get_project`, `create_project`, `update_project`

**Team Management**:
- `list_team_members`, `get_team_member`, `create_team_member`, `get_team_performance`

**Task Management**:
- `list_tasks`, `get_task`, `create_task`, `update_task`

**Analytics**:
- `get_project_progress`, `get_team_workload`

### MCP Server Startup
The MCP server is automatically started by the Project Manager agent via MCPToolset:
```python
MCPToolset(
    connection_params=StdioServerParameters(
        command="python3",
        args=[mcp_server_path],
        env={"MONGODB_URI": os.getenv("MONGODB_URI")}
    )
)
```

## Database Schema

### Key Collections
- **projects**: Project information and metadata
- **team_members**: Team member profiles and performance data
- **tasks**: Task details and assignments
- **clients**: Client information and contacts
- **organizations**: Organization settings and configuration
- **sessions**: ADK session state and conversation history

## Development Guidelines

### Adding New Agents
1. Create agent file in `app/{agent_name}/agent.py`
2. Define system prompt in `app/{agent_name}/prompt.py`
3. Add agent to Gaia's sub_agents list in `app/orchestrator/agent.py`
4. Update agent coordination knowledge in `app/shared/agent_coordination.py`

### Adding New Tools
1. Create ADK FunctionTool in appropriate agent file
2. For MCP tools, add to `mcp_server.py` ADK_PROJECT_TOOLS dictionary
3. Update tool documentation and agent capabilities

### Session State Management
Access session state in tools:
```python
def my_tool(tool_context: ToolContext):
    user_name = tool_context.state.get("user_name")
    client_id = tool_context.state.get("client_id")
    organization_id = tool_context.state.get("organization_id")
```

## Troubleshooting

### Common Issues
1. **MCP Server Connection**: Check MongoDB URI and server startup logs
2. **Agent Handoffs**: Verify agent coordination knowledge is up to date
3. **Session State**: Ensure session initialization includes required state
4. **Tool Execution**: Check tool parameter validation and error handling

### Debug Mode
Enable debug logging:
```bash
export DEBUG_LOGGING=true
python main.py
```

### Health Checks
- System health: `GET /health`
- MCP server: Check logs for "MCP Stdio Server: Starting handshake"
- Database: Verify MongoDB connection in startup logs

## Performance Considerations

### Optimization Tips
- Use batch operations for multiple tool calls
- Implement caching for frequently accessed data
- Monitor MCP server performance and connection pooling
- Optimize agent handoff patterns to minimize context switching

### Monitoring
- Track agent response times
- Monitor MCP server tool execution
- Watch database query performance
- Observe session state size and complexity

## Security Considerations

### Role-Based Access
- Client users have limited tool access
- Internal users have full system access
- Session state includes role information for access control

### Data Protection
- Session data encrypted in MongoDB
- Environment variables for sensitive configuration
- MCP server runs in isolated process with limited permissions

This quick reference provides essential information for developers working with the Ovara Agent System. For detailed implementation guidance, refer to the complete architecture and functionality documentation.
