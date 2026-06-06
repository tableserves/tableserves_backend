# Deployment Checklist

## ✅ Pre-Deployment Checklist

### Code Review
- [ ] All code changes reviewed
- [ ] No syntax errors (run `getDiagnostics`)
- [ ] No console errors in development
- [ ] All files properly saved and committed

### Testing - Notifications
- [ ] Restaurant order notifications working
- [ ] Zone admin notifications working
- [ ] Shop order notifications working
- [ ] Backend logs show "✅ notification sent"
- [ ] Socket.io properly initialized
- [ ] All socket rooms working correctly

### Testing - PDFs
- [ ] Thermal receipt is 80mm width (302px)
- [ ] Customer receipt is A4 width (210mm)
- [ ] PDFs identical on desktop, tablet, mobile
- [ ] No content cut off or misaligned
- [ ] Print quality is acceptable

### Documentation
- [ ] All documentation files created
- [ ] README updated (if needed)
- [ ] API documentation updated (if needed)
- [ ] Changelog updated

---

## 🚀 Deployment Steps

### Step 1: Backup Current Version
```bash
# Create backup branch
git checkout -b backup-before-notification-fix
git push origin backup-before-notification-fix

# Tag current production version
git tag -a v1.0.0-pre-fix -m "Before notification and PDF fix"
git push origin v1.0.0-pre-fix
```

### Step 2: Merge Changes
```bash
# Switch to main/production branch
git checkout main

# Merge fix branch
git merge fix/notifications-and-pdfs

# Resolve any conflicts
# Test again after merge

# Push to repository
git push origin main
```

### Step 3: Deploy Backend
```bash
# SSH to server
ssh user@your-server.com

# Navigate to backend directory
cd /path/to/tableserve/backend

# Pull latest changes
git pull origin main

# Install dependencies (if any changed)
npm install

# Run tests (if available)
npm test

# Restart backend service
pm2 restart tableserve-backend

# Or if using systemd
sudo systemctl restart tableserve-backend

# Check logs
pm2 logs tableserve-backend --lines 50
# Look for "Socket.io initialized successfully"
```

### Step 4: Deploy Frontend
```bash
# On local machine or build server
cd /path/to/tableserve

# Pull latest changes
git pull origin main

# Install dependencies (if any changed)
npm install

# Build production bundle
npm run build

# Deploy to hosting (example for various platforms)

# Option A: Manual upload
scp -r dist/* user@your-server.com:/var/www/tableserve/

# Option B: Vercel
vercel --prod

# Option C: Netlify
netlify deploy --prod

# Option D: AWS S3
aws s3 sync dist/ s3://your-bucket-name/ --delete
```

### Step 5: Verify Deployment
```bash
# Check backend is running
curl https://your-api.com/health

# Check frontend is accessible
curl https://your-app.com

# Check socket.io connection
# Open browser console on your app
# Should see: "Socket connected: true"
```

---

## 🧪 Post-Deployment Testing

### Test 1: Restaurant Notifications (5 min)
1. [ ] Open restaurant dashboard
2. [ ] Place test order via customer interface
3. [ ] Verify notification appears in dashboard
4. [ ] Check backend logs for "✅ notification sent"
5. [ ] Verify order appears in pending orders list

### Test 2: Zone Notifications (5 min)
1. [ ] Open zone admin dashboard
2. [ ] Open shop dashboards for 2-3 shops
3. [ ] Place test zone order with items from multiple shops
4. [ ] Verify zone admin receives main order notification
5. [ ] Verify each shop receives their order notification
6. [ ] Check backend logs for all notifications sent

### Test 3: Thermal Receipt PDF (3 min)
1. [ ] Complete a zone shop order
2. [ ] Download receipt from shop dashboard
3. [ ] Open PDF and verify 80mm width
4. [ ] Test on mobile device - should be same width
5. [ ] Print on thermal printer (if available)

### Test 4: Customer Receipt PDF (3 min)
1. [ ] Complete a customer order
2. [ ] Go to order tracking page
3. [ ] Download receipt
4. [ ] Open PDF and verify A4 format
5. [ ] Test on mobile device - should be same format

### Test 5: Load Testing (10 min)
1. [ ] Place 5-10 orders simultaneously
2. [ ] Verify all notifications are received
3. [ ] Check for any errors in logs
4. [ ] Verify system performance is acceptable

---

## 📊 Monitoring Setup

### Backend Monitoring
```bash
# Set up log monitoring
tail -f /path/to/logs/app.log | grep "notification sent"

# Monitor for errors
tail -f /path/to/logs/error.log | grep "notification\|socket"

# Check PM2 status
pm2 status
pm2 monit
```

### Frontend Monitoring
```javascript
// Add to browser console for real-time monitoring
socket.on('connect', () => console.log('✅ Socket connected'));
socket.on('disconnect', () => console.log('❌ Socket disconnected'));
socket.on('new_order', (data) => console.log('🔔 New order:', data));
socket.on('connect_error', (err) => console.error('❌ Connection error:', err));
```

### Metrics to Track
- [ ] Socket connection success rate
- [ ] Notification delivery rate
- [ ] Average notification latency
- [ ] PDF generation success rate
- [ ] Average PDF generation time
- [ ] Error rate (backend and frontend)

---

## 🐛 Rollback Plan

### If Critical Issues Occur

#### Quick Rollback (5 minutes)
```bash
# Backend
ssh user@your-server.com
cd /path/to/tableserve/backend
git checkout backup-before-notification-fix
pm2 restart tableserve-backend

# Frontend
cd /path/to/tableserve
git checkout backup-before-notification-fix
npm run build
# Deploy build (same as Step 4 above)
```

#### Partial Rollback

**If only notifications are broken:**
```bash
# Rollback backend only
cd backend
git checkout backup-before-notification-fix -- src/controllers/orderController.js
git checkout backup-before-notification-fix -- src/services/zoneOrderSplittingService.js
pm2 restart tableserve-backend
```

**If only PDFs are broken:**
```bash
# Rollback frontend only
git checkout backup-before-notification-fix -- src/utils/downloadUtils.js
git checkout backup-before-notification-fix -- src/components/common/Receipt.jsx
git checkout backup-before-notification-fix -- src/components/customer/common/CustomerReceipt.jsx
npm run build
# Deploy build
```

---

## 🔍 Troubleshooting Guide

### Issue: Notifications Not Received

**Check 1: Backend Logs**
```bash
# Look for initialization
grep "Socket.io initialized" logs/app.log

# Look for notification attempts
grep "notification sent" logs/app.log

# Look for errors
grep "ERROR" logs/app.log | grep -i "socket\|notification"
```

**Check 2: Socket Connection**
```javascript
// Browser console
console.log('Socket ID:', socket.id);
console.log('Connected:', socket.connected);
console.log('Rooms:', socket.rooms);  // May not be available
```

**Check 3: Room Joining**
```bash
# Backend logs should show
grep "joined.*room" logs/app.log
```

**Fix:**
- Restart backend: `pm2 restart tableserve-backend`
- Clear browser cache and reload
- Check CORS configuration
- Verify socket.io version compatibility

### Issue: PDFs Wrong Size

**Check 1: Receipt Component**
```javascript
// Browser console
const receipt = document.querySelector('[data-receipt-type]');
console.log('Receipt type:', receipt?.dataset.receiptType);
console.log('Width:', receipt?.style.width);
console.log('Classes:', receipt?.className);
```

**Check 2: PDF Generation**
```javascript
// Browser console during download
// Should see logs like:
// "isThermalReceipt: true"
// "Canvas width: 302"
```

**Fix:**
- Clear browser cache
- Verify receipt component has correct classes
- Check if Tailwind is overriding styles
- Rebuild frontend: `npm run build`

### Issue: High Error Rate

**Check 1: Server Resources**
```bash
# Check CPU and memory
top
htop

# Check disk space
df -h

# Check PM2 status
pm2 status
pm2 monit
```

**Check 2: Database Connection**
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check connection from backend
mongo --eval "db.adminCommand('ping')"
```

**Fix:**
- Scale up server resources
- Optimize database queries
- Add caching layer
- Implement rate limiting

---

## 📞 Emergency Contacts

### If Issues Occur

**Development Team:**
- Lead Developer: [contact info]
- Backend Developer: [contact info]
- Frontend Developer: [contact info]

**Infrastructure:**
- DevOps Engineer: [contact info]
- System Administrator: [contact info]

**Business:**
- Product Manager: [contact info]
- Customer Support: [contact info]

---

## 📝 Post-Deployment Report

### After 24 Hours

**Metrics to Report:**
- [ ] Total orders processed
- [ ] Notification delivery rate
- [ ] PDF generation success rate
- [ ] Average response time
- [ ] Error rate
- [ ] User feedback

**Issues Encountered:**
- [ ] List any issues
- [ ] How they were resolved
- [ ] Preventive measures taken

**Recommendations:**
- [ ] Any optimizations needed
- [ ] Additional monitoring required
- [ ] Documentation updates needed

---

## ✅ Success Criteria

### Deployment is Successful If:

**Notifications:**
- [x] 95%+ delivery rate
- [x] < 2 second latency
- [x] No critical errors in logs
- [x] All dashboards receiving notifications

**PDFs:**
- [x] 95%+ generation success rate
- [x] Consistent dimensions across devices
- [x] < 5 second generation time
- [x] Print quality acceptable

**System:**
- [x] No increase in error rate
- [x] Response time within acceptable range
- [x] No performance degradation
- [x] Positive user feedback

---

## 🎉 Deployment Complete

Once all checks pass:

1. [ ] Update status page (if applicable)
2. [ ] Notify stakeholders of successful deployment
3. [ ] Update documentation with any lessons learned
4. [ ] Schedule follow-up review in 1 week
5. [ ] Celebrate! 🎊

---

## 📚 Reference Documents

- **Technical Details**: `TECHNICAL_FIX_DETAILS.md`
- **Quick Verification**: `QUICK_FIX_VERIFICATION.md`
- **Complete Summary**: `FIX_COMPLETE_SUMMARY.md`
- **Notification Flow**: `NOTIFICATION_FLOW_DIAGRAM.md`
- **Test Script**: `test-notification-fix.js`

---

**Deployment Date**: _____________  
**Deployed By**: _____________  
**Status**: ⬜ Pending / ⬜ In Progress / ⬜ Complete  
**Issues**: ⬜ None / ⬜ Minor / ⬜ Major  
**Rollback Required**: ⬜ Yes / ⬜ No
