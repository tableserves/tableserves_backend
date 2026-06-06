# Customer Order Tracking WebSocket Fix

## Issue Description

Customer order tracking page was not receiving real-time status updates for certain status transitions (specifically from "confirmed/preparing" to "ready"). The status would only update after a manual page refresh, while the restaurant live orders page was working correctly with instant updates.

## Root Cause Analysis

The issue was in the `RealTimeOrderTracker.js` service's `handleOrderStatusChange` method. The tracker lookup priority was incorrect:

### Problem:
1. **Tracker Storage**: Trackers are stored using `orderNumber` as the primary key in the `activeTrackers` Map
2. **Lookup Priority**: The `handleOrderStatusChange` method was trying to find trackers by `orderId` FIRST, then falling back to `orderNumber`
3. **Mismatch**: Since customer order tracking uses `orderNumber` as the key, the initial lookup by `orderId` would fail, and the fallback logic wasn't being reached efficiently for all status transitions

### Why Restaurant Side Worked:
- Restaurant live orders likely use `orderId` as the tracker key, so the first lookup succeeded
- Customer tracking uses `orderNumber` as the key (for URL-based tracking), requiring the fallback logic

## Solution Implemented

### 1. Fixed Tracker Lookup Priority in `RealTimeOrderTracker.js`

Changed the `handleOrderStatusChange` method to prioritize `orderNumber` lookup FIRST (since that's the primary key for customer tracking):

**Before:**
```javascript
// Tried orderId first
const trackerById = this.activeTrackers.get(orderId);
// Then searched through all trackers for orderNumber
```

**After:**
```javascript
// PRIORITY 1: Try orderNumber FIRST (primary key for customer tracking)
const trackerByOrderNumber = this.activeTrackers.get(orderNumber);

// PRIORITY 2: Try orderId if orderNumber didn't work
const trackerById = this.activeTrackers.get(orderId);

// PRIORITY 3: Search through all trackers (case insensitive)
// PRIORITY 4: Try customer phone as last resort
```

### 2. Enhanced Logging

Added detailed logging to track:
- Which lookup method succeeded
- Status transition details (oldStatus → newStatus)
- Available trackers when lookup fails

## Technical Details

### WebSocket Flow:

1. **Backend Emission** (`realtimeOrderService.js`):
   ```javascript
   // PRIMARY: Emit to tracking room by order number
   const trackingRoom = `tracking_${order.orderNumber}`;
   io.to(trackingRoom).emit('order_status_updated', statusUpdateData);
   io.to(trackingRoom).emit('order_status_changed', statusUpdateData);
   ```

2. **Frontend Room Subscription** (`RealTimeOrderTracker.js`):
   ```javascript
   // Subscribe to tracking room
   RealTimeService.joinRoom('tracking', orderNumber);
   ```

3. **Frontend Event Handling** (`RealTimeOrderTracker.js`):
   ```javascript
   // Listen for status updates
   RealTimeService.addEventListener('order_status_updated', (data) => {
     this.handleOrderStatusChange(data);
   });
   ```

4. **Tracker Lookup** (NOW FIXED):
   ```javascript
   // Find tracker by orderNumber (primary key)
   const tracker = this.activeTrackers.get(orderNumber);
   if (tracker && tracker.onStatusUpdate) {
     tracker.onStatusUpdate(updatedOrderData);
   }
   ```

### Room Naming Convention:

- **Tracking Room**: `tracking_${orderNumber}` - Used for customer order tracking
- **Order Room**: `order_${orderId}` - Used for direct order updates
- **Customer Room**: `customer_${phone}` - Used for customer-wide notifications

## Files Modified

1. **src/services/RealTimeOrderTracker.js**
   - Fixed `handleOrderStatusChange` method
   - Reordered tracker lookup priority
   - Enhanced logging for debugging
   - Added detailed tracker storage logging

2. **src/components/customer/common/OrderTracking.jsx**
   - Added `await` for `trackOrder` call (critical fix)
   - Enhanced logging to verify tracker registration
   - Improved error handling

## Testing Recommendations

### Test Scenario 1: Status Progression
1. Place an order as a customer
2. Open customer order tracking page
3. From restaurant dashboard, change status: pending → confirmed → preparing → ready → completed
4. **Expected**: Each status change should appear instantly on customer page without refresh

### Test Scenario 2: Direct Status Jump
1. Place an order as a customer
2. Open customer order tracking page
3. From restaurant dashboard, change status directly from confirmed → ready (skipping preparing)
4. **Expected**: Status should update instantly on customer page

### Test Scenario 3: Multiple Orders
1. Place multiple orders from same phone number
2. Open tracking pages for each order in different tabs
3. Update statuses from restaurant dashboard
4. **Expected**: Each tracking page should only update for its specific order

## Verification

To verify the fix is working:

1. **Check Browser Console Logs**:
   ```
   📍 Found tracker by orderNumber (PRIMARY KEY), calling onStatusUpdate
   ```

2. **Check Backend Logs**:
   ```
   Status update events emitted to PRIMARY tracking room
   ```

3. **Monitor Network Tab**:
   - WebSocket connection should show `order_status_updated` events
   - Events should contain correct `orderNumber` and `newStatus`

## Additional Notes

- The fix maintains backward compatibility with existing tracker implementations
- Restaurant live orders continue to work as before
- The priority-based lookup ensures optimal performance
- Enhanced logging helps diagnose future WebSocket issues

## Related Files

- `src/services/RealTimeOrderTracker.js` - Main fix location
- `src/services/RealTimeService.js` - WebSocket connection management
- `src/components/customer/common/OrderTracking.jsx` - Customer tracking UI
- `backend/src/services/realtimeOrderService.js` - Backend WebSocket emission
- `backend/src/services/socketService.js` - Backend socket room management
