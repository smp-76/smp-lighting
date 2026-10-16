@echo off
chcp 65001 >nul
cd /d "%~dp0"
where py >nul 2>nul
if not errorlevel 1 (
  py -3 "%~dp0review\serve.py"
  goto done
)
where python >nul 2>nul
if not errorlevel 1 (
  python "%~dp0review\serve.py"
  goto done
)
echo Для полной работы каталога нужен Python 3.
echo Без установки можно открыть интерактивные демонстрации и снимки.
start "" "%~dp0review\START-HERE.html"
:done
pause
