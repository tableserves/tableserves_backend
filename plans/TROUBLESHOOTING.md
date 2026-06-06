# 🔧 Razorpay Integration Troubleshooting Guide

## 🚨 Current Issue: 401 Authentication Error

The test is failing with a **401 status code**, which indicates an authentication problem with Razorpay credentials.

### 🔍 Immediate Solutions

#### Option 1: Get Valid Razorpay Credentials (Recommended)
1. **Create Razorpay Account**: Go to [razorpay.com](https://razorpay.com) and sign up
2. **Generate Test Keys**: In dashboard → Settings → API Keys → Generate Test Key
3. **Update .env file** with your actual credentials:
   ```env
   RAZORPAY_KEY_ID=rzp_test_your_actual_key_here
   RAZORPAY_KEY_SECRET=your_actual_secret_here
   ```

#### Option 2: Use Mock Payments for Development
If you want to test the UI without Razorpay:

1. **Enable Mock Payments** in `.env`:
   ```env
   VITE_MOCK_PAYMENTS=true
   ```

2. **Test the Frontend**: The payment flow will work with simulated payments

## 🔧 Common Issues & Solutions

### ❌ 401 Authentication Error
**Symptoms**: 
- Test script shows "Order creation failed: undefined, Status Code: 401"
- Backend logs show Razorpay authentication errors

**Causes**:
- Invalid Key ID or Secret
- Using placeholder credentials
- Account not activated
- Wrong mode (test vs live)

**Solutions**:
1. **Verify Credentials**: Check Razorpay dashboard for correct keys
2. **Account Status**: Ensure account is activated (may take 24-48 hours)
3. **Test Mode**: Use test keys for development
4. **Copy Correctly**: Ensure no extra spaces or characters

### ❌ Razorpay SDK Not Loaded
**Symptoms**: 
- "Razorpay SDK not loaded" error in frontend
- Payment modal doesn't open

**Solutions**:
1. **Check Internet**: Ensure connection to load external script
2. **Script Loading**: Verify RazorpayScript component is included
3. **Manual Load**: Add script tag to index.html:
   ```html
   <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
   ```

### ❌ Payment Verification Failed
**Symptoms**: 
- Payment completes but verification fails
- "Invalid signature" errors

**Solutions**:
1. **Check Webhook Secret**: Ensure correct webhook secret in environment
2. **Signature Logic**: Verify signature generation matches Razorpay docs
3. **Network Issues**: Check if webhook URL is accessible

### ❌ Plan Not Activated
**Symptoms**: 
- Payment succeeds but plan doesn't activate
- User still on old plan

**Solutions**:
1. **Database Connection**: Verify MongoDB connection
2. **User Model**: Check if user plan fields are updating
3. **Transaction Logs**: Review payment logs for errors

## 🧪 Testing Strategies

### 1. Step-by-Step Testing

#### Test Backend Only
```bash
cd backend
node test-razorpay-integration.js
```

#### Test Database Connection
```bash
cd backend
node src/scripts/seedPlans.js
```

#### Test Frontend with Mock
```env
# In .env
VITE_MOCK_PAYMENTS=true
```

### 2. Debug Modes

#### Enable Detailed Logging
```env
# In .env
VITE_DEBUG=true
NODE_ENV=development
```

#### Check Browser Console
- Open Developer Tools
- Check Console tab for errors
- Look for network request failures

#### Check Backend Logs
- Review server console output
- Look for Razorpay API errors
- Check database connection issues

## 🔄 Alternative Development Approaches

### Approach 1: Mock Everything
```env
# Complete mock setup for UI testing
VITE_MOCK_PAYMENTS=true
RAZORPAY_KEY_ID=mock_key
RAZORPAY_KEY_SECRET=mock_secret
```

### Approach 2: Partial Integration
```env
# Use real Razorpay for order creation, mock for verification
VITE_MOCK_PAYMENTS=false
RAZORPAY_KEY_ID=your_real_test_key
RAZORPAY_KEY_SECRET=your_real_test_secret
```

### Approach 3: Full Integration
```env
# Complete Razorpay integration
VITE_MOCK_PAYMENTS=false
RAZORPAY_KEY_ID=rzp_test_valid_key
RAZORPAY_KEY_SECRET=valid_secret
```

## 📋 Validation Checklist

### ✅ Environment Setup
- [ ] MongoDB connection working
- [ ] Node.js server running
- [ ] React frontend accessible
- [ ] Environment variables loaded

### ✅ Razorpay Configuration
- [ ] Account created and activated
- [ ] Test API keys generated
- [ ] Keys copied to .env correctly
- [ ] Test mode enabled

### ✅ Integration Testing
- [ ] Backend test script passes
- [ ] Plans seeded successfully
- [ ] Frontend loads without errors
- [ ] Payment modal opens

### ✅ Payment Flow
- [ ] Plan selection works
- [ ] Payment order creates
- [ ] Razorpay checkout opens
- [ ] Payment verification succeeds
- [ ] Plan activates correctly

## 🚀 Quick Start (Skip Razorpay Setup)

If you want to see the UI working immediately:

1. **Enable Mock Payments**:
   ```bash
   # Update .env
   VITE_MOCK_PAYMENTS=true
   ```

2. **Seed Plans**:
   ```bash
   cd backend
   node src/scripts/seedPlans.js
   ```

3. **Start Application**:
   ```bash
   # Backend
   npm run dev

   # Frontend (in another terminal)
   npm run dev
   ```

4. **Test UI**: Navigate to plan management and test the flow

## 📞 Getting Help

### Razorpay Support
- **Documentation**: [docs.razorpay.com](https://docs.razorpay.com)
- **Support Portal**: [razorpay.com/support](https://razorpay.com/support)
- **Community**: [community.razorpay.com](https://community.razorpay.com)

### Debug Information to Collect
When seeking help, provide:
1. **Error Messages**: Exact error text and stack traces
2. **Environment**: Node.js version, OS, browser
3. **Configuration**: Sanitized environment variables (no secrets)
4. **Steps**: What you were trying to do when error occurred
5. **Logs**: Relevant server and browser console logs

## 🎯 Success Indicators

You'll know everything is working when:
- ✅ Test script shows all green checkmarks
- ✅ Plans are seeded in database
- ✅ Frontend loads plan selection UI
- ✅ Payment flow completes successfully
- ✅ User plan updates with 30-day expiry
- ✅ Payment history shows transaction

The integration is robust and will work perfectly once you have valid Razorpay credentials! 🚀