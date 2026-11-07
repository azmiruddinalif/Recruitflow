$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  RecruitFlow — Commercial Self-Hosted Installer (Windows)  " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js (>=20.x) is required but was not found in PATH."
    exit 1
}

if (-not (Test-Path ".env")) {
    Write-Host "[1/5] Creating .env from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
} else {
    Write-Host "[1/5] Existing .env detected." -ForegroundColor Green
}

Write-Host "[2/5] Installing workspace dependencies..." -ForegroundColor Yellow
npm install

Write-Host "[3/5] Generating Prisma Client..." -ForegroundColor Yellow
npm run db:generate

Write-Host "[4/5] Building shared workspace packages..." -ForegroundColor Yellow
npm run build:packages

Write-Host "[5/5] Building applications..." -ForegroundColor Yellow
npm run build

Write-Host ""
Write-Host "RecruitFlow installation complete! Run 'npm run dev' to launch." -ForegroundColor Green

