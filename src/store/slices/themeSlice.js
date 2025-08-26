import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  mode: 'dark',
  isTransitioning: false,
};

export const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme: (state, action) => {
      const theme = action.payload === 'light' ? 'light' : 'dark';
      state.mode = theme;
      // Apply to document and persist
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
      localStorage.setItem('tableserve-theme', theme);
    },
    toggleTheme: (state) => {
      const newMode = state.mode === 'dark' ? 'light' : 'dark';
      state.mode = newMode;
      state.isTransitioning = true;
      // Apply to document and persist
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(newMode);
      localStorage.setItem('tableserve-theme', newMode);
    },
    finishTransition: (state) => {
      state.isTransitioning = false;
    },
    initializeTheme: (state) => {
      const savedTheme = localStorage.getItem('tableserve-theme') || 'dark';
      state.mode = savedTheme;
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(savedTheme);
    },
  },
});

export const { setTheme, toggleTheme, finishTransition, initializeTheme } = themeSlice.actions;

export const selectTheme = (state) => state.theme.mode;
export const selectIsTransitioning = (state) => state.theme.isTransitioning;

export default themeSlice.reducer;
