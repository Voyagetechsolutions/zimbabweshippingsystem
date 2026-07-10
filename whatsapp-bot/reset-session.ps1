param(
  [string]$SessionPath = $env:SESSION_PATH
)

if ([string]::IsNullOrWhiteSpace($SessionPath)) {
  $SessionPath = "/app/data/whatsapp-session"
}

$resolvedSessionPath = [System.IO.Path]::GetFullPath($SessionPath)

if (-not (Test-Path -LiteralPath $resolvedSessionPath)) {
  Write-Host "No session folder found at: $resolvedSessionPath"
  exit 0
}

$parent = Split-Path -Parent $resolvedSessionPath
$name = Split-Path -Leaf $resolvedSessionPath
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $parent "$name.backup-$timestamp"

Write-Host "Stopping the bot first is required before running this."
Write-Host "Backing up session:"
Write-Host "  From: $resolvedSessionPath"
Write-Host "  To:   $backupPath"

Move-Item -LiteralPath $resolvedSessionPath -Destination $backupPath
New-Item -ItemType Directory -Path $resolvedSessionPath | Out-Null

Write-Host "Session reset complete."
Write-Host "Run npm start and scan the new QR code from WhatsApp Linked Devices."
