$secureKey = Read-Host "Paste your NEW OpenAI API key" -AsSecureString
$plainKey = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
)

if ([string]::IsNullOrWhiteSpace($plainKey)) {
  Write-Error "No key entered."
  exit 1
}

$deployDir = Join-Path $env:TEMP "zimship-ai-chat-deploy"
if (Test-Path -LiteralPath $deployDir) {
  Remove-Item -LiteralPath $deployDir -Recurse -Force
}

$functionDir = Join-Path $deployDir "supabase\functions\ai-chat"
New-Item -ItemType Directory -Path $functionDir -Force | Out-Null
Copy-Item -LiteralPath "supabase\functions\ai-chat\index.ts" -Destination (Join-Path $functionDir "index.ts")
@'
project_id = "oncsaunsqtekwwbzvvyh"

[functions.ai-chat]
verify_jwt = true
'@ | Set-Content -LiteralPath (Join-Path $deployDir "supabase\config.toml") -Encoding UTF8

npx supabase secrets set "OPENAI_API_KEY=$plainKey" --project-ref oncsaunsqtekwwbzvvyh --workdir $deployDir

if ($LASTEXITCODE -ne 0) {
  Write-Error "Failed to set Supabase secret."
  exit $LASTEXITCODE
}

Write-Host "OpenAI key saved to Supabase secrets."
Write-Host "Deploying ai-chat function..."

npx supabase functions deploy ai-chat --project-ref oncsaunsqtekwwbzvvyh --workdir $deployDir
