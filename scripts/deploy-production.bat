@echo off
REM TableServe Production Deployment Script for Windows
REM This script prepares and deploys the TableServe backend to production

setlocal enabledelayedexpansion

echo.
echo ========================================
echo   TableServe Production Deployment
echo ========================================
echo.

REM Configuration
set APP_NAME=tableserve-backend
set NODE_VERSION=18
set PM2_APP_NAME=tableserve-api

REM Check if Node.js is installed
echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js version %NODE_VERSION% or higher
    pause
    exit /b 1
)

echo Node.js version: 
node --version

REM Check if npm is available
echo Checking npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not available
    pause
    exit /b 1
)

echo npm version: 
npm --version

REM Check if PM2 is installed
echo Checking PM2...
pm2 --version >nul 2>&1
if errorlevel 1 (
    echo PM2 not found. Installing PM2 globally...
    npm install -g pm2
    if errorlevel 1 (
        echo ERROR: Failed to install PM2
        pause
        exit /b 1
    )
    echo PM2 installed successfully
) else (
    echo PM2 is already installed
    pm2 --version
)

REM Check for .env.production file
echo Validating environment configuration...
if not exist ".env.production" (
    echo ERROR: .env.production file not found
    echo Please create .env.production with all required variables
    pause
    exit /b 1
)

echo Environment file found: .env.production

REM Install production dependencies
echo.
echo Installing production dependencies...
if exist "node_modules" rmdir /s /q node_modules
if exist "package-lock.json" del package-lock.json

npm ci --only=production
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo Dependencies installed successfully

REM Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

REM Create PM2 ecosystem configuration
echo.
echo Creating PM2 ecosystem configuration...

(
echo module.exports = {
echo   apps: [{
echo     name: '%PM2_APP_NAME%',
echo     script: 'production-server.js',
echo     instances: 'max',
echo     exec_mode: 'cluster',
echo     env: {
echo       NODE_ENV: 'production',
echo       PORT: 8080
echo     },
echo     env_file: '.env.production',
echo     error_file: './logs/pm2-error.log',
echo     out_file: './logs/pm2-out.log',
echo     log_file: './logs/pm2-combined.log',
echo     time: true,
echo     max_memory_restart: '512M',
echo     node_args: '--max-old-space-size=512',
echo     watch: false,
echo     ignore_watch: ['node_modules', 'logs', 'uploads'],
echo     max_restarts: 5,
echo     min_uptime: '10s',
echo     kill_timeout: 5000,
echo     wait_ready: true,
echo     listen_timeout: 10000
echo   }]
echo };
) > ecosystem.config.js

echo PM2 ecosystem configuration created

REM Stop existing application if running
echo.
echo Checking for existing PM2 processes...
pm2 list | findstr "%PM2_APP_NAME%" >nul 2>&1
if not errorlevel 1 (
    echo Stopping existing application...
    pm2 stop %PM2_APP_NAME%
    pm2 delete %PM2_APP_NAME%
)

REM Start application with PM2
echo.
echo Starting application with PM2...
pm2 start ecosystem.config.js
if errorlevel 1 (
    echo ERROR: Failed to start application with PM2
    pause
    exit /b 1
)

REM Save PM2 configuration
pm2 save

echo Application started successfully

REM Wait for application to initialize
echo.
echo Waiting for application to initialize...
timeout /t 10 /nobreak >nul

REM Perform health check
echo Performing health check...
curl -f http://localhost:8080/health >nul 2>&1
if errorlevel 1 (
    echo WARNING: Health check failed - application may not be ready yet
    echo Please check PM2 logs: pm2 logs %PM2_APP_NAME%
) else (
    echo Health check passed - application is running
)

REM Display final information
echo.
echo ========================================
echo   Deployment Completed Successfully!
echo ========================================
echo.
echo Application Status:
pm2 status

echo.
echo Useful Commands:
echo   View logs:     pm2 logs %PM2_APP_NAME%
echo   Monitor:       pm2 monit
echo   Restart:       pm2 restart %PM2_APP_NAME%
echo   Stop:          pm2 stop %PM2_APP_NAME%
echo   Health check:  curl http://localhost:5000/health
echo.
echo Application is running at: http://localhost:5000
echo Health endpoint: http://localhost:5000/health
echo.

pause
