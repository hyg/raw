@echo off
setlocal enabledelayedexpansion

:: 获取当前日期（格式：20251015）
::for /f "tokens=1-4 delims=/ " %%a in ("%date%") do ( set "ymd=%%a%%b%%c")
for /f "tokens=2 delims==" %%a in ('wmic os get localdatetime /value ^| findstr "="') do set "dt=%%a"
set "ymd=%dt:~0,8%"

::echo %ymd%
copy food\.last.yaml food\d.%ymd%.yaml
copy health\.last.yaml health\d.%ymd%.yaml
edit health\d.%ymd%.yaml