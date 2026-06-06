import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import {
  FaRupeeSign,
  FaStore,
  FaMapMarkerAlt,
  FaChartLine,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSyncAlt,
  FaCrown,
  FaBuilding
} from 'react-icons/fa';
import { useGetLiveOrdersQuery } from '../../../store/api/ordersApi';
import { api } from '../../../store/api/baseApi';
import SuperAdminLayout from './SuperAdminLayout';

// Inject admin endpoints into the base API
const adminApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getAdminRestaurants: builder.query({ query: () => '/admin/restaurants' }),
    getAdminZones: builder.query({ query: () => '/admin/zones' }),
    getAdminUsers: builder.query({ query: () => '/admin/users' }),
  }),
  overrideExisting: false,
});

const { useGetAdminRestaurantsQuery, useGetAdminZonesQuery, useGetAdminUsersQuery } = adminApi;

const SuperAdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch admin data using RTK Query
  const { data: restaurantsData, error: restaurantsError, isLoading: restaurantsLoading, refetch: refetchRest } = useGetAdminRestaurantsQuery();
  const { data: zonesData, error: zonesError, isLoading: zonesLoading, refetch: refetchZones } = useGetAdminZonesQuery();
  const { data: usersData, error: usersError, isLoading: usersLoading, refetch: refetchUsers } = useGetAdminUsersQuery();

  // Fetch real orders data
  const { 
    data: ordersData, 
    isLoading: ordersLoading, 
    error: ordersError,
    refetch: refetchOrders 
  } = useGetLiveOrdersQuery({ role: 'admin', entityId: null }, { refetchOnMountOrArgChange: true });

  // Process data for display safely
  const orders = Array.isArray(ordersData) ? ordersData : [];
  const restaurants = Array.isArray(restaurantsData?.data || restaurantsData) ? (restaurantsData?.data || restaurantsData) : [];
  const zones = Array.isArray(zonesData?.data || zonesData) ? (zonesData?.data || zonesData) : [];
  const users = Array.isArray(usersData?.data || usersData) ? (usersData?.data || usersData) : [];

  // Calculate real-time statistics
  const orderStats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => ['pending', 'confirmed'].includes(o.status)).length,
    preparing: orders.filter(o => ['preparing', 'accepted'].includes(o.status)).length,
    ready: orders.filter(o => o.status === 'ready').length,
    completed: orders.filter(o => ['completed', 'delivered'].includes(o.status)).length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    totalRevenue: orders.reduce((sum, order) => sum + (order.pricing?.total || order.total || 0), 0)
  }), [orders]);

  const dashboardStats = useMemo(() => ({
    restaurants: {
      total: restaurants.length,
      active: restaurants.filter(r => r.status === 'active' || r.active === true).length,
      premium: restaurants.filter(r => r.subscriptionPlan === 'premium' || r.subscription?.plan === 'premium' || r.planType === 'premium').length,
      get regular() { return this.total - this.premium; }
    },
    zones: {
      total: zones.length,
      premium: zones.filter(z => z.subscriptionPlan === 'premium' || z.subscription?.plan === 'premium' || z.planType === 'premium').length,
      get regular() { return this.total - this.premium; }
    },
    users: {
      total: users.length,
      active: users.filter(u => u.status === 'active' || u.active === true).length
    }
  }), [restaurants, zones, users]);

  useEffect(() => {
    const allLoading = restaurantsLoading || zonesLoading || usersLoading || ordersLoading;
    if (!allLoading) setLoading(false);
  }, [restaurantsLoading, zonesLoading, usersLoading, ordersLoading]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchOrders(), refetchRest(), refetchZones(), refetchUsers()]);
    setTimeout(() => setIsRefreshing(false), 500); // UI feedback delay
  };

  const getPercent = (part, total) => total > 0 ? `${(part / total) * 100}%` : '0%';

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center min-h-[70vh]">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center">
            <div className="w-14 h-14 border-4 border-theme-border-primary border-t-theme-accent-primary rounded-full animate-spin mb-4"></div>
            <p className="text-theme-text-primary font-fredoka text-xl">Loading Dashboard...</p>
          </motion.div>
        </div>
      </SuperAdminLayout>
    );
  }

  if (ordersError || restaurantsError || zonesError || usersError) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="text-center bg-rose-500/5 p-8 rounded-3xl border border-rose-500/20 max-w-md">
            <FaExclamationTriangle className="text-5xl text-rose-500 mx-auto mb-4" />
            <h3 className="text-xl font-fredoka text-theme-text-primary mb-2">System Error</h3>
            <p className="text-theme-text-secondary font-raleway mb-6 text-sm">Unable to connect to the database. Please check server status.</p>
            <button onClick={handleRefresh} className="px-6 py-3 bg-theme-accent-primary text-white rounded-xl font-raleway font-semibold hover:bg-theme-accent-primary/90 transition-colors shadow-lg shadow-theme-accent-primary/20">
              Retry Connection
            </button>
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  const kpiStats = [
    { title: "Today's Revenue", value: `₹${orderStats.totalRevenue.toLocaleString('en-IN')}`, icon: FaRupeeSign, gradient: 'from-emerald-400 to-emerald-600', text: 'text-emerald-500', shadow: 'shadow-emerald-500/20', badge: null },
    { title: 'Total Restaurants', value: dashboardStats.restaurants.total, icon: FaStore, gradient: 'from-blue-400 to-blue-600', text: 'text-blue-500', shadow: 'shadow-blue-500/20', badge: `${dashboardStats.restaurants.active} Active` },
    { title: 'Total Food Zones', value: dashboardStats.zones.total, icon: FaMapMarkerAlt, gradient: 'from-purple-400 to-purple-600', text: 'text-purple-500', shadow: 'shadow-purple-500/20', badge: null },
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-8 max-w-[1400px] mx-auto pb-10">
        
        {/* Header Area */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-theme-bg-secondary p-8 rounded-3xl border border-theme-border-primary/60 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-theme-accent-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
          
          <div className="relative z-10">
            <motion.h1 
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} 
              className="text-3xl md:text-4xl font-fredoka text-theme-text-primary mb-2"
            >
              Executive Dashboard
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
              className="text-theme-text-secondary font-raleway"
            >
              High-level platform overview and real-time business metrics.
            </motion.p>
          </div>
          <motion.button 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="relative z-10 flex items-center justify-center space-x-2 px-6 py-3 bg-theme-bg border border-theme-border-primary hover:border-theme-accent-primary/50 rounded-xl text-theme-text-primary transition-all shadow-sm hover:shadow-md disabled:opacity-50 group font-medium"
          >
            <FaSyncAlt className={`${isRefreshing ? 'animate-spin text-theme-accent-primary' : 'text-theme-text-secondary group-hover:text-theme-accent-primary transition-colors'}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh Data'}</span>
          </motion.button>
        </div>

        {/* Top KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {kpiStats.map((stat, index) => (
            <motion.div 
              key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} 
              className="relative overflow-hidden bg-theme-bg-secondary border border-theme-border-primary/60 rounded-3xl p-6 group hover:border-theme-border-primary transition-colors duration-300 shadow-sm hover:shadow-md"
            >
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <p className="text-sm font-medium text-theme-text-tertiary font-raleway uppercase tracking-wider">{stat.title}</p>
                    {stat.badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-md uppercase tracking-wider">
                        {stat.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-3xl font-fredoka text-theme-text-primary">{stat.value}</p>
                </div>
                <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${stat.gradient} ${stat.shadow} shadow-lg text-white`}>
                  <stat.icon className="text-xl" />
                </div>
              </div>
              <stat.icon className={`absolute -bottom-6 -right-6 text-8xl ${stat.text} opacity-5 group-hover:opacity-10 transition-opacity duration-500 transform group-hover:scale-110 group-hover:-rotate-12`} />
            </motion.div>
          ))}
        </div>

        {/* Business Health (Subscriptions) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Restaurant Subscriptions */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-theme-bg-secondary border border-theme-border-primary/60 rounded-3xl p-8 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <div className="flex justify-between items-center mb-8 relative z-10">
              <h3 className="text-xl font-fredoka text-theme-text-primary">Restaurant Plans</h3>
              <div className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-500">
                <FaCrown className="text-lg" />
              </div>
            </div>
            
            <div className="space-y-6 relative z-10">
              <div>
                <div className="flex justify-between text-sm mb-2 font-raleway">
                  <span className="text-theme-text-primary font-bold uppercase tracking-wider">Premium</span>
                  <span className="text-theme-text-secondary font-medium">{dashboardStats.restaurants.premium} Accounts</span>
                </div>
                <div className="w-full bg-theme-bg rounded-full h-3 overflow-hidden border border-theme-border-primary/50 shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }} animate={{ width: getPercent(dashboardStats.restaurants.premium, dashboardStats.restaurants.total) }} transition={{ duration: 1, ease: "easeOut" }}
                    className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-full rounded-full" 
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2 font-raleway">
                  <span className="text-theme-text-primary font-bold uppercase tracking-wider">Regular</span>
                  <span className="text-theme-text-secondary font-medium">{dashboardStats.restaurants.regular} Accounts</span>
                </div>
                <div className="w-full bg-theme-bg rounded-full h-3 overflow-hidden border border-theme-border-primary/50 shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }} animate={{ width: getPercent(dashboardStats.restaurants.regular, dashboardStats.restaurants.total) }} transition={{ duration: 1, ease: "easeOut" }}
                    className="bg-theme-text-tertiary h-full rounded-full opacity-50" 
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Zone Subscriptions */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-theme-bg-secondary border border-theme-border-primary/60 rounded-3xl p-8 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <div className="flex justify-between items-center mb-8 relative z-10">
              <h3 className="text-xl font-fredoka text-theme-text-primary">Zone Plans</h3>
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                <FaBuilding className="text-lg" />
              </div>
            </div>
            
            <div className="space-y-6 relative z-10">
              <div>
                <div className="flex justify-between text-sm mb-2 font-raleway">
                  <span className="text-theme-text-primary font-bold uppercase tracking-wider">Premium Zones</span>
                  <span className="text-theme-text-secondary font-medium">{dashboardStats.zones.premium} Accounts</span>
                </div>
                <div className="w-full bg-theme-bg rounded-full h-3 overflow-hidden border border-theme-border-primary/50 shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }} animate={{ width: getPercent(dashboardStats.zones.premium, dashboardStats.zones.total) }} transition={{ duration: 1, ease: "easeOut" }}
                    className="bg-gradient-to-r from-blue-400 to-blue-500 h-full rounded-full" 
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2 font-raleway">
                  <span className="text-theme-text-primary font-bold uppercase tracking-wider">Regular Zones</span>
                  <span className="text-theme-text-secondary font-medium">{dashboardStats.zones.regular} Accounts</span>
                </div>
                <div className="w-full bg-theme-bg rounded-full h-3 overflow-hidden border border-theme-border-primary/50 shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }} animate={{ width: getPercent(dashboardStats.zones.regular, dashboardStats.zones.total) }} transition={{ duration: 1, ease: "easeOut" }}
                    className="bg-theme-text-tertiary h-full rounded-full opacity-50" 
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Live Operational Pulse */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="bg-theme-bg-secondary border border-theme-border-primary/60 rounded-3xl p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <h2 className="text-xl font-fredoka text-theme-text-primary">Platform Operational Pulse</h2>
            <span className="flex items-center text-xs font-bold uppercase tracking-wider text-emerald-500 px-4 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2.5"></span>
              {orderStats.total} Live Orders
            </span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex flex-col items-center justify-center p-6 bg-theme-bg rounded-2xl border border-theme-border-primary/40 hover:border-amber-500/50 transition-colors shadow-sm hover:shadow-md group">
              <FaClock className="text-amber-500 text-2xl mb-3 group-hover:scale-110 transition-transform" />
              <p className="text-theme-text-primary font-fredoka text-3xl">{orderStats.pending}</p>
              <p className="text-theme-text-tertiary font-raleway text-xs font-bold uppercase tracking-wider mt-1">Pending</p>
            </div>
            
            <div className="flex flex-col items-center justify-center p-6 bg-theme-bg rounded-2xl border border-theme-border-primary/40 hover:border-blue-500/50 transition-colors shadow-sm hover:shadow-md group">
              <FaChartLine className="text-blue-500 text-2xl mb-3 group-hover:scale-110 transition-transform" />
              <p className="text-theme-text-primary font-fredoka text-3xl">{orderStats.preparing}</p>
              <p className="text-theme-text-tertiary font-raleway text-xs font-bold uppercase tracking-wider mt-1">Preparing</p>
            </div>
            
            <div className="flex flex-col items-center justify-center p-6 bg-theme-bg rounded-2xl border border-theme-border-primary/40 hover:border-emerald-400/50 transition-colors shadow-sm hover:shadow-md group">
              <FaCheckCircle className="text-emerald-400 text-2xl mb-3 group-hover:scale-110 transition-transform" />
              <p className="text-theme-text-primary font-fredoka text-3xl">{orderStats.ready}</p>
              <p className="text-theme-text-tertiary font-raleway text-xs font-bold uppercase tracking-wider mt-1">Ready</p>
            </div>
            
            <div className="flex flex-col items-center justify-center p-6 bg-theme-bg rounded-2xl border border-theme-border-primary/40 hover:border-emerald-600/50 transition-colors shadow-sm hover:shadow-md group">
              <FaCheckCircle className="text-emerald-600 text-2xl mb-3 group-hover:scale-110 transition-transform" />
              <p className="text-theme-text-primary font-fredoka text-3xl">{orderStats.completed}</p>
              <p className="text-theme-text-tertiary font-raleway text-xs font-bold uppercase tracking-wider mt-1">Completed</p>
            </div>
            
            <div className="flex flex-col items-center justify-center p-6 bg-theme-bg rounded-2xl border border-theme-border-primary/40 hover:border-rose-500/50 transition-colors shadow-sm hover:shadow-md group col-span-2 md:col-span-1">
              <FaExclamationTriangle className="text-rose-500 text-2xl mb-3 group-hover:scale-110 transition-transform" />
              <p className="text-theme-text-primary font-fredoka text-3xl">{orderStats.cancelled}</p>
              <p className="text-theme-text-tertiary font-raleway text-xs font-bold uppercase tracking-wider mt-1">Cancelled</p>
            </div>
          </div>
        </motion.div>

      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminDashboard;