import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import RealTimeService from '../../services/RealTimeService';
import { logger } from '../../shared/logging/logger';

const DevelopmentNotification = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [backendStatus, setBackendStatus] = useState('unknown');

  const connectionState = useSelector(state => state.realtime);

  useEffect(() => {
    // Only show in development mode
    if (import.meta.env.NODE_ENV !== 'development') {
      return;
    }

    // Check if we're using mock service
    const wsStatus = RealTimeService.getConnectionStatus();

    if (wsStatus.useMockService || connectionState.isMock) {
      setIsVisible(true);
      setBackendStatus('offline');
    } else if (wsStatus.connected) {
      setBackendStatus('online');
      // Hide notification when backend is working
      if (isVisible) {
        const timer = setTimeout(() => setIsVisible(false), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [connectionState, isVisible]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
  };

  const handleRetryBackend = async () => {
    try {
      logger.info('🔄 Attempting to reconnect to backend...');
      await RealTimeService.forceReconnect();
    } catch (error) {
      logger.error('Failed to reconnect to backend', error);
    }
  };

  const handleStartBackend = () => {
    // This is just informational - user needs to manually start backend
    alert('Please start the backend server:\n\n1. Open a terminal\n2. Navigate to the backend folder\n3. Run: npm start\n4. The server should start on port 5000');
  };

  if (!isVisible || isDismissed || import.meta.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed bottom-4 left-4 z-50 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg shadow-lg p-4 max-w-md"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">🚧</div>
            <div>
              <h3 className="font-semibold text-sm mb-1">
                Development Mode - Backend Offline
              </h3>
              <p className="text-xs opacity-90 mb-3">
                The backend server is not running. Using mock service for development.
                Some features may not work as expected.
              </p>

              <div className="text-xs opacity-75 mb-3 bg-black bg-opacity-20 rounded p-2">
                <div className="flex items-center space-x-2 mb-1">
                  <span>📡</span>
                  <span>Backend Status: <strong>Offline</strong></span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>🔧</span>
                  <span>Using: <strong>Mock Service</strong></span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleRetryBackend}
                  className="px-3 py-1 bg-white bg-opacity-20 rounded text-xs hover:bg-opacity-30 transition-colors"
                >
                  🔄 Retry Connection
                </button>

                <button
                  onClick={handleStartBackend}
                  className="px-3 py-1 bg-white bg-opacity-20 rounded text-xs hover:bg-opacity-30 transition-colors"
                >
                  📖 How to Start Backend
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="text-white hover:text-yellow-200 ml-2 text-lg"
          >
            ✕
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DevelopmentNotification;
