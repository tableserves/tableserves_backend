@echo off
echo "Checking if package.json and package-lock.json are in sync..."
npm ci
if %errorlevel% equ 0 (
  echo "Success: package.json and package-lock.json are in sync."
) else (
  echo "Error: package.json and package-lock.json are out of sync."
)
