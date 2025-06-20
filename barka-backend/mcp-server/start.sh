#!/bin/bash

# Barka MCP Server Startup Script

set -e

echo "🚀 Starting Barka MCP Server..."

# Check if .env file exists, if not copy from example
if [ ! -f .env ]; then
    echo "📋 Creating .env file from example..."
    cp .env.example .env
    echo "⚠️  Please update .env file with your configuration"
fi

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Build the project
echo "🔨 Building TypeScript..."
bun run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"

# Start the server
echo "🌟 Starting MCP Server..."
node dist/index.js

echo "🛑 MCP Server stopped."
