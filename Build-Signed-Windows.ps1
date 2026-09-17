param([string]$PrivateKeyPath = "$env:USERPROFILE\.teacher-workspace\updater.key")
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (!(Test-Path -LiteralPath $PrivateKeyPath)) { throw 'Updater key not found. Do not generate a replacement for an existing release channel.' }
$previousKey = $env:TAURI_SIGNING_PRIVATE_KEY
$previousPassword = $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD
try {
  npm.cmd ci
  if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed' }
  npm.cmd run check
  if ($LASTEXITCODE -ne 0) { throw 'Frontend validation failed' }
  cargo test --manifest-path src-tauri/Cargo.toml
  if ($LASTEXITCODE -ne 0) { throw 'Native validation failed' }
  $env:TAURI_SIGNING_PRIVATE_KEY = Get-Content -LiteralPath $PrivateKeyPath -Raw
  $secret = Read-Host 'Updater key password (press Enter if none)' -AsSecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
  try { $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer); $secret.Dispose() }
  npm.cmd run desktop:build
  if ($LASTEXITCODE -ne 0) { throw 'Installer build or update signing failed' }
  $config = Get-Content src-tauri/tauri.conf.json -Raw | ConvertFrom-Json
  $version = $config.version
  $name = "Teacher Workspace_${version}_x64-setup.exe"
  $installer = Join-Path $PSScriptRoot "src-tauri/target/release/bundle/nsis/$name"
  $encodedName = [Uri]::EscapeDataString($name)
  $url = "https://github.com/nvghy19112002-cmd/TeacherWorkspace/releases/download/v$version/$encodedName"
  node scripts/release-manifest.mjs $installer $url
  if ($LASTEXITCODE -ne 0) { throw 'Update manifest generation failed' }
  Write-Host 'Build complete. Upload the installer, its .sig, and latest.json to the matching GitHub release.'
  Start-Process explorer.exe (Split-Path $installer)
} finally {
  $env:TAURI_SIGNING_PRIVATE_KEY = $previousKey
  $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = $previousPassword
}
