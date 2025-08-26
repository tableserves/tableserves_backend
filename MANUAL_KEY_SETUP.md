# Manual Environment Key Setup Guide

## 🔑 How Keys Work in TableServe

### ✅ Current Status
Your `.env` file **already contains valid keys** and the system is working correctly!

### 🔄 How the System Uses Keys from .env

#### 1. **Vite Loads Environment Variables**
```javascript
// In JWTTokenService.js constructor:
this.JWT_SECRET = import.meta.env.VITE_JWT_SECRET || 'fallback_key';
this.JWE_SECRET = import.meta.env.VITE_JWE_SECRET || 'fallback_key';
```

#### 2. **Keys are Used for Security Operations**
```javascript
// Generate JWT token with your custom key
const signature = this.createSignature(tokenData, this.JWT_SECRET);

// Encrypt token with your custom JWE key  
const encryptedToken = this.encryptToken(token);
```

## 🛠️ Manual Key Replacement (If Needed)

### Method 1: Generate Individual Keys
```bash
# Generate JWT Secret (64 bytes = 128 hex characters)
node -e "console.log('VITE_JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Generate JWT Refresh Secret (64 bytes = 128 hex characters)  
node -e "console.log('VITE_JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Generate JWE Secret (32 bytes = 64 hex characters)
node -e "console.log('VITE_JWE_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate JWE IV Secret (32 bytes = 64 hex characters)
node -e "console.log('VITE_JWE_IV_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

### Method 2: Manual .env File Edit
```bash
# Open .env file in any text editor
# Replace the values after = with your new keys

# Example .env content:
VITE_JWT_SECRET=your_new_128_character_hex_key_here
VITE_JWT_REFRESH_SECRET=your_new_128_character_hex_key_here  
VITE_JWE_SECRET=your_new_64_character_hex_key_here
VITE_JWE_IV_SECRET=your_new_64_character_hex_key_here
VITE_ENABLE_JWE=true
```

### Method 3: Use Different Environment Files
```bash
# For different environments
.env.development    # Development keys
.env.staging        # Staging keys  
.env.production     # Production keys

# Vite automatically loads the correct file based on mode
npm run dev         # Uses .env.development
npm run build       # Uses .env.production
```

## 🧪 Test Your Custom Keys

### 1. Verify Key Format
```bash
# Run the test script
node test-env-keys.cjs

# Should show:
# ✓ VITE_JWT_SECRET: Valid (your_key...)
# ✓ VITE_JWT_REFRESH_SECRET: Valid (your_key...)
# ✓ VITE_JWE_SECRET: Valid (your_key...)
# ✓ VITE_JWE_IV_SECRET: Valid (your_key...)
```

### 2. Check Key Loading in Browser
```javascript
// Open browser console and check:
console.log('JWT Service initialized with custom keys');

// You should see logs showing:
// - JWT/JWE Service initialized
// - jweEnabled: true
// - Custom key lengths being used
```

## 🔐 Key Requirements

### JWT Keys (HMAC-SHA256)
- **Length**: Exactly 128 hex characters (64 bytes)
- **Format**: Hexadecimal (0-9, a-f)
- **Example**: `a1b2c3d4e5f6...` (128 chars total)

### JWE Keys (AES-256)
- **Length**: Exactly 64 hex characters (32 bytes)
- **Format**: Hexadecimal (0-9, a-f)  
- **Example**: `1a2b3c4d...` (64 chars total)

## ⚡ Quick Commands

### Generate All Keys at Once
```bash
# Option 1: Use our script
npm run generate-keys

# Option 2: One-liner
node -e "
const c = require('crypto');
console.log('VITE_JWT_SECRET=' + c.randomBytes(64).toString('hex'));
console.log('VITE_JWT_REFRESH_SECRET=' + c.randomBytes(64).toString('hex'));
console.log('VITE_JWE_SECRET=' + c.randomBytes(32).toString('hex'));
console.log('VITE_JWE_IV_SECRET=' + c.randomBytes(32).toString('hex'));
"
```

### Restart After Key Changes
```bash
# Vite automatically restarts when .env changes
# But if needed, manually restart:
npm run dev
```

## 🚨 Important Notes

### ✅ Do This
- **Use different keys for each environment**
- **Generate cryptographically random keys**
- **Keep keys secret and secure**
- **Test keys after changes**

### ❌ Never Do This
- **Use example keys in production**
- **Share keys in plaintext**
- **Commit .env to version control**
- **Use weak or predictable keys**

## 🎯 Current Working Setup

Your current `.env` file contains:
```
✓ Valid JWT Secret (128 chars)
✓ Valid JWT Refresh Secret (128 chars)  
✓ Valid JWE Secret (64 chars)
✓ Valid JWE IV Secret (64 chars)
✓ JWE Encryption: ENABLED
```

**Everything is working correctly!** 🎉

The system is automatically:
1. Loading your custom keys from `.env`
2. Using them for JWT signing
3. Using them for JWE encryption
4. Storing encrypted tokens securely

**No further action needed unless you want to change the keys.**