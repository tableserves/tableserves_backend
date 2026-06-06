# Restaurant and Zone Shop Receipt Fix

## Issue Description
The restaurant and zone shop receipts were showing default details instead of fetching the correct restaurant/zone shop information. The issue was not at the customer receipt level but at the restaurant and zone shop level receipt generation.

## Root Cause Analysis

### Zone Shop Receipt Issue
In the zone shop components (`OrderHistory.jsx` and `LiveOrders.jsx`), the API call to `/api/v1/shops/zones/${zoneId}/shop/${shopId}` returns a nested response structure:

```json
{
  "success": true,
  "data": {
    "shop": {
      "name": "Actual Shop Name",
      "address": "Actual Shop Address",
      "phone": "Actual Shop Phone",
      // ... other shop data
    }
  }
}
```

However, the frontend code was incorrectly setting:
```javascript
setShopData(result.data); // This gives { shop: {...} }
```

Instead of:
```javascript
setShopData(result.data.shop); // This gives the actual shop data
```

### Restaurant Receipt Issue
Similar issue in restaurant order management (`OrderManagement.jsx`) where the API response structure was not properly handled.

## Files Fixed

### 1. Zone Shop Order History
**File**: `src/components/zoneshop/orders/OrderHistory.jsx`
**Line**: ~240
**Change**: 
```javascript
// Before
setShopData(result.data);

// After  
setShopData(result.data.shop || result.data);
```

### 2. Zone Shop Live Orders
**File**: `src/components/zoneshop/orders/LiveOrders.jsx`
**Line**: ~473
**Change**:
```javascript
// Before
setShopData(result.data);

// After
setShopData(result.data.shop || result.data);
```

### 3. Restaurant Order Management
**File**: `src/pages/owner/OrderManagement.jsx`
**Line**: ~394
**Change**:
```javascript
// Before
setRestaurantData(result.data);

// After
setRestaurantData(result.data.restaurant || result.data);
```

## How the Fix Works

1. **Proper Data Extraction**: The fix extracts the actual business data from the nested API response structure.

2. **Fallback Support**: Uses `result.data.shop || result.data` and `result.data.restaurant || result.data` to handle both nested and flat response structures.

3. **Receipt Component Compatibility**: The Receipt components (`Receipt.jsx` and `CustomerReceipt.jsx`) already have robust business info extraction logic that can handle various data structures.

## Impact

### Before Fix
- Zone shop receipts showed "Zone Shop" as default name
- Restaurant receipts showed "Restaurant Name" as default
- Addresses, phone numbers, and other details were generic placeholders

### After Fix
- Zone shop receipts now display actual shop name, address, phone, etc.
- Restaurant receipts now display actual restaurant details
- All business information is correctly populated from the database

## Testing Recommendations

1. **Zone Shop Receipt Testing**:
   - Navigate to zone shop order history
   - Select an order and download receipt
   - Verify shop name, address, phone are correct

2. **Restaurant Receipt Testing**:
   - Navigate to restaurant order management
   - Download an order receipt/invoice
   - Verify restaurant details are correct

3. **Live Orders Testing**:
   - Test receipt downloads from live orders in zone shops
   - Verify business information is accurate

## Technical Notes

- The Receipt components have comprehensive fallback logic for business info extraction
- The fix maintains backward compatibility with different API response structures
- Error handling remains intact with default values if API calls fail
- No changes needed to the Receipt components themselves as they were already robust

## Related Components

- `src/components/common/Receipt.jsx` - Thermal receipt component (already robust)
- `src/components/customer/common/CustomerReceipt.jsx` - Customer receipt component (already robust)
- Backend API endpoints maintain their existing response structure