# Razorpay Plan Upgrade Integration Setup

This document provides step-by-step instructions to set up the Razorpay plan upgrade integration with 1-month expiry for all plans.

## 🚀 Features Implemented

- ✅ Razorpay payment integration for plan upgrades
- ✅ Fixed 30-day validity for all plans
- ✅ Secure payment verification with signature validation
- ✅ Webhook support for payment confirmation
- ✅ Frontend payment UI with React components
- ✅ Payment history tracking
- ✅ Plan status dashboard
- ✅ Automatic plan activation after successful payment

## 📋 Prerequisites

1. **Razorpay Account**: Sign up at [razorpay.com](https://razorpay.com)
2. **Node.js**: Version 16+ installed
3. **MongoDB**: Database connection configured
4. **React**: Frontend framework already set up

## 🔧 Backend Setup

### 1. Configure Razorpay Credentials

Update your environment files with Razorpay credentials:

**For Development (.env):**
```env
# Razorpay Configuration (Test Mode)
RAZORPAY_KEY_ID=rzp_test_your_key_id_here
RAZORPAY_KEY_SECRET=your_key_secret_here
RAZORPAY_WEBHOOK_SECRET=dev_skip_webhook_verification
```

**For Production (.env.production):**
```env
# Razorpay Configuration (Live Mode)
RAZORPAY_KEY_ID=rzp_live_your_key_id_here
RAZORPAY_KEY_SECRET=your_live_key_secret_here
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
```

### 2. Seed Sample Plans

Run the plan seeding script to create sample plans:

```bash
cd backend
node src/scripts/seedPlans.js
```

This will create:
- **Restaurant Plans**: Basic (₹299), Advanced (₹1299), Premium (₹2999)
- **Zone Plans**: Basic (₹999), Advanced (₹1999), Premium (₹4999)

All plans have exactly 30 days validity.

### 3. Verify Backend Routes

The following API endpoints are already implemented:

- `POST /api/v1/payment/create-plan-order` - Create payment order
- `POST /api/v1/payment/verify-plan-payment` - Verify payment
- `POST /api/v1/payment/razorpay-webhook` - Handle webhooks
- `GET /api/v1/payment/history` - Get payment history
- `GET /api/v1/payment/current-plan` - Get current plan
- `GET /api/v1/plans/:planType` - Get available plans

## 🎨 Frontend Setup

### 1. Add Razorpay Script

Add the Razorpay checkout script to your `index.html`:

```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

Or use the dynamic loading feature in `PaymentService.js` (already implemented).

### 2. Use Plan Components

Import and use the plan management components:

```jsx
import PlanStatus from '../components/PlanStatus';
import PlanUpgrade from '../components/PlanUpgrade';

// Show current plan status
<PlanStatus planType="restaurant" showUpgradeButton={true} />

// Show plan upgrade modal
<PlanUpgrade 
  planType="restaurant"
  currentPlan={currentPlan}
  onUpgradeSuccess={handleUpgradeSuccess}
  onClose={handleClose}
/>
```

### 3. Add to Navigation

Add plan management to your navigation:

```jsx
import { Link } from 'react-router-dom';

<Link to="/owner/plan-management">
  Plan Management
</Link>
```

## 🔄 Payment Flow

### 1. User Selects Plan
- User clicks "Upgrade Plan" button
- Plan selection modal opens
- User chooses desired plan

### 2. Payment Order Creation
- Frontend calls `/payment/create-plan-order`
- Backend creates Razorpay order
- Returns order details to frontend

### 3. Razorpay Checkout
- Frontend opens Razorpay payment modal
- User completes payment
- Razorpay returns payment details

### 4. Payment Verification
- Frontend sends payment details to `/payment/verify-plan-payment`
- Backend verifies signature with Razorpay
- Updates user plan with 30-day expiry
- Returns success response

### 5. Plan Activation
- User's plan is immediately activated
- Plan expires exactly 30 days from activation
- User dashboard shows new plan details

## 🔒 Security Features

- **Signature Verification**: All payments verified using Razorpay signature
- **Webhook Validation**: Webhooks verified with secret key
- **Rate Limiting**: API endpoints protected with rate limiting
- **Input Validation**: All inputs validated and sanitized
- **Error Handling**: Comprehensive error handling and logging

## 📊 Plan Management Features

### Plan Status Component
- Shows current plan details
- Displays expiry date and days remaining
- Warning notifications for expiring plans
- Upgrade/renew buttons

### Plan Upgrade Component
- Lists available plans with features
- Shows pricing with tax calculation
- Secure payment processing
- Real-time payment status updates

### Payment History
- Complete transaction history
- Payment status tracking
- Razorpay payment ID references
- Downloadable receipts

## 🎯 Key Implementation Details

### 1. Fixed 30-Day Expiry
```javascript
// In Plan model
durationDays: {
  type: Number,
  default: 30,
  validate: {
    validator: function(value) {
      return value === 30;
    },
    message: 'All plans must have exactly 30 days duration'
  }
}
```

### 2. Payment Verification
```javascript
// Signature verification
const body = razorpay_order_id + '|' + razorpay_payment_id;
const expectedSignature = crypto
  .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
  .update(body.toString())
  .digest('hex');

const isSignatureValid = expectedSignature === razorpay_signature;
```

### 3. Plan Activation
```javascript
// Calculate 30-day expiry
const planDates = {
  startDate: new Date(),
  endDate: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000))
};

// Update user plan
await user.activatePlan(planId, planDates.endDate, paymentId);
```

## 🧪 Testing

### Test Payment Flow
1. Use Razorpay test credentials
2. Use test card numbers from [Razorpay docs](https://razorpay.com/docs/payments/payments/test-card-details/)
3. Verify plan activation in database
4. Check payment history in admin panel

### Test Cards
- **Success**: 4111 1111 1111 1111
- **Failure**: 4111 1111 1111 1112
- **CVV**: Any 3 digits
- **Expiry**: Any future date

## 🚀 Deployment

### 1. Environment Variables
Ensure all Razorpay credentials are set in production environment.

### 2. Webhook Configuration
Set up webhook URL in Razorpay dashboard:
```
https://yourdomain.com/api/v1/payment/razorpay-webhook
```

### 3. SSL Certificate
Ensure HTTPS is enabled for secure payment processing.

## 📞 Support

For issues or questions:
1. Check Razorpay documentation
2. Review error logs in application
3. Test with Razorpay test mode first
4. Contact Razorpay support for payment gateway issues

## 🎉 Success Criteria

✅ User can select and pay for plans
✅ Payment is processed securely via Razorpay
✅ Plan is activated immediately after payment
✅ Plan expires exactly 30 days after activation
✅ User dashboard shows current plan status
✅ Payment history is tracked and displayed
✅ Webhooks handle missed frontend verifications

The integration is now complete and ready for production use!