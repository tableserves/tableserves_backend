import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import LocalStorageService from '../../../services/LocalStorageService';
import SampleDataService from '../../../services/SampleDataService';
import { RESTAURANT_PLANS } from '../../../constants/plans';
import {
  FaSearch,
  FaStore,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaEdit,
  FaEye,
  FaCrown,
  FaStar,
  FaTable,
  FaPhone,
  FaEnvelope,
  FaSave,
  FaTimes,
  FaQrcode
} from 'react-icons/fa';
import SuperAdminLayout from '../SuperAdminLayout';

const RestaurantManagement = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState(null);
  const [customTables, setCustomTables] = useState('');

  // Helper function to get actual subscription plan
  const getSubscriptionPlan = (restaurant) => {
    // Check if restaurant has subscription object (from signup)
    if (restaurant.subscription && typeof restaurant.subscription === 'object') {
      return restaurant.subscription.plan || restaurant.subscription.key || 'Basic';
    }
    // Check if restaurant has subscriptionPlan field (from sample data or admin creation)
    if (restaurant.subscriptionPlan) {
      return restaurant.subscriptionPlan;
    }
    return 'Basic';
  };

  useEffect(() => {
    const loadRestaurants = () => {
      const restaurants = LocalStorageService.getRestaurants();
      setRestaurants(restaurants);
      setLoading(false);
    };

    loadRestaurants();
    
    // Listen for subscription updates from restaurant owners
    const handleSubscriptionUpdate = (event) => {
      console.log('Super Admin: Subscription update detected:', event.detail);
      
      // Refresh restaurant data
      const updatedRestaurants = LocalStorageService.getRestaurants();
      setRestaurants(updatedRestaurants);
      
      // Show notification or update indicator if needed
      console.log('Super Admin: Restaurant data refreshed after subscription update');
    };
    
    window.addEventListener('subscriptionUpdated', handleSubscriptionUpdate);
    
    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener('subscriptionUpdated', handleSubscriptionUpdate);
    };
  }, []);

  const filteredRestaurants = restaurants.filter(restaurant => {
    // Filter to show only restaurants with free, basic, and advanced plans (exclude premium and starter)
    const plan = getSubscriptionPlan(restaurant);
    const planLower = plan.toLowerCase();
    const isIncludedPlan = ['free', 'basic', 'advanced'].includes(planLower);
    if (!isIncludedPlan) return false;
    
    const matchesSearch = restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      restaurant.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      restaurant.cuisine?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || restaurant.status === statusFilter;
    const matchesPlan = planFilter === 'all' || getSubscriptionPlan(restaurant).toLowerCase() === planFilter.toLowerCase();
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'status-success bg-green-500/20';
      case 'suspended': return 'status-error bg-red-500/20';
      case 'pending': return 'status-warning bg-yellow-500/20';
      default: return 'text-theme-text-tertiary bg-gray-500/20';
    }
  };

  const getPlanColor = (plan) => {
    switch (plan?.toLowerCase()) {
      case 'free': return 'bg-gray-500/20 text-gray-600';
      case 'basic': return 'bg-blue-500/20 text-blue-600';
      case 'advanced': return 'bg-purple-500/20 text-purple-600';
      case 'premium': return 'bg-orange-500/20 text-orange-600';
      default: return 'bg-gray-500/20 text-gray-600';
    }
  };

  // Helper function to get QR code data for restaurant
  const getQRData = (restaurant) => {
    const restaurantId = restaurant.id;
    const savedTables = localStorage.getItem(`tables_${restaurantId}`);

    if (savedTables) {
      const tables = JSON.parse(savedTables);
      const totalTables = tables.length;
      const generatedQRs = tables.filter(table => table.qrGenerated).length;
      return { totalTables, generatedQRs };
    }

    // If no QR data exists, determine max tables based on plan and restaurant data
    const plan = getSubscriptionPlan(restaurant);
    let maxTables = restaurant.maxTables || getMaxTablesForPlan(plan) || 0;

    return { totalTables: maxTables, generatedQRs: 0 };
  };

  // Helper function to get max tables based on plan
  const getMaxTablesForPlan = (plan) => {
    const planKey = plan?.toLowerCase();
    const planData = RESTAURANT_PLANS[planKey];

    if (planData) {
      return planData.maxTables;
    }

    // Fallback for unknown plans
    return RESTAURANT_PLANS.basic.maxTables;
  };

  const handleEditRestaurant = (restaurant) => {
    setEditingRestaurant(restaurant);
    setCustomTables(restaurant.maxTables?.toString() || '');
    setShowEditModal(true);
  };

  const handleSaveChanges = () => {
    if (!editingRestaurant) return;

    const updatedRestaurant = {
      ...editingRestaurant,
      maxTables: parseInt(customTables) || 0
    };

    // Update in localStorage
    const updatedRestaurants = restaurants.map(r => 
      r.id === editingRestaurant.id ? updatedRestaurant : r
    );
    
    LocalStorageService.updateRestaurant(editingRestaurant.id, updatedRestaurant);
    setRestaurants(updatedRestaurants);
    setShowEditModal(false);
    setEditingRestaurant(null);
    setCustomTables('');
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setEditingRestaurant(null);
    setCustomTables('');
  };

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 spinner-theme rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-theme-text-primary font-raleway">Loading restaurant management...</p>
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
            <h1 className="text-2xl sm:text-3xl font-fredoka text-theme-text-primary mb-2">Restaurant Management</h1>
            <p className="text-theme-text-secondary font-raleway text-sm sm:text-base">
              Manage standard restaurant accounts (Free, Basic & Advanced plans)
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="admin-card rounded-xl p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary" />
              <input
                type="text"
                placeholder="Search restaurants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-theme rounded-lg pl-10 pr-4 py-2 w-full"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-theme rounded-lg px-4 py-2 focus:outline-none autofill-protected"
            >
              <option value="all" className="bg-theme-bg-secondary text-theme-text-primary">All Status</option>
              <option value="active" className="bg-theme-bg-secondary text-theme-text-primary">Active</option>
              <option value="pending" className="bg-theme-bg-secondary text-theme-text-primary">Pending</option>
              <option value="suspended" className="bg-theme-bg-secondary text-theme-text-primary">Suspended</option>
            </select>

            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="input-theme rounded-lg px-4 py-2 focus:outline-none autofill-protected"
            >
              <option value="all" className="bg-theme-bg-secondary text-theme-text-primary">All Plans</option>
              <option value="free" className="bg-theme-bg-secondary text-theme-text-primary">Free</option>
              <option value="basic" className="bg-theme-bg-secondary text-theme-text-primary">Basic</option>
              <option value="advanced" className="bg-theme-bg-secondary text-theme-text-primary">Advanced</option>
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="admin-card rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-status-success rounded-xl flex items-center justify-center">
                <FaStore className="text-theme-text-inverse text-xl" />
              </div>
            </div>
            <h3 className="text-2xl font-fredoka text-theme-text-primary mb-1">
              {restaurants.filter(r => {
                const plan = getSubscriptionPlan(r);
                const planLower = plan.toLowerCase();
                return ['free', 'basic', 'advanced'].includes(planLower);
              }).length}
            </h3>
            <p className="text-theme-text-secondary font-raleway text-sm">Total Restaurants</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="admin-card rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-status-info rounded-xl flex items-center justify-center">
                <FaCheckCircle className="text-theme-text-inverse text-xl" />
              </div>
            </div>
            <h3 className="text-2xl font-fredoka text-theme-text-primary mb-1">
              {restaurants.filter(r => {
                const plan = getSubscriptionPlan(r);
                const planLower = plan.toLowerCase();
                return r.status === 'active' && ['free', 'basic', 'advanced'].includes(planLower);
              }).length}
            </h3>
            <p className="text-theme-text-secondary font-raleway text-sm">Active</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="admin-card rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-status-warning rounded-xl flex items-center justify-center">
                <FaClock className="text-theme-text-inverse text-xl" />
              </div>
            </div>
            <h3 className="text-2xl font-fredoka text-theme-text-primary mb-1">
              {restaurants.filter(r => {
                const plan = getSubscriptionPlan(r);
                const planLower = plan.toLowerCase();
                return r.status === 'pending' && ['free', 'basic', 'advanced'].includes(planLower);
              }).length}
            </h3>
            <p className="text-theme-text-secondary font-raleway text-sm">Pending</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="admin-card rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <FaStar className="text-theme-text-inverse text-xl" />
              </div>
            </div>
            <h3 className="text-2xl font-fredoka text-theme-text-primary mb-1">
              {restaurants.filter(r => {
                const plan = getSubscriptionPlan(r);
                return plan.toLowerCase() === 'advanced';
              }).length}
            </h3>
            <p className="text-theme-text-secondary font-raleway text-sm">Advanced Plans</p>
          </motion.div>
        </div>

        {/* Restaurants Table */}
        <div className="admin-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-theme">
              <thead>
                <tr>
                  <th className="text-left p-4 font-raleway">Restaurant</th>
                  <th className="text-left p-4 font-raleway">Type</th>
                  <th className="text-left p-4 font-raleway">Owner</th>
                  <th className="text-left p-4 font-raleway">Plan</th>
                  <th className="text-left p-4 font-raleway">Status</th>
                  <th className="text-left p-4 font-raleway">QR Codes</th>
                  <th className="text-left p-4 font-raleway">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {filteredRestaurants.map((restaurant) => (
                  <tr key={restaurant.id} className="border-t border-theme-border-primary">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-theme-accent-primary rounded-lg flex items-center justify-center">
                          <FaStore className="text-theme-text-inverse" />
                        </div>
                        <div>
                          <h3 className="font-fredoka text-theme-text-primary">{restaurant.name}</h3>
                          <p className="text-theme-text-secondary text-sm font-raleway">
                            {restaurant.cuisine || 'Multi-cuisine'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded-full text-xs font-raleway bg-blue-500/20 text-blue-600">
                        Restaurant
                      </span>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-raleway text-theme-text-primary">{restaurant.ownerName}</p>
                        <p className="text-theme-text-secondary text-sm font-raleway">{restaurant.ownerEmail}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      {(() => {
                        const plan = getSubscriptionPlan(restaurant);
                        return (
                          <span className={`px-2 py-1 rounded-full text-xs font-raleway ${getPlanColor(plan)}`}>
                            {plan?.charAt(0).toUpperCase() + plan?.slice(1)}
                            {plan.toLowerCase() === 'premium' && <FaCrown className="inline ml-1" />}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-raleway ${getStatusColor(restaurant.status)}`}>
                        {restaurant.status === 'active' && <FaCheckCircle className="inline mr-1" />}
                        {restaurant.status === 'suspended' && <FaTimesCircle className="inline mr-1" />}
                        {restaurant.status === 'pending' && <FaClock className="inline mr-1" />}
                        {restaurant.status?.charAt(0).toUpperCase() + restaurant.status?.slice(1)}
                      </span>
                    </td>
                    <td className="p-4">
                      {(() => {
                        const qrData = getQRData(restaurant);
                        return (
                          <div>
                            <div className="flex items-center space-x-1 mb-1">
                              <FaQrcode className="text-theme-text-secondary" />
                              <span className="font-raleway text-theme-text-primary font-medium">
                                {qrData.generatedQRs}/{qrData.totalTables}
                              </span>
                            </div>
                            <p className="text-theme-text-secondary text-xs font-raleway">
                              QR Codes Generated
                            </p>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="p-4">
                      {(() => {
                        // Try to get actual revenue from orders
                        const savedOrders = localStorage.getItem(`restaurant_orders_${restaurant.id}`);
                        let actualRevenue = 0;
                        let actualOrders = 0;

                        if (savedOrders) {
                          const orders = JSON.parse(savedOrders);
                          actualRevenue = orders.reduce((sum, order) => sum + (order.total || order.grandTotal || 0), 0);
                          actualOrders = orders.length;
                        } else {
                          // Fallback to stored values - ensure we get numeric values
                          let storedRevenue = restaurant.revenue || restaurant.totalRevenue || 0;
                          // If stored revenue is a string with ₹ symbol, extract the number
                          if (typeof storedRevenue === 'string') {
                            storedRevenue = parseFloat(storedRevenue.replace(/[₹,]/g, '')) || 0;
                          }
                          actualRevenue = storedRevenue;
                          actualOrders = restaurant.orders || restaurant.totalOrders || 0;
                        }

                        return (
                          <div>
                            <p className="font-sans text-theme-text-primary font-medium">
                              ₹{actualRevenue.toLocaleString()}
                            </p>
                            <p className="text-theme-text-secondary text-sm font-raleway">
                              {actualOrders} orders
                            </p>
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="admin-card rounded-2xl p-6 w-full max-w-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-fredoka text-theme-text-primary">
                  Edit Restaurant - {editingRestaurant?.name}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-theme-text-secondary hover:text-theme-text-primary transition-colors p-2"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Restaurant Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-theme-text-primary font-raleway font-medium mb-2">
                      Restaurant Name
                    </label>
                    <input
                      type="text"
                      value={editingRestaurant?.name || ''}
                      readOnly
                      className="w-full input-theme rounded-lg px-4 py-2 font-raleway bg-theme-bg-secondary cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-theme-text-primary font-raleway font-medium mb-2">
                      Current Plan
                    </label>
                    <input
                      type="text"
                      value={editingRestaurant?.subscriptionPlan?.charAt(0).toUpperCase() + editingRestaurant?.subscriptionPlan?.slice(1) || ''}
                      readOnly
                      className="w-full input-theme rounded-lg px-4 py-2 font-raleway bg-theme-bg-secondary cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Owner Contact */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-theme-text-primary font-raleway font-medium mb-2">
                      Owner Email
                    </label>
                    <div className="flex items-center space-x-2">
                      <FaEnvelope className="text-theme-text-secondary" />
                      <span className="font-raleway text-theme-text-primary">
                        {editingRestaurant?.ownerEmail}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-theme-text-primary font-raleway font-medium mb-2">
                      Owner Phone
                    </label>
                    <div className="flex items-center space-x-2">
                      <FaPhone className="text-theme-text-secondary" />
                      <span className="font-raleway text-theme-text-primary">
                        {editingRestaurant?.ownerPhone || 'Not provided'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Premium Plan Configuration */}
                {editingRestaurant?.subscriptionPlan === 'premium' && (
                  <div className="border border-orange-200 rounded-lg p-4 bg-orange-50/50">
                    <h3 className="text-lg font-fredoka text-orange-600 mb-4 flex items-center">
                      <FaCrown className="mr-2" />
                      Premium Plan Configuration
                    </h3>
                    <div>
                      <label className="block text-theme-text-primary font-raleway font-medium mb-2">
                        Custom Table Count
                      </label>
                      <input
                        type="number"
                        value={customTables}
                        onChange={(e) => setCustomTables(e.target.value)}
                        className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none"
                        placeholder="Enter custom table count"
                        min="1"
                      />
                      <p className="text-theme-text-secondary text-sm font-raleway mt-1">
                        Set custom table limit for this premium restaurant
                      </p>
                    </div>
                  </div>
                )}

                {/* Non-Premium Plan Info */}
                {editingRestaurant?.subscriptionPlan !== 'premium' && (
                  <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/50">
                    <h3 className="text-lg font-fredoka text-blue-600 mb-2">
                      Current Plan Limits
                    </h3>
                    <div className="flex items-center space-x-2">
                      <FaTable className="text-blue-500" />
                      <span className="font-raleway text-theme-text-primary">
                        Max Tables: {editingRestaurant?.maxTables || 'Standard plan limit'}
                      </span>
                    </div>
                    <p className="text-theme-text-secondary text-sm font-raleway mt-2">
                      To modify table limits, the restaurant needs to upgrade to Premium plan
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end space-x-4 mt-8 pt-6 border-t border-theme-border-primary">
                <button
                  onClick={handleCloseModal}
                  className="btn-secondary px-6 py-2 rounded-lg font-raleway"
                >
                  Cancel
                </button>
                {editingRestaurant?.subscriptionPlan === 'premium' && (
                  <button
                    onClick={handleSaveChanges}
                    className="btn-primary px-6 py-2 rounded-lg font-raleway flex items-center space-x-2"
                  >
                    <FaSave />
                    <span>Save Changes</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
};

export default RestaurantManagement;
