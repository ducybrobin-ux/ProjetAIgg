@echo off
rem AIgg - launcher Windows (cmd)
cd /d "%~dp0"
if "%1"=="" (
  node AIgg.js status
) else (
  node AIgg.js %*
)