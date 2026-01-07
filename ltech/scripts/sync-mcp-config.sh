#!/bin/bash
# Script to synchronize MCP settings across all AI containers (with Security preserved)

SETTINGS_JSON='{
  "security": {
    "auth": {
      "selectedType": "oauth-personal"
    }
  },
  "mcpServers": {
    "ltech-db": {
      "command": "/var/www/ltech/scripts/start_mcp_db.sh",
      "args": [],
      "env": {}
    }
  }
}'

PORTS=(2221 2223 2224 2225 2226 2227 2228 2229 2230 2231 2232 2233 2234)

for port in "${PORTS[@]}"; do
    echo "Restoring Settings (Security + MCP) to container on port $port..."
    ssh -p $port -o StrictHostKeyChecking=no root@localhost "mkdir -p /root/.gemini && echo '$SETTINGS_JSON' > /root/.gemini/settings.json"
done

echo "Sync completed for all 13 containers."
