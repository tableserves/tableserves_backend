# Security Key Generation Guide for TableServe

## Overview
This guide helps you generate secure cryptographic keys for JWT tokens and JWE encryption in the TableServe application.

## Quick Setup Commands

### 1. Generate All Keys at Once
```bash
# Run this command to generate all required keys
node -e "
const crypto = require('crypto');
console.log('=== TableServe Security Keys ===');
console.log('');
console.log('# JWT Configuration');
console.log('VITE_JWT_SECRET=' + crypto.randomBytes(64).toString('hex'));
console.log('VITE_JWT_REFRESH_SECRET=' + crypto.randomBytes(64).toString('hex'));
console.log('');
console.log('# JWE Configuration');
console.log('VITE_JWE_SECRET=' + crypto.randomBytes(32).toString('hex'));
console.log('VITE_JWE_IV_SECRET=' + crypto.randomBytes(32).toString('hex'));
console.log('');
console.log('Copy these values to your .env file');
"
```

### 2. Generate Individual Keys

#### JWT Signing Keys (512-bit / 64 bytes)
```bash
# JWT Secret for access tokens
node -e "console.log('VITE_JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# JWT Refresh Secret for refresh tokens
node -e "console.log('VITE_JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
```

#### JWE Encryption Keys (256-bit / 32 bytes)
```bash
# JWE Secret for token encryption
node -e "console.log('VITE_JWE_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# JWE IV Secret for initialization vector
node -e "console.log('VITE_JWE_IV_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

## Environment File Setup

### 1. Create .env file
```bash
# Copy the example file
cp .env.example .env
```

### 2. Update .env with generated keys
```bash
# Example .env content (replace with your generated keys)
VITE_API_BASE_URL=http://localhost:3001/api

# JWT Configuration (Replace with generated keys)
VITE_JWT_SECRET=a1b2c3d4e5f6...your_64_byte_hex_key_here
VITE_JWT_REFRESH_SECRET=f6e5d4c3b2a1...your_64_byte_hex_key_here

# JWE Configuration (Replace with generated keys)
VITE_JWE_SECRET=1a2b3c4d...your_32_byte_hex_key_here
VITE_JWE_IV_SECRET=4d3c2b1a...your_32_byte_hex_key_here

# Token Configuration
VITE_JWT_ACCESS_EXPIRY=15m
VITE_JWT_REFRESH_EXPIRY=7d

# Security Configuration
VITE_ENABLE_JWE=true
VITE_SECURITY_LEVEL=high
```

## Advanced Key Generation Methods

### Using OpenSSL (Alternative method)
```bash
# Generate 512-bit keys for JWT
openssl rand -hex 64

# Generate 256-bit keys for JWE
openssl rand -hex 32
```

### Using Python (Alternative method)
```python
import secrets

# JWT Keys (64 bytes)
jwt_secret = secrets.token_hex(64)
jwt_refresh_secret = secrets.token_hex(64)

# JWE Keys (32 bytes)
jwe_secret = secrets.token_hex(32)
jwe_iv_secret = secrets.token_hex(32)

print(f"VITE_JWT_SECRET={jwt_secret}")
print(f"VITE_JWT_REFRESH_SECRET={jwt_refresh_secret}")
print(f"VITE_JWE_SECRET={jwe_secret}")
print(f"VITE_JWE_IV_SECRET={jwe_iv_secret}")
```

## Security Best Practices

### 1. Key Strength Requirements
- **JWT Keys**: Minimum 512 bits (64 bytes) for HMAC-SHA256
- **JWE Keys**: 256 bits (32 bytes) for AES-256 encryption
- **Entropy**: Use cryptographically secure random number generators

### 2. Key Management
```bash
# ✅ DO: Generate unique keys per environment
Production Keys ≠ Staging Keys ≠ Development Keys

# ✅ DO: Store keys securely
- Use environment variables
- Use secret management services (AWS Secrets Manager, Azure Key Vault)
- Never commit keys to version control

# ❌ DON'T: Use weak keys
- No dictionary words
- No predictable patterns
- No hardcoded values
```

### 3. Key Rotation Strategy
```bash
# Rotate keys regularly
- JWT Keys: Every 3-6 months
- JWE Keys: Every 6-12 months
- Emergency rotation: Immediately if compromised
```

## Production Deployment Checklist

### Environment Variables Setup
```bash
# 1. Generate production keys
node key-generation-script.js

# 2. Set environment variables
export VITE_JWT_SECRET="your_production_jwt_secret"
export VITE_JWT_REFRESH_SECRET="your_production_refresh_secret"
export VITE_JWE_SECRET="your_production_jwe_secret"
export VITE_JWE_IV_SECRET="your_production_jwe_iv_secret"

# 3. Verify keys are loaded
npm run build
```

### Security Validation
```javascript
// Verify key strength
const keyStrength = {
  jwtSecret: process.env.VITE_JWT_SECRET?.length >= 128, // 64 bytes = 128 hex chars
  jweSecret: process.env.VITE_JWE_SECRET?.length >= 64,  // 32 bytes = 64 hex chars
};

console.log('Key strength validation:', keyStrength);
```

## Common Issues & Solutions

### Issue 1: Keys not loading
```bash
# Check environment variables
echo $VITE_JWT_SECRET
echo $VITE_JWE_SECRET

# Verify .env file exists and is properly formatted
cat .env | grep VITE_
```

### Issue 2: Weak key warnings
```bash
# Regenerate with proper entropy
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Issue 3: Development vs Production
```bash
# Use different .env files
.env.development  # Development keys
.env.production   # Production keys
.env.staging      # Staging keys
```

## Testing Key Generation

### Validate Generated Keys
```javascript
// Test script to validate keys
const crypto = require('crypto');

function validateKey(key, expectedLength, name) {
  const isValid = key && key.length === expectedLength && /^[0-9a-f]+$/i.test(key);
  console.log(`${name}: ${isValid ? '✅ Valid' : '❌ Invalid'} (length: ${key?.length || 0}/${expectedLength})`);
  return isValid;
}

// Test your keys
const jwtSecret = 'your_generated_jwt_secret_here';
const jweSecret = 'your_generated_jwe_secret_here';

validateKey(jwtSecret, 128, 'JWT Secret');
validateKey(jweSecret, 64, 'JWE Secret');
```

## Integration with TableServe

After generating keys, update your JWTTokenService to use JWE for additional security:

```javascript
// In JWTTokenService.js
constructor() {
  // JWT Configuration
  this.JWT_SECRET = import.meta.env.VITE_JWT_SECRET;
  this.REFRESH_SECRET = import.meta.env.VITE_JWT_REFRESH_SECRET;
  
  // JWE Configuration
  this.JWE_SECRET = import.meta.env.VITE_JWE_SECRET;
  this.JWE_IV_SECRET = import.meta.env.VITE_JWE_IV_SECRET;
  this.ENABLE_JWE = import.meta.env.VITE_ENABLE_JWE === 'true';
}
```

## Resources

- [JWT Best Practices](https://tools.ietf.org/html/rfc7519)
- [JWE Specification](https://tools.ietf.org/html/rfc7516)
- [OWASP Cryptographic Storage](https://owasp.org/www-project-top-ten/2017/A3_2017-Sensitive_Data_Exposure)
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)