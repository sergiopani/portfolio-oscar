$port = 8765
$root = "C:\Users\oscar\OneDrive\Escritorio\Claude\Sessions\normia"

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css"
  ".js"   = "application/javascript"
  ".json" = "application/json"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".png"  = "image/png"
  ".webp" = "image/webp"
  ".svg"  = "image/svg+xml"
  ".woff2"= "font/woff2"
  ".woff" = "font/woff"
  ".ico"  = "image/x-icon"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Serving at http://localhost:$port/"

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $req = $ctx.Request
  $res = $ctx.Response

  $local = $req.Url.LocalPath -replace "/", "\"
  if ($local -eq "\") { $local = "\index.html" }
  $path = Join-Path $root $local.TrimStart("\")

  if (Test-Path $path -PathType Leaf) {
    $ext = [System.IO.Path]::GetExtension($path).ToLower()
    $ct = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" }
    $res.ContentType = $ct
    $bytes = [System.IO.File]::ReadAllBytes($path)
    $res.ContentLength64 = $bytes.Length
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $res.StatusCode = 404
    $bytes = [System.Text.Encoding]::UTF8.GetBytes("Not found")
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
  }
  $res.Close()
}
