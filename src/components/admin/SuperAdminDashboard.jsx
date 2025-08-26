import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboardStats } from '../../store/slices/uiSlice';
import LocalStorageService from '../../services/LocalStorageService';
import SampleDataService from '../../services/SampleDataService';
import {
  FaStore,
  FaUsers,
  FaRupeeSign,
  FaShoppingCart,
  FaArrowUp,
  FaArrowDown,
  FaChartLine,
  FaExclamationTriangle,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaQrcode,
  FaEye
} from 'react-icons/fa';
import SuperAdminLayout from './SuperAdminLayout';
import SubscriptionUpdatesPanel from './SubscriptionUpdatesPanel';

const SuperAdminDashboard = () => {
  const dispatch = useDispatch();
  const { stats, loading, error } = useSelector((state) => state.ui.dashboard);

  useEffect(() => {
    // Initialize sample data if needed for demo/testing
    const zones = LocalStorageService.getZones();
    const restaurants = LocalStorageService.getRestaurants();
    
    if (zones.length === 0 || restaurants.length === 0) {
      console.log('Initializing sample data for Super Admin dashboard');
      SampleDataService.initializeSampleData();
    }
    
    dispatch(fetchDashboardStats('admin'));
    
    // Listen for subscription updates from restaurant/zone owners
    const handleSubscriptionUpdate = (event) => {
      console.log('Super Admin Dashboard: Subscription update detected:', event.detail);
      
      // Refresh dashboard statistics to reflect new subscription data
      dispatch(fetchDashboardStats('admin'));
      
      console.log('Super Admin Dashboard: Stats refreshed after subscription update');
    };
    
    window.addEventListener('subscriptionUpdated', handleSubscriptionUpdate);
    
    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener('subscriptionUpdated', handleSubscriptionUpdate);
    };
  }, [dispatch]);

  // Real dashboard data from local storage with safe property access
  const kpiData = stats ? [
    {
      title: 'Total Restaurants',
      value: (stats.totalRestaurants || 0).toString(),
      change: (stats.monthlyGrowth || 0) > 0 ? `+${stats.monthlyGrowth}%` : '0%',
      trend: (stats.monthlyGrowth || 0) > 0 ? 'up' : 'neutral',
      icon: FaStore,
      color: 'bg-status-info',
      description: `${stats.activeRestaurants || stats.totalRestaurants || 0} active restaurants`
    },
    {
      title: 'Food Zones',
      value: (stats.totalZones || 0).toString(),
      change: (stats.monthlyGrowth || 0) > 0 ? `+${Math.round((stats.monthlyGrowth || 0) / 4)}` : '0',
      trend: (stats.monthlyGrowth || 0) > 0 ? 'up' : 'neutral',
      icon: FaMapMarkerAlt,
      color: 'bg-theme-accent-primary',
      description: `${stats.activeZones || stats.totalZones || 0} active zones`
    },
    {
      title: 'Total Revenue',
      value: stats.totalRevenue || '₹0',
      change: (stats.monthlyGrowth || 0) > 0 ? `+${stats.monthlyGrowth}%` : '0%',
      trend: (stats.monthlyGrowth || 0) > 0 ? 'up' : 'neutral',
      icon: FaRupeeSign,
      color: 'bg-theme-accent-primary',
      description: 'Platform revenue total'
    },
    {
      title: 'Total Orders',
      value: (stats.totalOrders || 0).toString(),
      change: (stats.monthlyGrowth || 0) > 0 ? `+${stats.monthlyGrowth}%` : '0%',
      trend: (stats.monthlyGrowth || 0) > 0 ? 'up' : 'neutral',
      icon: FaShoppingCart,
      color: 'bg-status-success',
      description: 'Orders processed total'
    },
    {
      title: 'Active Users',
      value: (stats.activeUsers || stats.totalCustomers || 0).toString(),
      change: '0%',
      trend: 'neutral',
      icon: FaUsers,
      color: 'bg-status-warning',
      description: 'Active restaurant & zone owners'
    },
    {
      title: 'Total Vendors',
      value: (stats.totalVendors || 0).toString(),
      change: (stats.monthlyGrowth || 0) > 0 ? `+${Math.round((stats.monthlyGrowth || 0) / 2)}%` : '0%',
      trend: (stats.monthlyGrowth || 0) > 0 ? 'up' : 'neutral',
      icon: FaQrcode,
      color: 'bg-status-info',
      description: 'Total vendors across zones'
    }
  ] : [];

  // Generate recent activity from real data with safe property access
  const recentActivity = stats ? (() => {
    const activities = [];

    if ((stats.totalRestaurants || 0) > 0) {
      activities.push({
        id: 1,
        type: 'success',
        title: 'Restaurants Active',
        description: `${stats.activeRestaurants || stats.totalRestaurants || 0} restaurants currently active on platform`,
        time: 'Current status',
        icon: FaCheckCircle
      });
    }

    if ((stats.totalZones || 0) > 0) {
      activities.push({
        id: 2,
        type: 'info',
        title: 'Food Zones Operating',
        description: `${stats.activeZones || stats.totalZones || 0} food zones currently operational`,
        time: 'Current status',
        icon: FaChartLine
      });
    }

    if ((stats.totalVendors || 0) > 0) {
      activities.push({
        id: 3,
        type: 'success',
        title: 'Vendors Operating',
        description: `${stats.totalVendors || 0} vendors operating across all zones`,
        time: 'Ready for orders',
        icon: FaStore
      });
    }

    if ((stats.totalOrders || 0) === 0) {
      activities.push({
        id: 4,
        type: 'warning',
        title: 'No Orders Yet',
        description: 'Platform ready for first orders',
        time: 'Waiting for activity',
        icon: FaExclamationTriangle
      });
    }

    if (activities.length === 0) {
      activities.push({
        id: 1,
        type: 'info',
        title: 'Platform Ready',
        description: 'System initialized and ready for restaurants and zones',
        time: 'System status',
        icon: FaCheckCircle
      });
    }

    return activities;
  })() : [];

  // Generate top performers from real data
  const topPerformers = stats ? (() => {
    const performers = [];
    const restaurants = LocalStorageService.getRestaurants();
    const zones = LocalStorageService.getZones();

    // Add restaurants with revenue data
    restaurants.forEach(restaurant => {
      if (restaurant.revenue && restaurant.orders) {
        performers.push({
          name: restaurant.name,
          type: 'Restaurant',
          revenue: restaurant.revenue,
          orders: restaurant.orders,
          performance: restaurant.performance || 0,
          status: restaurant.status || 'inactive'
        });
      }
    });

    // Add zones with revenue data
    zones.forEach(zone => {
      if (zone.totalRevenue && zone.totalOrders) {
        performers.push({
          name: zone.name,
          type: 'Zone',
          revenue: zone.totalRevenue,
          orders: zone.totalOrders,
          performance: zone.performance || 0,
          status: zone.status || 'inactive'
        });
      }
    });

    // Sort by revenue (extract number from string like "₹1,234") with safe parsing
    performers.sort((a, b) => {
      const aRevenue = parseInt((a.revenue || '0').toString().replace(/[₹,]/g, '')) || 0;
      const bRevenue = parseInt((b.revenue || '0').toString().replace(/[₹,]/g, '')) || 0;
      return bRevenue - aRevenue;
    });

    return performers.slice(0, 4); // Top 4 performers
  })() : [];

  // Performance metrics with safe property access
  const performanceMetrics = stats ? {
    overall: stats.overallPerformance || 0,
    restaurants: stats.restaurantPerformance || 0,
    zones: stats.zonePerformance || 0
  } : { overall: 0, restaurants: 0, zones: 0 };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'success': return <FaCheckCircle className="status-success" />;
      case 'warning': return <FaExclamationTriangle className="status-warning" />;
      case 'error': return <FaExclamationTriangle className="status-error" />;
      default: return <FaChartLine className="status-info" />;
    }
  };


  if (loading || !stats) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 spinner-theme rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-theme-text-primary font-raleway">Loading dashboard...</p>
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <>
      {/* Floating notification panel */}
      <SubscriptionUpdatesPanel />
      
      <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-raleway text-theme-text-primary mb-2">Super Admin Dashboard</h1>
            <p className="text-theme-text-secondary font-raleway text-sm sm:text-base">Complete platform overview and management</p>
          </div>

        </div>


        {/* KPI Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
        >
          {kpiData.map((kpi, index) => (
            <motion.div
              key={kpi.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="admin-card rounded-2xl p-6 hover:border-theme-accent-primary/30 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${kpi.color} rounded-xl flex items-center justify-center`}>
                  <kpi.icon className="text-theme-text-inverse text-xl" />
                </div>

              </div>
              <h3 className="text-2xl font-fredoka text-theme-text-primary mb-1">{kpi.value}</h3>
              <p className="text-theme-text-primary font-raleway font-medium mb-1">{kpi.title}</p>
              <p className="text-theme-text-tertiary font-raleway text-sm">{kpi.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 admin-card rounded-2xl p-4 sm:p-6"
          >
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-2 sm:space-y-0">
              <h2 className="text-lg sm:text-xl font-fredoka text-theme-text-primary">Recent Activity</h2>
              <button className="text-theme-accent-primary hover:text-theme-accent-hover font-raleway text-sm self-start sm:self-auto">
                View All
              </button>
            </div>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-4 p-4 rounded-lg hover:bg-theme-bg-hover transition-colors">
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-theme-text-primary font-raleway font-medium">{activity.title}</h4>
                    <p className="text-theme-text-secondary font-raleway text-sm mt-1">{activity.description}</p>
                    <p className="text-theme-text-tertiary font-raleway text-xs mt-2">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Top Performers */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="admin-card rounded-2xl p-4 sm:p-6"
          >
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-2 sm:space-y-0">
              <h2 className="text-lg sm:text-xl font-fredoka text-theme-text-primary">Performance Metrics</h2>
            </div>

            <div className="space-y-4">
              {/* Overall Performance */}
              <div className="bg-theme-bg-hover rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-raleway font-semibold text-theme-text-primary">Overall Platform</h3>
                  <span className="text-sm font-medium px-2 py-1 rounded-full bg-accent/10 text-accent">
                    {performanceMetrics.overall}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-accent h-2.5 rounded-full"
                    style={{ width: `${performanceMetrics.overall}%` }}
                  ></div>
                </div>
              </div>

              {/* Restaurant Performance */}
              <div className="bg-theme-bg-hover rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-raleway font-semibold text-theme-text-primary">Restaurants</h3>
                  <span className="text-sm font-medium px-2 py-1 rounded-full bg-green-100 text-green-600">
                    {performanceMetrics.restaurants}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-green-500 h-2.5 rounded-full"
                    style={{ width: `${performanceMetrics.restaurants}%` }}
                  ></div>
                </div>
              </div>

              {/* Zone Performance */}
              <div className="bg-theme-bg-hover rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-raleway font-semibold text-theme-text-primary">Food Zones</h3>
                  <span className="text-sm font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-600">
                    {performanceMetrics.zones}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-500 h-2.5 rounded-full"
                    style={{ width: `${performanceMetrics.zones}%` }}
                  ></div>
                </div>
              </div>

              {/* Top Performers List */}
              {topPerformers.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-raleway font-semibold text-theme-text-primary mb-3">Top Performers</h3>
                  <div className="space-y-2">
                    {topPerformers.map((performer, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-theme-bg-hover">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${performer.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                          <span className="font-raleway text-theme-text-primary">{performer.name}</span>
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{performer.type}</span>
                        </div>
                        <div className="text-sm font-medium text-theme-text-secondary">{performer.revenue}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
      </SuperAdminLayout>
    </>
  );
};

export default SuperAdminDashboard;
