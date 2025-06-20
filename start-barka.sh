#!/bin/bash

# Barka Platform Startup Script
# This script starts both barka-frontend and barka-backend services
# Run from the barka root directory

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

# Function to check if a port is in use
port_in_use() {
    lsof -i :$1 >/dev/null 2>&1
}

# Function to kill process on port
kill_port() {
    local port=$1
    local pid=$(lsof -t -i:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        print_warning "Killing existing process on port $port (PID: $pid)"
        kill -9 $pid 2>/dev/null || true
        sleep 2
    fi
}

# Function to cleanup on exit
cleanup() {
    print_status "Cleaning up..."
    # Kill background processes
    jobs -p | xargs -r kill 2>/dev/null || true
    exit 0
}

# Trap cleanup on script exit
trap cleanup EXIT INT TERM

# Check if we're in the correct directory
if [ ! -d "barka-frontend" ] || [ ! -d "barka-backend" ]; then
    print_error "This script must be run from the barka root directory"
    print_error "Expected directories: barka-frontend, barka-backend"
    exit 1
fi

print_status "Starting Barka Platform..."
echo "=================================="

# Check required commands
print_status "Checking dependencies..."

if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_success "Dependencies check passed"

# Check and kill existing processes on ports
print_status "Checking for existing processes..."

# Frontend typically runs on port 3000
if port_in_use 3000; then
    kill_port 3000
fi

# Backend typically runs on port 5000
if port_in_use 5000; then
    kill_port 5000
fi

# Start barka-backend
print_status "Starting barka-backend..."
cd barka-backend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found in barka-backend. Installing dependencies..."
    npm install
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found in barka-backend"
    if [ -f ".env.example" ]; then
        print_status "Copying .env.example to .env"
        cp .env.example .env
        print_warning "Please configure the .env file with your settings"
    fi
fi

# Start backend in background
print_status "Launching backend server..."
bun dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    print_error "Failed to start barka-backend"
    exit 1
fi

print_success "barka-backend started (PID: $BACKEND_PID)"

# Go back to root and start frontend
cd ..
print_status "Starting barka-frontend..."
cd barka-frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found in barka-frontend. Installing dependencies..."
    npm install
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found in barka-frontend"
    if [ -f ".env.example" ]; then
        print_status "Copying .env.example to .env"
        cp .env.example .env
        print_warning "Please configure the .env file with your settings"
    fi
fi

# Start frontend in background
print_status "Launching frontend server..."
bun dev &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 3

# Check if frontend started successfully
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    print_error "Failed to start barka-frontend"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

print_success "barka-frontend started (PID: $FRONTEND_PID)"

# Go back to root directory
cd ..

echo ""
print_success "Barka Platform is now running!"
echo "=================================="
print_status "Backend:  http://localhost:5000"
print_status "Frontend: http://localhost:3000"
echo ""
print_status "Press Ctrl+C to stop all services"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
