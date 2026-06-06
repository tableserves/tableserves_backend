import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { FaBell, FaShoppingCart, FaTimes, FaEye, FaCheck, FaClock, FaCircle } from 'react-icons/fa';
import { selectIsConnected } from '../../../store/slices/realtimeSlice';
import { selectUser } from '../../../store/slices/uiSlice';
import socketService from '../../../services/socketService';
import { safeToastInfo } from '../../../shared/utils/toastUtils';
import logger from '../../../services/LoggingService';
import browserNotificationService from '../../../services/BrowserNotificationService';

/**
 * ZoneShopOrderNotifications - Real-time order notification system for zone shops
 * Displays incoming orders, status updates, and provides quick actions
 */
const ZoneShopOrderNotifications = ({ onOrderReceived, onOrderUpdate }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loopingSound, setLoopingSound] = useState(false);
  
  const isConnected = useSelector(selectIsConnected);
  const currentUser = useSelector(selectUser);
  const navigate = useNavigate();
  const { zoneId, shopId } = useParams();
  
  const soundIntervalRef = useRef(null);
  const audioContextRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopLoopingSound();
  }, []);

  // Stop alarm automatically when no unread new_order notifications remain
  useEffect(() => {
    if (!loopingSound) return;
    const hasUnreadNewOrders = notifications.some(n => n.type === 'new_order' && !n.read);
    if (!hasUnreadNewOrders) {
      if (soundIntervalRef.current) {
        clearInterval(soundIntervalRef.current);
        soundIntervalRef.current = null;
      }
      setLoopingSound(false);
    }
  }, [notifications, loopingSound]);

  // Initialize browser notifications on mount
  useEffect(() => {
    browserNotificationService.init().then((granted) => {
      if (!granted) {
        logger.warn('Browser notifications not granted', {}, 'ZoneShopOrderNotifications');
      }
    });
  }, []);

  // Set up real-time event listeners for zone shop orders
  useEffect(() => {
    if (!isConnected || !currentUser?.shopId) return;

    // Join the shop's room for order notifications
    socketService.emit('join_room', { roomType: 'shop', roomId: currentUser.shopId });

    const handleNewOrder = (orderData) => {
      logger.info('New order received via real-time', orderData, 'ZoneShopOrderNotifications');
      
      // Create a deep copy of the order data to prevent real-time updates from affecting it
      const frozenOrderData = JSON.parse(JSON.stringify(orderData));
      
      const notification = {
        id: `order_${frozenOrderData.orderId}_${Date.now()}`,
        type: 'new_order',
        title: 'New Order Received',
        message: `Table ${frozenOrderData.tableNumber} • ${frozenOrderData.items?.length || 0} items • ₹${frozenOrderData.total?.toFixed(2) || '0.00'}`,
        orderData: frozenOrderData,
        timestamp: new Date(),
        read: false,
        priority: 'high'
      };

      setNotifications(prev => [notification, ...prev.slice(0, 19)]); // Keep last 20
      setUnreadCount(prev => prev + 1);
      
      // Start looping sound for urgent new orders
      if (soundEnabled) {
        startLoopingSound('new_order');
      }
      
      // Show browser notification (works even on other tabs)
      browserNotificationService.showNewOrderNotification(frozenOrderData);
      
      // Show toast notification
      safeToastInfo(`New order from Table ${frozenOrderData.tableNumber}`, {
        autoClose: 5000,
        position: 'top-right'
      });
      
      // Callback to parent component
      if (onOrderReceived) {
        onOrderReceived(frozenOrderData);
      }
    };

    const handleOrderUpdate = (updateData) => {
      logger.info('Order update received via real-time', updateData, 'ZoneShopOrderNotifications');
      
      // Create a deep copy of the update data to prevent real-time updates from affecting it
      const frozenUpdateData = JSON.parse(JSON.stringify(updateData));
      
      const notification = {
        id: `update_${frozenUpdateData.orderId}_${Date.now()}`,
        type: 'order_update',
        title: 'Kitchen Update',
        message: `Order #${frozenUpdateData.orderNumber} - ${frozenUpdateData.newStatus}`,
        orderData: frozenUpdateData,
        timestamp: new Date(),
        read: false,
        priority: 'medium'
      };

      setNotifications(prev => [notification, ...prev.slice(0, 19)]);
      setUnreadCount(prev => prev + 1);
      
      // Callback to parent component
      if (onOrderUpdate) {
        onOrderUpdate(frozenUpdateData);
      }
    };

    const handleOrderStatusChanged = (statusData) => {
      logger.info('Order status changed via real-time', statusData, 'ZoneShopOrderNotifications');

      const frozenStatusData = JSON.parse(JSON.stringify(statusData));
      const importantStatuses = ['confirmed', 'preparing', 'ready', 'completed'];
      if (!importantStatuses.includes(frozenStatusData.newStatus)) return;

      // Auto-acknowledge the new_order notification when order is accepted/confirmed
      if (frozenStatusData.newStatus === 'confirmed') {
        setNotifications(prev =>
          prev.map(n =>
            (n.type === 'new_order' && n.orderData?.orderId === frozenStatusData.orderId)
              ? { ...n, read: true }
              : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        return;
      }

      const notification = {
        id: `status_${frozenStatusData.orderId}_${Date.now()}`,
        type: 'status_change',
        title: 'Status Changed',
        message: `Order #${frozenStatusData.orderNumber} is now ${frozenStatusData.newStatus}`,
        orderData: frozenStatusData,
        timestamp: new Date(),
        read: false,
        priority: 'low'
      };

      setNotifications(prev => [notification, ...prev.slice(0, 19)]);
      setUnreadCount(prev => prev + 1);
    };

    // Subscribe to real-time events
    const unsubscribeNewOrder = socketService.subscribe('new_order', handleNewOrder);
    const unsubscribeOrderUpdate = socketService.subscribe('shop_order_update', handleOrderUpdate);
    const unsubscribeOrderStatusChanged = socketService.subscribe('order_status_changed', handleOrderStatusChanged);
    const unsubscribeZoneOrderUpdate = socketService.subscribe('zone_order_update', handleOrderUpdate);

    logger.info('Zone shop order notifications initialized', {
      shopId: currentUser.shopId,
      isConnected
    }, 'ZoneShopOrderNotifications');

    // Cleanup function
    return () => {
      // Leave the shop's room when component unmounts
      socketService.emit('leave_room', { roomType: 'shop', roomId: currentUser.shopId });
      
      // Unsubscribe from events
      unsubscribeNewOrder();
      unsubscribeOrderUpdate();
      unsubscribeOrderStatusChanged();
      unsubscribeZoneOrderUpdate();
    };
  }, [isConnected, currentUser?.shopId, soundEnabled, onOrderReceived, onOrderUpdate]);

  // Play notification sounds
  const playNotificationSound = (type) => {
    try {
      // Create or reuse audio context for notification sounds
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      
      // Different tones for different notification types
      const frequencies = {
        new_order: [800, 1000, 1200], // Rising tone for new orders
        order_update: [600, 800], // Two-tone for updates
        status_change: [400] // Single tone for status changes
      };
      
      const freq = frequencies[type] || [600];
      
      freq.forEach((frequency, index) => {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
        }, index * 200);
      });
    } catch (error) {
      logger.warn('Could not play notification sound', error, 'ZoneShopOrderNotifications');
    }
  };

  // Start looping sound alarm for urgent orders
  const startLoopingSound = (type) => {
    stopLoopingSound(); // Clear any existing loop
    playNotificationSound(type);
    soundIntervalRef.current = setInterval(() => {
      playNotificationSound(type);
    }, 3000); // Repeat every 3 seconds
    setLoopingSound(true);
  };

  // Stop looping sound alarm
  const stopLoopingSound = () => {
    if (soundIntervalRef.current) {
      clearInterval(soundIntervalRef.current);
      soundIntervalRef.current = null;
      setLoopingSound(false);
    }
  };

  // Navigate to live orders page
  const navigateToLiveOrders = () => {
    const zId = zoneId || currentUser?.zoneId;
    const sId = shopId || currentUser?.shopId;
    if (zId && sId) {
      navigate(`/zone/${zId}/shop/${sId}/orders/live`);
      stopLoopingSound();
      setShowNotifications(false);
    }
  };

  // Mark notification as read
  const markAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    stopLoopingSound(); // Stop alarm when user acknowledges
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    setUnreadCount(0);
    stopLoopingSound(); // Stop alarm when all marked as read
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  // Get icon component for notification type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_order': return FaShoppingCart;
      case 'order_update': return FaEye;
      case 'status_change': return FaCheck;
      default: return FaBell;
    }
  };

  // Get background color based on priority and read status
  const getNotificationColor = (priority, read) => {
    if (read) return 'bg-white border-b border-slate-100 opacity-70';
    switch (priority) {
      case 'high': return 'bg-rose-50/50 border-l-2 border-l-[#EF665C] border-b border-slate-100';
      case 'medium': return 'bg-amber-50/50 border-l-2 border-l-amber-500 border-b border-slate-100';
      case 'low': return 'bg-blue-50/50 border-l-2 border-l-[#2337C6] border-b border-slate-100';
      default: return 'bg-slate-50 border-b border-slate-100';
    }
  };

  // Get icon color based on type and read status
  const getIconColor = (type, read) => {
    if (read) return 'text-slate-400 bg-slate-100';
    switch (type) {
      case 'new_order': return 'text-[#EF665C] bg-rose-100';
      case 'order_update': return 'text-amber-600 bg-amber-100';
      case 'status_change': return 'text-[#2337C6] bg-blue-100';
      default: return 'text-slate-500 bg-slate-100';
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell Icon with Alarm State */}
      <button
        onClick={() => {
          if (loopingSound && unreadCount > 0) {
            // If alarm is ringing, clicking goes directly to orders
            navigateToLiveOrders();
          } else {
            // Otherwise, toggle notification panel
            setShowNotifications(!showNotifications);
          }
        }}
        className={`relative p-2 rounded-xl transition-all duration-200 ${
          loopingSound 
            ? 'text-[#EF665C] bg-rose-50' 
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
        title={loopingSound ? 'Click to view urgent orders' : 'View alerts'}
        aria-label="Order notifications"
      >
        <FaBell className={`text-[20px] ${loopingSound ? 'animate-[wiggle_1s_ease-in-out_infinite]' : ''}`} />
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`absolute top-1.5 right-1.5 text-white text-[10px] rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center font-bold border-2 border-white ${
              loopingSound ? 'bg-[#EF665C] animate-pulse' : 'bg-[#EF665C]'
            }`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
        
        {/* Connection Status Indicator */}
        <div className={`absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border-2 border-white ${
          isConnected ? 'bg-emerald-500' : 'bg-rose-500'
        }`} />
      </button>

      {/* Notification Panel */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 z-50 flex flex-col max-h-[32rem] overflow-hidden"
          >
            {/* Panel Header */}
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Activity Center</h3>
                <div className="flex items-center gap-2">
                  {/* Mute Alarm Button (only shown when alarm is active) */}
                  {loopingSound && (
                    <button
                      onClick={stopLoopingSound}
                      className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 rounded-md hover:bg-rose-200 transition-colors"
                    >
                      Mute Alarm
                    </button>
                  )}
                  {/* Sound Toggle */}
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`p-1.5 rounded-md transition-colors ${
                      soundEnabled ? 'text-[#2337C6] bg-blue-50' : 'text-slate-400 hover:bg-slate-100'
                    }`}
                    title={soundEnabled ? 'Mute all sounds' : 'Enable sounds'}
                  >
                    {soundEnabled ? '🔊' : '🔇'}
                  </button>
                  {/* Close Button */}
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-md transition-colors"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
              
              {/* Quick Actions */}
              {notifications.length > 0 && (
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <button 
                    onClick={navigateToLiveOrders} 
                    className="text-[#2337C6] hover:text-blue-800 transition-colors"
                  >
                    Go to Queue →
                  </button>
                  <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                  <button 
                    onClick={markAllAsRead} 
                    className="text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    Mark read
                  </button>
                  <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                  <button 
                    onClick={clearAllNotifications} 
                    className="text-slate-500 hover:text-rose-600 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1 bg-white custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                    <FaBell className="text-xl text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-900">All caught up</p>
                  <p className="text-xs text-slate-500 mt-1">New activity will appear here</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {notifications.map((notification) => {
                    const IconComponent = getNotificationIcon(notification.type);
                    
                    return (
                      <div
                        key={notification.id}
                        className={`p-4 cursor-pointer transition-all duration-200 hover:bg-slate-50 ${getNotificationColor(notification.priority, notification.read)}`}
                        onClick={() => {
                          markAsRead(notification.id);
                          if (notification.type === 'new_order') {
                            navigateToLiveOrders();
                          }
                        }}
                      >
                        <div className="flex gap-4">
                          {/* Icon */}
                          <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getIconColor(notification.type, notification.read)}`}>
                            <IconComponent className="text-[14px]" />
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className={`text-sm font-bold truncate ${notification.read ? 'text-slate-600' : 'text-slate-900'}`}>
                                {notification.title}
                              </h4>
                              <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap pt-0.5">
                                {notification.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            
                            <p className={`text-xs leading-relaxed ${notification.read ? 'text-slate-500' : 'text-slate-700 font-medium'}`}>
                              {notification.message}
                            </p>
                            
                            {/* Order Details Badge (for new orders) */}
                            {notification.type === 'new_order' && notification.orderData && (
                              <div className="mt-2 flex items-center gap-3 text-[11px] font-semibold text-slate-500">
                                <span className="bg-white px-2 py-0.5 rounded shadow-sm border border-slate-100">
                                  #{notification.orderData.orderNumber || notification.orderData.orderId?.substring(0, 6)}
                                </span>
                                <span className="flex items-center text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                  <FaClock className="mr-1.5 text-[10px]" />
                                  {notification.orderData.estimatedTime || 15} min
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* Unread Indicator */}
                          {!notification.read && (
                            <div className="shrink-0 pt-2">
                              <FaCircle className="text-[#2337C6] text-[8px]" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ZoneShopOrderNotifications;