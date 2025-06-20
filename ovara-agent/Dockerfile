# Use Python 3.11 slim image as base
FROM python:3.11-slim AS base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app:/app/app \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p logs

# Create non-root user for security
RUN groupadd -r ovara && useradd -r -g ovara ovara

# Change ownership of app directory
RUN chown -R ovara:ovara /app

# Switch to non-root user
USER ovara

# Expose port (FastAPI default)
EXPOSE 8000

# Health check (using the configured port from environment)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5566/list-apps || exit 1

# Change to app directory and start the main application
# This will start the orchestrator which includes the project manager and MCP server
WORKDIR /app/app
# Ensure Python can find the lib directory by adding parent directory to path
ENV PYTHONPATH=/app:/app/app:$PYTHONPATH
CMD ["python", "main.py"]
