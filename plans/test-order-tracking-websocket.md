# Test Plan: Customer Order Tracking WebSocket Fix

## Quick Test Steps

### Test 1: Basic Status Update (Confirmed → Ready)
**This was the main issue - status not updating from preparing/confirmed to ready**

1. **Setup**:
   - Login as restaurant owner
   - Place a test order from customer side
   - Note the order number (e.g., ORD-12345)

2. **Open Customer Tracking**:
   - Navigate to: `/order-tracking/ORD-12345?phone=1234567890`
   - Keep browser console open (F12)

3. **Update Status from Restaurant**:
   - Go to restaurant live orders
   - Change order status: Pending → Confirmed
   - **Expected**: Customer page updates instantly ✓
   
4. **Critical Test - Confirmed to Ready**:
   - Change order status: Confirmed → Ready
   - **Expected**: Customer page updates instantly WITHOUT refresh ✓
   - **Check Console**: Should see `📍 Found tracker by orderNumber (PRIMARY KEY)`

5. **Complete Order**:
   - Change order status: Ready → Completed
   - **Expected**: Customer page updates instantly ✓

### Test 2: Multiple Status Changes Rapidly

1. Place an order
2. Open customer tracking page
3. Rapidly change statuses from restaurant dashboard:
   - Pending → Confirmed (wait 2 seconds)
   - Confirmed → Ready (wait 2 seconds)
   - Ready → Completed
4. **Expected**: All changes appear instantly on customer page

### Test 3: Multiple Orders Same Phone

1. Place 3 orders from same phone number
2. Open tracking pages for all 3 orders in different browser tabs
3. Update status for Order 1 from restaurant
4. **Expected**: 
   - Only Order 1 tracking page updates ✓
   - Other tabs remain unchanged ✓

### Test 4: Reconnection Test

1. Place an order and open customer tracking
2. Open browser DevTools → Network tab
3. Find WebSocket connection and close it (right-click → Close)
4. Wait for reconnection (should be automatic)
5. Update order status from restaurant
6. **Expected**: Status updates after reconnection ✓

## Console Log Verification

### Success Indicators:

**Customer Side (Browser Console)**:
```
🔄 Received order_status_updated event
📍 Found tracker by orderNumber (PRIMARY KEY), calling onStatusUpdate
📱 Real-time status update received in OrderTracking
```

**Backend Logs**:
```
Status update events emitted to PRIMARY tracking room
Customer notification sent
```

### Failure Indicators:

**If you see this, the fix didn't work**:
```
⚠️ No tracker found for orderNumber (primary key)
❌ No matching tracker found for order
```

## Browser Console Commands

### Check Active Trackers:
```javascript
// In browser console
window.RealTimeOrderTracker = require('./services/RealTimeOrderTracker').default;
console.log('Active Trackers:', Array.from(window.RealTimeOrderTracker.activeTrackers.keys()));
```

### Check WebSocket Connection:
```javascript
// Check if WebSocket is connected
console.log('WebSocket Connected:', window.RealTimeService?.isConnected);
console.log('Subscribed Rooms:', Array.from(window.RealTimeService?.subscriptions || []));
```

## Expected Behavior Summary

| Status Change | Customer Page | Refresh Needed? | Notes |
|--------------|---------------|-----------------|-------|
| Pending → Confirmed | ✓ Updates | No | Should work |
| Confirmed → Preparing | ✓ Updates | No | Should work |
| Preparing → Ready | ✓ Updates | No | **This was broken, now fixed** |
| Ready → Completed | ✓ Updates | No | Should work |
| Any → Cancelled | ✓ Updates | No | Should work |

## Troubleshooting

### If status still doesn't update:

1. **Check WebSocket Connection**:
   - Browser console should show WebSocket connection
   - Network tab should show WS connection as "101 Switching Protocols"

2. **Check Room Subscription**:
   - Console should show: `Joined PRIMARY tracking room`
   - Room name should be: `tracking_${orderNumber}`

3. **Check Backend Logs**:
   - Should see: `Status update events emitted to PRIMARY tracking room`
   - Should include correct orderNumber

4. **Verify Order Number**:
   - Make sure orderNumber in URL matches order in database
   - Check for case sensitivity issues

5. **Clear Browser Cache**:
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Clear localStorage and try again

## Performance Metrics

- **Status Update Latency**: < 500ms from restaurant click to customer display
- **WebSocket Reconnection**: < 3 seconds
- **Fallback Polling**: Every 30 seconds (if WebSocket fails)

## Success Criteria

✅ All status transitions update instantly on customer page
✅ No page refresh required for any status change
✅ Multiple orders tracked independently
✅ WebSocket reconnection works automatically
✅ Console shows correct tracker lookup method
✅ No errors in browser or backend logs
