import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const createOrder = createAsyncThunk(
  'order/createOrder',
  async (orderData) => {
    // Simulate a successful order creation by adding a unique ID
    const newOrder = { ...orderData, id: Date.now() };
    return newOrder;
  }
);

export const updateOrderStatus = createAsyncThunk(
  'order/updateOrderStatus',
  async ({ orderId, status }) => {
    // Simulate a successful status update
    return { id: orderId, status };
  }
);

const orderSlice = createSlice({
  name: 'order',
  initialState: {
    currentOrder: null,
    orders: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
    },
    updateOrderStatusLocal: (state, action) => {
      const { orderId, status } = action.payload;
      const order = state.orders.find(order => order.id === orderId);
      if (order) {
        order.status = status;
      }
      if (state.currentOrder && state.currentOrder.id === orderId) {
        state.currentOrder.status = status;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createOrder.fulfilled, (state, action) => {
        state.currentOrder = action.payload;
        state.orders.push(action.payload);
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        const updatedOrder = action.payload;
        const index = state.orders.findIndex(order => order.id === updatedOrder.id);
        if (index !== -1) {
          state.orders[index] = updatedOrder;
        }
        if (state.currentOrder && state.currentOrder.id === updatedOrder.id) {
          state.currentOrder = updatedOrder;
        }
      });
  },
});

export const { clearCurrentOrder, updateOrderStatusLocal } = orderSlice.actions;
export default orderSlice.reducer;