import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';
import {
  FaStar,
  FaComments,
  FaSearch,
  FaTimes,
  FaPhone,
  FaFilter,
  FaCircle,
  FaQuoteLeft,
  FaSyncAlt
} from 'react-icons/fa';
import ZoneShopLayout from './ZoneShopLayout';
import { ErrorBoundary } from '../../../shared/errors/ErrorBoundary';

// Enhanced Toast Utility Function
const showToast = (type, title, message, duration = 4000) => {
  if (typeof window === 'undefined') return;

  const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const colors = {
    success: {
      gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      shadowColor: 'rgba(16, 185, 129, 0.3)',
      icon: `<path d="M20 6L9 17L4 12" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`
    },
    warning: {
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      shadowColor: 'rgba(245, 158, 11, 0.3)',
      icon: `<path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
    },
    error: {
      gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      shadowColor: 'rgba(239, 68, 68, 0.3)',
      icon: `<path d="M18 6L6 18M6 6L18 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
    }
  };

  const config = colors[type] || colors.success;

  const toastContainer = document.createElement('div');
  toastContainer.innerHTML = `
    <div id="${toastId}" style="
      position: fixed;
      top: 24px;
      right: 24px;
      background: ${config.gradient};
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 10px 25px ${config.shadowColor}, 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-weight: 500;
      font-size: 14px;
      min-width: 320px;
      max-width: 450px;
      transform: translateX(500px);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      margin-bottom: 12px;
    ">
      <div style="
        display: flex;
        align-items: center;
        gap: 12px;
      ">
        <div style="
          width: 24px;
          height: 24px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            ${config.icon}
          </svg>
        </div>
        <div style="flex: 1;">
          <div style="
            font-weight: 600;
            margin-bottom: 2px;
            font-size: 14px;
          ">${title}</div>
          <div style="
            font-weight: 400;
            opacity: 0.9;
            font-size: 12px;
          ">${message}</div>
        </div>
        <button onclick="document.getElementById('${toastId}').style.transform='translateX(500px)'; document.getElementById('${toastId}').style.opacity='0'; setTimeout(() => this.parentElement.parentElement.parentElement.remove(), 400);" style="
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          opacity: 0.7;
          transition: opacity 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  const existingToasts = document.querySelectorAll('[id^="toast-"]');
  const topOffset = 24 + (existingToasts.length * 80);
  const toast = toastContainer.querySelector(`#${toastId}`);
  if (toast) {
    toast.style.top = `${topOffset}px`;
  }

  document.body.appendChild(toastContainer);

  setTimeout(() => {
    const toastElement = document.getElementById(toastId);
    if (toastElement) {
      toastElement.style.transform = 'translateX(0)';
    }
  }, 100);

  setTimeout(() => {
    const toastElement = document.getElementById(toastId);
    if (toastElement) {
      toastElement.style.transform = 'translateX(500px)';
      toastElement.style.opacity = '0';
      setTimeout(() => {
        if (toastContainer.parentNode) {
          toastContainer.parentNode.removeChild(toastContainer);
        }
      }, 400);
    }
  }, duration);
};

const ShopReviews = () => {
  const { zoneId, shopId } = useParams();
  const [feedbackData, setFeedbackData] = useState([]);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadFeedbackData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Use the zone feedback endpoint with shopId filter
      const response = await fetch(`/api/v1/orders/zones/${zoneId}/feedback?shopId=${shopId}&limit=500`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('tableserve_access_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch feedback: ${response.status}`);
      }

      const result = await response.json();
      const feedback = result.data?.feedback || [];
      
      const transformedFeedback = feedback.map(item => ({
        id: item.id || item._id,
        orderNumber: item.orderNumber,
        customerName: item.customerName || 'Guest',
        customerPhone: item.customerPhone,
        serviceRating: item.rating || 0,
        serviceFeedback: item.comment,
        tableNumber: item.tableNumber,
        submittedAt: item.submittedAt,
        orderDate: item.orderDate,
        isPublic: item.isPublic,
        reviewSource: item.reviewType || 'Shop Order',
        orderType: item.orderType,
        shopName: item.shopName
      }));
      
      setFeedbackData(transformedFeedback);
      if (transformedFeedback.length > 0) {
        showToast('success', 'Reviews Loaded', `${transformedFeedback.length} reviews loaded successfully`);
      }
    } catch (error) {
      console.error('Error loading shop feedback:', error);
      setError('Failed to load reviews. Please try again.');
      setFeedbackData([]);
      showToast('error', 'Load Failed', 'Failed to load reviews');
    } finally {
      setIsLoading(false);
    }
  }, [zoneId, shopId]);

  useEffect(() => {
    if (zoneId && shopId) {
      loadFeedbackData();
    }
  }, [loadFeedbackData, zoneId, shopId]);

  // Performance Optimization: Memoize filtering logic
  const filteredFeedback = useMemo(() => {
    return feedbackData.filter(feedback => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        (feedback.customerName?.toLowerCase() || '').includes(searchLower) ||
        (feedback.orderNumber?.toLowerCase() || '').includes(searchLower) ||
        (feedback.serviceFeedback?.toLowerCase() || '').includes(searchLower);
      
      const matchesRating = ratingFilter === 'all' || Math.round(feedback.serviceRating) === parseInt(ratingFilter);
      
      return matchesSearch && matchesRating;
    });
  }, [feedbackData, searchTerm, ratingFilter]);

  const totalReviews = filteredFeedback.length;
  const averageRating = useMemo(() => {
    if (totalReviews === 0) return 0;
    return (filteredFeedback.reduce((sum, f) => sum + f.serviceRating, 0) / totalReviews).toFixed(1);
  }, [filteredFeedback, totalReviews]);

  // UI Helpers
  const getInitials = (name) => name?.substring(0, 2).toUpperCase() || 'CU';

  const getRatingStyle = (rating) => {
    if (rating >= 4) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (rating === 3) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-rose-50 text-rose-700 border-rose-200';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <ZoneShopLayout>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-raleway text-gray-500">Loading reviews...</p>
        </div>
      </ZoneShopLayout>
    );
  }

  return (
    <ErrorBoundary>
      <ZoneShopLayout>
        <div className="p-4 sm:p-6 lg:p-8">
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-600 font-raleway">{error}</p>
            </div>
          )}

          {/* Header & KPI Summary */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-fredoka text-secondary mb-2">Customer Reviews</h1>
              <p className="text-secondary font-raleway text-sm sm:text-base">Monitor and analyze customer satisfaction</p>
            </div>
            
            <div className="flex gap-4 w-full md:w-auto">
              <div className="flex-1 md:flex-none bg-gray-50 border border-gray-200 px-4 py-3 rounded-lg flex flex-col items-center justify-center">
                <span className="text-xs font-semibold text-gray-500 uppercase">Total Reviews</span>
                <span className="text-xl font-bold text-gray-900">{totalReviews}</span>
              </div>
              <div className="flex-1 md:flex-none bg-blue-50 border border-blue-200 px-4 py-3 rounded-lg flex flex-col items-center justify-center">
                <span className="text-xs font-semibold text-blue-600 uppercase">Average</span>
                <div className="flex items-center gap-1.5 text-xl font-bold text-blue-600">
                  {averageRating} <FaStar className="text-amber-400 text-lg" />
                </div>
              </div>
              <button
                onClick={loadFeedbackData}
                className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-full font-raleway text-sm flex items-center gap-2 shadow-sm transition-colors font-semibold"
              >
                <FaSyncAlt className="w-3 h-3" /> Refresh
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by customer, order #, or keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <FaFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
                <select
                  value={ratingFilter}
                  onChange={(e) => setRatingFilter(e.target.value)}
                  className="pl-10 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-raleway text-sm cursor-pointer appearance-none"
                >
                  <option value="all">All Ratings</option>
                  <option value="5">5 Stars Only</option>
                  <option value="4">4 Stars Only</option>
                  <option value="3">3 Stars Only</option>
                  <option value="2">2 Stars Only</option>
                  <option value="1">1 Star Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Reviews Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
            {filteredFeedback.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <FaComments className="text-2xl text-gray-300" />
                </div>
                <p className="text-gray-700 font-fredoka text-lg mb-2">No reviews found</p>
                <p className="text-gray-500 font-raleway text-sm">
                  {searchTerm || ratingFilter !== 'all' ? 'Try adjusting your search filters.' : 'Reviews from completed orders will appear here.'}
                </p>
              </div>
            ) : (
              filteredFeedback.map((feedback) => (
                <motion.div
                  key={feedback.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -2 }}
                  onClick={() => {
                    setSelectedFeedback(feedback);
                    setShowFeedbackModal(true);
                  }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all cursor-pointer flex flex-col h-full overflow-hidden"
                >
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
                          {getInitials(feedback.customerName)}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800 text-sm">{feedback.customerName}</h3>
                          <p className="text-[11px] font-medium text-gray-500">{formatDate(feedback.submittedAt)}</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold border ${getRatingStyle(feedback.serviceRating)}`}>
                        {feedback.serviceRating}.0 <FaStar className="text-[10px]" />
                      </div>
                    </div>

                    <div className="flex-1">
                      {feedback.serviceFeedback ? (
                        <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                          "{feedback.serviceFeedback}"
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400 italic">No written feedback provided.</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs font-medium text-gray-500">
                    <div className="flex items-center gap-2">
                      <span className="bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-700">#{feedback.orderNumber}</span>
                      {feedback.tableNumber && <span>Table {feedback.tableNumber}</span>}
                    </div>
                    {feedback.reviewSource && <span className="text-blue-600">{feedback.reviewSource}</span>}
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Feedback Detail Modal */}
          <AnimatePresence>
            {showFeedbackModal && selectedFeedback && (
              <div
                className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                onClick={() => setShowFeedbackModal(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden border border-gray-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h2 className="font-fredoka text-lg text-gray-900">Review Details</h2>
                    <button
                      onClick={() => setShowFeedbackModal(false)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <FaTimes />
                    </button>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Rating Header inside Modal */}
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center border ${getRatingStyle(selectedFeedback.serviceRating)}`}>
                        <span className="text-xl font-bold">{selectedFeedback.serviceRating}.0</span>
                        <FaStar className="text-xs mt-0.5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-fredoka text-gray-900">{selectedFeedback.customerName}</h3>
                        <p className="text-sm text-gray-500 font-raleway">{formatDate(selectedFeedback.submittedAt)}</p>
                      </div>
                    </div>

                    {/* Feedback Quote */}
                    {selectedFeedback.serviceFeedback && (
                      <div className="relative bg-gray-50 rounded-xl p-5 border border-gray-200">
                        <FaQuoteLeft className="absolute top-4 left-4 text-gray-200 text-3xl" />
                        <p className="relative z-10 text-gray-800 leading-relaxed text-sm ml-6 font-raleway">
                          {selectedFeedback.serviceFeedback}
                        </p>
                      </div>
                    )}

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Order ID</p>
                        <p className="text-sm font-bold text-gray-900">#{selectedFeedback.orderNumber}</p>
                      </div>
                      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Table</p>
                        <p className="text-sm font-bold text-gray-900">{selectedFeedback.tableNumber || 'N/A'}</p>
                      </div>
                      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1.5"><FaPhone /> Phone</p>
                        <p className="text-sm font-bold text-gray-900">{selectedFeedback.customerPhone || 'Not provided'}</p>
                      </div>
                      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Order Date</p>
                        <p className="text-sm font-bold text-gray-900">{formatDate(selectedFeedback.orderDate)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <button
                      onClick={() => setShowFeedbackModal(false)}
                      className="w-full bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 py-2.5 rounded-lg font-raleway text-sm font-bold transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </ZoneShopLayout>
    </ErrorBoundary>
  );
};

export default ShopReviews;
