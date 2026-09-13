@echo off
rem AIgg - launcher Windows (cmd)
cd /d "%~dp0"
if "%1"=="" (
  echo AIgg : lancement de l'interface web.
  echo URL : http://127.0.0.1:8070/
  echo Pour arreter : fermer la fenetre ou Ctrl+C.
  echo.
  node AIgg.js server
) else (
  node AIgg.js %*
)