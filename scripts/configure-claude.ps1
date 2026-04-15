#!/usr/bin/env pwsh
# Configure Claude Desktop for Roblox MCP Server (Windows)
# Run from the roblox-mcp directory

$ErrorActionPreference = "Stop"

$InstallDir = Get-Location
$claudeConfigDir = "$env:APPDATA\Claude"
$claudeConfigFile = "$claudeConfigDir\claude_desktop_config.json"

Write-Host "Configuring Claude Desktop for Roblox MCP Server..." -ForegroundColor Cyan
Write-Host ""

# Create Claude config directory if needed
if (!(Test-Path $claudeConfigDir)) {
    New-Item -ItemType Directory -Path $claudeConfigDir -Force | Out-Null
    Write-Host "Created Claude config directory: $claudeConfigDir" -ForegroundColor Green
}

# Read existing config or create new one
if (Test-Path $claudeConfigFile) {
    Write-Host "Found existing Claude Desktop config" -ForegroundColor Gray
    $existingConfig = Get-Content $claudeConfigFile -Raw | ConvertFrom-Json
    
    # Preserve existing MCP servers
    if ($existingConfig.mcpServers) {
        $existingConfig.mcpServers.roblox = @{
            command = "node"
            args = @("$InstallDir\dist\index.js")
        }
    } else {
        $existingConfig | Add-Member -MemberType NoteProperty -Name "mcpServers" -Value @{
            roblox = @{
                command = "node"
                args = @("$InstallDir\dist\index.js")
            }
        }
    }
    $config = $existingConfig
} else {
    $config = @{
        mcpServers = @{
            roblox = @{
                command = "node"
                args = @("$InstallDir\dist\index.js")
            }
        }
    }
}

# Write config
$config | ConvertTo-Json -Depth 10 | Set-Content -Path $claudeConfigFile -Encoding UTF8

Write-Host ""
Write-Host "Configuration saved to: $claudeConfigFile" -ForegroundColor Green
Write-Host ""
Write-Host "Restart Claude Desktop to apply changes." -ForegroundColor Yellow
Write-Host ""
Write-Host "Config contents:" -ForegroundColor Gray
Get-Content $claudeConfigFile
