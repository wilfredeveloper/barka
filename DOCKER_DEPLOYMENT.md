# Barka Platform Docker Deployment Guide

This guide provides comprehensive instructions for containerizing and deploying the Barka platform using Docker.

## 🏗️ Architecture Overview

The Barka platform consists of 3 main applications:

1. **barka-backend** - Node.js/Express API server (Bun runtime)
2. **barka-frontend** - Next.js React application (Bun runtime)
3. **ovara-agent** - Python orchestrator with sub-agents (includes MCP server)

**Database**: Uses external MongoDB Atlas cluster (configured in ovara-agent .env)

**Ovara Agent Architecture**:
- Entry point: `app/main.py`
- Runs orchestrator agent with multiple sub-agents
- Project manager sub-agent automatically starts MCP server via MCPToolset

## 📋 Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB RAM available
- 10GB free disk space

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

### 2. Configure Google Cloud (for Ovara Agent)

The Google Cloud service account key is already present. If you need to update it:
```bash
# Copy your service account key to ovara-agent directory
cp /path/to/your/service-account-key.json ovara-agent/service-account-key.json
```

### 3. Setup Google Calendar Authentication (MANDATORY)

The Ovara Agent requires Google Calendar OAuth authentication. Run the setup script:
```bash
# Run the calendar authentication setup
./setup-calendar-auth.sh
```

This script will:
- Set up the Python environment
- Run the OAuth flow for Google Calendar
- Save the authentication token for Docker deployment

**Important**: This step is mandatory and must be completed before Docker deployment.

### 4. Deploy

```bash
# Deploy all services
./deploy.sh deploy

# Or deploy for production
./deploy.sh deploy production
```

## 📁 Project Structure

```
barka/
├── barka-backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   └── ... (backend source)
├── barka-frontend/
│   ├── Dockerfile
│   ├── .dockerignore
│   └── ... (frontend source)
├── ovara-agent/
│   ├── Dockerfile
│   ├── .dockerignore
│   └── ... (agent source)
├── docker-compose.yml
├── docker-compose.prod.yml
├── deploy.sh
├── .env.example
└── DOCKER_DEPLOYMENT.md
```

## 🔧 Configuration

### Environment Variables

Key environment variables in `.env` (from ovara-agent configuration):

```bash
# Database (MongoDB Atlas)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/orka_pro

# Security
JWT_SECRET=your-jwt-secret

# URLs
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=ws://localhost:5000
CORS_ORIGIN=http://localhost:3000

# Ovara Agent APIs
GOOGLE_API_KEY=your-google-api-key
GROQ_API_KEY=your-groq-api-key
QDRANT_API_KEY=your-qdrant-api-key
QDRANT_URL=your-qdrant-url
MEM0_API_KEY=your-mem0-api-key
```

### Production Configuration

For production deployment:

1. Update URLs in `.env`:
```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com
CORS_ORIGIN=https://yourdomain.com
```

2. Use strong passwords and secrets
3. Configure SSL certificates (see nginx configuration)

## 🐳 Docker Services

### Service Ports

- **Frontend**: 3000
- **Backend**: 5000
- **Ovara Agent**: 5566 (configurable via OVARA_PORT)
- **MongoDB**: External Atlas cluster
- **Nginx** (production): 80, 443

### Health Checks

All services include health checks:
- MongoDB: `mongosh --eval "db.adminCommand('ping')"`
- Backend: `curl -f http://localhost:5000/`
- Frontend: `curl -f http://localhost:3000/`
- Ovara Agent: `curl -f http://localhost:8000/health`

## 🛠️ Deployment Commands

### Full System Deployment

```bash
# Deploy all services (development)
./deploy.sh deploy

# Deploy all services (production)
./deploy.sh deploy production

# Deploy all services with cache (faster)
./deploy.sh deploy --cache
./deploy.sh deploy production --cache

# Build all images (clean build)
./deploy.sh build

# Build all images with cache (faster)
./deploy.sh build --cache

# Start all services (without building)
./deploy.sh start

# Stop all services
./deploy.sh stop

# Restart all services
./deploy.sh restart

# Show service status
./deploy.sh status

# View logs (all services)
./deploy.sh logs

# View logs for specific service
./deploy.sh logs backend

# Cleanup (stop and remove volumes)
./deploy.sh cleanup
```

### Single Service Deployment (⚡ Fast Rebuilds)

For faster development when you only change one service:

```bash
# Build only specific service (clean build)
./deploy.sh build frontend
./deploy.sh build backend
./deploy.sh build ovara-agent

# Build only specific service with cache (faster)
./deploy.sh build frontend --cache
./deploy.sh build backend --cache
./deploy.sh build ovara-agent --cache

# Deploy only specific service (development)
./deploy.sh deploy-service frontend
./deploy.sh deploy-service backend
./deploy.sh deploy-service ovara-agent

# Deploy only specific service with cache (faster)
./deploy.sh deploy-service frontend --cache
./deploy.sh deploy-service backend --cache
./deploy.sh deploy-service ovara-agent --cache

# Deploy only specific service (production)
./deploy.sh deploy-service frontend production
./deploy.sh deploy-service backend production
./deploy.sh deploy-service ovara-agent production

# Deploy only specific service (production with cache)
./deploy.sh deploy-service frontend production --cache
./deploy.sh deploy-service backend production --cache
./deploy.sh deploy-service ovara-agent production --cache

# Restart only specific service
./deploy.sh restart-service frontend
./deploy.sh restart-service backend production
./deploy.sh restart-service ovara-agent

# Restart only specific service with cache (faster)
./deploy.sh restart-service frontend --cache
./deploy.sh restart-service backend production --cache
./deploy.sh restart-service ovara-agent --cache
```

### Cache Control Options

All build and deploy commands support the `--cache` option for faster builds:

| Command Type | Default (Clean Build) | With --cache (Faster) |
|--------------|----------------------|----------------------|
| **Docker Command** | `docker-compose build --no-cache` | `docker-compose build` |
| **Build Time** | 3-10 minutes | 30 seconds - 3 minutes |
| **Use Case** | First build, major changes | Incremental changes, development |

### Benefits of Single Service Deployment

- ⚡ **Faster builds**: Only rebuild the service you changed
- 🎯 **Targeted deployment**: No unnecessary service restarts
- 🔧 **Development efficiency**: Quick iteration on individual services
- 💰 **Resource efficient**: Less CPU/memory usage during builds
- 🚀 **Cache control**: Choose between clean builds and cached builds

### Manual Docker Commands

#### Full System Commands
```bash
# Build and start all services (development)
docker-compose up -d --build

# Build and start all services (production)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# View logs (all services)
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

#### Single Service Commands
```bash
# Build specific service
docker-compose build frontend
docker-compose build backend
docker-compose build ovara-agent

# Start specific service
docker-compose up -d frontend
docker-compose up -d backend
docker-compose up -d ovara-agent

# Restart specific service
docker-compose restart frontend
docker-compose restart backend
docker-compose restart ovara-agent

# Stop specific service
docker-compose stop frontend
docker-compose stop backend
docker-compose stop ovara-agent

# View logs for specific service
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f ovara-agent

# Rebuild and restart specific service
docker-compose up -d --build frontend
docker-compose up -d --build backend
docker-compose up -d --build ovara-agent
```

## � Development Workflow

### Efficient Development with Single Service Deployment

When developing, you typically work on one service at a time. Use these workflows for maximum efficiency:

#### Frontend Development
```bash
# Initial setup - deploy all services
./deploy.sh deploy

# Make frontend changes, then rebuild only frontend (clean build)
./deploy.sh deploy-service frontend

# Make frontend changes, then rebuild only frontend (with cache - faster)
./deploy.sh deploy-service frontend --cache

# View frontend logs
./deploy.sh logs frontend
```

#### Backend Development
```bash
# Make backend changes, then rebuild only backend (clean build)
./deploy.sh deploy-service backend

# Make backend changes, then rebuild only backend (with cache - faster)
./deploy.sh deploy-service backend --cache

# View backend logs
./deploy.sh logs backend

# Test backend health
curl http://localhost:5000/health
```

#### AI Agent Development
```bash
# Make agent changes, then rebuild only agent (clean build)
./deploy.sh deploy-service ovara-agent

# Make agent changes, then rebuild only agent (with cache - faster)
./deploy.sh deploy-service ovara-agent --cache

# View agent logs
./deploy.sh logs ovara-agent

# Test agent health
curl http://localhost:5566/health
```

#### Cross-Service Development
```bash
# When changes affect multiple services (clean build)
./deploy.sh build frontend backend    # Build specific services
./deploy.sh deploy                    # Deploy all services

# When changes affect multiple services (with cache - faster)
./deploy.sh build frontend backend --cache
./deploy.sh deploy --cache
```

#### Cache Strategy for Development

**Use clean builds (default) when:**
- First time building
- Major dependency changes (package.json, requirements.txt)
- Dockerfile changes
- When builds are acting strange

**Use cached builds (--cache) when:**
- Small code changes
- Quick testing iterations
- No dependency changes
- Development speed is priority

```bash
# Example development workflow
./deploy.sh deploy                           # Initial clean deployment
./deploy.sh deploy-service frontend --cache  # Quick frontend iteration
./deploy.sh deploy-service backend --cache   # Quick backend iteration
./deploy.sh deploy                           # Clean build when needed
```

### Time Comparison

| Deployment Type | Clean Build | With --cache | Use Case |
|----------------|-------------|--------------|----------|
| Full deployment | 5-10 minutes | 2-5 minutes | Initial setup, major changes |
| Single service | 1-3 minutes | 30 seconds - 1 minute | Individual service changes |
| Service restart | 10-30 seconds | 10-30 seconds | Configuration changes |
| Build only | 2-8 minutes | 30 seconds - 2 minutes | Testing builds without deployment |

## ⚡ Cache Control Best Practices

### Understanding Docker Build Cache

Docker build cache speeds up builds by reusing layers from previous builds. However, it may miss changes in some scenarios.

### When to Use Clean Builds (Default)

```bash
# Use default (no --cache) for:
./deploy.sh deploy                    # Production deployments
./deploy.sh build frontend           # After dependency changes
./deploy.sh deploy-service backend   # After Dockerfile modifications
```

**Scenarios requiring clean builds:**
- **Dependency changes**: Updated package.json, requirements.txt, go.mod
- **Dockerfile changes**: Modified build instructions
- **Environment changes**: New environment variables affecting build
- **Production deployments**: Ensure completely clean, reproducible builds
- **Troubleshooting**: When cached builds behave unexpectedly

### When to Use Cached Builds (--cache)

```bash
# Use --cache for:
./deploy.sh deploy --cache                    # Development iterations
./deploy.sh build frontend --cache           # Code-only changes
./deploy.sh deploy-service backend --cache   # Quick testing
```

**Scenarios ideal for cached builds:**
- **Code changes only**: Modified source files without dependency changes
- **Development iterations**: Quick testing of changes
- **Configuration changes**: Updated config files
- **Documentation updates**: Non-functional changes
- **Rapid prototyping**: Fast feedback cycles

### Cache Control Examples

```bash
# Development workflow example
./deploy.sh deploy                           # Initial clean deployment
./deploy.sh deploy-service frontend --cache  # Quick frontend changes
./deploy.sh deploy-service frontend --cache  # More frontend changes
./deploy.sh build backend                    # Clean build after package.json change
./deploy.sh deploy-service backend --cache   # Quick backend changes
./deploy.sh deploy                           # Final clean deployment

# Production deployment
./deploy.sh deploy production                # Always use clean builds for production

# Troubleshooting
./deploy.sh build frontend                   # Clean build to resolve cache issues
./deploy.sh deploy-service frontend          # Deploy with clean build
```

### Cache Troubleshooting

If you experience issues with cached builds:

1. **Try a clean build first:**
   ```bash
   ./deploy.sh build <service>  # Remove --cache
   ```

2. **Clear Docker cache manually:**
   ```bash
   docker system prune -f
   docker builder prune -f
   ```

3. **Force rebuild specific service:**
   ```bash
   docker-compose build --no-cache <service>
   ```

## �🔍 Monitoring and Troubleshooting

### Check Service Status

```bash
# View running containers
docker-compose ps

# Check service health
docker-compose exec backend curl -f http://localhost:5000/
docker-compose exec frontend curl -f http://localhost:3000/
docker-compose exec ovara-agent curl -f http://localhost:5566/health
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f ovara-agent
docker-compose logs -f mongodb
```

### Common Issues

1. **Port conflicts**: Ensure ports 3000, 5000, 8000, 27017 are available
2. **Memory issues**: Ensure sufficient RAM (4GB+ recommended)
3. **Permission issues**: Check file permissions for service account key
4. **Network issues**: Verify Docker network configuration

## 🔒 Security Considerations

### Production Security

1. **Change default passwords**: Update all default passwords in `.env`
2. **Use secrets management**: Consider Docker secrets for sensitive data
3. **Network security**: Use internal networks for service communication
4. **SSL/TLS**: Configure HTTPS with valid certificates
5. **Firewall**: Restrict access to necessary ports only

### Environment Variables Security

Never commit `.env` files to version control. Use:
- Environment-specific `.env` files
- CI/CD secret management
- Docker secrets for production

## 📊 Performance Optimization

### Resource Limits

Production configuration includes resource limits:
- **Backend**: 1GB RAM, 0.5 CPU
- **Frontend**: 512MB RAM, 0.5 CPU
- **Ovara Agent**: 1GB RAM, 0.5 CPU
- **MongoDB**: 2GB RAM, 1.0 CPU

### Scaling

For horizontal scaling:
```bash
# Scale backend service
docker-compose up -d --scale backend=3

# Use load balancer (nginx) for distribution
```

## 🚀 Production Deployment

### With Nginx Reverse Proxy

1. Configure nginx (create `nginx/nginx.conf`)
2. Setup SSL certificates in `nginx/ssl/`
3. Deploy with production compose:

```bash
./deploy.sh deploy production
```

### Cloud Deployment

For cloud deployment (AWS, GCP, Azure):
1. Use managed database services
2. Configure container orchestration (ECS, GKE, AKS)
3. Setup load balancers and auto-scaling
4. Configure monitoring and logging

## 📝 Maintenance

### Backup

```bash
# Backup MongoDB data
docker-compose exec mongodb mongodump --out /data/backup

# Copy backup from container
docker cp barka-mongodb:/data/backup ./mongodb-backup
```

### Updates

```bash
# Pull latest images
docker-compose pull

# Rebuild and restart
./deploy.sh restart production
```

## 🆘 Support

For issues and questions:
1. Check logs: `./deploy.sh logs`
2. Verify configuration: `./deploy.sh status`
3. Review this documentation
4. Check Docker and Docker Compose documentation
