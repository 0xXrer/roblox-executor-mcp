#!/usr/bin/env node
/**
 * Cross-platform Claude Desktop configuration script
 * Run: npm run configure:claude
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const isWindows = process.platform === 'win32';

const colors = {
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  reset: '\x1b[0m'
};

function log(msg, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

function main() {
  let configDir;
  if (isWindows) {
    configDir = path.join(process.env.APPDATA, 'Claude');
  } else if (process.platform === 'darwin') {
    configDir = path.join(os.homedir(), 'Library', 'Application Support', 'Claude');
  } else {
    configDir = path.join(os.homedir(), '.config', 'Claude');
  }

  const configFile = path.join(configDir, 'claude_desktop_config.json');
  const installPath = process.cwd();

  log('Configuring Claude Desktop for Roblox MCP Server...', colors.cyan);
  log('');

  // Create directory if needed
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
    log(`Created Claude config directory: ${configDir}`, colors.green);
  }

  // Read existing config or create new one
  let config = { mcpServers: {} };
  if (fs.existsSync(configFile)) {
    try {
      const content = fs.readFileSync(configFile, 'utf-8');
      config = JSON.parse(content);
      log('Found existing Claude Desktop config', colors.gray);
    } catch {
      log('Warning: Could not parse existing config, creating new one', colors.yellow);
    }
  }

  // Ensure mcpServers exists
  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  // Add/update roblox server
  config.mcpServers.roblox = {
    command: 'node',
    args: [path.join(installPath, 'dist', 'index.js')]
  };

  // Write config
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf-8');

  log('');
  log(`Configuration saved to: ${configFile}`, colors.green);
  log('');
  log('Restart Claude Desktop to apply changes.', colors.yellow);
  log('');
  log('Config contents:', colors.gray);
  console.log(JSON.stringify(config, null, 2));
}

main();
