import { createSlice } from '@reduxjs/toolkit';

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: [],
    total: 0,
    tableNumber: null,
    restaurantId: null,
  },
  reducers: {
    addItem: (state, action) => {
      const { item, quantity = 1 } = action.payload;
      const existingItem = state.items.find(cartItem => cartItem.id === item.id);
      
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        state.items.push({ ...item, quantity });
      }
      
      state.total = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },
    removeItem: (state, action) => {
      const itemId = action.payload;
      state.items = state.items.filter(item => item.id !== itemId);
      state.total = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },
    updateQuantity: (state, action) => {
      const { itemId, quantity } = action.payload;
      const item = state.items.find(item => item.id === itemId);
      
      if (item) {
        if (quantity <= 0) {
          state.items = state.items.filter(item => item.id !== itemId);
        } else {
          item.quantity = quantity;
        }
      }
      
      state.total = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },
    clearCart: (state) => {
      state.items = [];
      state.total = 0;
    },
    setTableInfo: (state, action) => {
      const { tableNumber, restaurantId } = action.payload;
      state.tableNumber = tableNumber;
      state.restaurantId = restaurantId;
    },
  },
});

export const { addItem, removeItem, updateQuantity, clearCart, setTableInfo } = cartSlice.actions;
export default cartSlice.reducer;