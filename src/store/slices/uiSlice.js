/**
 * Unified UI Slice for TableServe Application
 * 
 * Consolidates the following slices:
 * - authSlice (user authentication and session management)
 * - themeSlice (UI theme and appearance)
 * - dashboardSlice (dashboard statistics and data)
 * 
 * This reduces 3 slices to 1 unified UI state management slice
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import AuthService from '../../services/AuthService';
import JWTTokenService from '../../services/JWTTokenService';
import dataService from '../../services/DataService';
import DashboardAnalyticsService from '../../services/DashboardAnalyticsService';
import logger from '../../services/LoggingService';
import { setSubscription } from './subscriptionSlice'; // Import subscription action

// ===== AUTH THUNKS =====

// Login user
export const loginUser = createAsyncThunk(
  'ui/loginUser',
  async (credentials, { rejectWithValue, dispatch }) => {
    try {
      logger.info('Attempting user login', { username: credentials.username }, 'uiSlice');
      
      const data = AuthService.authenticateAnyRole(credentials.username, credentials.password);
      
      if (data && data.user) {
        logger.info('User login successful', { 
          userId: data.user.id, 
          role: data.user.role,
          hasSubscription: !!data.user.subscription
        }, 'uiSlice');
        
        // If user has subscription data, dispatch it to subscription slice
        if (data.user.subscription) {
          dispatch(setSubscription(data.user.subscription));
          console.log('uiSlice: Dispatched subscription to Redux store:', data.user.subscription);
        }
        
        return data;
      } else {
        throw new Error('Invalid login response');
      }
    } catch (error) {
      logger.error('User login failed', error, 'uiSlice');
      return rejectWithValue(error.message);
    }
  }
);

// Refresh JWT tokens
export const refreshTokens = createAsyncThunk(
  'ui/refreshTokens',
  async (_, { rejectWithValue }) => {
    try {
      logger.info('Attempting to refresh JWT tokens', {}, 'uiSlice');
      
      const result = await AuthService.refreshTokens();
      if (result.success) {
        const currentUser = JWTTokenService.getCurrentUser();
        logger.info('JWT tokens refreshed successfully', { userId: currentUser?.id }, 'uiSlice');
        
        return {
          user: currentUser,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken
        };
      } else {
        throw new Error(result.error || 'Token refresh failed');
      }
    } catch (error) {
      logger.error('JWT token refresh failed', error, 'uiSlice');
      return rejectWithValue(error.message);
    }
  }
);

// Logout user and clear JWT tokens
export const logoutUser = createAsyncThunk(
  'ui/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      logger.info('Attempting user logout', {}, 'uiSlice');
      
      const result = AuthService.logout();
      if (result.success) {
        logger.info('User logout successful', {}, 'uiSlice');
        return { success: true };
      } else {
        throw new Error(result.error || 'Logout failed');
      }
    } catch (error) {
      logger.error('User logout failed', error, 'uiSlice');
      return rejectWithValue(error.message);
    }
  }
);

// ===== DASHBOARD THUNKS =====

// Fetch dashboard statistics
export const fetchDashboardStats = createAsyncThunk(
  'ui/fetchDashboardStats',
  async (role, { getState, rejectWithValue }) => {
    try {
      const { ui } = getState();
      const user = ui.auth.user;
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      let stats;
      switch (role) {
        case 'admin':
          stats = dataService.getSystemStats();
          break;
        case 'restaurant_owner':
          // Use real-time analytics service to calculate dashboard stats
          stats = DashboardAnalyticsService.getRestaurantDashboardStats(user.restaurantId);
          
          // Get restaurant profile for additional info if needed
          const restaurantProfile = await dataService.getRestaurantProfile(user.restaurantId);
          if (restaurantProfile.success) {
            stats.restaurantProfile = restaurantProfile.profile;
          }
          break;
        case 'zone_admin':
          stats = await dataService.getZoneProfile(user.zoneId);
          break;
        case 'zone_shop':
        case 'zone_vendor':
          // Get vendor-specific stats
          stats = {
            totalOrders: 0,
            todayOrders: 0,
            monthlyRevenue: 0,
            averageRating: 0,
            vendorInfo: user
          };
          break;
        default:
          throw new Error(`Invalid role for dashboard stats: ${role}`);
      }
      
      logger.info('Dashboard stats fetched', { role, hasStats: !!stats }, 'uiSlice');
      return { role, stats };
    } catch (error) {
      logger.error('Failed to fetch dashboard stats', error, 'uiSlice');
      return rejectWithValue(error.message);
    }
  }
);

// ===== SLICE DEFINITION =====

const initialState = {
  // Auth state
  auth: {
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    error: null,
    loading: false,
  },
  
  // Theme state
  theme: {
    mode: 'dark',
    isTransitioning: false,
  },
  
  // Dashboard state
  dashboard: {
    stats: null,
    loading: false,
    error: null,
    lastFetchTime: null,
    currentRole: null,
  },
  
  // General UI state
  notifications: [],
  modals: {
    isOpen: false,
    type: null,
    data: null,
  },
  loading: {
    global: false,
    operations: {},
  },
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // ===== AUTH ACTIONS =====
    setCredentials: (state, action) => {
      state.auth.user = action.payload.user;
      state.auth.accessToken = action.payload.accessToken;
      state.auth.refreshToken = action.payload.refreshToken;
      state.auth.isAuthenticated = true;
      state.auth.error = null;
    },
    
    logout: (state) => {
      state.auth.user = null;
      state.auth.accessToken = null;
      state.auth.refreshToken = null;
      state.auth.isAuthenticated = false;
      state.auth.error = null;
      
      // Clear dashboard data on logout
      state.dashboard.stats = null;
      state.dashboard.currentRole = null;
      
      // Clear any notifications
      state.notifications = [];
    },
    
    setAuthError: (state, action) => {
      state.auth.error = action.payload;
    },
    
    clearAuthError: (state) => {
      state.auth.error = null;
    },
    
    // NEW: Update user subscription after upgrade
    updateUserSubscription: (state, action) => {
      if (state.auth.user) {
        state.auth.user.subscription = action.payload.subscription;
        state.auth.user.subscriptionPlan = action.payload.subscription.key;
        console.log('uiSlice: Updated user subscription in auth state:', action.payload.subscription);
      }
    },
    
    // ===== THEME ACTIONS =====
    setTheme: (state, action) => {
      const theme = action.payload === 'light' ? 'light' : 'dark';
      state.theme.mode = theme;
      
      // Apply to document and persist
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(theme);
        localStorage.setItem('tableserve-theme', theme);
      }
    },
    
    toggleTheme: (state) => {
      const newMode = state.theme.mode === 'dark' ? 'light' : 'dark';
      state.theme.mode = newMode;
      state.theme.isTransitioning = true;
      
      // Apply to document and persist
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(newMode);
        localStorage.setItem('tableserve-theme', newMode);
      }
    },
    
    finishThemeTransition: (state) => {
      state.theme.isTransitioning = false;
    },
    
    initializeTheme: (state) => {
      if (typeof localStorage !== 'undefined') {
        const savedTheme = localStorage.getItem('tableserve-theme') || 'dark';
        state.theme.mode = savedTheme;
        
        if (typeof document !== 'undefined') {
          document.documentElement.classList.remove('light', 'dark');
          document.documentElement.classList.add(savedTheme);
        }
      }
    },
    
    // ===== DASHBOARD ACTIONS =====
    clearDashboardError: (state) => {
      state.dashboard.error = null;
    },
    
    updateDashboardStats: (state, action) => {
      state.dashboard.stats = { ...state.dashboard.stats, ...action.payload };
    },
    
    // ===== NOTIFICATION ACTIONS =====
    addNotification: (state, action) => {
      const notification = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        ...action.payload,
      };
      state.notifications.unshift(notification);
      
      // Keep only the last 50 notifications
      if (state.notifications.length > 50) {
        state.notifications = state.notifications.slice(0, 50);
      }
    },
    
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(
        notification => notification.id !== action.payload
      );
    },
    
    clearAllNotifications: (state) => {
      state.notifications = [];
    },
    
    markNotificationAsRead: (state, action) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification) {
        notification.read = true;
      }
    },
    
    // ===== MODAL ACTIONS =====
    openModal: (state, action) => {
      state.modals.isOpen = true;
      state.modals.type = action.payload.type;
      state.modals.data = action.payload.data || null;
    },
    
    closeModal: (state) => {
      state.modals.isOpen = false;
      state.modals.type = null;
      state.modals.data = null;
    },
    
    // ===== LOADING ACTIONS =====
    setGlobalLoading: (state, action) => {
      state.loading.global = action.payload;
    },
    
    setOperationLoading: (state, action) => {
      const { operation, loading } = action.payload;
      if (loading) {
        state.loading.operations[operation] = true;
      } else {
        delete state.loading.operations[operation];
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Login User
      .addCase(loginUser.pending, (state) => {
        state.auth.loading = true;
        state.auth.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.auth.loading = false;
        state.auth.user = action.payload.user;
        state.auth.accessToken = action.payload.accessToken;
        state.auth.refreshToken = action.payload.refreshToken;
        state.auth.isAuthenticated = true;
        state.auth.error = null;
        
        // Add login success notification
        state.notifications.unshift({
          id: Date.now(),
          type: 'success',
          title: 'Login Successful',
          message: `Welcome back, ${action.payload.user.name}!`,
          timestamp: new Date().toISOString(),
          read: false,
        });
        
        // Set subscription data in localStorage for usePlanRestrictions hook
        if (action.payload.user.subscription) {
          try {
            localStorage.setItem('tableserve_subscription', JSON.stringify(action.payload.user.subscription));
            console.log('uiSlice: Stored user subscription to localStorage:', action.payload.user.subscription);
            
            // Also dispatch to subscription slice for immediate Redux state sync
            // Note: We can't directly dispatch here due to circular dependency, but the Login component will handle this
            console.log('uiSlice: User subscription will be synced to Redux by Login component');
          } catch (error) {
            console.warn('uiSlice: Failed to store subscription to localStorage:', error);
          }
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.auth.loading = false;
        state.auth.error = action.payload;
        
        // Add login error notification
        state.notifications.unshift({
          id: Date.now(),
          type: 'error',
          title: 'Login Failed',
          message: action.payload || 'Invalid credentials',
          timestamp: new Date().toISOString(),
          read: false,
        });
      })
      
      // Fetch Dashboard Stats
      .addCase(fetchDashboardStats.pending, (state) => {
        state.dashboard.loading = true;
        state.dashboard.error = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.dashboard.loading = false;
        state.dashboard.stats = action.payload.stats;
        state.dashboard.currentRole = action.payload.role;
        state.dashboard.lastFetchTime = new Date().toISOString();
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.dashboard.loading = false;
        state.dashboard.error = action.payload;
        
        // Add dashboard error notification
        state.notifications.unshift({
          id: Date.now(),
          type: 'error',
          title: 'Dashboard Error',
          message: 'Failed to load dashboard statistics',
          timestamp: new Date().toISOString(),
          read: false,
        });
      })
      
      // Refresh Tokens
      .addCase(refreshTokens.pending, (state) => {
        state.auth.loading = true;
      })
      .addCase(refreshTokens.fulfilled, (state, action) => {
        state.auth.loading = false;
        state.auth.user = action.payload.user;
        state.auth.accessToken = action.payload.accessToken;
        state.auth.refreshToken = action.payload.refreshToken;
        state.auth.isAuthenticated = true;
        state.auth.error = null;
      })
      .addCase(refreshTokens.rejected, (state, action) => {
        state.auth.loading = false;
        state.auth.user = null;
        state.auth.accessToken = null;
        state.auth.refreshToken = null;
        state.auth.isAuthenticated = false;
        state.auth.error = action.payload;
        
        // Add token refresh error notification
        state.notifications.unshift({
          id: Date.now(),
          type: 'warning',
          title: 'Session Expired',
          message: 'Please log in again to continue',
          timestamp: new Date().toISOString(),
          read: false,
        });
      })
      
      // Logout User
      .addCase(logoutUser.fulfilled, (state) => {
        state.auth.user = null;
        state.auth.accessToken = null;
        state.auth.refreshToken = null;
        state.auth.isAuthenticated = false;
        state.auth.error = null;
        state.auth.loading = false;
        
        // Clear dashboard data on logout
        state.dashboard.stats = null;
        state.dashboard.currentRole = null;
        
        // Clear notifications
        state.notifications = [];
        
        // Add logout success notification
        state.notifications.unshift({
          id: Date.now(),
          type: 'info',
          title: 'Logged Out',
          message: 'You have been successfully logged out',
          timestamp: new Date().toISOString(),
          read: false,
        });
      });
  },
});

// ===== ACTIONS =====
export const {
  // Auth actions
  setCredentials,
  logout,
  setAuthError,
  clearAuthError,
  updateUserSubscription,
  
  // Theme actions
  setTheme,
  toggleTheme,
  finishThemeTransition,
  initializeTheme,
  
  // Dashboard actions
  clearDashboardError,
  updateDashboardStats,
  
  // Notification actions
  addNotification,
  removeNotification,
  clearAllNotifications,
  markNotificationAsRead,
  
  // Modal actions
  openModal,
  closeModal,
  
  // Loading actions
  setGlobalLoading,
  setOperationLoading,
} = uiSlice.actions;

// ===== SELECTORS =====

// Auth selectors
export const selectAuth = (state) => state.ui.auth;
export const selectUser = (state) => state.ui.auth.user;
export const selectIsAuthenticated = (state) => state.ui.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.ui.auth.loading;
export const selectAuthError = (state) => state.ui.auth.error;

// Theme selectors
export const selectTheme = (state) => state.ui.theme.mode;
export const selectIsThemeTransitioning = (state) => state.ui.theme.isTransitioning;

// Dashboard selectors
export const selectDashboard = (state) => state.ui.dashboard;
export const selectDashboardStats = (state) => state.ui.dashboard.stats;
export const selectDashboardLoading = (state) => state.ui.dashboard.loading;
export const selectDashboardError = (state) => state.ui.dashboard.error;

// Notification selectors
export const selectNotifications = (state) => state.ui.notifications;
export const selectUnreadNotifications = createSelector(
  [selectNotifications],
  (notifications) => notifications.filter(n => !n.read)
);
export const selectUnreadNotificationCount = createSelector(
  [selectUnreadNotifications],
  (unreadNotifications) => unreadNotifications.length
);

// Modal selectors
export const selectModal = (state) => state.ui.modals;
export const selectIsModalOpen = (state) => state.ui.modals.isOpen;

// Loading selectors
export const selectGlobalLoading = (state) => state.ui.loading.global;
export const selectOperationLoading = (state, operation) => 
  Boolean(state.ui.loading.operations[operation]);
export const selectAnyOperationLoading = createSelector(
  [(state) => state.ui.loading.operations],
  (operations) => Object.keys(operations).length > 0
);

// Combined selectors
export const selectUserRole = createSelector(
  [selectUser],
  (user) => user?.role
);

export const selectUserEntity = createSelector(
  [selectUser],
  (user) => {
    if (!user) return null;
    
    return {
      id: user.restaurantId || user.zoneId || user.shopId,
      type: user.role === 'restaurant_owner' ? 'restaurant' : 
            user.role === 'zone_admin' ? 'zone' : 'shop',
    };
  }
);

export const selectIsLoading = createSelector(
  [selectAuthLoading, selectDashboardLoading, selectGlobalLoading, (state) => state.ui.loading.operations],
  (authLoading, dashboardLoading, globalLoading, operations) => 
    authLoading || 
    dashboardLoading || 
    globalLoading ||
    Object.keys(operations).length > 0
);

export default uiSlice.reducer;