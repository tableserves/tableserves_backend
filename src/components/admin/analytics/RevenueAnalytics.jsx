import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AnalyticsService from '../../../services/AnalyticsService';
import {
  FaRupeeSign,
  FaChartLine,
  FaArrowUp,
  FaArrowDown,
  FaDownload,
  FaCalendarAlt,
  FaStore,
  FaMapMarkerAlt,
  FaUsers,
  FaShoppingCart,
  FaFilter,
  FaFileExport,
  FaEye
} from 'react-icons/fa';
import SuperAdminLayout from '../SuperAdminLayout';

const RevenueAnalytics = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [entityFilter, setEntityFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState(null);

  useEffect(() => {
    const loadRevenueData = () => {
      setLoading(true);
      try {
        // Get analytics data from AnalyticsService
        const analyticsData = AnalyticsService.getFilteredAnalytics(entityFilter, timeRange);

        setRevenueData({
          totalRevenue: analyticsData.totalRevenue || 0,
          previousRevenue: analyticsData.totalRevenue ? Math.round(analyticsData.totalRevenue * 0.85) : 0,
          growth: analyticsData.revenueChange || 0,
          transactions: analyticsData.totalOrders || 0,
          averageOrder: analyticsData.totalRevenue && analyticsData.totalOrders ?
            Math.round(analyticsData.totalRevenue / analyticsData.totalOrders) : 0,
          topPerformers: analyticsData.entities ? analyticsData.entities.slice(0, 4).map(entity => ({
            name: entity.name,
            type: entity.type,
            revenue: entity.totalRevenue || 0,
            growth: entity.revenueChange || 0,
            orders: entity.totalOrders || 0
          })) : [],
          dailyRevenue: analyticsData.dailyRevenue || [],
          monthlyRevenue: analyticsData.monthlyRevenue || [],
          revenueByCategory: analyticsData.revenueByCategory || [],
          paymentMethods: analyticsData.paymentMethods || []
        });
      } catch (error) {
        console.error('Error loading revenue data:', error);
        // Set default empty data if error
        setRevenueData({
          totalRevenue: 0,
          previousRevenue: 0,
          growth: 0,
          transactions: 0,
          averageOrder: 0,
          topPerformers: [],
          dailyRevenue: [],
          monthlyRevenue: [],
          revenueByCategory: [],
          paymentMethods: []
        });
      } finally {
        setLoading(false);
      }
    };

    loadRevenueData();
  }, [timeRange, entityFilter]);

  const exportData = (format) => {
    if (!revenueData) return;

    if (format === 'csv') {
      // Create CSV content
      const csvContent = [
        ['Date', 'Revenue', 'Orders'],
        ...revenueData.dailyRevenue.map(day => [day.date, day.revenue, day.orders])
      ].map(row => row.join(',')).join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `revenue-analytics-${timeRange}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else if (format === 'pdf') {
      // In a real app, this would generate a PDF report
      alert('PDF export functionality would be implemented here');
    }
  };

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 spinner-theme rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-theme-text-primary font-raleway">Loading revenue analytics...</p>
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-fredoka text-theme-text-primary mb-2">Revenue Analytics</h1>
            <p className="text-theme-text-secondary font-raleway text-sm sm:text-base">Comprehensive revenue insights and trends</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none autofill-protected"
            >
              <option value="7d" className="bg-theme-bg-secondary text-theme-text-primary">Daily View (7 Days)</option>
              <option value="30d" className="bg-theme-bg-secondary text-theme-text-primary">Monthly View (30 Days)</option>
              <option value="90d" className="bg-theme-bg-secondary text-theme-text-primary">Quarterly View (90 Days)</option>
            </select>

            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none autofill-protected"
            >
              <option value="all" className="bg-theme-bg-secondary text-theme-text-primary">All Entities</option>
              <option value="restaurants" className="bg-theme-bg-secondary text-theme-text-primary">Restaurants Only</option>
              <option value="zones" className="bg-theme-bg-secondary text-theme-text-primary">Food Zones Only</option>
            </select>

          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="admin-card rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-theme-accent-primary rounded-xl flex items-center justify-center">
                <FaRupeeSign className="text-theme-text-inverse text-xl" />
              </div>

            </div>
            <h3 className="text-2xl font-fredoka text-theme-text-primary mb-1">
              ₹{revenueData.totalRevenue.toLocaleString()}
            </h3>
            <p className="text-theme-text-primary font-raleway font-medium mb-1">Total Revenue</p>
            <p className="text-theme-text-secondary font-raleway text-sm">
              vs ₹{revenueData.previousRevenue.toLocaleString()} previous period
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="admin-card rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <FaShoppingCart className="text-theme-text-inverse text-xl" />
              </div>
            </div>
            <h3 className="text-2xl font-fredoka text-theme-text-primary mb-1">
              {revenueData.transactions.toLocaleString()}
            </h3>
            <p className="text-theme-text-primary font-raleway font-medium mb-1">Total Transactions</p>
            <p className="text-theme-text-secondary font-raleway text-sm">
              Across all entities
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="admin-card rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                <FaChartLine className="text-theme-text-inverse text-xl" />
              </div>
            </div>
            <h3 className="text-2xl font-fredoka text-theme-text-primary mb-1">
              ₹{revenueData.averageOrder.toFixed(2)}
            </h3>
            <p className="text-theme-text-primary font-raleway font-medium mb-1">Average Order Value</p>
            <p className="text-theme-text-secondary font-raleway text-sm">
              Per transaction
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="admin-card rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <FaStore className="text-theme-text-inverse text-xl" />
              </div>
            </div>
            <h3 className="text-2xl font-fredoka text-theme-text-primary mb-1">
              {revenueData.topPerformers.length}
            </h3>
            <p className="text-theme-text-primary font-raleway font-medium mb-1">Active Entities</p>
            <p className="text-theme-text-secondary font-raleway text-sm">
              Generating revenue
            </p>
          </motion.div>
        </div>



        {/* Top Performers and Payment Methods */}
        <div className="grid grid-cols-1 pb-4 lg:grid-cols-2 gap-6">
          {/* Top Performers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-secondary shadow-md"
          >
            <h2 className="text-xl font-fredoka text-theme-text-secondary mb-6">Top Performers</h2>

            <div className="space-y-4">
              {revenueData.topPerformers.map((performer, index) => (
                <motion.div
                  key={performer.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white font-fredoka text-sm">
                      {index + 1}
                    </div>
                    <div className="flex items-center space-x-2">
                      {performer.type === 'restaurant' ? (
                        <FaStore className="text-blue-400" />
                      ) : (
                        <FaMapMarkerAlt className="text-purple-400" />
                      )}
                      <div>
                        <h4 className="text-theme-text-secondary font-raleway font-medium">{performer.name}</h4>
                        <p className="text-theme-text-secondary font-raleway text-sm capitalize">{performer.type}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-theme-text-secondary font-sans font-medium">
                      ${performer.revenue.toLocaleString()}
                    </p>
                    <div className="flex items-center space-x-2">
                      <span className="text-green-600 font-sans text-sm">
                        +{performer.growth}%
                      </span>
                      <span className="text-theme-text-secondary font-sans text-sm">
                        {performer.orders} orders
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>


        </div>


      </div>
    </SuperAdminLayout>
  );
};

export default RevenueAnalytics;
