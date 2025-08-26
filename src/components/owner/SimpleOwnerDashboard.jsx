import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaStore, FaUsers, FaChartLine, FaQrcode, FaCog } from 'react-icons/fa';

const SimpleOwnerDashboard = () => {
  const [currentOwner, setCurrentOwner] = useState(null);

  useEffect(() => {
    // Get current owner info from session storage
    const ownerData = sessionStorage.getItem('currentOwner');
    if (ownerData) {
      setCurrentOwner(JSON.parse(ownerData));
    }
  }, []);

  if (!currentOwner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-2xl font-fredoka mb-4">Loading...</h2>
          <p className="font-raleway">Please log in to access your dashboard</p>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Total Orders Today', value: '24', icon: FaChartLine, color: 'text-blue-400' },
    { label: 'Active Tables', value: '8', icon: FaStore, color: 'text-green-400' },
    { label: 'Revenue Today', value: '$1,247', icon: FaUsers, color: 'text-yellow-400' },
    { label: 'QR Scans', value: '156', icon: FaQrcode, color: 'text-purple-400' }
  ];

  const recentOrders = [
    { id: 1, table: 5, items: 'Margherita Pizza, Caesar Salad', total: '$32.50', time: '2:30 PM', status: 'preparing' },
    { id: 2, table: 3, items: 'Spaghetti Carbonara, Tiramisu', total: '$28.75', time: '2:15 PM', status: 'ready' },
    { id: 3, table: 7, items: 'Pepperoni Pizza, Garlic Bread', total: '$24.99', time: '1:45 PM', status: 'completed' },
    { id: 4, table: 2, items: 'Lasagna, House Wine', total: '$35.00', time: '1:30 PM', status: 'completed' }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'preparing': return 'bg-yellow-500/20 text-yellow-400';
      case 'ready': return 'bg-green-500/20 text-green-400';
      case 'completed': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-fredoka text-white mb-2">
                Welcome back, {currentOwner.ownerName}!
              </h1>
              <p className="text-white/70 font-raleway">
                Managing {currentOwner.restaurantName}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-white/60 font-raleway text-sm">Restaurant ID</p>
                <p className="text-white font-raleway">{currentOwner.id || 'R001'}</p>
              </div>
              <button className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg transition-colors">
                <FaCog />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-white/10 ${stat.color}`}>
                  <stat.icon className="text-xl" />
                </div>
              </div>
              <h3 className="text-2xl font-fredoka text-white mb-1">{stat.value}</h3>
              <p className="text-white/60 font-raleway text-sm">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8"
        >
          <h2 className="text-xl font-fredoka text-white mb-6">Recent Orders</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-3 text-white/70 font-raleway">Table</th>
                  <th className="text-left p-3 text-white/70 font-raleway">Items</th>
                  <th className="text-left p-3 text-white/70 font-raleway">Total</th>
                  <th className="text-left p-3 text-white/70 font-raleway">Time</th>
                  <th className="text-left p-3 text-white/70 font-raleway">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-white/5">
                    <td className="p-3 text-white font-raleway">#{order.table}</td>
                    <td className="p-3 text-white/80 font-raleway">{order.items}</td>
                    <td className="p-3 text-white font-raleway">{order.total}</td>
                    <td className="p-3 text-white/70 font-raleway">{order.time}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-raleway ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-center">
            <FaStore className="text-3xl text-accent mx-auto mb-4" />
            <h3 className="text-lg font-fredoka text-white mb-2">Menu Management</h3>
            <p className="text-white/60 font-raleway text-sm mb-4">
              Update your menu items and prices
            </p>
            <button className="bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-lg font-raleway transition-colors">
              Manage Menu
            </button>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-center">
            <FaQrcode className="text-3xl text-accent mx-auto mb-4" />
            <h3 className="text-lg font-fredoka text-white mb-2">QR Codes</h3>
            <p className="text-white/60 font-raleway text-sm mb-4">
              Generate QR codes for your tables
            </p>
            <button className="bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-lg font-raleway transition-colors">
              Generate QR
            </button>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-center">
            <FaChartLine className="text-3xl text-accent mx-auto mb-4" />
            <h3 className="text-lg font-fredoka text-white mb-2">Analytics</h3>
            <p className="text-white/60 font-raleway text-sm mb-4">
              View detailed sales reports
            </p>
            <button className="bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-lg font-raleway transition-colors">
              View Reports
            </button>
          </div>
        </motion.div>

        {/* Account Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8 bg-white/5 rounded-lg p-4"
        >
          <h4 className="text-white font-raleway font-semibold mb-2">Account Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-white/60 font-raleway">Owner: </span>
              <span className="text-white font-raleway">{currentOwner.ownerName}</span>
            </div>
            <div>
              <span className="text-white/60 font-raleway">Restaurant: </span>
              <span className="text-white font-raleway">{currentOwner.restaurantName}</span>
            </div>
            <div>
              <span className="text-white/60 font-raleway">Mobile: </span>
              <span className="text-white font-raleway">{currentOwner.mobile}</span>
            </div>
            <div>
              <span className="text-white/60 font-raleway">Account Status: </span>
              <span className="text-green-400 font-raleway">Active</span>
            </div>
          </div>
          <p className="text-white/40 font-raleway text-xs mt-3">
            Account credentials managed by TableServe admin. Contact support for any account changes.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default SimpleOwnerDashboard;
