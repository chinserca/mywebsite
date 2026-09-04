$ErrorActionPreference = "Continue"

try {
  $null = [Console]::In.ReadToEnd()
} catch {}

$hookDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$serveScript = Join-Path $hookDir "serve.ps1"
$gameUrl = "http://127.0.0.1:8765/game%202/index.html"
$homeUrl = "http://127.0.0.1:8765/"

function Test-PortOpen {
  try {
    $client = [System.Net.Sockets.TcpClient]::new()
    $iar = $client.BeginConnect("127.0.0.1", 8765, $null, $null)
    $ok = $iar.AsyncWaitHandle.WaitOne(400)
    if ($ok -and $client.Connected) {
      $client.Close()
      return $true
    }
    $client.Close()
  } catch {}
  return $false
}

$already = Test-PortOpen
if (-not $already) {
  Start-Process -FilePath "powershell.exe" -WindowStyle Hidden -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $serveScript
  ) | Out-Null

  $deadline = (Get-Date).AddSeconds(8)
  while (-not (Test-PortOpen) -and (Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 200
  }
}

$running = Test-PortOpen
if ($running) {
  $msg = "Game server is running. Hamster Dash: $gameUrl Join Server uses the same nest. Games home: $homeUrl"
} else {
  $msg = "Tried to start the game server on port 8765, but it is not responding yet. Ask to run the server if the game will not load."
}

$payload = @{ additional_context = $msg } | ConvertTo-Json -Compress
[Console]::Out.WriteLine($payload)
exit 0
