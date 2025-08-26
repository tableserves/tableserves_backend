import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaCrown, 
  FaArrowUp, 
  FaStore, 
  FaMapMarkerAlt, 
  FaTimes,
  FaCheck,
  FaClock
} from 'react-icons/fa';

const SubscriptionUpdatesPanel = () => {
  const [updates, setUpdates] = useState([]);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    // Listen for subscription updates
    const handleSubscriptionUpdate = (event) => {
      const { detail } = event;
      const newUpdate = {
        id: Date.now(),
        timestamp: new Date(),
        type: detail.restaurantId ? 'restaurant' : 'zone',
        entityId: detail.restaurantId || detail.zoneId,
        newPlan: detail.newPlan,
        planLabel: detail.planLabel,
        isNew: true
      };

      setUpdates(prev => {
        // Keep only last 10 updates
        const updated = [newUpdate, ...prev].slice(0, 10);
        return updated;
      });

      // Show panel for 5 seconds when new update arrives
      setShowPanel(true);
      setTimeout(() => {
        setShowPanel(false);
      }, 5000);

      // Mark update as read after 3 seconds
      setTimeout(() => {
        setUpdates(prev => prev.map(update => 
          update.id === newUpdate.id ? { ...update, isNew: false } : update
        ));
      }, 3000);
    };

    window.addEventListener('subscriptionUpdated', handleSubscriptionUpdate);

    return () => {
      window.removeEventListener('subscriptionUpdated', handleSubscriptionUpdate);
    };
  }, []);

  const getPlanColor = (plan) => {
    switch (plan?.toLowerCase()) {
      case 'basic': return 'bg-blue-500/20 text-blue-600';
      case 'advanced': return 'bg-purple-500/20 text-purple-600';
      case 'premium': return 'bg-orange-500/20 text-orange-600';
      default: return 'bg-gray-500/20 text-gray-600';
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return timestamp.toLocaleDateString();
  };

  if (updates.length === 0) return null;

  return (
    <>
      {/* Floating notification panel */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed top-20 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 w-80"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <FaArrowUp className="text-white text-sm" />
                </div>
                <span className="font-fredoka text-gray-900 dark:text-white">Subscription Updated!</span>
              </div>
              <button
                onClick={() => setShowPanel(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <FaTimes />
              </button>
            </div>
            
            {updates.slice(0, 3).map((update) => (
              <motion.div
                key={update.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center space-x-3 p-2 rounded-lg mb-2 ${
                  update.isNew ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-700'
                }`}
              >
                <div className="flex-shrink-0">
                  {update.type === 'restaurant' ? (
                    <FaStore className="text-blue-500" />
                  ) : (
                    <FaMapMarkerAlt className="text-purple-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {update.type === 'restaurant' ? 'Restaurant' : 'Zone'} upgraded
                  </p>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${getPlanColor(update.newPlan)}`}>
                      {update.planLabel}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTime(update.timestamp)}
                    </span>
                  </div>
                </div>
                {update.isNew && (
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Updates history panel - can be shown in admin sidebar or dashboard */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-fredoka text-lg text-gray-900 dark:text-white">Recent Subscription Changes</h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Live</span>
          </div>
        </div>

        <div className="space-y-3 max-h-60 overflow-y-auto">
          {updates.length > 0 ? (
            updates.map((update) => (
              <motion.div
                key={update.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex-shrink-0">
                  {update.type === 'restaurant' ? (
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <FaStore className="text-blue-600 dark:text-blue-400 text-sm" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                      <FaMapMarkerAlt className="text-purple-600 dark:text-purple-400 text-sm" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {update.type === 'restaurant' ? 'Restaurant' : 'Zone'} upgraded to{' '}
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPlanColor(update.newPlan)}`}>
                      {update.newPlan === 'premium' && <FaCrown className="mr-1" />}
                      {update.planLabel}
                    </span>
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <FaClock className="text-gray-400 text-xs" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTime(update.timestamp)}
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <FaCheck className="text-green-500" />
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-6">
              <FaClock className="text-gray-400 text-2xl mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No recent subscription changes</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SubscriptionUpdatesPanel;