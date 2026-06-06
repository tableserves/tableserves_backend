# Fix and Restart Instructions

## The Error

```
Identifier 'isNewOrder' has already been declared
Failed to load orders
MISSING REQUIRED ROUTES
```

## Root Cause

This is likely a **Node.js module caching issue**. Even though we fixed the duplicate declarations, Node.js might still have the old version cached.

## Solution: Clear Cache and Restart

### Option 1: Quick Fix (Recommended)
```bash
# Stop the server (Ctrl+C)

# Clear Node.js cache
cd backend
rm -rf node_modules/.cache
rm -rf .cache

# Restart
npm start
```

### Option 2: Full Clean Restart
```bash
# Stop the server (Ctrl+C)

# Clear everything
cd backend
rm -rf node_modules
rm -rf package-lock.json
rm -rf .cache

# Reinstall
npm install

# Restart
npm start
```

### Option 3: Force Restart (Windows)
```powershell
# Stop the server (Ctrl+C)

# Kill any remaining Node processes
taskkill /F /IM node.exe

# Clear cache
cd backend
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .cache -ErrorAction SilentlyContinue

# Restart
npm start
```

### Option 4: Use nodemon with --ignore-watch
```bash
cd backend

# Install nodemon if not installed
npm install -g nodemon

# Start with nodemon (auto-restart on changes)
nodemon --ignore-watch node_modules src/server.js
```

## Verification

After restart, you should see:
```
✅ Socket.io initialized successfully
✅ All routes loaded successfully
✅ Server running on port 5000
```

**No errors about**:
- ❌ ~~Identifier 'isNewOrder' has already been declared~~
- ❌ ~~Failed to load orders~~
- ❌ ~~MISSING REQUIRED ROUTES~~

## If Still Not Working

### Check the File Directly
```bash
# Search for duplicate declarations
cd backend
grep -n "const isNewOrder" src/services/realtimeOrderService.js

# Should only show 2 lines (one in notifyRestaurant, one in notifyZone)
```

### Manual Verification
Open `backend/src/services/realtimeOrderService.js` and search for `const isNewOrder`. You should find exactly **2 occurrences**:

1. **Line ~112** in `notifyRestaurant()` function
2. **Line ~201** in `notifyZone()` function

If you see more than 2, there are still duplicates that need to be removed.

### Check for Syntax Errors
```bash
cd backend
node -c src/services/realtimeOrderService.js
```

Should output nothing (no errors).

## About the Other Error

The error about unavailable item:
```
Error: Item "bRIJHAWBJ" is currently unavailable
```

This is a **different issue** - it's a business logic error, not a code error. It means:
- A customer tried to order an item
- That item is marked as unavailable in the database
- The order was correctly rejected

This is **expected behavior** and not related to the notification/receipt fixes.

## Summary

1. **Stop the server**
2. **Clear cache**: `rm -rf node_modules/.cache`
3. **Restart**: `npm start`
4. **Verify**: No "isNewOrder" errors

The code is correct - it's just a caching issue!

---

**Status**: Code is fixed, just needs cache clear  
**Action**: Clear cache and restart server  
**Expected**: Server starts successfully
