import api from './api';

class SubscriptionAPI {
  // Get all subscriptions (admin only)
  static async getAllSubscriptions(filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.status && filters.status !== 'all') {
      params.append('status', filters.status);
    }
    if (filters.planType) {
      params.append('planType', filters.planType);
    }
    if (filters.startDate) {
      params.append('startDate', filters.startDate);
    }
    if (filters.endDate) {
      params.append('endDate', filters.endDate);
    }

    const response = await api.get(`/admin/subscriptions?${params.toString()}`);
    return response.data;
  }

  // Get subscription details
  static async getSubscriptionDetails(subscriptionId) {
    const response = await api.get(`/admin/subscriptions/${subscriptionId}`);
    return response.data;
  }

  // Get user's current subscription
  static async getCurrentSubscription() {
    const response = await api.get('/subscriptions/current');
    return response.data;
  }

  // Upgrade subscription
  static async upgradePlan(planData) {
    const response = await api.post('/subscriptions/upgrade', planData);
    return response.data;
  }

  // Cancel subscription
  static async cancelSubscription(subscriptionId, reason = '') {
    const response = await api.post(`/subscriptions/${subscriptionId}/cancel`, { reason });
    return response.data;
  }

  // Extend subscription
  static async extendSubscription(subscriptionId, extensionData) {
    const response = await api.post(`/admin/subscriptions/${subscriptionId}/extend`, extensionData);
    return response.data;
  }

  // Get subscription usage
  static async getSubscriptionUsage(subscriptionId) {
    const response = await api.get(`/subscriptions/${subscriptionId}/usage`);
    return response.data;
  }

  // Get subscription analytics
  static async getSubscriptionAnalytics(timeRange = '30d') {
    const response = await api.get(`/admin/subscriptions/analytics?timeRange=${timeRange}`);
    return response.data;
  }

  // Generate subscription report
  static async generateSubscriptionReport(options = {}) {
    const response = await api.post('/admin/subscriptions/report', options);
    return response.data;
  }

  // Get expiring subscriptions
  static async getExpiringSubscriptions(days = 7) {
    const response = await api.get(`/admin/subscriptions/expiring?days=${days}`);
    return response.data;
  }

  // Send subscription reminder
  static async sendSubscriptionReminder(subscriptionId) {
    const response = await api.post(`/admin/subscriptions/${subscriptionId}/remind`);
    return response.data;
  }

  // Update subscription status
  static async updateSubscriptionStatus(subscriptionId, status) {
    const response = await api.patch(`/admin/subscriptions/${subscriptionId}/status`, { status });
    return response.data;
  }

  // Get subscription revenue analytics
  static async getRevenueAnalytics(timeRange = '30d') {
    const response = await api.get(`/admin/subscriptions/revenue?timeRange=${timeRange}`);
    return response.data;
  }

  // Get plan distribution
  static async getPlanDistribution() {
    const response = await api.get('/admin/subscriptions/distribution');
    return response.data;
  }

  // Create custom subscription (admin only)
  static async createCustomSubscription(subscriptionData) {
    const response = await api.post('/admin/subscriptions/custom', subscriptionData);
    return response.data;
  }

  // Get subscription history
  static async getSubscriptionHistory(userId) {
    const response = await api.get(`/admin/subscriptions/history/${userId}`);
    return response.data;
  }

  // Process subscription payment
  static async processSubscriptionPayment(paymentData) {
    const response = await api.post('/subscriptions/payment', paymentData);
    return response.data;
  }

  // Verify subscription payment
  static async verifySubscriptionPayment(paymentId) {
    const response = await api.post(`/subscriptions/payment/${paymentId}/verify`);
    return response.data;
  }

  // Get available plans
  static async getAvailablePlans(planType = 'restaurant') {
    const response = await api.get(`/subscriptions/plans?type=${planType}`);
    return response.data;
  }

  // Check subscription limits
  static async checkSubscriptionLimits(feature) {
    const response = await api.get(`/subscriptions/limits/check?feature=${feature}`);
    return response.data;
  }

  // Get subscription notifications
  static async getSubscriptionNotifications() {
    const response = await api.get('/subscriptions/notifications');
    return response.data;
  }

  // Mark notification as read
  static async markNotificationRead(notificationId) {
    const response = await api.patch(`/subscriptions/notifications/${notificationId}/read`);
    return response.data;
  }

  // Get subscription metrics for dashboard
  static async getSubscriptionMetrics() {
    const response = await api.get('/subscriptions/metrics');
    return response.data;
  }

  // Bulk update subscriptions (admin only)
  static async bulkUpdateSubscriptions(subscriptionIds, updateData) {
    const response = await api.patch('/admin/subscriptions/bulk-update', {
      subscriptionIds,
      updateData
    });
    return response.data;
  }

  // Export subscription data
  static async exportSubscriptionData(format = 'excel', filters = {}) {
    const params = new URLSearchParams();
    params.append('format', format);
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    const response = await api.get(`/admin/subscriptions/export?${params.toString()}`, {
      responseType: 'blob'
    });
    
    return response.data;
  }

  // Get subscription trends
  static async getSubscriptionTrends(timeRange = '90d') {
    const response = await api.get(`/admin/subscriptions/trends?timeRange=${timeRange}`);
    return response.data;
  }

  // Get churn analysis
  static async getChurnAnalysis() {
    const response = await api.get('/admin/subscriptions/churn-analysis');
    return response.data;
  }

  // Get subscription forecasting
  static async getSubscriptionForecast(months = 6) {
    const response = await api.get(`/admin/subscriptions/forecast?months=${months}`);
    return response.data;
  }
}

export default SubscriptionAPI;
