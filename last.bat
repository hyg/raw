@echo off

for /f "tokens=1-4 delims=/ " %%a in ("%date%") do ( set "ymd=%%a%%b%%c")

copy food\.last.yaml food\d.%ymd%.yaml
copy health\.last.yaml health\d.%ymd%.yaml
edit health\d.%ymd%.yaml