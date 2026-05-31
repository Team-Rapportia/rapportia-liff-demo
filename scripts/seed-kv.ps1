param([switch]$Clear)
$ErrorActionPreference = "Stop"

$envFile = Join-Path (Join-Path $PSScriptRoot "..") ".env.local"
if (-not (Test-Path $envFile)) { Write-Error ".env.local not found"; exit 1 }
$envVars = @{}
foreach ($line in Get-Content $envFile) {
  if ($line -match '^\s*([^#=]+)=(.*)$') {
    $envVars[$Matches[1].Trim()] = $Matches[2].Trim().Trim('"')
  }
}
$kvUrl   = $envVars["KV_REST_API_URL"]
$kvToken = $envVars["KV_REST_API_TOKEN"]
if (-not $kvUrl -or -not $kvToken) { Write-Error "KV_REST_API_URL / KV_REST_API_TOKEN not set"; exit 1 }

function Invoke-KV([array]$cmd) {
  $body = ConvertTo-Json $cmd -Compress
  $r = Invoke-RestMethod -Method POST -Uri $kvUrl `
    -Headers @{ Authorization = "Bearer $kvToken"; "Content-Type" = "application/json" } `
    -Body $body
  return $r.result
}

if ($Clear) {
  Write-Host "Clearing existing reservations..."
  Invoke-KV @("DEL", "reservations") | Out-Null
}

$seedsPath = Join-Path $PSScriptRoot "seeds.json"
$seeds = [System.IO.File]::ReadAllText($seedsPath, [System.Text.Encoding]::UTF8) | ConvertFrom-Json

$now = [DateTimeOffset]::UtcNow

foreach ($s in $seeds) {
  $pickupDate  = $now.AddDays($s.daysFromNow).ToString("yyyy-MM-dd")
  $createdAt   = $now.AddHours(-$s.createdHoursAgo).ToString("yyyy-MM-ddTHH:mm:ss.000Z")
  $confirmedAt = if ($s.status -eq "confirmed") { $now.AddHours(-$s.createdHoursAgo).AddMinutes(4).ToString("yyyy-MM-ddTHH:mm:ss.000Z") } else { $null }

  $rec = [ordered]@{
    bookingId       = $s.bookingId
    lineUserId      = $s.lineUserId
    customerName    = $s.customerName
    productId       = $s.productId
    productName     = $s.productName
    productPriceJpy = $s.productPriceJpy
    quantity        = $s.quantity
    pickupDate      = $pickupDate
    pickupTimeSlot  = $s.pickupTimeSlot
    customerNote    = $s.customerNote
    depositJpy      = $s.depositJpy
    status          = $s.status
    createdAt       = $createdAt
  }
  if ($confirmedAt) { $rec["confirmedAt"] = $confirmedAt }

  $json = ConvertTo-Json $rec -Compress -Depth 5
  Invoke-KV @("HSET", "reservations", $s.bookingId, $json) | Out-Null
  Write-Host "  v $($s.customerName) / $($s.productId) [$($s.status)]"
}

Write-Host ""
Write-Host "Done! $($seeds.Count) reservations seeded."
Write-Host "Admin: https://cake-liff.team-rapportia.com/admin"
