import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DatabaseService from '../../../../services/DatabaseService';
import { RESTAURANT_PLANS } from '../../../subscription/constants/plans';
import {
  FaSearch,
  FaStore,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaEye,
  FaTable,
  FaPhone,
  FaEnvelope,
  FaTimes,
  FaFilter,
  FaStar
} from 'react-icons/fa';
import SuperAdminLayout from '../SuperAdminLayout';

const RestaurantManagement = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        setLoading(true);
        const data = await DatabaseService.getRestaurants();
        
        const transformedRestaurants = (Array.isArray(data) ? data : []).map(restaurant => ({
          id: restaurant.id || restaurant._id,
          name: restaurant.name || 'Unnamed Restaurant',
          cuisine: restaurant.cuisine || 'Multi-cuisine',
          city: restaurant.city || 'Unknown City',
          state: restaurant.state || '',
          ownerName: restaurant.ownerName || 'Unknown Owner',
          ownerEmail: restaurant.ownerEmail || 'No email provided',
          ownerPhone: restaurant.ownerPhone || 'No phone provided',
          subscriptionPlan: (restaurant.subscriptionPlan || 'free').toLowerCase(),
          status: restaurant.status || 'pending',
          maxTables: restaurant.maxTables,
          createdAt: restaurant.createdAt,
        }));
        
        setRestaurants(transformedRestaurants);
      } catch (error) {
        console.error('Error fetching restaurants:', error);
        setRestaurants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  // Memoize stats to prevent recalculation on every render
  const stats = useMemo(() => {
    // Only count standard tier restaurants for this specific page
    const standardRestaurants = restaurants.filter(r => r.subscriptionPlan !== 'premium');
    return {
      total: standardRestaurants.length,
      free: standardRestaurants.filter(r => r.subscriptionPlan === 'free').length,
      basic: standardRestaurants.filter(r => r.subscriptionPlan === 'basic').length,
      advanced: standardRestaurants.filter(r => r.subscriptionPlan === 'advanced').length,
    };
  }, [restaurants]);

  // Memoize filtering logic
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter(restaurant => {
      if (!restaurant) return false;

      const plan = restaurant.subscriptionPlan;
      
      // EXCLUDE premium restaurants - they are handled in Premium Restaurant Management
      if (plan === 'premium') return false;

      const matchesSearch = 
        restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        restaurant.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        restaurant.cuisine.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || restaurant.status === statusFilter;
      const matchesPlan = planFilter === 'all' || plan === planFilter;
      
      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [restaurants, searchTerm, statusFilter, planFilter]);

  const getMaxTablesForPlan = (plan) => {
    const planKey = plan?.toLowerCase();
    return RESTAURANT_PLANS[planKey]?.maxTables || RESTAURANT_PLANS.basic?.maxTables || 10;
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
      case 'suspended': return 'bg-rose-500/10 text-rose-500 border-rose-500/30';
      case 'pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/30';
    }
  };

  const getPlanStyle = (plan) => {
    switch (plan) {
      case 'advanced': return 'bg-purple-500/10 text-purple-500 border-purple-500/30';
      case 'basic': return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      case 'free': return 'bg-theme-text-tertiary/10 text-theme-text-secondary border-theme-border-primary';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/30';
    }
  };

  const getInitials = (name) => {
    return name && name !== 'Unknown Owner' ? name.charAt(0).toUpperCase() : 'R';
  };

  const openDetailsModal = (restaurant) => {
    setSelectedRestaurant(restaurant);
    setShowDetailsModal(true);
  };

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center min-h-[70vh]">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center">
            <div className="w-14 h-14 border-4 border-theme-border-primary border-t-theme-accent-primary rounded-full animate-spin mb-4"></div>
            <p className="text-theme-text-primary font-fredoka text-xl">Loading Restaurants...</p>
          </motion.div>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-8 max-w-[1400px] mx-auto pb-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-theme-bg-secondary p-6 sm:p-8 rounded-3xl border border-theme-border-primary/60 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-theme-accent-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-fredoka text-theme-text-primary mb-1">Standard Restaurant Management</h1>
            <p className="text-theme-text-secondary font-raleway">Manage and monitor Free, Basic, and Advanced tier accounts.</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: 'Total Accounts', value: stats.total, icon: FaStore, gradient: 'from-blue-400 to-blue-600', shadow: 'shadow-blue-500/20' },
            { title: 'Free Plans', value: stats.free, icon: FaCheckCircle, gradient: 'from-gray-400 to-gray-600', shadow: 'shadow-gray-500/20' },
            { title: 'Basic Plans', value: stats.basic, icon: FaClock, gradient: 'from-emerald-400 to-emerald-600', shadow: 'shadow-emerald-500/20' },
            { title: 'Advanced Plans', value: stats.advanced, icon: FaStar, gradient: 'from-purple-400 to-purple-600', shadow: 'shadow-purple-500/20' }
          ].map((stat, index) => (
            <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="bg-theme-bg-secondary border border-theme-border-primary/60 rounded-3xl p-6 relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-sm font-medium text-theme-text-tertiary font-raleway uppercase tracking-wider mb-2">{stat.title}</p>
                  <p className="text-3xl font-fredoka text-theme-text-primary">{stat.value}</p>
                </div>
                <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${stat.gradient} ${stat.shadow} shadow-lg text-white`}>
                  <stat.icon className="text-xl" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-theme-bg-secondary border border-theme-border-primary/60 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary" />
            <input
              type="text"
              placeholder="Search by restaurant name, owner, or cuisine..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-theme-bg border border-theme-border-primary rounded-xl pl-11 pr-4 py-3 text-sm text-theme-text-primary placeholder-theme-text-tertiary focus:outline-none focus:border-theme-accent-primary transition-colors"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative min-w-[160px]">
              <FaFilter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary text-xs" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-theme-bg border border-theme-border-primary rounded-xl pl-10 pr-4 py-3 text-sm text-theme-text-primary focus:outline-none focus:border-theme-accent-primary appearance-none cursor-pointer transition-colors"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div className="relative min-w-[160px]">
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="w-full bg-theme-bg border border-theme-border-primary rounded-xl px-4 py-3 text-sm text-theme-text-primary focus:outline-none focus:border-theme-accent-primary appearance-none cursor-pointer transition-colors"
              >
                <option value="all">All Plans</option>
                <option value="free">Free</option>
                <option value="basic">Basic</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-theme-bg-secondary border border-theme-border-primary/60 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left border-collapse">
              <thead className="bg-theme-bg/50 border-b border-theme-border-primary/60">
                <tr>
                  <th className="px-6 py-5 text-xs font-bold text-theme-text-tertiary uppercase tracking-wider">Restaurant Details</th>
                  <th className="px-6 py-5 text-xs font-bold text-theme-text-tertiary uppercase tracking-wider">Owner</th>
                  <th className="px-6 py-5 text-xs font-bold text-theme-text-tertiary uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-5 text-xs font-bold text-theme-text-tertiary uppercase tracking-wider">Status</th>
                  <th className="px-6 py-5 text-xs font-bold text-theme-text-tertiary uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border-primary/40">
                <AnimatePresence>
                  {filteredRestaurants.map((restaurant) => (
                    <motion.tr
                      key={restaurant.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-theme-bg/40 transition-colors group"
                    >
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-fredoka text-lg shadow-sm">
                            {getInitials(restaurant.name)}
                          </div>
                          <div>
                            <p className="font-semibold text-theme-text-primary font-raleway text-sm">{restaurant.name}</p>
                            <p className="text-xs text-theme-text-secondary mt-0.5">{restaurant.cuisine} • {restaurant.city}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <p className="text-sm font-semibold text-theme-text-primary">{restaurant.ownerName}</p>
                        <p className="text-xs text-theme-text-secondary mt-0.5">{restaurant.ownerPhone}</p>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full border ${getPlanStyle(restaurant.subscriptionPlan)}`}>
                          {restaurant.subscriptionPlan}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full border inline-flex items-center space-x-1.5 ${getStatusStyle(restaurant.status)}`}>
                          {restaurant.status === 'active' && <FaCheckCircle className="text-xs" />}
                          {restaurant.status === 'suspended' && <FaTimesCircle className="text-xs" />}
                          {restaurant.status === 'pending' && <FaClock className="text-xs" />}
                          <span>{restaurant.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right">
                        <button 
                          onClick={() => openDetailsModal(restaurant)}
                          className="text-theme-text-secondary hover:text-theme-accent-primary transition-colors inline-flex items-center font-medium text-sm"
                        >
                          <FaEye className="mr-2" /> View
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>

            {/* Empty State */}
            {filteredRestaurants.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-theme-bg rounded-full flex items-center justify-center mb-4 border border-theme-border-primary shadow-sm">
                  <FaStore className="text-3xl text-theme-text-tertiary opacity-50" />
                </div>
                <h3 className="text-lg font-fredoka text-theme-text-primary mb-1">
                  {restaurants.length === 0 ? 'No Standard Accounts Found' : 'No Matches Found'}
                </h3>
                <p className="text-theme-text-secondary font-raleway text-sm">
                  {restaurants.length === 0
                    ? 'Accounts will appear here once they register for standard plans.'
                    : 'Try adjusting your search or filter settings.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* View Details Modal */}
        <AnimatePresence>
          {showDetailsModal && selectedRestaurant && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-theme-bg-secondary border border-theme-border-primary rounded-3xl p-8 w-full max-w-2xl shadow-2xl relative overflow-hidden"
              >
                {/* Decorative glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-theme-accent-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                
                <div className="flex items-center justify-between mb-8 relative z-10">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center text-white font-fredoka text-2xl shadow-md">
                      {getInitials(selectedRestaurant.name)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-fredoka text-theme-text-primary leading-tight">
                        {selectedRestaurant.name}
                      </h2>
                      <p className="text-theme-text-secondary font-raleway text-sm mt-1">
                        {selectedRestaurant.city}, {selectedRestaurant.state}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="w-10 h-10 rounded-full bg-theme-bg border border-theme-border-primary flex items-center justify-center text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-hover transition-colors"
                  >
                    <FaTimes className="text-lg" />
                  </button>
                </div>

                <div className="space-y-6 relative z-10">
                  {/* Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-theme-bg p-5 rounded-2xl border border-theme-border-primary/50">
                      <div className="flex items-center space-x-3 mb-1">
                        <FaEnvelope className="text-theme-text-tertiary" />
                        <p className="text-xs font-bold uppercase tracking-wider text-theme-text-secondary">Owner Email</p>
                      </div>
                      <p className="font-raleway text-theme-text-primary ml-7 font-medium">{selectedRestaurant.ownerEmail}</p>
                    </div>
                    
                    <div className="bg-theme-bg p-5 rounded-2xl border border-theme-border-primary/50">
                      <div className="flex items-center space-x-3 mb-1">
                        <FaPhone className="text-theme-text-tertiary" />
                        <p className="text-xs font-bold uppercase tracking-wider text-theme-text-secondary">Owner Phone</p>
                      </div>
                      <p className="font-raleway text-theme-text-primary ml-7 font-medium">{selectedRestaurant.ownerPhone}</p>
                    </div>
                  </div>

                  {/* Plan Details */}
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-blue-500 mb-4">Current Plan Overview</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full border ${getPlanStyle(selectedRestaurant.subscriptionPlan)}`}>
                          {selectedRestaurant.subscriptionPlan} Plan
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 bg-theme-bg px-4 py-2 rounded-xl border border-theme-border-primary/50">
                        <FaTable className="text-blue-500" />
                        <span className="font-raleway text-sm font-medium text-theme-text-primary">
                          Limit: {selectedRestaurant.maxTables || getMaxTablesForPlan(selectedRestaurant.subscriptionPlan)} Tables
                        </span>
                      </div>
                    </div>
                    <p className="text-theme-text-secondary text-xs font-raleway mt-4 leading-relaxed">
                      Table limits are fixed for standard tier accounts. To modify table generation limits, the restaurant owner must upgrade to a Premium Subscription via their dashboard.
                    </p>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end mt-8 relative z-10">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="px-6 py-2.5 bg-theme-bg border border-theme-border-primary hover:bg-theme-bg-hover text-theme-text-primary rounded-xl font-medium font-raleway transition-colors"
                  >
                    Close Details
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </SuperAdminLayout>
  );
};

export default RestaurantManagement;