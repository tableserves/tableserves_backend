import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';
import {
  FaStar,
  FaComments,
  FaSearch,
  FaTimes,
  FaPhone,
  FaClipboardList,
  FaFilter,
  FaCircle,
  FaQuoteLeft
} from 'react-icons/fa';
import SingleRestaurantLayout from '../components/SingleRestaurantLayout';
import RealTimeService from '../../../services/RealTimeService';

const RestaurantReviews = () => {
  const { restaurantId } = useParams();
  const [feedbackData, setFeedbackData] = useState([]);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [realTimeConnected, setRealTimeConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const realTimeServiceRef = useRef(null);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  // Stable callback for real-time updates to prevent memory leaks in useEffect
  const handleRealTimeFeedbackUpdate = useCallback((updatedFeedback) => {
    setFeedbackData(prevData => {
      const existingIndex = prevData.findIndex(f => f.id === updatedFeedback.id);
      if (existingIndex >= 0) {
        const newData = [...prevData];
        newData[existingIndex] = updatedFeedback;
        return newData;
      }
      return [updatedFeedback, ...prevData];
    });
  }, []);

  const loadFeedbackData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/orders/restaurants/${restaurantId}/feedback`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('tableserve_access_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error(`Failed to fetch feedback: ${response.status}`);

      const result = await response.json();
      const feedback = result.data?.feedback || [];
      
      const transformedFeedback = feedback.map(item => ({
        id: item.id,
        orderNumber: item.orderNumber,
        customerName: item.customerName || 'Guest',
        customerPhone: item.customerPhone,
        serviceRating: item.rating || 0,
        serviceFeedback: item.comment,
        tableNumber: item.tableNumber,
        submittedAt: item.submittedAt,
        orderDate: item.orderDate,
        isPublic: item.isPublic,
        reviewSource: item.reviewSource,
        orderType: item.orderType,
        zoneName: item.zoneName,
        shopName: item.shopName
      }));
      
      setFeedbackData(transformedFeedback);
    } catch (error) {
      console.error('Error loading shop feedback:', error);
      setFeedbackData([]);
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL, restaurantId]);

  useEffect(() => {
    loadFeedbackData();
  }, [loadFeedbackData]);

  // Initialize real-time service
  useEffect(() => {
    const initRealTime = async () => {
      try {
        realTimeServiceRef.current = RealTimeService;
        const token = localStorage.getItem('tableserve_access_token');
        await realTimeServiceRef.current.connect(token);
        setRealTimeConnected(true);
        realTimeServiceRef.current.subscribeToUpdates(
          `restaurant_${restaurantId}_feedback`,
          handleRealTimeFeedbackUpdate
        );
      } catch (error) {
        setRealTimeConnected(false);
      }
    };
    
    initRealTime();
    
    return () => {
      if (realTimeServiceRef.current) {
        realTimeServiceRef.current.unsubscribeFromUpdates(
          `restaurant_${restaurantId}_feedback`,
          handleRealTimeFeedbackUpdate
        );
      }
    };
  }, [restaurantId, handleRealTimeFeedbackUpdate]);

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

  return (
    <SingleRestaurantLayout>
      <div className="w-full h-full flex flex-col space-y-6 pb-12">
        
        {/* Header & KPI Summary */}
        <div className="bg-theme-bg-secondary p-6 rounded-xl border border-theme-border-primary shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-theme-text-primary tracking-tight">Customer Reviews</h1>
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${realTimeConnected ? 'bg-status-success-light text-status-success border-status-success/20' : 'bg-theme-bg-tertiary text-theme-text-tertiary border-theme-border-primary'}`}>
                <FaCircle className={`text-[8px] ${realTimeConnected ? 'animate-pulse' : ''}`} />
                {realTimeConnected ? 'Live Sync' : 'Offline'}
              </div>
            </div>
            <p className="text-sm text-theme-text-secondary">Monitor and analyze customer satisfaction.</p>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <div className="flex-1 md:flex-none bg-theme-bg-tertiary border border-theme-border-primary px-4 py-3 rounded-lg flex flex-col items-center justify-center">
              <span className="text-xs font-semibold text-theme-text-tertiary uppercase">Total Reviews</span>
              <span className="text-xl font-bold text-theme-text-primary">{totalReviews}</span>
            </div>
            <div className="flex-1 md:flex-none bg-accent/10 border border-accent/20 px-4 py-3 rounded-lg flex flex-col items-center justify-center">
              <span className="text-xs font-semibold text-accent uppercase">Average</span>
              <div className="flex items-center gap-1.5 text-xl font-bold text-accent">
                {averageRating} <FaStar className="text-amber-400 text-lg" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-theme-bg-secondary rounded-xl p-2 border border-theme-border-primary shadow-sm flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-text-tertiary" />
            <input
              type="text"
              placeholder="Search by customer, order #, or keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-transparent border-none focus:ring-0 text-sm text-theme-text-primary placeholder:text-theme-text-tertiary"
            />
          </div>
          <div className="w-px bg-theme-border-primary hidden sm:block my-2"></div>
          <div className="relative w-full sm:w-48 shrink-0 border-t border-theme-border-secondary sm:border-none">
            <FaFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-text-tertiary text-sm" />
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="w-full pl-11 pr-8 py-2.5 bg-transparent border-none focus:ring-0 text-sm font-medium text-theme-text-primary cursor-pointer appearance-none"
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

        {/* Reviews Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredFeedback.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-16 bg-theme-bg-secondary rounded-xl border border-theme-border-primary border-dashed">
                <div className="w-16 h-16 bg-theme-bg-tertiary rounded-full flex items-center justify-center mb-4">
                  <FaComments className="text-2xl text-theme-text-tertiary" />
                </div>
                <p className="text-theme-text-primary font-medium text-lg">No reviews found</p>
                <p className="text-theme-text-secondary text-sm mt-1">
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
                  className="bg-theme-bg-secondary rounded-xl border border-theme-border-primary shadow-sm hover:shadow-md hover:border-accent/30 transition-all cursor-pointer flex flex-col h-full overflow-hidden"
                >
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-theme-bg-tertiary border border-theme-border-primary flex items-center justify-center text-theme-text-secondary font-bold text-sm shrink-0">
                          {getInitials(feedback.customerName)}
                        </div>
                        <div>
                          <h3 className="font-bold text-theme-text-primary text-sm">{feedback.customerName}</h3>
                          <p className="text-[11px] font-medium text-theme-text-tertiary">{formatDate(feedback.submittedAt)}</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold border ${getRatingStyle(feedback.serviceRating)}`}>
                        {feedback.serviceRating}.0 <FaStar className="text-[10px]" />
                      </div>
                    </div>

                    <div className="flex-1">
                      {feedback.serviceFeedback ? (
                        <p className="text-sm text-theme-text-secondary leading-relaxed line-clamp-3">
                          "{feedback.serviceFeedback}"
                        </p>
                      ) : (
                        <p className="text-sm text-theme-text-tertiary italic">No written feedback provided.</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-theme-bg-tertiary px-5 py-3 border-t border-theme-border-primary flex items-center justify-between text-xs font-medium text-theme-text-tertiary">
                    <div className="flex items-center gap-2">
                      <span className="bg-theme-bg-secondary px-2 py-0.5 rounded border border-theme-border-primary text-theme-text-primary">#{feedback.orderNumber}</span>
                      {feedback.tableNumber && <span>Table {feedback.tableNumber}</span>}
                    </div>
                    {feedback.reviewSource && <span className="text-accent">{feedback.reviewSource}</span>}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Feedback Detail Modal */}
        <AnimatePresence>
          {showFeedbackModal && selectedFeedback && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowFeedbackModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-theme-bg-secondary rounded-2xl shadow-xl w-full max-w-xl overflow-hidden border border-theme-border-primary"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border-primary bg-theme-bg-tertiary">
                  <h2 className="font-bold text-theme-text-primary">Review Details</h2>
                  <button
                    onClick={() => setShowFeedbackModal(false)}
                    className="p-2 text-theme-text-tertiary hover:text-theme-text-primary hover:bg-theme-bg-hover rounded-lg transition-colors"
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
                      <h3 className="text-lg font-bold text-theme-text-primary">{selectedFeedback.customerName}</h3>
                      <p className="text-sm text-theme-text-secondary">{formatDate(selectedFeedback.submittedAt)}</p>
                    </div>
                  </div>

                  {/* Feedback Quote */}
                  {selectedFeedback.serviceFeedback && (
                    <div className="relative bg-theme-bg-tertiary rounded-xl p-5 border border-theme-border-primary">
                      <FaQuoteLeft className="absolute top-4 left-4 text-theme-border-secondary text-3xl" />
                      <p className="relative z-10 text-theme-text-primary leading-relaxed text-sm ml-6">
                        {selectedFeedback.serviceFeedback}
                      </p>
                    </div>
                  )}

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="border border-theme-border-primary rounded-xl p-4 bg-theme-bg-tertiary">
                      <p className="text-xs font-semibold text-theme-text-tertiary uppercase mb-1">Order ID</p>
                      <p className="text-sm font-bold text-theme-text-primary">#{selectedFeedback.orderNumber}</p>
                    </div>
                    <div className="border border-theme-border-primary rounded-xl p-4 bg-theme-bg-tertiary">
                      <p className="text-xs font-semibold text-theme-text-tertiary uppercase mb-1">Table</p>
                      <p className="text-sm font-bold text-theme-text-primary">{selectedFeedback.tableNumber || 'N/A'}</p>
                    </div>
                    <div className="border border-theme-border-primary rounded-xl p-4 bg-theme-bg-tertiary">
                      <p className="text-xs font-semibold text-theme-text-tertiary uppercase mb-1 flex items-center gap-1.5"><FaPhone /> Phone</p>
                      <p className="text-sm font-bold text-theme-text-primary">{selectedFeedback.customerPhone || 'Not provided'}</p>
                    </div>
                    <div className="border border-theme-border-primary rounded-xl p-4 bg-theme-bg-tertiary">
                      <p className="text-xs font-semibold text-theme-text-tertiary uppercase mb-1">Order Date</p>
                      <p className="text-sm font-bold text-theme-text-primary">{formatDate(selectedFeedback.orderDate)}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SingleRestaurantLayout>
  );
};

export default RestaurantReviews;