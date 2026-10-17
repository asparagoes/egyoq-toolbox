@echo off
setlocal
cd /d "%~dp0"
echo.
echo Starting the Virtual Assistant onboarding form on a local web server...
echo.
where py >nul 2>nul
if not errorlevel 1 (
    start "VA Form Server" cmd /k "py -3 -m http.server 8000"
) else (
    where python >nul 2>nul
    if not errorlevel 1 (
        start "VA Form Server" cmd /k "python -m http.server 8000"
    ) else (
        echo Python 3 was not found. Install Python or publish the form to GitHub Pages.
        pause
        exit /b 1
    )
)
timeout /t 2 /nobreak >nul
start "" "http://localhost:8000/"
echo Opened http://localhost:8000/ in your browser.
echo Close the VA Form Server window when finished testing.
