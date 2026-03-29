$body = @{
    email    = "admin@techaasvik.com"
    password = "Admin@Techaasvik2026!"
} | ConvertTo-Json

Write-Host "Testing Login at http://localhost:3001/api/auth/login ..."
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    Write-Host "Login Successful!" -ForegroundColor Green
    Write-Host "Access Token: $($response.access_token)"
    Write-Host "`n✅ API is LIVE and responding."
    Write-Host "👉 You can visualy test the API here: http://localhost:3001/api/docs" -ForegroundColor Cyan
}
catch {
    Write-Host "Login Failed!" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host $reader.ReadToEnd()
    }
}
