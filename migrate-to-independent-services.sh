#!/bin/bash

echo "🚀 Barka Independent Services Migration Script"
echo "=============================================="

# Configuration
WORKSPACE_DIR="/home/wilfredeveloper/Desktop"
MONOREPO_DIR="$WORKSPACE_DIR/barka"
SERVICES=("frontend" "backend" "agent")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if we're in the right directory
    if [ ! -d "$MONOREPO_DIR" ]; then
        log_error "Monorepo directory not found: $MONOREPO_DIR"
        exit 1
    fi
    
    # Check if Git is available
    if ! command -v git &> /dev/null; then
        log_error "Git is not installed"
        exit 1
    fi
    
    # Check if we're in a Git repository
    cd "$MONOREPO_DIR"
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Not in a Git repository"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Extract service to independent repository
extract_service() {
    local service=$1
    local service_dir=""
    local repo_name=""
    
    case $service in
        "frontend")
            service_dir="barka-frontend"
            repo_name="barka-frontend"
            ;;
        "backend")
            service_dir="barka-backend"
            repo_name="barka-backend"
            ;;
        "agent")
            service_dir="ovara-agent"
            repo_name="ovara-agent"
            ;;
    esac
    
    log_info "Extracting $service service..."
    
    cd "$MONOREPO_DIR"
    
    # Create a branch with only the service files
    log_info "Creating subtree for $service_dir..."
    git subtree split --prefix="$service_dir" -b "$service-extraction" || {
        log_error "Failed to create subtree for $service"
        return 1
    }
    
    # Create new directory for the independent service
    local independent_dir="$WORKSPACE_DIR/$repo_name-independent"
    log_info "Creating independent repository at $independent_dir..."
    
    mkdir -p "$independent_dir"
    cd "$independent_dir"
    
    # Initialize new Git repository
    git init
    git pull "$MONOREPO_DIR" "$service-extraction"
    
    # Add platform-specific configurations
    case $service in
        "frontend")
            add_frontend_config
            ;;
        "backend")
            add_backend_config
            ;;
        "agent")
            add_agent_config
            ;;
    esac
    
    # Initial commit
    git add .
    git commit -m "Initial commit: Independent $service service

- Extracted from monorepo
- Added platform-specific configuration
- Ready for independent deployment"
    
    log_success "$service service extracted to $independent_dir"
    
    # Cleanup
    cd "$MONOREPO_DIR"
    git branch -D "$service-extraction" 2>/dev/null || true
}

# Add frontend-specific configuration
add_frontend_config() {
    log_info "Adding Vercel configuration..."
    
    cat > vercel.json << 'EOF'
{
  "buildCommand": "bun run build",
  "outputDirectory": ".next",
  "installCommand": "bun install",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_API_URL": "@backend-url",
    "NEXT_PUBLIC_AGENT_URL": "@agent-url",
    "NEXT_PUBLIC_ENVIRONMENT": "@environment"
  }
}
EOF
    
    cat > deploy.sh << 'EOF'
#!/bin/bash
echo "🚀 Deploying Frontend to Vercel..."

# Install Vercel CLI if not present
if ! command -v vercel &> /dev/null; then
    npm i -g vercel
fi

# Deploy to production
vercel --prod --yes

echo "✅ Frontend deployed successfully!"
EOF
    
    chmod +x deploy.sh
    
    # Update package.json
    if [ -f package.json ]; then
        # Add deployment script if not present
        if ! grep -q '"deploy"' package.json; then
            sed -i '/"scripts": {/a\    "deploy": "./deploy.sh",' package.json
        fi
    fi
}

# Add backend-specific configuration
add_backend_config() {
    log_info "Adding Railway configuration..."
    
    cat > railway.json << 'EOF'
{
  "deploy": {
    "startCommand": "bun start",
    "buildCommand": "bun install",
    "healthcheckPath": "/health"
  }
}
EOF
    
    cat > Procfile << 'EOF'
web: bun start
EOF
    
    cat > deploy.sh << 'EOF'
#!/bin/bash
echo "🚀 Deploying Backend to Railway..."

# Install Railway CLI if not present
if ! command -v railway &> /dev/null; then
    npm install -g @railway/cli
fi

# Deploy to production
railway login
railway deploy

echo "✅ Backend deployed successfully!"
EOF
    
    chmod +x deploy.sh
    
    # Add health check endpoint to server.js if it doesn't exist
    if [ -f server.js ] && ! grep -q "/health" server.js; then
        cat >> server.js << 'EOF'

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'barka-backend'
  });
});
EOF
    fi
}

# Add agent-specific configuration
add_agent_config() {
    log_info "Adding Cloud Run configuration..."
    
    cat > cloudbuild.yaml << 'EOF'
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/ovara-agent', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/ovara-agent']
  - name: 'gcr.io/cloud-builders/gcloud'
    args: [
      'run', 'deploy', 'ovara-agent',
      '--image', 'gcr.io/$PROJECT_ID/ovara-agent',
      '--region', 'us-central1',
      '--platform', 'managed',
      '--allow-unauthenticated'
    ]
EOF
    
    cat > deploy.sh << 'EOF'
#!/bin/bash
echo "🚀 Deploying AI Agent to Cloud Run..."

# Build and deploy
gcloud run deploy ovara-agent \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --max-instances 10

echo "✅ AI Agent deployed successfully!"
EOF
    
    chmod +x deploy.sh
    
    # Ensure Dockerfile exists and is optimized
    if [ ! -f Dockerfile ]; then
        cat > Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8080

# Set environment variable for port
ENV PORT=8080

# Run the application
CMD ["python", "app/main.py"]
EOF
    fi
}

# Main execution
main() {
    echo "Starting Barka Independent Services Migration..."
    echo ""
    
    check_prerequisites
    
    log_info "This script will extract each service to an independent repository"
    log_warning "Make sure you have committed all changes in the monorepo"
    
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Migration cancelled"
        exit 0
    fi
    
    # Extract each service
    for service in "${SERVICES[@]}"; do
        echo ""
        log_info "Processing $service service..."
        extract_service "$service"
    done
    
    echo ""
    log_success "Migration completed successfully!"
    echo ""
    echo "📁 Independent repositories created:"
    echo "   - $WORKSPACE_DIR/barka-frontend-independent"
    echo "   - $WORKSPACE_DIR/barka-backend-independent"
    echo "   - $WORKSPACE_DIR/ovara-agent-independent"
    echo ""
    echo "🚀 Next steps:"
    echo "   1. Create GitHub repositories for each service"
    echo "   2. Push the independent repositories to GitHub"
    echo "   3. Set up deployment platforms (Vercel, Railway, Cloud Run)"
    echo "   4. Configure environment variables on each platform"
    echo ""
    echo "📖 See polyrepo-migration-plan.md for detailed deployment instructions"
}

# Run the script
main "$@"
