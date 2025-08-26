import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import {
  FaStore,
  FaPlus,
  FaEdit,
  FaTrash,
  FaLock,
  FaUnlock,
  FaSearch,
  FaFilter,
  FaDownload,
  FaUser,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaDollarSign,
  FaShoppingCart,
  FaStar,
  FaCheck,
  FaTimes,
  FaExclamationTriangle,
  FaCopy,
  FaKey,
  FaEye,
  FaEyeSlash
} from 'react-icons/fa';
import ZoneAdminLayout from '../ZoneAdminLayout';
import ImageUpload from '../../common/ImageUpload';
import LocalStorageService from '../../../services/LocalStorageService';
import QuotaBanner from '../common/QuotaBanner';
import { usePlanRestrictions } from '../../subscription/PlanRestrictions';


// Password Management Form Component
const PasswordManagementForm = ({ shop, onPasswordUpdate, onClose }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long!');
      return;
    }

    setLoading(true);
    try {
      await onPasswordUpdate(shop.id, newPassword);
      alert('Password updated successfully!');
      onClose();
    } catch (error) {
      alert('Failed to update password: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Current Password Display */}
      <div>
        <label className="block text-theme-text-primary font-raleway font-medium mb-2">Current Password</label>
        <div className="flex items-center space-x-2">
          <input
            type={showCurrentPassword ? 'text' : 'password'}
            value={shop.loginCredentials?.password || ''}
            readOnly
            className="flex-1 input-theme rounded-lg px-4 py-2 bg-theme-bg-secondary"
          />
          <button
            type="button"
            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            className="p-2 text-theme-text-secondary hover:text-theme-text-primary rounded-lg"
          >
            {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
      </div>

      {/* New Password */}
      <div>
        <label className="block text-theme-text-primary font-raleway font-medium mb-2">New Password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full input-theme rounded-lg px-4 py-2"
          placeholder="Enter new password"
          required
          minLength="6"
        />
      </div>

      {/* Confirm Password */}
      <div>
        <label className="block text-theme-text-primary font-raleway font-medium mb-2">Confirm Password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full input-theme rounded-lg px-4 py-2"
          placeholder="Confirm new password"
          required
          minLength="6"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-4 pt-4">
        <button
          type="submit"
          disabled={loading || !newPassword || !confirmPassword}
          className="flex-1 btn-primary py-2 rounded-lg font-raleway disabled:opacity-50"
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 btn-secondary py-2 rounded-lg font-raleway"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

const AllZoneShops = () => {
  const { zoneId } = useParams();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingShop, setEditingShop] = useState(null);
  const [viewingShop, setViewingShop] = useState(null);
  const [deletingShop, setDeletingShop] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState(null);
  
  // Plan restrictions integration for zones
  const { 
    subscription, 
    currentCounts, 
    checkLimit, 
    PlanStatusBadge, 
    FeatureRestriction, 
    LimitReachedModal,
    PaymentModal,
    PaymentSuccessModal,
    handleUpgrade
  } = usePlanRestrictions();
  const [formData, setFormData] = useState({
    name: '',
    ownerName: '',
    ownerPhone: '',
    ownerEmail: '',
    cuisine: '',
    description: '',
    address: '',
    tableCount: 0, // Fixed by plan; not editable
    status: 'active',
    logo: null,
    coverImage: null,
    password: '', // Login password for shop owner
    operatingHours: {
      monday: { open: '09:00', close: '22:00', closed: false },
      tuesday: { open: '09:00', close: '22:00', closed: false },
      wednesday: { open: '09:00', close: '22:00', closed: false },
      thursday: { open: '09:00', close: '22:00', closed: false },
      friday: { open: '09:00', close: '22:00', closed: false },
      saturday: { open: '09:00', close: '23:00', closed: false },
      sunday: { open: '10:00', close: '22:00', closed: false }
    }
  });

  useEffect(() => {
    const loadShops = () => {
      setLoading(true);
      try {
        const zoneShops = LocalStorageService.getZoneShops(zoneId);
        setShops(zoneShops);
      } catch (error) {
        console.error('Error loading zone shops:', error);
        setShops([]);
      } finally {
        setLoading(false);
      }
    };

    if (zoneId) {
      loadShops();
    }
  }, [zoneId]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'status-success bg-status-success-light';
      case 'inactive': return 'status-error bg-status-error-light';
      case 'pending': return 'status-warning bg-status-warning-light';
      default: return 'text-theme-text-tertiary bg-theme-bg-secondary';
    }
  };

  const handleAddShop = () => {
    // Check if user can add more shops based on their zone plan
    if (!checkLimit('vendors')) {
      return; // Modal will be shown by checkLimit
    }
    
    setEditingShop(null);
    setFormData({
      name: '',
      ownerName: '',
      ownerPhone: '',
      ownerEmail: '',
      cuisine: '',
      description: '',
      address: '',
      tableCount: 4,
      status: 'active',
      logo: null,
      coverImage: null
    });
    setShowAddModal(true);
  };

  const handleViewShop = (shop) => {
    setViewingShop(shop);
    setShowViewModal(true);
  };

  const handleEditShop = (shop) => {
    setEditingShop(shop);
    setFormData(shop);
    setShowAddModal(true);
  };

  const handleDeleteShop = (shop) => {
    setDeletingShop(shop);
    setShowDeleteModal(true);
  };

  const confirmDeleteShop = () => {
    if (deletingShop) {
      const success = LocalStorageService.deleteZoneShop(zoneId, deletingShop.id);
      if (success) {
        setShops(prev => prev.filter(shop => shop.id !== deletingShop.id));
      }
      setShowDeleteModal(false);
      setDeletingShop(null);
    }
  };

  const handleToggleStatus = (shopId) => {
    const shop = shops.find(s => s.id === shopId);
    const newStatus = shop.status === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'activate' : 'deactivate';

    if (window.confirm(`Are you sure you want to ${action} ${shop.name}?`)) {
      const updatedShop = LocalStorageService.updateZoneShop(zoneId, shopId, { status: newStatus });
      if (updatedShop) {
        setShops(prev => prev.map(shop =>
          shop.id === shopId ? updatedShop : shop
        ));
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingShop) {
      // Update existing shop (don't update password through regular form)
      const updateData = { ...formData };
      delete updateData.password; // Don't update password through regular form
      const updatedShop = LocalStorageService.updateZoneShop(zoneId, editingShop.id, updateData);
      if (updatedShop) {
        setShops(prev => prev.map(shop =>
          shop.id === editingShop.id ? updatedShop : shop
        ));
      }
    } else {
      // Add new shop with login credentials
      const username = formData.name.toLowerCase().replace(/\s+/g, '_') + '_shop';

      const shopData = {
        ...formData,
        slug: formData.name.toLowerCase().replace(/\s+/g, '-'),
        loginCredentials: {
          username: username,
          password: formData.password,
          lastLogin: null
        },
        zoneId: zoneId,
        type: 'zone_shop'
      };

      const newShop = LocalStorageService.addZoneShop(zoneId, shopData);
      if (newShop) {
        setShops(prev => [...prev, newShop]);

        // Show success message with credentials
        alert(`Shop created successfully!\n\nLogin Credentials:\nUsername: ${username}\nPassword: ${formData.password}\nPhone: ${formData.ownerPhone}\n\nShop Owner can now login to manage their shop.`);
      }
    }
    setShowAddModal(false);
    setEditingShop(null);
    resetFormData();
  };

  const resetFormData = () => {
    setFormData({
      name: '',
      ownerName: '',
      ownerPhone: '',
      ownerEmail: '',
      cuisine: '',
      description: '',
      address: '',
      tableCount: 4,
      status: 'active',
      logo: null,
      coverImage: null,
      password: '',
      operatingHours: {
        monday: { open: '09:00', close: '22:00', closed: false },
        tuesday: { open: '09:00', close: '22:00', closed: false },
        wednesday: { open: '09:00', close: '22:00', closed: false },
        thursday: { open: '09:00', close: '22:00', closed: false },
        friday: { open: '09:00', close: '22:00', closed: false },
        saturday: { open: '09:00', close: '23:00', closed: false },
        sunday: { open: '10:00', close: '22:00', closed: false }
      }
    });
  };

  const copyCredentials = (shop) => {
    if (shop.loginCredentials) {
      const credentials = `Shop: ${shop.name}\nUsername: ${shop.loginCredentials.username}\nPassword: ${shop.loginCredentials.password}`;
      navigator.clipboard.writeText(credentials);
      alert('Credentials copied to clipboard!');
    } else {
      alert('No credentials available for this shop.');
    }
  };

  const handlePasswordManagement = (shop) => {
    setPasswordTarget(shop);
    setShowPasswordModal(true);
  };

  const handlePasswordUpdate = async (shopId, newPassword) => {
    try {
      const updatedShop = LocalStorageService.updateZoneShop(zoneId, shopId, {
        loginCredentials: {
          ...passwordTarget.loginCredentials,
          password: newPassword
        }
      });

      if (updatedShop) {
        // Also update the credentials in the login system
        LocalStorageService.updateShopCredentials(shopId, zoneId, newPassword);

        setShops(prev => prev.map(shop =>
          shop.id === shopId ? updatedShop : shop
        ));
      }
    } catch (error) {
      throw new Error('Failed to update password');
    }
  };

  const filteredShops = shops.filter(shop => {
    const matchesSearch = shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shop.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shop.cuisine.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || shop.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <ZoneAdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 spinner-theme rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-theme-text-primary font-raleway">Loading zone shops...</p>
          </div>
        </div>
      </ZoneAdminLayout>
    );
  }

  return (
    <ZoneAdminLayout>
      <div className="space-y-6">
        {/* Plan Status Badge */}
        <PlanStatusBadge subscription={subscription} currentCounts={currentCounts} />
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-fredoka text-theme-text-primary mb-2">Zone Shop Management</h1>
            {/* Quota Indicator */}
            <div className="admin-card rounded-2xl p-4">
              <QuotaBanner zoneId={zoneId} currentCount={shops.length} type="vendors" />
            </div>

            <p className="text-theme-text-secondary font-raleway text-sm sm:text-base">Manage all shops in your food zone</p>
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Shops: {shops.length}/{subscription?.maxVendors || subscription?.maxShops || '∞'}
            </div>
          </div>
          <button
            onClick={handleAddShop}
            className="btn-primary px-6 py-3 rounded-lg font-raleway font-semibold flex items-center space-x-2"
          >
            <FaPlus />
            <span>Add New Shop</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="admin-card rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-theme-accent-primary rounded-xl flex items-center justify-center">
                <FaStore className="text-theme-text-inverse text-xl" />
              </div>
            </div>
            <h3 className="text-2xl font-fredoka text-theme-text-primary mb-1">{shops.length}</h3>
            <p className="text-theme-text-primary font-raleway font-medium mb-1">Total Shops</p>
            <p className="text-theme-text-secondary font-raleway text-sm">In your zone</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="admin-card rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                <FaCheck className="text-theme-text-inverse text-xl" />
              </div>
            </div>
            <h3 className="text-2xl font-fredoka text-theme-text-primary mb-1">
              {shops.filter(s => s.status === 'active').length}
            </h3>
            <p className="text-theme-text-primary font-raleway font-medium mb-1">Active Shops</p>
            <p className="text-theme-text-secondary font-raleway text-sm">Currently operating</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="admin-card rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <FaDollarSign className="text-theme-text-inverse text-xl" />
              </div>
            </div>
            <h3 className="text-2xl font-fredoka text-theme-text-primary mb-1">
              ₹{shops.reduce((sum, shop) => sum + shop.todayRevenue, 0).toLocaleString()}
            </h3>
            <p className="text-theme-text-primary font-raleway font-medium mb-1">Today's Revenue</p>
            <p className="text-theme-text-secondary font-raleway text-sm">All shops combined</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="admin-card rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <FaShoppingCart className="text-theme-text-inverse text-xl" />
              </div>
            </div>
            <h3 className="text-2xl font-fredoka text-theme-text-primary mb-1">
              {shops.reduce((sum, shop) => sum + shop.todayOrders, 0)}
            </h3>
            <p className="text-theme-text-primary font-raleway font-medium mb-1">Today's Orders</p>
            <p className="text-theme-text-secondary font-raleway text-sm">All shops combined</p>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="admin-card rounded-2xl p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary" />
              <input
                type="text"
                placeholder="Search shops, owners, or cuisine..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full input-theme rounded-lg pl-10 pr-4 py-2 focus:outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-theme rounded-lg px-4 py-2 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
            <button className="btn-secondary px-4 py-2 rounded-lg font-raleway flex items-center justify-center space-x-2">
              <FaDownload />
              <span>Export Data</span>
            </button>
          </div>
        </div>

        {/* Shops Table */}
        <div className="admin-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-theme-bg-secondary">
                <tr>
                  <th className="text-left p-4 text-theme-text-primary font-raleway font-semibold">Shop Details</th>
                  <th className="text-left p-4 text-theme-text-primary font-raleway font-semibold">Owner</th>
                  <th className="text-left p-4 text-theme-text-primary font-raleway font-semibold">Performance</th>
                  <th className="text-left p-4 text-theme-text-primary font-raleway font-semibold">Status</th>
                  <th className="text-left p-4 text-theme-text-primary font-raleway font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border-primary">
                {filteredShops.map((shop, index) => (
                  <motion.tr
                    key={shop.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="hover:bg-theme-bg-hover"
                  >
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-theme-accent-primary rounded-lg flex items-center justify-center overflow-hidden">
                          {shop.logo ? (
                            <img
                              src={shop.logo}
                              alt={`${shop.name} logo`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FaStore className="text-theme-text-inverse" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-theme-text-primary font-raleway font-medium">{shop.name}</h3>
                          <p className="text-theme-text-secondary font-raleway text-sm">{shop.cuisine} • {shop.tableCount} tables</p>
                          <p className="text-theme-text-tertiary font-raleway text-xs">{shop.address}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <h4 className="text-theme-text-primary font-raleway font-medium">{shop.ownerName}</h4>
                        <p className="text-theme-text-secondary font-raleway text-sm">{shop.ownerPhone}</p>
                        <p className="text-theme-text-tertiary font-raleway text-xs">{shop.ownerEmail}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <FaDollarSign className="text-theme-text-tertiary text-xs" />
                          <span className="text-theme-text-primary font-raleway text-sm">₹{shop.todayRevenue.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <FaShoppingCart className="text-theme-text-tertiary text-xs" />
                          <span className="text-theme-text-secondary font-raleway text-sm">{shop.todayOrders} orders today</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <FaStar className="text-yellow-400 text-xs" />
                          <span className="text-theme-text-secondary font-raleway text-sm">{shop.rating} rating</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-raleway font-medium ${getStatusColor(shop.status)}`}>
                        {shop.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleViewShop(shop)}
                          className="p-2 text-theme-text-secondary hover:text-status-info hover:bg-status-info/10 rounded-lg transition-colors"
                          title="View Shop Details"
                        >
                          <FaUser />
                        </button>
                        <button
                          onClick={() => handleEditShop(shop)}
                          className="p-2 text-theme-text-secondary hover:text-theme-accent-primary hover:bg-theme-accent-primary/10 rounded-lg transition-colors"
                          title="Edit Shop"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(shop.id)}
                          className={`p-2 rounded-lg transition-colors ${shop.status === 'active'
                            ? 'text-status-error hover:bg-status-error/10'
                            : 'text-status-success hover:bg-status-success/10'
                            }`}
                          title={shop.status === 'active' ? 'Deactivate Shop' : 'Activate Shop'}
                        >
                          {shop.status === 'active' ? <FaLock /> : <FaUnlock />}
                        </button>
                        {shop.loginCredentials && (
                          <>
                            <button
                              onClick={() => copyCredentials(shop)}
                              className="p-2 text-theme-text-secondary hover:text-theme-accent-primary hover:bg-theme-accent-primary/10 rounded-lg transition-colors"
                              title="Copy Credentials"
                            >
                              <FaCopy />
                            </button>
                            <button
                              onClick={() => handlePasswordManagement(shop)}
                              className="p-2 text-theme-text-secondary hover:text-status-warning hover:bg-status-warning/10 rounded-lg transition-colors"
                              title="Manage Password"
                            >
                              <FaKey />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDeleteShop(shop)}
                          className="p-2 text-status-error hover:bg-status-error/10 rounded-lg transition-colors"
                          title="Delete Shop"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredShops.length === 0 && (
            <div className="text-center py-12">
              <FaStore className="text-6xl text-theme-text-tertiary mx-auto mb-4" />
              <h3 className="text-xl font-fredoka text-theme-text-primary mb-2">No Shops Found</h3>
              <p className="text-theme-text-secondary font-raleway">No shops match your current filters.</p>
            </div>
          )}
        </div>

        {/* Add/Edit Shop Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="admin-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-fredoka text-theme-text-primary">
                  {editingShop ? 'Edit Zone Shop' : 'Add New Zone Shop'}
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-theme-text-tertiary hover:text-theme-text-primary"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Image Uploads */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-theme-text-primary font-raleway font-medium mb-2">Shop Logo</label>
                    <ImageUpload
                      currentImage={formData.logo}
                      onImageChange={(imageUrl) => setFormData({ ...formData, logo: imageUrl })}
                      label="Upload Logo"
                      size="medium"
                      shape="circle"
                    />
                  </div>
                  <div>
                    <label className="block text-theme-text-primary font-raleway font-medium mb-2">Cover Image</label>
                    <ImageUpload
                      currentImage={formData.coverImage}
                      onImageChange={(imageUrl) => setFormData({ ...formData, coverImage: imageUrl })}
                      label="Upload Cover"
                      size="medium"
                      shape="rounded"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-theme-text-primary font-raleway font-medium mb-2">Shop Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-theme-text-primary font-raleway font-medium mb-2">Cuisine Type</label>
                    <input
                      type="text"
                      value={formData.cuisine}
                      onChange={(e) => setFormData({ ...formData, cuisine: e.target.value })}
                      required
                      className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-theme-text-primary font-raleway font-medium mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none h-20 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-theme-text-primary font-raleway font-medium mb-2">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                    className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-theme-text-primary font-raleway font-medium mb-2">Owner Name</label>
                    <input
                      type="text"
                      value={formData.ownerName}
                      onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                      required
                      className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-theme-text-primary font-raleway font-medium mb-2">Owner Phone</label>
                    <input
                      type="tel"
                      value={formData.ownerPhone}
                      onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                      required
                      className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-theme-text-primary font-raleway font-medium mb-2">Owner Email</label>
                    <input
                      type="email"
                      value={formData.ownerEmail}
                      onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                      required
                      className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-theme-text-primary font-raleway font-medium mb-2">Table Count</label>
                    <div className="w-full input-theme rounded-lg px-4 py-2 font-raleway bg-theme-bg-secondary text-theme-text-secondary">
                      Fixed by your subscription plan
                    </div>
                    <p className="text-xs text-theme-text-tertiary mt-1">Tables are allocated based on your Zone plan. Upgrade to increase limits.</p>
                  </div>
                  <div>
                    <label className="block text-theme-text-primary font-raleway font-medium mb-2">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                </div>

                {/* Password field - only for new shops */}
                {!editingShop && (
                  <div>
                    <label className="block text-theme-text-primary font-raleway font-medium mb-2">Login Password *</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none"
                      placeholder="Enter secure password for shop owner login"
                      required
                      minLength="6"
                    />
                    <p className="text-theme-text-tertiary font-raleway text-sm mt-1">This password will be used for shop owner login</p>
                  </div>
                )}

                <div className="flex space-x-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 btn-primary py-2 rounded-lg font-raleway flex items-center justify-center space-x-2"
                  >
                    <FaCheck />
                    <span>{editingShop ? 'Update Shop' : 'Add Shop'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 btn-secondary py-2 rounded-lg font-raleway flex items-center justify-center space-x-2"
                  >
                    <FaTimes />
                    <span>Cancel</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* View Shop Modal */}
        {showViewModal && viewingShop && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="admin-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-fredoka text-theme-text-primary">
                  Shop Details
                </h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-theme-text-tertiary hover:text-theme-text-primary"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-6">
                {/* Shop Header */}
                <div className="flex items-center space-x-4 p-4 bg-theme-bg-secondary rounded-lg">
                  <div className="w-16 h-16 bg-theme-accent-primary rounded-xl flex items-center justify-center overflow-hidden">
                    {viewingShop.logo ? (
                      <img
                        src={viewingShop.logo}
                        alt={`${viewingShop.name} logo`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FaStore className="text-theme-text-inverse text-2xl" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-fredoka text-theme-text-primary">{viewingShop.name}</h3>
                    <p className="text-theme-text-secondary font-raleway">{viewingShop.cuisine}</p>
                    <span className={`px-3 py-1 rounded-full text-xs font-raleway font-medium ${getStatusColor(viewingShop.status)}`}>
                      {viewingShop.status}
                    </span>
                  </div>
                </div>

                {/* Shop Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-lg font-fredoka text-theme-text-primary">Shop Information</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-theme-text-tertiary font-raleway text-sm">Address</label>
                        <p className="text-theme-text-primary font-raleway">{viewingShop.address}</p>
                      </div>
                      <div>
                        <label className="text-theme-text-tertiary font-raleway text-sm">Table Count</label>
                        <p className="text-theme-text-primary font-raleway">{viewingShop.tableCount} tables</p>
                      </div>
                      <div>
                        <label className="text-theme-text-tertiary font-raleway text-sm">Description</label>
                        <p className="text-theme-text-primary font-raleway">{viewingShop.description || 'No description provided'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-lg font-fredoka text-theme-text-primary">Owner Information</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-theme-text-tertiary font-raleway text-sm">Owner Name</label>
                        <p className="text-theme-text-primary font-raleway">{viewingShop.ownerName}</p>
                      </div>
                      <div>
                        <label className="text-theme-text-tertiary font-raleway text-sm">Phone</label>
                        <p className="text-theme-text-primary font-raleway">{viewingShop.ownerPhone}</p>
                      </div>
                      <div>
                        <label className="text-theme-text-tertiary font-raleway text-sm">Email</label>
                        <p className="text-theme-text-primary font-raleway">{viewingShop.ownerEmail}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Login Credentials */}
                {viewingShop.loginCredentials && (
                  <div>
                    <h4 className="text-lg font-fredoka text-theme-text-primary mb-4">Login Credentials</h4>
                    <div className="bg-theme-bg-secondary rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-theme-text-tertiary font-raleway text-sm">Username</label>
                          <p className="text-theme-text-primary font-mono">{viewingShop.loginCredentials.username}</p>
                        </div>
                        <div>
                          <label className="text-theme-text-tertiary font-raleway text-sm">Password</label>
                          <p className="text-theme-text-primary font-mono">••••••••</p>
                        </div>
                      </div>
                      <div className="flex space-x-2 mt-4">
                        <button
                          onClick={() => copyCredentials(viewingShop)}
                          className="btn-secondary px-4 py-2 rounded-lg font-raleway flex items-center space-x-2"
                        >
                          <FaCopy />
                          <span>Copy Credentials</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowViewModal(false);
                            handlePasswordManagement(viewingShop);
                          }}
                          className="btn-secondary px-4 py-2 rounded-lg font-raleway flex items-center space-x-2"
                        >
                          <FaKey />
                          <span>Manage Password</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Performance Stats */}
                <div>
                  <h4 className="text-lg font-fredoka text-theme-text-primary mb-4">Performance Stats</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-theme-bg-secondary rounded-lg p-4 text-center">
                      <FaDollarSign className="text-2xl text-theme-accent-primary mx-auto mb-2" />
                      <p className="text-2xl font-fredoka text-theme-text-primary">₹{viewingShop.todayRevenue?.toLocaleString() || 0}</p>
                      <p className="text-theme-text-tertiary font-raleway text-sm">Today's Revenue</p>
                    </div>
                    <div className="bg-theme-bg-secondary rounded-lg p-4 text-center">
                      <FaShoppingCart className="text-2xl text-theme-accent-primary mx-auto mb-2" />
                      <p className="text-2xl font-fredoka text-theme-text-primary">{viewingShop.todayOrders || 0}</p>
                      <p className="text-theme-text-tertiary font-raleway text-sm">Today's Orders</p>
                    </div>
                    <div className="bg-theme-bg-secondary rounded-lg p-4 text-center">
                      <FaStar className="text-2xl text-yellow-400 mx-auto mb-2" />
                      <p className="text-2xl font-fredoka text-theme-text-primary">{viewingShop.rating || 0}</p>
                      <p className="text-theme-text-tertiary font-raleway text-sm">Rating</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-4 pt-4">
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      handleEditShop(viewingShop);
                    }}
                    className="flex-1 btn-primary py-2 rounded-lg font-raleway flex items-center justify-center space-x-2"
                  >
                    <FaEdit />
                    <span>Edit Shop</span>
                  </button>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="flex-1 btn-secondary py-2 rounded-lg font-raleway flex items-center justify-center space-x-2"
                  >
                    <FaTimes />
                    <span>Close</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && deletingShop && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="admin-card rounded-2xl p-6 w-full max-w-md"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-status-error/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaTrash className="text-2xl text-status-error" />
                </div>
                <h2 className="text-xl font-fredoka text-theme-text-primary mb-2">
                  Delete Shop
                </h2>
                <p className="text-theme-text-secondary font-raleway mb-6">
                  Are you sure you want to delete <strong>{deletingShop.name}</strong>? This action cannot be undone and will remove all associated data.
                </p>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 btn-secondary py-2 rounded-lg font-raleway"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteShop}
                    className="flex-1 bg-status-error hover:bg-status-error/90 text-white py-2 rounded-lg font-raleway"
                  >
                    Delete Shop
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Password Management Modal */}
        {showPasswordModal && passwordTarget && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="admin-card rounded-2xl p-6 w-full max-w-md"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-status-warning/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaKey className="text-2xl text-status-warning" />
                </div>
                <h2 className="text-xl font-fredoka text-theme-text-primary mb-2">
                  Manage Shop Password
                </h2>
                <p className="text-theme-text-secondary font-raleway mb-6">
                  Update login password for <strong>{passwordTarget.name}</strong>
                </p>

                <PasswordManagementForm
                  shop={passwordTarget}
                  onPasswordUpdate={handlePasswordUpdate}
                  onClose={() => {
                    setShowPasswordModal(false);
                    setPasswordTarget(null);
                  }}
                />
              </div>
            </motion.div>
          </div>
        )}
        
        {/* Plan Restriction Modals for Zones */}
        {LimitReachedModal}
        {PaymentModal}
        {PaymentSuccessModal}
      </div>
    </ZoneAdminLayout>
  );
};

export default AllZoneShops;
