import { io } from 'socket.io-client';
import { safeToastError, safeToastSuccess } from '../utils/toastUtils';
import { ORDER_EVENTS, ROOM_EVENTS, CONNECTION_EVENTS } from './socketEvents';
import simpleTokenService from '../auth/SimpleTokenService';
import { store } from '../../store';
import { connectionEstablished, connectionLost, connectionAttempting, connectionError } from '../../store/slices/realtimeSlice';

class SocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.maxReconnectDelay = 30000; // Max 30 seconds
    this.isConnected = false;
    this.subscribers = new Map();
    this.connectionPromise = null;
  }

  connect() {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        // Use the WebSocket URL from environment variables (NO FALLBACK)
        const websocketUrl = import.meta.env.VITE_WEBSOCKET_URL;
        
        if (!websocketUrl) {
          throw new Error('VITE_WEBSOCKET_URL environment variable is required. Please set it in your .env file.');
        }
        
        // Validate and refresh token if needed
        const token = simpleTokenService.getAccessToken();
        if (!token || !simpleTokenService.isAuthenticated()) {
          console.warn('No valid token for socket connection');
        }
        
        this.socket = io(websocketUrl, {
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay,
          reconnectionDelayMax: this.maxReconnectDelay,
          timeout: 20000,
          autoConnect: true,
          transports: ['websocket', 'polling'],
          // Use token from SimpleTokenService
          auth: {
            token
          }
        });

        // Connection established
        this.socket.on('connect', () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          console.log('✅ WebSocket connected to:', websocketUrl);
          console.log('🔌 Socket ID:', this.socket.id);
          
          // Dispatch Redux action to update connection state
          store.dispatch(connectionEstablished({
            socketId: this.socket.id,
            timestamp: new Date().toISOString()
          }));
          
          resolve(this.socket);
        });

        // Handle disconnection
        this.socket.on('disconnect', (reason) => {
          this.isConnected = false;
          console.warn('❌ WebSocket disconnected:', reason);
          
          // Dispatch Redux action to update connection state
          store.dispatch(connectionLost({
            reason,
            timestamp: new Date().toISOString()
          }));
          
          if (reason === 'io server disconnect') {
            // Server initiated disconnect, try to reconnect
            this.socket.connect();
          }
        });

        // Handle connection errors
        this.socket.on('connect_error', (error) => {
          console.error('❌ WebSocket connection error:', error);
          this.reconnectAttempts++;
          
          // Dispatch Redux action for connection error
          store.dispatch(connectionError({
            error: error.message || 'Connection failed',
            timestamp: new Date().toISOString()
          }));
          
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            safeToastError('Unable to connect to server. Please check your connection.');
            reject(new Error('Max reconnection attempts reached'));
          } else {
            const delay = Math.min(
              this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
              this.maxReconnectDelay
            );
            console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}, next in ${delay}ms`);
          }
        });

        // Handle reconnection attempts
        this.socket.on('reconnect_attempt', (attempt) => {
          console.log(`🔄 Reconnection attempt ${attempt}`);
          
          // Dispatch Redux action for connection attempting
          store.dispatch(connectionAttempting());
        });

        // Handle reconnection success
        this.socket.on('reconnect', (attempt) => {
          console.log(`✅ Reconnected after ${attempt} attempts`);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Dispatch Redux action for successful reconnection
          store.dispatch(connectionEstablished({
            socketId: this.socket.id,
            timestamp: new Date().toISOString()
          }));
          
          safeToastSuccess('Reconnected to server');
        });

        // Handle reconnection failure
        this.socket.on('reconnect_failed', () => {
          console.error('Failed to reconnect to WebSocket server');
          safeToastError('Disconnected from server. Please refresh the page to reconnect.');
        });

      } catch (error) {
        console.error('WebSocket initialization error:', error);
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectionPromise = null;
      this.isConnected = false;
    }
  }

  subscribe(event, callback) {
    if (!this.socket) {
      console.warn('Socket not connected. Call connect() first.');
      return () => {};
    }

    this.socket.on(event, callback);
    
    // Store the callback for later cleanup
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    this.subscribers.get(event).add(callback);

    // Return unsubscribe function
    return () => this.unsubscribe(event, callback);
  }

  unsubscribe(event, callback) {
    if (this.socket && this.subscribers.get(event)?.has(callback)) {
      this.socket.off(event, callback);
      this.subscribers.get(event).delete(callback);
    }
  }

  emit(event, data, callback) {
    if (!this.isConnected) {
      console.warn('Socket not connected. Message not sent:', event, data);
      return Promise.reject(new Error('Socket not connected'));
    }

    return new Promise((resolve, reject) => {
      this.socket.emit(event, data, (response) => {
        if (response?.error) {
          const error = new Error(response.error);
          error.data = response.data;
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  // Add typed event handling for TypeScript-like experience
  onEvent(event, handler) {
    return this.subscribe(event, handler);
  }

  // Add presence methods
  joinRoom(roomType, roomId) {
    if (!this.isConnected) {
      console.warn('Socket not connected, cannot join room');
      return Promise.reject(new Error('Socket not connected'));
    }
    
    return this.emit(ROOM_EVENTS.JOIN_ROOM, { roomType, roomId });
  }

  leaveRoom(roomType, roomId) {
    if (!this.isConnected) {
      return Promise.resolve();
    }
    
    return this.emit(ROOM_EVENTS.LEAVE_ROOM, { roomType, roomId });
  }

  // Add method to track orders using standardized events
  trackOrder(orderNumber, customerPhone) {
    if (!this.isConnected) {
      console.warn('Socket not connected, cannot track order');
      return Promise.reject(new Error('Socket not connected'));
    }
    
    return this.emit(ROOM_EVENTS.TRACK_ORDER, { orderNumber, customerPhone });
  }

  // Add event listener helper
  addEventListener(event, handler) {
    return this.subscribe(event, handler);
  }
}

// Create a singleton instance
export const socketService = new SocketService();

// Export a hook for React components
export const useSocket = () => {
  return socketService;
};

export default socketService;