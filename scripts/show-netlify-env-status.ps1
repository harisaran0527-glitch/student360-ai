# Student360 AI - Netlify Environment Variable Inspector
# Safe local helper script: Checks status of required Netlify environment variables without printing secret values.

$envFilePath = Join-Path $PSScriptRoot "..\.env"

$keysToCheck = @(
    "NODE_ENV",
    "DATABASE_URL",
    "JWT_SECRET",
    "ADMIN_JWT_SECRET",
    "CLOUD_STORAGE_PROVIDER",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_BUCKET",
    "APP_URL",
    "CRON_SECRET",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "SMTP_FROM"
)

$envMap = @{}

if (Test-Path $envFilePath) {
    Get-Content $envFilePath | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $key = $parts[0].Trim()
            $val = $parts[1].Trim()
            if ($key) {
                $envMap[$key] = $val
            }
        }
    }
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Student360 AI - Netlify Environment Status Inspector    " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Local .env file location: $envFilePath"
Write-Host ""

Write-Host ("{0,-30} {1,-15} {2,-15}" -f "VARIABLE NAME", "LOCAL STATUS", "REQUIRED?") -ForegroundColor Yellow
Write-Host ("{0,-30} {1,-15} {2,-15}" -f "-------------", "------------", "---------") -ForegroundColor Yellow

foreach ($key in $keysToCheck) {
    $isSet = $envMap.ContainsKey($key) -and [string]::IsNullOrWhiteSpace($envMap[$key]) -eq $false
    $statusStr = if ($isSet) { "SET [YES]" } else { "MISSING [NO]" }
    $statusColor = if ($isSet) { "Green" } else { "DarkYellow" }

    $reqStr = switch ($key) {
        "NODE_ENV" { "REQUIRED" }
        "DATABASE_URL" { "REQUIRED" }
        "JWT_SECRET" { "REQUIRED" }
        "CLOUD_STORAGE_PROVIDER" { "REQUIRED" }
        "SUPABASE_URL" { "REQUIRED" }
        "SUPABASE_SERVICE_ROLE_KEY" { "REQUIRED" }
        "SUPABASE_BUCKET" { "REQUIRED" }
        "ADMIN_JWT_SECRET" { "NOT USED" }
        "APP_URL" { "POST-DEPLOY" }
        default { "OPTIONAL" }
    }

    Write-Host ("{0,-30} " -f $key) -NoNewline
    Write-Host ("{0,-15} " -f $statusStr) -ForegroundColor $statusColor -NoNewline
    Write-Host ("{0,-15}" -f $reqStr)
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "NOTE: Values are hidden for security. Never commit .env file." -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
