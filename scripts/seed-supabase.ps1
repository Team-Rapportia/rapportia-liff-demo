param([switch]$Clear)
$ErrorActionPreference = "Stop"

# .env.local から Supabase 接続情報を読む
$envFile = Join-Path (Join-Path $PSScriptRoot "..") ".env.local"
if (-not (Test-Path $envFile)) { Write-Error ".env.local not found"; exit 1 }
$envVars = @{}
foreach ($line in Get-Content $envFile) {
  if ($line -match '^\s*([^#=]+)=(.*)$') {
    $envVars[$Matches[1].Trim()] = $Matches[2].Trim().Trim('"')
  }
}
$url   = $envVars["SUPABASE_URL"]
$key   = $envVars["SUPABASE_SERVICE_ROLE_KEY"]
$demoId = if ($envVars["DEMO_ID"]) { $envVars["DEMO_ID"] } else { "cake" }
if (-not $url -or -not $key) {
  Write-Error "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set"; exit 1
}

$restBase = "$($url.TrimEnd('/'))/rest/v1/reservations"
$headers = @{
  apikey        = $key
  Authorization = "Bearer $key"
  "Content-Type" = "application/json"
  Prefer        = "resolution=merge-duplicates"  # PK 競合は upsert
}
# Supabase の新型 secret キー(sb_secret_) は UserAgent が "Mozilla..." だと
# 「ブラウザからの使用」と判定して拒否する。非ブラウザ UA を明示する。
$UA = "rapportia-seeder/1.0"

if ($Clear) {
  Write-Host "Clearing existing reservations for demo_id=$demoId..."
  Invoke-RestMethod -Method DELETE -Uri "$restBase?demo_id=eq.$demoId" -Headers $headers -UserAgent $UA | Out-Null
}

$seedsPath = Join-Path $PSScriptRoot "seeds.json"
$seeds = [System.IO.File]::ReadAllText($seedsPath, [System.Text.Encoding]::UTF8) | ConvertFrom-Json

$now = [DateTimeOffset]::UtcNow
$rows = @()

foreach ($s in $seeds) {
  $pickupDate  = $now.AddDays($s.daysFromNow).ToString("yyyy-MM-dd")
  $createdAt   = $now.AddHours(-$s.createdHoursAgo).ToString("yyyy-MM-ddTHH:mm:ss.000Z")
  $confirmedAt = if ($s.status -eq "confirmed") { $now.AddHours(-$s.createdHoursAgo).AddMinutes(4).ToString("yyyy-MM-ddTHH:mm:ss.000Z") } else { $null }

  $row = [ordered]@{
    booking_id        = $s.bookingId
    demo_id           = $demoId
    line_user_id      = $s.lineUserId
    customer_name     = $s.customerName
    product_id        = $s.productId
    product_name      = $s.productName
    product_price_jpy = $s.productPriceJpy
    quantity          = $s.quantity
    pickup_date       = $pickupDate
    pickup_time_slot  = $s.pickupTimeSlot
    customer_note     = $s.customerNote
    deposit_jpy       = $s.depositJpy
    status            = $s.status
    created_at        = $createdAt
    confirmed_at      = $confirmedAt
  }
  $rows += $row
}

$body = ConvertTo-Json @($rows) -Depth 5
Invoke-RestMethod -Method POST -Uri $restBase -Headers $headers -UserAgent $UA -Body $body | Out-Null
foreach ($s in $seeds) { Write-Host "  v $($s.customerName) / $($s.productId) [$($s.status)]" }

Write-Host ""
Write-Host "Done! $($seeds.Count) reservations seeded to Supabase (demo_id=$demoId)."
Write-Host "Admin: https://cake-liff.team-rapportia.com/admin"
