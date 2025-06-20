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

### Basic Commands

```bash
# Deploy all services
./deploy.sh deploy

# Deploy for production
./deploy.sh deploy production

# Build images only
./deploy.sh build

# Start services (without building)
./deploy.sh start

# Stop services
./deploy.sh stop

# Restart services
./deploy.sh restart

# Show service status
./deploy.sh status

# View logs
./deploy.sh logs

# View logs for specific service
./deploy.sh logs backend

# Cleanup (stop and remove volumes)
./deploy.sh cleanup
```

### Manual Docker Commands

```bash
# Build and start development
docker-compose up -d --build

# Build and start production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## 🔍 Monitoring and Troubleshooting

### Check Service Status

```bash
# View running containers
docker-compose ps

# Check service health
docker-compose exec backend curl -f http://localhost:5000/
docker-compose exec frontend curl -f http://localhost:3000/
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
