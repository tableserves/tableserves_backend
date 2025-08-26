# Quick JWE Setup Guide for TableServe

## 🚀 Quick Start (1 minute setup)

### 1. Generate Secure Keys
```bash
# Run the key generator
node generate-keys.cjs

# This will:
# ✅ Generate cryptographically secure keys
# ✅ Create/update your .env file
# ✅ Backup existing .env (if any)
# ✅ Validate all keys meet security requirements
```

### 2. Verify Your .env File
Your `.env` file should now contain:
```bash
VITE_JWT_SECRET=4d91030554ed20692353fcb72014c29e...
VITE_JWT_REFRESH_SECRET=f110a011057c8b67cdf442792d2d218c...
VITE_JWE_SECRET=8eb0780843ca8b33c11a59b820e4fd90...
VITE_JWE_IV_SECRET=f454f3d93bc553a015ae7c60351ca727...
VITE_ENABLE_JWE=true
```

### 3. Start Your Application
```bash
npm run dev
```

## 🔐 What You Get

### Enhanced Security Features
- **JWT Signing**: 512-bit cryptographically secure secrets
- **JWE Encryption**: Additional token encryption layer
- **Dual Token System**: Access tokens (15 min) + Refresh tokens (7 days)
- **Secure Storage**: Encrypted tokens in browser storage

### Automatic Security
- **Token Encryption**: All tokens encrypted before storage
- **Auto-refresh**: Tokens automatically refreshed before expiry
- **Secure Logout**: All tokens properly cleared
- **Browser Compatibility**: Fallback encryption for all browsers

## 🔧 Manual Key Generation

### Individual Commands
```bash
# JWT Keys (64 bytes each)
node -e "console.log('VITE_JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('VITE_JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# JWE Keys (32 bytes each)
node -e "console.log('VITE_JWE_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('VITE_JWE_IV_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

### All Keys at Once
```bash
node -e "
const crypto = require('crypto');
console.log('VITE_JWT_SECRET=' + crypto.randomBytes(64).toString('hex'));
console.log('VITE_JWT_REFRESH_SECRET=' + crypto.randomBytes(64).toString('hex'));
console.log('VITE_JWE_SECRET=' + crypto.randomBytes(32).toString('hex'));
console.log('VITE_JWE_IV_SECRET=' + crypto.randomBytes(32).toString('hex'));
"
```

## 🏗️ Architecture

### How JWE Works
```mermaid
graph LR
    A[User Login] --> B[Generate JWT]
    B --> C[Encrypt with JWE]
    C --> D[Store Encrypted Token]
    D --> E[API Request]
    E --> F[Decrypt Token]
    F --> G[Verify JWT]
    G --> H[Process Request]
```

### Security Layers
1. **JWT Layer**: User identity and permissions
2. **JWE Layer**: Token encryption for storage
3. **Storage Layer**: Secure browser storage
4. **Transport Layer**: HTTPS for network security

## ⚙️ Configuration Options

### Environment Variables
```bash
# Required Keys
VITE_JWT_SECRET=your_jwt_secret_64_bytes
VITE_JWT_REFRESH_SECRET=your_refresh_secret_64_bytes
VITE_JWE_SECRET=your_jwe_secret_32_bytes
VITE_JWE_IV_SECRET=your_jwe_iv_secret_32_bytes

# Optional Configuration
VITE_ENABLE_JWE=true              # Enable/disable JWE encryption
VITE_SECURITY_LEVEL=high          # Security level (standard/high)
VITE_JWT_ACCESS_EXPIRY=15m        # Access token expiry
VITE_JWT_REFRESH_EXPIRY=7d        # Refresh token expiry
```

### Security Levels
- **Standard**: JWT only, no encryption
- **High**: JWT + JWE encryption (recommended)

## 🔍 Testing Your Setup

### 1. Check Key Strength
```bash
# Run validation
node -e "
const env = require('dotenv').config();
console.log('JWT Secret Length:', process.env.VITE_JWT_SECRET?.length || 0, '(need 128)');
console.log('JWE Secret Length:', process.env.VITE_JWE_SECRET?.length || 0, '(need 64)');
"
```

### 2. Test Authentication
1. Open the application
2. Login with admin credentials
3. Check browser storage for encrypted tokens
4. Verify automatic token refresh

### 3. Verify Encryption
```bash
# Check if tokens are encrypted in storage
# Open browser DevTools > Application > Storage
# Should see encrypted strings, not readable JWT tokens
```

## 🚨 Security Checklist

### ✅ Production Checklist
- [ ] Generated strong random keys
- [ ] Enabled JWE encryption (`VITE_ENABLE_JWE=true`)
- [ ] Different keys for each environment
- [ ] Keys stored securely (not in code)
- [ ] `.env` file in `.gitignore`
- [ ] Key rotation schedule planned

### ⚠️ Never Do This
- ❌ Use example keys in production
- ❌ Commit `.env` to version control
- ❌ Share keys in plaintext
- ❌ Use same keys across environments
- ❌ Use weak or predictable keys

## 📖 Additional Resources

- **Full Guide**: `SECURITY_KEY_GENERATION_GUIDE.md`
- **JWT Docs**: `JWT_IMPLEMENTATION_SUMMARY.md`
- **Frontend Optimization**: `FRONTEND_OPTIMIZATION_SUMMARY.md`

---

**Ready to go! Your TableServe application now has enterprise-grade authentication security.** 🎉