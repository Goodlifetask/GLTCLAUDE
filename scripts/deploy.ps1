# GoodLifeTask — Deploy to DigitalOcean Server
# Usage:
#   .\scripts\deploy.ps1                    # deploy all services
#   .\scripts\deploy.ps1 -Service api       # deploy api only
#   .\scripts\deploy.ps1 -Service web       # deploy web only
#   .\scripts\deploy.ps1 -Service admin     # deploy admin only
#   .\scripts\deploy.ps1 -SkipCommit        # skip git commit (just push & deploy)

param(
    [ValidateSet("all", "api", "web", "admin")]
    [string]$Service = "all",
    [switch]$SkipCommit
)

$ErrorActionPreference = "Stop"
$RootDir  = Split-Path $PSScriptRoot -Parent
$Server   = "root@138.197.117.200"
$SshKey   = "$env:USERPROFILE\.ssh\id_ed25519"
$RepoPath = "/opt/goodlifetask"

function SSH($cmd) {
    ssh -i $SshKey -o StrictHostKeyChecking=no $Server $cmd
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  GoodLifeTask — Deploy [$Service]" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Commit & Push ──────────────────────────────────────────────────────────
Set-Location $RootDir

if (-not $SkipCommit) {
    $status = git status --short
    if ($status) {
        Write-Host "[1/4] Uncommitted changes found:" -ForegroundColor Yellow
        git status --short
        Write-Host ""
        $msg = Read-Host "  Commit message (or press Enter to skip commit)"
        if ($msg) {
            git add -A
            git commit -m $msg
            Write-Host "  Committed." -ForegroundColor Green
        } else {
            Write-Host "  Skipping commit — pushing existing commits only." -ForegroundColor Gray
        }
    } else {
        Write-Host "[1/4] No uncommitted changes." -ForegroundColor Green
    }
} else {
    Write-Host "[1/4] Skipping commit (--SkipCommit)." -ForegroundColor Gray
}

Write-Host ""
Write-Host "[2/4] Pushing to GitHub..." -ForegroundColor Yellow
git push origin master
Write-Host "  Pushed." -ForegroundColor Green

# ── 2. Server: Pull latest ────────────────────────────────────────────────────
Write-Host ""
Write-Host "[3/4] Pulling latest on server..." -ForegroundColor Yellow
SSH "cd $RepoPath && git pull origin master"
Write-Host "  Pull complete." -ForegroundColor Green

# ── 3. Server: Rebuild & Restart ─────────────────────────────────────────────
Write-Host ""
Write-Host "[4/4] Rebuilding & restarting services..." -ForegroundColor Yellow

if ($Service -eq "all" -or $Service -eq "api") {
    Write-Host ""
    Write-Host "  >> API: restarting..." -ForegroundColor Cyan
    SSH "systemctl restart glt-api && sleep 2 && systemctl is-active glt-api"
}

if ($Service -eq "all" -or $Service -eq "web") {
    Write-Host ""
    Write-Host "  >> Web: rebuilding (this takes ~2 min)..." -ForegroundColor Cyan
    SSH @"
cd $RepoPath
export NODE_ENV=production
pnpm --filter @glt/web build 2>&1 | tail -20
systemctl restart glt-web
sleep 2
systemctl is-active glt-web
"@
}

if ($Service -eq "all" -or $Service -eq "admin") {
    Write-Host ""
    Write-Host "  >> Admin: restarting..." -ForegroundColor Cyan
    SSH "systemctl restart glt-admin && sleep 2 && systemctl is-active glt-admin"
}

# ── 4. Done ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Deploy complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Site:  https://dev.goodlifetask.com" -ForegroundColor White
Write-Host "  Admin: https://dev.goodlifetask.com/admin" -ForegroundColor White
Write-Host "  API:   https://dev.goodlifetask.com/api/v1" -ForegroundColor White
Write-Host ""
Write-Host "  Live logs:" -ForegroundColor Gray
Write-Host "    API:   ssh -i $SshKey $Server 'journalctl -fu glt-api'" -ForegroundColor Gray
Write-Host "    Web:   ssh -i $SshKey $Server 'journalctl -fu glt-web'" -ForegroundColor Gray
Write-Host "    Admin: ssh -i $SshKey $Server 'journalctl -fu glt-admin'" -ForegroundColor Gray
Write-Host ""
