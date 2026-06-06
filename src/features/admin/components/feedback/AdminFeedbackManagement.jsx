import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaStar,
  FaComments,
  FaSearch,
  FaTimes,
  FaMapMarkerAlt,
  FaStore,
  FaUser,
  FaClipboardList,
  FaFilter,
  FaSort,
  FaSyncAlt,
  FaQuoteLeft,
  FaRegFrown,
  FaRegSmile,
  FaChartLine
} from 'react-icons/fa';
import SuperAdminLayout from '../SuperAdminLayout';
import { safeToastError } from '../../../../shared/utils/toastUtils';

const AdminFeedbackManagement = () => {
  const [feedbackData, setFeedbackData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRating, setFilterRating] = useState('all');
  const [sortOption, setSortOption] = useState('newest');

  const loadFeedbackData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tableserve-ratings`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('tableserve_access_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error(`Failed to fetch feedback: ${response.status}`);

      const result = await response.json();
      setFeedbackData(result.data?.ratings || []);
    } catch (error) {
      console.error('Error loading feedback:', error);
      safeToastError('Failed to load customer reviews.');
      setFeedbackData([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadFeedbackData();
  }, []);

  // Memoized Statistics
  const stats = useMemo(() => {
    if (feedbackData.length === 0) return { total: 0, average: '0.0', positive: 0, negative: 0 };
    
    const total = feedbackData.length;
    const average = (feedbackData.reduce((sum, item) => sum + item.serviceRating, 0) / total).toFixed(1);
    const positive = feedbackData.filter(item => item.serviceRating >= 4).length;
    const negative = feedbackData.filter(item => item.serviceRating <= 2).length;

    return { total, average, positive, negative };
  }, [feedbackData]);

  // Memoized Filtering & Sorting
  const processedFeedback = useMemo(() => {
    return feedbackData
      .filter(feedback => {
        const search = searchTerm.toLowerCase();
        const matchesSearch = 
          feedback.customerName?.toLowerCase().includes(search) ||
          feedback.orderNumber?.toLowerCase().includes(search) ||
          feedback.serviceFeedback?.toLowerCase().includes(search);
        
        if (filterRating === 'all') return matchesSearch;
        return matchesSearch && feedback.serviceRating === parseInt(filterRating);
      })
      .sort((a, b) => {
        if (sortOption === 'newest') return new Date(b.submittedAt) - new Date(a.submittedAt);
        if (sortOption === 'oldest') return new Date(a.submittedAt) - new Date(b.submittedAt);
        if (sortOption === 'highest') return b.serviceRating - a.serviceRating;
        if (sortOption === 'lowest') return a.serviceRating - b.serviceRating;
        return 0;
      });
  }, [feedbackData, searchTerm, filterRating, sortOption]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getInitials = (name) => {
    return name ? name.charAt(0).toUpperCase() : 'C';
  };

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center min-h-[70vh]">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center">
            <div className="w-14 h-14 border-4 border-theme-border-primary border-t-amber-400 rounded-full animate-spin mb-4"></div>
            <p className="text-theme-text-primary font-fredoka text-xl">Loading Reviews...</p>
          </motion.div>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-8 max-w-[1400px] mx-auto pb-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-theme-bg-secondary p-6 sm:p-8 rounded-3xl border border-theme-border-primary/60 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-fredoka text-theme-text-primary mb-1 flex items-center">
              <FaStar className="mr-3 text-amber-400" /> TableServe App Reviews
            </h1>
            <p className="text-theme-text-secondary font-raleway">Monitor customer feedback and ratings for the TableServe app experience.</p>
          </div>
          <button
            onClick={() => loadFeedbackData(true)}
            disabled={isRefreshing}
            className="relative z-10 w-full sm:w-auto px-6 py-2.5 rounded-xl font-raleway font-semibold flex items-center justify-center space-x-2 bg-theme-bg border border-theme-border-primary hover:border-theme-accent-primary/50 text-theme-text-primary shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50"
          >
            <FaSyncAlt className={`${isRefreshing ? 'animate-spin text-theme-accent-primary' : 'text-theme-text-secondary'}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: 'Total Reviews', value: stats.total, icon: FaComments, gradient: 'from-blue-400 to-blue-600', shadow: 'shadow-blue-500/20' },
            { title: 'Average Rating', value: `${stats.average} / 5`, icon: FaChartLine, gradient: 'from-purple-400 to-purple-600', shadow: 'shadow-purple-500/20' },
            { title: 'Positive (4-5★)', value: stats.positive, icon: FaRegSmile, gradient: 'from-emerald-400 to-emerald-600', shadow: 'shadow-emerald-500/20' },
            { title: 'Negative (1-2★)', value: stats.negative, icon: FaRegFrown, gradient: 'from-rose-400 to-rose-600', shadow: 'shadow-rose-500/20' }
          ].map((stat, index) => (
            <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="bg-theme-bg-secondary border border-theme-border-primary/60 rounded-3xl p-6 relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-sm font-medium text-theme-text-tertiary font-raleway uppercase tracking-wider mb-2">{stat.title}</p>
                  <p className="text-3xl font-fredoka text-theme-text-primary">{stat.value}</p>
                </div>
                <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${stat.gradient} ${stat.shadow} shadow-lg text-white`}>
                  <stat.icon className="text-xl" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-theme-bg-secondary border border-theme-border-primary/60 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary" />
            <input
              type="text"
              placeholder="Search by name, order #, or feedback text..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-theme-bg border border-theme-border-primary rounded-xl pl-11 pr-4 py-3 text-sm text-theme-text-primary placeholder-theme-text-tertiary focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative min-w-[150px]">
              <FaFilter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary text-xs" />
              <select
                value={filterRating}
                onChange={(e) => setFilterRating(e.target.value)}
                className="w-full bg-theme-bg border border-theme-border-primary rounded-xl pl-10 pr-4 py-3 text-sm text-theme-text-primary focus:outline-none focus:border-amber-400 appearance-none cursor-pointer transition-colors"
              >
                <option value="all">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>
            <div className="relative min-w-[160px]">
              <FaSort className="absolute left-4 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary text-xs" />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="w-full bg-theme-bg border border-theme-border-primary rounded-xl pl-10 pr-4 py-3 text-sm text-theme-text-primary focus:outline-none focus:border-amber-400 appearance-none cursor-pointer transition-colors"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest">Highest Rating</option>
                <option value="lowest">Lowest Rating</option>
              </select>
            </div>
          </div>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {processedFeedback.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center bg-theme-bg-secondary border border-theme-border-primary/60 rounded-3xl">
              <div className="w-20 h-20 bg-theme-bg rounded-full flex items-center justify-center mb-4 border border-theme-border-primary shadow-sm">
                <FaComments className="text-3xl text-theme-text-tertiary opacity-50" />
              </div>
              <h3 className="text-xl font-fredoka text-theme-text-primary mb-2">No Reviews Found</h3>
              <p className="text-theme-text-secondary font-raleway text-sm">
                {searchTerm || filterRating !== 'all' ? 'Try adjusting your search or filter criteria.' : 'Reviews will appear here once customers submit feedback.'}
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {processedFeedback.map((feedback) => (
                <motion.div
                  key={feedback.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => { setSelectedFeedback(feedback); setShowFeedbackModal(true); }}
                  className="bg-theme-bg-secondary border border-theme-border-primary/60 rounded-3xl p-6 hover:border-amber-400/50 hover:shadow-lg transition-all duration-300 cursor-pointer group flex flex-col"
                >
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-fredoka text-lg shadow-sm">
                        {getInitials(feedback.customerName)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-theme-text-primary font-raleway text-sm line-clamp-1">{feedback.customerName || 'Anonymous'}</h3>
                        <p className="text-xs text-theme-text-tertiary mt-0.5">{formatDate(feedback.submittedAt)}</p>
                      </div>
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center space-x-1 ${
                      feedback.serviceRating >= 4 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' :
                      feedback.serviceRating >= 3 ? 'bg-amber-400/10 text-amber-500 border-amber-400/30' :
                      'bg-rose-500/10 text-rose-500 border-rose-500/30'
                    }`}>
                      <span>{feedback.serviceRating}.0</span>
                      <FaStar />
                    </div>
                  </div>

                  <div className="flex-1 relative z-10">
                    <FaQuoteLeft className="text-theme-border-primary/50 text-2xl absolute -top-2 -left-2 -z-10 transform -rotate-6 group-hover:text-amber-400/10 transition-colors" />
                    <p className="text-theme-text-secondary font-raleway text-sm italic line-clamp-3 leading-relaxed relative z-10 pl-2">
                      "{feedback.serviceFeedback || 'No written feedback provided.'}"
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-theme-border-primary/50 flex flex-wrap gap-2">
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-theme-bg rounded-md border border-theme-border-primary text-[10px] uppercase font-bold text-theme-text-tertiary">
                      <FaClipboardList className="text-blue-500" />
                      <span>Order #{feedback.orderNumber?.slice(-6) || 'N/A'}</span>
                    </span>
                    {feedback.venue && (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-theme-bg rounded-md border border-theme-border-primary text-[10px] uppercase font-bold text-theme-text-tertiary max-w-[50%] truncate">
                        {feedback.venue.type === 'restaurant' ? <FaStore className="text-purple-500" /> : <FaMapMarkerAlt className="text-orange-500" />}
                        <span className="truncate">{feedback.venue.name}</span>
                      </span>
                    )}
                    {(feedback.categories?.platform || feedback.categories?.appExperience) && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800 text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                        </svg>
                        <span>App Rating</span>
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Feedback Details Modal */}
        <AnimatePresence>
          {showFeedbackModal && selectedFeedback && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowFeedbackModal(false)}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                className="bg-theme-bg-secondary border border-theme-border-primary rounded-3xl p-8 w-full max-w-2xl shadow-2xl relative overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

                <div className="flex items-center justify-between mb-8 relative z-10 border-b border-theme-border-primary pb-4">
                  <h2 className="text-2xl font-fredoka text-theme-text-primary flex items-center">
                    <FaStar className="mr-3 text-amber-400" /> Review Details
                  </h2>
                  <button onClick={() => setShowFeedbackModal(false)} className="w-10 h-10 rounded-full bg-theme-bg border border-theme-border-primary flex items-center justify-center text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-hover transition-colors">
                    <FaTimes />
                  </button>
                </div>

                <div className="space-y-6 relative z-10">
                  {/* Rating Block */}
                  <div className="bg-theme-bg border border-theme-border-primary/50 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center space-x-4">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold border ${
                        selectedFeedback.serviceRating >= 4 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' :
                        selectedFeedback.serviceRating >= 3 ? 'bg-amber-400/10 text-amber-500 border-amber-400/30' :
                        'bg-rose-500/10 text-rose-500 border-rose-500/30'
                      }`}>
                        {selectedFeedback.serviceRating}.0
                      </div>
                      <div>
                        <div className="flex space-x-1 mb-1 text-lg">
                          {[...Array(5)].map((_, i) => (
                            <FaStar key={i} className={i < selectedFeedback.serviceRating ? "text-amber-400" : "text-theme-border-primary"} />
                          ))}
                        </div>
                        <p className="text-xs font-bold uppercase tracking-wider text-theme-text-secondary">
                          {selectedFeedback.serviceRating >= 4 ? 'Excellent' : selectedFeedback.serviceRating >= 3 ? 'Average' : 'Poor'} Experience
                        </p>
                      </div>
                    </div>
                    <div className="text-right w-full sm:w-auto">
                      <p className="text-xs font-bold uppercase tracking-wider text-theme-text-tertiary mb-1">Submitted On</p>
                      <p className="font-raleway text-sm font-medium text-theme-text-primary">{formatDate(selectedFeedback.submittedAt)}</p>
                    </div>
                  </div>

                  {/* App/Platform Rating ONLY */}
                  {(selectedFeedback.categories?.platform || selectedFeedback.categories?.appExperience) && (
                    <div className="bg-theme-bg border border-theme-border-primary/50 p-6 rounded-2xl">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-theme-text-tertiary mb-4 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                        </svg>
                        TableServe App Experience
                      </h3>
                      <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 p-6 rounded-xl text-center">
                        <div className="flex justify-center space-x-1 mb-3">
                          {[...Array(5)].map((_, i) => (
                            <FaStar key={i} className={`text-2xl ${i < (selectedFeedback.categories.platform?.rating || selectedFeedback.categories.appExperience) ? "text-amber-400" : "text-theme-border-primary"}`} />
                          ))}
                        </div>
                        <p className="text-3xl font-bold text-theme-text-primary mb-2">
                          {selectedFeedback.categories.platform?.rating || selectedFeedback.categories.appExperience}/5
                        </p>
                        <p className="text-xs font-bold uppercase tracking-wider text-theme-text-secondary mb-4">
                          {(selectedFeedback.categories.platform?.rating || selectedFeedback.categories.appExperience) >= 4 ? 'Excellent Experience' : 
                           (selectedFeedback.categories.platform?.rating || selectedFeedback.categories.appExperience) >= 3 ? 'Good Experience' : 
                           'Needs Improvement'}
                        </p>
                        {selectedFeedback.categories.platform?.feedback && (
                          <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4 mt-4">
                            <p className="text-sm text-theme-text-secondary italic leading-relaxed">
                              "{selectedFeedback.categories.platform.feedback}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Feedback Text Block */}
                  <div className="bg-theme-bg border border-theme-border-primary/50 p-6 rounded-2xl relative">
                    <FaQuoteLeft className="text-theme-border-primary/40 text-4xl absolute top-4 left-4" />
                    <p className="text-theme-text-primary font-raleway italic leading-relaxed relative z-10 pl-8 pt-2 text-base">
                      "{selectedFeedback.serviceFeedback || 'No written feedback provided.'}"
                    </p>
                  </div>

                  {/* Context Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-theme-bg border border-theme-border-primary/50 p-5 rounded-2xl">
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-theme-text-tertiary flex items-center mb-3">
                        <FaUser className="mr-2 text-blue-500" /> Customer Info
                      </h3>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-theme-text-secondary">Name</p>
                          <p className="font-semibold text-theme-text-primary text-sm">{selectedFeedback.customerName || 'Anonymous'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-theme-text-secondary">Phone</p>
                          <p className="font-semibold text-theme-text-primary text-sm">{selectedFeedback.customerPhone || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-theme-bg border border-theme-border-primary/50 p-5 rounded-2xl">
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-theme-text-tertiary flex items-center mb-3">
                        <FaMapMarkerAlt className="mr-2 text-rose-500" /> Order & Venue
                      </h3>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-theme-text-secondary">Order Reference</p>
                          <p className="font-semibold text-theme-text-primary text-sm">#{selectedFeedback.orderNumber}</p>
                        </div>
                        {selectedFeedback.venue && (
                          <div>
                            <p className="text-xs text-theme-text-secondary">Location</p>
                            <p className="font-semibold text-theme-text-primary text-sm capitalize">{selectedFeedback.venue.name} {selectedFeedback.venue.shop ? `(${selectedFeedback.venue.shop})` : ''}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                <div className="flex justify-end mt-8 relative z-10">
                  <button onClick={() => setShowFeedbackModal(false)} className="px-6 py-2.5 bg-theme-bg border border-theme-border-primary hover:bg-theme-bg-hover text-theme-text-primary rounded-xl font-medium font-raleway transition-colors">
                    Close Details
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </SuperAdminLayout>
  );
};

export default AdminFeedbackManagement;