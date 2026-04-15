#!/usr/bin/env bash
# Configure Claude Desktop for Roblox MCP Server (macOS/Linux)
# Run from the roblox-mcp directory

set -e

INSTALL_DIR="$(pwd)"

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
else
    # Linux
    CLAUDE_CONFIG_DIR="$HOME/.config/Claude"
fi

CLAUDE_CONFIG_FILE="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"

echo "Configuring Claude Desktop for Roblox MCP Server..."
echo ""

# Create Claude config directory if needed
if [ ! -d "$CLAUDE_CONFIG_DIR" ]; then
    mkdir -p "$CLAUDE_CONFIG_DIR"
    echo "Created Claude config directory: $CLAUDE_CONFIG_DIR"
fi

# Read existing config or create new one
if [ -f "$CLAUDE_CONFIG_FILE" ]; then
    echo "Found existing Claude Desktop config"
    
    # Use jq if available, otherwise use simple approach
    if command -v jq &> /dev/null; then
        # Check if mcpServers exists
        if jq -e '.mcpServers' "$CLAUDE_CONFIG_FILE" > /dev/null 2>&1; then
            # Update existing roblox entry
            jq '.mcpServers.roblox = {
                "command": "node",
                "args": ["'"$INSTALL_DIR"'/dist/index.js"]
            }' "$CLAUDE_CONFIG_FILE" > "$CLAUDE_CONFIG_FILE.tmp"
        else
            # Add mcpServers section
            jq '. + {
                "mcpServers": {
                    "roblox": {
                        "command": "node",
                        "args": ["'"$INSTALL_DIR"'/dist/index.js"]
                    }
                }
            }' "$CLAUDE_CONFIG_FILE" > "$CLAUDE_CONFIG_FILE.tmp"
        fi
        mv "$CLAUDE_CONFIG_FILE.tmp" "$CLAUDE_CONFIG_FILE"
    else
        # Simple approach without jq - overwrite with roblox config only
        echo "Note: Install 'jq' for better config merging"
        cat > "$CLAUDE_CONFIG_FILE" << EOF
{
    "mcpServers": {
        "roblox": {
            "command": "node",
            "args": ["$INSTALL_DIR/dist/index.js"]
        }
    }
}
EOF
    fi
else
    # Create new config
    cat > "$CLAUDE_CONFIG_FILE" << EOF
{
    "mcpServers": {
        "roblox": {
            "command": "node",
            "args": ["$INSTALL_DIR/dist/index.js"]
        }
    }
}
EOF
fi

echo ""
echo "Configuration saved to: $CLAUDE_CONFIG_FILE"
echo ""
echo "Restart Claude Desktop to apply changes."
echo ""
echo "Config contents:"
cat "$CLAUDE_CONFIG_FILE"
