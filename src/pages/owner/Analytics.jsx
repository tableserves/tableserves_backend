import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';

import AnalyticsService from '../../services/AnalyticsService';
import {
  FaChartLine,
  FaRupeeSign,
  FaShoppingCart,
  FaUsers,
  FaUtensils,
  FaEye,
  FaDownload
} from 'react-icons/fa';
import SingleRestaurantLayout from '../../components/owner/SingleRestaurantLayout';

const Analytics = () => {
  const { restaurantId } = useParams();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week');
  const [analyticsData, setAnalyticsData] = useState(null);


  useEffect(() => {
    loadAnalytics();
  }, [restaurantId, timeRange]);

  const loadAnalytics = () => {
    try {
      setLoading(true);

      // Get analytics data from AnalyticsService
      const analyticsData = AnalyticsService.getRestaurantAnalytics(restaurantId, timeRange);

      setAnalyticsData({
        overview: {
          totalRevenue: analyticsData.totalRevenue || 0,
          totalOrders: analyticsData.totalOrders || 0,
          averageOrderValue: analyticsData.totalRevenue && analyticsData.totalOrders ?
            analyticsData.totalRevenue / analyticsData.totalOrders : 0,
          totalCustomers: analyticsData.totalCustomers || 0,
          revenueChange: analyticsData.revenueChange || 0,
          ordersChange: analyticsData.ordersChange || 0,
          customersChange: analyticsData.customersChange || 0
        },
        recentOrders: analyticsData.dailyRevenue || [],
        topItems: analyticsData.popularItems || [],
        hourlyData: [] // No hourly data as requested
      });

      setLoading(false);
    } catch (error) {
      console.error('Error loading analytics:', error);
      // Set default empty data if error
      setAnalyticsData({
        overview: {
          totalRevenue: 0,
          totalOrders: 0,
          averageOrderValue: 0,
          totalCustomers: 0,
          revenueChange: 0,
          ordersChange: 0,
          customersChange: 0
        },
        recentOrders: [],
        topItems: [],
        hourlyData: []
      });
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatPercentage = (value) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getChangeColor = (value) => {
    if (value > 0) return 'text-green-500';
    if (value < 0) return 'text-red-500';
    return 'text-gray-500';
  };

  const getChangeIcon = (value) => {
    if (value > 0) return <FaChartLine className="text-sm" />;
    if (value < 0) return <FaChartLine className="text-sm rotate-180" />;
    return <FaChartLine className="text-sm" />;
  };




  if (loading) {
    return (
      <SingleRestaurantLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-theme-text-primary font-raleway">Loading analytics...</p>
          </div>
        </div>
      </SingleRestaurantLayout>
    );
  }

  return (
    <SingleRestaurantLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-fredoka text-theme-text-primary mb-2">
              Revenue Report
            </h1>
            <p className="text-theme-text-secondary font-raleway text-sm sm:text-base">
              Detailed revenue analysis and financial reports
            </p>
          </div>

          <div className="flex items-center space-x-3 mt-4 sm:mt-0">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-theme-bg-secondary border border-theme-border-primary text-theme-text-primary px-4 py-2 rounded-lg font-raleway focus:outline-none focus:border-theme-accent-primary"
            >
              <option value="today" className="bg-theme-bg-secondary text-theme-text-primary">Today</option>
              <option value="week" className="bg-theme-bg-secondary text-theme-text-primary">This Week</option>
              <option value="month" className="bg-theme-bg-secondary text-theme-text-primary">This Month</option>
              <option value="quarter" className="bg-theme-bg-secondary text-theme-text-primary">This Quarter</option>
              <option value="year" className="bg-theme-bg-secondary text-theme-text-primary">This Year</option>
            </select>

            <button className="btn-primary px-4 py-2 rounded-lg font-raleway text-sm flex items-center space-x-2">
              <FaDownload />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="admin-card rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <FaRupeeSign className="text-white text-lg" />
              </div>
              <div className={`flex items-center space-x-1 ${getChangeColor(analyticsData.overview.revenueChange)}`}>
                {getChangeIcon(analyticsData.overview.revenueChange)}
                <span className="text-sm font-raleway">{formatPercentage(analyticsData.overview.revenueChange)}</span>
              </div>
            </div>
            <h3 className="text-2xl font-fredoka text-theme-text-primary">{formatCurrency(analyticsData.overview.totalRevenue)}</h3>
            <p className="text-theme-text-secondary font-raleway text-sm">Total Revenue</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="admin-card rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                <FaShoppingCart className="text-white text-lg" />
              </div>
              <div className={`flex items-center space-x-1 ${getChangeColor(analyticsData.overview.ordersChange)}`}>
                {getChangeIcon(analyticsData.overview.ordersChange)}
                <span className="text-sm font-raleway">{formatPercentage(analyticsData.overview.ordersChange)}</span>
              </div>
            </div>
            <h3 className="text-2xl font-fredoka text-theme-text-primary">{analyticsData.overview.totalOrders}</h3>
            <p className="text-theme-text-secondary font-raleway text-sm">Total Orders</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="admin-card rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                <FaChartLine className="text-white text-lg" />
              </div>
              <div className="text-theme-text-tertiary">
                <FaEye className="text-sm" />
              </div>
            </div>
            <h3 className="text-2xl font-fredoka text-theme-text-primary">{formatCurrency(analyticsData.overview.averageOrderValue)}</h3>
            <p className="text-theme-text-secondary font-raleway text-sm">Average Order Value</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="admin-card rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                <FaUsers className="text-white text-lg" />
              </div>
              <div className={`flex items-center space-x-1 ${getChangeColor(analyticsData.overview.customersChange)}`}>
                {getChangeIcon(analyticsData.overview.customersChange)}
                <span className="text-sm font-raleway">{formatPercentage(analyticsData.overview.customersChange)}</span>
              </div>
            </div>
            <h3 className="text-2xl font-fredoka text-theme-text-primary">{analyticsData.overview.totalCustomers}</h3>
            <p className="text-theme-text-secondary font-raleway text-sm">Total Customers</p>
          </motion.div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Revenue Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="admin-card rounded-2xl p-6"
          >
            <h3 className="text-lg font-fredoka text-theme-text-primary mb-6">Daily Revenue</h3>
            <div className="space-y-4">
              {analyticsData.recentOrders.length > 0 ? (
                analyticsData.recentOrders.map((day, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-theme-accent-primary rounded-full"></div>
                      <span className="text-theme-text-secondary font-raleway text-sm">
                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-theme-text-primary font-raleway font-semibold">{formatCurrency(day.revenue)}</div>
                      <div className="text-theme-text-tertiary font-raleway text-xs">{day.orders} orders</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <FaChartLine className="w-12 h-12 text-theme-text-tertiary mx-auto mb-3" />
                  <p className="text-theme-text-secondary font-raleway">No revenue data available</p>
                  <p className="text-theme-text-tertiary font-raleway text-sm">Data will appear when orders are placed</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Top Items */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="admin-card rounded-2xl p-6"
          >
            <h3 className="text-lg font-fredoka text-theme-text-primary mb-6">Top Menu Items</h3>
            <div className="space-y-4">
              {analyticsData.topItems.length > 0 ? (
                analyticsData.topItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-theme-accent-primary rounded-full flex items-center justify-center">
                        <span className="text-theme-text-inverse font-raleway text-sm font-semibold">{index + 1}</span>
                      </div>
                      <div>
                        <h4 className="text-theme-text-primary font-raleway font-medium">{item.name}</h4>
                        <p className="text-theme-text-tertiary font-raleway text-xs">{item.orders} orders</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-theme-text-primary font-raleway font-semibold">{formatCurrency(item.revenue)}</div>
                      <div className="text-theme-text-tertiary font-raleway text-xs">{item.percentage}% of total</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <FaUtensils className="w-12 h-12 text-theme-text-tertiary mx-auto mb-3" />
                  <p className="text-theme-text-secondary font-raleway">No menu items data</p>
                  <p className="text-theme-text-tertiary font-raleway text-sm">Add menu items to see performance</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

      </div>
    </SingleRestaurantLayout>
  );
};

export default Analytics;
