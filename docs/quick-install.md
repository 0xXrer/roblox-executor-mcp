# Quick Installation Guide

This guide covers the fastest ways to install and configure Roblox MCP Server.

## One-Command Installation

### Windows (PowerShell)

```powershell
powershell -ExecutionPolicy Bypass -File <(curl -fsSL https://raw.githubusercontent.com/notpoiu/roblox-mcp/main/scripts/install.ps1)
```

Or download and run manually:
```powershell
curl -o install.ps1 https://raw.githubusercontent.com/notpoiu/roblox-mcp/main/scripts/install.ps1
.\install.ps1
```

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/notpoiu/roblox-mcp/main/scripts/install.sh | bash
```

Or download and run manually:
```bash
curl -o install.sh https://raw.githubusercontent.com/notpoiu/roblox-mcp/main/scripts/install.sh
chmod +x install.sh
./install.sh
```

## What the Installer Does

1. **Checks prerequisites** — Node.js and npm
2. **Creates install directory** — `~/roblox-mcp` by default
3. **Clones the repository** — from GitHub
4. **Installs dependencies** — via `npm install`
5. **Builds the server** — compiles TypeScript
6. **Optional: Configures Claude Desktop** — adds MCP server to config

## Post-Installation

### Running the Server

```bash
cd ~/roblox-mcp
npm start
```

### Configuring Claude Desktop Later

If you skipped Claude Desktop configuration during install:

```bash
cd ~/roblox-mcp
npm run configure:claude
```

Then restart Claude Desktop.

### Verifying Installation

1. Start the server: `npm start`
2. Open dashboard: http://localhost:16384
3. You should see the status page with "Disconnected" (no clients yet)

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `INSTALL_DIR` | Custom installation directory | `~/roblox-mcp` |
| `SKIP_NPM` | Skip npm install (if already done) | `false` |

Example with custom directory:
```bash
INSTALL_DIR=/opt/roblox-mcp bash install.sh
```

## Troubleshooting

### "Node.js is not installed"

Install Node.js from https://nodejs.org/ or use a package manager:

**macOS:**
```bash
brew install node
```

**Linux (Debian/Ubuntu):**
```bash
curl -fsSL https://deb.nodesource.com/setup | sudo bash -
sudo apt-get install -y nodejs
```

**Linux (Arch):**
```bash
sudo pacman -S nodejs npm
```

### "git is not installed"

Install git for your system:

**Windows:** https://git-scm.com/download/win

**macOS:**
```bash
xcode-select --install
```

**Linux:**
```bash
sudo apt-get install git  # Debian/Ubuntu
sudo pacman -S git        # Arch
```

### "npm install failed"

Try clearing npm cache:
```bash
npm cache clean --force
npm install
```

Or use a different registry:
```bash
npm config set registry https://registry.npmjs.org/
npm install
```

### Claude Desktop doesn't see the server

1. Verify config file exists:
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Linux:** `~/.config/Claude/claude_desktop_config.json`

2. Check the config contains:
```json
{
    "mcpServers": {
        "roblox": {
            "command": "node",
            "args": ["/path/to/roblox-mcp/dist/index.js"]
        }
    }
}
```

3. Restart Claude Desktop completely

## Manual Installation

If the one-command install doesn't work:

```bash
# Clone repository
git clone https://github.com/notpoiu/roblox-mcp.git
cd roblox-mcp

# Install dependencies
npm install

# Build
npm run build

# Configure Claude Desktop
npm run configure:claude

# Start server
npm start
```

## Next Steps

- [Advanced Configuration](advanced.md) — Multi-client, relay mode, SSH tunneling
- [Setup Guides](../README.md#all-setup-guides) — Client-specific configuration
- [Connector Setup](../README.md#3-connect-from-roblox) — Running the Roblox connector
