# Zero-dependency local web server in PowerShell with dynamic port fallback
$preferredPorts = @(8080, 8088, 3000, 5000, 8000, 9000)
$path = $PSScriptRoot
$listener = $null
$activePort = $null

foreach ($port in $preferredPorts) {
    try {
        $tempListener = New-Object System.Net.HttpListener
        $tempListener.Prefixes.Add("http://localhost:$port/")
        $tempListener.Start()
        $listener = $tempListener
        $activePort = $port
        break
    } catch {
        if ($tempListener) {
            try { $tempListener.Close() } catch {}
        }
    }
}

if (-not $listener) {
    Write-Host "Local HTTP listener could not be started. Opening index.html directly..." -ForegroundColor Yellow
    Start-Process (Join-Path $path "index.html")
    exit 0
}

try {
    Write-Host "=============================================" -ForegroundColor Magenta
    Write-Host "🌸 Kokoro AI Local Server is running! 🌸" -ForegroundColor Green
    Write-Host "URL: http://localhost:$activePort/" -ForegroundColor Cyan
    Write-Host "Microphone and speech recognition fully supported!" -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to close this window when done." -ForegroundColor Gray
    Write-Host "=============================================" -ForegroundColor Magenta
    
    Start-Process "http://localhost:$activePort/"

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $relPath = $request.Url.LocalPath.TrimStart('/').Replace('/', '\')
        if ([string]::IsNullOrEmpty($relPath)) { $relPath = "index.html" }
        $filePath = Join-Path $path $relPath

        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = switch ($ext) {
                ".html" { "text/html; charset=utf-8" }
                ".css"  { "text/css; charset=utf-8" }
                ".js"   { "application/javascript; charset=utf-8" }
                ".json" { "application/json; charset=utf-8" }
                ".svg"  { "image/svg+xml" }
                ".png"  { "image/png" }
                Default { "application/octet-stream" }
            }
            $response.ContentType = $mime
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
        }
        $response.Close()
    }
} catch {
    Write-Host "Server notice: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    if ($listener) {
        $listener.Stop()
    }
}
