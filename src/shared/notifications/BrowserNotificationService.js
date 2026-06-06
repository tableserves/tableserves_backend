/**
 * Browser Notification Service
 * 
 * Handles browser/desktop notifications for new orders
 * Works even when the user is on a different tab or window
 */

class BrowserNotificationService {
  constructor() {
    this.permission = 'default';
    this.isSupported = 'Notification' in window;
    this.soundEnabled = true;
    this.notificationSound = null;
  }

  /**
   * Initialize the notification service
   */
  async init() {
    if (!this.isSupported) {
      console.warn('Browser notifications are not supported');
      return false;
    }

    // Check current permission
    this.permission = Notification.permission;

    // Request permission if not already granted
    if (this.permission === 'default') {
      this.permission = await Notification.requestPermission();
    }

    // Load notification sound
    this.loadNotificationSound();

    return this.permission === 'granted';
  }

  /**
   * Load notification sound
   */
  loadNotificationSound() {
    try {
      // Create a simple notification sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.audioContext = audioContext;
    } catch (error) {
      console.warn('Could not initialize audio context:', error);
    }
  }

  /**
   * Play notification sound
   */
  playSound(type = 'new_order') {
    if (!this.soundEnabled || !this.audioContext) return;

    try {
      // Different tones for different notification types
      const frequencies = {
        new_order: [800, 1000, 1200], // Rising tone for new orders
        order_update: [600, 800], // Two-tone for updates
        status_change: [400] // Single tone for status changes
      };

      const freq = frequencies[type] || [600];

      freq.forEach((frequency, index) => {
        setTimeout(() => {
          const oscillator = this.audioContext.createOscillator();
          const gainNode = this.audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(this.audioContext.destination);

          oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
          oscillator.type = 'sine';

          gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

          oscillator.start(this.audioContext.currentTime);
          oscillator.stop(this.audioContext.currentTime + 0.3);
        }, index * 200);
      });
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission() {
    if (!this.isSupported) {
      return false;
    }

    try {
      this.permission = await Notification.requestPermission();
      return this.permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Show a browser notification for a new order
   */
  showNewOrderNotification(orderData) {
    if (!this.isSupported || this.permission !== 'granted') {
      console.log('Browser notifications not available or not permitted');
      return;
    }

    try {
      const title = '🔔 New Order Received!';
      const body = `Table ${orderData.tableNumber} - ${orderData.items?.length || 0} items - $${orderData.total?.toFixed(2) || '0.00'}`;
      const icon = '/logo.png'; // Update with your app logo path
      const badge = '/badge.png'; // Update with your app badge path

      const notification = new Notification(title, {
        body,
        icon,
        badge,
        tag: `order_${orderData.orderId}`, // Prevents duplicate notifications
        requireInteraction: true, // Notification stays until user interacts
        vibrate: [200, 100, 200], // Vibration pattern for mobile devices
        data: {
          orderId: orderData.orderId,
          orderNumber: orderData.orderNumber,
          type: 'new_order'
        }
      });

      // Play sound
      this.playSound('new_order');

      // Handle notification click
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus(); // Focus the window
        notification.close();

        // Navigate to orders page (you can customize this)
        if (orderData.restaurantId) {
          window.location.href = `/owner/dashboard?tab=orders`;
        } else if (orderData.shopId) {
          window.location.href = `/zoneshop/dashboard?tab=orders`;
        }
      };

      // Auto-close after 10 seconds if not interacted with
      setTimeout(() => {
        notification.close();
      }, 10000);

      return notification;
    } catch (error) {
      console.error('Error showing browser notification:', error);
      return null;
    }
  }

  /**
   * Show a browser notification for order status update
   */
  showOrderUpdateNotification(orderData) {
    if (!this.isSupported || this.permission !== 'granted') {
      return;
    }

    try {
      const title = '📝 Order Status Updated';
      const body = `Order ${orderData.orderNumber} is now ${orderData.newStatus || orderData.status}`;
      const icon = '/logo.png';

      const notification = new Notification(title, {
        body,
        icon,
        tag: `order_update_${orderData.orderId}`,
        requireInteraction: false,
        vibrate: [100, 50, 100],
        data: {
          orderId: orderData.orderId,
          orderNumber: orderData.orderNumber,
          type: 'order_update'
        }
      });

      // Play sound
      this.playSound('order_update');

      // Handle notification click
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        notification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      return notification;
    } catch (error) {
      console.error('Error showing order update notification:', error);
      return null;
    }
  }

  /**
   * Enable/disable notification sounds
   */
  setSoundEnabled(enabled) {
    this.soundEnabled = enabled;
    localStorage.setItem('notificationSoundEnabled', enabled ? 'true' : 'false');
  }

  /**
   * Get sound enabled status
   */
  isSoundEnabled() {
    const stored = localStorage.getItem('notificationSoundEnabled');
    return stored === null ? true : stored === 'true';
  }

  /**
   * Check if notifications are supported
   */
  isNotificationSupported() {
    return this.isSupported;
  }

  /**
   * Get current permission status
   */
  getPermissionStatus() {
    return this.permission;
  }
}

// Create singleton instance
const browserNotificationService = new BrowserNotificationService();

export default browserNotificationService;
