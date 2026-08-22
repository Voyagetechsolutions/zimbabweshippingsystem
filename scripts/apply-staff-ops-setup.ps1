<#
.SYNOPSIS
  Runs the staff-ops "setup" action, which applies the embedded schema DDL to
  the live Supabase database.

.DESCRIPTION
  Schema changes on this project are NOT applied with `supabase db push` - the
  remote migration history is out of sync with supabase/migrations, so a push
  would replay ~50 old migrations including destructive ones. DDL goes through
  the staff-ops edge function instead, which holds the whole schema script as
  idempotent SQL and runs it against SUPABASE_DB_URL.

  Every staff-ops action is admin-gated, so this needs an admin access token.
  Get one without typing a password anywhere:

    1. Sign in to the admin dashboard in your browser as an admin.
    2. Open DevTools (F12) -> Console, paste this, press Enter:

         copy(JSON.parse(localStorage.getItem(
           'sb-oncsaunsqtekwwbzvvyh-auth-token')).access_token)

       That copies the token to your clipboard. It expires in about an hour.
    3. Run this script and paste it when prompted (or pass -AccessToken).

.EXAMPLE
  .\scripts\apply-staff-ops-setup.ps1

.EXAMPLE
  .\scripts\apply-staff-ops-setup.ps1 -AccessToken "eyJhbGci..." -Action verify
#>
[CmdletBinding()]
param(
  # Admin access token. Prompted for if omitted.
  [string]$AccessToken,

  # "setup" applies the DDL. "verify" is read-only smoke checks - safe to run
  # first, and a good way to confirm the token works before changing anything.
  [ValidateSet('setup', 'verify')]
  [string]$Action = 'setup',

  [string]$EnvFile = '.env'
)

$ErrorActionPreference = 'Stop'

# --- Read the project URL and publishable key out of .env --------------------
$envPath = Join-Path (Split-Path -Parent $PSScriptRoot) $EnvFile
if (-not (Test-Path $envPath)) { throw "Cannot find $envPath" }

$settings = @{}
foreach ($line in Get-Content $envPath) {
  $trimmed = $line.Trim()
  if ($trimmed -eq '' -or $trimmed.StartsWith('#')) { continue }
  $split = $trimmed.IndexOf('=')
  if ($split -lt 1) { continue }
  $name = $trimmed.Substring(0, $split).Trim()
  $value = $trimmed.Substring($split + 1).Trim().Trim('"').Trim("'")
  $settings[$name] = $value
}

$url = $settings['VITE_SUPABASE_URL']
$key = $settings['VITE_SUPABASE_PUBLISHABLE_KEY']
if (-not $url) { throw "VITE_SUPABASE_URL is not set in $envPath" }
if (-not $key) { throw "VITE_SUPABASE_PUBLISHABLE_KEY is not set in $envPath" }

if (-not $AccessToken) {
  Write-Host "Paste an admin access token (see the header of this script for how to get one)."
  $AccessToken = Read-Host "Access token"
}
$AccessToken = $AccessToken.Trim()
if (-not $AccessToken) { throw "No access token supplied." }

# --- Call the function -------------------------------------------------------
$endpoint = "$url/functions/v1/staff-ops"
Write-Host "POST $endpoint  ->  {""action"":""$Action""}"

$headers = @{
  'apikey'        = $key
  'Authorization' = "Bearer $AccessToken"
}

try {
  $response = Invoke-RestMethod -Method Post -Uri $endpoint -Headers $headers `
    -ContentType 'application/json' -Body (@{ action = $Action } | ConvertTo-Json)
  $response | ConvertTo-Json -Depth 8
  Write-Host ""
  Write-Host "Done." -ForegroundColor Green
}
catch {
  # Invoke-RestMethod throws on a non-2xx, and the useful message is in the
  # response body rather than the exception text.
  $status = $null
  if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
  $body = ''
  try {
    $stream = $_.Exception.Response.GetResponseStream()
    $body = (New-Object System.IO.StreamReader($stream)).ReadToEnd()
  } catch { }

  Write-Host ""
  switch ($status) {
    401 { Write-Host "401 - the token is missing or expired. Grab a fresh one; they last about an hour." -ForegroundColor Yellow }
    403 { Write-Host "403 - that account is not an admin (profiles.is_admin / role)." -ForegroundColor Yellow }
    default { Write-Host "Request failed$(if ($status) { " with status $status" })." -ForegroundColor Yellow }
  }
  if ($body) { Write-Host $body }
  throw
}
