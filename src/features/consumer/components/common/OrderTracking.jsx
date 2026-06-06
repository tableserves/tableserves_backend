import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaClock,
  FaCheckCircle,
  FaUtensils,
  FaSync,
  FaExclamationTriangle,
  FaMapMarkerAlt,
  FaQrcode,
  FaDownload,
  FaStar,
  FaThumbsUp,
  FaCheck
} from 'react-icons/fa';
import OrderTrackingAPI from '../../../../services/OrderTrackingAPI';
import OrderTrackingService from '../../../../services/OrderTrackingService';
import RealTimeOrderTracker from '../../../../services/RealTimeOrderTracker';
import { logger } from '../../../../shared/logging/logger';
import CustomerReceipt from './CustomerReceipt';
import { downloadPdf } from '../../../../shared/utils/downloadUtils';
import { orderAPI } from '../../../../shared/api/api';

// App theme accent color
const PRIMARY_COLOR = '#FF6B00';

const OrderTracking = () => {
  const { orderNumber } = useParams();
  const [searchParams] = useSearchParams();
  const phone = searchParams.get('phone');
  const navigate = useNavigate();

  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [notifications, setNotifications] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [retryCount, setRetryCount] = useState(0);

  // Feedback State
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [tableServeRating, setTableServeRating] = useState(0);
  const [tableServeFeedback, setTableServeFeedback] = useState('');
  const [restaurantRating, setRestaurantRating] = useState(0);
  const [restaurantFeedback, setRestaurantFeedback] = useState('');
  const [foodRating, setFoodRating] = useState(0);
  const [foodFeedback, setFoodFeedback] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(() => {
    if (orderNumber && phone) return localStorage.getItem(`completion_review_submitted_${orderNumber}_${phone}`) === 'true';
    return false;
  });
  const [showThankYou, setShowThankYou] = useState(false);
  const [tableServeRatingSubmitted, setTableServeRatingSubmitted] = useState(() => {
    return localStorage.getItem(`tableserve_rating_submitted_${orderNumber}_${phone}`) === 'true';
  });
  const [modalPermanentlySkipped, setModalPermanentlySkipped] = useState(() => {
    if (orderNumber && phone) return localStorage.getItem(`completion_modal_skipped_${orderNumber}_${phone}`) === 'true';
    return false;
  });

  const trackerRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const realTimeSetupRef = useRef(false);
  const receiptRef = useRef(null);

  // Load saved reviews
  useEffect(() => {
    if (tableServeRatingSubmitted && orderNumber && phone) {
      const data = localStorage.getItem(`tableserve_submitted_review_${orderNumber}_${phone}`);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          setTableServeRating(parsed.rating || 0);
          setTableServeFeedback(parsed.feedback || '');
        } catch (e) {}
      }
    }
    if (feedbackSubmitted && orderNumber && phone) {
      const data = localStorage.getItem(`completion_review_data_${orderNumber}_${phone}`);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          setRestaurantRating(parsed.restaurantRating || 0);
          setRestaurantFeedback(parsed.restaurantFeedback || '');
          setFoodRating(parsed.foodRating || 0);
          setFoodFeedback(parsed.foodFeedback || '');
        } catch (e) {}
      }
    }
  }, [tableServeRatingSubmitted, feedbackSubmitted, orderNumber, phone]);

  const addNotification = useCallback((message) => {
    const notification = { id: Date.now(), message, timestamp: new Date() };
    setNotifications(prev => [...prev, notification]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== notification.id)), 5000);
  }, []);

  const showSuccessToast = useCallback((title, message) => {
    if (typeof window === 'undefined') return;
    const toastId = `toast-${Date.now()}`;
    const toastContainer = document.createElement('div');
    toastContainer.innerHTML = `
      <div id="${toastId}" style="
        position: fixed; top: 24px; left: 50%; transform: translate(-50%, -100px);
        background: #ffffff; color: #1e293b; padding: 16px 24px; border-radius: 99px;
        box-shadow: 0 10px 40px -10px rgba(0,0,0,0.15); font-family: 'Inter', sans-serif;
        z-index: 10000; transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        display: flex; align-items: center; gap: 12px; border: 1px solid rgba(0,0,0,0.05);
      ">
        <div style="background: #10B981; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17L4 12"/></svg>
        </div>
        <div>
          <div style="font-weight: 700; font-size: 14px;">${title}</div>
        </div>
      </div>
    `;
    document.body.appendChild(toastContainer);
    setTimeout(() => {
      const el = document.getElementById(toastId);
      if (el) el.style.transform = 'translate(-50%, 0)';
    }, 100);
    setTimeout(() => {
      const el = document.getElementById(toastId);
      if (el) {
        el.style.transform = 'translate(-50%, -100px)';
        el.style.opacity = '0';
        setTimeout(() => toastContainer.remove(), 500);
      }
    }, 4000);
  }, []);

  const handleGoHome = () => {
    try {
      // Extract restaurant/zone info from orderData
      const restaurantId = orderData?.restaurantId || orderData?.restaurant?._id;
      const zoneId = orderData?.zoneId || orderData?.zone?._id;
      const tableNumber = orderData?.tableNumber;
      
      if (!tableNumber) {
        addNotification('Unable to navigate - table information missing');
        return;
      }

      // Navigate to menu screen
      if (restaurantId) {
        // Restaurant menu
        navigate(`/restaurant/${restaurantId}/table/${tableNumber}/menu`);
      } else if (zoneId) {
        // Zone shops selection
        navigate(`/zone/${zoneId}/table/${tableNumber}/shops`);
      } else {
        addNotification('Unable to navigate - restaurant information missing');
      }
    } catch (e) {
      console.error('Navigation error:', e);
      addNotification('Unable to navigate to menu');
    }
  };

  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const handleDownloadReceipt = async () => {
    if (!orderData || !receiptRef.current) return;
    try {
      setDownloadingReceipt(true);
      const filename = `Receipt_${orderData.orderNumber}_${new Date().toISOString().slice(0, 10)}.pdf`;
      receiptRef.current.style.display = 'block';
      receiptRef.current.style.visibility = 'visible';
      await new Promise(r => setTimeout(r, 1000));
      const success = await downloadPdf(receiptRef.current, filename);
      if (success) showSuccessToast('Downloading', 'Receipt downloaded');
    } catch (error) {
      addNotification('Failed to download receipt');
    } finally {
      setDownloadingReceipt(false);
    }
  };

  const handleCombinedFeedbackSubmit = async () => {
    if (restaurantRating === 0 && foodRating === 0 && tableServeRating === 0) {
      return addNotification('Please provide at least one rating');
    }

    // Only include ratings the user actually gave — no artificial defaults
    const providedRatings = [foodRating, restaurantRating, tableServeRating].filter(r => r > 0);
    const avgRating = Math.round(providedRatings.reduce((a, b) => a + b, 0) / providedRatings.length);

    const commentParts = [];
    if (restaurantRating > 0 && restaurantFeedback) commentParts.push(`Venue: ${restaurantFeedback}`);
    if (foodRating > 0 && foodFeedback) commentParts.push(`Food: ${foodFeedback}`);
    if (tableServeRating > 0 && tableServeFeedback) commentParts.push(`App: ${tableServeFeedback}`);

    const payload = {
      phone,
      rating: avgRating,
      ...(foodRating > 0 && { foodRating }),
      ...(restaurantRating > 0 && { venueRating: restaurantRating }),
      ...(tableServeRating > 0 && { platformRating: tableServeRating }),
      comment: commentParts.join(' | '),
      isPublic: true
    };

    try {
      setSubmittingFeedback(true);

      await orderAPI.addFeedback(orderData.orderNumber, payload);

      // Update local order state so feedback appears immediately without reload
      setOrderData(prev => prev ? {
        ...prev,
        canProvideFeedback: false,
        feedback: {
          rating: avgRating,
          foodRating: foodRating > 0 ? foodRating : null,
          venueRating: restaurantRating > 0 ? restaurantRating : null,
          platformRating: tableServeRating > 0 ? tableServeRating : null,
          comment: payload.comment,
          submittedAt: new Date().toISOString()
        }
      } : prev);

      setFeedbackSubmitted(true);
      setTableServeRatingSubmitted(true);

      localStorage.setItem(`completion_review_submitted_${orderNumber}_${phone}`, 'true');
      localStorage.setItem(`tableserve_rating_submitted_${orderNumber}_${phone}`, 'true');
      localStorage.setItem(`completion_review_data_${orderNumber}_${phone}`, JSON.stringify({
        restaurantRating, restaurantFeedback, foodRating, foodFeedback, tableServeRating, tableServeFeedback
      }));

      setShowThankYou(true);
      
      // Close modal after 2 seconds and show success toast
      setTimeout(() => {
        setShowCompletionModal(false);
        showSuccessToast('Thank You!');
      }, 2000);

    } catch (error) {
      addNotification(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to submit feedback. You may have already submitted it.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handlePermanentSkip = () => {
    if (orderNumber && phone) {
      localStorage.setItem(`completion_modal_skipped_${orderNumber}_${phone}`, 'true');
      setModalPermanentlySkipped(true);
    }
    setShowCompletionModal(false);
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  useEffect(() => {
    if (orderData?.status === 'completed' && !showCompletionModal && !modalPermanentlySkipped) {
      if ((!tableServeRatingSubmitted || !feedbackSubmitted) && !modalPermanentlySkipped) {
        setTimeout(() => setShowCompletionModal(true), 2500);
      }
    }
  }, [orderData?.status, showCompletionModal, tableServeRatingSubmitted, feedbackSubmitted, modalPermanentlySkipped]);

  const startRealTimeTracking = useCallback(async (order) => {
    try {
      console.log('🚀 Starting real-time tracking for order:', order.orderNumber);
      await RealTimeOrderTracker.initialize();
      const tracker = await RealTimeOrderTracker.trackOrder(order.orderNumber, {
        orderId: order._id, 
        orderNumber: order.orderNumber, 
        customerPhone: phone,
        onStatusUpdate: (updatedOrder) => {
          console.log('🔄 Real-time status update received in OrderTracking:', {
            updatedOrder,
            newStatus: updatedOrder.status || updatedOrder.newStatus
          });
          
          const newStatus = updatedOrder.status || updatedOrder.newStatus;
          
          setOrderData(prev => {
            if (!prev) {
              console.log('⚠️ No previous order data, initializing with update');
              return {
                ...order,
                ...updatedOrder,
                status: newStatus,
                updatedAt: new Date().toISOString()
              };
            }
            
            const oldStatus = prev.status;
            console.log('📝 Updating order data:', { oldStatus, newStatus });
            
            // Always update, don't skip even if status is same (other fields might change)
            const updated = { 
              ...prev, 
              status: newStatus, 
              previousStatus: oldStatus, 
              updatedAt: new Date().toISOString(),
              ...(updatedOrder.estimatedTime && { estimatedTime: updatedOrder.estimatedTime }),
              ...(updatedOrder.items && { items: updatedOrder.items }),
              ...(updatedOrder.pricing && { pricing: updatedOrder.pricing })
            };
            
            console.log('✅ Order data updated successfully:', updated);
            
            return updated;
          });
          
          setLastUpdate(new Date());
        },
        onError: (error) => {
          console.error('❌ Real-time tracking error:', error);
          setConnectionStatus('error');
        }
      });
      setConnectionStatus('connected');
      trackerRef.current = tracker;
      console.log('✅ Real-time tracking started successfully for order:', order.orderNumber);
    } catch (error) { 
      console.error('❌ Failed to start real-time tracking:', error);
      setConnectionStatus('error'); 
    }
  }, [phone]);

  const fetchOrderData = useCallback(async () => {
    if (!orderNumber || !phone) return setLoading(false);
    try {
      setLoading(true); setError(null);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const fetchedData = await OrderTrackingAPI.fetchOrderByNumber(orderNumber, phone);
      clearTimeout(timeoutId);
      if (!fetchedData?.orderNumber) throw new Error('Incomplete data');
      setOrderData(fetchedData);
      setLastUpdate(new Date());
      setRetryCount(0);
      await startRealTimeTracking(fetchedData);
    } catch (error) {
      setError('Failed to load order. Check connection.');
      setRetryCount(prev => {
        if (prev < 3) {
          retryTimeoutRef.current = setTimeout(() => fetchOrderData(), 3000);
        }
        return prev + 1;
      });
    } finally { setLoading(false); }
  }, [orderNumber, phone, startRealTimeTracking]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount only
      if (trackerRef.current && orderNumber) {
        console.log('Stopping real-time tracking for order:', orderNumber);
        RealTimeOrderTracker.stopOrderTracking(orderNumber);
      }
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [orderNumber]); // Only depend on orderNumber, not orderData

  useEffect(() => {
    if (orderNumber && phone) {
      console.log('Fetching order data for:', orderNumber);
      fetchOrderData();
    } else if (OrderTrackingService.hasValidOrderInfo()) {
      fetchOrderData();
    } else { 
      setError('Order details missing'); 
      setLoading(false); 
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber, phone]); // Only run when orderNumber or phone changes, not when fetchOrderData changes

  const getStatusLabel = (status) => {
    const statusMap = { 'pending': 'Order Received', 'confirmed': 'Preparing Food', 'ready': 'Ready to Serve', 'completed': 'Completed', 'cancelled': 'Cancelled' };
    return statusMap[status] || status;
  };

  const getStatusMessage = (status) => {
    // Show special message after feedback submission
    if (status === 'completed' && feedbackSubmitted) {
      return "Thank you for your feedback! We hope to serve you again soon.";
    }
    
    const msgMap = {
      'pending': "We're reviewing your order.",
      'confirmed': "The chef is working their magic.",
      'ready': "Your food is ready!",
      'completed': "Hope you enjoyed your meal.",
      'cancelled': "This order was cancelled."
    };
    return msgMap[status] || "Status updated";
  }

  const formatTimeRemaining = () => {
    if (!orderData?.createdAt) return '--';
    const estimatedMinutes = orderData?.estimatedTime || 25;
    const estimatedCompletion = new Date(new Date(orderData.createdAt).getTime() + estimatedMinutes * 60000);
    const remaining = estimatedCompletion - new Date();
    if (remaining <= 0) return 'Any moment now';
    return `${Math.ceil(remaining / 60000)} min`;
  };

  const statusFlow = ['pending', 'confirmed', 'ready', 'completed'];
  const currentStatusIndex = orderData?.status === 'preparing' ? 1 : statusFlow.indexOf(orderData?.status);
  const isCancelled = orderData?.status === 'cancelled';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7F9] flex flex-col items-center justify-center font-sans">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-accent rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="mt-6 font-bold text-slate-800 tracking-tight text-lg">Locating your order...</p>
      </div>
    );
  }

  if (error && !orderData) {
    return (
      <div className="min-h-screen bg-[#F4F7F9] flex items-center justify-center p-6 font-sans">
        <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 text-center shadow-xl shadow-slate-200/50">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <FaExclamationTriangle className="text-2xl" />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Order Not Found</h2>
          <p className="text-sm text-slate-500 mb-8 font-medium leading-relaxed">{error}</p>
          <button onClick={fetchOrderData} className="w-full py-4 bg-accent text-white rounded-2xl font-bold shadow-lg shadow-orange-600/30 active:scale-95 transition-transform">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-4">
      
      {/* Header with Dynamic Color and Download Button */}
      <div className={`fixed top-0 left-0 right-0 z-40 shadow-sm transition-colors duration-500 ${
        orderData?.status === 'completed' && feedbackSubmitted ? 'bg-green-500' : 'bg-accent'
      }`}>
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-white/80">Order #{orderData?.orderNumber || '...'}</span>
              <span className="font-bold text-lg text-white">{orderData?.restaurantName || 'Restaurant'}</span>
            </div>
            
            {/* Download Receipt Button in Header - Always visible */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDownloadReceipt}
              disabled={downloadingReceipt}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl flex items-center gap-2 text-white font-semibold text-sm transition-colors backdrop-blur-sm"
            >
              {downloadingReceipt ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <FaDownload className="text-sm" />
                  <span>Receipt</span>
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-24 space-y-4">
        
        {/* Status Card with Badge */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          {isCancelled ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-full font-bold text-sm mb-3">
                <FaExclamationTriangle />
                <span>Cancelled</span>
              </div>
              <p className="text-slate-500 text-sm">This order was cancelled.</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <motion.div
                  key={`${orderData?.status}-${feedbackSubmitted}`}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm ${
                    orderData?.status === 'pending' ? 'bg-blue-50 text-blue-600' :
                    orderData?.status === 'confirmed' || orderData?.status === 'preparing' ? 'bg-orange-50 text-orange-600' :
                    orderData?.status === 'ready' ? 'bg-green-50 text-green-600' :
                    orderData?.status === 'completed' && feedbackSubmitted ? 'bg-green-50 text-green-600' :
                    orderData?.status === 'completed' ? 'bg-slate-100 text-slate-600' :
                    'bg-slate-50 text-slate-600'
                  }`}
                >
                  {(orderData?.status === 'confirmed' || orderData?.status === 'preparing') && <FaUtensils />}
                  {orderData?.status === 'ready' && <FaCheckCircle />}
                  {orderData?.status === 'completed' && feedbackSubmitted && <FaCheckCircle />}
                  {orderData?.status === 'completed' && !feedbackSubmitted && <FaCheck />}
                  <span>{getStatusLabel(orderData?.status)}</span>
                </motion.div>
              </div>
              
              <motion.p 
                key={orderData?.status}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="text-slate-600 text-sm"
              >
                {getStatusMessage(orderData?.status)}
              </motion.p>
            </div>
          )}
        </div>

        {/* Receipt Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Table Number</p>
              <h3 className="text-lg font-bold text-slate-900">Table {orderData?.tableNumber || 'N/A'}</h3>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 mb-1">Order Time</p>
              <span className="text-sm font-bold text-slate-700">
                {new Date(orderData?.createdAt || Date.now()).toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </span>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            {orderData?.items?.map((item, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600 flex-shrink-0">
                  {item.quantity || 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm">{item.name}</p>
                  {item.specialInstructions && <p className="text-xs text-slate-400 mt-0.5">{item.specialInstructions}</p>}
                </div>
                <div className="font-bold text-slate-900 text-sm">
                  ₹{item.subtotal ? item.subtotal.toFixed(2) : ((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 rounded-xl p-4 space-y-2 border border-slate-100">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span className="font-semibold">₹{orderData?.pricing?.subtotal ? orderData.pricing.subtotal.toFixed(2) : '0.00'}</span>
            </div>
            {orderData?.pricing?.tax > 0 && (
              <div className="flex justify-between text-sm text-slate-600">
                <span>Tax</span>
                <span className="font-semibold">₹{orderData.pricing.tax.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="text-sm font-bold text-slate-700">Total</span>
              <span className="text-xl font-bold text-accent">
                ₹{orderData?.pricing?.total ? orderData.pricing.total.toFixed(2) : '0.00'}
              </span>
            </div>
          </div>
        </div>

        {/* ─── Your Review ─── */}
        {feedbackSubmitted && (orderData?.feedback?.rating || foodRating > 0 || restaurantRating > 0 || tableServeRating > 0) && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <FaStar className="text-yellow-400 text-lg" />
              <h3 className="font-bold text-slate-900 text-base">Your Review</h3>
            </div>

            {/* Overall stars */}
            <div className="flex items-center gap-1 mb-4">
              {[1, 2, 3, 4, 5].map(star => (
                <FaStar
                  key={star}
                  className={`text-xl ${star <= (orderData?.feedback?.rating || Math.round((foodRating + restaurantRating + tableServeRating) / 3)) ? 'text-yellow-400' : 'text-slate-200'}`}
                />
              ))}
              <span className="ml-2 text-sm font-bold text-slate-700">
                {orderData?.feedback?.rating || Math.round((foodRating + restaurantRating + tableServeRating) / 3)}/5
              </span>
            </div>

            {/* Per-category breakdown */}
            {(foodRating > 0 || restaurantRating > 0 || tableServeRating > 0 || orderData?.feedback?.foodRating || orderData?.feedback?.venueRating || orderData?.feedback?.platformRating) && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {(foodRating > 0 || orderData?.feedback?.foodRating) && (
                  <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Food</p>
                    <div className="flex justify-center gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <FaStar key={s} className={`text-sm ${s <= (orderData?.feedback?.foodRating || foodRating) ? 'text-yellow-400' : 'text-slate-200'}`} />
                      ))}
                    </div>
                  </div>
                )}
                {(restaurantRating > 0 || orderData?.feedback?.venueRating) && (
                  <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Venue</p>
                    <div className="flex justify-center gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <FaStar key={s} className={`text-sm ${s <= (orderData?.feedback?.venueRating || restaurantRating) ? 'text-yellow-400' : 'text-slate-200'}`} />
                      ))}
                    </div>
                  </div>
                )}
                {(tableServeRating > 0 || orderData?.feedback?.platformRating) && (
                  <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">App</p>
                    <div className="flex justify-center gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <FaStar key={s} className={`text-sm ${s <= (orderData?.feedback?.platformRating || tableServeRating) ? 'text-accent' : 'text-slate-200'}`} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Comment */}
            {(orderData?.feedback?.comment || foodFeedback || restaurantFeedback || tableServeFeedback) && (
              <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-100 leading-relaxed">
                "{orderData?.feedback?.comment || [
                  restaurantFeedback && `Venue: ${restaurantFeedback}`,
                  foodFeedback && `Food: ${foodFeedback}`,
                  tableServeFeedback && `App: ${tableServeFeedback}`
                ].filter(Boolean).join(' | ')}"
              </p>
            )}

            {/* Timestamp */}
            {orderData?.feedback?.submittedAt && (
              <p className="text-xs text-slate-400 mt-3">
                Submitted {new Date(orderData.feedback.submittedAt).toLocaleString('en-US', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true
                })}
              </p>
            )}
          </motion.div>
        )}

      </div>

      {/* No bottom action buttons - Download is in header */}

      {/* Feedback Modal - Optimized */}
      <AnimatePresence>
        {showCompletionModal && !modalPermanentlySkipped && (!tableServeRatingSubmitted || !feedbackSubmitted) && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCompletionModal(false)}
              className="fixed inset-0 bg-black/40 z-50"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 shadow-2xl max-h-[85vh] overflow-y-auto"
            >
              {showThankYou ? (
                <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
                  <motion.div 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    transition={{ type: "spring", damping: 12, stiffness: 100 }}
                    className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-2"
                  >
                    <FaCheckCircle className="text-5xl text-green-500" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-green-600">Thank You!</h2>
                  <p className="text-slate-600 text-sm font-medium">Your feedback helps us improve and serve you better.</p>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-xs text-slate-400 mt-2"
                  >
                    Closing automatically...
                  </motion.div>
                </div>
              ) : (
                <>
                  <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 rounded-t-3xl">
                    <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-3" />
                    <h2 className="text-xl font-bold text-slate-900">Rate Your Experience</h2>
                    <p className="text-sm text-slate-500 mt-1">Help us improve our service</p>
                  </div>

                  <div className="px-6 py-6 space-y-6">
                    {!feedbackSubmitted && (
                      <>
                        {/* Food Rating */}
                        <div className="space-y-3">
                          <h3 className="font-semibold text-slate-700 text-sm">How was the food?</h3>
                          <div className="flex justify-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button key={star} onClick={() => setFoodRating(star)} className="transition-transform active:scale-90">
                                <FaStar className={`text-3xl ${star <= foodRating ? 'text-yellow-400' : 'text-slate-200'}`} />
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={foodFeedback}
                            onChange={(e) => setFoodFeedback(e.target.value)}
                            placeholder="Tell us more about the food (optional)"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                            rows="2"
                          />
                        </div>

                        {/* Venue Rating */}
                        <div className="space-y-3">
                          <h3 className="font-semibold text-slate-700 text-sm">How was the venue/service?</h3>
                          <div className="flex justify-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button key={star} onClick={() => setRestaurantRating(star)} className="transition-transform active:scale-90">
                                <FaStar className={`text-3xl ${star <= restaurantRating ? 'text-yellow-400' : 'text-slate-200'}`} />
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={restaurantFeedback}
                            onChange={(e) => setRestaurantFeedback(e.target.value)}
                            placeholder="Tell us about your service experience (optional)"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                            rows="2"
                          />
                        </div>
                      </>
                    )}

                    {!tableServeRatingSubmitted && (
                      <div className="space-y-3 pt-4 border-t border-slate-100">
                        <h3 className="font-semibold text-slate-700 text-sm">How was the App experience?</h3>
                        <div className="flex justify-center gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button key={star} onClick={() => setTableServeRating(star)} className="transition-transform active:scale-90">
                              <FaStar className={`text-3xl ${star <= tableServeRating ? 'text-accent' : 'text-slate-200'}`} />
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={tableServeFeedback}
                          onChange={(e) => setTableServeFeedback(e.target.value)}
                          placeholder="Share your thoughts about the app (optional)"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                          rows="2"
                        />
                      </div>
                    )}
                  </div>

                  <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 flex gap-3">
                    <button 
                      onClick={handlePermanentSkip} 
                      className="px-6 py-3 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      Skip
                    </button>
                    <button
                      onClick={handleCombinedFeedbackSubmit}
                      disabled={submittingFeedback}
                      className="flex-1 bg-accent text-white py-3 rounded-xl font-bold shadow-lg shadow-orange-600/20 disabled:opacity-50 transition-all"
                    >
                      {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="fixed -top-[9999px] left-0 w-full bg-white z-[-1]" style={{ visibility: downloadingReceipt ? 'visible' : 'hidden' }}>
        <CustomerReceipt
          ref={receiptRef}
          orderDetails={{
            restaurant: orderData?.restaurant, restaurantId: orderData?.restaurantId,
            restaurantName: orderData?.restaurant?.name || orderData?.restaurantName,
            orderId: orderData?.orderNumber || 'N/A',
            date: orderData?.createdAt ? new Date(orderData.createdAt).toLocaleString() : new Date().toLocaleString(),
            tableNumber: orderData?.tableNumber || 'N/A',
            items: orderData?.items?.map(item => ({
              name: item.name || 'Unknown', quantity: Number(item.quantity) || 1, price: Number(item.price) || 0
            })) || [],
            paymentMethod: orderData?.paymentMethod || 'Digital Payment',
            subtotal: Number(orderData?.pricing?.subtotal || 0), taxes: Number(orderData?.pricing?.tax || 0), total: Number(orderData?.pricing?.total || 0),
            customerName: orderData?.customer?.name || 'Customer'
          }}
        />
      </div>
    </div>
  );
};

export default OrderTracking;