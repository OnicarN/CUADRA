@echo off
chcp 65001 >nul
title Cuadra
rem Doble clic para levantar Cuadra en http://localhost:3000
rem La primera vez instala las dependencias y carga los datos de prueba.
cd /d "%~dp0backend"

where node >/dev/null 2>nul
if errorlevel 1 (
  echo No tienes Node.js. Instalalo con:  winget install --id OpenJS.NodeJS.LTS -e
  echo o desde https://nodejs.org y vuelve a hacer doble clic aqui.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Instalando dependencias, solo la primera vez...
  call npm.cmd install --no-audit --no-fund
)

if not exist .data\db (
  echo Cargando datos de prueba...
  call npm.cmd run db:semilla
)

echo.
echo  Cuadra en http://localhost:3000
echo  Usuario: demo@cuadra.app   Clave: cuadra1234
echo  Para pararla, cierra esta ventana.
echo.
start "" cmd /c "timeout /t 4 >/dev/null & start http://localhost:3000"
call npm.cmd run dev
pause
