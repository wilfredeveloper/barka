#!/bin/bash

# ==============================================
# Barka Platform Deployment Script
# ==============================================
# This script handles deployment of the Barka platform using Docker

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command_exists docker-compose; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to setup environment
setup_environment() {
    print_status "Setting up environment..."
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            print_warning ".env file not found. Copying from .env.example"
            cp .env.example .env
            print_warning "Please configure the .env file with your settings before proceeding"
            print_warning "Edit .env file and run this script again"
            exit 1
        else
            print_error ".env.example file not found. Cannot create .env file."
            exit 1
        fi
    fi
    
    # Check if service account key exists for ovara-agent
    if [ ! -f "ovara-agent/service-account-key.json" ]; then
        print_warning "Google Cloud service account key not found at ovara-agent/service-account-key.json"
        print_warning "Please place your service account key file there for Ovara Agent to work properly"
    fi

    # Check if calendar authentication is set up
    if [ ! -f "ovara-agent/docker-secrets/calendar_token.json" ]; then
        print_error "Google Calendar authentication not set up!"
        print_error "Please run: ./setup-calendar-auth.sh"
        print_error "This is mandatory for Ovara Agent calendar integration to work"
        exit 1
    fi
    
    print_success "Environment setup completed"
}

# Function to build images
build_images() {
    local service=${1:-}
    local use_cache=${2:-false}

    local build_args=""
    if [ "$use_cache" = "false" ]; then
        build_args="--no-cache"
        local cache_msg="(no cache)"
    else
        local cache_msg="(using cache)"
    fi

    if [ -n "$service" ]; then
        print_status "Building Docker image for $service $cache_msg..."
        docker-compose build $build_args "$service"
        print_success "$service image built successfully"
    else
        print_status "Building all Docker images $cache_msg..."
        docker-compose build $build_args
        print_success "All Docker images built successfully"
    fi
}

# Function to deploy services
deploy_services() {
    local environment=${1:-development}
    local service=${2:-}

    if [ -n "$service" ]; then
        print_status "Deploying $service for $environment environment..."
        if [ "$environment" = "production" ]; then
            docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d "$service"
        else
            docker-compose up -d "$service"
        fi
        print_success "$service deployed successfully"
    else
        print_status "Deploying all services for $environment environment..."
        if [ "$environment" = "production" ]; then
            docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
        else
            docker-compose up -d
        fi
        print_success "All services deployed successfully"
    fi
}

# Function to check service health
check_health() {
    local service=${1:-}

    print_status "Checking service health..."

    # Wait for services to start
    sleep 10

    if [ -n "$service" ]; then
        # Check specific service
        if docker-compose ps | grep -q "$service.*Up"; then
            print_success "$service is running"
        else
            print_error "$service is not running properly"
            docker-compose logs "$service"
        fi
    else
        # Check all services (using external MongoDB Atlas)
        services=("backend" "frontend" "ovara-agent")

        for svc in "${services[@]}"; do
            if docker-compose ps | grep -q "$svc.*Up"; then
                print_success "$svc is running"
            else
                print_error "$svc is not running properly"
                docker-compose logs "$svc"
            fi
        done
    fi
}

# Function to show service status
show_status() {
    print_status "Service Status:"
    docker-compose ps
    
    echo ""
    print_status "Service URLs:"
    echo "Frontend: http://localhost:3000"
    echo "Backend:  http://localhost:5000"
    echo "Ovara Agent: http://localhost:5566"
    echo "MongoDB: Using external MongoDB Atlas cluster"
}

# Function to stop services
stop_services() {
    print_status "Stopping services..."
    docker-compose down
    print_success "Services stopped"
}

# Function to cleanup
cleanup() {
    print_status "Cleaning up..."
    docker-compose down -v --remove-orphans
    docker system prune -f
    print_success "Cleanup completed"
}

# Function to check if --cache option is present
check_cache_option() {
    for arg in "$@"; do
        if [[ "$arg" == "--cache" ]]; then
            echo "true"
            return
        fi
    done
    echo "false"
}

# Function to remove --cache from arguments
remove_cache_option() {
    local args=()
    for arg in "$@"; do
        if [[ "$arg" != "--cache" ]]; then
            args+=("$arg")
        fi
    done
    echo "${args[@]}"
}

# Main script logic
# Parse cache option from all arguments
USE_CACHE=$(check_cache_option "$@")
FILTERED_ARGS=($(remove_cache_option "$@"))

case "${FILTERED_ARGS[0]:-deploy}" in
    "deploy")
        environment=${FILTERED_ARGS[1]:-development}
        check_prerequisites
        setup_environment
        build_images "" "$USE_CACHE"
        deploy_services "$environment"
        check_health
        show_status
        ;;
    "build")
        service=${FILTERED_ARGS[1]:-}
        check_prerequisites
        if [ -n "$service" ]; then
            # Validate service name
            if [[ "$service" =~ ^(frontend|backend|ovara-agent)$ ]]; then
                build_images "$service" "$USE_CACHE"
            else
                print_error "Invalid service name: $service"
                print_error "Valid services: frontend, backend, ovara-agent"
                exit 1
            fi
        else
            build_images "" "$USE_CACHE"
        fi
        ;;
    "deploy-service")
        service=${FILTERED_ARGS[1]:-}
        environment=${FILTERED_ARGS[2]:-development}
        if [ -z "$service" ]; then
            print_error "Service name required for deploy-service command"
            print_error "Usage: $0 deploy-service <frontend|backend|ovara-agent> [environment] [--cache]"
            exit 1
        fi
        if [[ "$service" =~ ^(frontend|backend|ovara-agent)$ ]]; then
            check_prerequisites
            setup_environment
            build_images "$service" "$USE_CACHE"
            deploy_services "$environment" "$service"
            check_health "$service"
            show_status
        else
            print_error "Invalid service name: $service"
            print_error "Valid services: frontend, backend, ovara-agent"
            exit 1
        fi
        ;;
    "start")
        environment=${FILTERED_ARGS[1]:-development}
        deploy_services "$environment"
        check_health
        show_status
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        environment=${FILTERED_ARGS[1]:-development}
        stop_services
        deploy_services "$environment"
        check_health
        show_status
        ;;
    "restart-service")
        service=${FILTERED_ARGS[1]:-}
        environment=${FILTERED_ARGS[2]:-development}
        if [ -z "$service" ]; then
            print_error "Service name required for restart-service command"
            print_error "Usage: $0 restart-service <frontend|backend|ovara-agent> [environment] [--cache]"
            exit 1
        fi
        if [[ "$service" =~ ^(frontend|backend|ovara-agent)$ ]]; then
            print_status "Restarting $service..."
            docker-compose stop "$service"
            build_images "$service" "$USE_CACHE"
            deploy_services "$environment" "$service"
            check_health "$service"
            show_status
        else
            print_error "Invalid service name: $service"
            print_error "Valid services: frontend, backend, ovara-agent"
            exit 1
        fi
        ;;
    "status")
        show_status
        ;;
    "logs")
        service=${FILTERED_ARGS[1]:-}
        if [ -n "$service" ]; then
            docker-compose logs -f "$service"
        else
            docker-compose logs -f
        fi
        ;;
    "cleanup")
        cleanup
        ;;
    "help")
        echo "Usage: $0 [command] [options] [--cache]"
        echo ""
        echo "Commands:"
        echo "  deploy [env]                    - Deploy all services (default: development)"
        echo "  build [service]                 - Build Docker images (all or specific service)"
        echo "  deploy-service <service> [env]  - Deploy specific service only"
        echo "  start [env]                     - Start services without building"
        echo "  stop                            - Stop all services"
        echo "  restart [env]                   - Restart all services"
        echo "  restart-service <service> [env] - Restart specific service only"
        echo "  status                          - Show service status"
        echo "  logs [service]                  - Show logs (optionally for specific service)"
        echo "  cleanup                         - Stop services and cleanup volumes"
        echo "  help                            - Show this help message"
        echo ""
        echo "Options:"
        echo "  --cache                         - Use Docker build cache (faster builds)"
        echo ""
        echo "Services: frontend, backend, ovara-agent"
        echo "Environments: development, production"
        echo ""
        echo "Examples:"
        echo "  $0 deploy                       # Deploy all services (no cache)"
        echo "  $0 deploy --cache               # Deploy all services (with cache)"
        echo "  $0 deploy production --cache    # Deploy all services to production (with cache)"
        echo "  $0 build frontend               # Build only frontend (no cache)"
        echo "  $0 build frontend --cache       # Build only frontend (with cache)"
        echo "  $0 deploy-service backend       # Deploy only backend (no cache)"
        echo "  $0 deploy-service backend --cache # Deploy only backend (with cache)"
        echo "  $0 deploy-service frontend prod --cache # Deploy frontend to production (with cache)"
        echo "  $0 restart-service ovara-agent --cache  # Restart ovara-agent (with cache)"
        echo ""
        echo "Cache Behavior:"
        echo "  Default: --no-cache (clean builds, slower but ensures latest changes)"
        echo "  With --cache: Uses Docker layer cache (faster builds, may miss some changes)"
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
