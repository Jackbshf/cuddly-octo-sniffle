@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

set "PREFERRED_JSON="
set "PUBLISH_FILE_LIST=%CD%\.publish-files.txt"
set "PUBLISH_MSG="

if not "%~1"=="" (
  if exist "%~1" (
    set "PREFERRED_JSON=%~1"
    if not "%~2"=="" set "PUBLISH_MSG=%~2"
  ) else (
    set "PUBLISH_MSG=%*"
  )
)

node "%~dp0scripts\sync-portfolio-json.mjs" ^
  --repo-root "%CD%" ^
  --preferred-json-path "%PREFERRED_JSON%" ^
  --no-publish-list
if errorlevel 1 exit /b 1

node "%~dp0scripts\media\sync-cloudflare-stream.mjs" ^
  --repo-root "%CD%" ^
  --publish-file "%PUBLISH_FILE_LIST%"
if errorlevel 1 exit /b 1

if defined PUBLISH_MSG (
  call "%SCRIPT_DIR%publish.bat" "%PUBLISH_MSG%"
) else (
  call "%SCRIPT_DIR%publish.bat"
)
