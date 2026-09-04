$hookDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$gameDir = Resolve-Path (Join-Path $hookDir "..\..")
$root = Resolve-Path (Join-Path $gameDir "..")
$prefix = "http://127.0.0.1:8765/"

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($prefix)
try {
  $listener.Start()
} catch {
  exit 1
}

Write-Host "Serving $root at $prefix"
$types = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".svg"  = "image/svg+xml"
  ".ico"  = "image/x-icon"
  ".webp" = "image/webp"
  ".gif"  = "image/gif"
}

$tints = @("#e89a4a", "#f0a0c0", "#7eb8da", "#86ef64", "#c084fc", "#fb923c")
$presetNames = @{
  nest = "Sunny Nest"
  storm = "Sock Storm"
  crate = "Crate Club"
}
$rooms = @{}
$staleMs = 4000

function Sanitize-NestId([string]$value) {
  if ([string]::IsNullOrWhiteSpace($value)) { return "nest" }
  $clean = ([string]$value).ToLowerInvariant() -replace "[^a-z0-9\-]", ""
  if ([string]::IsNullOrWhiteSpace($clean)) { return "nest" }
  if ($clean.Length -gt 16) { $clean = $clean.Substring(0, 16) }
  return $clean
}

function Sanitize-NestName([string]$value) {
  if ([string]::IsNullOrWhiteSpace($value)) { return "Hamster" }
  $clean = ([string]$value).Trim()
  if ($clean.Length -gt 14) { $clean = $clean.Substring(0, 14) }
  return $clean
}

function Get-NestRoom([string]$id) {
  $key = Sanitize-NestId $id
  if (-not $rooms.ContainsKey($key)) {
    $label = if ($presetNames.ContainsKey($key)) { $presetNames[$key] } else { "Nest $key" }
    $rooms[$key] = @{
      id = $key
      name = $label
      seed = Get-Random -Minimum 1 -Maximum 999999999
      players = @{}
    }
  }
  return $rooms[$key]
}

function Prune-NestRoom($room) {
  $now = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  $gone = @()
  foreach ($playerId in @($room.players.Keys)) {
    if (($now - [int64]$room.players[$playerId].seen) -gt $staleMs) {
      $gone += $playerId
    }
  }
  foreach ($playerId in $gone) { $room.players.Remove($playerId) }
}

function Write-NestJson($ctx, [int]$code, $obj) {
  $json = $obj | ConvertTo-Json -Depth 8 -Compress
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  $ctx.Response.StatusCode = $code
  $ctx.Response.ContentType = "application/json; charset=utf-8"
  $ctx.Response.Headers["Cache-Control"] = "no-store"
  $ctx.Response.Headers["Access-Control-Allow-Origin"] = "*"
  $ctx.Response.ContentLength64 = $bytes.Length
  $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
}

function Read-NestBody($ctx) {
  $reader = New-Object System.IO.StreamReader($ctx.Request.InputStream, [Text.Encoding]::UTF8)
  try {
    $raw = $reader.ReadToEnd()
    if ([string]::IsNullOrWhiteSpace($raw)) { return [pscustomobject]@{} }
    return $raw | ConvertFrom-Json
  } catch {
    return [pscustomobject]@{}
  } finally {
    $reader.Dispose()
  }
}

function Get-Prop($obj, [string]$name, $fallback) {
  if ($null -eq $obj) { return $fallback }
  $prop = $obj.PSObject.Properties[$name]
  if ($null -eq $prop -or $null -eq $prop.Value) { return $fallback }
  return $prop.Value
}

function Public-Player($player) {
  return [ordered]@{
    id = $player.id
    name = $player.name
    tint = $player.tint
    worldX = $player.worldX
    y = $player.y
    facing = $player.facing
    hp = $player.hp
    run = $player.run
    squash = $player.squash
    attack = $player.attack
    hurt = $player.hurt
    score = $player.score
    alive = $player.alive
  }
}

Get-NestRoom "nest" | Out-Null
Get-NestRoom "storm" | Out-Null
Get-NestRoom "crate" | Out-Null

function Handle-Nest($ctx, [string]$path) {
  $method = $ctx.Request.HttpMethod
  if ($method -eq "OPTIONS") {
    $ctx.Response.StatusCode = 204
    $ctx.Response.Headers["Access-Control-Allow-Origin"] = "*"
    $ctx.Response.Headers["Access-Control-Allow-Headers"] = "Content-Type"
    $ctx.Response.Headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    $ctx.Response.ContentLength64 = 0
    return
  }

  if ($method -eq "GET" -and $path -eq "/nest/rooms") {
    foreach ($room in @($rooms.Values)) { Prune-NestRoom $room }
    $list = @()
    foreach ($key in @("nest", "storm", "crate")) {
      $room = Get-NestRoom $key
      $list += [ordered]@{
        id = $room.id
        name = $room.name
        players = $room.players.Count
        seed = $room.seed
      }
    }
    foreach ($room in @($rooms.Values)) {
      if ($presetNames.ContainsKey($room.id)) { continue }
      if ($room.players.Count -le 0) { continue }
      $list += [ordered]@{
        id = $room.id
        name = $room.name
        players = $room.players.Count
        seed = $room.seed
      }
    }
    Write-NestJson $ctx 200 ([ordered]@{ ok = $true; rooms = $list })
    return
  }

  if ($method -eq "POST" -and $path -eq "/nest/join") {
    $body = Read-NestBody $ctx
    $room = Get-NestRoom (Get-Prop $body "room" "nest")
    Prune-NestRoom $room
    $id = "h" + [guid]::NewGuid().ToString("N").Substring(0, 8)
    $token = [guid]::NewGuid().ToString("N")
    $name = Sanitize-NestName (Get-Prop $body "name" "Hamster")
    $tint = $tints[$room.players.Count % $tints.Count]
    $now = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    $room.players[$id] = @{
      id = $id
      token = $token
      name = $name
      tint = $tint
      worldX = 180
      y = 430
      facing = 1
      hp = 100
      run = 0
      squash = 1
      attack = 0
      hurt = 0
      score = 0
      alive = $true
      seen = $now
    }
    Write-NestJson $ctx 200 ([ordered]@{
      ok = $true
      id = $id
      token = $token
      room = $room.id
      roomName = $room.name
      seed = $room.seed
      tint = $tint
      name = $name
    })
    return
  }

  if ($method -eq "POST" -and $path -eq "/nest/update") {
    $body = Read-NestBody $ctx
    $room = Get-NestRoom (Get-Prop $body "room" "nest")
    Prune-NestRoom $room
    $id = [string](Get-Prop $body "id" "")
    $token = [string](Get-Prop $body "token" "")
    if (-not $room.players.ContainsKey($id) -or $room.players[$id].token -ne $token) {
      Write-NestJson $ctx 403 ([ordered]@{ ok = $false })
      return
    }
    $me = $room.players[$id]
    $me.worldX = [double](Get-Prop $body "worldX" $me.worldX)
    $me.y = [double](Get-Prop $body "y" $me.y)
    $facing = [int](Get-Prop $body "facing" $me.facing)
    $me.facing = if ($facing -ge 0) { 1 } else { -1 }
    $me.hp = [double](Get-Prop $body "hp" $me.hp)
    $me.run = [double](Get-Prop $body "run" $me.run)
    $me.squash = [double](Get-Prop $body "squash" $me.squash)
    $me.attack = [double](Get-Prop $body "attack" $me.attack)
    $me.hurt = [double](Get-Prop $body "hurt" $me.hurt)
    $me.score = [int](Get-Prop $body "score" $me.score)
    $me.alive = [bool](Get-Prop $body "alive" $true)
    $me.seen = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

    $others = @()
    foreach ($playerId in @($room.players.Keys)) {
      if ($playerId -eq $id) { continue }
      $others += Public-Player $room.players[$playerId]
    }
    Write-NestJson $ctx 200 ([ordered]@{
      ok = $true
      players = @($others)
      count = $room.players.Count
      seed = $room.seed
      name = $room.name
    })
    return
  }

  if ($method -eq "POST" -and $path -eq "/nest/leave") {
    $body = Read-NestBody $ctx
    $key = Sanitize-NestId (Get-Prop $body "room" "nest")
    if ($rooms.ContainsKey($key)) {
      $room = $rooms[$key]
      $id = [string](Get-Prop $body "id" "")
      $token = [string](Get-Prop $body "token" "")
      if ($room.players.ContainsKey($id) -and $room.players[$id].token -eq $token) {
        $room.players.Remove($id)
      }
    }
    Write-NestJson $ctx 200 ([ordered]@{ ok = $true })
    return
  }

  Write-NestJson $ctx 404 ([ordered]@{ ok = $false })
}

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.LocalPath)
    if ($path.StartsWith("/nest")) {
      Handle-Nest $ctx $path
      continue
    }
    if ($path -eq "/") { $path = "/index.html" }
    $relative = $path.TrimStart("/").Replace("/", "\")
    $file = Join-Path $root $relative
    if (Test-Path $file -PathType Container) {
      $file = Join-Path $file "index.html"
    }
    if (Test-Path $file -PathType Leaf) {
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $ext = [IO.Path]::GetExtension($file).ToLowerInvariant()
      $ctx.Response.StatusCode = 200
      $ctx.Response.ContentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { "application/octet-stream" }
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $msg = [Text.Encoding]::UTF8.GetBytes("Not found")
      $ctx.Response.StatusCode = 404
      $ctx.Response.ContentType = "text/plain; charset=utf-8"
      $ctx.Response.ContentLength64 = $msg.Length
      $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
    }
  } catch {
    try {
      $msg = [Text.Encoding]::UTF8.GetBytes($_.Exception.Message)
      $ctx.Response.StatusCode = 500
      $ctx.Response.ContentType = "text/plain; charset=utf-8"
      $ctx.Response.ContentLength64 = $msg.Length
      $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
    } catch {}
  } finally {
    try { $ctx.Response.Close() } catch {}
  }
}
