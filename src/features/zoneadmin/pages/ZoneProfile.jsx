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
  FaUsers,
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
  FaCrown,
  FaExclamationTriangle,
  FaShieldAlt
} from 'react-icons/fa';
import ZoneAdminLayout from './ZoneAdminLayout';
import ImageUpload from '../../../components/common/ImageUpload';
import DatabaseService from '../../../services/DatabaseService';
import EmailOTPVerification from '../../../components/common/EmailOTPVerification';
import ImageUploadService from '../../../services/ImageUploadService';
import { usePlanRestrictions } from '../../subscription/components/PlanRestrictions';

// Helper function to map frontend operating hours to backend format
const mapOperatingHoursToBackend = (frontendHours) => {
  if (!frontendHours) return {};
  
  const backendHours = {};
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  days.forEach(day => {
    const dayData = frontendHours[day];
    if (dayData) {
      backendHours[day] = {
        isOpen: !dayData.closed,
        openTime: dayData.open || '09:00',
        closeTime: dayData.close || '22:00'
      };
    }
  });
  
  return backendHours;
};

// Helper function to get user-friendly plan name
const getPlanDisplayName = (subscription) => {
  if (!subscription) return 'Free Plan';
  
  // Handle premium plans
  if (subscription.key === 'premium') return 'Premium Plan';
  
  // Map subscription keys to display names
  const planNameMap = {
    'free': 'Free Plan',
    'zone_free': 'Free Plan',
    'basic': 'Basic Plan', 
    'zone_basic': 'Basic Plan',
    'advanced': 'Advanced Plan',
    'zone_advanced': 'Advanced Plan',
    'premium': 'Premium Plan',
    'zone_premium': 'Premium Plan'
  };
  
  return planNameMap[subscription.key] || planNameMap[subscription.label] || 'Free Plan';
};

const extractLogoFromMedia = (media) => {
  if (!media || !media.images || !Array.isArray(media.images)) {
    return null;
  }
  
  const logoImage = media.images.find(img => img.imageType === 'logo');
  return logoImage ? logoImage.url : null;
};

// Helper function to map operating hours from backend format to frontend format
const mapOperatingHours = (backendHours) => {
  if (!backendHours) return null;
  
  const frontendHours = {};
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  days.forEach(day => {
    const dayData = backendHours[day];
    if (dayData) {
      frontendHours[day] = {
        open: dayData.openTime || '09:00',
        close: dayData.closeTime || '22:00',
        closed: !dayData.isOpen
      };
    } else {
      frontendHours[day] = { open: '09:00', close: '22:00', closed: false };
    }
  });
  
  return frontendHours;
};

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
    const loadZoneProfile = async () => {
      setLoading(true);
      try {
        console.log('ZoneProfile: Loading zone data from database for ID:', zoneId);
        const profile = await DatabaseService.getZone(zoneId);
        
        if (profile) {
          console.log('ZoneProfile: Successfully loaded zone data from database:', { id: profile._id || profile.id, name: profile.name });
          const zoneProfile = {
            id: profile._id || profile.id,
            name: profile.name || 'New Zone',
            description: profile.description || 'Please update your zone information',
            media: profile.media || { images: [] },
            logo: extractLogoFromMedia(profile.media) || profile.logo || null,
            ownerName: profile.adminId?.profile?.name || profile.ownerName || 'Zone Owner',
            ownerPhone: profile.contactInfo?.phone || profile.adminId?.phone || profile.ownerPhone || '+91 9876543210',
            ownerEmail: profile.contactInfo?.email || profile.adminId?.email || profile.ownerEmail || 'owner@example.com',
            address: profile.location || profile.address || 'Please update your address',
            city: profile.city || 'City',
            state: profile.state || 'State', 
            zipCode: profile.zipCode || '000000',
            totalVendors: profile.stats?.totalShops || profile.shopsCount || profile.totalVendors || profile.vendorCount || 0,
            totalTables: profile.tables || profile.totalTables || profile.stats?.totalTables || 0,
            maxVendors: profile.maxVendors || profile.settings?.maxVendors || null,
            maxTables: profile.maxTables || profile.settings?.maxTables || null,
            rating: profile.rating || 0,
            totalRevenue: profile.stats?.totalRevenue || profile.totalRevenue || 0,
            joinDate: profile.createdAt ? new Date(profile.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            status: profile.active ? 'active' : 'inactive',
            operatingHours: mapOperatingHours(profile.settings?.operatingHours) || {
              monday: { open: '09:00', close: '22:00', closed: false },
              tuesday: { open: '09:00', close: '22:00', closed: false },
              wednesday: { open: '09:00', close: '22:00', closed: false },
              thursday: { open: '09:00', close: '22:00', closed: false },
              friday: { open: '09:00', close: '22:00', closed: false },
              saturday: { open: '09:00', close: '22:00', closed: false },
              sunday: { open: '09:00', close: '22:00', closed: false }
            },
            socialMedia: profile.socialMedia || {
              website: '',
              instagram: '',
              facebook: ''
            },
            subscription: profile.subscriptionId || null
          };
          setZoneData(zoneProfile);
          setFormData(zoneProfile);
        } else {
          console.warn('ZoneProfile: No zone data found for ID:', zoneId);
          const fallbackProfile = {
            id: zoneId,
            name: 'New Zone',
            description: 'Please update your zone information',
            media: { images: [] },
            ownerName: 'Zone Owner',
            ownerPhone: '',
            ownerEmail: '',
            address: 'Please update your address',
            city: '',
            state: '',
            zipCode: '',
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
          setZoneData(fallbackProfile);
          setFormData(fallbackProfile);
        }
      } catch (error) {
        console.error('ZoneProfile: Error loading zone profile from database:', error);
        setSaveStatus({ type: 'error', message: 'Failed to load zone profile from database' });
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

  const handleInputChange = (field, value, file = null) => {
    setFormData(prev => ({ 
      ...prev, 
      [field]: value,
      ...(file && { [`${field}File`]: file })
    }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSave = () => {
    if (!validateForm()) {
      setSaveStatus({ type: 'error', message: 'Please fix the validation errors' });
      return;
    }

    if (!formData.ownerPhone || formData.ownerPhone.trim() === '') {
      setSaveStatus({ type: 'error', message: 'Phone number is required for profile verification' });
      return;
    }

    console.log('Profile changes detected, triggering OTP verification');
    setPendingChanges(formData);
    setShowOTPVerification(true);
  };

  const saveProfile = async (profileData) => {
    try {
      const sanitizedData = {
        name: profileData.name,
        description: profileData.description,
        location: profileData.address,
        contactInfo: {
          phone: profileData.ownerPhone,
          email: profileData.ownerEmail
        },
        ownerName: profileData.ownerName,
        ownerEmail: profileData.ownerEmail,
        ownerPhone: profileData.ownerPhone,
        address: profileData.address,
        city: profileData.city,
        state: profileData.state,
        zipCode: profileData.zipCode,
        settings: {
          operatingHours: mapOperatingHoursToBackend(profileData.operatingHours),
          theme: {
            primaryColor: '#2563eb',
            secondaryColor: '#64748b',
            logoUrl: null
          }
        },
        socialMedia: profileData.socialMedia,
        media: profileData.media || { images: [] }
      };
      
      if (formData.logoFile && formData.logoFile instanceof File) {
        const imageResult = await ImageUploadService.uploadZoneImage(formData.logoFile, 'zone', zoneId);
        
        sanitizedData.media.images = sanitizedData.media.images || [];
        sanitizedData.media.images = sanitizedData.media.images.filter(img => img.imageType !== 'logo');
        sanitizedData.media.images.push({
          url: imageResult.url,
          publicId: imageResult.publicId,
          imageType: 'logo',
          caption: 'Zone Logo',
          altText: `${profileData.name} Logo`,
          isPrimary: true,
          uploadedAt: new Date()
        });
      }
      
      const response = await DatabaseService.saveData(`/zones/${zoneId}`, sanitizedData, 'PUT');
      
      if (response) {
        const updatedProfile = await DatabaseService.getZone(zoneId);
        if (updatedProfile) {
          const mappedProfile = {
            ...profileData,
            media: updatedProfile.media || { images: [] },
            logo: extractLogoFromMedia(updatedProfile.media) || updatedProfile.logo || null
          };
          setZoneData(mappedProfile);
          setFormData(mappedProfile);
        }
        setShowEditModal(false);
        setSaveStatus({ type: 'success', message: 'Zone profile updated successfully with email OTP verification!' });
        setTimeout(() => setSaveStatus(null), 5000);
      }
    } catch (error) {
      console.error('ZoneProfile: Error saving zone profile to database:', error);
      setSaveStatus({ type: 'error', message: error.message || 'Failed to save zone profile to database' });
      setTimeout(() => setSaveStatus(null), 5000);
    }
  };

  const handleOTPVerified = () => {
    if (pendingChanges) {
      saveProfile(pendingChanges);
      setPendingChanges(null);
    }
    setShowOTPVerification(false);
  };

  const handleOTPCancel = () => {
    setShowOTPVerification(false);
    setPendingChanges(null);
    setSaveStatus({ type: 'error', message: 'Profile update cancelled' });
    setTimeout(() => setSaveStatus(null), 3000);
  };

  if (loading) {
    return (
      <ZoneAdminLayout>
        <div className="min-h-screen bg-theme-bg-primary flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-theme-accent-primary mx-auto mb-4"></div>
            <div className="text-lg font-raleway text-theme-text-primary">Loading Zone Profile...</div>
          </div>
        </div>
      </ZoneAdminLayout>
    );
  }

  return (
    <ZoneAdminLayout>
      <div className="min-h-screen bg-theme-bg-primary">
        
        {/* Save Status Notifications */}
        <AnimatePresence>
          {saveStatus && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className={`fixed top-24 right-8 z-50 px-6 py-4 rounded-xl shadow-2xl border flex items-center gap-3 backdrop-blur-md ${
                saveStatus.type === 'success'
                  ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
              }`}
            >
              {saveStatus.type === 'success' ? <FaCheckCircle className="text-xl" /> : <FaExclamationTriangle className="text-xl" />}
              <span className="font-raleway font-semibold">{saveStatus.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ambient Top Background */}
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-theme-accent-primary/5 to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
          
          {/* Header Title */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl sm:text-4xl font-fredoka text-theme-text-primary mb-2">Zone Profile</h1>
            <p className="text-theme-text-secondary font-raleway">Manage your zone's public identity and core details</p>
          </motion.div>

         

          {/* Main Zone Header Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-theme-bg-secondary rounded-3xl p-8 mb-8 border border-theme-border-primary shadow-sm relative overflow-hidden"
          >
            {/* Subtle glow behind logo */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-theme-accent-primary/10 rounded-full blur-[80px] pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
              {/* Zone Logo */}
              <div className="flex-shrink-0">
                <div className="w-32 h-32 rounded-full bg-theme-bg-primary border border-theme-border-primary shadow-lg p-2 flex items-center justify-center overflow-hidden relative group">
                  {zoneData.logo ? (
                    <img
                      src={zoneData.logo}
                      alt="Zone Logo"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <FaStore className="text-4xl text-theme-text-tertiary" />
                  )}
                </div>
              </div>

              {/* Zone Info */}
              <div className="flex-1 text-center md:text-left flex flex-col justify-center min-h-[8rem]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                  <h2 className="text-3xl font-fredoka text-theme-text-primary">
                    {zoneData.name}
                  </h2>
                  
                  {/* Status Badge */}
                  <div className={`self-center md:self-auto px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${
                    zoneData.status === 'active'
                      ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                      : 'bg-red-500/10 text-red-600 border border-red-500/20'
                  }`}>
                    {zoneData.status === 'active' ? 'Active' : 'Inactive'}
                  </div>
                </div>

                <p className="text-theme-text-secondary font-raleway mb-4 max-w-2xl leading-relaxed">
                  {zoneData.description}
                </p>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-3 mt-auto">
                  <div className="flex items-center space-x-2 text-theme-text-secondary">
                    <FaMapMarkerAlt className="text-theme-accent-primary shrink-0" />
                    <span className="font-raleway text-sm">{zoneData.address || 'Address not provided'}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-theme-text-secondary">
                    <FaPhone className="text-theme-accent-primary shrink-0" />
                    <span className="font-raleway text-sm">{zoneData.ownerPhone}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-theme-text-secondary">
                    <FaEnvelope className="text-theme-accent-primary shrink-0" />
                    <span className="font-raleway text-sm">{zoneData.ownerEmail}</span>
                  </div>
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
              className="bg-theme-bg-secondary border border-theme-border-primary rounded-3xl p-8 shadow-sm"
            >
              <h3 className="text-lg font-fredoka text-theme-text-primary mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-theme-accent-primary/10 flex items-center justify-center text-theme-accent-primary">
                  <FaUser size={18} />
                </div>
                Owner Details
              </h3>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-theme-bg-primary border border-theme-border-primary flex items-center justify-center text-theme-text-tertiary">
                    <FaUser size={14} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-1">Name</div>
                    <div className="font-raleway text-theme-text-primary">{zoneData.ownerName}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-theme-bg-primary border border-theme-border-primary flex items-center justify-center text-theme-text-tertiary">
                    <FaPhone size={14} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-1">Phone</div>
                    <div className="font-raleway text-theme-text-primary">{zoneData.ownerPhone}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-theme-bg-primary border border-theme-border-primary flex items-center justify-center text-theme-text-tertiary">
                    <FaEnvelope size={14} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-1">Email</div>
                    <div className="font-raleway text-theme-text-primary">{zoneData.ownerEmail}</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Location Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-theme-bg-secondary border border-theme-border-primary rounded-3xl p-8 shadow-sm"
            >
              <h3 className="text-lg font-fredoka text-theme-text-primary mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-theme-accent-primary/10 flex items-center justify-center text-theme-accent-primary">
                  <FaMapMarkerAlt size={18} />
                </div>
                Location Details
              </h3>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-theme-bg-primary border border-theme-border-primary flex items-center justify-center text-theme-text-tertiary shrink-0">
                    <FaMapMarkerAlt size={14} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-1">Address</div>
                    <div className="font-raleway text-theme-text-primary leading-relaxed">{zoneData.address}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-theme-bg-primary border border-theme-border-primary flex items-center justify-center text-theme-text-tertiary">
                    <FaCity size={14} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-1">City</div>
                    <div className="font-raleway text-theme-text-primary">{zoneData.city || '-'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-theme-bg-primary border border-theme-border-primary flex items-center justify-center text-theme-text-tertiary shrink-0">
                      <FaBuilding size={14} />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-1">State</div>
                      <div className="font-raleway text-theme-text-primary truncate">{zoneData.state || '-'}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-1">Zip Code</div>
                    <div className="font-raleway text-theme-text-primary">{zoneData.zipCode || '-'}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Zone Subscription Information */}
          {subscription && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-8"
            >
              {subscription.key === 'premium' ? (
                <div className="relative overflow-hidden bg-gradient-to-br from-theme-accent-primary to-purple-600 rounded-3xl p-8 sm:p-10 shadow-lg border border-white/10">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl" />
                  
                  <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner border border-white/20 shrink-0">
                        <FaCrown className="text-white text-3xl" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-fredoka text-white mb-1">Premium Plan Active</h3>
                        <p className="text-white/80 font-raleway text-sm">
                          You have access to all premium features and enhanced limits.
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3 rounded-xl">
                      <div className="text-xs text-white/70 font-bold uppercase tracking-widest mb-1 text-center md:text-left">Status</div>
                      <div className="font-fredoka text-white text-xl flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-400" /> Active
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-theme-bg-secondary to-theme-bg-primary border border-theme-border-primary rounded-3xl p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-theme-accent-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                      <FaShieldAlt className="text-theme-accent-primary text-2xl" />
                    </div>
                    <div>
                      <h3 className="text-xl font-fredoka text-theme-text-primary mb-1">Current Plan: {getPlanDisplayName(subscription)}</h3>
                      <p className="text-theme-text-secondary font-raleway text-sm">
                        Upgrade to unlock more vendors, tables, and advanced management features.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => window.location.href = `/zone/${zoneId}/upgrade`}
                    className="bg-theme-accent-primary hover:bg-theme-accent-secondary text-white px-6 py-3 rounded-xl shadow-lg shadow-theme-accent-primary/25 transition-all font-raleway font-bold flex items-center gap-2 whitespace-nowrap"
                  >
                    <FaCrown />
                    <span>Upgrade Plan</span>
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Fixed Edit Button (Floating Action Button) */}
        <div className="fixed bottom-8 right-8 z-40">
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowEditModal(true)}
            className="bg-theme-accent-primary text-white p-4 rounded-full shadow-lg shadow-theme-accent-primary/40 hover:bg-theme-accent-secondary transition-colors"
          >
            <FaEdit className="text-xl" />
          </motion.button>
        </div>

        {/* Edit Modal */}
        <AnimatePresence>
          {showEditModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setShowEditModal(false)}
              />
              
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative bg-theme-bg-primary rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-theme-border-primary overflow-hidden"
              >
                {/* Modal Header */}
                <div className="bg-theme-bg-secondary/80 backdrop-blur-md border-b border-theme-border-primary p-6 flex items-center justify-between shrink-0">
                  <div>
                    <h2 className="text-2xl font-fredoka text-theme-text-primary">Edit Zone Profile</h2>
                    <p className="text-xs text-theme-text-tertiary font-raleway mt-1">Update your zone's public information</p>
                  </div>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-theme-text-tertiary hover:bg-theme-bg-hover hover:text-theme-text-primary transition-colors"
                  >
                    <FaTimes className="text-lg" />
                  </button>
                </div>

                {/* Modal Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 scrollbar-thin scrollbar-thumb-theme-border-primary">
                  <div className="space-y-8">
                    
                    {/* Zone Logo Section */}
                    <div>
                      <h3 className="text-sm font-bold text-theme-text-secondary uppercase tracking-widest mb-4">Zone Logo</h3>
                      <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-2xl bg-theme-bg-secondary border border-theme-border-primary shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                          {formData.logo ? (
                            <img src={formData.logo} alt="Zone Logo" className="w-full h-full object-cover" />
                          ) : (
                            <FaStore className="text-3xl text-theme-text-tertiary" />
                          )}
                        </div>
                        <div className="flex-1">
                          <ImageUpload
                            currentImage={formData.logo}
                            onImageChange={(url, file) => handleInputChange('logo', url, file)}
                            label="Upload Logo"
                            accept="image/*"
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Basic Information */}
                    <div>
                      <h3 className="text-sm font-bold text-theme-text-secondary uppercase tracking-widest mb-4">Basic Details</h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-2">Zone Name *</label>
                          <input
                            type="text"
                            value={formData.name || ''}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            className={`w-full px-4 py-3 rounded-xl font-raleway text-theme-text-primary border bg-theme-bg-secondary focus:outline-none focus:ring-2 focus:ring-theme-accent-primary/50 transition-all ${
                              validationErrors.name ? 'border-status-error' : 'border-theme-border-primary'
                            }`}
                            placeholder="Enter zone name"
                          />
                          {validationErrors.name && <p className="text-status-error text-xs mt-1">{validationErrors.name}</p>}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-2">Description</label>
                          <textarea
                            value={formData.description || ''}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            className="w-full px-4 py-3 rounded-xl font-raleway text-theme-text-primary border border-theme-border-primary bg-theme-bg-secondary focus:outline-none focus:ring-2 focus:ring-theme-accent-primary/50 transition-all resize-none"
                            placeholder="Enter zone description"
                            rows="1"
                          />
                        </div>
                      </div>
                    </div>

                    <hr className="border-theme-border-primary" />

                    {/* Owner Information */}
                    <div>
                      <h3 className="text-sm font-bold text-theme-text-secondary uppercase tracking-widest mb-4">Owner Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-2">Owner Name *</label>
                          <input
                            type="text"
                            value={formData.ownerName || ''}
                            onChange={(e) => handleInputChange('ownerName', e.target.value)}
                            className={`w-full px-4 py-3 rounded-xl font-raleway text-theme-text-primary border bg-theme-bg-secondary focus:outline-none focus:ring-2 focus:ring-theme-accent-primary/50 transition-all ${
                              validationErrors.ownerName ? 'border-status-error' : 'border-theme-border-primary'
                            }`}
                            placeholder="Owner name"
                          />
                          {validationErrors.ownerName && <p className="text-status-error text-xs mt-1">{validationErrors.ownerName}</p>}
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-2">Phone Number *</label>
                          <input
                            type="tel"
                            value={formData.ownerPhone || ''}
                            onChange={(e) => handleInputChange('ownerPhone', e.target.value)}
                            className={`w-full px-4 py-3 rounded-xl font-raleway text-theme-text-primary border bg-theme-bg-secondary focus:outline-none focus:ring-2 focus:ring-theme-accent-primary/50 transition-all ${
                              validationErrors.ownerPhone ? 'border-status-error' : 'border-theme-border-primary'
                            }`}
                            placeholder="Phone number"
                          />
                          {validationErrors.ownerPhone && <p className="text-status-error text-xs mt-1">{validationErrors.ownerPhone}</p>}
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-2">Email Address *</label>
                          <input
                            type="email"
                            value={formData.ownerEmail || ''}
                            onChange={(e) => handleInputChange('ownerEmail', e.target.value)}
                            className={`w-full px-4 py-3 rounded-xl font-raleway text-theme-text-primary border bg-theme-bg-secondary focus:outline-none focus:ring-2 focus:ring-theme-accent-primary/50 transition-all ${
                              validationErrors.ownerEmail ? 'border-status-error' : 'border-theme-border-primary'
                            }`}
                            placeholder="Email address"
                          />
                          {validationErrors.ownerEmail && <p className="text-status-error text-xs mt-1">{validationErrors.ownerEmail}</p>}
                        </div>
                      </div>
                    </div>

                    <hr className="border-theme-border-primary" />

                    {/* Location Information */}
                    <div>
                      <h3 className="text-sm font-bold text-theme-text-secondary uppercase tracking-widest mb-4">Location Details</h3>
                      <div className="space-y-6">
                        <div>
                          <label className="block text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-2">Complete Address *</label>
                          <textarea
                            value={formData.address || ''}
                            onChange={(e) => handleInputChange('address', e.target.value)}
                            className={`w-full px-4 py-3 rounded-xl font-raleway text-theme-text-primary border bg-theme-bg-secondary focus:outline-none focus:ring-2 focus:ring-theme-accent-primary/50 transition-all resize-none ${
                              validationErrors.address ? 'border-status-error' : 'border-theme-border-primary'
                            }`}
                            placeholder="Enter complete address"
                            rows="2"
                          />
                          {validationErrors.address && <p className="text-status-error text-xs mt-1">{validationErrors.address}</p>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <label className="block text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-2">City</label>
                            <input
                              type="text"
                              value={formData.city || ''}
                              onChange={(e) => handleInputChange('city', e.target.value)}
                              className="w-full px-4 py-3 rounded-xl font-raleway text-theme-text-primary border border-theme-border-primary bg-theme-bg-secondary focus:outline-none focus:ring-2 focus:ring-theme-accent-primary/50 transition-all"
                              placeholder="City"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-2">State</label>
                            <input
                              type="text"
                              value={formData.state || ''}
                              onChange={(e) => handleInputChange('state', e.target.value)}
                              className="w-full px-4 py-3 rounded-xl font-raleway text-theme-text-primary border border-theme-border-primary bg-theme-bg-secondary focus:outline-none focus:ring-2 focus:ring-theme-accent-primary/50 transition-all"
                              placeholder="State"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-2">Zip Code</label>
                            <input
                              type="text"
                              value={formData.zipCode || ''}
                              onChange={(e) => handleInputChange('zipCode', e.target.value)}
                              className="w-full px-4 py-3 rounded-xl font-raleway text-theme-text-primary border border-theme-border-primary bg-theme-bg-secondary focus:outline-none focus:ring-2 focus:ring-theme-accent-primary/50 transition-all"
                              placeholder="Zip Code"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Modal Footer */}
                <div className="border-t border-theme-border-primary p-6 bg-theme-bg-secondary/80 backdrop-blur-md shrink-0 flex justify-end gap-4">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-6 py-3 border border-theme-border-primary text-theme-text-secondary rounded-xl font-raleway font-bold hover:bg-theme-bg-hover hover:text-theme-text-primary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-6 py-3 bg-theme-accent-primary text-white rounded-xl font-raleway font-bold hover:bg-theme-accent-secondary transition-colors flex items-center gap-2 shadow-lg shadow-theme-accent-primary/20"
                  >
                    <FaSave />
                    <span>Save Changes (OTP Required)</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* OTP Verification Modal */}
        <EmailOTPVerification
          isOpen={showOTPVerification}
          onClose={() => setShowOTPVerification(false)}
          onCancel={handleOTPCancel}
          onVerified={handleOTPVerified}
          email={formData.ownerEmail || pendingChanges?.ownerEmail}
          purpose="profile_update"
          entityId={zoneId}
          title="Verify Profile Update"
          description="For security, please verify your email address to save profile changes."
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