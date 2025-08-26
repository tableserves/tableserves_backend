import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunks for activity logging
export const logActivity = createAsyncThunk(
  'activity/logActivity',
  async (activityData, { rejectWithValue }) => {
    try {
      // In a real app, this would send to an API endpoint
      const activity = {
        id: Date.now().toString(),
        ...activityData,
        timestamp: activityData.timestamp || new Date().toISOString(),
        ip: '192.168.1.1', // Would be actual IP
        userAgent: navigator.userAgent
      };

      // Store in localStorage for demo purposes
      const existingLogs = JSON.parse(localStorage.getItem('adminActivityLogs') || '[]');
      const updatedLogs = [activity, ...existingLogs].slice(0, 1000); // Keep last 1000 logs
      localStorage.setItem('adminActivityLogs', JSON.stringify(updatedLogs));

      return activity;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchActivityLogs = createAsyncThunk(
  'activity/fetchActivityLogs',
  async ({ page = 1, limit = 50, filter = 'all' }, { rejectWithValue }) => {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 300));

      const allLogs = JSON.parse(localStorage.getItem('adminActivityLogs') || '[]');
      
      // Apply filters
      let filteredLogs = allLogs;
      if (filter !== 'all') {
        filteredLogs = allLogs.filter(log => log.action.toLowerCase().includes(filter.toLowerCase()));
      }

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

      return {
        logs: paginatedLogs,
        total: filteredLogs.length,
        page,
        totalPages: Math.ceil(filteredLogs.length / limit)
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const clearActivityLogs = createAsyncThunk(
  'activity/clearActivityLogs',
  async (_, { rejectWithValue }) => {
    try {
      localStorage.removeItem('adminActivityLogs');
      return [];
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const activitySlice = createSlice({
  name: 'activity',
  initialState: {
    logs: [],
    recentActivity: [],
    loading: false,
    error: null,
    pagination: {
      page: 1,
      totalPages: 1,
      total: 0
    },
    filters: {
      action: 'all',
      dateRange: '7d'
    }
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    addRecentActivity: (state, action) => {
      state.recentActivity = [action.payload, ...state.recentActivity].slice(0, 10);
    },
    clearRecentActivity: (state) => {
      state.recentActivity = [];
    }
  },
  extraReducers: (builder) => {
    builder
      // Log Activity
      .addCase(logActivity.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(logActivity.fulfilled, (state, action) => {
        state.loading = false;
        state.recentActivity = [action.payload, ...state.recentActivity].slice(0, 10);
      })
      .addCase(logActivity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch Activity Logs
      .addCase(fetchActivityLogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActivityLogs.fulfilled, (state, action) => {
        state.loading = false;
        state.logs = action.payload.logs;
        state.pagination = {
          page: action.payload.page,
          totalPages: action.payload.totalPages,
          total: action.payload.total
        };
      })
      .addCase(fetchActivityLogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Clear Activity Logs
      .addCase(clearActivityLogs.fulfilled, (state) => {
        state.logs = [];
        state.recentActivity = [];
        state.pagination = {
          page: 1,
          totalPages: 1,
          total: 0
        };
      });
  }
});

export const { 
  clearError, 
  setFilters, 
  addRecentActivity, 
  clearRecentActivity 
} = activitySlice.actions;

export default activitySlice.reducer;
