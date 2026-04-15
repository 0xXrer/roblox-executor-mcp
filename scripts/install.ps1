#!/usr/bin/env pwsh
# Roblox MCP Server - Windows Installer (PowerShell)
# Run: powershell -ExecutionPolicy Bypass -File install.ps1

param(
    [string]$InstallDir = "$env:USERPROFILE\roblox-mcp",
    [switch]$SkipNpm
)

$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Roblox MCP Server - Windows Installer" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "[1/5] Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host "  Found Node.js: $nodeVersion" -ForegroundColor Green
    } else {
        throw "Node.js not found"
    }
} catch {
    Write-Host "  ERROR: Node.js is not installed!" -ForegroundColor Red
    Write-Host "  Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check npm
Write-Host "[2/5] Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version 2>$null
    Write-Host "  Found npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: npm is not available!" -ForegroundColor Red
    exit 1
}

# Create install directory
Write-Host "[3/5] Creating install directory..." -ForegroundColor Yellow
if (Test-Path $InstallDir) {
    Write-Host "  Directory already exists: $InstallDir" -ForegroundColor Gray
} else {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    Write-Host "  Created: $InstallDir" -ForegroundColor Green
}

# Clone repository or use current directory
Write-Host "[4/5] Installing Roblox MCP Server..." -ForegroundColor Yellow
Set-Location $InstallDir

if (Test-Path "package.json") {
    Write-Host "  Found existing installation, updating..." -ForegroundColor Gray
} else {
    Write-Host "  Cloning repository..." -ForegroundColor Gray
    git clone https://github.com/notpoiu/roblox-mcp.git . 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR: Failed to clone repository. Do you have git installed?" -ForegroundColor Red
        Write-Host "  Alternative: Download manually from GitHub and run this script again." -ForegroundColor Yellow
        exit 1
    }
}

# Install dependencies
Write-Host "[5/5] Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: npm install failed!" -ForegroundColor Red
    exit 1
}

# Build
Write-Host ""
Write-Host "Building..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Installation Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Install location: $InstallDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "To run the MCP server:" -ForegroundColor Yellow
Write-Host "  cd $InstallDir" -ForegroundColor Gray
Write-Host "  npm start" -ForegroundColor Gray
Write-Host ""
Write-Host "To run as secondary (relay to remote):" -ForegroundColor Yellow
Write-Host "  npm start -- --baseurl ws://<remote-host>:16384" -ForegroundColor Gray
Write-Host ""
Write-Host "Dashboard: http://localhost:16384" -ForegroundColor Cyan
Write-Host ""

# Offer to configure Claude Desktop
Write-Host "Configure Claude Desktop integration?" -ForegroundColor Yellow
Write-Host "  Y - Yes, configure for Claude Desktop" -ForegroundColor Gray
Write-Host "  N - No, skip configuration" -ForegroundColor Gray
$response = Read-Host "  Choice (Y/N)"

if ($response -eq "Y" -or $response -eq "y") {
    $claudeConfigDir = "$env:APPDATA\Claude"
    $claudeConfigFile = "$claudeConfigDir\claude_desktop_config.json"
    
    if (!(Test-Path $claudeConfigDir)) {
        New-Item -ItemType Directory -Path $claudeConfigDir -Force | Out-Null
    }
    
    $config = @{
        mcpServers = @{
            roblox = @{
                command = "node"
                args = @("$InstallDir\dist\index.js")
            }
        }
    } | ConvertTo-Json -Depth 10
    
    Set-Content -Path $claudeConfigFile -Value $config -Encoding UTF8
    Write-Host "  Claude Desktop configured!" -ForegroundColor Green
    Write-Host "  Restart Claude Desktop to apply changes." -ForegroundColor Gray
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
