# Quick Test Guide - Notifications & Receipts

## 🚀 Quick 5-Minute Test

### Test Notifications (2 minutes)

**Step 1**: Start backend
```bash
cd backend
npm start
```

**Step 2**: Open dashboard
- Restaurant: `http://localhost:5173/restaurant/dashboard`
- Zone: `http://localhost:5173/zone/dashboard`
- Shop: `http://localhost:5173/zoneshop/dashboard`

**Step 3**: Place order via customer interface

**Step 4**: Check results
- ✅ Dashboard shows new order immediately
- ✅ Browser console shows: `🔔 NEW ORDER: {...}`
- ✅ Backend logs show: `✅ notification sent`

---

### Test Receipts (3 minutes)

**Step 1**: Complete an order

**Step 2**: Download receipt

**Step 3**: Open PDF and verify:
- ✅ Business name (not "TableServe")
- ✅ Address shown
- ✅ Phone number shown
- ✅ Fixed width (80mm thermal or A4 customer)

**Step 4**: Resize browser and download again
- ✅ PDF should be identical

---

## 🔍 What to Look For

### ✅ Success Indicators

**Backend Logs:**
```
Socket.io initialized successfully
✅ Restaurant order created and notification sent
✅ Shop order created and notification sent
🔔 NEW ORDER notification sent to restaurant
🔔 NEW ORDER notification sent to shop
```

**Browser Console:**
```javascript
Socket connected: true
🔔 NEW ORDER: { orderNumber: "...", ... }
PDF generated successfully (80mm thermal format)
```

**Dashboard:**
- New order appears immediately
- Order details are complete
- No errors or warnings

**Receipt:**
- Correct business name
- Complete address
- Valid phone number
- Professional formatting

---

### ❌ Failure Indicators

**Backend Logs:**
```
❌ Failed to send real-time notification
SocketService not available
Socket connection error
```

**Browser Console:**
```javascript
Socket connected: false
Connection error: ...
PDF generation failed
```

**Dashboard:**
- No new order appears
- Socket disconnected message
- Error notifications

**Receipt:**
- Shows "TableServe" instead of business name
- Missing address or phone
- Wrong PDF dimensions
- Content cut off

---

## 🐛 Quick Fixes

### Notifications Not Working

**Fix 1**: Restart backend
```bash
pm2 restart tableserve-backend
# or
npm start
```

**Fix 2**: Clear browser cache
```
Ctrl + Shift + Delete → Clear cache → Reload
```

**Fix 3**: Check socket connection
```javascript
// Browser console
console.log('Socket:', socket);
console.log('Connected:', socket.connected);
```

---

### Receipt Information Missing

**Fix 1**: Check API response
```javascript
// Browser console
fetch('/api/v1/orders/track/ORDER123?phone=1234567890')
  .then(r => r.json())
  .then(d => console.log('Data:', d.data));
```

**Fix 2**: Verify populated fields
```javascript
// Should see restaurant/zone/shop objects
{
  restaurant: { name, address, phone },
  zone: { name, location, phone },
  shop: { name, address, phone }
}
```

**Fix 3**: Rebuild frontend
```bash
npm run build
```

---

## 📋 Checklist

### Before Testing
- [ ] Backend server running
- [ ] Frontend running (dev or built)
- [ ] Database connected
- [ ] Socket.io initialized

### During Testing
- [ ] Place test order
- [ ] Check dashboard for notification
- [ ] Check backend logs
- [ ] Check browser console
- [ ] Download receipt
- [ ] Verify receipt information

### After Testing
- [ ] All notifications received
- [ ] All receipts show correct info
- [ ] No errors in logs
- [ ] PDFs have fixed dimensions

---

## 🎯 Expected Results

| Test | Expected | Time |
|------|----------|------|
| Restaurant notification | ✅ Instant | < 1s |
| Zone notification | ✅ Instant | < 1s |
| Shop notification | ✅ Instant | < 1s |
| Receipt download | ✅ Complete info | < 3s |
| PDF dimensions | ✅ Fixed (80mm/A4) | N/A |

---

## 📞 Need Help?

### Check These First

1. **Backend Logs**: Look for "✅ notification sent"
2. **Browser Console**: Look for socket connection
3. **Network Tab**: Check API responses
4. **Database**: Verify order data is saved

### Common Issues

**Issue**: No notifications
**Solution**: Restart backend, check Socket.io initialization

**Issue**: Receipt shows "TableServe"
**Solution**: Check API response has restaurant/zone/shop data

**Issue**: PDF wrong size
**Solution**: Clear cache, verify receipt component has correct classes

---

## 📚 Reference

- **Full Documentation**: `FINAL_NOTIFICATION_AND_RECEIPT_FIX.md`
- **Technical Details**: `TECHNICAL_FIX_DETAILS.md`
- **Deployment Guide**: `DEPLOYMENT_CHECKLIST.md`
- **Test Script**: `test-notification-fix.js`

---

**Quick Test Time**: 5 minutes  
**Full Test Time**: 15 minutes  
**Status**: ✅ Ready to test
