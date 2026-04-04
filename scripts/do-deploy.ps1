# GoodLifeTask — DigitalOcean Deploy Script
# Usage:
#   .\scripts\do-deploy.ps1 -Env dev    # deploy dev environment
#   .\scripts\do-deploy.ps1 -Env prod   # deploy prod environment
#   .\scripts\do-deploy.ps1 -Env dev -Destroy  # tear down dev

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "prod")]
    [string]$Env,

    [switch]$Destroy,
    [switch]$Plan
)

$ErrorActionPreference = "Stop"
$RootDir    = Split-Path $PSScriptRoot -Parent
$InfraDir   = "$RootDir\infrastructure\digitalocean\environments\$Env"
$TfVarsFile = "$InfraDir\terraform.tfvars"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  GoodLifeTask — DigitalOcean Deploy [$Env]" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Check Terraform ────────────────────────────────────────────────────────
Write-Host "[1/5] Checking Terraform..." -ForegroundColor Yellow
if (-not (Get-Command terraform -ErrorAction SilentlyContinue)) {
    Write-Host "      Terraform not found. Downloading..." -ForegroundColor Yellow
    $tfUrl  = "https://releases.hashicorp.com/terraform/1.8.5/terraform_1.8.5_windows_amd64.zip"
    $tfZip  = "$env:TEMP\terraform.zip"
    $tfDest = "C:\terraform"
    Invoke-WebRequest -Uri $tfUrl -OutFile $tfZip
    Expand-Archive -Path $tfZip -DestinationPath $tfDest -Force
    $env:PATH += ";$tfDest"
    Write-Host "      Terraform installed to $tfDest" -ForegroundColor Green
    Write-Host "      Add C:\terraform to your system PATH to skip this step next time." -ForegroundColor Gray
} else {
    $tfVer = terraform version -json | ConvertFrom-Json | Select-Object -ExpandProperty terraform_version
    Write-Host "      Terraform $tfVer found." -ForegroundColor Green
}

# ── 2. Check doctl ────────────────────────────────────────────────────────────
Write-Host "[2/5] Checking doctl..." -ForegroundColor Yellow
if (-not (Get-Command doctl -ErrorAction SilentlyContinue)) {
    Write-Host "      doctl not found. Downloading..." -ForegroundColor Yellow
    $dUrl  = "https://github.com/digitalocean/doctl/releases/download/v1.110.0/doctl-1.110.0-windows-amd64.zip"
    $dZip  = "$env:TEMP\doctl.zip"
    $dDest = "C:\doctl"
    Invoke-WebRequest -Uri $dUrl -OutFile $dZip
    Expand-Archive -Path $dZip -DestinationPath $dDest -Force
    $env:PATH += ";$dDest"
    Write-Host "      doctl installed." -ForegroundColor Green
} else {
    Write-Host "      doctl found." -ForegroundColor Green
}

# ── 3. Check terraform.tfvars ─────────────────────────────────────────────────
Write-Host "[3/5] Checking terraform.tfvars..." -ForegroundColor Yellow
if (-not (Test-Path $TfVarsFile)) {
    Write-Host ""
    Write-Host "      terraform.tfvars not found at:" -ForegroundColor Red
    Write-Host "      $TfVarsFile" -ForegroundColor White
    Write-Host ""
    Write-Host "      Copy the example file and fill in your values:" -ForegroundColor Yellow
    Write-Host "      cp $InfraDir\terraform.tfvars.example $TfVarsFile" -ForegroundColor White
    Write-Host ""
    Write-Host "      You need:" -ForegroundColor Yellow
    Write-Host "        do_token     -> https://cloud.digitalocean.com/account/api/tokens" -ForegroundColor White
    Write-Host "        ssh_key_ids  -> Run: doctl compute ssh-key list" -ForegroundColor White
    Write-Host "        spaces_key   -> https://cloud.digitalocean.com/account/api/tokens (Spaces tab)" -ForegroundColor White
    exit 1
}
Write-Host "      terraform.tfvars found." -ForegroundColor Green

# ── 4. Terraform init ─────────────────────────────────────────────────────────
Write-Host "[4/5] Terraform init..." -ForegroundColor Yellow
Set-Location $InfraDir

# Read DO token for backend auth
$tfVarsContent = Get-Content $TfVarsFile | Where-Object { $_ -match "do_token" }
$doToken = ($tfVarsContent -split "=")[1].Trim().Trim('"')
$spacesKey    = (Get-Content $TfVarsFile | Where-Object { $_ -match "^spaces_key" } | ForEach-Object { ($_ -split "=")[1].Trim().Trim('"') })
$spacesSecret = (Get-Content $TfVarsFile | Where-Object { $_ -match "^spaces_secret" } | ForEach-Object { ($_ -split "=")[1].Trim().Trim('"') })

$env:AWS_ACCESS_KEY_ID     = $spacesKey
$env:AWS_SECRET_ACCESS_KEY = $spacesSecret

terraform init -upgrade
Write-Host "      Init complete." -ForegroundColor Green

# ── 5. Apply / Destroy / Plan ─────────────────────────────────────────────────
Write-Host "[5/5] Running Terraform $( if($Destroy){'destroy'} elseif($Plan){'plan'} else {'apply'} )..." -ForegroundColor Yellow

if ($Destroy) {
    Write-Host ""
    Write-Host "  WARNING: This will DESTROY all $Env infrastructure!" -ForegroundColor Red
    $confirm = Read-Host "  Type 'yes' to confirm"
    if ($confirm -ne "yes") { Write-Host "Aborted." -ForegroundColor Gray; exit 0 }
    terraform destroy -var-file=$TfVarsFile -auto-approve
} elseif ($Plan) {
    terraform plan -var-file=$TfVarsFile
} else {
    terraform apply -var-file=$TfVarsFile -auto-approve
}

# ── Print outputs ─────────────────────────────────────────────────────────────
if (-not $Destroy -and -not $Plan) {
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Green
    Write-Host "  Deploy complete! Outputs:" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    terraform output
    Write-Host ""
    Write-Host "  NOTE: API droplet takes ~3 min to bootstrap on first boot." -ForegroundColor Yellow
    Write-Host "  Watch logs: ssh root@<api_ip> 'journalctl -fu glt-api'" -ForegroundColor White
    Write-Host ""
}
