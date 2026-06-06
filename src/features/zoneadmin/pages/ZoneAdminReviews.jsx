import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaStar, 
  FaSearch, 
  FaFilter, 
  FaTimes, 
  FaCalendarAlt,
  FaPhone,
  FaMapMarkerAlt,
  FaUtensils,
  FaComments,
  FaQuoteLeft,
  FaStore
} from 'react-icons/fa';
import ZoneAdminLayout from './ZoneAdminLayout';

const ZoneAdminReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [filteredReviews, setFilteredReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRating, setFilterRating] = useState('all');
  const [selectedReview, setSelectedReview] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const zoneId = window.location.pathname.split('/')[2];

  if (!zoneId || zoneId === 'zone') {
    console.error('Invalid zoneId extracted from URL:', zoneId);
  }

  useEffect(() => {
    fetchReviews();
  }, [zoneId]);

  useEffect(() => {
    filterReviews();
  }, [searchTerm, filterRating, reviews]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching zone feedback from Order system for zoneId:', zoneId);
      
      if (!zoneId || zoneId === 'zone' || zoneId.length < 10) {
        console.error('❌ Invalid zoneId detected:', { zoneId, pathname: window.location.pathname });
        setReviews([]);
        return;
      }

      const apiUrl = `${API_BASE_URL}/orders/zones/${zoneId}/feedback`;
      console.log('📡 Making API request to:', apiUrl);

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('tableserve_access_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('📊 Zone Reviews API Response:', result);

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
          reviewType: item.reviewType,
          orderType: item.orderType,
          shopName: item.shopName,
          shopId: item.shopId,
          parentOrderNumber: item.parentOrderNumber,
          rating: item.rating,
          comment: item.comment
        }));

        setReviews(transformedFeedback);

        console.log('✅ Zone reviews loaded:', {
          count: transformedFeedback.length,
          reviewTypes: result.data?.summary?.reviewBreakdown,
          avgRating: result.data?.summary?.averageRating
        });
      } else {
        console.error('Failed to fetch zone feedback:', response.status, response.statusText);
        setReviews([]);
      }
    } catch (error) {
      console.error('Error fetching zone feedback:', error);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const filterReviews = () => {
    let filtered = reviews;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(review =>
        (review.serviceFeedback?.toLowerCase() || '').includes(searchLower) ||
        (review.comment?.toLowerCase() || '').includes(searchLower) ||
        (review.customerName?.toLowerCase() || '').includes(searchLower) ||
        (review.shopName?.toLowerCase() || '').includes(searchLower) ||
        (review.orderNumber?.toLowerCase() || '').includes(searchLower)
      );
    }

    if (filterRating !== 'all') {
      filtered = filtered.filter(review => {
        const rating = Math.round(review.serviceRating || review.rating);
        return rating === parseInt(filterRating);
      });
    }

    setFilteredReviews(filtered);
  };

  const renderStars = (rating) => {
    const stars = [];
    const roundedRating = Math.round(rating);
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <FaStar
          key={i}
          className={`w-3.5 h-3.5 ${i <= roundedRating ? 'text-amber-400' : 'text-theme-border-secondary'}`}
        />
      );
    }
    return stars;
  };

  const openModal = (review) => {
    setSelectedReview(review);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedReview(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + (review.serviceRating || review.rating), 0);
    return (sum / reviews.length).toFixed(1);
  };

  const getRatingDistribution = () => {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(review => {
      const rating = Math.round(review.serviceRating || review.rating);
      if (distribution[rating] !== undefined) distribution[rating]++;
    });
    return distribution;
  };

  // UI Helpers
  const getInitials = (name) => name?.substring(0, 2).toUpperCase() || 'CU';

  const getRatingStyle = (rating) => {
    if (rating >= 4) return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
    if (rating === 3) return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
    return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
  };

  const ratingDistribution = getRatingDistribution();

  return (
    <ZoneAdminLayout>
      <div className="w-full h-full flex flex-col space-y-6 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        
        {/* Header & KPI Summary */}
        <div className="bg-theme-bg-secondary p-6 md:p-8 rounded-3xl border border-theme-border-primary shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-fredoka text-theme-text-primary tracking-tight">Zone Reviews</h1>
            </div>
            <p className="text-sm font-raleway text-theme-text-secondary max-w-md">
              Monitor customer feedback and analyze satisfaction across all vendor shops in your zone.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-4 w-full lg:w-auto">
            <div className="flex-1 lg:flex-none bg-theme-bg-primary border border-theme-border-primary px-5 py-4 rounded-2xl flex flex-col items-center justify-center shadow-sm">
              <span className="text-xs font-bold font-raleway text-theme-text-tertiary uppercase tracking-widest mb-1">Total Reviews</span>
              <span className="text-2xl font-fredoka text-theme-text-primary">{filteredReviews.length}</span>
            </div>
            <div className="flex-1 lg:flex-none bg-theme-accent-primary/10 border border-theme-accent-primary/20 px-5 py-4 rounded-2xl flex flex-col items-center justify-center shadow-sm">
              <span className="text-xs font-bold font-raleway text-theme-accent-primary uppercase tracking-widest mb-1">Average</span>
              <div className="flex items-center gap-1.5 text-2xl font-fredoka text-theme-accent-primary">
                {getAverageRating()} <FaStar className="text-amber-400 text-xl -mt-1" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-theme-bg-secondary rounded-2xl p-2 border border-theme-border-primary shadow-sm flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-text-tertiary" />
            <input
              type="text"
              placeholder="Search by customer, shop, order #, or keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-transparent border-none focus:ring-0 text-sm font-raleway text-theme-text-primary placeholder:text-theme-text-tertiary outline-none"
            />
          </div>
          <div className="w-px bg-theme-border-primary hidden sm:block my-2"></div>
          <div className="relative w-full sm:w-56 shrink-0 border-t border-theme-border-secondary sm:border-none">
            <FaFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-text-tertiary text-sm" />
            <select
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
              className="w-full pl-11 pr-8 py-3 bg-transparent border-none focus:ring-0 text-sm font-raleway font-bold text-theme-text-primary cursor-pointer outline-none appearance-none"
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
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-3 border-theme-accent-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredReviews.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 bg-theme-bg-secondary rounded-3xl border border-theme-border-primary border-dashed">
                <div className="w-20 h-20 bg-theme-bg-tertiary rounded-full flex items-center justify-center mb-4">
                  <FaComments className="text-3xl text-theme-text-tertiary" />
                </div>
                <p className="text-theme-text-primary font-fredoka text-xl">No reviews found</p>
                <p className="text-theme-text-secondary font-raleway text-sm mt-2">
                  {searchTerm || filterRating !== 'all' ? 'Try adjusting your search filters.' : 'Reviews from completed orders will appear here.'}
                </p>
              </div>
            ) : (
              filteredReviews.map((review, index) => (
                <motion.div
                  key={review.id || index}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                  onClick={() => openModal(review)}
                  className="bg-theme-bg-secondary rounded-3xl border border-theme-border-primary shadow-sm hover:shadow-lg hover:border-theme-accent-primary/30 transition-all cursor-pointer flex flex-col h-full overflow-hidden"
                >
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-theme-bg-tertiary border border-theme-border-primary flex items-center justify-center text-theme-text-secondary font-bold text-sm shrink-0">
                          {getInitials(review.customerName)}
                        </div>
                        <div>
                          <h3 className="font-bold text-theme-text-primary font-raleway">{review.customerName}</h3>
                          <p className="text-[11px] font-medium text-theme-text-tertiary mt-0.5">{formatDate(review.submittedAt)}</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${getRatingStyle(review.serviceRating)}`}>
                        {review.serviceRating.toFixed(1)} <FaStar className="text-[10px]" />
                      </div>
                    </div>

                    <div className="flex-1">
                      {review.serviceFeedback ? (
                        <p className="text-sm text-theme-text-secondary font-raleway leading-relaxed line-clamp-3">
                          "{review.serviceFeedback}"
                        </p>
                      ) : (
                        <p className="text-sm text-theme-text-tertiary font-raleway italic">No written feedback provided.</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-theme-bg-tertiary/50 px-6 py-4 border-t border-theme-border-primary flex items-center justify-between text-xs font-raleway font-bold text-theme-text-tertiary">
                    <div className="flex items-center gap-2">
                      <span className="bg-theme-bg-primary px-2 py-1 rounded-md border border-theme-border-primary text-theme-text-primary shadow-sm">
                        #{review.orderNumber}
                      </span>
                      {review.tableNumber && <span>Table {review.tableNumber}</span>}
                    </div>
                    <div className="flex items-center gap-1.5 text-theme-accent-primary">
                      <FaStore size={10} />
                      <span className="truncate max-w-[100px]">{review.shopName || 'Zone Order'}</span>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Feedback Detail Modal */}
        <AnimatePresence>
          {showModal && selectedReview && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6"
              onClick={closeModal}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-theme-bg-primary rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-theme-border-primary flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-theme-border-primary bg-theme-bg-secondary/80 backdrop-blur-md shrink-0">
                  <h2 className="text-xl font-fredoka text-theme-text-primary">
                    Review Details
                  </h2>
                  <button
                    onClick={closeModal}
                    className="p-2 text-theme-text-tertiary hover:text-theme-text-primary hover:bg-theme-bg-hover rounded-full transition-colors"
                  >
                    <FaTimes size={18} />
                  </button>
                </div>

                {/* Modal Scrollable Content */}
                <div className="p-8 space-y-8 overflow-y-auto scrollbar-thin scrollbar-thumb-theme-border-primary">
                  
                  {/* Rating Header inside Modal */}
                  <div className="flex items-center gap-6">
                    <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center border shadow-sm ${getRatingStyle(selectedReview.serviceRating)}`}>
                      <span className="text-2xl font-fredoka">{selectedReview.serviceRating}.0</span>
                      <FaStar className="text-sm mt-1" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-fredoka text-theme-text-primary mb-1">{selectedReview.customerName}</h3>
                      <div className="flex items-center gap-4 text-sm font-raleway font-medium text-theme-text-secondary">
                        <span>{formatDate(selectedReview.submittedAt)}</span>
                        {selectedReview.tableNumber && (
                          <>
                            <span className="text-theme-border-primary">•</span>
                            <span className="flex items-center gap-1.5">
                              <FaUtensils className="text-theme-accent-primary text-xs" />
                              Table {selectedReview.tableNumber}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Feedback Quote */}
                  {selectedReview.serviceFeedback && (
                    <div className="relative bg-theme-bg-secondary rounded-2xl p-6 sm:p-8 border border-theme-border-primary shadow-inner">
                      <FaQuoteLeft className="absolute top-6 left-6 text-theme-border-primary text-4xl" />
                      <p className="relative z-10 text-theme-text-primary font-raleway leading-relaxed text-base sm:text-lg ml-10">
                        {selectedReview.serviceFeedback}
                      </p>
                    </div>
                  )}

                  {/* Metadata Grid */}
                  <div>
                    <h4 className="text-xs uppercase tracking-widest font-bold text-theme-text-secondary mb-4">Order Information</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="border border-theme-border-primary rounded-2xl p-5 bg-theme-bg-secondary">
                        <p className="text-[10px] font-bold text-theme-text-tertiary uppercase tracking-widest mb-1">Order ID</p>
                        <p className="text-base font-fredoka text-theme-text-primary">#{selectedReview.orderNumber}</p>
                      </div>
                      <div className="border border-theme-border-primary rounded-2xl p-5 bg-theme-bg-secondary">
                        <p className="text-[10px] font-bold text-theme-text-tertiary uppercase tracking-widest mb-1">Vendor / Shop</p>
                        <p className="text-base font-fredoka text-theme-text-primary flex items-center gap-2">
                          <FaStore className="text-theme-accent-primary text-sm" /> 
                          {selectedReview.shopName || 'Zone Order'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ZoneAdminLayout>
  );
};

export default ZoneAdminReviews;