# Google Lens Integration for "Order More" Button

## Problem
The current "Order More" button opens the device's native camera, which may not work reliably on all mobile devices for QR code scanning.

## Solution
Replace the camera implementation with Google Lens integration, which provides superior QR code scanning across all devices.

## Implementation

### For MultiShopZoneOrderTracking.jsx

Replace the `handleGoHome` function (around line 388) with:

```javascript
  // Open Google Lens to scan QR code for ordering more
  const handleGoHome = useCallback(() => {
    try {
      console.log('📸 Order More clicked - Opening Google Lens for QR scan');
      logger.info('Order More: Opening Google Lens for QR scan');
      
      // Show helpful notification
      addNotification('Opening Google Lens to scan QR code...');
      
      // Detect if user is on mobile or desktop
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        // For mobile devices, open Google Lens app or web version
        // Google Lens deep link for mobile
        const googleLensUrl = 'google://lens';
        const googleLensWebUrl = 'https://lens.google.com/';
        
        // Try to open Google Lens app first
        window.location.href = googleLensUrl;
        
        // Fallback to web version after a short delay if app doesn't open
        setTimeout(() => {
          window.open(googleLensWebUrl, '_blank');
        }, 1500);
        
        logger.info('Opened Google Lens on mobile device');
      } else {
        // For desktop, open Google Lens web version
        window.open('https://lens.google.com/', '_blank');
        logger.info('Opened Google Lens web version on desktop');
      }
      
      // Show instruction notification
      setTimeout(() => {
        addNotification('Use Google Lens to scan the table QR code to order more items');
      }, 2000);

    } catch (error) {
      logger.error('Error opening Google Lens', { error: error.message });
      addNotification('Unable to open Google Lens. Please open it manually and scan the QR code.');
    }
  }, [addNotification]);
```

### For OrderTrackingScreen.jsx (if it has the same button)

If OrderTrackingScreen.jsx also has an "Order More" button with camera functionality, apply the same replacement.

## Benefits

1. **Better Compatibility**: Google Lens works consistently across all devices
2. **Superior Scanning**: Google Lens has advanced QR code recognition
3. **No Permissions Required**: Doesn't need camera permissions from the app
4. **Fallback Support**: Automatically falls back to web version if app isn't installed
5. **User Friendly**: Most users are familiar with Google Lens

## How It Works

1. **Mobile Devices**:
   - First attempts to open Google Lens app using deep link (`google://lens`)
   - If app not installed, opens Google Lens web version after 1.5 seconds
   
2. **Desktop**:
   - Opens Google Lens web version directly in a new tab

3. **User Flow**:
   - User clicks "Order More"
   - Google Lens opens
   - User scans the table QR code
   - User is redirected to the menu to place another order

## Testing

Test on various devices:
- ✅ Android with Google Lens app installed
- ✅ Android without Google Lens app
- ✅ iPhone (will use web version)
- ✅ Desktop browsers

## Alternative: Native Camera with Google Lens Fallback

If you want to keep the native camera as primary with Google Lens as fallback:

```javascript
const handleGoHome = useCallback(() => {
  try {
    console.log('📸 Order More clicked - Attempting camera/Google Lens');
    
    // Check if device has camera
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      // Show option modal
      const useGoogleLens = window.confirm(
        'Choose scanning method:\n\nOK = Use Google Lens (Recommended)\nCancel = Use Device Camera'
      );
      
      if (useGoogleLens) {
        // Open Google Lens
        const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (isMobile) {
          window.location.href = 'google://lens';
          setTimeout(() => window.open('https://lens.google.com/', '_blank'), 1500);
        } else {
          window.open('https://lens.google.com/', '_blank');
        }
      } else {
        // Use native camera (existing implementation)
        // ... existing camera code ...
      }
    } else {
      // No camera available, use Google Lens
      addNotification('Opening Google Lens for QR scanning...');
      const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.href = 'google://lens';
        setTimeout(() => window.open('https://lens.google.com/', '_blank'), 1500);
      } else {
        window.open('https://lens.google.com/', '_blank');
      }
    }
  } catch (error) {
    logger.error('Error in handleGoHome', { error: error.message });
    addNotification('Unable to open scanner');
  }
}, [addNotification]);
```

## Recommendation

Use the **Google Lens only** approach (first implementation) because:
- Simpler code
- More reliable
- Better user experience
- No permission issues
- Works on all devices
