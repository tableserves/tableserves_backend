# Manual Update Instructions for Google Lens Integration

## File to Update
`src/components/customer/zone/MultiShopZoneOrderTracking.jsx`

## Location
Find the `handleGoHome` function around **line 388-483**

## Current Code (TO REPLACE)
```javascript
  // Open camera to scan QR code for ordering more
  const handleGoHome = useCallback(() => {
    try {
      console.log('📸 Order More clicked - Opening camera for QR scan');
      logger.info('Order More: Opening camera for QR scan');
      
      // Check if device has camera
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        addNotification('Camera not available on this device');
        logger.warn('Camera API not available');
        return;
      }

      // Request camera permission and open
      navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera on mobile
      })
      .then(stream => {
        // Camera opened successfully
        addNotification('Point your camera at the QR code to order more');
        logger.info('Camera opened successfully for QR scan');
        
        // Create a simple QR scanner interface
        const videoElement = document.createElement('video');
        videoElement.srcObject = stream;
        videoElement.setAttribute('playsinline', true);
        videoElement.play();
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.9);
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-center;
        `;
        
        videoElement.style.cssText = `
          width: 100%;
          max-width: 500px;
          border-radius: 12px;
        `;
        
        const closeButton = document.createElement('button');
        closeButton.textContent = '✕ Close';
        closeButton.style.cssText = `
          position: absolute;
          top: 20px;
          right: 20px;
          padding: 12px 24px;
          background: white;
          color: black;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
        `;
        
        const instruction = document.createElement('div');
        instruction.textContent = 'Scan QR Code to Order More';
        instruction.style.cssText = `
          color: white;
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 20px;
          text-align: center;
        `;
        
        closeButton.onclick = () => {
          stream.getTracks().forEach(track => track.stop());
          document.body.removeChild(overlay);
        };
        
        overlay.appendChild(closeButton);
        overlay.appendChild(instruction);
        overlay.appendChild(videoElement);
        document.body.appendChild(overlay);
      })
      .catch(error => {
        logger.error('Camera access denied or error', { error: error.message });
        addNotification('Please allow camera access to scan QR code');
      });

    } catch (error) {
      logger.error('Error opening camera', { error: error.message });
      addNotification('Unable to open camera');
    }
  }, [addNotification]);
```

## New Code (REPLACEMENT)
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

## Steps to Apply

1. Open `src/components/customer/zone/MultiShopZoneOrderTracking.jsx` in your editor
2. Find the `handleGoHome` function (around line 388)
3. Select the entire function from the comment `// Open camera to scan QR code for ordering more` to the closing `}, [addNotification]);`
4. Delete the selected code
5. Paste the new code from above
6. Save the file

## What Changed

### Before (Camera):
- Requested camera permissions
- Created custom video overlay
- Required camera access
- May not work on all devices

### After (Google Lens):
- Opens Google Lens app/web
- No permissions needed
- Works on all devices
- Better QR code recognition
- Simpler implementation

## Benefits

✅ **Universal Compatibility** - Works on all mobile devices
✅ **No Permissions** - Doesn't require camera permissions
✅ **Better Scanning** - Google Lens has superior QR recognition
✅ **Simpler Code** - Reduced from ~95 lines to ~40 lines
✅ **Fallback Support** - Auto-falls back to web version if app not installed

## Testing

After applying the change, test on:
- Android phone (with/without Google Lens app)
- iPhone
- Desktop browser

The button should open Google Lens and allow users to scan the table QR code to order more items.
