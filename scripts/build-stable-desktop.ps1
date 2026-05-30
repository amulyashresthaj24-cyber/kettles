$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseDir = Join-Path $root "releases\stable-desktop"
$cargoPath = Join-Path $env:USERPROFILE ".cargo\bin"

Set-Location $root

if (Test-Path $cargoPath) {
  $env:Path = "$cargoPath;$env:Path"
}

function Invoke-Checked {
  param(
    [string]$Label,
    [scriptblock]$Command
  )

  Write-Host ""
  Write-Host $Label
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed with exit code $LASTEXITCODE"
  }
}

Write-Host "Flowmate stable desktop release"
Write-Host "Root: $root"

Invoke-Checked "Checking version alignment..." {
  node .\scripts\check-stable-version.mjs
}

Invoke-Checked "Building exported web app..." {
  node .\node_modules\next\dist\bin\next build
}

Invoke-Checked "Running TypeScript validation..." {
  node .\node_modules\typescript\bin\tsc --noEmit
}

Invoke-Checked "Checking Tauri Rust project..." {
  Push-Location .\src-tauri
  try {
    cargo check
  } finally {
    Pop-Location
  }
}

$releaseExe = Join-Path $root "src-tauri\target\release\flowmate-desktop.exe"
$lockingProcesses = Get-Process flowmate-desktop -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $releaseExe }
if ($lockingProcesses) {
  $pids = ($lockingProcesses | Select-Object -ExpandProperty Id) -join ", "
  throw "Close the running Flowmate desktop app before building installers. Locked process id(s): $pids"
}

Invoke-Checked "Building Windows desktop installer..." {
  node .\node_modules\@tauri-apps\cli\tauri.js build --config .\src-tauri\tauri.stable.conf.json
}

New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null

$bundleRoot = Join-Path $root "src-tauri\target\release\bundle"
$installers = @()
if (Test-Path $bundleRoot) {
  $installers = Get-ChildItem -Path $bundleRoot -Recurse -File -Include *.msi,*.exe
}

foreach ($installer in $installers) {
  Copy-Item -LiteralPath $installer.FullName -Destination $releaseDir -Force
}

$version = (Get-Content .\package.json | ConvertFrom-Json).version
$notesPath = Join-Path $releaseDir "README.md"
$date = Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz"

@"
# Flowmate Stable Desktop

Version: $version
Built: $date

Validation performed by scripts/build-stable-desktop.ps1:
- Stable version alignment
- TypeScript check
- Next.js production export
- Tauri cargo check
- Tauri Windows installer build

Installers copied here from src-tauri/target/release/bundle.
"@ | Set-Content -Path $notesPath -Encoding UTF8

Write-Host ""
Write-Host "Stable desktop release artifacts are in:"
Write-Host $releaseDir
