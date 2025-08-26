# 🕐 Customize JWT Token Expiry Times

## 🎛️ Quick Configuration

### Current Settings (in your .env file)
```bash
VITE_JWT_ACCESS_EXPIRY=15m    # Access token: 15 minutes
VITE_JWT_REFRESH_EXPIRY=7d    # Refresh token: 7 days
```

### Supported Formats
```bash
# Seconds
VITE_JWT_ACCESS_EXPIRY=300s   # 5 minutes (300 seconds)

# Minutes  
VITE_JWT_ACCESS_EXPIRY=5m     # 5 minutes
VITE_JWT_ACCESS_EXPIRY=30m    # 30 minutes
VITE_JWT_ACCESS_EXPIRY=60m    # 1 hour

# Hours
VITE_JWT_ACCESS_EXPIRY=1h     # 1 hour
VITE_JWT_ACCESS_EXPIRY=12h    # 12 hours

# Days
VITE_JWT_REFRESH_EXPIRY=1d    # 1 day
VITE_JWT_REFRESH_EXPIRY=30d   # 30 days
```

## 🏆 Recommended Settings by Security Level

### 🔴 High Security (Banking, Healthcare)
```bash
VITE_JWT_ACCESS_EXPIRY=5m     # 5 minutes
VITE_JWT_REFRESH_EXPIRY=1d    # 1 day
```
- **Use Case**: Financial apps, medical records, admin panels
- **Security**: Maximum protection, frequent re-authentication
- **UX Impact**: Invisible to users (auto-refresh)

### 🟡 Standard Security (Most Web Apps) - **CURRENT**
```bash
VITE_JWT_ACCESS_EXPIRY=15m    # 15 minutes
VITE_JWT_REFRESH_EXPIRY=7d    # 7 days
```
- **Use Case**: E-commerce, social media, business apps
- **Security**: Good balance of security and usability
- **UX Impact**: Seamless experience

### 🟢 Low Security (Internal Tools)
```bash
VITE_JWT_ACCESS_EXPIRY=1h     # 1 hour
VITE_JWT_REFRESH_EXPIRY=30d   # 30 days
```
- **Use Case**: Internal dashboards, development tools
- **Security**: Relaxed for convenience
- **UX Impact**: Very smooth, less frequent refreshes

## ⚙️ How to Change

### 1. Edit .env File
```bash
# Open .env file in your text editor
# Change these lines:
VITE_JWT_ACCESS_EXPIRY=30m    # Change from 15m to 30m
VITE_JWT_REFRESH_EXPIRY=14d   # Change from 7d to 14d
```

### 2. Restart Development Server
```bash
# Vite automatically restarts when .env changes
# But if needed:
npm run dev
```

### 3. Test the Changes
```bash
# Check if new settings are loaded
node test-env-keys.cjs
```

## 📊 Impact of Different Settings

### Access Token Times
```
5 minutes:   Maximum security, more refresh requests
15 minutes:  Balanced security and performance (RECOMMENDED)
30 minutes:  Less secure, fewer refresh requests  
1 hour:      Low security, minimum refresh requests
```

### Refresh Token Times
```
1 day:       High security, users login daily
7 days:      Balanced, users login weekly (RECOMMENDED)
30 days:     Low security, users rarely forced to login
```

## 🚨 Security Considerations

### ✅ Best Practices
- **Shorter access tokens** = Better security
- **Longer refresh tokens** = Better user experience
- **Different keys per environment** (dev/staging/prod)
- **Monitor token usage** in production

### ❌ Avoid These Settings
```bash
# Too long - security risk
VITE_JWT_ACCESS_EXPIRY=24h    # ❌ 24 hours is too long

# Too short - poor performance
VITE_JWT_ACCESS_EXPIRY=30s    # ❌ 30 seconds is too frequent

# Inconsistent - logical error
VITE_JWT_ACCESS_EXPIRY=1h     # ❌ Access longer than refresh
VITE_JWT_REFRESH_EXPIRY=30m   
```

## 🧪 Testing Different Settings

### Simulate Token Expiry
```javascript
// To test quickly, set very short expiry:
VITE_JWT_ACCESS_EXPIRY=1m     # 1 minute for testing
VITE_JWT_REFRESH_EXPIRY=5m    # 5 minutes for testing

// Then:
// 1. Login to your app
// 2. Wait 1 minute
// 3. Make any action (should auto-refresh)
// 4. Wait 5 minutes
// 5. Make any action (should force re-login)
```

### Monitor in Browser Console
```javascript
// Look for these logs:
"Access token generated" - New token created
"Auto-refreshing access token" - Automatic refresh
"Token expired" - Token has expired
"JWT tokens refreshed successfully" - Refresh completed
```

## 📈 Real-World Examples

### Netflix-style (Entertainment)
```bash
VITE_JWT_ACCESS_EXPIRY=1h     # 1 hour
VITE_JWT_REFRESH_EXPIRY=30d   # 30 days
```

### Banking-style (High Security)
```bash
VITE_JWT_ACCESS_EXPIRY=5m     # 5 minutes
VITE_JWT_REFRESH_EXPIRY=12h   # 12 hours
```

### E-commerce-style (Balanced)
```bash
VITE_JWT_ACCESS_EXPIRY=30m    # 30 minutes
VITE_JWT_REFRESH_EXPIRY=14d   # 14 days
```

### Admin Panel-style (Secure)
```bash
VITE_JWT_ACCESS_EXPIRY=10m    # 10 minutes
VITE_JWT_REFRESH_EXPIRY=1d    # 1 day
```

---

## 🎯 Your Current Setup: Perfect for Most Applications!

Your current **15m/7d** configuration is:
✅ **Industry standard** for secure web applications
✅ **Optimal balance** of security and usability  
✅ **Invisible to users** due to auto-refresh
✅ **Secure enough** for production use

**Unless you have specific security requirements, the current settings are ideal!** 🎉