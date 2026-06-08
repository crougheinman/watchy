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

echo [1/3] Building web app (npm run build)...
call npm run build
if errorlevel 1 (
  echo.
  echo ^>^> Web build FAILED.
  pause
  exit /b 1
)
echo.

echo [2/3] Syncing to Android (cap sync)...
call npx cap sync android
if errorlevel 1 (
  echo.
  echo ^>^> Cap sync FAILED.
  pause
  exit /b 1
)
echo.

echo [3/3] Assembling debug APK (gradlew assembleDebug)...
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

REM Copy to project root with a friendly name for easy sharing.
copy /Y "%APK%" "watchy-debug.apk" >nul

echo ============================================
echo    SUCCESS
echo.
echo    Shareable APK:
echo    %~dp0watchy-debug.apk
echo ============================================
echo.
pause
