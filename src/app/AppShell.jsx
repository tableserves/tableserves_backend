import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

import AOS from 'aos';
import { useDispatch, useSelector } from 'react-redux';
import { ToastContainer } from 'react-toastify';

import { initializeTheme, initializeAuth } from '../store/slices/uiSlice';

import { ErrorBoundary } from '../shared/errors/ErrorBoundary';
import ScrollToTop from '../shared/routing/ScrollToTop';
import UrlNormalizer from '../shared/routing/UrlNormalizer';
import RazorpayScript from '../shared/payments/RazorpayScript';
import DevelopmentNotification from '../shared/dev/DevelopmentNotification';

import errorHandlingService from '../shared/errors/ErrorHandlingService.js';
import storageInitializationService from '../services/StorageInitializationService';
import logger from '../services/LoggingService';
import socketService from '../shared/realtime/socketService.js';

import { CartProvider } from '../features/consumer/context/CartContext.jsx';

import AppRoutes from './router/AppRoutes';

import 'aos/dist/aos.css';
import 'react-toastify/dist/ReactToastify.css';

export default function AppShell() {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.ui.auth);
  const [appInitialized, setAppInitialized] = useState(false);

  useEffect(() => {
    AOS.init({ duration: 1000 });

    // Initialize theme on app startup
    dispatch(initializeTheme());

    // Initialize authentication from localStorage
    dispatch(initializeAuth()).then(() => {
      setAppInitialized(true);
    });

    // Initialize error handling and storage systems
    const initializeApp = async () => {
      try {
        const storageResult = await storageInitializationService.initialize();
        if (!storageResult.success) {
          logger.error('Storage initialization failed', storageResult.error, 'App');
        }

        logger.info(
          'Application initialized successfully',
          {
            storage: storageResult.success,
            migrated: storageResult.migration?.migrated || false
          },
          'App'
        );
      } catch (error) {
        errorHandlingService.handleError(error, {
          component: 'App',
          context: { phase: 'initialization' }
        });
      }
    };

    initializeApp();
  }, [dispatch]);

  // Initialize socket connection when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      socketService
        .connect()
        .then(() => {
          logger.info('Socket service connected successfully', { userId: user.id, role: user.role }, 'App');
          window.socketService = socketService;
        })
        .catch((error) => {
          logger.error('Failed to connect socket service', error, 'App');
        });
    } else {
      if (socketService.isConnected) {
        socketService.disconnect();
        logger.info('Socket service disconnected', {}, 'App');
      }
    }

    return () => {
      if (socketService.isConnected) {
        socketService.disconnect();
      }
    };
  }, [isAuthenticated, user]);

  // Show loading state while app is initializing
  if (!appInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-raleway">Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      level="app"
      componentName="App"
      onError={(error) => {
        logger.error('Application-level error caught', error, 'App');
      }}
    >
      <Router>
        <CartProvider>
          <ScrollToTop />
          <UrlNormalizer />
          <RazorpayScript />
          <AppRoutes />
        </CartProvider>
      </Router>

      <DevelopmentNotification />

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </ErrorBoundary>
  );
}
