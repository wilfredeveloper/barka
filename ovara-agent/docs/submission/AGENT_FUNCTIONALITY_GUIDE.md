# Ovara Agent Functionality and Interaction Guide

## Agent Roles and Responsibilities

### 🎯 Gaia - The Orchestrator
**Primary Function**: Central coordination and intelligent request routing

#### Core Responsibilities
- **Request Analysis**: Analyzes incoming user requests to determine the most appropriate agent
- **Workflow Orchestration**: Manages complex multi-agent workflows and handoffs
- **Context Management**: Maintains conversation context across agent transitions
- **User Experience**: Provides personalized interactions and consolidated responses

#### Decision Making Process
```
User Request → Analysis → Route to Appropriate Agent(s) → Coordinate Response
```

#### Routing Logic
- **Discovery Requests** → Discovery Agent (requirements, stakeholders, onboarding)
- **Documentation Needs** → Documentation Agent (SRS, contracts, proposals)
- **Scheduling Tasks** → Jarvis Agent (meetings, calendar management)
- **Project Operations** → Project Manager Agent (teams, tasks, analytics)
- **Complex Multi-Domain** → Coordinate multiple agents

---

### 🔍 Discovery Agent - Client Discovery Specialist
**Primary Function**: Comprehensive client onboarding and requirement gathering

#### Core Capabilities

##### 1. Client Information Management
- **Tool**: `get_client_info_persistent`
- **Function**: Retrieves and manages comprehensive client profiles
- **Data Includes**: Contact information, business details, project history

##### 2. Requirement Engineering
- **Tool**: `create_requirement_tool`
- **Function**: Documents functional and non-functional requirements
- **Process**: Structured requirement gathering with stakeholder validation

##### 3. Stakeholder Management
- **Tool**: `add_stakeholder_tool`, `list_stakeholders_tool`
- **Function**: Identifies and manages project stakeholders
- **Capabilities**: Role definition, contact management, influence mapping

##### 4. Discovery Workflow Management
- **Tools**: Todo management suite
- **Function**: Tracks discovery progress and actionable items
- **Features**: Status updates, priority management, completion tracking

#### Collaboration Patterns

**Discovery → Project Setup Flow**:
1. Gather comprehensive requirements and stakeholder information
2. Hand off to Project Manager for project structure creation
3. Coordinate with Jarvis for stakeholder meeting scheduling
4. Provide requirements to Documentation Agent for formal documentation

---

### 📄 Documentation Agent - Document Generation Specialist
**Primary Function**: Professional document creation and technical specification

#### Core Capabilities

##### 1. Software Requirements Specification (SRS)
- **Tool**: `generate_srs_persistent`, `get_srs_document_persistent`
- **Function**: Creates comprehensive technical requirements documents
- **Features**: Functional specs, non-functional requirements, acceptance criteria

##### 2. Contract Generation
- **Tool**: `generate_contract_persistent`, `get_contract_document_persistent`
- **Function**: Generates legally sound project contracts
- **Includes**: Scope, deliverables, timelines, payment terms

##### 3. Proposal Creation
- **Tool**: `generate_proposal_persistent`, `get_proposal_document_persistent`
- **Function**: Creates professional project proposals
- **Components**: Executive summary, technical approach, pricing

##### 4. Technical Specifications
- **Tool**: `generate_technical_spec_persistent`, `get_technical_spec_persistent`
- **Function**: Detailed technical documentation
- **Scope**: Architecture, APIs, implementation guidelines

#### Input Sources and Dependencies
- **Discovery Agent**: Requirements, stakeholder information, project scope
- **Project Manager**: Team information, project details, resource allocation
- **Client Specifications**: Business requirements, compliance needs

---

### 📅 Jarvis Agent - Scheduling Coordinator
**Primary Function**: Organization scheduling and calendar management

#### Core Responsibilities

##### 1. Role-Based Access Control
**Client Users Can**:
- Request business meetings (consultation, kickoff, review, demo)
- View their own scheduled meetings
- Check availability for meeting requests
- Receive meeting confirmations

**Internal Users Can**:
- Access full calendar management
- Schedule internal meetings
- Manage team availability
- Override scheduling policies when needed

##### 2. Business Policy Enforcement
- **Business Hours**: Strict adherence to organization schedule
- **Meeting Types**: Validates meeting purposes and participants
- **Resource Management**: Prevents double-booking and conflicts
- **Professional Boundaries**: Maintains separation between client and internal operations

##### 3. Team Coordination Integration
**Collaboration with Project Manager**:
```
User: "Schedule a meeting with the development team"
Jarvis: "Let me get the development team contact information"
→ Handoff to Project Manager for team member details
→ Return to Jarvis for calendar operations
```

#### Calendar Integration
- **External Calendar APIs**: Direct integration with calendar systems
- **Availability Checking**: Real-time availability verification
- **Meeting Management**: Creation, updates, cancellations
- **Notification System**: Automated meeting reminders and updates

---

### 📋 Project Manager Agent - Advanced Project Operations
**Primary Function**: Comprehensive project management with MCP server integration

#### MCP Server Architecture
The Project Manager uniquely integrates with a dedicated Python MCP Server providing:

##### 1. Project Portfolio Management
**Tools**:
- `list_projects`: Portfolio overview with filtering and search
- `get_project`: Comprehensive project details including team and tasks
- `create_project`: New project initialization with team assignment
- `update_project`: Project modification and status updates

**Capabilities**:
- Project lifecycle tracking
- Resource allocation and planning
- Timeline management
- Deliverable tracking

##### 2. Team Management System
**Tools**:
- `list_team_members`: Team roster with skills and availability
- `get_team_member`: Individual profiles with performance data
- `create_team_member`: Team onboarding and role assignment
- `get_team_performance`: Performance analytics and KPIs

**Features**:
- Skill matrix management
- Workload balancing
- Performance tracking
- Hourly rate and cost management

##### 3. Task Management Engine
**Tools**:
- `list_tasks`: Task portfolio with filtering and prioritization
- `get_task`: Detailed task information with dependencies
- `create_task`: Task creation with automatic team member resolution
- `update_task`: Status updates and progress tracking

**Capabilities**:
- Dependency management
- Priority-based scheduling
- Progress monitoring
- Automated status updates

##### 4. Analytics and Reporting
**Tools**:
- `get_project_progress`: Real-time project status and metrics
- `get_team_workload`: Resource utilization analysis
- Performance dashboards
- Predictive analytics for project delivery

#### Advanced Features

##### 1. Intelligent ID Resolution
- Automatically resolves team member names to IDs
- Fallback mechanisms for missing information
- Cross-reference validation

##### 2. Data Integrity Management
- Prevents orphaned task references
- Automatic metric calculations
- Consistency validation across entities

##### 3. Dual-Format Responses
- Returns both human-readable names and internal IDs
- Eliminates need for multi-step name resolution
- Reduces agent complexity

## Inter-Agent Communication Protocols

### 1. Seamless Handoff Process
```
1. Identify Need → Recognize when another agent's tools are required
2. Inform User → Explain which agent can better assist
3. Provide Context → Give clear information about capabilities
4. Smooth Transition → Use professional handoff language
5. Return Results → Consolidate responses for user
```

### 2. Context Preservation
- **Session State**: Maintained across all agent interactions
- **User Information**: Name, role, preferences preserved
- **Project Context**: Current project and client information
- **Conversation History**: Previous interactions and decisions

### 3. Professional Handoff Language
**Example Handoffs**:
- "I'll connect you with our Project Manager who has access to all team information"
- "Let me get you connected with our scheduling specialist for calendar coordination"
- "Our documentation expert can help create the formal specifications you need"

## System Integration Points

### 1. Database Integration
- **MongoDB**: Persistent storage for all project data
- **Session Management**: Conversation state and user context
- **Real-time Updates**: Live data synchronization

### 2. External API Integration
- **Calendar APIs**: Direct calendar system access
- **Authentication Systems**: Role-based access control
- **Notification Services**: Automated alerts and updates

### 3. Frontend Integration
- **Real-time Streaming**: Live event updates to frontend
- **Progressive Indicators**: Status updates during complex operations
- **Consolidated Responses**: Single response messages with business-relevant progress

## Best Practices for Agent Coordination

### 1. Know Your Strengths
- Each agent focuses on their specialized domain
- Recognize when other agents have better tools
- Maintain expertise boundaries

### 2. Seamless User Experience
- Make handoffs feel natural and professional
- Preserve context across transitions
- Provide clear explanations of capabilities

### 3. Efficient Collaboration
- Use batch operations when possible
- Minimize redundant tool calls
- Optimize for user experience over technical efficiency

### 4. Error Handling and Fallbacks
- Graceful degradation when tools are unavailable
- Clear error messages and alternative approaches
- Automatic retry mechanisms for transient failures

## MCP Server Technical Details

### Python MCP Server Implementation
The Project Manager agent uses a dedicated Python MCP Server (`mcp_server.py`) that provides:

#### 1. ADK Tool Integration
```python
# Tools are converted from ADK FunctionTool to MCP format
@app.list_tools()
async def list_mcp_tools() -> List[mcp_types.Tool]:
    return [adk_to_mcp_tool_type(tool) for tool in ADK_PROJECT_TOOLS.values()]

@app.call_tool()
async def call_mcp_tool(name: str, arguments: dict) -> List[mcp_types.TextContent]:
    adk_tool_instance = ADK_PROJECT_TOOLS[name]
    adk_tool_response = await adk_tool_instance.run_async(args=arguments)
    return [mcp_types.TextContent(type="text", text=json.dumps(adk_tool_response))]
```

#### 2. Database Connection Management
- **Lazy Connection**: Database connections established on first use
- **Connection Pooling**: Efficient MongoDB connection management
- **Error Handling**: Graceful degradation for database issues

#### 3. Tool Categories
**Project Tools**: 15+ tools for project lifecycle management
**Team Tools**: 10+ tools for team and member management
**Task Tools**: 8+ tools for task creation and tracking
**Analytics Tools**: 5+ tools for performance and progress analysis

### MCPToolset Integration
```python
# Project Manager agent configuration
tools=[
    MCPToolset(
        connection_params=StdioServerParameters(
            command="python3",
            args=[mcp_server_path],
            env={
                "MONGODB_URI": os.getenv("MONGODB_URI"),
                "DEBUG": "false"
            }
        )
    )
]
```

This comprehensive agent system provides a sophisticated, user-friendly project management experience through intelligent coordination of specialized AI agents, each optimized for their specific domain while maintaining seamless collaboration and context preservation.
