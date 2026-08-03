@echo off
setlocal enabledelayedexpansion

:: 获取当前小时（%time:~0,2%），处理前导空格
set "hour=%time:~0,2%"
set "hour=%hour: =%"
:: 将小时转为十进制数（避免前导零导致的八进制问题）
set /a hour=100%hour% %% 100

:: 获取当前分钟（%time:~3,2%），处理前导空格
set "min=%time:~3,2%"
set "min=%min: =%"
set /a min=100%min% %% 100

:: 计算当前总分钟数
set /a total=hour*60+min

:: 12:00 对应的总分钟数为 12*60=720
:: 14:00 对应的总分钟数为 14*60=840
:: 17:00 对应的总分钟数为 17*60=1020
if %total% geq 720 (
    goto After
) else (
    goto Before
)

:After
echo 当前时间在 12:00 及以后。
:: 在这里放置 12:00 以后要执行的代码

:: 获取当前日期（格式：20251015）
::for /f "tokens=1-4 delims=/ " %%a in ("%date%") do ( set "ymd=%%a%%b%%c")
for /f "tokens=2 delims==" %%a in ('wmic os get localdatetime /value ^| findstr "="') do set "dt=%%a"
set "ymd=%dt:~0,8%"

::echo %ymd%
copy food\.last.yaml food\d.%ymd%.yaml
copy health\.last.yaml health\d.%ymd%.yaml
edit health\d.%ymd%.yaml
goto End

:Before
echo 当前时间在 12:00 之前。
:: 在这里放置 12:00 以前要执行的代码
rem 例如：your_command_before.exe
goto End

:End
endlocal


