param(
  [Parameter(Mandatory=$true)][string]$PrivateKeyPath,
  [Parameter(Mandatory=$true)][string]$DownloadUrl,
  [string]$NotesFile
)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (!(Test-Path $PrivateKeyPath)) { throw 'Khong tim thay khoa ky rieng.' }
$config = Get-Content src-tauri/tauri.conf.json -Raw | ConvertFrom-Json
if (!$config.plugins.updater.pubkey -or !$config.bundle.createUpdaterArtifacts) { throw 'Can chay release:configure truoc.' }
try {
  $env:TAURI_SIGNING_PRIVATE_KEY = Get-Content -LiteralPath $PrivateKeyPath -Raw
  # Set TAURI_SIGNING_PRIVATE_KEY_PASSWORD in this PowerShell session if the key is encrypted.
  npm ci
  if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' }
  npm run check
  if ($LASTEXITCODE -ne 0) { throw 'Validation failed' }
  npm run tauri -- build --target x86_64-pc-windows-msvc --bundles nsis
  if ($LASTEXITCODE -ne 0) { throw 'Windows build failed' }
  $version = $config.version
  $installers = @(Get-ChildItem "src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/*_${version}_x64-setup.exe")
  if ($installers.Count -ne 1) { throw 'Khong xac dinh duoc dung mot bo cai cho phien ban hien tai.' }
  $manifestArgs = @('scripts/release-manifest.mjs', $installers[0].FullName, $DownloadUrl)
  if ($NotesFile) { $manifestArgs += $NotesFile }
  & node @manifestArgs
  if ($LASTEXITCODE -ne 0) { throw 'Manifest failed' }
  Write-Host 'Da build ban cap nhat co chu ky. Chua tu dong dang len Internet.'
} finally {
  Remove-Item Env:TAURI_SIGNING_PRIVATE_KEY -ErrorAction SilentlyContinue
}
