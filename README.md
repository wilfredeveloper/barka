# Barka Platform - Monorepo

> **🎉 Successfully migrated to monorepo structure on June 20, 2025**  
> All services now unified in a single repository while maintaining zero disruption to existing workflows.

## Overview

Barka is a comprehensive project management platform consisting of three main services:

- **🔧 barka-backend** - Node.js/Express API server with MongoDB
- **🎨 barka-frontend** - Next.js React application with modern UI
- **🤖 ovara-agent** - Python FastAPI intelligent agent service

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js & Bun (for development)
- Python 3.8+ (for ovara-agent development)

### Production Deployment
```bash
# Clone the repository
git clone <repository-url> barka
cd barka

# Deploy all services
./deploy.sh deploy

# Check status
./deploy.sh status
```

### Development Setup
```bash
# Start all services for development
./start-barka.sh

# Or start individual services
cd barka-backend && bun dev     # Backend on :5000
cd barka-frontend && bun dev    # Frontend on :3000
cd ovara-agent && python main.py # Agent on :5566
```

## Repository Structure

```
barka/
├── 📁 barka-backend/          # Node.js/Express backend
│   ├── controllers/           # API controllers
│   ├── models/               # MongoDB models
│   ├── routes/               # API routes
│   ├── middleware/           # Express middleware
│   ├── utils/                # Utility functions
│   ├── mcp-server/           # MCP server implementation
│   └── Dockerfile            # Backend container config
│
├── 📁 barka-frontend/         # Next.js frontend
│   ├── src/app/              # Next.js app directory
│   ├── src/components/       # React components
│   ├── src/lib/              # Utility libraries
│   ├── src/hooks/            # Custom React hooks
│   ├── src/types/            # TypeScript definitions
│   └── Dockerfile            # Frontend container config
│
├── 📁 ovara-agent/            # Python FastAPI agent
│   ├── app/                  # Main application
│   ├── lib/                  # Core libraries
│   ├── models/               # Data models
│   ├── utils/                # Utility functions
│   ├── docs/                 # Documentation
│   └── Dockerfile            # Agent container config
│
├── 📁 nginx/                  # Nginx configuration
├── 📁 mongo-init/             # MongoDB initialization
├── 🐳 docker-compose.yml     # Main deployment config
├── 🐳 docker-compose.dev.yml # Development overrides
├── 🐳 docker-compose.prod.yml# Production overrides
├── 🚀 deploy.sh              # Deployment script
├── 🛠️ start-barka.sh         # Development startup
└── 📚 MONOREPO_MIGRATION.md  # Migration documentation
```

## Services

### 🔧 Barka Backend
- **Technology:** Node.js, Express, MongoDB, Mongoose
- **Port:** 5000
- **Features:** REST API, WebSocket support, JWT authentication
- **Documentation:** See `barka-backend/README.md`

### 🎨 Barka Frontend  
- **Technology:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Port:** 3000
- **Features:** Modern UI, Real-time updates, Responsive design
- **Documentation:** See `barka-frontend/README.md`

### 🤖 Ovara Agent
- **Technology:** Python, FastAPI, Google ADK, MCP
- **Port:** 5566
- **Features:** AI agents, Calendar integration, Project management
- **Documentation:** See `ovara-agent/docs/README.md`

## Development Workflow

### Working with Individual Services
```bash
# Backend development
cd barka-backend
bun install
bun dev

# Frontend development  
cd barka-frontend
bun install
bun dev

# Agent development
cd ovara-agent
python -m venv env
source env/bin/activate
pip install -r requirements.txt
python app/main.py
```

### Cross-Service Development
```bash
# Make changes across services
git add barka-backend/ barka-frontend/
git commit -m "Add cross-service feature"

# Test all services together
./start-barka.sh
```

## Deployment

### Using Deploy Script
```bash
# Full deployment
./deploy.sh deploy [development|production]

# Build only
./deploy.sh build

# Start/stop services
./deploy.sh start
./deploy.sh stop

# View logs
./deploy.sh logs [service-name]

# Cleanup
./deploy.sh cleanup
```

### Manual Docker Commands
```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Environment Configuration

### Required Environment Variables
Create a `.env` file in the root directory:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/barka

# Authentication
JWT_SECRET=your-jwt-secret

# API Configuration
CORS_ORIGIN=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:5000

# Ovara Agent
GOOGLE_API_KEY=your-google-api-key
GROQ_API_KEY=your-groq-api-key
QDRANT_API_KEY=your-qdrant-api-key
QDRANT_URL=your-qdrant-url
```

## Testing

### Backend Tests
```bash
cd barka-backend
bun test
```

### Frontend Tests
```bash
cd barka-frontend
bun test
```

### Agent Tests
```bash
cd ovara-agent
python -m pytest tests/
```

## Contributing

### Git Workflow
1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes in relevant service directories
3. Test changes: `./start-barka.sh` or `./deploy.sh build`
4. Commit with descriptive message
5. Push and create pull request

### Code Style
- **Backend:** ESLint + Prettier
- **Frontend:** ESLint + Prettier + TypeScript
- **Agent:** Black + isort + mypy

## Monitoring & Logs

### Service Health
```bash
# Check all services
./deploy.sh status

# Individual service logs
docker-compose logs backend
docker-compose logs frontend  
docker-compose logs ovara-agent
```

### Health Endpoints
- Backend: `http://localhost:5000/`
- Frontend: `http://localhost:3000/`
- Agent: `http://localhost:5566/list-apps`

## Migration Information

This repository was migrated from three separate repositories on **June 20, 2025**:
- `barka-backend` → `barka-backend/`
- `barka-frontend` → `barka-frontend/`  
- `ovara-agent` → `ovara-agent/`

For detailed migration information, see [MONOREPO_MIGRATION.md](./MONOREPO_MIGRATION.md).

## Support

### Documentation
- [Migration Guide](./MONOREPO_MIGRATION.md)
- [Deployment Guide](./DOCKER_DEPLOYMENT.md)
- [Backend API](./barka-backend/README.md)
- [Frontend Guide](./barka-frontend/README.md)
- [Agent Documentation](./ovara-agent/docs/README.md)

### Troubleshooting
1. **Port conflicts:** Check if services are already running
2. **Build failures:** Ensure all dependencies are installed
3. **Database issues:** Verify MongoDB connection
4. **Permission errors:** Check file permissions and Docker access

---

**Status:** ✅ Fully Operational  
**Last Updated:** June 20, 2025  
**Migration:** ✅ Complete
