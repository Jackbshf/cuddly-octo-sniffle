@echo off
setlocal
cd /d "%~dp0"

set "MSG=%~1"
if "%MSG%"=="" set "MSG=update portfolio"
set "PUBLISH_FILE_LIST=%CD%\.publish-files.txt"

if not exist "%PUBLISH_FILE_LIST%" (
  echo Missing .publish-files.txt. Please run 一键发布.bat instead.
  exit /b 1
)

git diff --cached --quiet
if not %errorlevel%==0 (
  echo There are already staged changes. Please commit or unstage them before publishing.
  exit /b 1
)

for /f "usebackq delims=" %%F in ("%PUBLISH_FILE_LIST%") do (
  if not "%%~F"=="" git add -- "%%F"
  if errorlevel 1 exit /b 1
)

git diff --cached --quiet
if %errorlevel%==0 (
  echo No staged changes. Skip publish.
  exit /b 0
)

git commit -m "%MSG%"
if errorlevel 1 exit /b 1

git push origin HEAD:main
if errorlevel 1 exit /b 1

del "%PUBLISH_FILE_LIST%" >nul 2>nul
echo Pushed to GitHub. Cloudflare will deploy automatically.
