import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import {
  FaRupeeSign,
  FaChartLine,
  FaStore,
  FaShoppingCart,
  FaUsers,
  FaArrowUp,
  FaArrowDown,
  FaCalendarAlt,
  FaDownload
} from 'react-icons/fa';
import ZoneAdminLayout from '../ZoneAdminLayout';
import AnalyticsService from '../../../services/AnalyticsService';

const ZoneAnalytics = () => {
  const { zoneId } = useParams();
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    const loadAnalytics = () => {
      setLoading(true);
      try {
        // Get analytics data from AnalyticsService
        const data = AnalyticsService.getZoneAnalytics(zoneId, timeRange);
        
        setAnalyticsData({
          totalRevenue: data.totalRevenue || 0,
          totalOrders: data.totalOrders || 0,
          totalShops: data.totalShops || 0,
          activeShops: data.activeShops || 0,
          revenueChange: data.revenueChange || 0,
          ordersChange: data.ordersChange || 0,
          dailyRevenue: data.dailyRevenue || [],
          topShops: data.topShops || []
        });
      } catch (error) {
        console.error('Error loading zone analytics:', error);
        // Set default empty data
        setAnalyticsData({
          totalRevenue: 0,
          totalOrders: 0,
          totalShops: 0,
          activeShops: 0,
          revenueChange: 0,
          ordersChange: 0,
          dailyRevenue: [],
          topShops: []
        });
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [zoneId, timeRange]);

  if (loading) {
    return (
      <ZoneAdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 spinner-theme rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-theme-text-primary font-raleway">Loading Analytics...</p>
          </div>
        </div>
      </ZoneAdminLayout>
    );
  }

  return (
    <ZoneAdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-fredoka text-theme-text-primary mb-2">
              Zone Analytics
            </h1>
            <p className="text-theme-text-secondary font-raleway">
              Track performance across all shops in your zone
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none autofill-protected"
            >
              <option value="7d" className="bg-theme-bg-secondary text-theme-text-primary">Last 7 Days</option>
              <option value="30d" className="bg-theme-bg-secondary text-theme-text-primary">Last 30 Days</option>
              <option value="90d" className="bg-theme-bg-secondary text-theme-text-primary">Last 90 Days</option>
            </select>

            <button className="bg-theme-accent-primary hover:bg-theme-accent-hover text-theme-text-inverse px-4 py-2 rounded-lg font-raleway flex items-center space-x-2">
              <FaDownload />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Revenue */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="admin-card rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-status-success rounded-xl flex items-center justify-center">
                <FaRupeeSign className="text-theme-text-inverse text-xl" />
              </div>
              <div className="flex items-center space-x-1">
                {analyticsData.revenueChange >= 0 ? (
                  <FaArrowUp className="text-status-success text-sm" />
                ) : (
                  <FaArrowDown className="text-status-error text-sm" />
                )}
                <span className={`text-sm font-raleway ${
                  analyticsData.revenueChange >= 0 ? 'text-status-success' : 'text-status-error'
                }`}>
                  {Math.abs(analyticsData.revenueChange).toFixed(1)}%
                </span>
              </div>
            </div>
            <h3 className="text-2xl font-fredoka text-theme-text-primary mb-1">
              ₹{analyticsData.totalRevenue.toLocaleString('en-IN')}
            </h3>
            <p className="text-theme-text-secondary font-raleway text-sm">Total Revenue</p>
          </motion.div>

          {/* Total Orders */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="admin-card rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-status-info rounded-xl flex items-center justify-center">
                <FaShoppingCart className="text-theme-text-inverse text-xl" />
              </div>
              <div className="flex items-center space-x-1">
                {analyticsData.ordersChange >= 0 ? (
                  <FaArrowUp className="text-status-success text-sm" />
                ) : (
                  <FaArrowDown className="text-status-error text-sm" />
                )}
                <span className={`text-sm font-raleway ${
                  analyticsData.ordersChange >= 0 ? 'text-status-success' : 'text-status-error'
                }`}>
                  {Math.abs(analyticsData.ordersChange).toFixed(1)}%
                </span>
              </div>
            </div>
            <h3 className="text-2xl font-fredoka text-theme-text-primary mb-1">
              {analyticsData.totalOrders.toLocaleString()}
            </h3>
            <p className="text-theme-text-secondary font-raleway text-sm">Total Orders</p>
          </motion.div>

          {/* Total Shops */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="admin-card rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-status-warning rounded-xl flex items-center justify-center">
                <FaStore className="text-theme-text-inverse text-xl" />
              </div>
              <span className="text-status-info text-sm font-raleway">
                {analyticsData.activeShops}/{analyticsData.totalShops} Active
              </span>
            </div>
            <h3 className="text-2xl font-fredoka text-theme-text-primary mb-1">
              {analyticsData.totalShops}
            </h3>
            <p className="text-theme-text-secondary font-raleway text-sm">Total Shops</p>
          </motion.div>

          {/* Average Order Value */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="admin-card rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-theme-accent-primary rounded-xl flex items-center justify-center">
                <FaChartLine className="text-theme-text-inverse text-xl" />
              </div>
            </div>
            <h3 className="text-2xl font-fredoka text-theme-text-primary mb-1">
              ₹{analyticsData.totalOrders > 0 ? 
                Math.round(analyticsData.totalRevenue / analyticsData.totalOrders).toLocaleString('en-IN') : 
                '0'
              }
            </h3>
            <p className="text-theme-text-secondary font-raleway text-sm">Avg Order Value</p>
          </motion.div>
        </div>

        {/* Top Performing Shops */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="admin-card rounded-xl p-6"
        >
          <h2 className="text-xl font-fredoka text-theme-text-primary mb-6">
            Top Performing Shops
          </h2>

          {analyticsData.topShops.length > 0 ? (
            <div className="space-y-4">
              {analyticsData.topShops.map((shop, index) => (
                <div
                  key={shop.id || index}
                  className="flex items-center justify-between p-4 bg-theme-bg-secondary rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-theme-accent-primary rounded-lg flex items-center justify-center">
                      <span className="text-theme-text-inverse font-fredoka">
                        #{index + 1}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-fredoka text-theme-text-primary">
                        {shop.name || `Shop ${index + 1}`}
                      </h3>
                      <p className="text-theme-text-secondary text-sm font-raleway">
                        {shop.orders || 0} orders
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-fredoka text-theme-text-primary">
                      ₹{(shop.revenue || 0).toLocaleString('en-IN')}
                    </p>
                    <p className="text-theme-text-secondary text-sm font-raleway">
                      Revenue
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FaStore className="text-4xl text-theme-text-tertiary mx-auto mb-4" />
              <p className="text-theme-text-secondary font-raleway">
                No shop data available yet
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </ZoneAdminLayout>
  );
};

export default ZoneAnalytics;
