#!/usr/bin/env node
/**
 * Cross-platform installation script for Roblox MCP Server
 * Run: npm run install:mcp
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const INSTALL_DIR = process.env.INSTALL_DIR || path.join(os.homedir(), 'roblox-mcp');
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

function run(cmd) {
  try {
    execSync(cmd, { stdio: 'inherit', shell: true });
    return true;
  } catch (err) {
    return false;
  }
}

async function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function main() {
  log('============================================', colors.cyan);
  log('  Roblox MCP Server - Quick Setup', colors.cyan);
  log('============================================', colors.cyan);
  log('');

  // Check Node.js
  log('[1/3] Checking Node.js...', colors.yellow);
  try {
    const nodeVersion = execSync('node --version').toString().trim();
    log(`  Found Node.js: ${nodeVersion}`, colors.green);
  } catch {
    log('  ERROR: Node.js is not installed!', colors.red);
    log('  Download from: https://nodejs.org/', colors.yellow);
    process.exit(1);
  }

  // Install dependencies
  log('[2/3] Installing dependencies...', colors.yellow);
  if (!run('npm install')) {
    log('  ERROR: npm install failed!', colors.red);
    process.exit(1);
  }

  // Build
  log('[3/3] Building...', colors.yellow);
  if (!run('npm run build')) {
    log('  ERROR: Build failed!', colors.red);
    process.exit(1);
  }

  log('');
  log('============================================', colors.green);
  log('  Setup Complete!', colors.green);
  log('============================================', colors.green);
  log('');
  log(`Install location: ${colors.cyan}${process.cwd()}${colors.reset}`);
  log('');
  log('To run the MCP server:', colors.yellow);
  log('  npm start', colors.gray);
  log('');
  log('Dashboard: http://localhost:16384', colors.cyan);
  log('');

  // Offer to configure Claude Desktop
  log('Configure Claude Desktop integration?', colors.yellow);
  log('  Y - Yes, configure for Claude Desktop', colors.gray);
  log('  N - No, skip configuration', colors.gray);
  
  const response = await askQuestion('  Choice (Y/N): ');

  if (response.toLowerCase() === 'y') {
    await configureClaude();
  }

  log('');
  log('Done!', colors.green);
}

async function configureClaude() {
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

  // Create directory if needed
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
    log(`  Created Claude config directory: ${configDir}`, colors.green);
  }

  // Read existing config or create new one
  let config = { mcpServers: {} };
  if (fs.existsSync(configFile)) {
    try {
      const content = fs.readFileSync(configFile, 'utf-8');
      config = JSON.parse(content);
      log('  Found existing Claude Desktop config', colors.gray);
    } catch {
      log('  Warning: Could not parse existing config, creating new one', colors.yellow);
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

  log('  Claude Desktop configured!', colors.green);
  log('  Restart Claude Desktop to apply changes.', colors.gray);
}

main().catch(err => {
  log(`ERROR: ${err.message}`, colors.red);
  process.exit(1);
});
