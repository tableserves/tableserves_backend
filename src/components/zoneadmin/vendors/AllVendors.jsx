import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaStore,
  FaSearch,
  FaFilter,
  FaTimes,
  FaDownload,
  FaUser,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaRupeeSign,
  FaUtensils,
  FaStar,
  FaChartLine,
  FaUserPlus,
  FaCheck,
  FaKey
} from 'react-icons/fa';
import ZoneAdminLayout from '../ZoneAdminLayout';
import ImageUpload from '../../common/ImageUpload';
import QuotaBanner from '../common/QuotaBanner';
import { useSelector, useDispatch } from 'react-redux';
import { 
  fetchVendors, 
  addVendor, 
  updateVendor, 
  deleteVendor 
} from '../../../store/slices/entitiesSlice';
import subscriptionService from '../../../services/SubscriptionService';
import vendorService from '../../../services/VendorService';
import logger from '../../../services/LoggingService';

const AllVendors = () => {
  const { zoneId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { vendors = [], vendorsLoading: loading, vendorsError: error } = useSelector((state) => state.entities);
  
  const [subscription, setSubscription] = useState(null);
  const [vendorLimitStatus, setVendorLimitStatus] = useState({ allowed: true, message: '' });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cuisine: '',
    ownerName: '',
    ownerPhone: '',
    ownerEmail: '',
    status: 'active',
    logo: null,
    coverImage: null,
    password: ''
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    if (zoneId) {
      dispatch(fetchVendors(zoneId));
      
      // Get subscription data using the service
      const subscriptionData = subscriptionService.getCurrentSubscription();
      setSubscription(subscriptionData);
      
      // Sync vendor data to ensure consistency
      vendorService.synchronizeVendorData(zoneId);
      
      logger.debug('AllVendors component initialized', { zoneId, hasSubscription: !!subscriptionData }, 'AllVendors');
    }
  }, [zoneId, dispatch]);

  // Update vendor limit status when vendors or subscription changes
  useEffect(() => {
    if (zoneId && vendors) {
      const limitCheck = subscriptionService.checkVendorLimit(zoneId, vendors.length);
      setVendorLimitStatus(limitCheck);
      
      logger.debug('Vendor limit check', {
        zoneId,
        currentCount: vendors.length,
        limitCheck
      }, 'AllVendors');
    }
  }, [zoneId, vendors]);

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vendor.cuisine && vendor.cuisine.toLowerCase().includes(searchTerm.toLowerCase())) ||
      vendor.ownerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || vendor.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (editingVendor) {
      // Update existing vendor
      dispatch(updateVendor({ 
        zoneId, 
        vendorId: editingVendor.id, 
        vendorData: formData 
      }));
      logger.info('Vendor updated', { vendorId: editingVendor.id, zoneId }, 'AllVendors');
    } else {
      // Check vendor limits before adding new vendor
      const limitCheck = subscriptionService.checkVendorLimit(zoneId, vendors.length);
      
      if (!limitCheck.allowed) {
        logger.warn('Vendor limit reached', {
          zoneId,
          currentCount: vendors.length,
          maxCount: limitCheck.maxCount,
          message: limitCheck.message
        }, 'AllVendors');
        
        setShowUpgradeModal(true);
        return;
      }
      
      const username = formData.name.toLowerCase().replace(/\s+/g, '_') + '_vendor';
      const vendorData = {
        ...formData,
        loginCredentials: {
          username: username,
          password: formData.password,
        }
      };
      
      dispatch(addVendor({ zoneId, vendorData }));
      
      logger.info('Vendor creation initiated', {
        zoneId,
        vendorName: formData.name,
        username
      }, 'AllVendors');
      
      alert(`Vendor creation initiated! Check the list for the new vendor shortly.\n\nLogin Credentials:\nUsername: ${username}\nPassword: ${formData.password}`);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      cuisine: '',
      ownerName: '',
      ownerPhone: '',
      ownerEmail: '',
      status: 'active',
      logo: null,
      coverImage: null,
      password: ''
    });
    setEditingVendor(null);
    setShowForm(false);
  };

  const handleEdit = (vendor) => {
    setFormData({
      name: vendor.name,
      description: vendor.description,
      cuisine: vendor.cuisine,
      ownerName: vendor.ownerName,
      ownerPhone: vendor.ownerPhone,
      ownerEmail: vendor.ownerEmail,
      status: vendor.status,
      logo: vendor.logo || null,
      coverImage: vendor.coverImage || null,
      password: '' // Don't pre-fill password
    });
    setEditingVendor(vendor);
    setShowForm(true);
  };

  const handleDelete = (vendorId) => {
    if (window.confirm('Are you sure you want to remove this vendor from your zone?')) {
      dispatch(deleteVendor({ zoneId, vendorId }));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'status-success bg-status-success-light';
      case 'pending': return 'status-warning bg-status-warning-light';
      case 'inactive': return 'status-error bg-status-error-light';
      default: return 'text-theme-text-tertiary bg-theme-bg-secondary';
    }
  };

  if (loading && vendors.length === 0) {
    return (
      <ZoneAdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-theme-text-primary text-xl">Loading vendors...</div>
        </div>
      </ZoneAdminLayout>
    );
  }

  return (
    <ZoneAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-fredoka text-theme-text-primary mb-2">All Vendors</h1>
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl "
            >
              <QuotaBanner zoneId={zoneId} currentCount={vendors.length} type="vendors" />
            </motion.div>
            <p className="text-theme-text-secondary mt-6 font-raleway text-sm sm:text-base">Manage all vendors in your food zone</p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <button
              onClick={() => navigate(`/tableserve/zone/${zoneId}/vendors/credentials`)}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-raleway font-semibold flex items-center justify-center space-x-2"
            >
              <FaKey />
              <span>Manage Credentials</span>
            </button>
            <button
              onClick={() => {
                if (!vendorLimitStatus.allowed) {
                  setShowUpgradeModal(true);
                } else {
                  resetForm();
                  setShowForm(true);
                }
              }}
              disabled={!vendorLimitStatus.allowed && !vendorLimitStatus.unlimited}
              className={`w-full sm:w-auto px-4 py-2 rounded-lg font-raleway font-semibold flex items-center justify-center space-x-2 transition-colors
                ${vendorLimitStatus.allowed || vendorLimitStatus.unlimited
                  ? 'bg-theme-accent-primary hover:bg-theme-accent-hover text-theme-text-inverse'
                  : 'bg-gray-400 cursor-not-allowed text-gray-600'
                }`}
              title={!vendorLimitStatus.allowed ? vendorLimitStatus.message : 'Add new vendor'}
            >
              <FaUserPlus />
              <span>{vendorLimitStatus.allowed || vendorLimitStatus.unlimited ? 'Add Vendor' : `Limit Reached (${vendorLimitStatus.currentCount}/${vendorLimitStatus.maxCount})`}</span>
            </button>
          </div>
        </div>
        
        {error && <p className="text-red-500 text-center my-4">Error: {error}</p>}

        {/* Search and Filters */}
        <div className="bg-secondary backdrop-blur-lg rounded-2xl p-4 sm:p-6 border admin-card border-secondary">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" />
              <input
                type="text"
                placeholder="Search vendors, cuisine, or owners..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-secondary border border-secondary rounded-lg pl-10 pr-4 py-2 text-secondary placeholder-primary focus:outline-none focus:border-accent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-secondary border border-secondary rounded-lg px-4 py-2 text-secondary focus:outline-none focus:border-accent"
            >
              <option value="all" className="text-black bg-transparent">All Status</option>
              <option value="active" className='text-green-500'>Active</option>
              <option value="pending" className='text-yellow-500'>Pending</option>
              <option value="inactive" className='text-red-500'>Inactive</option>
            </select>
          </div>
        </div>

        {/* Vendors Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {filteredVendors.map((vendor) => (
            <motion.div
              key={vendor.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="admin-card rounded-2xl p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-theme-accent-primary rounded-xl flex items-center justify-center overflow-hidden">
                    {vendor.logo ? (
                      <img
                        src={vendor.logo}
                        alt={`${vendor.name} logo`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FaStore className="text-theme-text-inverse text-xl" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-theme-text-primary font-fredoka text-lg">{vendor.name}</h3>
                    <p className="text-theme-text-secondary font-raleway text-sm">{vendor.cuisine}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-raleway font-medium ${getStatusColor(vendor.status)}`}>
                  {vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1)}
                </span>
              </div>

              <p className="text-theme-text-secondary font-raleway text-sm mb-4">{vendor.description}</p>

              <div className="border-t border-theme-border-primary pt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-theme-text-secondary font-raleway text-sm">Owner: {vendor.ownerName}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-theme-text-tertiary font-raleway text-xs">{vendor.ownerPhone}</p>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(vendor)}
                      className="p-2 text-theme-text-secondary hover:text-theme-accent-primary hover:bg-theme-accent-primary/10 rounded-lg transition-colors"
                      title="Edit Vendor"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(vendor.id)}
                      className="p-2 text-status-error hover:bg-status-error/10 rounded-lg transition-colors"
                      title="Delete Vendor"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Add/Edit Vendor Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={(e) => e.target === e.currentTarget && resetForm()}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="admin-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-raleway font-semibold text-theme-text-primary">
                    {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
                  </h2>
                  <button
                    onClick={resetForm}
                    className="text-theme-text-tertiary hover:text-theme-text-primary"
                  >
                    <FaTimes />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ">
                    <div>
                      <label className="block text-theme-text-primary font-raleway font-medium mb-2">Vendor Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="input-theme rounded-lg px-4 py-2 w-full focus:outline-none autofill-fix"
                        required
                        placeholder="Enter vendor name"
                      />
                    </div>
                    <div>
                      <label className="block text-theme-text-primary font-raleway font-medium mb-2">Cuisine Type</label>
                      <input
                        type="text"
                        value={formData.cuisine}
                        onChange={(e) => setFormData({ ...formData, cuisine: e.target.value })}
                        className="input-theme rounded-lg px-4 py-2 w-full focus:outline-none autofill-fix"
                        required
                        placeholder="Enter cuisine type"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-theme-text-primary font-raleway font-medium mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="input-theme rounded-lg px-4 py-2 w-full focus:outline-none autofill-fix"
                      rows="3"
                      required
                      placeholder="Enter vendor description"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-theme-text-primary font-raleway font-medium mb-2">Owner Name</label>
                      <input
                        type="text"
                        value={formData.ownerName}
                        onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                        className="input-theme rounded-lg px-4 py-2 w-full focus:outline-none autofill-fix"
                        required
                        placeholder="Enter owner name"
                      />
                    </div>
                    <div>
                      <label className="block text-theme-text-primary font-raleway font-medium mb-2">Owner Phone</label>
                      <input
                        type="tel"
                        value={formData.ownerPhone}
                        onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                        className="input-theme rounded-lg px-4 py-2 w-full focus:outline-none autofill-fix"
                        required
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-theme-text-primary font-raleway font-medium mb-2">Owner Email</label>
                      <input
                        type="email"
                        value={formData.ownerEmail}
                        onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                        className="input-theme rounded-lg px-4 py-2 w-full focus:outline-none autofill-fix"
                        required
                        placeholder="Enter email address"
                      />
                    </div>
                    <div>
                      <label className="block text-theme-text-primary font-raleway font-medium mb-2">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="input-theme rounded-lg px-4 py-2 w-full focus:outline-none"
                      >
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  {!editingVendor && (
                    <div>
                      <label className="block text-theme-text-primary font-raleway font-medium mb-2">Login Password</label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="input-theme rounded-lg px-4 py-2 w-full focus:outline-none   autofill-fix"
                        required
                        placeholder="Enter login password for vendor"
                      />
                      <p className="text-theme-text-tertiary text-xs mt-1">This password will be used by the vendor to login and manage their shop</p>
                    </div>
                  )}

                  <div className="flex space-x-4 pt-4">
                    <button
                      type="submit"
                      className="flex-1 btn-primary py-2 rounded-lg font-raleway flex items-center justify-center space-x-2"
                    >
                      <FaCheck />
                      <span>{editingVendor ? 'Update Vendor' : 'Add Vendor'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="flex-1 btn-secondary py-2 rounded-lg font-raleway flex items-center justify-center space-x-2"
                    >
                      <FaTimes />
                      <span>Cancel</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
      </div>
    </ZoneAdminLayout>
  );
};

export default AllVendors;