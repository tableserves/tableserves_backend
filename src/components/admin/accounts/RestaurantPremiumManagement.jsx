import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LocalStorageService from '../../../services/LocalStorageService';
import {
  FaSearch,
  FaStore,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaEdit,
  FaPlus,
  FaCrown,
  FaTable,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaEye,
  FaEyeSlash,
  FaTimes,
  FaCopy,
  FaTrash
} from 'react-icons/fa';
import SuperAdminLayout from '../SuperAdminLayout';

const RestaurantPremiumManagement = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState(null);

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [actionType, setActionType] = useState('');
  const [copiedField, setCopiedField] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    cuisine: '',
    subscriptionPlan: 'premium', // Always premium for this component
    status: 'active',
    password: '',
    logo: null,
    maxTables: 10, // Custom default for premium restaurants
    paymentConfig: {
      upiId: '',
      paymentModel: 'direct'
    }
  });

  useEffect(() => {
    const loadRestaurants = () => {
      const allRestaurants = LocalStorageService.getRestaurants();
      // Filter only premium plan restaurants
      const premiumRestaurants = allRestaurants.filter(r => 
        r.subscriptionPlan === 'premium' && r.type !== 'zone'
      );
      setRestaurants(premiumRestaurants);
      setLoading(false);
    };

    loadRestaurants();
    
    // Listen for subscription updates from restaurant owners
    const handleSubscriptionUpdate = (event) => {
      console.log('Super Admin Premium: Subscription update detected:', event.detail);
      
      // Refresh premium restaurant data
      const allRestaurants = LocalStorageService.getRestaurants();
      const premiumRestaurants = allRestaurants.filter(r => 
        r.subscriptionPlan === 'premium' && r.type !== 'zone'
      );
      setRestaurants(premiumRestaurants);
      
      // Show notification or update indicator if needed
      console.log('Super Admin Premium: Restaurant data refreshed after subscription update');
    };
    
    window.addEventListener('subscriptionUpdated', handleSubscriptionUpdate);
    
    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener('subscriptionUpdated', handleSubscriptionUpdate);
    };
  }, []);

  const filteredRestaurants = restaurants.filter(restaurant => {
    const matchesSearch = restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      restaurant.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      restaurant.cuisine?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || restaurant.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.password && !editingRestaurant) {
      alert('Password is required for new premium restaurant accounts');
      return;
    }

    if (editingRestaurant) {
      // Update existing restaurant
      const updateData = { ...formData };
      delete updateData.password;
      const updatedRestaurant = LocalStorageService.updateRestaurant(editingRestaurant.id, updateData);
      if (updatedRestaurant) {
        const updatedRestaurants = restaurants.map(r =>
          r.id === editingRestaurant.id ? updatedRestaurant : r
        );
        setRestaurants(updatedRestaurants);
      }
    } else {
      // Create new Premium Restaurant account
      const username = formData.name.toLowerCase().replace(/\s+/g, '_') + '_restaurant_admin';

      const restaurantData = {
        ...formData,
        type: 'restaurant',
        subscriptionPlan: 'premium',
        slug: formData.name.toLowerCase().replace(/\s+/g, '-'),
        loginCredentials: {
          username: username,
          password: formData.password,
          lastLogin: null
        },
        tables: 0,
        revenue: 0,
        orders: 0,
        lastActive: null
      };

      const newRestaurant = LocalStorageService.addRestaurant(restaurantData);
      setRestaurants([...restaurants, newRestaurant]);

      alert(`Premium Restaurant account created successfully!\n\n📧 SEND THESE CREDENTIALS TO CLIENT:\n\nLogin Credentials:\nUsername: ${username}\nPassword: ${formData.password}\nLogin URL: ${window.location.origin}/tableserve/login\n\nAccount Details:\n• Restaurant: ${formData.name}\n• Owner: ${formData.ownerName}\n• Phone: ${formData.ownerPhone}\n• Custom Tables: ${formData.maxTables}\n\n✅ The client can now login and manage their premium restaurant account.`);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      ownerName: '',
      ownerEmail: '',
      ownerPhone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      cuisine: '',
      subscriptionPlan: 'premium',
      status: 'active',
      password: '',
      logo: null,
      maxTables: 10,
      paymentConfig: {
        upiId: '',
        paymentModel: 'direct'
      }
    });
    setEditingRestaurant(null);
    setShowForm(false);
  };

  const handleEdit = (restaurant) => {
    setFormData({
      name: restaurant.name,
      description: restaurant.description || '',
      ownerName: restaurant.ownerName,
      ownerEmail: restaurant.ownerEmail,
      ownerPhone: restaurant.ownerPhone,
      address: restaurant.address || '',
      city: restaurant.city || '',
      state: restaurant.state || '',
      zipCode: restaurant.zipCode || '',
      cuisine: restaurant.cuisine || '',
      subscriptionPlan: restaurant.subscriptionPlan,
      status: restaurant.status,
      logo: restaurant.logo,
      maxTables: restaurant.maxTables || 10,
      paymentConfig: restaurant.paymentConfig || {
        upiId: '',
        paymentModel: 'direct'
      }
    });
    setEditingRestaurant(restaurant);
    setShowForm(true);
  };

  const toggleStatus = (restaurantId) => {
    const restaurant = restaurants.find(r => r.id === restaurantId);
    if (restaurant) {
      setSelectedRestaurant(restaurant);
      setActionType(restaurant.status === 'active' ? 'suspend' : 'activate');
      setShowConfirmModal(true);
    }
  };

  const confirmStatusChange = () => {
    if (selectedRestaurant) {
      const newStatus = selectedRestaurant.status === 'active' ? 'suspended' : 'active';
      const updatedRestaurant = LocalStorageService.updateRestaurant(selectedRestaurant.id, { status: newStatus });
      if (updatedRestaurant) {
        setRestaurants(restaurants.map(r =>
          r.id === selectedRestaurant.id ? updatedRestaurant : r
        ));
      }
    }
    setShowConfirmModal(false);
    setSelectedRestaurant(null);
    setActionType('');
  };

  const copyCredentials = (restaurant) => {
    setSelectedRestaurant(restaurant);
    setShowCredentialsModal(true);
    setCopiedField(null); // Reset copied field when opening modal
  };

  const handleCopyToClipboard = () => {
    if (!selectedRestaurant) return;
    
    const username = selectedRestaurant.loginCredentials?.username || 
                    selectedRestaurant.name.toLowerCase().replace(/\s+/g, '_') + '_restaurant_admin';
    const password = selectedRestaurant.loginCredentials?.password || 'N/A';
    
    const credentials = `Premium Restaurant Credentials:

Restaurant: ${selectedRestaurant.name}
Owner: ${selectedRestaurant.ownerName}
Email: ${selectedRestaurant.ownerEmail}
Phone: ${selectedRestaurant.ownerPhone}

Login Details:
Username: ${username}
Password: ${password}
Login URL: ${window.location.origin}/tableserve/login

Plan: Premium
Max Tables: ${selectedRestaurant.maxTables || 10}
Status: ${selectedRestaurant.status}`;
    
    navigator.clipboard.writeText(credentials).then(() => {
      setShowCredentialsModal(false);
      setSelectedRestaurant(null);
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = credentials;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setShowCredentialsModal(false);
      setSelectedRestaurant(null);
    });
  };

  const handleDelete = (restaurantId) => {
    const restaurant = restaurants.find(r => r.id === restaurantId);
    if (restaurant) {
      setSelectedRestaurant(restaurant);
      setShowDeleteModal(true);
    }
  };

  const confirmDelete = () => {
    if (selectedRestaurant) {
      const success = LocalStorageService.deleteRestaurant(selectedRestaurant.id);
      if (success) {
        setRestaurants(restaurants.filter(r => r.id !== selectedRestaurant.id));
      }
    }
    setShowDeleteModal(false);
    setSelectedRestaurant(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'status-success bg-green-500/20';
      case 'suspended': return 'status-error bg-red-500/20';
      case 'pending': return 'status-warning bg-yellow-500/20';
      default: return 'text-theme-text-tertiary bg-gray-500/20';
    }
  };

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 spinner-theme rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-theme-text-primary font-raleway">Loading premium restaurant management...</p>
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
            <h1 className="text-2xl sm:text-3xl font-fredoka text-theme-text-primary mb-2 flex items-center">
              <FaCrown className="mr-3 text-orange-500" />
              Premium Restaurant Management
            </h1>
            <p className="text-theme-text-secondary font-raleway text-sm sm:text-base">
              Create and manage Premium Restaurant plan accounts with custom table configurations.
            </p>
            
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="w-full sm:w-auto btn-primary px-4 py-2 rounded-lg font-raleway font-semibold flex items-center justify-center space-x-2"
          >
            <FaPlus />
            <span>Create Premium Restaurant</span>
          </button>
        </div>

        {/* Filters and Search */}
        <div className="admin-card rounded-2xl p-4 sm:p-6">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="relative flex-1">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary" />
                <input
                  type="text"
                  placeholder="Search premium restaurants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full input-theme rounded-lg pl-10 pr-4 py-2 focus:outline-none"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto input-theme rounded-lg px-4 py-2 focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          <div className="admin-card rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-theme-text-secondary font-raleway text-sm">Total Premium</p>
                <p className="text-2xl font-sans text-theme-text-primary">{restaurants.length}</p>
              </div>
              <FaCrown className="text-3xl text-orange-500" />
            </div>
          </div>
          <div className="admin-card rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-theme-text-secondary font-raleway text-sm">Active</p>
                <p className="text-2xl font-sans text-status-success">
                  {restaurants.filter(r => r.status === 'active').length}
                </p>
              </div>
              <FaCheckCircle className="text-3xl text-status-success" />
            </div>
          </div>
          <div className="admin-card rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-theme-text-secondary font-raleway text-sm">Pending</p>
                <p className="text-2xl font-sans text-status-warning">
                  {restaurants.filter(r => r.status === 'pending').length}
                </p>
              </div>
              <FaClock className="text-3xl text-status-warning" />
            </div>
          </div>
          <div className="admin-card rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-theme-text-secondary font-raleway text-sm">Total Tables</p>
                <p className="text-2xl font-sans text-theme-text-primary">
                  {restaurants.reduce((sum, r) => sum + (r.maxTables || 0), 0)}
                </p>
              </div>
              <FaTable className="text-3xl text-orange-500" />
            </div>
          </div>
        </div>

        {/* Restaurants Table */}
        <div className="admin-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-theme">
              <thead>
                <tr>
                  <th className="text-left p-4 font-raleway">Restaurant</th>
                  <th className="text-left p-4 font-raleway">Owner</th>
                  <th className="text-left p-4 font-raleway">Location</th>
                  <th className="text-left p-4 font-raleway">Status</th>
                  <th className="text-left p-4 font-raleway">Tables</th>
                  <th className="text-left p-4 font-raleway">Revenue</th>
                  <th className="text-left p-4 font-raleway">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRestaurants.map((restaurant) => (
                  <tr key={restaurant.id} className="border-t border-theme-border-primary hover:bg-theme-bg-secondary/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                          <FaStore className="text-theme-text-inverse" />
                        </div>
                        <div>
                          <h3 className="font-fredoka text-theme-text-primary flex items-center">
                            {restaurant.name}
                            <FaCrown className="ml-2 text-orange-500 text-sm" />
                          </h3>
                          <p className="text-theme-text-secondary text-sm font-raleway">
                            {restaurant.cuisine || 'Multi-cuisine'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-raleway text-theme-text-primary">{restaurant.ownerName}</p>
                        <p className="text-theme-text-secondary text-sm font-raleway">{restaurant.ownerEmail}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-1">
                        <FaMapMarkerAlt className="text-theme-text-secondary text-sm" />
                        <span className="font-raleway text-theme-text-primary text-sm">
                          {restaurant.city || 'Not specified'}, {restaurant.state || 'N/A'}
                        </span>
                      </div>
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
                      <div className="flex items-center space-x-1">
                        <FaTable className="text-orange-500" />
                        <span className="font-raleway text-theme-text-primary font-semibold">
                          {restaurant.maxTables || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-raleway text-theme-text-primary font-medium">
                          ₹{restaurant.revenue || 0}
                        </p>
                        <p className="text-theme-text-secondary text-sm font-raleway">
                          {restaurant.orders || 0} orders
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(restaurant)}
                          className="text-status-info hover:text-status-info/80 p-2 rounded-lg hover:bg-status-info/20 transition-colors"
                          title="Edit Restaurant"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => toggleStatus(restaurant.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            restaurant.status === 'active'
                              ? 'text-status-error hover:text-status-error/80 hover:bg-status-error/20'
                              : 'text-status-success hover:text-status-success/80 hover:bg-status-success/20'
                          }`}
                          title={restaurant.status === 'active' ? 'Suspend Account' : 'Activate Account'}
                        >
                          {restaurant.status === 'active' ? <FaTimesCircle /> : <FaCheckCircle />}
                        </button>
                        <button
                          onClick={() => copyCredentials(restaurant)}
                          className="text-status-success hover:text-status-success/80 p-2 rounded-lg hover:bg-status-success/20 transition-colors"
                          title="Copy Credentials"
                        >
                          <FaCopy />
                        </button>
                        <button
                          onClick={() => handleDelete(restaurant.id)}
                          className="text-status-error hover:text-status-error/80 p-2 rounded-lg hover:bg-status-error/20 transition-colors"
                          title="Delete Restaurant"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Form Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="admin-card rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
              >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-fredoka text-theme-text-primary flex items-center">
                  <FaCrown className="mr-3 text-orange-500" />
                  {editingRestaurant ? 'Edit Premium Restaurant' : 'Create Premium Restaurant'}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-theme-text-secondary hover:text-theme-text-primary transition-colors p-2"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-xl font-fredoka text-theme-text-primary border-b border-theme-border-primary pb-2">
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-theme-text-primary font-raleway mb-2 text-base">Restaurant Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="input-theme autofill-protected rounded-lg px-4 py-2 w-full focus:outline-none"
                        placeholder="Enter restaurant name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-theme-text-primary font-raleway mb-2 text-base">Restaurant Type</label>
                      <input
                        type="text"
                        value="Restaurant"
                        className="input-theme autofill-protected rounded-lg px-4 py-2 w-full focus:outline-none"
                        placeholder="Restaurant"
                        disabled
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-theme-text-primary font-raleway mb-2 text-base">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="input-theme autofill-protected rounded-lg px-4 py-2 w-full focus:outline-none"
                      placeholder="Brief description of the restaurant"
                      rows="3"
                    />
                  </div>
                </div>

                {/* Owner Information */}
                <div className="space-y-4">
                  <h3 className="text-xl font-fredoka text-theme-text-primary border-b border-theme-border-primary pb-2">
                    Owner Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-theme-text-primary font-raleway mb-2 text-base">Owner Name *</label>
                      <input
                        type="text"
                        value={formData.ownerName}
                        onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                        className="input-theme autofill-protected rounded-lg px-4 py-2 w-full focus:outline-none"
                        placeholder="Enter owner full name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-theme-text-primary font-raleway mb-2 text-base">Owner Email *</label>
                      <input
                        type="email"
                        value={formData.ownerEmail}
                        onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                        className="input-theme autofill-protected rounded-lg px-4 py-2 w-full focus:outline-none"
                        placeholder="owner@restaurant.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-theme-text-primary font-raleway mb-2 text-base">Owner Phone *</label>
                      <input
                        type="tel"
                        value={formData.ownerPhone}
                        onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                        className="input-theme autofill-protected rounded-lg px-4 py-2 w-full focus:outline-none"
                        placeholder="+91 98765 43210"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Location Information */}
                <div className="space-y-4">
                  <h3 className="text-xl font-fredoka text-theme-text-primary border-b border-theme-border-primary pb-2">
                    Location Information
                  </h3>
                  <div>
                    <label className="block text-theme-text-primary font-raleway mb-2 text-base">Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="input-theme autofill-protected rounded-lg px-4 py-2 w-full focus:outline-none"
                      placeholder="Street address"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-theme-text-primary font-raleway mb-2 text-base">City</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="input-theme autofill-protected rounded-lg px-4 py-2 w-full focus:outline-none"
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <label className="block text-theme-text-primary font-raleway mb-2 text-base">State</label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="input-theme autofill-protected rounded-lg px-4 py-2 w-full focus:outline-none"
                        placeholder="State"
                      />
                    </div>
                    <div>
                      <label className="block text-theme-text-primary font-raleway mb-2 text-base">ZIP Code</label>
                      <input
                        type="text"
                        value={formData.zipCode}
                        onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                        className="input-theme autofill-protected rounded-lg px-4 py-2 w-full focus:outline-none"
                        placeholder="ZIP Code"
                      />
                    </div>
                  </div>
                </div>

                {/* Premium Configuration */}
                <div className="space-y-4">
                  <h3 className="text-xl font-fredoka text-orange-600 border-b border-orange-200 pb-2 flex items-center">
                    <FaCrown className="mr-2" />
                    Premium Configuration
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-theme-text-primary font-raleway mb-2 text-base">Maximum Tables *</label>
                      <input
                        type="number"
                        value={formData.maxTables}
                        onChange={(e) => setFormData({ ...formData, maxTables: parseInt(e.target.value) || 0 })}
                        className="input-theme autofill-protected rounded-lg px-4 py-2 w-full focus:outline-none"
                        placeholder="Enter maximum tables"
                        min="1"
                        required
                      />
                      <p className="text-theme-text-tertiary text-base mt-1">Set custom table limit for this premium restaurant</p>
                    </div>
                    <div>
                      <label className="block text-theme-text-primary font-raleway mb-2 text-base">Cuisine Type</label>
                      <input
                        type="text"
                        value={formData.cuisine}
                        onChange={(e) => setFormData({ ...formData, cuisine: e.target.value })}
                        className="input-theme autofill-protected rounded-lg px-4 py-2 w-full focus:outline-none"
                        placeholder="e.g., Italian, Indian, Multi-cuisine"
                      />
                      <p className="text-theme-text-tertiary text-base mt-1">Primary cuisine served at this restaurant</p>
                    </div>
                  </div>
                </div>

                {/* Login Credentials */}
                {!editingRestaurant && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-fredoka text-theme-text-primary border-b border-theme-border-primary pb-2">
                      Login Credentials
                    </h3>
                    <div>
                      <label className="block text-theme-text-primary font-raleway mb-2 text-base">Login Password *</label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="input-theme autofill-protected rounded-lg px-4 py-2 w-full focus:outline-none"
                        placeholder="Enter secure password for restaurant admin login"
                        required
                        minLength="6"
                      />
                      <p className="text-theme-text-tertiary text-base mt-1">This password will be used for restaurant admin login</p>
                    </div>
                  </div>
                )}



                {/* Form Actions */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-theme-border-primary">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-2 text-theme-text-secondary rounded-lg font-raleway font-semibold hover:text-theme-text-primary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-raleway font-semibold transition-colors"
                  >
                    {editingRestaurant ? 'Update Premium Restaurant' : 'Create Premium Restaurant'}
                  </button>
                </div>
              </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confirmation Modal */}
        <AnimatePresence>
          {showConfirmModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="admin-card rounded-2xl p-6 w-full max-w-md"
              >
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
                    {actionType === 'suspend' ? (
                      <FaTimesCircle className="text-3xl text-orange-500" />
                    ) : (
                      <FaCheckCircle className="text-3xl text-orange-500" />
                    )}
                  </div>
                  <h3 className="text-xl font-fredoka text-theme-text-primary mb-2">
                    {actionType === 'suspend' ? 'Suspend Restaurant' : 'Activate Restaurant'}
                  </h3>
                  <p className="text-theme-text-secondary font-raleway mb-6">
                    Are you sure you want to {actionType} <span className="font-semibold">{selectedRestaurant?.name}</span>?
                    {actionType === 'suspend' && ' This will prevent the restaurant from accepting new orders.'}
                  </p>
                  <div className="flex space-x-4">
                    <button
                      onClick={() => {
                        setShowConfirmModal(false);
                        setSelectedRestaurant(null);
                        setActionType('');
                      }}
                      className="flex-1 px-4 py-2 text-theme-text-secondary border border-theme-border-primary rounded-lg font-raleway hover:text-theme-text-primary transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmStatusChange}
                      className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-raleway font-semibold transition-colors"
                    >
                      {actionType === 'suspend' ? 'Suspend' : 'Activate'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Credentials Modal */}
        <AnimatePresence>
          {showCredentialsModal && selectedRestaurant && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-gradient-to-br from-orange-900/20 via-black/40 to-orange-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="admin-card rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-fredoka text-theme-text-primary flex items-center">
                    <FaCrown className="mr-2 text-orange-500" />
                    Premium Restaurant Credentials
                  </h3>
                  <button
                    onClick={() => {
                      setShowCredentialsModal(false);
                      setSelectedRestaurant(null);
                    }}
                    className="text-theme-text-secondary hover:text-theme-text-primary transition-colors p-2"
                  >
                    <FaTimes className="text-xl" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Restaurant Details */}
                  <div className="bg-orange-50 rounded-lg p-3">
                    <h4 className="font-fredoka text-orange-600 mb-2 text-base">Restaurant Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-theme-text-secondary text-sm">Restaurant:</span>
                        <p className="font-semibold text-theme-text-primary text-base">{selectedRestaurant.name}</p>
                      </div>
                      <div>
                        <span className="text-theme-text-secondary text-sm">Owner:</span>
                        <p className="font-semibold text-theme-text-primary text-base">{selectedRestaurant.ownerName}</p>
                      </div>
                      <div>
                        <span className="text-theme-text-secondary text-sm">Email:</span>
                        <p className="font-semibold text-theme-text-primary text-base">{selectedRestaurant.ownerEmail}</p>
                      </div>
                      <div>
                        <span className="text-theme-text-secondary text-sm">Phone:</span>
                        <p className="font-semibold text-theme-text-primary text-base">{selectedRestaurant.ownerPhone}</p>
                      </div>
                    </div>
                  </div>

                  {/* Login Credentials */}
                  <div className="bg-orange-50 rounded-lg p-4">
                    <h4 className="font-fredoka text-orange-600 mb-3 text-base">Login Credentials</h4>
                    <div className="space-y-3">
                      <div>
                        <span className="text-theme-text-secondary text-sm mb-1 block">Username:</span>
                        <div className="flex items-center space-x-2">
                          <p className="font-mono bg-white p-2 rounded border text-theme-text-primary text-base flex-1">
                            {selectedRestaurant.loginCredentials?.username || 
                             selectedRestaurant.name.toLowerCase().replace(/\s+/g, '_') + '_restaurant_admin'}
                          </p>
                          <button
                            onClick={() => {
                              const username = selectedRestaurant.loginCredentials?.username || 
                                             selectedRestaurant.name.toLowerCase().replace(/\s+/g, '_') + '_restaurant_admin';
                              navigator.clipboard.writeText(username).then(() => {
                                setCopiedField('username');
                                setTimeout(() => setCopiedField(null), 2000);
                              }).catch(() => {
                                const textArea = document.createElement('textarea');
                                textArea.value = username;
                                document.body.appendChild(textArea);
                                textArea.select();
                                document.execCommand('copy');
                                document.body.removeChild(textArea);
                                setCopiedField('username');
                                setTimeout(() => setCopiedField(null), 2000);
                              });
                            }}
                            className={`p-1.5 rounded transition-colors ${
                              copiedField === 'username' 
                                ? 'text-green-600 bg-green-50 hover:text-green-700 hover:bg-green-100' 
                                : 'text-orange-500 hover:text-orange-600 hover:bg-orange-50'
                            }`}
                            title={copiedField === 'username' ? 'Copied!' : 'Copy Username'}
                          >
                            <FaCopy className="text-xs" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <span className="text-theme-text-secondary text-sm mb-1 block">Password:</span>
                        <div className="flex items-center space-x-2">
                          <p className="font-mono bg-white p-2 rounded border text-theme-text-primary text-base flex-1">
                            {selectedRestaurant.loginCredentials?.password || 'N/A'}
                          </p>
                          <button
                            onClick={() => {
                              const password = selectedRestaurant.loginCredentials?.password || 'N/A';
                              navigator.clipboard.writeText(password).then(() => {
                                setCopiedField('password');
                                setTimeout(() => setCopiedField(null), 2000);
                              }).catch(() => {
                                const textArea = document.createElement('textarea');
                                textArea.value = password;
                                document.body.appendChild(textArea);
                                textArea.select();
                                document.execCommand('copy');
                                document.body.removeChild(textArea);
                                setCopiedField('password');
                                setTimeout(() => setCopiedField(null), 2000);
                              });
                            }}
                            className={`p-1.5 rounded transition-colors ${
                              copiedField === 'password' 
                                ? 'text-green-600 bg-green-50 hover:text-green-700 hover:bg-green-100' 
                                : 'text-orange-500 hover:text-orange-600 hover:bg-orange-50'
                            }`}
                            title={copiedField === 'password' ? 'Copied!' : 'Copy Password'}
                          >
                            <FaCopy className="text-xs" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Premium Details */}
                  <div className="bg-orange-50 rounded-lg p-3">
                    <h4 className="font-fredoka text-orange-600 mb-2 text-base">Premium Plan Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-theme-text-secondary text-sm">Plan:</span>
                        <p className="font-semibold text-orange-600 text-base">Premium</p>
                      </div>
                      <div>
                        <span className="text-theme-text-secondary text-sm">Max Tables:</span>
                        <p className="font-semibold text-theme-text-primary text-base">{selectedRestaurant.maxTables || 10}</p>
                      </div>
                      <div>
                        <span className="text-theme-text-secondary text-sm">Status:</span>
                        <p className={`font-semibold text-base ${
                          selectedRestaurant.status === 'active' ? 'text-green-600' :
                          selectedRestaurant.status === 'suspended' ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                          {selectedRestaurant.status?.charAt(0).toUpperCase() + selectedRestaurant.status?.slice(1)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-4 mt-6 pt-6 border-t border-theme-border-primary">
                  <button
                    onClick={() => {
                      setShowCredentialsModal(false);
                      setSelectedRestaurant(null);
                    }}
                    className="px-6 py-2 text-theme-text-secondary border border-theme-border-primary rounded-lg font-raleway hover:text-theme-text-primary transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleCopyToClipboard}
                    className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-raleway font-semibold flex items-center space-x-2 transition-colors"
                  >
                    <FaCopy />
                    <span>Copy All Credentials</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Modal */}
        <AnimatePresence>
          {showDeleteModal && selectedRestaurant && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="admin-card rounded-2xl p-6 w-full max-w-md"
              >
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                    <FaTrash className="text-3xl text-red-500" />
                  </div>
                  <h3 className="text-xl font-fredoka text-theme-text-primary mb-2">
                    Delete Premium Restaurant
                  </h3>
                  <p className="text-theme-text-secondary font-raleway mb-2">
                    Are you sure you want to permanently delete
                  </p>
                  <p className="font-semibold text-theme-text-primary mb-4">
                    {selectedRestaurant.name}?
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                    <p className="text-red-600 text-sm font-medium">
                      ⚠️ This action cannot be undone. All restaurant data, orders, and QR codes will be permanently lost.
                    </p>
                  </div>
                  <div className="flex space-x-4">
                    <button
                      onClick={() => {
                        setShowDeleteModal(false);
                        setSelectedRestaurant(null);
                      }}
                      className="flex-1 px-4 py-2 text-theme-text-secondary border border-theme-border-primary rounded-lg font-raleway hover:text-theme-text-primary transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDelete}
                      className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-raleway font-semibold transition-colors"
                    >
                      Delete Permanently
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SuperAdminLayout>
  );
};

export default RestaurantPremiumManagement;
