# 🔑 Razorpay Credentials Setup Guide

## 🚀 Quick Setup Steps

### 1. Create Razorpay Account
1. Go to [razorpay.com](https://razorpay.com)
2. Click "Sign Up" and create an account
3. Complete the verification process
4. Activate your account (may take 24-48 hours for full activation)

### 2. Get Test Credentials
1. Login to your Razorpay Dashboard
2. Go to **Settings** → **API Keys**
3. In the **Test Mode** section, click **Generate Test Key**
4. Copy the **Key ID** and **Key Secret**

### 3. Update Environment Variables

Replace the credentials in your `.env` file:

```env
# Razorpay Configuration (Test Mode)
RAZORPAY_KEY_ID=rzp_test_your_actual_key_id_here
RAZORPAY_KEY_SECRET=your_actual_key_secret_here
RAZORPAY_WEBHOOK_SECRET=dev_skip_webhook_verification
```

### 4. Test the Integration

```bash
cd backend
node test-razorpay-integration.js
```

## 🔧 Troubleshooting Common Issues

### ❌ 401 Authentication Error
**Cause**: Invalid or inactive credentials
**Solution**:
- Verify Key ID and Secret are copied correctly
- Ensure you're using **Test Mode** keys for development
- Check if your Razorpay account is activated
- Make sure there are no extra spaces in the credentials

### ❌ Account Not Activated
**Cause**: New Razorpay accounts need activation
**Solution**:
- Complete KYC verification in Razorpay dashboard
- Wait for account activation (24-48 hours)
- Contact Razorpay support if delayed

### ❌ Test vs Live Mode Mismatch
**Cause**: Using live keys in test environment
**Solution**:
- Always use **Test Mode** keys for development
- Use **Live Mode** keys only in production
- Test keys start with `rzp_test_`
- Live keys start with `rzp_live_`

## 🧪 Testing with Valid Credentials

Once you have valid credentials, you can test:

### 1. Run Integration Test
```bash
node test-razorpay-integration.js
```

### 2. Seed Sample Plans
```bash
node src/scripts/seedPlans.js
```

### 3. Test Frontend Payment Flow
1. Start your application
2. Navigate to plan management
3. Select a plan to upgrade
4. Use test card: `4111 1111 1111 1111`
5. Verify plan activation

## 📋 Test Card Details

For testing payments in **Test Mode**:

| Purpose | Card Number | CVV | Expiry |
|---------|-------------|-----|--------|
| Success | 4111 1111 1111 1111 | Any 3 digits | Any future date |
| Failure | 4111 1111 1111 1112 | Any 3 digits | Any future date |
| Insufficient Funds | 4000 0000 0000 0002 | Any 3 digits | Any future date |

## 🔄 Alternative: Skip Razorpay for Development

If you want to test the UI without Razorpay integration, you can:

### 1. Mock Payment Success
Update `PaymentService.js` to mock successful payments in development:

```javascript
// In PaymentService.js - for development only
static async createPlanOrder(planData) {
  if (process.env.NODE_ENV === 'development' && process.env.MOCK_PAYMENTS === 'true') {
    return {
      success: true,
      data: {
        orderId: 'mock_order_' + Date.now(),
        amount: 299,
        currency: 'INR',
        key: 'mock_key',
        plan: { id: 'mock_plan', name: 'Test Plan' }
      }
    };
  }
  // ... rest of the actual implementation
}
```

### 2. Add Mock Environment Variable
```env
# For development testing without Razorpay
MOCK_PAYMENTS=true
```

## 🚀 Production Setup

For production deployment:

### 1. Get Live Credentials
1. Complete business verification in Razorpay
2. Generate **Live Mode** API keys
3. Update `.env.production` with live credentials

### 2. Configure Webhooks
1. In Razorpay Dashboard → **Settings** → **Webhooks**
2. Add webhook URL: `https://yourdomain.com/api/v1/payment/razorpay-webhook`
3. Select events: `payment.captured`, `payment.failed`
4. Generate webhook secret and update environment

### 3. SSL Certificate
Ensure your production domain has a valid SSL certificate for secure payments.

## 📞 Support

- **Razorpay Documentation**: [docs.razorpay.com](https://docs.razorpay.com)
- **Razorpay Support**: [razorpay.com/support](https://razorpay.com/support)
- **Integration Issues**: Check the error logs and test with valid credentials

## ✅ Success Checklist

- [ ] Razorpay account created and activated
- [ ] Test API keys generated and copied
- [ ] Environment variables updated
- [ ] Integration test passes
- [ ] Sample plans seeded
- [ ] Frontend payment flow tested
- [ ] Webhook configured (for production)

Once all steps are complete, your Razorpay integration will be fully functional! 🎉