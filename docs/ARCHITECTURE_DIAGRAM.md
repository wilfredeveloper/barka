# Barka Platform - Architecture Diagram

## System Architecture Overview

The following diagram illustrates the complete architecture of the Barka platform, showing all services, technologies, and their interactions.

```mermaid
graph TB
    %% User Layer
    subgraph "👥 User Layer"
        U1[Super Admin]
        U2[Organization Admin]
        U3[Organization Client]
    end

    %% Frontend Layer
    subgraph "🎨 Frontend Layer (Port 3000)"
        subgraph "Next.js 15 Application"
            FE[React 19 Components]
            TW[Tailwind CSS]
            RHF[React Hook Form]
            DND[@dnd-kit Kanban]
            FM[Framer Motion]
            RU[Radix UI]
        end
    end

    %% API Gateway / Reverse Proxy
    subgraph "🌐 API Gateway"
        NGINX[Nginx Reverse Proxy<br/>SSL Termination<br/>Load Balancing]
    end

    %% Backend Layer
    subgraph "🔧 Backend Layer (Port 5000)"
        subgraph "Node.js/Express API"
            API[Express.js Server]
            AUTH[JWT Authentication]
            RBAC[Role-Based Access Control]
            WS[WebSocket Server]
            MCP[MCP Server Integration]
        end
        
        subgraph "API Controllers"
            AC1[Auth Controller]
            AC2[Project Controller]
            AC3[Task Controller]
            AC4[Team Controller]
            AC5[Analytics Controller]
            AC6[Client Controller]
        end
    end

    %% AI Agent Layer
    subgraph "🤖 AI Agent Layer (Port 5566)"
        subgraph "Ovara Agent System"
            GAIA[🎯 GAIA<br/>Main Orchestrator]
            
            subgraph "Specialized Agents"
                PM[📋 Project Manager Agent]
                DISC[🔍 Discovery Agent]
                DOC[📄 Documentation Agent]
                JAR[🤖 Jarvis Agent<br/>Calendar Scheduling]
            end
            
            FAST[FastAPI Server]
            ADK[Google ADK Integration]
            MCP_TOOLS[MCP Tools & Protocol]
        end
    end

    %% Database Layer
    subgraph "💾 Database Layer"
        subgraph "MongoDB Atlas"
            DB1[(Users Collection)]
            DB2[(Organizations Collection)]
            DB3[(Projects Collection)]
            DB4[(Tasks Collection)]
            DB5[(Team Members Collection)]
            DB6[(Conversations Collection)]
            DB7[(Messages Collection)]
            DB8[(Trash Collection)]
        end
        
        subgraph "Local Storage"
            SQLITE[(SQLite<br/>AI Session Data)]
        end
    end

    %% External Services
    subgraph "🌍 External Services"
        GCAL[Google Calendar API]
        GROQ[Groq API<br/>LLM Inference]
        QDRANT[Qdrant Vector DB<br/>Embeddings]
        MEM0[MEM0 API<br/>Memory Management]
        GCP[Google Cloud Platform]
    end

    %% Development & Deployment
    subgraph "🚀 Development & Deployment"
        subgraph "Runtime Environments"
            BUN[Bun Runtime<br/>Frontend & Backend]
            PYTHON[Python 3.8+<br/>AI Agents]
        end
        
        subgraph "Containerization"
            D1[Backend Container]
            D2[Frontend Container]
            D3[Agent Container]
            D4[Nginx Container]
            DC[Docker Compose<br/>Orchestration]
        end
    end

    %% Connections - User to Frontend
    U1 --> FE
    U2 --> FE
    U3 --> FE

    %% Frontend to Backend
    FE --> NGINX
    NGINX --> API
    NGINX --> WS

    %% Backend Internal Connections
    API --> AUTH
    API --> RBAC
    API --> AC1
    API --> AC2
    API --> AC3
    API --> AC4
    API --> AC5
    API --> AC6

    %% Backend to Database
    AC1 --> DB1
    AC2 --> DB3
    AC3 --> DB4
    AC4 --> DB5
    AC5 --> DB1
    AC6 --> DB2
    AUTH --> DB1
    WS --> DB6
    WS --> DB7

    %% Backend to AI Agent
    MCP --> FAST
    API --> FAST

    %% AI Agent Internal
    FAST --> GAIA
    GAIA --> PM
    GAIA --> DISC
    GAIA --> DOC
    GAIA --> JAR
    ADK --> SQLITE
    MCP_TOOLS --> PM

    %% AI Agent to External Services
    JAR --> GCAL
    GAIA --> GROQ
    PM --> QDRANT
    DISC --> MEM0
    ADK --> GCP

    %% AI Agent to Database
    PM --> DB3
    PM --> DB4
    PM --> DB5
    DISC --> DB2
    GAIA --> DB6
    GAIA --> DB7

    %% Deployment Connections
    DC --> D1
    DC --> D2
    DC --> D3
    DC --> D4
    BUN --> D1
    BUN --> D2
    PYTHON --> D3

    %% Styling
    classDef userClass fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef frontendClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef backendClass fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef aiClass fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef dbClass fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef externalClass fill:#f1f8e9,stroke:#33691e,stroke-width:2px
    classDef deployClass fill:#e3f2fd,stroke:#0d47a1,stroke-width:2px

    class U1,U2,U3 userClass
    class FE,TW,RHF,DND,FM,RU frontendClass
    class API,AUTH,RBAC,WS,MCP,AC1,AC2,AC3,AC4,AC5,AC6 backendClass
    class GAIA,PM,DISC,DOC,JAR,FAST,ADK,MCP_TOOLS aiClass
    class DB1,DB2,DB3,DB4,DB5,DB6,DB7,DB8,SQLITE dbClass
    class GCAL,GROQ,QDRANT,MEM0,GCP externalClass
    class BUN,PYTHON,D1,D2,D3,D4,DC deployClass
```

## Technology Stack Details

### Frontend Technologies
- **Next.js 15:** React framework with App Router
- **React 19:** Latest React with concurrent features
- **Tailwind CSS:** Utility-first CSS framework
- **Radix UI:** Accessible component primitives
- **@dnd-kit:** Modern drag-and-drop library
- **Framer Motion:** Animation library
- **React Hook Form:** Performant form library
- **Zod:** TypeScript-first schema validation

### Backend Technologies
- **Node.js:** JavaScript runtime
- **Express.js:** Web application framework
- **Mongoose:** MongoDB object modeling
- **JWT:** JSON Web Token authentication
- **bcrypt:** Password hashing
- **WebSocket:** Real-time communication
- **Express-validator:** Input validation
- **Helmet:** Security middleware
- **CORS:** Cross-origin resource sharing

### AI Agent Technologies
- **Python 3.8+:** Programming language
- **FastAPI:** Modern web framework
- **Google ADK:** AI Development Kit
- **SQLite:** Embedded database
- **MCP:** Model Context Protocol
- **Pydantic:** Data validation
- **Asyncio:** Asynchronous programming

### Database & Storage
- **MongoDB Atlas:** Cloud-hosted NoSQL database
- **SQLite:** Local embedded database
- **Qdrant:** Vector database for embeddings
- **File System:** Document and media storage

### External APIs
- **Google Calendar API:** Calendar integration
- **Groq API:** High-performance LLM inference
- **MEM0 API:** Advanced memory management
- **Google Cloud Platform:** Authentication and services

### Development & Deployment
- **Bun:** Fast JavaScript runtime and package manager
- **Docker:** Containerization platform
- **Docker Compose:** Multi-container orchestration
- **Nginx:** Reverse proxy and load balancer
- **Git:** Version control system

## Data Flow Architecture

### User Request Flow
1. **User Interaction** → Frontend (React components)
2. **API Request** → Nginx (reverse proxy)
3. **Route Processing** → Express.js (backend)
4. **Authentication** → JWT validation
5. **Authorization** → Role-based access control
6. **Data Processing** → Controllers and models
7. **Database Query** → MongoDB Atlas
8. **Response** → JSON API response
9. **UI Update** → React state management

### AI Agent Flow
1. **User Message** → Frontend chat interface
2. **API Call** → Backend agent route
3. **Agent Request** → Ovara Agent FastAPI
4. **Orchestration** → GAIA main orchestrator
5. **Agent Selection** → Specialized agent routing
6. **Tool Execution** → MCP protocol tools
7. **External API** → Google Calendar, Groq, etc.
8. **Response Processing** → Agent response formatting
9. **Database Update** → Conversation and session storage
10. **Real-time Update** → WebSocket notification

### Real-time Communication
1. **WebSocket Connection** → Persistent client connection
2. **Event Trigger** → Database change or user action
3. **Event Broadcasting** → All connected clients
4. **UI Synchronization** → Real-time interface updates

This architecture provides a scalable, maintainable, and feature-rich platform that combines traditional web application patterns with modern AI capabilities.
