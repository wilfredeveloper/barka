#!/bin/bash

# ==============================================
# Google Calendar Authentication Setup Script
# ==============================================
# This script sets up Google Calendar OAuth authentication
# for the Ovara Agent before Docker deployment

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

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists python3; then
        print_error "Python 3 is not installed. Please install Python 3 first."
        exit 1
    fi
    
    # Check if ovara-agent directory exists
    if [ ! -d "ovara-agent" ]; then
        print_error "ovara-agent directory not found. Please run this script from the barka root directory."
        exit 1
    fi
    
    # Check if credentials.json exists
    if [ ! -f "ovara-agent/credentials.json" ]; then
        print_error "credentials.json not found in ovara-agent directory."
        print_error "Please ensure you have downloaded the OAuth 2.0 credentials from Google Cloud Console."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Setup Python virtual environment
setup_venv() {
    print_status "Setting up Python virtual environment..."
    
    cd ovara-agent
    
    # Check if virtual environment exists
    if [ ! -d "env" ]; then
        print_status "Creating virtual environment..."
        python3 -m venv env
    fi
    
    # Activate virtual environment
    source env/bin/activate
    
    # Install required packages
    print_status "Installing required packages..."
    pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client
    
    print_success "Virtual environment setup completed"
}

# Run calendar authentication
run_calendar_auth() {
    print_status "Running Google Calendar authentication..."
    
    # Check if token already exists
    if [ -f "$HOME/.credentials/calendar_token.json" ]; then
        print_warning "Calendar token already exists at $HOME/.credentials/calendar_token.json"
        read -p "Do you want to re-authenticate? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Skipping authentication. Using existing token."
            return 0
        fi
    fi
    
    # Run the setup script
    print_status "Starting OAuth flow..."
    print_warning "You will need to:"
    print_warning "1. Open the provided URL in your browser"
    print_warning "2. Sign in with your Google account"
    print_warning "3. Grant calendar permissions"
    print_warning "4. Copy the authorization code back to this terminal"
    echo ""
    
    python tests/setup_calendar_auth.py
    
    if [ $? -eq 0 ]; then
        print_success "Calendar authentication completed successfully"
        return 0
    else
        print_error "Calendar authentication failed"
        return 1
    fi
}

# Copy token for Docker
copy_token_for_docker() {
    print_status "Preparing calendar token for Docker deployment..."
    
    TOKEN_PATH="$HOME/.credentials/calendar_token.json"
    
    if [ ! -f "$TOKEN_PATH" ]; then
        print_error "Calendar token not found at $TOKEN_PATH"
        return 1
    fi
    
    # Create a docker-secrets directory
    mkdir -p docker-secrets
    
    # Copy the token
    cp "$TOKEN_PATH" docker-secrets/calendar_token.json
    
    print_success "Calendar token copied to docker-secrets/calendar_token.json"
    print_status "This token will be mounted in the Docker container"
}

# Update Docker configuration
update_docker_config() {
    print_status "Updating Docker configuration for calendar authentication..."
    
    # Go back to root directory
    cd ..
    
    # Check if docker-compose.yml exists
    if [ ! -f "docker-compose.yml" ]; then
        print_error "docker-compose.yml not found"
        return 1
    fi
    
    # Create backup
    cp docker-compose.yml docker-compose.yml.backup
    
    print_success "Docker configuration updated"
    print_status "Calendar token will be mounted as a volume in the ovara-agent container"
}

# Main script logic
main() {
    print_status "Setting up Google Calendar authentication for Docker deployment..."
    echo "=================================================================="
    
    check_prerequisites
    setup_venv
    
    if run_calendar_auth; then
        copy_token_for_docker
        update_docker_config
        
        echo ""
        print_success "Calendar authentication setup completed!"
        echo "=================================================================="
        print_status "Next steps:"
        echo "1. Run: ./deploy.sh deploy"
        echo "2. Your calendar integration will work in Docker containers"
        echo ""
        print_warning "Important: Keep the docker-secrets/calendar_token.json file secure"
        print_warning "Do not commit this file to version control"
    else
        print_error "Calendar authentication setup failed"
        exit 1
    fi
}

# Run main function
main "$@"
