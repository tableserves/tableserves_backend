import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaRupeeSign,
  FaShoppingCart,
  FaStar,
  FaUsers,
  FaChartLine,
  FaCalendarAlt,
  FaClock,
  FaUtensils
} from 'react-icons/fa';
import ZoneShopLayout from '../ZoneShopLayout';

const ZoneShopAnalytics = () => {
  const { zoneId, shopId } = useParams();
  const [analytics, setAnalytics] = useState({});
  const [timeRange, setTimeRange] = useState('today');
  const [loading, setLoading] = useState(true);



  useEffect(() => {
    const loadAnalytics = () => {
      setLoading(true);
      // Load real analytics data from localStorage
      try {
        const analyticsData = JSON.parse(localStorage.getItem(`tableserve_zone_${zoneId}_shop_${shopId}_analytics`) || '{}');

        // If no real data exists, show empty state
        if (Object.keys(analyticsData).length === 0) {
          setAnalytics({
            today: { revenue: 0, orders: 0, avgOrderValue: 0, rating: 0, customers: 0, peakHour: 'N/A', topItems: [], hourlyData: [], trends: { revenue: 0, orders: 0, avgOrderValue: 0, rating: 0 } },
            week: { revenue: 0, orders: 0, avgOrderValue: 0, rating: 0, customers: 0, peakDay: 'N/A', topItems: [], dailyData: [], trends: { revenue: 0, orders: 0, avgOrderValue: 0, rating: 0 } },
            month: { revenue: 0, orders: 0, avgOrderValue: 0, rating: 0, customers: 0, peakWeek: 'N/A', topItems: [], weeklyData: [], trends: { revenue: 0, orders: 0, avgOrderValue: 0, rating: 0 } }
          });
        } else {
          setAnalytics(analyticsData);
        }
      } catch (error) {
        console.error('Error loading analytics data:', error);
        setAnalytics({
          today: { revenue: 0, orders: 0, avgOrderValue: 0, rating: 0, customers: 0, peakHour: 'N/A', topItems: [], hourlyData: [], trends: { revenue: 0, orders: 0, avgOrderValue: 0, rating: 0 } },
          week: { revenue: 0, orders: 0, avgOrderValue: 0, rating: 0, customers: 0, peakDay: 'N/A', topItems: [], dailyData: [], trends: { revenue: 0, orders: 0, avgOrderValue: 0, rating: 0 } },
          month: { revenue: 0, orders: 0, avgOrderValue: 0, rating: 0, customers: 0, peakWeek: 'N/A', topItems: [], weeklyData: [], trends: { revenue: 0, orders: 0, avgOrderValue: 0, rating: 0 } }
        });
      }
      setLoading(false);
    };

    loadAnalytics();
  }, [zoneId, shopId]);

  const currentData = analytics[timeRange] || {};



  const getTrendColor = (trend) => {
    return trend > 0 ? 'text-status-success' : trend < 0 ? 'text-status-error' : 'text-theme-text-tertiary';
  };

  if (loading) {
    return (
      <ZoneShopLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-theme-accent-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-theme-text-secondary">Loading analytics...</p>
          </div>
        </div>
      </ZoneShopLayout>
    );
  }

  return (
    <ZoneShopLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-fredoka text-theme-text-primary mb-2">
              Analytics & Performance
            </h1>
            <p className="text-theme-text-secondary font-raleway">
              Track your shop's performance and revenue insights
            </p>
          </div>
          <div className="flex items-center space-x-2 mt-4 sm:mt-0">
            <FaCalendarAlt className="text-theme-text-tertiary" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-theme-border-primary rounded-lg bg-theme-bg-secondary text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-theme-accent-primary"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="admin-card p-4 rounded-xl"
          >
            <div className="flex items-center justify-between mb-2">
              <FaRupeeSign className="text-theme-accent-primary text-xl" />

            </div>
            <p className="text-2xl font-sans text-theme-text-primary">₹{currentData.revenue?.toLocaleString('en-IN')}</p>
            <p className="text-theme-text-secondary font-raleway text-sm">Revenue</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="admin-card p-4 rounded-xl"
          >
            <div className="flex items-center justify-between mb-2">
              <FaShoppingCart className="text-status-info text-xl" />

            </div>
            <p className="text-2xl font-sans text-theme-text-primary">{currentData.orders}</p>
            <p className="text-theme-text-secondary font-raleway text-sm">Orders</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="admin-card p-4 rounded-xl"
          >
            <div className="flex items-center justify-between mb-2">
              <FaRupeeSign className="text-status-success text-xl" />

            </div>
            <p className="text-2xl font-sans text-theme-text-primary">₹{currentData.avgOrderValue?.toLocaleString('en-IN')}</p>
            <p className="text-theme-text-secondary font-raleway text-sm">Avg Order</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="admin-card p-4 rounded-xl"
          >
            <div className="flex items-center justify-between mb-2">
              <FaStar className="text-status-warning text-xl" />

            </div>
            <p className="text-2xl font-sans text-theme-text-primary">{currentData.rating}</p>
            <p className="text-theme-text-secondary font-raleway text-sm">Rating</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="admin-card p-4 rounded-xl"
          >
            <div className="flex items-center justify-between mb-2">
              <FaUsers className="text-theme-accent-primary text-xl" />
              <FaClock className="text-theme-text-tertiary" />
            </div>
            <p className="text-2xl font-sans text-theme-text-primary">{currentData.customers}</p>
            <p className="text-theme-text-secondary font-raleway text-sm">Customers</p>
          </motion.div>
        </div>

        {/* Charts and Top Items */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="admin-card p-6 rounded-xl"
          >
            <h3 className="text-lg font-fredoka text-theme-text-primary mb-4">
              {timeRange === 'today' ? 'Hourly Performance' :
                timeRange === 'week' ? 'Daily Performance' : 'Weekly Performance'}
            </h3>
            <div className="space-y-3">
              {(timeRange === 'today' ? currentData.hourlyData :
                timeRange === 'week' ? currentData.dailyData :
                  currentData.weeklyData)?.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-theme-bg-secondary rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-8 bg-theme-accent-primary rounded"></div>
                        <div>
                          <p className="font-raleway text-theme-text-primary">
                            {item.hour || item.day || item.week}
                          </p>
                          <p className="text-sm text-theme-text-tertiary">{item.orders} orders</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-sans text-theme-text-primary">₹{item.revenue.toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  ))}
            </div>
          </motion.div>

          {/* Top Items */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="admin-card p-6 rounded-xl"
          >
            <h3 className="text-lg font-fredoka text-theme-text-primary mb-4">Top Performing Items</h3>
            <div className="space-y-4">
              {currentData.topItems?.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-theme-bg-secondary rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-theme-accent-primary rounded-lg flex items-center justify-center">
                      <FaUtensils className="text-theme-text-inverse" />
                    </div>
                    <div>
                      <p className="font-raleway text-theme-text-primary">{item.name}</p>
                      <p className="text-sm text-theme-text-tertiary">{item.orders} orders</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-sans text-theme-text-primary">₹{item.revenue.toLocaleString('en-IN')}</p>
                    <div className="flex items-center space-x-1">
                      <div className="w-12 bg-theme-bg-primary rounded-full h-2">
                        <div
                          className="bg-theme-accent-primary h-2 rounded-full"
                          style={{ width: `${(item.orders / Math.max(...currentData.topItems.map(i => i.orders))) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Peak Performance Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="admin-card p-6 rounded-xl"
        >
          <h3 className="text-lg font-fredoka text-theme-text-primary mb-4">Performance Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-theme-bg-secondary rounded-lg">
              <FaClock className="text-theme-accent-primary text-2xl mx-auto mb-2" />
              <p className="font-raleway text-theme-text-primary">
                Peak {timeRange === 'today' ? 'Hour' : timeRange === 'week' ? 'Day' : 'Week'}
              </p>
              <p className="text-lg font-fredoka text-theme-accent-primary">
                {currentData.peakHour || currentData.peakDay || currentData.peakWeek}
              </p>
            </div>
            <div className="text-center p-4 bg-theme-bg-secondary rounded-lg">
              <FaRupeeSign className="text-green-500 text-2xl mx-auto mb-2" />
              <p className="font-raleway text-theme-text-primary">Revenue Growth</p>
              <p className={`text-lg font-fredoka ${getTrendColor(currentData.trends?.revenue)}`}>
                {currentData.trends?.revenue > 0 ? '+' : ''}{currentData.trends?.revenue}%
              </p>
            </div>
            <div className="text-center p-4 bg-theme-bg-secondary rounded-lg">
              <FaShoppingCart className="text-blue-500 text-2xl mx-auto mb-2" />
              <p className="font-raleway text-theme-text-primary">Order Growth</p>
              <p className={`text-lg font-fredoka ${getTrendColor(currentData.trends?.orders)}`}>
                {currentData.trends?.orders > 0 ? '+' : ''}{currentData.trends?.orders}%
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </ZoneShopLayout>
  );
};

export default ZoneShopAnalytics;
