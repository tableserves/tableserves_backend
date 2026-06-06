# New Order Notification Fix

## Problem
When a new order was placed, the notification system was not properly sending alerts to the respective restaurant or zone shop. The issue was that the `isNew` flag was being reset by Mongoose after saving the order, causing the notification logic to treat new orders as updates.

## Root Cause
1. **Mongoose `isNew` flag behavior**: After calling `order.save()`, Mongoose automatically sets `order.isNew = false`
2. **Notification timing**: Notifications were sent AFTER saving, when the flag was already false
3. **Inconsistent event names**: Some services used `new_zone_order` while others used `new_order`

## Solution Implemented

### 1. Custom Flag for New Orders
Instead of relying on Mongoose's `isNew` flag, we now use a custom `_isNewOrder` flag:

```javascript
// In orderController.js - Restaurant Orders
const order = new Order(orderData);
await order.save();

// Set custom flag AFTER save (Mongoose resets isNew)
order._isNewOrder = true;

await realtimeOrderService.notifyRestaurant(restaurantId, order);
```

### 2. Updated Notification Logic
All notification methods now check both flags:

```javascript
// In realtimeOrderService.js
const isNewOrder = order._isNewOrder === true || (order.status === 'pending' && order.isNew !== false);

if (isNewOrder) {
  io.to(`restaurant_${restaurantId}`).emit('new_order', orderData);
  logger.info('🔔 NEW ORDER notification sent to restaurant', {
    restaurantId,
    orderNumber: order.orderNumber,
    room: `restaurant_${restaurantId}`
  });
}
```

### 3. Zone Order Splitting Service
Updated to set the custom flag for both main and shop orders:

```javascript
// After saving main order
mainOrder._isNewOrder = true;
await this.notifyZoneAdmin(zoneId, mainOrder, shopOrders);

// After saving each shop order
shopOrder._isNewOrder = true;
await this.notifyShop(shopGroup.shopId, shopOrder);
```

### 4. Consistent Event Names
Changed all zone order notifications to use `new_order` instead of `new_zone_order` for consistency:

```javascript
// MultiShopOrderTrackingService.js
await this.notifyZoneAdmin(mainOrder.zoneId, mainOrder, shopOrders, 'new_order');
```

## Files Modified

1. **backend/src/controllers/orderController.js**
   - Added `_isNewOrder` flag after saving restaurant orders

2. **backend/src/services/realtimeOrderService.js**
   - Updated all notification checks to use custom flag
   - Added detailed logging for new order notifications
   - Applied to: restaurants, zones, shops, and admin dashboard

3. **backend/src/services/zoneOrderSplittingService.js**
   - Set `_isNewOrder` flag for main zone orders
   - Set `_isNewOrder` flag for each shop order
   - Changed event name from `new_zone_order` to `new_order`
   - Enhanced logging for all notifications

4. **backend/src/services/multiShopOrderTrackingService.js**
   - Changed zone admin notification event from `new_zone_order` to `new_order`
   - Added detailed logging for shop and zone notifications

## Notification Flow

### Restaurant Orders
1. Customer places order → Order saved to database
2. `_isNewOrder` flag set to `true`
3. Notification sent to `restaurant_{restaurantId}` room with `new_order` event
4. Notification sent to `admin_dashboard` room with `new_order` event

### Zone Orders (Single Shop)
1. Customer places order → Main order saved
2. Shop order created and saved
3. `_isNewOrder` flag set for shop order
4. Notification sent to `shop_{shopId}` room with `new_order` event
5. Notification sent to `zone_{zoneId}` room with `new_order` event
6. Notification sent to `admin_dashboard` room with `new_order` event

### Zone Orders (Multiple Shops)
1. Customer places order → Main order saved
2. Multiple shop orders created and saved
3. `_isNewOrder` flag set for each shop order
4. Notification sent to each `shop_{shopId}` room with `new_order` event
5. Notification sent to `zone_{zoneId}` room with `new_order` event
6. Notification sent to `admin_dashboard` room with `new_order` event

## Testing

To verify the fix works:

1. **Restaurant Order Test**:
   - Place a new restaurant order
   - Check restaurant dashboard receives `new_order` event
   - Verify notification sound/alert plays
   - Check admin dashboard receives notification

2. **Zone Shop Order Test**:
   - Place a new zone order
   - Check each shop dashboard receives `new_order` event
   - Verify zone admin dashboard receives notification
   - Check admin dashboard receives notification

3. **Console Logs**:
   Look for these log messages:
   ```
   🔔 NEW ORDER notification sent to restaurant
   🔔 NEW ORDER notification sent to shop
   🔔 NEW ORDER notification sent to zone
   🔔 NEW ORDER notification sent to zone admin
   🔔 NEW ORDER notification sent to admin dashboard
   ```

## Benefits

1. ✅ **Reliable notifications**: No longer dependent on Mongoose's internal flag
2. ✅ **Consistent behavior**: All order types use the same notification pattern
3. ✅ **Better logging**: Enhanced logs make debugging easier
4. ✅ **Unified event names**: All new orders use `new_order` event
5. ✅ **Backward compatible**: Still checks old `isNew` flag as fallback

## Notes

- The `_isNewOrder` flag is a runtime flag and is NOT persisted to the database
- It only exists during the notification phase
- The flag is checked before the Mongoose `isNew` flag for priority
- All notification methods include detailed logging for troubleshooting
