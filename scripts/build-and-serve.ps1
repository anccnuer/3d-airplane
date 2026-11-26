Set-Location -Path (Split-Path -Parent $PSScriptRoot)
npm install
npm run export:game-data
npm run build
npm run server:build
Write-Host "dist/ 已构建，Go 服务只提供 WebSocket。请用任意静态 Web 服务器托管 dist/，然后启动 server/cmd/server。"
