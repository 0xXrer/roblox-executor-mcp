#!/usr/bin/env bash
# Roblox MCP Server - Unix Installer (macOS/Linux)
# Run: curl -fsSL https://raw.githubusercontent.com/notpoiu/roblox-mcp/main/scripts/install.sh | bash

set -e

INSTALL_DIR="${INSTALL_DIR:-$HOME/roblox-mcp}"
SKIP_NPM="${SKIP_NPM:-false}"

echo "============================================"
echo "  Roblox MCP Server - Unix Installer"
echo "============================================"
echo ""

# Check Node.js
echo -e "\033[33m[1/5] Checking Node.js...\033[0m"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "  \033[32mFound Node.js: $NODE_VERSION\033[0m"
else
    echo -e "  \033[31mERROR: Node.js is not installed!\033[0m"
    echo -e "  \033[33mInstall from: https://nodejs.org/\033[0m"
    echo -e "  Or use: brew install node (macOS)"
    echo -e "        or: curl -fsSL https://deb.nodesource.com/setup | sudo bash - (Linux)"
    exit 1
fi

# Check npm
echo -e "\033[33m[2/5] Checking npm...\033[0m"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "  \033[32mFound npm: $NPM_VERSION\033[0m"
else
    echo -e "  \033[31mERROR: npm is not available!\033[0m"
    exit 1
fi

# Create install directory
echo -e "\033[33m[3/5] Creating install directory...\033[0m"
if [ -d "$INSTALL_DIR" ]; then
    echo -e "  \033[90mDirectory already exists: $INSTALL_DIR\033[0m"
else
    mkdir -p "$INSTALL_DIR"
    echo -e "  \033[32mCreated: $INSTALL_DIR\033[0m"
fi

# Clone repository or use current directory
echo -e "\033[33m[4/5] Installing Roblox MCP Server...\033[0m"
cd "$INSTALL_DIR"

if [ -f "package.json" ]; then
    echo -e "  \033[90mFound existing installation, updating...\033[0m"
else
    echo -e "  \033[90mCloning repository...\033[0m"
    if command -v git &> /dev/null; then
        git clone https://github.com/notpoiu/roblox-mcp.git . 2>/dev/null || {
            echo -e "  \033[31mERROR: Failed to clone repository. Do you have git installed?\033[0m"
            echo -e "  \033[33mAlternative: Download manually from GitHub and run this script again.\033[0m"
            exit 1
        }
    else
        echo -e "  \033[31mERROR: git is not installed!\033[0m"
        echo -e "  \033[33mPlease install git and run this script again.\033[0m"
        exit 1
    fi
fi

# Install dependencies
echo -e "\033[33m[5/5] Installing dependencies...\033[0m"
npm install
if [ $? -ne 0 ]; then
    echo -e "  \033[31mERROR: npm install failed!\033[0m"
    exit 1
fi

# Build
echo ""
echo -e "\033[33mBuilding...\033[0m"
npm run build
if [ $? -ne 0 ]; then
    echo -e "  \033[31mERROR: Build failed!\033[0m"
    exit 1
fi

echo ""
echo "============================================"
echo -e "  \033[32mInstallation Complete!\033[0m"
echo "============================================"
echo ""
echo -e "Install location: \033[36m$INSTALL_DIR\033[0m"
echo ""
echo -e "\033[33mTo run the MCP server:\033[0m"
echo -e "  cd $INSTALL_DIR"
echo -e "  npm start"
echo ""
echo -e "\033[33mTo run as secondary (relay to remote):\033[0m"
echo -e "  npm start -- --baseurl ws://<remote-host>:16384"
echo ""
echo -e "Dashboard: \033[36mhttp://localhost:16384\033[0m"
echo ""

# Offer to configure Claude Desktop
echo -e "\033[33mConfigure Claude Desktop integration?\033[0m"
echo -e "  Y - Yes, configure for Claude Desktop"
echo -e "  N - No, skip configuration"
read -p "  Choice (Y/N): " response

if [ "$response" = "Y" ] || [ "$response" = "y" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
    else
        # Linux
        CLAUDE_CONFIG_DIR="$HOME/.config/Claude"
    fi
    
    CLAUDE_CONFIG_FILE="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"
    
    mkdir -p "$CLAUDE_CONFIG_DIR"
    
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
    
    echo -e "  \033[32mClaude Desktop configured!\033[0m"
    echo -e "  \033[90mRestart Claude Desktop to apply changes.\033[0m"
fi

echo ""
echo -e "\033[32mDone!\033[0m"
