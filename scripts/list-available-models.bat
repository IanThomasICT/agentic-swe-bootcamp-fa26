@echo off
rem Runs list-available-models.ps1 with the script policy relaxed for this run only.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0list-available-models.ps1" %*
