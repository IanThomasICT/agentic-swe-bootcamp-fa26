@echo off
rem Runs setup.ps1 with the script policy relaxed for this run only.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
pause
