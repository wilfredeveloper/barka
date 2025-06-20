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
    print_status "Building Docker images..."
    
    docker-compose build --no-cache
    
    print_success "Docker images built successfully"
}

# Function to deploy services
deploy_services() {
    local environment=${1:-development}
    
    print_status "Deploying services for $environment environment..."
    
    if [ "$environment" = "production" ]; then
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
    else
        docker-compose up -d
    fi
    
    print_success "Services deployed successfully"
}

# Function to check service health
check_health() {
    print_status "Checking service health..."
    
    # Wait for services to start
    sleep 10
    
    # Check each service (using external MongoDB Atlas)
    services=("backend" "frontend" "ovara-agent")

    for service in "${services[@]}"; do
        if docker-compose ps | grep -q "$service.*Up"; then
            print_success "$service is running"
        else
            print_error "$service is not running properly"
            docker-compose logs "$service"
        fi
    done
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

# Main script logic
case "${1:-deploy}" in
    "deploy")
        environment=${2:-development}
        check_prerequisites
        setup_environment
        build_images
        deploy_services "$environment"
        check_health
        show_status
        ;;
    "build")
        check_prerequisites
        build_images
        ;;
    "start")
        environment=${2:-development}
        deploy_services "$environment"
        check_health
        show_status
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        environment=${2:-development}
        stop_services
        deploy_services "$environment"
        check_health
        show_status
        ;;
    "status")
        show_status
        ;;
    "logs")
        service=${2:-}
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
        echo "Usage: $0 [command] [options]"
        echo ""
        echo "Commands:"
        echo "  deploy [env]    - Deploy all services (default: development)"
        echo "  build          - Build Docker images"
        echo "  start [env]    - Start services without building"
        echo "  stop           - Stop all services"
        echo "  restart [env]  - Restart all services"
        echo "  status         - Show service status"
        echo "  logs [service] - Show logs (optionally for specific service)"
        echo "  cleanup        - Stop services and cleanup volumes"
        echo "  help           - Show this help message"
        echo ""
        echo "Environments: development, production"
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
