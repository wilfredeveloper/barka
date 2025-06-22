# Ovara Agent System Architecture Documentation

## Overview

The Ovara Agent System is a sophisticated multi-agent AI platform built on Google's ADK (Agent Development Kit) that provides comprehensive project management capabilities for software development agencies. The system uses a hierarchical agent architecture with specialized agents coordinated by a central orchestrator.

## System Architecture

### Core Components

#### 1. Entry Point (`app/main.py`)
- **FastAPI Server**: HTTP server handling agent communication
- **ADK Runner**: Manages agent execution and session handling
- **Database Session Service**: Persistent session management with MongoDB
- **Live Streaming**: Real-time event streaming for frontend integration

#### 2. Agent Hierarchy

The system follows a hierarchical multi-agent pattern with **Gaia** as the central orchestrator coordinating specialized sub-agents:

```
🎯 Gaia (Orchestrator)
├── 🔍 Discovery Agent
├── 📄 Documentation Agent  
├── 📅 Jarvis Agent
└── 📋 Project Manager Agent
```

#### 3. MCP Integration
- **Python MCP Server**: Provides project management tools via Model Context Protocol
- **MCPToolset**: ADK integration layer for seamless tool access
- **Direct MongoDB Access**: High-performance database operations

## Agent Specifications

### 🎯 Gaia - Orchestrator Agent
**Model**: `gemini-2.0-flash-exp`
**Role**: Central command and coordination hub

**Responsibilities**:
- Routes requests to appropriate specialized agents
- Manages multi-agent workflows and handoffs
- Provides high-level project oversight and coordination
- Handles complex requests requiring multiple agent collaboration

**Key Capabilities**:
- Intelligent request analysis and routing
- Context preservation across agent handoffs
- Multi-phase project lifecycle coordination
- Personalized user interactions with name recognition

### 🔍 Discovery Agent
**Model**: `gemini-2.0-flash-exp`
**Role**: Client discovery and requirement gathering specialist

**Responsibilities**:
- Comprehensive client onboarding and discovery
- Stakeholder identification and interview coordination
- Requirement gathering and scope definition
- Project foundation establishment

**Tools & Capabilities**:
- `get_client_info_persistent`: Client information management
- `create_requirement_tool`: Requirement documentation
- `add_stakeholder_tool`: Stakeholder management
- `list_requirements_tool`: Requirement tracking
- Todo management for discovery workflows

**Collaboration Patterns**:
- **→ Project Manager**: Handoff discovery results for project setup
- **→ Jarvis**: Coordinate stakeholder meetings
- **→ Documentation**: Provide requirements for formal documentation

### 📄 Documentation Agent
**Model**: `gemini-2.0-flash-exp`
**Role**: Professional document generation specialist

**Responsibilities**:
- Software Requirements Specification (SRS) generation
- Contract and proposal creation
- Technical specification documentation
- Legal and compliance documentation

**Tools & Capabilities**:
- `generate_srs_persistent`: SRS document creation
- `generate_contract_persistent`: Contract generation
- `generate_proposal_persistent`: Proposal creation
- `generate_technical_spec_persistent`: Technical documentation
- Document retrieval and management tools

**Input Sources**:
- Discovery Agent requirements and stakeholder information
- Project Manager project details and team information
- Client specifications and business requirements

### 📅 Jarvis Agent
**Model**: `gemini-2.0-flash-exp`
**Role**: Scheduling coordinator and calendar management specialist

**Responsibilities**:
- Organization calendar system management
- Client meeting request processing
- Business hours and policy enforcement
- Professional scheduling coordination

**Key Features**:
- **Role-based Access Control**: Different permissions for clients vs. internal users
- **Business Policy Enforcement**: Strict adherence to scheduling policies
- **Team Coordination**: Integration with Project Manager for team member information
- **Calendar API Integration**: Direct calendar system access

**Collaboration Patterns**:
- **→ Project Manager**: Get team member contact information for meetings
- **← Discovery**: Schedule stakeholder interviews and project meetings
- **Calendar APIs**: Direct integration for meeting management

### 📋 Project Manager Agent
**Model**: `gemini-2.5-flash-lite-preview-06-17`
**Role**: Comprehensive project management with advanced MCP integration

**Responsibilities**:
- Project lifecycle management
- Team coordination and task assignment
- Resource optimization and analytics
- Performance tracking and reporting

**MCP Server Integration**:
The Project Manager agent uniquely integrates with a dedicated Python MCP Server that provides:

**Project Management Tools**:
- `list_projects`: Project portfolio management
- `get_project`: Detailed project information
- `create_project`: New project initialization
- `update_project`: Project modification

**Team Management Tools**:
- `list_team_members`: Team roster management
- `get_team_member`: Individual team member details
- `create_team_member`: Team onboarding
- `get_team_performance`: Performance analytics

**Task Management Tools**:
- `list_tasks`: Task portfolio overview
- `get_task`: Detailed task information
- `create_task`: Task creation and assignment
- `update_task`: Task status and details management

**Analytics & Reporting Tools**:
- `get_project_progress`: Project status analytics
- `get_team_workload`: Resource utilization analysis
- Performance metrics and KPI tracking

## Technical Architecture

### Session Management
- **Database-backed Sessions**: Persistent conversation state in MongoDB
- **Context Preservation**: Seamless handoffs between agents maintain full context
- **User State Management**: Role-based permissions and personalization data
- **Session Resumption**: Conversations can be resumed across different interactions

### Communication Patterns

#### 1. HTTP Communication
- Frontend communicates with agents via HTTP POST to `/run` endpoint
- Real-time streaming responses for immediate user feedback
- Session-based conversation management

#### 2. Agent Handoffs
Agents use sophisticated handoff protocols:

```python
# Example handoff pattern
if user_needs_team_info:
    # Jarvis hands off to Project Manager
    team_info = project_manager_agent.get_team_members()
    # Returns to Jarvis for scheduling
    schedule_meeting_with_team(team_info)
```

#### 3. MCP Integration
The Project Manager agent uses MCPToolset for seamless tool access:

```python
MCPToolset(
    connection_params=StdioServerParameters(
        command="python3",
        args=[mcp_server_path],
        env={"MONGODB_URI": os.getenv("MONGODB_URI")}
    )
)
```

### Data Flow

1. **User Request** → Frontend → main.py → ADK Runner
2. **Request Analysis** → Gaia Orchestrator determines appropriate agent
3. **Agent Execution** → Specialized agent processes request with tools
4. **Cross-Agent Collaboration** → Agents hand off context as needed
5. **Response Consolidation** → Gaia consolidates multi-agent responses
6. **Streaming Response** → Real-time events streamed to frontend

## Deployment Architecture

### Container Structure
- **ovara-agent**: Python application with ADK framework
- **MCP Server**: Integrated Python MCP server for project management
- **MongoDB**: External database for session and project data
- **Environment Configuration**: Shared .env configuration across services

### Integration Points
- **Barka Frontend**: Next.js application consuming agent APIs
- **Barka Backend**: Node.js API server for additional services
- **Calendar APIs**: External calendar system integration
- **MongoDB Atlas**: Cloud database for production deployment

## Key Design Principles

### 1. Hierarchical Multi-Agent Pattern
- Central orchestrator with specialized sub-agents
- Clear separation of concerns and responsibilities
- Seamless context preservation across handoffs

### 2. Tool-Centric Architecture
- Each agent has specialized tools for their domain
- MCP integration for advanced project management capabilities
- Persistent memory and state management

### 3. Session-Based Continuity
- Database-backed session persistence
- Context preservation across conversations
- Role-based access control and personalization

### 4. Real-Time Streaming
- Live event streaming for immediate user feedback
- Progressive status indicators for complex operations
- Seamless user experience across agent transitions

This architecture enables the Ovara Agent System to provide comprehensive, intelligent project management capabilities while maintaining clear separation of concerns and seamless user experiences across complex multi-agent workflows.
