$authBody = @{
    email    = "admin@techaasvik.com"
    password = "Admin@Techaasvik2026!"
} | ConvertTo-Json

# 1. Login
try {
    Write-Host "Logging in as Super Admin..."
    $loginResp = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method Post -Body $authBody -ContentType "application/json"
    $token = $loginResp.access_token
    Write-Host "Login successful. Token obtained." -ForegroundColor Cyan
}
catch {
    Write-Error "Login failed! Ensure backend is running."
    exit 1
}

# 2. Create Tenant
$randomId = Get-Random -Minimum 1000 -Maximum 9999
$tenantBody = @{
    business_name = "Acme Corp $randomId"
    owner_name    = "Jane Doe"
    owner_email   = "jane.doe.$randomId@acme.com"
    timezone      = "UTC"
    locale        = "en"
} | ConvertTo-Json

Write-Host "`nCreating New Tenant..."
try {
    $headers = @{ Authorization = "Bearer $token" }
    $createResp = Invoke-RestMethod -Uri "http://localhost:3001/api/tenants" -Method Post -Body $tenantBody -ContentType "application/json" -Headers $headers
    Write-Host "Tenant Created Successfully!" -ForegroundColor Green
    Write-Host "ID: $($createResp.id)"
    Write-Host "Name: $($createResp.business_name)"
    Write-Host "Status: $($createResp.status)"
}
catch {
    Write-Error "Create Tenant failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host $reader.ReadToEnd() -ForegroundColor Red
    }
}

# 3. List Tenants
Write-Host "`nListing All Tenants..."
try {
    $listResp = Invoke-RestMethod -Uri "http://localhost:3001/api/tenants" -Method Get -Headers $headers
    $listResp | Format-Table -Property business_name, owner_email, status, created_at -AutoSize
}
catch {
    Write-Error "List Tenants failed."
}
