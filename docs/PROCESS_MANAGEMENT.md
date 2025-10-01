# Process Management Guide

## Critical: Safe Node.js Process Termination

### ⚠️ IMPORTANT RULE
**NEVER kill ALL Node.js processes indiscriminately** - this will terminate active conversation sessions and cause crashes.

## Identifying Safe vs. Unsafe Processes

### Safe to Kill (Development Processes)
- Next.js dev servers
- npm/npx processes
- Turbopack build processes
- Testing processes (Jest, etc.)

### UNSAFE to Kill (System Processes)
- Active conversation interface processes
- System-level Node.js services
- Any process with high memory usage (>300MB) - likely system critical

## Safe Process Termination Method

### Step 1: Identify Development Server PIDs
```powershell
# Find Next.js dev server processes by port
netstat -ano | findstr ":3000"
netstat -ano | findstr ":3007"
netstat -ano | findstr ":3010"
netstat -ano | findstr ":3015"
```

### Step 2: Kill Specific Development Processes
```powershell
# Kill specific PID (replace XXXX with actual PID from netstat)
Stop-Process -Id XXXX -Force

# Example: Kill process on port 3015
$port = 3015
$process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
if ($process) { Stop-Process -Id $process -Force }
```

### Step 3: Safe Batch Termination (RECOMMENDED METHOD)
```powershell
# Kill only Next.js dev servers by checking command line
Get-Process node | Where-Object {
    $_.CommandLine -like "*next dev*" -or
    $_.CommandLine -like "*turbopack*"
} | Stop-Process -Force
```

## Best Practice: Cache Cleanup Instead

**PREFERRED APPROACH - Avoid killing processes entirely:**

```bash
# Clean build cache to resolve permission issues
cd "C:\Users\tfort\Desktop\Projects\cou\anc-audio-app"
rm -rf .next .turbo node_modules/.cache

# Start on fresh port
npm run dev -- --port 3015
```

## Emergency: Kill All Development Processes

**USE ONLY AS LAST RESORT:**

```powershell
# This attempts to exclude conversation processes
Get-Process node | Where-Object {
    # Exclude high-memory processes (likely system/conversation)
    $_.WorkingSet64 -lt 300MB -and
    # Only include if command line contains dev server indicators
    $_.CommandLine -match "next|turbopack|npm|npx"
} | Stop-Process -Force
```

## Tracking Conversation Process PIDs

### Current Session Tracking
When starting a new conversation, record the approximate baseline:
```powershell
# Before starting work - record current Node.js processes
Get-Process node | Select-Object Id, WorkingSet64, StartTime | Out-File -FilePath ".\baseline-processes.txt"
```

### Identifying New Processes
```powershell
# Compare current processes to baseline
$baseline = Import-Csv ".\baseline-processes.txt"
$current = Get-Process node
Compare-Object $baseline $current -Property Id
```

## Port Management

### Current Development Ports Used
- Port 3000 - Default Next.js (often occupied)
- Port 3007 - Previous dev session
- Port 3010 - Previous dev session
- Port 3015 - **CURRENT ACTIVE SESSION**

### Check Active Ports
```powershell
# List all Node.js processes with their ports
Get-NetTCPConnection | Where-Object {
    $_.State -eq "Listen" -and
    $_.LocalPort -ge 3000 -and
    $_.LocalPort -le 4000
} | Select-Object LocalPort, OwningProcess
```

### Kill Process by Port
```powershell
function Kill-ProcessByPort {
    param([int]$Port)
    $process = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
               Select-Object -ExpandProperty OwningProcess -Unique
    if ($process) {
        Stop-Process -Id $process -Force
        Write-Host "Killed process on port $Port (PID: $process)"
    } else {
        Write-Host "No process found on port $Port"
    }
}

# Usage:
Kill-ProcessByPort -Port 3007
Kill-ProcessByPort -Port 3010
```

## Automated Safe Cleanup Script

Create `cleanup-dev-servers.ps1`:

```powershell
# Safe Development Server Cleanup Script
Write-Host "🧹 Cleaning up development servers safely..."

# Method 1: Kill by specific ports
$devPorts = @(3000, 3007, 3010, 3015, 3020)
foreach ($port in $devPorts) {
    try {
        $process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
                   Select-Object -ExpandProperty OwningProcess -Unique
        if ($process) {
            Stop-Process -Id $process -Force
            Write-Host "✓ Killed process on port $port"
        }
    } catch {
        # Port not in use, continue
    }
}

# Method 2: Clean cache directories
Write-Host "🗑️ Cleaning build cache..."
Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".turbo" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "node_modules/.cache" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "✅ Cleanup complete! Safe to start fresh dev server."
```

## When Cache Cleanup Isn't Enough

If you must kill processes but cache cleanup isn't working:

1. **Identify conversation process PID** (usually has high memory ~300-400MB)
2. **Note the PID** to exclude it
3. **Kill everything EXCEPT that PID:**

```powershell
$excludePID = 31412  # Replace with actual conversation PID
Get-Process node | Where-Object {
    $_.Id -ne $excludePID -and
    $_.Id -ne $PID  # Also exclude current PowerShell process
} | Stop-Process -Force
```

## Summary: Recommended Workflow

1. **First Try**: Cache cleanup only (`rm -rf .next .turbo`)
2. **Second Try**: Kill by specific dev ports (3000-3020 range)
3. **Last Resort**: Selective process termination excluding high-memory PIDs
4. **Never**: Kill all Node.js processes without filtering

## Notes
- Always prefer cache cleanup over process termination
- Use fresh ports (3015+) to avoid conflicts with lingering servers
- Old dev servers will timeout naturally after 5-10 minutes
- Conversation processes typically use 300-400MB+ memory and stay constant
