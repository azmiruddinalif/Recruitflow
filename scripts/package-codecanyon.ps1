$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
Add-Type -AssemblyName System.IO.Compression.FileSystem

$rootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$distDir = Join-Path $rootDir "dist-codecanyon"
$mainFilesDir = Join-Path $distDir "Main Files"
$zipPath = Join-Path $rootDir "RecruitFlow-v1.0.0.zip"

if (Test-Path $distDir) { Remove-Item -Recurse -Force $distDir }
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }

New-Item -ItemType Directory -Force -Path $mainFilesDir | Out-Null

Write-Host "Packaging RecruitFlow-v1.0.0.zip for CodeCanyon release..." -ForegroundColor Cyan

$itemsToInclude = @(
    "apps",
    "packages",
    "prisma",
    "docs",
    "docker",
    "scripts",
    "e2e",
    ".github",
    ".env.example",
    ".gitignore",
    ".npmrc",
    "docker-compose.yml",
    "package.json",
    "package-lock.json",
    "pnpm-workspace.yaml",
    "playwright.config.ts",
    "tsconfig.base.json",
    "README.md",
    "LICENSE",
    "DEVELOPMENT_STATUS.md"
)

foreach ($item in $itemsToInclude) {
    $source = Join-Path $rootDir $item
    if (Test-Path $source) {
        Copy-Item -Path $source -Destination (Join-Path $mainFilesDir $item) -Recurse -Force
    }
}

# Remove node_modules, .next, dist, and temporary caches from Main Files
Get-ChildItem -Path $mainFilesDir -Include "node_modules", ".next", "dist", ".turbo" -Directory -Recurse -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

# Copy Documentation/ and Licenses/ to top-level of ZIP
Copy-Item -Path (Join-Path $rootDir "Documentation") -Destination (Join-Path $distDir "Documentation") -Recurse -Force
Copy-Item -Path (Join-Path $rootDir "Licenses") -Destination (Join-Path $distDir "Licenses") -Recurse -Force

[System.IO.Compression.ZipFile]::CreateFromDirectory($distDir, $zipPath)
Remove-Item -Recurse -Force $distDir

Write-Host "Successfully created CodeCanyon distribution archive: $zipPath" -ForegroundColor Green
