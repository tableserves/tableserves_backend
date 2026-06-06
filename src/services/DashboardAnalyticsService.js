/**
 * Dashboard Analytics Service - Real-time calculation of dashboard statistics
 * Integrates with database via RTK Query API endpoints
 */

import { store } from '../store';
import { ordersApi } from '../store/api/ordersApi';

class DashboardAnalyticsService {
  
  /**
   * Calculate real-time dashboard statistics for restaurant owner
   * @param {string} restaurantId - Restaurant ID  
   * @param {Array} orders - Orders from database (via RTK Query)
   * @param {Array} liveOrders - Live orders from database (via RTK Query)
   * @returns {object} Dashboard statistics object with today, week, month data
   */
  static getRestaurantDashboardStats(restaurantId, orders = [], liveOrders = []) {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      // Calculate stats for different time periods using database orders
      const todayStats = this.calculatePeriodStats(orders, today, now);
      const weekStats = this.calculatePeriodStats(orders, weekAgo, now);
      const monthStats = this.calculatePeriodStats(orders, monthAgo, now);
      
      // Calculate live order status counts from all orders
      const statusCounts = this.calculateOrderStatusCounts(orders, liveOrders);
      
      // Calculate popular items for each period
      const todayPopularItems = this.calculatePopularItems(orders, today, now);
      const weekPopularItems = this.calculatePopularItems(orders, weekAgo, now);
      const monthPopularItems = this.calculatePopularItems(orders, monthAgo, now);
      
      const result = {
        today: {
          totalOrders: todayStats.orderCount,
          totalRevenue: this.formatRevenue(todayStats.revenue),
          pendingOrders: statusCounts.pending,
          preparingOrders: statusCounts.preparing,
          readyOrders: statusCounts.ready,
          completedOrders: todayStats.completedCount,
          popularItems: todayPopularItems
        },
        week: {
          totalOrders: weekStats.orderCount,
          totalRevenue: this.formatRevenue(weekStats.revenue),
          pendingOrders: statusCounts.pending,
          preparingOrders: statusCounts.preparing,
          readyOrders: statusCounts.ready,
          completedOrders: weekStats.completedCount,
          popularItems: weekPopularItems
        },
        month: {
          totalOrders: monthStats.orderCount,
          totalRevenue: this.formatRevenue(monthStats.revenue),
          pendingOrders: statusCounts.pending,
          preparingOrders: statusCounts.preparing,
          readyOrders: statusCounts.ready,
          completedOrders: monthStats.completedCount,
          popularItems: monthPopularItems
        }
      };
      
      return result;
    } catch (error) {
      console.error('Error calculating restaurant dashboard stats:', error);
      return this.getFallbackStats();
    }
  }
  
  /**
   * Calculate statistics for a specific time period
   * @param {Array} orders - All orders from database
   * @param {Date} startDate - Period start date
   * @param {Date} endDate - Period end date
   * @returns {object} Period statistics
   */
  static calculatePeriodStats(orders, startDate, endDate) {
    const periodOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startDate && orderDate <= endDate;
    });
    
    const orderCount = periodOrders.length;
    const revenue = periodOrders.reduce((total, order) => {
      // Handle database order pricing structure
      let orderTotal = 0;
      if (order.pricing?.total) {
        orderTotal = parseFloat(order.pricing.total);
      } else if (order.totalAmount) {
        orderTotal = parseFloat(order.totalAmount);
      } else if (order.grandTotal) {
        orderTotal = parseFloat(order.grandTotal);
      } else if (order.total) {
        orderTotal = parseFloat(order.total);
      }
      return total + (isNaN(orderTotal) ? 0 : orderTotal);
    }, 0);
    
    const completedCount = periodOrders.filter(order => 
      ['completed', 'delivered'].includes(order.status?.toLowerCase())
    ).length;
    
    return { orderCount, revenue, completedCount };
  }
  
  /**
   * Calculate order status counts from all orders (not just live orders)
   * @param {Array} allOrders - All orders from database
   * @param {Array} liveOrders - Live/active orders from database
   * @returns {object} Status counts
   */
  static calculateOrderStatusCounts(allOrders, liveOrders) {
    const statusCounts = {
      pending: 0,
      preparing: 0,
      ready: 0,
      completed: 0
    };
    
    // Count from all orders to get accurate totals
    allOrders.forEach(order => {
      const status = order.status?.toLowerCase();
      
      if (status === 'pending' || status === 'ordered' || status === 'confirmed') {
        statusCounts.pending++;
      } else if (status === 'preparing' || status === 'accepted') {
        statusCounts.preparing++;
      } else if (status === 'ready') {
        statusCounts.ready++;
      } else if (status === 'completed' || status === 'delivered') {
        statusCounts.completed++;
      }
    });
    
    return statusCounts;
  }
  
  /**
   * Calculate popular items for a time period
   * @param {Array} orders - All orders from database
   * @param {Date} startDate - Period start date
   * @param {Date} endDate - Period end date
   * @returns {Array} Top 5 popular items
   */
  static calculatePopularItems(orders, startDate, endDate) {
    const periodOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startDate && orderDate <= endDate;
    });
    
    const itemStats = {};
    
    periodOrders.forEach(order => {
      // Handle database order items structure
      const orderItems = order.items || order.orderItems || [];
      if (Array.isArray(orderItems)) {
        orderItems.forEach(item => {
          const itemName = item.name || item.itemName || item.menuItem?.name || 'Unknown Item';
          const quantity = item.quantity || 1;
          const price = item.price || item.unitPrice || item.total || 0;
          const itemRevenue = price * quantity;
          
          if (!itemStats[itemName]) {
            itemStats[itemName] = {
              name: itemName,
              orders: 0,
              revenue: 0
            };
          }
          
          itemStats[itemName].orders += quantity;
          itemStats[itemName].revenue += itemRevenue;
        });
      }
    });
    
    // Convert to array and sort by order count
    const sortedItems = Object.values(itemStats)
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5) // Top 5 items
      .map(item => ({
        name: item.name,
        orders: item.orders,
        revenue: this.formatRevenue(item.revenue)
      }));
    
    // If no real data, return meaningful default message
    if (sortedItems.length === 0) {
      return [
        { name: 'No orders yet', orders: 0, revenue: '₹0' }
      ];
    }
    
    return sortedItems;
  }
  
  /**
   * Format revenue as Indian Rupee
   * @param {number} amount - Revenue amount
   * @returns {string} Formatted revenue
   */
  static formatRevenue(amount) {
    if (isNaN(amount) || amount === 0) {
      return '₹0';
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  }
  
  /**
   * Calculate revenue growth comparison
   * @param {number} currentRevenue - Current period revenue
   * @param {number} previousRevenue - Previous period revenue
   * @returns {object} Growth data
   */
  static calculateGrowth(currentRevenue, previousRevenue) {
    if (previousRevenue === 0) {
      return {
        percentage: currentRevenue > 0 ? 100 : 0,
        trend: currentRevenue > 0 ? 'up' : 'neutral'
      };
    }
    
    const growth = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
    return {
      percentage: Math.abs(growth).toFixed(1),
      trend: growth > 0 ? 'up' : growth < 0 ? 'down' : 'neutral'
    };
  }
  
  /**
   * Get analytics for specific date range using database orders
   * @param {string} restaurantId - Restaurant ID
   * @param {Array} orders - Orders from database
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {object} Analytics data
   */
  static getCustomPeriodAnalytics(restaurantId, orders, startDate, endDate) {
    try {
      const stats = this.calculatePeriodStats(orders, startDate, endDate);
      const popularItems = this.calculatePopularItems(orders, startDate, endDate);
      
      return {
        totalOrders: stats.orderCount,
        totalRevenue: this.formatRevenue(stats.revenue),
        completedOrders: stats.completedCount,
        popularItems,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      };
    } catch (error) {
      console.error('Error getting custom period analytics:', error);
      return null;
    }
  }
  
  /**
   * Fallback stats when real data is not available
   * @returns {object} Fallback dashboard stats
   */
  static getFallbackStats() {
    return {
      today: {
        totalOrders: 0,
        totalRevenue: '₹0',
        pendingOrders: 0,
        preparingOrders: 0,
        readyOrders: 0,
        completedOrders: 0,
        popularItems: [{ name: 'No orders yet', orders: 0, revenue: '0' }]
      },
      week: {
        totalOrders: 0,
        totalRevenue: '₹0',
        pendingOrders: 0,
        preparingOrders: 0,
        readyOrders: 0,
        completedOrders: 0,
        popularItems: [{ name: 'No orders yet', orders: 0, revenue: '0' }]
      },
      month: {
        totalOrders: 0,
        totalRevenue: '₹0',
        pendingOrders: 0,
        preparingOrders: 0,
        readyOrders: 0,
        completedOrders: 0,
        popularItems: [{ name: 'No orders yet', orders: 0, revenue: '0' }]
      }
    };
  }
  
  /**
   * Get today's performance summary using database orders
   * @param {string} restaurantId - Restaurant ID
   * @param {Array} orders - Orders from database
   * @param {Array} liveOrders - Live orders from database
   * @returns {object} Today's performance data
   */
  static getTodayPerformanceSummary(restaurantId, orders = [], liveOrders = []) {
    try {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      const todayStats = this.calculatePeriodStats(orders, todayStart, today);
      const statusCounts = this.calculateOrderStatusCounts(orders, liveOrders);
      
      const result = {
        ordersToday: todayStats.orderCount,
        revenueToday: this.formatRevenue(todayStats.revenue),
        activeOrders: statusCounts.pending + statusCounts.preparing + statusCounts.ready,
        completedToday: todayStats.completedCount,
        statusBreakdown: statusCounts
      };
      
      return result;
    } catch (error) {
      console.error('Error getting today performance summary:', error);
      return {
        ordersToday: 0,
        revenueToday: '₹0',
        activeOrders: 0,
        completedToday: 0,
        statusBreakdown: { pending: 0, preparing: 0, ready: 0, completed: 0 }
      };
    }
  }
  
  /**
   * Fetch real-time analytics from database via RTK Query
   * @param {string} restaurantId - Restaurant ID
   * @returns {Promise<object>} Analytics data from database
   */
  static async fetchRestaurantAnalytics(restaurantId) {
    try {
      // Get current state from store
      const state = store.getState();
      
      // Dispatch RTK Query to fetch orders
      const ordersResult = await store.dispatch(
        ordersApi.endpoints.getOrders.initiate({
          role: 'restaurant_owner',
          entityId: restaurantId
        })
      );
      
      // Dispatch RTK Query to fetch live orders  
      const liveOrdersResult = await store.dispatch(
        ordersApi.endpoints.getLiveOrders.initiate({
          role: 'restaurant_owner',
          entityId: restaurantId
        })
      );
      
      const orders = ordersResult.data || [];
      const liveOrders = liveOrdersResult.data || [];
      
      // Calculate statistics using database data
      return this.getRestaurantDashboardStats(restaurantId, orders, liveOrders);
      
    } catch (error) {
      console.error('Error fetching restaurant analytics:', error);
      // Return fallback stats on error
      return this.getFallbackStats();
    }
  }
}

export default DashboardAnalyticsService;