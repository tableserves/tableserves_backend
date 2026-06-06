import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Connection state
  connectionStatus: 'disconnected', // 'disconnected' | 'connecting' | 'connected' | 'error'
  isConnected: false,
  connectionTime: null,
  lastDisconnect: null,
  socketId: null,
  
  // Subscribed rooms
  subscribedRooms: [],
  
  // Connection metrics
  metrics: {
    latency: 0,
    averageLatency: 0,
    reconnections: 0,
    messagesReceived: 0,
    messagesSent: 0,
    uptime: 0
  },
  
  // Real-time updates
  lastUpdate: null,
  updateCount: 0,
  
  // Error tracking
  connectionErrors: [],
  lastError: null,
  
  // User presence
  connectedUsers: [],
  userRooms: {},
  
  // Notifications
  notifications: [],
  unreadNotifications: 0
};

export const realtimeSlice = createSlice({
  name: 'realtime',
  initialState,
  reducers: {
    // Connection state management
    connectionEstablished: (state, action) => {
      const { socketId, timestamp } = action.payload;
      state.connectionStatus = 'connected';
      state.isConnected = true;
      state.connectionTime = timestamp;
      state.socketId = socketId;
      state.metrics.reconnections += state.connectionTime ? 1 : 0;
      state.lastError = null;
    },
    
    connectionLost: (state, action) => {
      const { reason, timestamp } = action.payload || {};
      state.connectionStatus = 'disconnected';
      state.isConnected = false;
      state.lastDisconnect = timestamp || new Date().toISOString();
      state.socketId = null;
      state.subscribedRooms = [];
      
      if (reason && reason !== 'io client disconnect') {
        state.lastError = reason;
        state.connectionErrors.push({
          error: reason,
          timestamp: timestamp || new Date().toISOString()
        });
        
        // Keep only last 10 errors
        if (state.connectionErrors.length > 10) {
          state.connectionErrors.shift();
        }
      }
    },
    
    connectionAttempting: (state) => {
      state.connectionStatus = 'connecting';
      state.isConnected = false;
    },
    
    connectionError: (state, action) => {
      const { error, timestamp } = action.payload;
      state.connectionStatus = 'error';
      state.isConnected = false;
      state.lastError = error;
      state.connectionErrors.push({
        error,
        timestamp: timestamp || new Date().toISOString()
      });
      
      // Keep only last 10 errors
      if (state.connectionErrors.length > 10) {
        state.connectionErrors.shift();
      }
    },
    
    // Room management
    roomSubscribed: (state, action) => {
      const { roomType, roomId } = action.payload;
      const roomKey = `${roomType}_${roomId}`;
      
      if (!state.subscribedRooms.includes(roomKey)) {
        state.subscribedRooms.push(roomKey);
      }
    },
    
    roomUnsubscribed: (state, action) => {
      const { roomType, roomId } = action.payload;
      const roomKey = `${roomType}_${roomId}`;
      
      state.subscribedRooms = state.subscribedRooms.filter(room => room !== roomKey);
    },
    
    // Metrics tracking
    messageReceived: (state, action) => {
      const { type, timestamp } = action.payload || {};
      state.metrics.messagesReceived += 1;
      state.lastUpdate = timestamp || new Date().toISOString();
      state.updateCount += 1;
    },
    
    messageSent: (state, action) => {
      const { type } = action.payload || {};
      state.metrics.messagesSent += 1;
    },
    
    latencyUpdated: (state, action) => {
      const { latency } = action.payload;
      state.metrics.latency = latency;
      state.metrics.averageLatency = state.metrics.averageLatency === 0 
        ? latency 
        : Math.round((state.metrics.averageLatency + latency) / 2);
    },
    
    uptimeUpdated: (state, action) => {
      const { uptime } = action.payload;
      state.metrics.uptime = uptime;
    },
    
    // User presence management
    userJoined: (state, action) => {
      const { userId, userInfo, roomName } = action.payload;
      
      // Add or update user in connected users
      const existingUserIndex = state.connectedUsers.findIndex(user => user.userId === userId);
      if (existingUserIndex !== -1) {
        state.connectedUsers[existingUserIndex] = { userId, ...userInfo };
      } else {
        state.connectedUsers.push({ userId, ...userInfo });
      }
      
      // Track user room membership
      if (roomName) {
        if (!state.userRooms[userId]) {
          state.userRooms[userId] = [];
        }
        if (!state.userRooms[userId].includes(roomName)) {
          state.userRooms[userId].push(roomName);
        }
      }
    },
    
    userLeft: (state, action) => {
      const { userId, roomName } = action.payload;
      
      if (roomName) {
        // Remove from specific room
        if (state.userRooms[userId]) {
          state.userRooms[userId] = state.userRooms[userId].filter(room => room !== roomName);
          
          // Remove user entirely if no rooms left
          if (state.userRooms[userId].length === 0) {
            delete state.userRooms[userId];
            state.connectedUsers = state.connectedUsers.filter(user => user.userId !== userId);
          }
        }
      } else {
        // Remove user entirely
        delete state.userRooms[userId];
        state.connectedUsers = state.connectedUsers.filter(user => user.userId !== userId);
      }
    },
    
    // Notification management
    notificationReceived: (state, action) => {
      const notification = action.payload;
      
      state.notifications.unshift({
        ...notification,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        read: false
      });
      
      state.unreadNotifications += 1;
      
      // Keep only last 50 notifications
      if (state.notifications.length > 50) {
        state.notifications = state.notifications.slice(0, 50);
      }
    },
    
    notificationRead: (state, action) => {
      const { notificationId } = action.payload;
      
      const notification = state.notifications.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadNotifications = Math.max(0, state.unreadNotifications - 1);
      }
    },
    
    allNotificationsRead: (state) => {
      state.notifications.forEach(notification => {
        notification.read = true;
      });
      state.unreadNotifications = 0;
    },
    
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadNotifications = 0;
    },
    
    // System announcements
    systemAnnouncement: (state, action) => {
      const announcement = action.payload;
      
      state.notifications.unshift({
        ...announcement,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        type: 'system',
        read: false
      });
      
      state.unreadNotifications += 1;
    },
    
    // Reset state
    resetRealtime: (state) => {
      return initialState;
    },
    
    // Update multiple metrics at once
    updateMetrics: (state, action) => {
      const metrics = action.payload;
      state.metrics = { ...state.metrics, ...metrics };
    }
  }
});

export const {
  connectionEstablished,
  connectionLost,
  connectionAttempting,
  connectionError,
  roomSubscribed,
  roomUnsubscribed,
  messageReceived,
  messageSent,
  latencyUpdated,
  uptimeUpdated,
  userJoined,
  userLeft,
  notificationReceived,
  notificationRead,
  allNotificationsRead,
  clearNotifications,
  systemAnnouncement,
  resetRealtime,
  updateMetrics
} = realtimeSlice.actions;

// Selectors
export const selectRealtimeState = (state) => state.realtime;
export const selectConnectionStatus = (state) => state.realtime.connectionStatus;
export const selectIsConnected = (state) => state.realtime.isConnected;
export const selectSubscribedRooms = (state) => state.realtime.subscribedRooms;
export const selectMetrics = (state) => state.realtime.metrics;
export const selectNotifications = (state) => state.realtime.notifications;
export const selectUnreadNotifications = (state) => state.realtime.unreadNotifications;
export const selectConnectedUsers = (state) => state.realtime.connectedUsers;
export const selectConnectionErrors = (state) => state.realtime.connectionErrors;

export default realtimeSlice.reducer;