import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';
import {
  FaStore,
  FaEdit,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaUser,
  FaStar,
  FaUsers,
  FaRupeeSign,
  FaCalendarAlt,
  FaGlobe,
  FaInstagram,
  FaFacebook,
  FaClock,
  FaBuilding,
  FaCity,
  FaTimes,
  FaSave,
  FaCamera,
  FaCheckCircle,
  FaExclamationTriangle
} from 'react-icons/fa';
import ZoneAdminLayout from './ZoneAdminLayout';
import ImageUpload from '../common/ImageUpload';
import LocalStorageService from '../../services/LocalStorageService';
import ProfileOTPVerification from '../common/ProfileOTPVerification';
import { usePlanRestrictions } from '../subscription/PlanRestrictions';

const ZoneProfile = () => {
  const { zoneId } = useParams();
  const [zoneData, setZoneData] = useState({});
  const [formData, setFormData] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState({});
  const [saveStatus, setSaveStatus] = useState(null);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(null);

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

  useEffect(() => {
    const loadZoneProfile = () => {
      setLoading(true);
      try {
        const profile = LocalStorageService.getZoneProfile(zoneId);
        if (profile) {
          setZoneData(profile);
          setFormData(profile);
        } else {
          // Create minimal profile structure for new zones
          const newProfile = {
            id: zoneId,
            name: 'New Zone',
            description: 'Please update your zone information',
            logo: '',
            coverImage: '',
            ownerName: 'Zone Owner',
            ownerPhone: '+91 9876543210',
            ownerEmail: 'owner@example.com',
            address: 'Please update your address',
            city: 'City',
            state: 'State',
            zipCode: '000000',
            totalVendors: 0,
            totalTables: 0,
            rating: 0,
            totalRevenue: 0,
            joinDate: new Date().toISOString().split('T')[0],
            status: 'active',
            operatingHours: {
              monday: { open: '09:00', close: '22:00', closed: false },
              tuesday: { open: '09:00', close: '22:00', closed: false },
              wednesday: { open: '09:00', close: '22:00', closed: false },
              thursday: { open: '09:00', close: '22:00', closed: false },
              friday: { open: '09:00', close: '22:00', closed: false },
              saturday: { open: '09:00', close: '22:00', closed: false },
              sunday: { open: '09:00', close: '22:00', closed: false }
            },
            socialMedia: {
              website: '',
              instagram: '',
              facebook: ''
            }
          };
          setZoneData(newProfile);
          setFormData(newProfile);
        }
      } catch (error) {
        console.error('Error loading zone profile:', error);
      } finally {
        setLoading(false);
      }
    };

    if (zoneId) {
      loadZoneProfile();
    }
  }, [zoneId]);

  const validateForm = () => {
    const errors = {};

    if (!formData.name?.trim()) {
      errors.name = 'Zone name is required';
    }

    if (!formData.ownerName?.trim()) {
      errors.ownerName = 'Owner name is required';
    }

    if (!formData.ownerPhone?.trim()) {
      errors.ownerPhone = 'Phone number is required';
    } else if (!/^\+?[\d\s-()]+$/.test(formData.ownerPhone)) {
      errors.ownerPhone = 'Invalid phone number format';
    }

    if (!formData.ownerEmail?.trim()) {
      errors.ownerEmail = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ownerEmail)) {
      errors.ownerEmail = 'Invalid email format';
    }

    if (!formData.address?.trim()) {
      errors.address = 'Address is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleNestedInputChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent] || {}),
        [field]: value
      }
    }));
  };

  const handleOperatingHoursChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: {
          ...prev.operatingHours[day],
          [field]: value
        }
      }
    }));
  };

  const handleSave = () => {
    if (!validateForm()) {
      setSaveStatus({ type: 'error', message: 'Please fix the validation errors' });
      return;
    }

    // Check if phone number is available for OTP verification
    if (!formData.ownerPhone || formData.ownerPhone.trim() === '') {
      setSaveStatus({ type: 'error', message: 'Phone number is required for profile verification' });
      return;
    }

    // ALWAYS require OTP verification for ANY profile changes
    console.log('Profile changes detected, triggering OTP verification');
    console.log('Phone number for OTP:', formData.ownerPhone);
    setPendingChanges(formData);
    setShowOTPVerification(true);
  };

  const saveProfile = (profileData) => {
    try {
      console.log('Saving profile data:', profileData);
      LocalStorageService.updateZoneProfile(zoneId, profileData);
      setZoneData(profileData);
      setShowEditModal(false);
      setSaveStatus({ type: 'success', message: 'Profile updated successfully with OTP verification!' });
      setTimeout(() => setSaveStatus(null), 5000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveStatus({ type: 'error', message: 'Failed to save profile' });
    }
  };

  const handleOTPVerified = () => {
    console.log('OTP verified successfully');
    if (pendingChanges) {
      console.log('Saving pending changes after OTP verification');
      saveProfile(pendingChanges);
      setPendingChanges(null);
    }
    setShowOTPVerification(false);
  };

  const handleOTPCancel = () => {
    console.log('OTP verification cancelled');
    setShowOTPVerification(false);
    setPendingChanges(null);
    setSaveStatus({ type: 'error', message: 'Profile update cancelled' });
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const formatCurrency = (amount) => {
    if (!amount || isNaN(amount)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatOperatingHours = (hours) => {
    if (!hours || hours.closed) return 'Closed';
    return `${hours.open || '00:00'} - ${hours.close || '00:00'}`;
  };

  if (loading) {
    return (
      <ZoneAdminLayout>
        <div className="min-h-screen bg-theme-bg-primary flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-theme-accent-primary mx-auto mb-4"></div>
            <div className="text-xl font-raleway text-theme-text-primary">Loading Zone Profile...</div>
          </div>
        </div>
      </ZoneAdminLayout>
    );
  }

  return (
    <ZoneAdminLayout>
      <div className="min-h-screen bg-theme-bg-primary">
        {/* Save Status */}
        <AnimatePresence>
          {saveStatus && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${saveStatus.type === 'success'
                ? 'bg-green-500 text-white'
                : 'bg-red-500 text-white'
                }`}
            >
              <div className="flex items-center space-x-2">
                {saveStatus.type === 'success' ? (
                  <FaCheckCircle />
                ) : (
                  <FaExclamationTriangle />
                )}
                <span>{saveStatus.message}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="bg-gradient-to-r from-theme-accent-primary to-theme-accent-secondary text-white py-8">
          <div className="max-w-6xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h1 className="text-4xl font-fredoka mb-2">Zone Profile</h1>
              <p className="text-xl font-raleway opacity-90">Complete zone information and management</p>
            </motion.div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Zone Plan Status */}
          {subscription && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <PlanStatusBadge subscription={subscription} currentCounts={currentCounts} />
            </motion.div>
          )}

          {/* Zone Header Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="admin-card rounded-2xl p-8 mb-8"
          >
            <div className="flex flex-col lg:flex-row items-center lg:items-start space-y-6 lg:space-y-0 lg:space-x-8">
              {/* Zone Logo */}
              <div className="flex-shrink-0">
                <div className="w-32 h-32 rounded-full bg-theme-bg-secondary border-4 border-theme-accent-primary p-2">
                  {zoneData.logo ? (
                    <img
                      src={zoneData.logo}
                      alt="Zone Logo"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-theme-bg-tertiary flex items-center justify-center">
                      <FaStore className="text-4xl text-theme-accent-primary" />
                    </div>
                  )}
                </div>
              </div>

              {/* Zone Info */}
              <div className="flex-1 text-center lg:text-left">
                <h2 className="text-3xl font-fredoka text-theme-text-primary mb-2">
                  {zoneData.name}
                </h2>
                <p className="text-lg text-theme-text-secondary font-raleway mb-4">
                  {zoneData.description}
                </p>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-fredoka text-theme-accent-primary">{zoneData.totalVendors || 0}</div>
                    <div className="text-sm text-theme-text-secondary font-raleway">Vendors</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-fredoka text-theme-accent-primary">{zoneData.totalTables || 0}</div>
                    <div className="text-sm text-theme-text-secondary font-raleway">Tables</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-fredoka text-theme-accent-primary flex items-center justify-center">
                      <FaStar className="text-yellow-500 mr-1" />
                      {zoneData.rating || '0.0'}
                    </div>
                    <div className="text-sm text-theme-text-secondary font-raleway">Rating</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-fredoka text-theme-accent-primary">{formatCurrency(zoneData.totalRevenue || 0)}</div>
                    <div className="text-sm text-theme-text-secondary font-raleway">Revenue</div>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex-shrink-0">
                <div className={`px-4 py-2 rounded-full text-sm font-raleway font-medium ${zoneData.status === 'active'
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : 'bg-red-100 text-red-800 border border-red-200'
                  }`}>
                  {zoneData.status === 'active' ? 'Active' : 'Inactive'}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Detailed Information Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Owner Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="admin-card rounded-2xl p-6"
            >
              <h3 className="text-xl font-fredoka text-theme-text-primary mb-6 flex items-center">
                <FaUser className="mr-3 text-theme-accent-primary" />
                Owner Information
              </h3>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <FaUser className="text-theme-accent-primary" />
                  <div>
                    <div className="text-sm text-theme-text-secondary font-raleway">Name</div>
                    <div className="font-raleway font-medium text-theme-text-primary">{zoneData.ownerName}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <FaPhone className="text-theme-accent-primary" />
                  <div>
                    <div className="text-sm text-theme-text-secondary font-raleway">Phone</div>
                    <div className="font-raleway font-medium text-theme-text-primary">{zoneData.ownerPhone}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <FaEnvelope className="text-theme-accent-primary" />
                  <div>
                    <div className="text-sm text-theme-text-secondary font-raleway">Email</div>
                    <div className="font-raleway font-medium text-theme-text-primary">{zoneData.ownerEmail}</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Location Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="admin-card rounded-2xl p-6"
            >
              <h3 className="text-xl font-fredoka text-theme-text-primary mb-6 flex items-center">
                <FaMapMarkerAlt className="mr-3 text-theme-accent-primary" />
                Location Details
              </h3>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <FaMapMarkerAlt className="text-theme-accent-primary mt-1" />
                  <div>
                    <div className="text-sm text-theme-text-secondary font-raleway">Address</div>
                    <div className="font-raleway font-medium text-theme-text-primary">{zoneData.address}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <FaCity className="text-theme-accent-primary" />
                  <div>
                    <div className="text-sm text-theme-text-secondary font-raleway">City</div>
                    <div className="font-raleway font-medium text-theme-text-primary">{zoneData.city}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <FaBuilding className="text-theme-accent-primary" />
                  <div>
                    <div className="text-sm text-theme-text-secondary font-raleway">State</div>
                    <div className="font-raleway font-medium text-theme-text-primary">{zoneData.state}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Business Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Operating Hours */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="admin-card rounded-2xl p-6"
            >
              <h3 className="text-xl font-fredoka text-theme-text-primary mb-6 flex items-center">
                <FaClock className="mr-3 text-theme-accent-primary" />
                Operating Hours
                <span className="ml-2 text-xs bg-theme-accent-primary/20 text-theme-accent-primary px-2 py-1 rounded-full font-raleway">
                  Editable
                </span>
              </h3>

              <div className="space-y-3">
                {Object.entries(zoneData.operatingHours || {}).map(([day, hours]) => (
                  <div key={day} className="flex justify-between items-center">
                    <div className="font-raleway font-medium text-theme-text-primary capitalize">
                      {day}
                    </div>
                    <div className="font-raleway text-theme-text-secondary">
                      {formatOperatingHours(hours)}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Social Media & Contact */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="admin-card rounded-2xl p-6"
            >
              <h3 className="text-xl font-fredoka text-theme-text-primary mb-6 flex items-center">
                <FaGlobe className="mr-3 text-theme-accent-primary" />
                Online Presence
              </h3>

              <div className="space-y-4">
                {zoneData.socialMedia?.website && (
                  <div className="flex items-center space-x-3">
                    <FaGlobe className="text-theme-accent-primary" />
                    <div>
                      <div className="text-sm text-theme-text-secondary font-raleway">Website</div>
                      <div className="font-raleway font-medium text-theme-text-primary">{zoneData.socialMedia.website}</div>
                    </div>
                  </div>
                )}

                {zoneData.socialMedia?.instagram && (
                  <div className="flex items-center space-x-3">
                    <FaInstagram className="text-theme-accent-primary" />
                    <div>
                      <div className="text-sm text-theme-text-secondary font-raleway">Instagram</div>
                      <div className="font-raleway font-medium text-theme-text-primary">{zoneData.socialMedia.instagram}</div>
                    </div>
                  </div>
                )}

                {zoneData.socialMedia?.facebook && (
                  <div className="flex items-center space-x-3">
                    <FaFacebook className="text-theme-accent-primary" />
                    <div>
                      <div className="text-sm text-theme-text-secondary font-raleway">Facebook</div>
                      <div className="font-raleway font-medium text-theme-text-primary">{zoneData.socialMedia.facebook}</div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Zone Subscription Information */}
          {subscription && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="admin-card rounded-2xl p-6 mb-6"
            >
              <h3 className="text-xl font-fredoka text-theme-text-primary mb-6 flex items-center">
                <FaCrown className="mr-3 text-theme-accent-primary" />
                Zone Subscription Plan
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-fredoka text-theme-accent-primary mb-2">
                    {subscription.label}
                  </div>
                  <div className="text-theme-text-secondary font-raleway">Current Plan</div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-fredoka text-theme-accent-primary mb-2">
                    {currentCounts.vendors || 0} / {subscription.maxVendors || '∞'}
                  </div>
                  <div className="text-theme-text-secondary font-raleway">Vendors</div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-fredoka text-theme-accent-primary mb-2">
                    {currentCounts.tables || 0} / {subscription.maxTables || '∞'}
                  </div>
                  <div className="text-theme-text-secondary font-raleway">Tables</div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-fredoka text-theme-accent-primary mb-2">
                    {subscription.key === 'premium' ? 'Unlimited' : 'Limited'}
                  </div>
                  <div className="text-theme-text-secondary font-raleway">Features</div>
                </div>
              </div>

              {/* Upgrade Section for non-premium plans */}
              {subscription.key !== 'premium' && (
                <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-fredoka text-orange-800 mb-1">Unlock More Features</h4>
                      <p className="text-sm text-orange-700 font-raleway">
                        Upgrade to get more vendors, tables, and advanced zone management features.
                      </p>
                    </div>
                    <button
                      onClick={handleUpgrade}
                      className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all font-raleway font-semibold flex items-center space-x-2"
                    >
                      <FaCrown className="text-sm" />
                      <span>Upgrade</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Additional Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="admin-card rounded-2xl p-6 mb-8"
          >
            <h3 className="text-xl font-fredoka text-theme-text-primary mb-6 flex items-center">
              <FaRupeeSign className="mr-3 text-theme-accent-primary" />
              Business Metrics
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-fredoka text-theme-accent-primary mb-2">
                  {formatCurrency(zoneData.totalRevenue || 0)}
                </div>
                <div className="text-theme-text-secondary font-raleway">Total Revenue</div>
              </div>

              <div className="text-center">
                <div className="text-3xl font-fredoka text-theme-accent-primary mb-2">
                  {zoneData.joinDate ? new Date(zoneData.joinDate).getFullYear() : new Date().getFullYear()}
                </div>
                <div className="text-theme-text-secondary font-raleway">Year Joined</div>
              </div>

              <div className="text-center">
                <div className="text-3xl font-fredoka text-theme-accent-primary mb-2 flex items-center justify-center">
                  <FaStar className="text-yellow-500 mr-2" />
                  {zoneData.rating || '0.0'}/5
                </div>
                <div className="text-theme-text-secondary font-raleway">Customer Rating</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Fixed Edit Button */}
        <div className="fixed bottom-8 right-8 z-50">
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowEditModal(true)}
            className="bg-theme-accent-primary text-white p-4 rounded-full shadow-2xl hover:bg-theme-accent-hover transition-all border-2 border-white"
            style={{
              background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
              boxShadow: '0 10px 25px rgba(255, 107, 53, 0.3)'
            }}
          >
            <FaEdit className="text-xl" />
          </motion.button>
        </div>

        {/* Edit Modal */}
        <AnimatePresence>
          {showEditModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowEditModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-theme-bg-primary rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-theme-accent-primary to-theme-accent-secondary text-white p-6 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-fredoka">Edit Zone Profile</h2>
                    <button
                      onClick={() => setShowEditModal(false)}
                      className="text-white hover:text-gray-200 transition-colors"
                    >
                      <FaTimes className="text-xl" />
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="p-6 space-y-6">
                  {/* Images Section */}
                  <div>
                    <h3 className="text-lg font-fredoka text-theme-text-primary mb-4">Zone Images</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Logo Upload */}
                      <div>
                        <label className="block text-sm font-raleway font-medium text-theme-text-primary mb-2">
                          Zone Logo
                        </label>
                        <div className="flex items-center space-x-4">
                          <div className="w-20 h-20 rounded-full bg-theme-bg-secondary border-2 border-theme-border-primary p-1">
                            {formData.logo ? (
                              <img
                                src={formData.logo}
                                alt="Zone Logo"
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full rounded-full bg-theme-bg-tertiary flex items-center justify-center">
                                <FaStore className="text-2xl text-theme-accent-primary" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <ImageUpload
                              currentImage={formData.logo}
                              onImageChange={(url) => handleInputChange('logo', url)}
                              label="Upload Logo"
                              accept="image/*"
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Cover Image Upload */}
                      <div>
                        <label className="block text-sm font-raleway font-medium text-theme-text-primary mb-2">
                          Cover Image
                        </label>
                        <div className="space-y-3">
                          {formData.coverImage && (
                            <div className="w-full h-20 rounded-lg overflow-hidden border-2 border-theme-border-primary">
                              <img
                                src={formData.coverImage}
                                alt="Cover"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <ImageUpload
                            currentImage={formData.coverImage}
                            onImageChange={(url) => handleInputChange('coverImage', url)}
                            label="Upload Cover Image"
                            accept="image/*"
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Basic Information */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-raleway font-medium text-theme-text-primary mb-2">
                        Zone Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg font-raleway focus:outline-none focus:ring-2 focus:ring-theme-accent-primary ${validationErrors.name
                          ? 'border-red-500 bg-red-50'
                          : 'border-theme-border-primary bg-theme-bg-secondary'
                          }`}
                        placeholder="Enter zone name"
                      />
                      {validationErrors.name && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-raleway font-medium text-theme-text-primary mb-2">
                        Description
                      </label>
                      <textarea
                        value={formData.description || ''}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        className="w-full px-4 py-3 border border-theme-border-primary bg-theme-bg-secondary rounded-lg font-raleway focus:outline-none focus:ring-2 focus:ring-theme-accent-primary resize-none"
                        placeholder="Enter zone description"
                        rows="3"
                      />
                    </div>
                  </div>

                  {/* Owner Information */}
                  <div>
                    <h3 className="text-lg font-fredoka text-theme-text-primary mb-4">Owner Information</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-raleway font-medium text-theme-text-primary mb-2">
                          Owner Name *
                        </label>
                        <input
                          type="text"
                          value={formData.ownerName || ''}
                          onChange={(e) => handleInputChange('ownerName', e.target.value)}
                          className={`w-full px-4 py-3 border rounded-lg font-raleway focus:outline-none focus:ring-2 focus:ring-theme-accent-primary ${validationErrors.ownerName
                            ? 'border-red-500 bg-red-50'
                            : 'border-theme-border-primary bg-theme-bg-secondary'
                            }`}
                          placeholder="Enter owner name"
                        />
                        {validationErrors.ownerName && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.ownerName}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-raleway font-medium text-theme-text-primary mb-2">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          value={formData.ownerPhone || ''}
                          onChange={(e) => handleInputChange('ownerPhone', e.target.value)}
                          className={`w-full px-4 py-3 border rounded-lg font-raleway focus:outline-none focus:ring-2 focus:ring-theme-accent-primary ${validationErrors.ownerPhone
                            ? 'border-red-500 bg-red-50'
                            : 'border-theme-border-primary bg-theme-bg-secondary'
                            }`}
                          placeholder="Enter phone number"
                        />
                        {validationErrors.ownerPhone && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.ownerPhone}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-raleway font-medium text-theme-text-primary mb-2">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          value={formData.ownerEmail || ''}
                          onChange={(e) => handleInputChange('ownerEmail', e.target.value)}
                          className={`w-full px-4 py-3 border rounded-lg font-raleway focus:outline-none focus:ring-2 focus:ring-theme-accent-primary ${validationErrors.ownerEmail
                            ? 'border-red-500 bg-red-50'
                            : 'border-theme-border-primary bg-theme-bg-secondary'
                            }`}
                          placeholder="Enter email address"
                        />
                        {validationErrors.ownerEmail && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.ownerEmail}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Location Information */}
                  <div>
                    <h3 className="text-lg font-fredoka text-theme-text-primary mb-4">Location Information</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                      <div className="lg:col-span-2">
                        <label className="block text-sm font-raleway font-medium text-theme-text-primary mb-2">
                          Address *
                        </label>
                        <textarea
                          value={formData.address || ''}
                          onChange={(e) => handleInputChange('address', e.target.value)}
                          className={`w-full px-4 py-3 border rounded-lg font-raleway focus:outline-none focus:ring-2 focus:ring-theme-accent-primary resize-none ${validationErrors.address
                            ? 'border-red-500 bg-red-50'
                            : 'border-theme-border-primary bg-theme-bg-secondary'
                            }`}
                          placeholder="Enter complete address"
                          rows="2"
                        />
                        {validationErrors.address && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.address}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-raleway font-medium text-theme-text-primary mb-2">
                          City
                        </label>
                        <input
                          type="text"
                          value={formData.city || ''}
                          onChange={(e) => handleInputChange('city', e.target.value)}
                          className="w-full px-4 py-3 border border-theme-border-primary bg-theme-bg-secondary rounded-lg font-raleway focus:outline-none focus:ring-2 focus:ring-theme-accent-primary"
                          placeholder="Enter city"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-raleway font-medium text-theme-text-primary mb-2">
                          State
                        </label>
                        <input
                          type="text"
                          value={formData.state || ''}
                          onChange={(e) => handleInputChange('state', e.target.value)}
                          className="w-full px-4 py-3 border border-theme-border-primary bg-theme-bg-secondary rounded-lg font-raleway focus:outline-none focus:ring-2 focus:ring-theme-accent-primary"
                          placeholder="Enter state"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-raleway font-medium text-theme-text-primary mb-2">
                          ZIP Code
                        </label>
                        <input
                          type="text"
                          value={formData.zipCode || ''}
                          onChange={(e) => handleInputChange('zipCode', e.target.value)}
                          className="w-full px-4 py-3 border border-theme-border-primary bg-theme-bg-secondary rounded-lg font-raleway focus:outline-none focus:ring-2 focus:ring-theme-accent-primary"
                          placeholder="Enter ZIP code"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Operating Hours */}
                  <div>
                    <h3 className="text-lg font-fredoka text-theme-text-primary mb-4">Operating Hours</h3>
                    <div className="space-y-4">
                      {Object.entries(formData.operatingHours || {}).map(([day, hours]) => (
                        <div key={day} className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-center">
                          <div className="font-raleway font-medium text-theme-text-primary capitalize">
                            {day}
                          </div>

                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={!hours.closed}
                              onChange={(e) => handleOperatingHoursChange(day, 'closed', !e.target.checked)}
                              className="w-4 h-4 text-theme-accent-primary"
                            />
                            <label className="text-sm font-raleway text-theme-text-secondary">Open</label>
                          </div>

                          {!hours.closed && (
                            <>
                              <div>
                                <label className="block text-xs font-raleway text-theme-text-secondary mb-1">
                                  Opening Time
                                </label>
                                <input
                                  type="time"
                                  value={hours.open || '09:00'}
                                  onChange={(e) => handleOperatingHoursChange(day, 'open', e.target.value)}
                                  className="w-full px-3 py-2 border border-theme-border-primary bg-theme-bg-secondary rounded-lg font-raleway focus:outline-none focus:ring-2 focus:ring-theme-accent-primary"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-raleway text-theme-text-secondary mb-1">
                                  Closing Time
                                </label>
                                <input
                                  type="time"
                                  value={hours.close || '22:00'}
                                  onChange={(e) => handleOperatingHoursChange(day, 'close', e.target.value)}
                                  className="w-full px-3 py-2 border border-theme-border-primary bg-theme-bg-secondary rounded-lg font-raleway focus:outline-none focus:ring-2 focus:ring-theme-accent-primary"
                                />
                              </div>
                            </>
                          )}

                          {hours.closed && (
                            <div className="lg:col-span-2 text-theme-text-secondary font-raleway italic">
                              Closed
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Social Media Information */}
                  <div>
                    <h3 className="text-lg font-fredoka text-theme-text-primary mb-4">Online Presence</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-raleway font-medium text-theme-text-primary mb-2">
                          Website URL
                        </label>
                        <input
                          type="url"
                          value={formData.socialMedia?.website || ''}
                          onChange={(e) => handleNestedInputChange('socialMedia', 'website', e.target.value)}
                          className="w-full px-4 py-3 border border-theme-border-primary bg-theme-bg-secondary rounded-lg font-raleway focus:outline-none focus:ring-2 focus:ring-theme-accent-primary"
                          placeholder="https://yourwebsite.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-raleway font-medium text-theme-text-primary mb-2">
                          Instagram Handle
                        </label>
                        <input
                          type="text"
                          value={formData.socialMedia?.instagram || ''}
                          onChange={(e) => handleNestedInputChange('socialMedia', 'instagram', e.target.value)}
                          className="w-full px-4 py-3 border border-theme-border-primary bg-theme-bg-secondary rounded-lg font-raleway focus:outline-none focus:ring-2 focus:ring-theme-accent-primary"
                          placeholder="@yourhandle"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-raleway font-medium text-theme-text-primary mb-2">
                          Facebook Page
                        </label>
                        <input
                          type="text"
                          value={formData.socialMedia?.facebook || ''}
                          onChange={(e) => handleNestedInputChange('socialMedia', 'facebook', e.target.value)}
                          className="w-full px-4 py-3 border border-theme-border-primary bg-theme-bg-secondary rounded-lg font-raleway focus:outline-none focus:ring-2 focus:ring-theme-accent-primary"
                          placeholder="YourPageName"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="border-t border-theme-border-primary p-6 bg-theme-bg-secondary rounded-b-2xl">
                  <div className="flex justify-end space-x-4">
                    <button
                      onClick={() => setShowEditModal(false)}
                      className="px-6 py-3 border border-theme-border-primary text-theme-text-secondary rounded-lg font-raleway hover:bg-theme-bg-tertiary transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-6 py-3 bg-theme-accent-primary text-white rounded-lg font-raleway hover:bg-theme-accent-hover transition-colors flex items-center space-x-2"
                    >
                      <FaSave />
                      <span>Save Changes (OTP Required)</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* OTP Verification Modal */}
        <ProfileOTPVerification
          isOpen={showOTPVerification}
          onClose={() => setShowOTPVerification(false)}
        onCancel={handleOTPCancel}
          onVerified={handleOTPVerified}
          phoneNumber={formData.ownerPhone || pendingChanges?.ownerPhone}
          purpose="profile_update"
          entityId={zoneId}
          title="Verify Profile Update"
          description="For security, please verify your phone number to save profile changes."
        />

        {/* Plan Restriction Modals */}
        {LimitReachedModal}
        {PaymentModal}
        {PaymentSuccessModal}
      </div>
    </ZoneAdminLayout>
  );
};

export default ZoneProfile;
