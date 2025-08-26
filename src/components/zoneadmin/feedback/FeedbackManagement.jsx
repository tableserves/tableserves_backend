import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import {
  FaStar,
  FaComment,
  FaEye,
  FaReply,
  FaFilter,
  FaSearch,
  FaStore,
  FaUser,
  FaCalendarAlt,
  FaThumbsUp,
  FaThumbsDown,
  FaTimes,
  FaCheck
} from 'react-icons/fa';
import ZoneAdminLayout from '../ZoneAdminLayout';
import LocalStorageService from '../../../services/LocalStorageService';

const FeedbackManagement = () => {
  const { zoneId } = useParams();
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [shopFilter, setShopFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    const loadFeedback = () => {
      setLoading(true);
      try {
        // Load feedback from localStorage - in real app this would be from API
        const zoneFeedback = LocalStorageService.getItem(`zone_feedback_${zoneId}`) || [];
        setFeedback(zoneFeedback);
      } catch (error) {
        console.error('Error loading feedback:', error);
        setFeedback([]);
      } finally {
        setLoading(false);
      }
    };

    if (zoneId) {
      loadFeedback();
    }
  }, [zoneId]);

  const getRatingColor = (rating) => {
    if (rating >= 4) return 'text-status-success';
    if (rating >= 3) return 'text-status-warning';
    return 'text-status-error';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'text-status-info bg-status-info-light';
      case 'reviewed': return 'text-status-warning bg-status-warning-light';
      case 'resolved': return 'text-status-success bg-status-success-light';
      default: return 'text-theme-text-tertiary bg-theme-bg-secondary';
    }
  };

  const filteredFeedback = feedback.filter(item => {
    const matchesSearch = item.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.shopName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRating = ratingFilter === 'all' || item.rating == ratingFilter;
    const matchesShop = shopFilter === 'all' || item.shopId === shopFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

    return matchesSearch && matchesRating && matchesShop && matchesStatus;
  });

  const handleViewFeedback = (feedbackItem) => {
    setSelectedFeedback(feedbackItem);
    setReplyText(feedbackItem.reply || '');
    setShowFeedbackModal(true);
  };

  const handleReplySubmit = () => {
    if (!selectedFeedback || !replyText.trim()) return;

    // Update feedback with reply
    const updatedFeedback = feedback.map(item =>
      item.id === selectedFeedback.id
        ? {
            ...item,
            reply: replyText,
            status: 'resolved',
            repliedAt: new Date().toISOString(),
            repliedBy: 'Zone Admin'
          }
        : item
    );

    setFeedback(updatedFeedback);
    LocalStorageService.setItem(`zone_feedback_${zoneId}`, updatedFeedback);
    setShowFeedbackModal(false);
    setReplyText('');
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <FaStar
        key={i}
        className={`${i < rating ? getRatingColor(rating) : 'text-theme-text-tertiary'}`}
      />
    ));
  };

  if (loading) {
    return (
      <ZoneAdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 spinner-theme rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-theme-text-primary font-raleway">Loading feedback...</p>
          </div>
        </div>
      </ZoneAdminLayout>
    );
  }

  return (
    <ZoneAdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-fredoka text-theme-text-primary mb-2">
            Feedback Management
          </h1>
          <p className="text-theme-text-secondary font-raleway">
            Monitor and respond to customer feedback across your zone
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="admin-card rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-theme-text-tertiary font-raleway text-sm">Total Feedback</p>
                <p className="text-2xl font-fredoka text-theme-text-primary">{feedback.length}</p>
              </div>
              <FaComment className="text-theme-accent-primary text-2xl" />
            </div>
          </div>

          <div className="admin-card rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-theme-text-tertiary font-raleway text-sm">Avg Rating</p>
                <p className="text-2xl font-fredoka text-theme-text-primary">
                  {feedback.length > 0 
                    ? (feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length).toFixed(1)
                    : '0.0'
                  }
                </p>
              </div>
              <FaStar className="text-status-warning text-2xl" />
            </div>
          </div>

          <div className="admin-card rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-theme-text-tertiary font-raleway text-sm">Positive</p>
                <p className="text-2xl font-fredoka text-status-success">
                  {feedback.filter(item => item.rating >= 4).length}
                </p>
              </div>
              <FaThumbsUp className="text-status-success text-2xl" />
            </div>
          </div>

          <div className="admin-card rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-theme-text-tertiary font-raleway text-sm">Needs Attention</p>
                <p className="text-2xl font-fredoka text-status-error">
                  {feedback.filter(item => item.rating <= 2).length}
                </p>
              </div>
              <FaThumbsDown className="text-status-error text-2xl" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="admin-card rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-theme-text-primary font-raleway font-medium mb-2">Search</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-theme rounded-lg pl-10 pr-4 py-2 w-full"
                  placeholder="Search feedback..."
                />
              </div>
            </div>

            <div>
              <label className="block text-theme-text-primary font-raleway font-medium mb-2">Rating</label>
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className="input-theme rounded-lg px-4 py-2 w-full"
              >
                <option value="all">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>

            <div>
              <label className="block text-theme-text-primary font-raleway font-medium mb-2">Shop</label>
              <select
                value={shopFilter}
                onChange={(e) => setShopFilter(e.target.value)}
                className="input-theme rounded-lg px-4 py-2 w-full"
              >
                <option value="all">All Shops</option>
                {/* Shop options would be loaded from zone shops */}
              </select>
            </div>

            <div>
              <label className="block text-theme-text-primary font-raleway font-medium mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-theme rounded-lg px-4 py-2 w-full"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="reviewed">Reviewed</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>
        </div>

        {/* Feedback List */}
        <div className="space-y-4">
          {filteredFeedback.length === 0 ? (
            <div className="admin-card rounded-lg p-8 text-center">
              <FaComment className="text-4xl text-theme-text-tertiary mx-auto mb-4 opacity-50" />
              <p className="text-theme-text-tertiary font-raleway">No feedback found</p>
            </div>
          ) : (
            filteredFeedback.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="admin-card rounded-lg p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-theme-accent-primary rounded-full flex items-center justify-center">
                      <FaUser className="text-theme-text-inverse" />
                    </div>
                    <div>
                      <h3 className="font-fredoka text-theme-text-primary">{item.customerName || 'Anonymous'}</h3>
                      <div className="flex items-center space-x-2">
                        <FaStore className="text-theme-text-tertiary text-sm" />
                        <span className="text-theme-text-secondary font-raleway text-sm">{item.shopName}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-1 mb-1">
                      {renderStars(item.rating)}
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-raleway ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                </div>

                <p className="text-theme-text-primary font-raleway mb-4">{item.comment}</p>

                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2 text-theme-text-tertiary text-sm">
                    <FaCalendarAlt />
                    <span className="font-raleway">{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                  <button
                    onClick={() => handleViewFeedback(item)}
                    className="btn-primary px-4 py-2 rounded-lg font-raleway flex items-center space-x-2"
                  >
                    <FaReply />
                    <span>{item.reply ? 'View Reply' : 'Reply'}</span>
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Feedback Details Modal */}
        {showFeedbackModal && selectedFeedback && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="admin-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-fredoka text-theme-text-primary">
                  Feedback Details
                </h2>
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="text-theme-text-tertiary hover:text-theme-text-primary"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-6">
                {/* Feedback Info */}
                <div>
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-theme-accent-primary rounded-full flex items-center justify-center">
                      <FaUser className="text-theme-text-inverse" />
                    </div>
                    <div>
                      <h3 className="font-fredoka text-theme-text-primary">{selectedFeedback.customerName || 'Anonymous'}</h3>
                      <div className="flex items-center space-x-1">
                        {renderStars(selectedFeedback.rating)}
                      </div>
                    </div>
                  </div>
                  <p className="text-theme-text-primary font-raleway bg-theme-bg-secondary p-4 rounded-lg">
                    {selectedFeedback.comment}
                  </p>
                </div>

                {/* Reply Section */}
                <div>
                  <label className="block text-theme-text-primary font-raleway font-medium mb-2">
                    {selectedFeedback.reply ? 'Your Reply' : 'Reply to Customer'}
                  </label>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="input-theme rounded-lg px-4 py-2 w-full"
                    rows="4"
                    placeholder="Type your reply here..."
                    disabled={selectedFeedback.status === 'resolved' && selectedFeedback.reply}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-4">
                  {(!selectedFeedback.reply || selectedFeedback.status !== 'resolved') && (
                    <button
                      onClick={handleReplySubmit}
                      disabled={!replyText.trim()}
                      className="flex-1 btn-primary py-2 rounded-lg font-raleway flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      <FaCheck />
                      <span>Send Reply</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowFeedbackModal(false)}
                    className="flex-1 btn-secondary py-2 rounded-lg font-raleway"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </ZoneAdminLayout>
  );
};

export default FeedbackManagement;
