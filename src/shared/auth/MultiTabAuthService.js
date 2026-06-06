/**
 * Multi-Tab Authentication Service
 * 
 * Handles authentication state synchronization across browser tabs
 * without using localStorage - uses BroadcastChannel API instead
 */

import logger from '../../services/LoggingService';

class MultiTabAuthService {
  constructor() {
    this.channel = null;
    this.listeners = new Set();
    this.isInitialized = false;
  }

  /**
   * Initialize the multi-tab service
   */
  initialize() {
    if (this.isInitialized) return;

    try {
      // Use BroadcastChannel for cross-tab communication
      this.channel = new BroadcastChannel('tableserve_auth');
      
      this.channel.addEventListener('message', (event) => {
        this.handleAuthMessage(event.data);
      });

      this.isInitialized = true;
      logger.info('MultiTabAuthService: Initialized successfully');
    } catch (error) {
      logger.error('MultiTabAuthService: Failed to initialize', error);
    }
  }

  /**
   * Handle authentication messages from other tabs
   */
  handleAuthMessage(data) {
    logger.debug('MultiTabAuthService: Received message', data);

    // Notify all listeners about the auth state change
    this.listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        logger.error('MultiTabAuthService: Listener error', error);
      }
    });
  }

  /**
   * Broadcast authentication state to other tabs
   */
  broadcastAuthState(authData) {
    if (!this.channel) return;

    try {
      this.channel.postMessage({
        type: 'AUTH_STATE_CHANGE',
        timestamp: Date.now(),
        ...authData
      });

      logger.debug('MultiTabAuthService: Broadcasted auth state', authData);
    } catch (error) {
      logger.error('MultiTabAuthService: Failed to broadcast', error);
    }
  }

  /**
   * Broadcast login success to other tabs
   */
  broadcastLogin(user) {
    this.broadcastAuthState({
      action: 'LOGIN',
      user,
      isAuthenticated: true
    });
  }

  /**
   * Broadcast logout to other tabs
   */
  broadcastLogout() {
    this.broadcastAuthState({
      action: 'LOGOUT',
      user: null,
      isAuthenticated: false
    });
  }

  /**
   * Add a listener for auth state changes
   */
  addListener(callback) {
    this.listeners.add(callback);
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Remove all listeners and cleanup
   */
  cleanup() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    
    this.listeners.clear();
    this.isInitialized = false;
    
    logger.info('MultiTabAuthService: Cleaned up');
  }
}

// Export singleton instance
const multiTabAuthService = new MultiTabAuthService();
export default multiTabAuthService;
