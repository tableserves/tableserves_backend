/**
 * Dashboard Analytics Service - Real-time calculation of dashboard statistics
 * Replaces dummy data with actual order-based analytics
 */

import OrderProcessingService from './OrderProcessingService';

class DashboardAnalyticsService {
  
  /**
   * Calculate real-time dashboard statistics for restaurant owner
   * @param {string} restaurantId - Restaurant ID
   * @returns {object} Dashboard statistics object with today, week, month data
   */
  static getRestaurantDashboardStats(restaurantId) {
    try {
      const orders = OrderProcessingService.getOrdersForRestaurant(restaurantId);
      const liveOrders = OrderProcessingService.getLiveOrdersForRestaurant(restaurantId);
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      // Calculate stats for different time periods
      const todayStats = this.calculatePeriodStats(orders, today, now);
      const weekStats = this.calculatePeriodStats(orders, weekAgo, now);
      const monthStats = this.calculatePeriodStats(orders, monthAgo, now);
      
      // Calculate live order status counts
      const statusCounts = this.calculateOrderStatusCounts(liveOrders);
      
      // Calculate popular items for each period
      const todayPopularItems = this.calculatePopularItems(orders, today, now);
      const weekPopularItems = this.calculatePopularItems(orders, weekAgo, now);
      const monthPopularItems = this.calculatePopularItems(orders, monthAgo, now);
      
      return {
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
    } catch (error) {
      console.error('Error calculating restaurant dashboard stats:', error);
      return this.getFallbackStats();
    }
  }
  
  /**
   * Calculate statistics for a specific time period
   * @param {Array} orders - All orders
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
      // Handle different revenue field names and formats
      let orderTotal = 0;
      if (order.grandTotal) {
        orderTotal = typeof order.grandTotal === 'number' ? order.grandTotal : parseFloat(order.grandTotal);
      } else if (order.total) {
        orderTotal = typeof order.total === 'number' ? order.total : parseFloat(order.total);
      } else if (order.subtotal) {
        orderTotal = typeof order.subtotal === 'number' ? order.subtotal : parseFloat(order.subtotal);
      }
      return total + (isNaN(orderTotal) ? 0 : orderTotal);
    }, 0);
    
    const completedCount = periodOrders.filter(order => 
      ['completed', 'delivered'].includes(order.status)
    ).length;
    
    return { orderCount, revenue, completedCount };
  }
  
  /**
   * Calculate order status counts from live orders
   * @param {Array} liveOrders - Live/active orders
   * @returns {object} Status counts
   */
  static calculateOrderStatusCounts(liveOrders) {
    const statusCounts = {
      pending: 0,
      preparing: 0,
      ready: 0,
      completed: 0
    };
    
    liveOrders.forEach(order => {
      const status = order.status?.toLowerCase();
      if (status === 'pending' || status === 'ordered') {
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
   * @param {Array} orders - All orders
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
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const itemName = item.name || item.itemName || 'Unknown Item';
          const quantity = item.quantity || 1;
          const price = item.price || item.subtotal || 0;
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
        revenue: item.revenue.toFixed(0)
      }));
    
    // If no real data, return meaningful default message
    if (sortedItems.length === 0) {
      return [
        { name: 'No orders yet', orders: 0, revenue: '0' }
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
   * Get analytics for specific date range
   * @param {string} restaurantId - Restaurant ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {object} Analytics data
   */
  static getCustomPeriodAnalytics(restaurantId, startDate, endDate) {
    try {
      const orders = OrderProcessingService.getOrdersForRestaurant(restaurantId);
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
   * Get today's performance summary
   * @param {string} restaurantId - Restaurant ID
   * @returns {object} Today's performance data
   */
  static getTodayPerformanceSummary(restaurantId) {
    try {
      const orders = OrderProcessingService.getOrdersForRestaurant(restaurantId);
      const liveOrders = OrderProcessingService.getLiveOrdersForRestaurant(restaurantId);
      
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      const todayStats = this.calculatePeriodStats(orders, todayStart, today);
      const statusCounts = this.calculateOrderStatusCounts(liveOrders);
      
      return {
        ordersToday: todayStats.orderCount,
        revenueToday: this.formatRevenue(todayStats.revenue),
        activeOrders: statusCounts.pending + statusCounts.preparing + statusCounts.ready,
        completedToday: todayStats.completedCount,
        statusBreakdown: statusCounts
      };
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
}

export default DashboardAnalyticsService;