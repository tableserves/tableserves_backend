# Razorpay Payment Integration Test Scenarios

This document outlines comprehensive test scenarios for the Razorpay payment integration in the TableServe ordering system.

## Test Environment Setup

### Prerequisites
- Node.js and npm installed
- MongoDB test database
- Razorpay test account credentials
- Jest testing framework

### Environment Variables
```bash
# Test Environment
NODE_ENV=test
TEST_MONGODB_URI=mongodb://localhost:27017/tableserve_test
TEST_PORT=3001

# Razorpay Test Credentials
RAZORPAY_KEY_ID=rzp_test_RITcoFYtrdDOn7
RAZORPAY_KEY_SECRET=your_test_key_secret
RAZORPAY_WEBHOOK_SECRET=your_test_webhook_secret
```

## Unit Test Scenarios

### 1. OrderPaymentService Tests

#### 1.1 createRazorpayOrder()
- ✅ **Success Case**: Create Razorpay order for valid pending order
- ✅ **Order Not Found**: Handle non-existent order ID
- ✅ **Invalid Order State**: Reject orders not in pending state
- ✅ **Payment Already Initiated**: Reject orders with existing payment
- ✅ **Razorpay API Error**: Handle Razorpay service failures
- ✅ **Amount Conversion**: Verify correct paise conversion
- ✅ **Receipt Generation**: Ensure unique receipt format

#### 1.2 verifyPayment()
- ✅ **Success Case**: Verify valid payment with correct signature
- ✅ **Invalid Signature**: Reject payments with wrong signature
- ✅ **Order ID Mismatch**: Reject payments for wrong order
- ✅ **Payment Expired**: Handle expired payment attempts
- ✅ **Already Verified**: Handle duplicate verification attempts
- ✅ **Order Not Found**: Handle non-existent orders

#### 1.3 verifySignature()
- ✅ **Valid Signature**: Accept correctly signed payments
- ✅ **Invalid Signature**: Reject incorrectly signed payments
- ✅ **Timing Attack Protection**: Use crypto.timingSafeEqual()

#### 1.4 Edge Case Handlers
- ✅ **Duplicate Payment Detection**: Identify duplicate payment attempts
- ✅ **Expired Payment Cleanup**: Clean up expired payments
- ✅ **Retry Logic**: Handle payment verification retries

## Integration Test Scenarios

### 2. API Endpoint Tests

#### 2.1 POST /api/v1/orders/create-payment
- ✅ **Success Flow**: Create payment for valid order
- ✅ **Input Validation**: Reject invalid order IDs
- ✅ **Rate Limiting**: Enforce payment creation limits
- ✅ **Security Headers**: Validate request sanitization
- ✅ **Error Responses**: Return appropriate error codes

#### 2.2 POST /api/v1/orders/verify-payment
- ✅ **Success Flow**: Verify valid payment data
- ✅ **Input Validation**: Validate all required fields
- ✅ **Signature Verification**: Enforce signature validation
- ✅ **Rate Limiting**: Enforce verification attempt limits
- ✅ **Error Handling**: Handle various failure scenarios

#### 2.3 POST /api/webhooks/razorpay-orders
- ✅ **Webhook Signature**: Validate webhook signatures
- ✅ **Event Processing**: Handle payment events correctly
- ✅ **Idempotency**: Handle duplicate webhook calls
- ✅ **Error Recovery**: Graceful error handling

### 3. Complete Payment Flow Tests

#### 3.1 Successful Payment Flow
1. Create order with pending status
2. Create Razorpay payment order
3. Simulate successful payment
4. Verify payment with valid signature
5. Confirm order status updated to 'confirmed'
6. Verify payment status updated to 'paid'

#### 3.2 Failed Payment Flow
1. Create order with pending status
2. Create Razorpay payment order
3. Simulate failed payment
4. Verify payment failure handling
5. Confirm order status remains 'pending'
6. Verify payment status updated to 'failed'

## Manual Test Scenarios

### 4. Frontend Integration Tests

#### 4.1 Payment Modal Tests
- **Modal Display**: Payment modal opens correctly
- **Order Summary**: Displays correct order details
- **Payment Methods**: Shows available payment options
- **Loading States**: Proper loading indicators
- **Error Handling**: Displays error messages appropriately
- **Success Handling**: Redirects after successful payment

#### 4.2 Network Error Scenarios
- **Connection Loss**: Handle network disconnection
- **Timeout Errors**: Handle payment timeouts
- **Retry Logic**: Allow payment retry attempts
- **Fallback Options**: Offer alternative payment methods

### 5. Razorpay Test Cards

#### 5.1 Successful Payment Cards
```
Card Number: 4111111111111111
Expiry: 12/25
CVV: 123
Name: Test User
```

#### 5.2 Failed Payment Cards
```
Card Number: 4000000000000002
Expiry: 12/25
CVV: 123
Name: Test User
```

#### 5.3 Insufficient Funds
```
Card Number: 4000000000000119
Expiry: 12/25
CVV: 123
Name: Test User
```

### 6. UPI Test Scenarios

#### 6.1 Successful UPI Payment
- UPI ID: `success@razorpay`
- Expected: Payment succeeds

#### 6.2 Failed UPI Payment
- UPI ID: `failure@razorpay`
- Expected: Payment fails

## Performance Test Scenarios

### 7. Load Testing

#### 7.1 Concurrent Payment Creation
- **Test**: 100 concurrent payment creation requests
- **Expected**: All requests handled within rate limits
- **Metrics**: Response time < 2 seconds

#### 7.2 Payment Verification Load
- **Test**: 50 concurrent payment verifications
- **Expected**: All verifications processed correctly
- **Metrics**: Response time < 1 second

### 8. Security Test Scenarios

#### 8.1 Rate Limiting Tests
- **Payment Creation**: Max 10 requests per 15 minutes
- **Payment Verification**: Max 5 requests per 15 minutes
- **Expected**: Rate limits enforced correctly

#### 8.2 Input Validation Tests
- **SQL Injection**: Reject malicious input
- **XSS Attempts**: Sanitize user input
- **Invalid Signatures**: Reject tampered signatures

#### 8.3 Webhook Security Tests
- **Missing Signature**: Reject unsigned webhooks
- **Invalid Signature**: Reject incorrectly signed webhooks
- **Replay Attacks**: Handle duplicate webhook events

## Error Recovery Test Scenarios

### 9. System Failure Tests

#### 9.1 Database Connection Loss
- **Scenario**: MongoDB connection fails during payment
- **Expected**: Graceful error handling, no data corruption

#### 9.2 Razorpay API Downtime
- **Scenario**: Razorpay API unavailable
- **Expected**: Appropriate error messages, retry logic

#### 9.3 Payment Timeout Scenarios
- **Scenario**: Payment takes longer than 15 minutes
- **Expected**: Payment marked as expired, cleanup triggered

### 10. Data Consistency Tests

#### 10.1 Concurrent Order Updates
- **Scenario**: Multiple payment attempts for same order
- **Expected**: Only one payment succeeds, others rejected

#### 10.2 Webhook vs API Race Conditions
- **Scenario**: Webhook arrives before API verification
- **Expected**: Consistent final state regardless of order

## Test Execution Commands

### Run All Tests
```bash
npm test
```

### Run Unit Tests Only
```bash
npm run test:unit
```

### Run Integration Tests Only
```bash
npm run test:integration
```

### Run with Coverage
```bash
npm run test:coverage
```

### Run Specific Test File
```bash
npm test -- tests/unit/orderPaymentService.test.js
```

## Test Data Cleanup

### Automated Cleanup
- Test database is cleared after each test suite
- Temporary files removed automatically
- Mock services reset between tests

### Manual Cleanup
```bash
# Clear test database
mongo tableserve_test --eval "db.dropDatabase()"

# Clear test logs
rm -rf logs/test_*.log
```

## Monitoring and Reporting

### Test Metrics
- **Code Coverage**: Minimum 90% for payment modules
- **Test Execution Time**: Maximum 30 seconds for full suite
- **Success Rate**: 100% for critical payment flows

### Continuous Integration
- Tests run on every commit
- Payment tests run on staging environment
- Production deployment blocked if tests fail

## Troubleshooting

### Common Issues
1. **Razorpay API Key Issues**: Verify test credentials
2. **Database Connection**: Ensure MongoDB is running
3. **Network Timeouts**: Check internet connectivity
4. **Signature Mismatches**: Verify secret key configuration

### Debug Commands
```bash
# Enable debug logging
DEBUG=payment:* npm test

# Run single test with verbose output
npm test -- --verbose tests/unit/orderPaymentService.test.js

# Check test database state
mongo tableserve_test --eval "db.orders.find().pretty()"
```
