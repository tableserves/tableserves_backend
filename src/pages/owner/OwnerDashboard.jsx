import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import DataService from '../../services/DataService';
import AuthService from '../../services/AuthService';
import {
  FaShoppingCart,
  FaDollarSign,
  FaUsers,
  FaUtensils,
  FaArrowUp,
  FaArrowDown
} from 'react-icons/fa';

const OwnerDashboard = () => {
  const dispatch = useDispatch();
  const { currentRestaurant } = useSelector((state) => state.restaurant);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = () => {
      setLoading(true);
      try {
        const user = AuthService.getCurrentUser();
        if (user && user.role === 'restaurant_owner') {
          const restaurantStats = DataService.getRestaurantOwnerStats(user.restaurantId);
          setStats(restaurantStats);
        }
      } catch (error) {
        console.error('Error loading restaurant dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const kpiCards = stats ? [
    {
      title: 'Today\'s Orders',
      value: stats.todayOrders.toString(),
      change: stats.todayOrders > 0 ? '+15%' : '0%',
      trend: stats.todayOrders > 0 ? 'up' : 'neutral',
      icon: FaShoppingCart,
      color: 'bg-blue-500'
    },
    {
      title: 'Today\'s Revenue',
      value: stats.todayRevenue,
      change: stats.todayRevenue !== '₹0' ? '+8%' : '0%',
      trend: stats.todayRevenue !== '₹0' ? 'up' : 'neutral',
      icon: FaDollarSign,
      color: 'bg-accent'
    },
    {
      title: 'Active Tables',
      value: `${Math.min(stats.totalTables, Math.floor(stats.totalTables * 0.7))}/${stats.totalTables}`,
      change: stats.totalTables > 0 ? '+2' : '0',
      trend: stats.totalTables > 0 ? 'up' : 'neutral',
      icon: FaUsers,
      color: 'bg-green-500'
    },
    {
      title: 'Menu Items',
      value: stats.activeMenuItems.toString(),
      change: stats.activeMenuItems > 0 ? '+3' : '0',
      trend: stats.activeMenuItems > 0 ? 'up' : 'neutral',
      icon: FaUtensils,
      color: 'bg-purple-500'
    }
  ] : [];

  const recentOrders = [
    { id: '#001', table: 5, items: 3, amount: '₹45.50', status: 'preparing', time: '2 min ago' },
    { id: '#002', table: 3, items: 2, amount: '₹28.00', status: 'ready', time: '5 min ago' },
    { id: '#003', table: 7, items: 4, amount: '₹67.25', status: 'completed', time: '8 min ago' },
    { id: '#004', table: 2, items: 1, amount: '₹15.75', status: 'received', time: '12 min ago' },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'received': return 'bg-blue-500/20 text-blue-400';
      case 'preparing': return 'bg-yellow-500/20 text-yellow-400';
      case 'ready': return 'bg-green-500/20 text-green-400';
      case 'completed': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-fredoka text-white mb-2">
            Dashboard
          </h1>
          <p className="text-white/70 font-raleway">
            Welcome back! Here's what's happening at your restaurant today.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${card.color}`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
              <div className={`flex items-center text-sm font-raleway ${card.trend === 'up' ? 'text-green-400' : 'text-red-400'
                }`}>
                {card.trend === 'up' ? <FaArrowUp /> : <FaArrowDown />}
                <span className="ml-1">{card.change}</span>
              </div>
            </div>
            <h3 className="text-2xl font-fredoka text-white mb-1">
              {card.value}
            </h3>
            <p className="text-white/70 font-raleway text-sm">
              {card.title}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Recent Orders */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10"
      >
        <h2 className="text-xl font-fredoka text-white mb-4">Recent Orders</h2>
        <div className="space-y-4">
          {recentOrders.map((order) => (
            <div key={order.id} className="flex items-center justify-between py-3 border-b border-white/10 last:border-b-0">
              <div className="flex items-center space-x-4">
                <div>
                  <p className="text-white font-raleway font-semibold">{order.id}</p>
                  <p className="text-white/60 text-sm">Table {order.table} • {order.items} items</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-white font-raleway font-semibold">{order.amount}</span>
                <span className={`px-3 py-1 rounded-full text-sm font-raleway capitalize ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
                <span className="text-white/60 text-sm">{order.time}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10"
      >
        <h2 className="text-xl font-fredoka text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="bg-accent hover:bg-accent/90 text-white font-raleway font-semibold py-3 px-6 rounded-lg transition-colors">
            Add Menu Item
          </button>
          <button className="bg-white/10 hover:bg-white/20 text-white font-raleway font-semibold py-3 px-6 rounded-lg transition-colors border border-white/20">
            View All Orders
          </button>
          <button className="bg-white/10 hover:bg-white/20 text-white font-raleway font-semibold py-3 px-6 rounded-lg transition-colors border border-white/20">
            Generate QR Codes
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default OwnerDashboard;