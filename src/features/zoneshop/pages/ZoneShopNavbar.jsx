import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaBars,
  FaBell,
  FaUser,
  FaSignOutAlt,
  FaCog,
  FaStore,
  FaTimes,
  FaShoppingCart,
  FaExclamationTriangle,
  FaCheckCircle,
  FaCircle
} from 'react-icons/fa';
import { logout, logoutUser, selectTheme, selectUser } from '../../../store/slices/uiSlice';
import ThemeToggle from '../../../components/common/ThemeToggle';
import { selectIsConnected } from '../../../store/slices/realtimeSlice';
import socketService from '../../../shared/realtime/socketService';
import browserNotificationService from '../../../shared/notifications/BrowserNotificationService';
import { safeToastInfo } from '../../../shared/utils/toastUtils';
import logger from '../../../services/LoggingService';
import logo from '../../../assets/logo.svg';

const ZoneShopNavbar = ({ sidebarOpen, setSidebarOpen, isMobile }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { zoneId, shopId } = useParams();
  const { user } = useSelector((state) => state.ui.auth);
  const isConnected = useSelector(selectIsConnected);
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const effectiveZoneId = zoneId || user?.zoneId;

  // Initialize browser notifications
  useEffect(() => {
    browserNotificationService.init().then((granted) => {
      if (!granted) logger.warn('Browser notifications not granted', {}, 'ZoneShopNavbar');
    });
  }, []);

  // Real-time notification handling
  useEffect(() => {
    if (!isConnected || !shopId) return;

    socketService.emit('join_room', { roomType: 'shop', roomId: shopId });

    const handleNewOrder = (orderData) => {
      logger.info('New order received via real-time', orderData, 'ZoneShopNavbar');
      
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

      setNotifications(prev => [notification, ...prev.slice(0, 19)]);
      setUnreadCount(prev => prev + 1);
      
      browserNotificationService.showNewOrderNotification(frozenOrderData);
      
      safeToastInfo(`New order from Table ${frozenOrderData.tableNumber}`, {
        autoClose: 5000,
        position: 'top-right'
      });
    };

    const handleOrderUpdate = (updateData) => {
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
    };

    const handleOrderStatusChanged = (statusData) => {
      const frozenStatusData = JSON.parse(JSON.stringify(statusData));
      const importantStatuses = ['confirmed', 'preparing', 'ready', 'completed'];
      
      if (!importantStatuses.includes(frozenStatusData.newStatus)) return;
      
      const notification = {
        id: `status_${frozenStatusData.orderId}_${Date.now()}`,
        type: 'status_change',
        title: 'Order Status Changed',
        message: `Order #${frozenStatusData.orderNumber} is now ${frozenStatusData.newStatus}`,
        orderData: frozenStatusData,
        timestamp: new Date(),
        read: false,
        priority: 'low'
      };

      setNotifications(prev => [notification, ...prev.slice(0, 19)]);
      setUnreadCount(prev => prev + 1);
    };

    const unsubscribeNewOrder = socketService.subscribe('new_order', handleNewOrder);
    const unsubscribeOrderUpdate = socketService.subscribe('order_update', handleOrderUpdate);
    const unsubscribeStatusChanged = socketService.subscribe('order_status_changed', handleOrderStatusChanged);

    return () => {
      unsubscribeNewOrder();
      unsubscribeOrderUpdate();
      unsubscribeStatusChanged();
    };
  }, [isConnected, shopId]);

  const markAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_order': return FaShoppingCart;
      case 'order_update': return FaExclamationTriangle;
      case 'status_change': return FaCheckCircle;
      default: return FaBell;
    }
  };

  const getNotificationColor = (priority, read) => {
    if (read) return 'bg-theme-bg-secondary border-b border-theme-border-primary opacity-70';
    switch (priority) {
      case 'high': return 'bg-status-error-light border-l-2 border-l-status-error border-b border-theme-border-primary';
      case 'medium': return 'bg-status-warning-light border-l-2 border-l-status-warning border-b border-theme-border-primary';
      case 'low': return 'bg-status-info-light border-l-2 border-l-status-info border-b border-theme-border-primary';
      default: return 'bg-theme-bg-tertiary border-b border-theme-border-primary';
    }
  };

  const getIconColor = (type, read) => {
    if (read) return 'text-theme-text-tertiary bg-theme-bg-tertiary';
    switch (type) {
      case 'new_order': return 'text-status-error bg-status-error-light';
      case 'order_update': return 'text-status-warning bg-status-warning-light';
      case 'status_change': return 'text-status-info bg-status-info-light';
      default: return 'text-theme-text-tertiary bg-theme-bg-tertiary';
    }
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diff = Math.floor((now - new Date(timestamp)) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      window.location.href = '/login';
    } catch (error) {
      dispatch(logout());
      window.location.href = '/login';
    }
  };

  const navigateTo = (path) => {
    const zoneIdToUse = effectiveZoneId || user?.zoneId || 'unknown';
    navigate(`/zone/${zoneIdToUse}/shop/${shopId}/${path}`);
    setShowProfile(false);
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 right-0 left-0 admin-navbar z-50 border-b border-theme-border-primary"
    >
      <div className="flex items-center justify-between px-3 sm:px-6 py-4">
        {/* Left Section */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-theme-text-primary hover:text-theme-accent-primary transition-colors p-2 rounded-lg hover:bg-theme-bg-hover"
          >
            <FaBars className="w-5 h-5" />
          </button>
        </div>

        {/* Center - Branding */}
        <div className="flex items-center font-cinzel font-semibold text-2xl text-accent ml-8">
          <img src={logo} alt='logo' className='h-10 w-10'/>
          <p className=''>TableServes</p>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Theme Toggle */}
          <ThemeToggle variant="icon-only" showLabel={false} />

          {/* Unified Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl transition-all duration-200 text-theme-text-secondary hover:bg-theme-bg-hover hover:text-accent"
              title="View notifications"
            >
              <FaBell className="w-5 h-5" />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 bg-status-error text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </motion.span>
              )}
            </button>

            {/* Notification Dropdown */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-full mt-2 w-80 sm:w-96 admin-card rounded-2xl shadow-xl border border-theme-border-primary z-50 flex flex-col max-h-[32rem] overflow-hidden"
                >
                  {/* Header */}
                  <div className="px-5 py-4 border-b border-theme-border-primary bg-theme-bg-secondary flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-theme-text-primary">Notifications</h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSoundEnabled(!soundEnabled)}
                          className={`p-1.5 rounded-md transition-colors ${soundEnabled ? 'text-accent bg-accent/10' : 'text-theme-text-tertiary hover:bg-theme-bg-hover'}`}
                          title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
                        >
                          <FaBell className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setShowNotifications(false)}
                          className="p-1.5 text-theme-text-tertiary hover:bg-theme-bg-hover hover:text-theme-text-primary rounded-md transition-colors"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    </div>
                    
                    {unreadCount > 0 && (
                      <div className="flex items-center gap-2 text-xs text-theme-text-tertiary">
                        <button 
                          onClick={() => navigate(`/zone/${effectiveZoneId}/shop/${shopId}/orders/live`)}
                          className="hover:text-accent transition-colors"
                        >
                          Go to Orders →
                        </button>
                        <div className="w-1 h-1 rounded-full bg-theme-border-primary"></div>
                        <button onClick={markAllAsRead} className="hover:text-accent transition-colors">
                          Mark all read
                        </button>
                        <div className="w-1 h-1 rounded-full bg-theme-border-primary"></div>
                        <button onClick={clearAllNotifications} className="hover:text-status-error transition-colors">
                          Clear all
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Notifications List */}
                  <div className="overflow-y-auto flex-1 bg-theme-bg-primary">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-12 h-12 bg-theme-bg-tertiary rounded-full flex items-center justify-center mb-3">
                          <FaBell className="text-xl text-theme-text-tertiary" />
                        </div>
                        <p className="text-theme-text-secondary font-medium">No notifications</p>
                        <p className="text-theme-text-tertiary text-sm mt-1">You're all caught up!</p>
                      </div>
                    ) : (
                      notifications.map((notification) => {
                        const Icon = getNotificationIcon(notification.type);
                        return (
                          <div
                            key={notification.id}
                            className={`p-4 cursor-pointer transition-all duration-200 hover:bg-theme-bg-hover ${getNotificationColor(notification.priority, notification.read)}`}
                            onClick={() => {
                              markAsRead(notification.id);
                              if (notification.type === 'new_order') {
                                navigate(`/zone/${effectiveZoneId}/shop/${shopId}/orders/live`);
                                setShowNotifications(false);
                              }
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${getIconColor(notification.type, notification.read)}`}>
                                <Icon className="text-sm" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <h4 className="font-semibold text-theme-text-primary text-sm">{notification.title}</h4>
                                  {!notification.read && (
                                    <FaCircle className="text-accent text-[6px] mt-1.5 shrink-0" />
                                  )}
                                </div>
                                <p className="text-theme-text-secondary text-xs leading-relaxed mb-1">
                                  {notification.message}
                                </p>
                                {notification.type === 'new_order' && notification.orderData && (
                                  <div className="mt-2 flex items-center gap-3 text-[11px] font-semibold text-theme-text-tertiary">
                                    <span className="bg-theme-bg-secondary px-2 py-0.5 rounded shadow-sm border border-theme-border-primary">
                                      #{notification.orderData.orderNumber || notification.orderData.orderId?.substring(0, 6)}
                                    </span>
                                    <span>Table {notification.orderData.tableNumber}</span>
                                  </div>
                                )}
                                <p className="text-theme-text-tertiary text-[11px] mt-2">
                                  {formatTimestamp(notification.timestamp)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center space-x-2 sm:space-x-3 text-white hover:text-accent transition-colors p-2 rounded-lg hover:bg-white/10"
            >
              {!isMobile && (
                <div className="text-right">
                  <p className="text-secondary text-xs font-raleway">
                    {user?.shopName || 'Zone Shop'}
                  </p>
                </div>
              )}
              <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                <FaStore className="w-4 h-4 text-white" />
              </div>
            </button>

            <AnimatePresence>
              {showProfile && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-64 bg-black/90 backdrop-blur-xl border border-accent/20 rounded-2xl shadow-2xl z-50"
                >
                  <div className="p-4 border-b border-white/10">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
                        <FaStore className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-semibold text-sm truncate">{user?.shopName || 'Zone Shop'}</p>
                        <p className="text-accent font-raleway text-xs mt-0.5">Shop Vendor</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => navigateTo('profile')}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors font-raleway"
                    >
                      <FaUser className="w-4 h-4" />
                      <span>Profile Settings</span>
                    </button>
                    <button
                      onClick={() => navigateTo('settings')}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors font-raleway"
                    >
                      <FaCog className="w-4 h-4" />
                      <span>Shop Settings</span>
                    </button>
                    <hr className="border-white/10 my-2" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors font-raleway"
                    >
                      <FaSignOutAlt className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default ZoneShopNavbar;
