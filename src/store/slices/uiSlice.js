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
import AuthService from '../../shared/auth/AuthService';
import simpleTokenService from '../../shared/auth/SimpleTokenService';
import dataService from '../../services/DataService';
import DashboardAnalyticsService from '../../services/DashboardAnalyticsService';
import logger from '../../services/LoggingService';
import multiTabAuthService from '../../shared/auth/MultiTabAuthService';
import { setSubscription } from './subscriptionSlice'; // Import subscription action

// ===== AUTH THUNKS =====

// Initialize authentication state from storage
export const initializeAuth = createAsyncThunk(
  'ui/initializeAuth',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      logger.info('Initializing authentication state from storage', {}, 'uiSlice');
      console.log('uiSlice: initializeAuth called');

      // Check if user is authenticated using simple token service
      const isAuthenticated = simpleTokenService.isAuthenticated();
      console.log('uiSlice initializeAuth: isAuthenticated check', { isAuthenticated });
      
      if (isAuthenticated) {
        const accessToken = simpleTokenService.getAccessToken();
        const refreshToken = simpleTokenService.getRefreshToken();
        const currentUser = simpleTokenService.getUserData();
        const businessEntity = simpleTokenService.getBusinessEntity();

        console.log('uiSlice initializeAuth: Found auth data', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          hasUserData: !!currentUser,
          hasBusinessEntity: !!businessEntity,
          userId: currentUser?.id,
          role: currentUser?.role
        });

        if (currentUser) {
          logger.info('Authentication state restored from storage', {
            userId: currentUser.id,
            role: currentUser.role,
            hasRefreshToken: !!refreshToken,
            hasBusinessEntity: !!businessEntity
          }, 'uiSlice');

          return {
            user: currentUser,
            accessToken,
            refreshToken,
            businessEntity,
            isAuthenticated: true
          };
        }
      } else {
        // If not authenticated, check if we have refresh tokens we can use
        const refreshToken = simpleTokenService.getRefreshToken();
        console.log('uiSlice initializeAuth: Token expired, checking for refresh token', { hasRefreshToken: !!refreshToken });
        
        if (refreshToken) {
          try {
            // Try to refresh the tokens
            console.log('uiSlice initializeAuth: Attempting to refresh tokens');
            const refreshResult = await dispatch(refreshTokens()).unwrap();
            console.log('uiSlice initializeAuth: Token refresh result', refreshResult);
            
            if (refreshResult && refreshResult.user) {
              return {
                user: refreshResult.user,
                accessToken: refreshResult.accessToken,
                refreshToken: refreshResult.refreshToken,
                businessEntity: refreshResult.businessEntity || null,
                isAuthenticated: true
              };
            }
          } catch (refreshError) {
            console.error('uiSlice initializeAuth: Token refresh failed', refreshError);
            // If refresh fails, clear tokens
            simpleTokenService.clearTokens();
          }
        }
      }

      // No fallback to legacy storage - use SimpleTokenService only
      const storedUser = null;
      const storedToken = null;
      const storedRefreshToken = null;

      if (storedUser && storedToken) {
        const user = JSON.parse(storedUser);
        logger.info('Authentication state restored from legacy storage', {
          userId: user.id,
          role: user.role,
          hasRefreshToken: !!storedRefreshToken
        }, 'uiSlice');

        return {
          user,
          accessToken: storedToken,
          refreshToken: storedRefreshToken,
          isAuthenticated: true
        };
      }

      logger.info('No authentication state found in storage', {}, 'uiSlice');
      console.log('uiSlice initializeAuth: No valid auth state found');
      return null;
    } catch (error) {
      console.error('uiSlice initializeAuth: Error during initialization', error);
      logger.error('Failed to initialize authentication state', error, 'uiSlice');
      return rejectWithValue(error.message);
    }
  }
);

// Login user
export const loginUser = createAsyncThunk(
  'ui/loginUser',
  async (credentials, { rejectWithValue, dispatch }) => {
    try {
      logger.info('Attempting user login', { username: credentials.username }, 'uiSlice');

      // Proceed with JWT authentication
      const data = await AuthService.authenticateAnyRole(credentials.username, credentials.password);

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
  async (_, { rejectWithValue, dispatch }) => {
    try {
      logger.info('Attempting to refresh JWT tokens', {}, 'uiSlice');
      console.log('uiSlice: refreshTokens called');

      const response = await AuthService.refreshAccessToken();

      // AuthService.refreshAccessToken now returns the full response with user data
      let userData = null;
      let accessToken = null;

      if (response && typeof response === 'object' && response.user) {
        // New format: response contains user data
        userData = response.user;
        accessToken = response.accessToken;

        // If user has subscription data, dispatch it to subscription slice
        if (userData.subscription) {
          const { setSubscription } = await import('./subscriptionSlice');
          dispatch(setSubscription(userData.subscription));
          logger.info('Token refresh: Dispatched subscription to Redux store', {
            userId: userData.id,
            subscriptionPlan: userData.subscription.planKey || userData.subscription.plan
          }, 'uiSlice');
        }
      } else {
        // Fallback: old format or just token
        accessToken = response;
        // Try to get user data from sessionStorage ONLY
        try {
          const storedUserData = sessionStorage.getItem('tableserve_user_data');
          if (storedUserData) {
            userData = JSON.parse(storedUserData);
          }
        } catch (error) {
          logger.warn('Failed to parse stored user data during token refresh', error, 'uiSlice');
        }
      }

      logger.info('JWT tokens refreshed successfully', { userId: userData?.id }, 'uiSlice');
      console.log('uiSlice: Tokens refreshed successfully', {
        hasUser: !!userData,
        hasAccessToken: !!accessToken,
        userId: userData?.id
      });

      return {
        user: userData,
        accessToken,
        refreshToken: AuthService.getStoredRefreshToken()
      };
    } catch (error) {
      console.error('uiSlice: Token refresh failed', error);
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

      // Call backend logout (don't wait for it to complete)
      AuthService.logout().catch(error => {
        logger.warn('Backend logout failed, but continuing with local logout', error);
      });

      logger.info('User logout successful', {}, 'uiSlice');
      return { success: true };
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
          stats = await dataService.getSystemStats();
          break;
        case 'restaurant_owner':
          // Use real-time analytics service to calculate dashboard stats
          stats = DashboardAnalyticsService.getRestaurantDashboardStats(user.restaurantId);
          
          // Get restaurant profile for additional info if needed
          const restaurantProfile = await dataService.getRestaurantProfile(user.restaurantId);
          if (restaurantProfile.success) {
            // Ensure only serializable data is stored in Redux state
            const profile = restaurantProfile.profile;
            stats.restaurantProfile = {
              ...profile,
              // Ensure menuCategories is serializable (not a Promise)
              menuCategories: Array.isArray(profile.menuCategories) ? profile.menuCategories : [],
              // Ensure analytics is serializable (not a Promise)
              analytics: profile.analytics && typeof profile.analytics === 'object' && !profile.analytics.then
                ? profile.analytics
                : { totalOrders: 0, totalRevenue: 0, averageRating: 0 }
            };
          }
          break;
        case 'zone_admin':
          try {
            if (user.zoneId) {
              stats = await dataService.getZoneProfile(user.zoneId);
            } else {
              // If user doesn't have a zoneId, provide default stats
              logger.warn('Zone admin user missing zoneId, using default stats', { userId: user.id }, 'uiSlice');
              stats = {
                success: true,
                profile: {
                  name: 'Zone Dashboard',
                  description: 'Please contact support to link your zone',
                  vendors: [],
                  analytics: { totalOrders: 0, totalRevenue: 0, activeVendors: 0 },
                  vendorCount: 0,
                  activeVendors: 0,
                  subscriptionLimits: { canAddVendors: false, maxVendors: 0 }
                }
              };
            }
          } catch (zoneStatsError) {
            logger.warn('Failed to fetch zone stats, using fallback', zoneStatsError, 'uiSlice');
            // Provide fallback stats if API call fails
            stats = {
              success: true,
              profile: {
                name: 'Zone Dashboard',
                description: 'Dashboard loaded with limited data',
                vendors: [],
                analytics: { totalOrders: 0, totalRevenue: 0, activeVendors: 0 },
                vendorCount: 0,
                activeVendors: 0,
                subscriptionLimits: { canAddVendors: true, maxVendors: 10 }
              }
            };
          }
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

// ===== HELPER FUNCTIONS =====

// Initialize auth state - no localStorage dependencies
const initializeAuthState = () => {
  console.log('uiSlice: Initializing auth state - server-side validation only');

  return {
    user: null,
    accessToken: null,
    refreshToken: null,
    businessEntity: null,
    isAuthenticated: false,
    error: null,
    loading: false,
    isLoggingOut: false,
  };
};

// ===== SLICE DEFINITION =====

const initialState = {
  // Auth state - initialize from localStorage
  auth: initializeAuthState(),
  
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
      console.log('uiSlice: setCredentials called', action.payload);
      state.auth.user = action.payload.user;
      state.auth.accessToken = action.payload.accessToken;
      state.auth.refreshToken = action.payload.refreshToken;
      state.auth.businessEntity = action.payload.businessEntity || null;
      state.auth.isAuthenticated = true;
      state.auth.error = null;
      console.log('uiSlice: Auth state updated', {
        userId: state.auth.user?.id,
        role: state.auth.user?.role,
        isAuthenticated: state.auth.isAuthenticated
      });
    },
    
    setBusinessOwner: (state, action) => {
      // Transition user to business owner mode
      const { businessType, businessId, subscription } = action.payload;
      
      if (state.auth.user) {
        state.auth.user = {
          ...state.auth.user,
          role: businessType === 'restaurant' ? 'restaurant_owner' : 'zone_admin',
          businessType,
          isBusinessOwner: true,
          ...(businessType === 'restaurant' && { restaurantId: businessId }),
          ...(businessType === 'zone' && { zoneId: businessId }),
          subscription,
          registrationComplete: true,
          onboardingComplete: true
        };
        state.auth.isAuthenticated = true;
      }
    },
    
    logout: (state) => {
      state.auth.user = null;
      state.auth.accessToken = null;
      state.auth.refreshToken = null;
      state.auth.businessEntity = null;
      state.auth.isAuthenticated = false;
      state.auth.error = null;

      // Clear dashboard data on logout
      state.dashboard.stats = null;
      state.dashboard.currentRole = null;

      // Clear any notifications
      state.notifications = [];

      // Clear sessionStorage ONLY (localStorage managed by SimpleTokenService)
      try {
        sessionStorage.clear();
      } catch (error) {
        console.warn('Failed to clear sessionStorage:', error);
      }

      // Broadcast logout to other tabs (but prevent loops)
      if (!state.auth.isLoggingOut) {
        state.auth.isLoggingOut = true;
        multiTabAuthService.broadcastLogout();
        // Reset flag after a short delay
        setTimeout(() => {
          state.auth.isLoggingOut = false;
        }, 100);
      }

      console.log('uiSlice: Authentication cleared');
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
      // Initialize Auth
      .addCase(initializeAuth.pending, (state) => {
        state.auth.loading = true;
        state.auth.error = null;
        console.log('uiSlice: initializeAuth pending');
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.auth.loading = false;
        console.log('uiSlice: initializeAuth.fulfilled', action.payload);
        if (action.payload) {
          state.auth.user = action.payload.user;
          state.auth.accessToken = action.payload.accessToken;
          state.auth.refreshToken = action.payload.refreshToken;
          state.auth.businessEntity = action.payload.businessEntity || null;
          state.auth.isAuthenticated = action.payload.isAuthenticated;
          state.auth.error = null;

          logger.info('Authentication state initialized successfully', {
            userId: action.payload.user?.id,
            role: action.payload.user?.role
          }, 'uiSlice');
          
          console.log('uiSlice: Auth state initialized', {
            userId: state.auth.user?.id,
            role: state.auth.user?.role,
            isAuthenticated: state.auth.isAuthenticated
          });
        } else {
          // No authentication state found
          state.auth.isAuthenticated = false;
          state.auth.user = null;
          state.auth.accessToken = null;
          state.auth.refreshToken = null;
          state.auth.businessEntity = null;
          console.log('uiSlice: No auth state found during initialization');
        }
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.auth.loading = false;
        state.auth.error = action.payload;
        state.auth.isAuthenticated = false;
        state.auth.user = null;
        state.auth.accessToken = null;
        state.auth.refreshToken = null;
        state.auth.businessEntity = null;

        console.error('uiSlice: initializeAuth rejected', action.payload);
        logger.error('Failed to initialize authentication state', action.payload, 'uiSlice');
      })

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
        state.auth.businessEntity = action.payload.businessEntity || null;
        state.auth.isAuthenticated = true;
        state.auth.error = null;

        // Note: User data storage is handled by SimpleTokenService in AuthService
        console.log('uiSlice: Login successful, user authenticated:', {
          userId: action.payload.user.id,
          role: action.payload.user.role,
          hasTokens: !!(action.payload.accessToken && action.payload.refreshToken),
          hasBusinessEntity: !!action.payload.businessEntity
        });

        // Add login success notification
        state.notifications.unshift({
          id: Date.now(),
          type: 'success',
          title: 'Login Successful',
          message: `Welcome back, ${action.payload.user.name || action.payload.user.username || action.payload.user.email}!`,
          timestamp: new Date().toISOString(),
          read: false,
        });

        // Subscription data will be fetched real-time from backend via Redux thunks
        // No localStorage storage needed - Login component will dispatch fetchCurrentSubscription
        if (action.payload.user.subscription) {
          console.log('uiSlice: User has subscription, will be fetched real-time from backend');
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.auth.loading = false;

        // Ensure error is always a string
        let errorMessage = 'Invalid credentials';
        if (typeof action.payload === 'string') {
          errorMessage = action.payload;
        } else if (action.payload && typeof action.payload === 'object') {
          errorMessage = action.payload.message || action.payload.error || errorMessage;
        }

        state.auth.error = errorMessage;

        // Add login error notification
        state.notifications.unshift({
          id: Date.now(),
          type: 'error',
          title: 'Login Failed',
          message: errorMessage,
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

        // Ensure stats are serializable (no Promises)
        const stats = action.payload.stats;
        if (stats && typeof stats === 'object') {
          // Deep clean the stats object to remove any Promises
          const cleanStats = JSON.parse(JSON.stringify(stats, (key, value) => {
            // Remove any Promise objects
            if (value && typeof value === 'object' && value.then) {
              return null;
            }
            return value;
          }));

          state.dashboard.stats = cleanStats;
        } else {
          state.dashboard.stats = null;
        }

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
        console.log('uiSlice: refreshTokens pending');
      })
      .addCase(refreshTokens.fulfilled, (state, action) => {
        state.auth.loading = false;
        state.auth.user = action.payload.user;
        state.auth.accessToken = action.payload.accessToken;
        state.auth.refreshToken = action.payload.refreshToken;
        state.auth.businessEntity = action.payload.businessEntity || null;
        state.auth.isAuthenticated = true;
        state.auth.error = null;
        
        console.log('uiSlice: refreshTokens fulfilled', {
          userId: action.payload.user?.id,
          hasTokens: !!(action.payload.accessToken && action.payload.refreshToken)
        });

        // If user has subscription data, preserve it in Redux store
        if (action.payload.user && action.payload.user.subscription) {
          logger.info('Token refresh: Preserving subscription data', {
            userId: action.payload.user.id,
            subscriptionPlan: action.payload.user.subscription.planKey || action.payload.user.subscription.plan
          }, 'uiSlice');
        }
      })
      .addCase(refreshTokens.rejected, (state, action) => {
        state.auth.loading = false;
        state.auth.user = null;
        state.auth.accessToken = null;
        state.auth.refreshToken = null;
        state.auth.isAuthenticated = false;
        state.auth.error = action.payload;
        
        console.log('uiSlice: refreshTokens rejected', action.payload);
        
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
        state.auth.businessEntity = null;
        state.auth.isAuthenticated = false;
        state.auth.error = null;
        state.auth.loading = false;
        state.auth.isLoggingOut = false;

        // Clear dashboard data on logout
        state.dashboard.stats = null;
        state.dashboard.currentRole = null;

        // Clear notifications
        state.notifications = [];

        // Clear localStorage tokens
        try {
          localStorage.removeItem('tableserve_access_token');
          localStorage.removeItem('tableserve_refresh_token');
          localStorage.removeItem('tableserve_user_data');
          localStorage.removeItem('tableserve_business_entity');
          sessionStorage.clear();
        } catch (error) {
          console.warn('Failed to clear localStorage:', error);
        }

        // Broadcast logout to other tabs
        multiTabAuthService.broadcastLogout();

        console.log('uiSlice: Logout completed - tokens cleared from storage');

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
  setBusinessOwner,
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