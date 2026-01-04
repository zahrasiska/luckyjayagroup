#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ENV_FILE="$DIR/../.env.local"

# Load environment variables from .env.local
if [ -f "$ENV_FILE" ]; then
    echo "Loading environment from $ENV_FILE" >&2
    # Use allexport to export variables defined in the sourced file
    set -a
    source "$ENV_FILE"
    set +a
else
    echo "Warning: .env.local not found at $ENV_FILE" >&2
fi

if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL is not set." >&2
    exit 1
fi

# Set search_path using PGOPTIONS for the Postgres driver
# Use SCHEMA if set, otherwise fallback to default list
SCHEMAS=${SCHEMA:-"prive,sparepart,public"}
export PGOPTIONS="-c search_path=$SCHEMAS"

echo "Starting Postgres MCP Server with search_path=$SCHEMAS..." >&2

# Execute the custom MCP server
exec node "$DIR/mcp-server.mjs"
