import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaEyeSlash,
  FaStore,
  FaSearch,
  FaFilter,
  FaTimes,
  FaUser,
  FaPhone,
  FaEnvelope,
  FaCheck,
  FaUserPlus,
  FaInfoCircle,
  FaKey
} from 'react-icons/fa';
import ZoneAdminLayout from '../ZoneAdminLayout';
import { ErrorBoundary } from '../../../shared/errors/ErrorBoundary';
import { sanitizeInput } from '../../../utils/inputSanitizer';
import { useSelector, useDispatch } from 'react-redux';
import ApiService from '../../../shared/api/ApiService';
import vendorService from '../../../services/VendorService';
import { safeToastSuccess, safeToastError } from '../../../utils/toastUtils';
import { fetchCurrentSubscription, fetchSubscriptionLimits, fetchCurrentCounts } from '../../../store/slices/subscriptionSlice';

// Enhanced Password Requirement Component
const PasswordRequirement = ({ met, text }) => (
  <div className="flex items-center gap-2">
    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors ${met ? 'bg-green-500' : 'bg-theme-bg-tertiary border border-theme-border'}`}>
      {met && <FaCheck className="text-white text-[8px]" />}
    </div>
    <span className={`text-xs font-raleway font-medium transition-colors ${met ? 'text-green-600' : 'text-theme-text-tertiary'}`}>
      {text}
    </span>
  </div>
);

const AllVendors = () => {
  const { zoneId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const subscription = useSelector((state) => state.subscription.current);
  const subscriptionLimits = useSelector((state) => state.subscription.limits);
  const currentCounts = useSelector((state) => state.subscription.currentCounts);

  const [vendorLimitStatus, setVendorLimitStatus] = useState({ allowed: true, message: '', currentCount: 0, maxAllowed: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

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

  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false, uppercase: false, lowercase: false, number: false, symbol: false, isValid: false
  });
  const [passwordError, setPasswordError] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState(null);

  const validatePassword = (password) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      symbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };
    const isValid = Object.values(checks).every(Boolean);
    return { ...checks, isValid };
  };

  const isPasswordValid = !editingVendor ? passwordRequirements.isValid : true;

  useEffect(() => {
    const loadVendors = async () => {
      if (zoneId) {
        setLoading(true);
        try {
          const vendorsData = await ApiService.getZoneVendors(zoneId);
          console.log('📦 Vendors data received:', vendorsData);
          const safeVendors = Array.isArray(vendorsData) ? vendorsData : [];
          console.log('✅ Safe vendors:', safeVendors);
          setVendors(safeVendors);
          await vendorService.getVendors(zoneId);
        } catch (error) {
          safeToastError(error.message);
          setVendors([]);
        } finally {
          setLoading(false);
        }
      }
    };
    loadVendors();
  }, [zoneId]);

  useEffect(() => {
    dispatch(fetchCurrentSubscription());
    dispatch(fetchSubscriptionLimits());
    dispatch(fetchCurrentCounts());
  }, [dispatch]);

  useEffect(() => {
    if (zoneId && vendors && subscriptionLimits) {
      const maxVendors = subscriptionLimits.maxVendors || subscription?.maxVendors || 3;
      const currentCount = currentCounts?.vendors || vendors.length;
      const allowed = currentCount < maxVendors;
      setVendorLimitStatus({
        allowed,
        currentCount,
        maxAllowed: maxVendors,
        unlimited: false,
        message: !allowed ? `Vendor limit reached! You can only have ${maxVendors} vendors on your current plan.` : ''
      });
    }
  }, [zoneId, vendors.length, subscriptionLimits, currentCounts, subscription]);

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vendor.cuisine && vendor.cuisine.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (vendor.description && vendor.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      vendor.ownerName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || vendor.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handlePasswordChange = (e) => {
    const password = e.target.value;
    setFormData({ ...formData, password });
    const validation = validatePassword(password);
    setPasswordRequirements(validation);
    if (!validation.isValid && password.length > 0) {
      setPasswordError('Password must meet all 5 requirements');
    } else {
      setPasswordError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingVendor) {
        // For editing, only send the fields that can be updated
        const updateData = {
          name: formData.name,
          description: formData.description,
          cuisine: formData.cuisine,
          ownerName: formData.ownerName,
          ownerPhone: formData.ownerPhone,
          ownerEmail: formData.ownerEmail,
          status: formData.status
        };
        
        console.log('Updating vendor with data:', updateData);
        await ApiService.updateZoneVendor(zoneId, editingVendor.id, updateData);
        safeToastSuccess('Vendor updated successfully');
      } else {
        if (!vendorLimitStatus.allowed) {
          safeToastError(vendorLimitStatus.message);
          setShowUpgradeModal(true);
          return;
        }
        const vendorData = {
          name: formData.name,
          description: formData.description,
          cuisine: formData.cuisine,
          ownerName: formData.ownerName,
          ownerPhone: formData.ownerPhone,
          ownerEmail: formData.ownerEmail,
          status: formData.status,
          loginCredentials: {
            username: formData.name.toLowerCase().replace(/\s+/g, '_') + '_vendor',
            password: formData.password,
          }
        };
        
        console.log('Creating vendor with data:', vendorData);
        await ApiService.createZoneVendor(zoneId, vendorData);
        safeToastSuccess('Vendor created successfully!');
      }

      // Refresh vendor list
      const vendorsData = await ApiService.getZoneVendors(zoneId);
      setVendors(Array.isArray(vendorsData) ? vendorsData : []);
      await vendorService.getVendors(zoneId);
      resetForm();
    } catch (error) {
      console.error('Error saving vendor:', error);
      safeToastError(error.message || 'Failed to save vendor');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', cuisine: '', ownerName: '', ownerPhone: '', ownerEmail: '', status: 'active', logo: null, coverImage: null, password: '' });
    setPasswordRequirements({ length: false, uppercase: false, lowercase: false, number: false, symbol: false, isValid: false });
    setPasswordError('');
    setShowPassword(false);
    setEditingVendor(null);
    setShowForm(false);
  };

  const handleEdit = (vendor) => {
    setFormData({ 
      name: vendor.name || '',
      description: vendor.description || '',
      cuisine: vendor.cuisine || '',
      ownerName: vendor.ownerName || '',
      ownerPhone: vendor.ownerPhone || '',
      ownerEmail: vendor.ownerEmail || '',
      status: vendor.status || 'active',
      logo: null,
      coverImage: null,
      password: ''
    });
    setEditingVendor(vendor);
    setShowForm(true);
  };

  const handleDelete = (vendor) => {
    setVendorToDelete(vendor);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!vendorToDelete) return;
    try {
      await ApiService.deleteZoneVendor(zoneId, vendorToDelete.id);
      setVendors(prev => prev.filter(v => v.id !== vendorToDelete.id));
      safeToastSuccess('Vendor deleted successfully');
    } catch (error) {
      safeToastError(error.message);
    } finally {
      setShowDeleteModal(false);
      setVendorToDelete(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-500/10 border-green-500/20';
      case 'pending': return 'text-amber-600 bg-amber-500/10 border-amber-500/20';
      case 'inactive': return 'text-red-600 bg-red-500/10 border-red-500/20';
      default: return 'text-theme-text-secondary bg-theme-bg-secondary border-theme-border';
    }
  };

  if (loading && vendors.length === 0) {
    return (
      <ZoneAdminLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-theme-accent-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-theme-text-secondary font-medium font-raleway tracking-wide">Loading vendors...</p>
          </div>
        </div>
      </ZoneAdminLayout>
    );
  }

  // Refined Input Styling - slightly more compact padding for spacious feel
  const inputClass = "w-full bg-theme-bg-primary border border-theme-border text-theme-text-primary rounded-xl px-4 py-2.5 font-raleway focus:outline-none focus:border-theme-accent-primary focus:ring-1 focus:ring-theme-accent-primary transition-all shadow-sm";
  const labelClass = "block text-theme-text-secondary font-raleway font-semibold mb-1.5 text-sm";
  const sectionCardClass = "bg-theme-bg-secondary/40 border border-theme-border rounded-xl p-5 md:p-6 space-y-5 shadow-sm";

  return (
    <ErrorBoundary>
      <ZoneAdminLayout>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-12">

          {/* 1. Global Search & Filters (At the Top) */}
          <div className="flex flex-col sm:flex-row gap-4 mb-2">
            <div className="relative flex-1">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-text-tertiary" />
              <input
                type="text"
                placeholder="Search vendors, cuisines, or owners..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-theme-bg-primary border border-theme-border text-theme-text-primary rounded-xl pl-11 pr-4 py-3 font-raleway focus:outline-none focus:border-theme-accent-primary transition-colors text-sm shadow-sm"
              />
            </div>
            <div className="relative min-w-[180px]">
              <FaFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-text-tertiary text-xs" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-theme-bg-primary border border-theme-border text-theme-text-primary rounded-xl pl-10 pr-8 py-3 font-raleway focus:outline-none focus:border-theme-accent-primary transition-colors text-sm appearance-none cursor-pointer shadow-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* 2. Page Header & Actions */}
          <div className="admin-card p-6 rounded-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border border-theme-border shadow-sm">
            <div>
              <h1 className="text-2xl sm:text-3xl font-fredoka text-theme-text-primary mb-1">All Vendors</h1>
              <p className="text-theme-text-secondary font-raleway text-sm">Manage and monitor all shop partners in your zone.</p>
            </div>

            <button
              onClick={() => {
                if (!vendorLimitStatus.allowed) {
                  safeToastError(vendorLimitStatus.message);
                  setShowUpgradeModal(true);
                } else {
                  resetForm();
                  setShowForm(true);
                }
              }}
              disabled={!vendorLimitStatus.allowed}
              className={`w-full lg:w-auto px-6 py-2.5 rounded-xl font-raleway font-bold flex items-center justify-center gap-2 transition-all shadow-sm whitespace-nowrap h-[50px]
                  ${vendorLimitStatus.allowed
                  ? 'btn-primary hover:shadow-md'
                  : 'bg-theme-bg-tertiary text-theme-text-tertiary cursor-not-allowed border border-theme-border'}
                `}
            >
              {vendorLimitStatus.allowed ? (
                <>
                  <FaPlus className="text-sm" />
                  <span>Add Vendor</span>
                </>
              ) : (
                <>
                  <FaUserPlus className="text-sm" />
                  <span>Limit Reached ({vendorLimitStatus.currentCount}/{vendorLimitStatus.maxAllowed})</span>
                </>
              )}
            </button>

          </div>

          {/* 3. Vendors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredVendors.length === 0 ? (
              <div className="col-span-full admin-card rounded-2xl p-12 flex flex-col items-center justify-center text-center border border-theme-border border-dashed">
                <div className="w-20 h-20 bg-theme-bg-secondary rounded-full flex items-center justify-center mb-4">
                  <FaStore className="text-3xl text-theme-text-tertiary" />
                </div>
                <h3 className="text-xl font-fredoka text-theme-text-primary mb-2">No Vendors Found</h3>
                <p className="text-theme-text-secondary font-raleway max-w-sm">
                  {searchTerm || statusFilter !== 'all' ? 'Try adjusting your search filters.' : 'You haven\'t added any vendors yet.'}
                </p>
              </div>
            ) : (
              filteredVendors.map((vendor) => (
                <motion.div
                  key={vendor.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="admin-card rounded-2xl border border-theme-border shadow-sm hover:shadow-xl hover:border-theme-accent-primary/40 transition-all duration-300 flex flex-col overflow-hidden"
                >
                  <div className="p-5 flex items-start gap-4">
                    <div className="w-14 h-14 shrink-0 bg-theme-accent-primary/10 rounded-xl flex items-center justify-center border border-theme-accent-primary/20">
                      <FaStore className="text-theme-accent-primary text-xl" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="text-lg font-fredoka text-theme-text-primary truncate">{vendor.name}</h3>
                        <span className={`shrink-0 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(vendor.status)}`}>
                          {vendor.status}
                        </span>
                      </div>
                      {vendor.cuisine && (
                        <p className="text-theme-text-secondary text-sm font-raleway font-medium truncate capitalize">
                          {vendor.cuisine.replace(/_/g, ' ')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="px-5 pb-4 flex-1">
                    <p className="text-theme-text-secondary font-raleway text-xs line-clamp-2 leading-relaxed bg-theme-bg-secondary/50 p-3 rounded-xl border border-theme-border">
                      {vendor.description || "No description provided."}
                    </p>
                  </div>

                  <div className="p-5 border-t border-theme-border bg-theme-bg-secondary flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FaUser className="text-theme-text-tertiary text-xs shrink-0" />
                        <span className="text-theme-text-primary text-xs font-semibold font-raleway truncate">{vendor.ownerName}</span>
                      </div>
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FaPhone className="text-theme-text-tertiary text-xs shrink-0" />
                        <span className="text-theme-text-primary text-xs font-semibold font-raleway truncate">{vendor.ownerPhone}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-theme-border/50">
                      <button
                        onClick={() => handleEdit(vendor)}
                        className="flex-1 py-2 bg-theme-bg-primary border border-theme-border text-theme-text-secondary hover:text-theme-accent-primary hover:border-theme-accent-primary rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                      >
                        <FaEdit /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(vendor)}
                        className="w-10 h-10 flex items-center justify-center bg-red-100 border border-red-200 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-all duration-200 shrink-0">
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* ADD / EDIT VENDOR MODAL */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                onClick={(e) => e.target === e.currentTarget && resetForm()}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 20 }}
                  className="bg-theme-bg-primary rounded-xl shadow-2xl border border-theme-border w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
                >
                  {/* Compact Header */}
                  <div className="px-6 py-4 border-b border-theme-border bg-theme-bg-primary flex items-center justify-between sticky top-0 z-20">
                    <h2 className="text-xl font-fredoka text-theme-text-primary">
                      {editingVendor ? 'Edit Vendor Details' : 'Onboard New Vendor'}
                    </h2>
                    <button
                      onClick={resetForm}
                      className="w-8 h-8 flex items-center justify-center rounded-full text-theme-text-secondary hover:bg-theme-bg-secondary hover:text-theme-text-primary transition-colors"
                    >
                      <FaTimes className="text-lg" />
                    </button>
                  </div>

                  {/* Body with Stacked Details */}
                  <div className="p-6 overflow-y-auto custom-scrollbar">
                    <form id="vendor-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">

                      {/* Left Column: Shop Info */}
                      <div className="space-y-6">
                        <div className={sectionCardClass}>
                          <div className="flex items-center gap-2 mb-1">
                            <FaStore className="text-theme-accent-primary" />
                            <h3 className="font-fredoka text-lg text-theme-text-primary">Shop Information</h3>
                          </div>

                          <div>
                            <label className={labelClass}>Vendor/Shop Name *</label>
                            <input
                              type="text"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: sanitizeInput(e.target.value) })}
                              className={inputClass}
                              required
                              placeholder="e.g. Burger King"
                            />
                          </div>

                          <div>
                            <label className={labelClass}>Cuisine Type *</label>
                            <input
                              type="text"
                              value={formData.cuisine}
                              onChange={(e) => setFormData({ ...formData, cuisine: e.target.value })}
                              className={inputClass}
                              required
                              placeholder="e.g. American, Fast Food"
                            />
                          </div>

                          <div>
                            <label className={labelClass}>Description *</label>
                            <textarea
                              value={formData.description}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                              className={`${inputClass} h-24 resize-none`}
                              required
                              placeholder="Brief description of the vendor's offerings..."
                            />
                          </div>

                          {editingVendor && (
                            <div>
                              <label className={labelClass}>Status</label>
                              <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className={`${inputClass} appearance-none cursor-pointer`}
                              >
                                <option value="active">Active</option>
                                <option value="pending">Pending</option>
                                <option value="inactive">Inactive</option>
                              </select>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Column: Owner & Credentials */}
                      <div className="space-y-6">
                        <div className={sectionCardClass}>
                          <div className="flex items-center gap-2 mb-1">
                            <FaUser className="text-status-info" />
                            <h3 className="font-fredoka text-lg text-theme-text-primary">Owner Details</h3>
                          </div>

                          {/* Stacked Vertically */}
                          <div>
                            <label className={labelClass}>Owner Full Name *</label>
                            <input
                              type="text"
                              value={formData.ownerName}
                              onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                              className={inputClass}
                              required
                              placeholder="John Doe"
                            />
                          </div>

                          <div>
                            <label className={labelClass}>Phone Number *</label>
                            <div className="relative">
                              <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-text-tertiary text-xs" />
                              <input
                                type="tel"
                                value={formData.ownerPhone}
                                onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                                className={`${inputClass} pl-10`}
                                required
                                maxLength={10}
                                placeholder="9876543210"
                              />
                            </div>
                          </div>

                          <div>
                            <label className={labelClass}>Email Address *</label>
                            <div className="relative">
                              <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-text-tertiary text-xs" />
                              <input
                                type="email"
                                value={formData.ownerEmail}
                                onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                                className={`${inputClass} pl-10`}
                                required
                                placeholder="john@example.com"
                              />
                            </div>
                          </div>
                        </div>

                        {!editingVendor && (
                          <div className={sectionCardClass}>
                            <div className="flex items-center gap-2 mb-1">
                              <FaKey className="text-status-warning" />
                              <h3 className="font-fredoka text-lg text-theme-text-primary">Vendor Credentials</h3>
                            </div>

                            <div>
                              <label className={labelClass}>Initial Password *</label>
                              <div className="relative">
                                <input
                                  type={showPassword ? 'text' : 'password'}
                                  value={formData.password}
                                  onChange={handlePasswordChange}
                                  className={`${inputClass} ${passwordError ? 'border-status-danger ring-status-danger' : ''} pr-12`}
                                  required
                                  placeholder="Set a secure password"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-text-tertiary hover:text-theme-text-primary focus:outline-none"
                                >
                                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                              </div>

                              <div className="mt-4 p-4 bg-theme-bg-primary border border-theme-border rounded-xl space-y-2">
                                <p className="text-[10px] font-bold text-theme-text-secondary uppercase tracking-wider mb-2">Requirements</p>
                                <div className="grid grid-cols-2 gap-y-2 gap-x-2">
                                  <PasswordRequirement met={passwordRequirements.length} text="8+ chars" />
                                  <PasswordRequirement met={passwordRequirements.uppercase} text="Uppercase" />
                                  <PasswordRequirement met={passwordRequirements.lowercase} text="Lowercase" />
                                  <PasswordRequirement met={passwordRequirements.number} text="Number" />
                                  <PasswordRequirement met={passwordRequirements.symbol} text="Symbol (!@#...)" />
                                </div>
                              </div>
                              {passwordError && (
                                <p className="mt-2 text-xs font-semibold text-status-danger flex items-center gap-1">
                                  <FaInfoCircle /> {passwordError}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </form>
                  </div>

                  {/* Compact Footer */}
                  <div className="px-6 py-4 border-t border-theme-border bg-theme-bg-secondary rounded-b-xl flex items-center justify-end gap-3 sticky bottom-0 z-20">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-5 py-2.5 rounded-lg font-raleway font-semibold text-theme-text-secondary hover:bg-theme-border hover:text-theme-text-primary transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      form="vendor-form"
                      disabled={!isPasswordValid && !editingVendor}
                      className={`btn-primary px-6 py-2.5 rounded-lg font-raleway font-semibold flex items-center gap-2 shadow-md transition-all
                        ${(!isPasswordValid && !editingVendor) ? 'opacity-50 cursor-not-allowed shadow-none' : 'hover:shadow-lg'}
                      `}
                    >
                      <FaCheck className="text-sm" />
                      <span>{editingVendor ? 'Update Vendor' : 'Create Vendor'}</span>
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* DELETE CONFIRMATION MODAL */}
          <AnimatePresence>
            {showDeleteModal && vendorToDelete && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                onClick={(e) => e.target === e.currentTarget && setShowDeleteModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-theme-bg-primary rounded-xl shadow-2xl border border-theme-border w-full max-w-md overflow-hidden p-8 text-center"
                >
                  <h2 className="text-2xl font-fredoka font-bold text-theme-text-primary mb-3 mt-2">
                    Delete Vendor?
                  </h2>
                  <p className="text-theme-text-secondary font-raleway mb-6">
                    Are you sure you want to permanently delete <strong>{vendorToDelete.name}</strong>?
                  </p>

                  <div className="bg-status-danger/10 border border-status-danger/20 rounded-xl p-4 mb-8 text-left flex items-start gap-3">
                    <FaInfoCircle className="text-status-danger text-lg shrink-0 mt-0.5" />
                    <p className="text-status-danger text-sm font-medium font-raleway leading-relaxed">
                      This action is irreversible. It will wipe all menu items, order history, and credentials associated with this vendor.
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        setShowDeleteModal(false);
                        setVendorToDelete(null);
                      }}
                      className="flex-1 py-2.5 rounded-lg font-bold font-raleway border-2 border-theme-border text-theme-text-secondary hover:bg-theme-bg-secondary hover:text-theme-text-primary transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDelete}
                      className="flex-1 py-2.5 rounded-lg font-bold font-raleway bg-red-600 text-white shadow-md hover:bg-red-700 transition-all duration-200">
                      Delete Vendor
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </ZoneAdminLayout>
    </ErrorBoundary>
  );
};

export default AllVendors;