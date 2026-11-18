@echo off
REM Windows convenience wrapper. Runs the real script under Git Bash so there
REM is only one implementation of the export logic to maintain.
REM   scripts\export-participant.bat <24-char-hex-id>
setlocal
set "BASH=%PROGRAMFILES%\Git\bin\bash.exe"
if not exist "%BASH%" set "BASH=%PROGRAMFILES(x86)%\Git\bin\bash.exe"
if not exist "%BASH%" (
  echo Could not find Git Bash.
  echo Install Git for Windows from https://git-scm.com/download/win
  exit /b 1
)
"%BASH%" "%~dp0export-participant.sh" %*
