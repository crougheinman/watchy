@echo off
setlocal enabledelayedexpansion
title Watchy - Build Debug APK

REM Always run from this script's folder (the project root).
cd /d "%~dp0"

echo ============================================
echo    Watchy  -  Build Debug APK
echo ============================================
echo.

REM --- Find a JDK (Android Studio bundles one) ---
if not defined JAVA_HOME (
  if exist "C:\Program Files\Android\Android Studio\jbr\bin\java.exe" (
    set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
  ) else if exist "%LOCALAPPDATA%\Programs\Android Studio\jbr\bin\java.exe" (
    set "JAVA_HOME=%LOCALAPPDATA%\Programs\Android Studio\jbr"
  )
)
if not defined JAVA_HOME (
  echo ERROR: No JDK found. Install Android Studio, or set JAVA_HOME
  echo to your JDK / Android Studio "jbr" folder, then re-run.
  echo.
  pause
  exit /b 1
)
echo Using JAVA_HOME=%JAVA_HOME%
echo.

echo [1/4] Syncing version from Supabase (app_config.latest_version)...
call node "scripts\sync-version.mjs"
echo.

echo [2/4] Building web app (npm run build)...
call npm run build
if errorlevel 1 (
  echo.
  echo ^>^> Web build FAILED.
  pause
  exit /b 1
)
echo.

echo [3/4] Syncing to Android (cap sync)...
call npx cap sync android
if errorlevel 1 (
  echo.
  echo ^>^> Cap sync FAILED.
  pause
  exit /b 1
)
echo.

echo [4/4] Assembling debug APK (gradlew assembleDebug)...
pushd android
call .\gradlew.bat assembleDebug --console=plain
set "GRADLE_EXIT=%errorlevel%"
popd
if not "%GRADLE_EXIT%"=="0" (
  echo.
  echo ^>^> Gradle build FAILED.
  pause
  exit /b 1
)
echo.

set "APK=android\app\build\outputs\apk\debug\app-debug.apk"
if not exist "%APK%" (
  echo ERROR: Expected APK not found at %APK%
  pause
  exit /b 1
)

REM Name the output watchy-<version>.apk (version comes from package.json,
REM which step 1/4 synced from Supabase).
set "APP_VER=debug"
for /f "delims=" %%v in ('node -p "require('./package.json').version" 2^>nul') do set "APP_VER=%%v"
set "OUT=watchy-%APP_VER%.apk"

copy /Y "%APK%" "%OUT%" >nul

echo ============================================
echo    BUILD SUCCESS
echo    %~dp0%OUT%
echo ============================================
echo.

REM --- Optional: upload to Google Drive via rclone ---------------------------
REM One-time setup (see notes at bottom of this file):
REM   1) install rclone   2) run: rclone config  (make a Drive remote)
REM   3) put the remote name in RCLONE_REMOTE below.
set "RCLONE_REMOTE=gdrive"
set "DRIVE_FOLDER_ID=1hx-BTBOxJhpiCry5LFwz64VQHFsRjHG2"

REM Locate rclone: PATH first, then the winget install folder.
set "RCLONE_EXE="
where rclone >nul 2>nul && set "RCLONE_EXE=rclone"
if not defined RCLONE_EXE (
  for /f "delims=" %%f in ('dir /b /s "%LOCALAPPDATA%\Microsoft\WinGet\Packages\Rclone.Rclone*\rclone.exe" 2^>nul') do set "RCLONE_EXE=%%f"
)

if not defined RCLONE_EXE (
  echo [upload] rclone not found - skipping Google Drive upload.
  echo          Install rclone + run "rclone config" to enable auto-upload.
) else (
  echo [upload] Uploading %OUT% to Google Drive...
  "%RCLONE_EXE%" copyto "%OUT%" "%RCLONE_REMOTE%:%OUT%" --drive-root-folder-id=%DRIVE_FOLDER_ID% --progress
  if errorlevel 1 (
    echo [upload] ^>^> Upload FAILED. Check "rclone config" / the remote name.
  ) else (
    echo [upload] Done - %OUT% is live in the Drive folder.
  )
)

echo.
if not defined NOPAUSE pause
goto :eof

REM ===========================================================================
REM  GOOGLE DRIVE AUTO-UPLOAD SETUP (one time)
REM ---------------------------------------------------------------------------
REM  1. Install rclone:  https://rclone.org/downloads/  (or: winget install Rclone.Rclone)
REM  2. Run:  rclone config
REM       - n) New remote
REM       - name> gdrive            (must match RCLONE_REMOTE above)
REM       - storage> drive          (Google Drive)
REM       - client_id / secret> (leave blank, press Enter)
REM       - scope> 1                (full access)
REM       - Edit advanced config> n
REM       - Use web browser to authenticate> y
REM         -> sign in with the SAME Google account that owns the folder
REM            (the folder URL shows /u/2/, i.e. your 3rd logged-in account)
REM       - Configure as Shared Drive> n   (it's a normal folder)
REM       - y) Keep this remote
REM  3. Test:  rclone lsd gdrive: --drive-root-folder-id=1hx-BTBOxJhpiCry5LFwz64VQHFsRjHG2
REM  After that, every run of this script uploads watchy-debug.apk automatically.
REM ===========================================================================
