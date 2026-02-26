#!/bin/bash
# YARIKIRU MCP Server Starter
# This script starts the YARIKIRU MCP server for Claude Code integration

# Load environment variables from .env.local if it exists
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

# Check required environment variables
if [ -z "$TURSO_DATABASE_URL" ] || [ -z "$TURSO_AUTH_TOKEN" ]; then
  echo "ERROR: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in .env.local"
  exit 1
fi

echo "Starting YARIKIRU MCP Server..."
echo "Database: $TURSO_DATABASE_URL"

# Start the MCP server
node src/mcp-server/index.mjs
