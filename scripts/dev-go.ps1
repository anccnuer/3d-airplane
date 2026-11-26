Set-Location -Path (Split-Path -Parent $PScriptRoot)
npm run export:game-data
npm run server:run
