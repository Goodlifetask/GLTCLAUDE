# GoodLifeTask — Dev Machine Setup Script
# Run this on a new Windows machine after cloning the repo
# Usage: Right-click → Run with PowerShell (as Administrator)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GoodLifeTask — Dev Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Check Node.js ────────────────────────────────────────────────────────
Write-Host "[1/6] Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>$null
    Write-Host "      Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "      ERROR: Node.js not found. Install from https://nodejs.org (v20+)" -ForegroundColor Red
    exit 1
}

# ── 2. Check pnpm ────────────────────────────────────────────────────────────
Write-Host "[2/6] Checking pnpm..." -ForegroundColor Yellow
try {
    $pnpmVersion = pnpm --version 2>$null
    Write-Host "      pnpm found: $pnpmVersion" -ForegroundColor Green
} catch {
    Write-Host "      Installing pnpm..." -ForegroundColor Yellow
    npm install -g pnpm
    Write-Host "      pnpm installed." -ForegroundColor Green
}

# ── 3. Create .env files ─────────────────────────────────────────────────────
Write-Host "[3/6] Creating .env files..." -ForegroundColor Yellow

# apps/web/.env.local
$webEnv = "NEXT_PUBLIC_API_URL=/api/v1"
if (-not (Test-Path "apps/web/.env.local")) {
    Set-Content -Path "apps/web/.env.local" -Value $webEnv
    Write-Host "      Created apps/web/.env.local" -ForegroundColor Green
} else {
    Write-Host "      apps/web/.env.local already exists, skipping." -ForegroundColor Gray
}

# apps/admin/.env.local
if (-not (Test-Path "apps/admin/.env.local")) {
    $apiKey = Read-Host "      Enter your Anthropic API key (for admin app)"
    Set-Content -Path "apps/admin/.env.local" -Value "ANTHROPIC_API_KEY=$apiKey"
    Write-Host "      Created apps/admin/.env.local" -ForegroundColor Green
} else {
    Write-Host "      apps/admin/.env.local already exists, skipping." -ForegroundColor Gray
}

# services/api/.env
if (-not (Test-Path "services/api/.env")) {
    Copy-Item "services/api/.env.example" "services/api/.env"
    Write-Host "      Created services/api/.env from .env.example" -ForegroundColor Green
} else {
    Write-Host "      services/api/.env already exists, skipping." -ForegroundColor Gray
}

# ── 4. Set up PostgreSQL database ────────────────────────────────────────────
Write-Host "[4/6] Setting up PostgreSQL database..." -ForegroundColor Yellow

$pgUser     = "glt_user"
$pgPassword = "glt_dev_password"
$pgDb       = "goodlifetask"

# Find psql
$psqlPath = $null
$candidates = @(
    "C:\Program Files\PostgreSQL\16\bin\psql.exe",
    "C:\Program Files\PostgreSQL\15\bin\psql.exe",
    "C:\Program Files\PostgreSQL\14\bin\psql.exe",
    "C:\Program Files\PostgreSQL\17\bin\psql.exe"
)
foreach ($c in $candidates) {
    if (Test-Path $c) { $psqlPath = $c; break }
}
if (-not $psqlPath) {
    try { $psqlPath = (Get-Command psql).Source } catch {}
}

if (-not $psqlPath) {
    Write-Host "      WARNING: psql not found. Install PostgreSQL from https://postgresql.org" -ForegroundColor Red
    Write-Host "      Then manually run:" -ForegroundColor Red
    Write-Host "        CREATE USER $pgUser WITH PASSWORD '$pgPassword';" -ForegroundColor White
    Write-Host "        CREATE DATABASE $pgDb OWNER $pgUser;" -ForegroundColor White
    Write-Host "        GRANT ALL PRIVILEGES ON DATABASE $pgDb TO $pgUser;" -ForegroundColor White
} else {
    Write-Host "      Found psql at: $psqlPath" -ForegroundColor Green
    $env:PGPASSWORD = "postgres"
    $sql = @"
DO `$`$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$pgUser') THEN
    CREATE USER $pgUser WITH PASSWORD '$pgPassword';
  END IF;
END
`$`$;
SELECT 'CREATE DATABASE $pgDb OWNER $pgUser'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$pgDb')\gexec
GRANT ALL PRIVILEGES ON DATABASE $pgDb TO $pgUser;
"@
    try {
        $sql | & $psqlPath -U postgres -q
        Write-Host "      Database '$pgDb' and user '$pgUser' ready." -ForegroundColor Green
    } catch {
        Write-Host "      Could not auto-create DB. Run psql manually as postgres user." -ForegroundColor Red
    }
}

# ── 5. Install dependencies ──────────────────────────────────────────────────
Write-Host "[5/6] Installing dependencies (pnpm install)..." -ForegroundColor Yellow
pnpm install
Write-Host "      Dependencies installed." -ForegroundColor Green

# ── 6. Run DB migrations and seed ───────────────────────────────────────────
Write-Host "[6/6] Running database migrations and seed..." -ForegroundColor Yellow
try {
    pnpm db:migrate
    Write-Host "      Migrations done." -ForegroundColor Green
} catch {
    Write-Host "      Migration failed — make sure PostgreSQL is running and .env is correct." -ForegroundColor Red
}
try {
    pnpm db:seed
    Write-Host "      Seed done." -ForegroundColor Green
} catch {
    Write-Host "      Seed failed (may already be seeded, that's OK)." -ForegroundColor Gray
}

# ── Done ─────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Start the app:  pnpm dev" -ForegroundColor White
Write-Host "  Web:            http://localhost:3000" -ForegroundColor White
Write-Host "  Admin:          http://localhost:3002" -ForegroundColor White
Write-Host "  API:            http://localhost:3001" -ForegroundColor White
Write-Host ""
