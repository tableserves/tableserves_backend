import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaStore,
  FaEdit,
  FaSave,
  FaTimes,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle
} from 'react-icons/fa';
import ZoneShopLayout from './ZoneShopLayout';
import ImageUpload from '../../../components/common/ImageUpload';
import EmailOTPVerification from '../../../components/common/EmailOTPVerification';
import DatabaseService from '../../../services/DatabaseService';
import ImageUploadService from '../../../services/ImageUploadService';
import { useParams } from 'react-router-dom';

const ZoneShopProfile = () => {
  const { zoneId, shopId } = useParams();
  const [shopData, setShopData] = useState({
    name: '',
    description: '',
    cuisine: '',
    phone: '',
    email: '',
    address: '',
    openingHours: '',
    socialMedia: {
      website: '',
      instagram: '',
      facebook: ''
    },
    paymentMethods: ['Cash', 'UPI', 'Card', 'Net Banking'],
    rating: 0,
    totalReviews: 0,
    status: 'active',
    media: { images: [] },
    zone: { name: 'Zone', id: '' }
  });
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // Get real vendor data from localStorage (zone admin created data)
  const getVendorData = () => {
    try {
      const vendors = JSON.parse(localStorage.getItem(`tableserve_zone_${zoneId}_vendors`) || '[]');
      return vendors.find(v => v.id === shopId) || null;
    } catch (error) {
      console.error('Error loading vendor data:', error);
      return null;
    }
  };

  // Get vendor profile data (vendor editable fields)
  const getVendorProfile = () => {
    try {
      return JSON.parse(localStorage.getItem(`tableserve_zone_${zoneId}_shop_${shopId}_profile`) || '{}');
    } catch (error) {
      console.error('Error loading vendor profile:', error);
      return {};
    }
  };

  // Save vendor profile data
  const saveVendorProfile = (profileData) => {
    try {
      localStorage.setItem(`tableserve_zone_${zoneId}_shop_${shopId}_profile`, JSON.stringify(profileData));
      return true;
    } catch (error) {
      console.error('Error saving vendor profile:', error);
      return false;
    }
  };

  // Helper function to get shop logo from media.images array
  const getShopLogo = (mediaData = null) => {
    const media = mediaData || shopData?.media;
    const logoImage = media?.images?.find(img => img.imageType === 'logo');
    if (logoImage) {
      return logoImage.url;
    }
    return null;
  };

  useEffect(() => {
    const loadShopData = async () => {
      setLoading(true);
      try {
        console.log('ZoneShopProfile: Loading shop data from database for shop ID:', shopId, 'zone ID:', zoneId);
        
        // Use DatabaseService to get shop data from real-time database
        const response = await DatabaseService.getData(`/shops/zones/${zoneId}/shop/${shopId}`);
        
        if (response && response.shop) {
          const shopData = response.shop;
          
          // Map backend data structure to frontend structure
          const mappedData = {
            id: shopData._id || shopData.id,
            name: shopData.name || '',
            description: shopData.description || '',
            cuisine: shopData.category || shopData.cuisine || '',
            ownerName: shopData.ownerId?.profile?.name || shopData.ownerName || '',
            ownerPhone: shopData.ownerId?.phone || shopData.contactInfo?.phone || shopData.ownerPhone || '',
            ownerEmail: shopData.ownerId?.email || shopData.contactInfo?.email || shopData.ownerEmail || '',
            phone: shopData.contactInfo?.phone || '',
            email: shopData.contactInfo?.email || '',
            status: shopData.status || 'active',
            createdAt: shopData.createdAt || '',
            media: shopData.media || { images: [] },
            address: shopData.location?.address || shopData.address || '',
            openingHours: shopData.operatingHours || shopData.openingHours || '',
            socialMedia: shopData.socialMedia || {
              website: '',
              instagram: '',
              facebook: ''
            },
            paymentMethods: shopData.paymentMethods || ['Cash', 'UPI', 'Card', 'Net Banking'],
            rating: typeof shopData.rating === 'object' && shopData.rating !== null 
              ? (shopData.rating.average || 0) 
              : (Number(shopData.rating) || 0),
            totalReviews: typeof shopData.rating === 'object' && shopData.rating !== null 
              ? (shopData.rating.count || shopData.rating.totalReviews || 0) 
              : (shopData.totalReviews || 0),
            zone: {
              name: shopData.zoneId?.name || 'Zone',
              id: shopData.zoneId?._id || shopData.zoneId || zoneId
            }
          };
          
          setShopData(mappedData);
          setFormData({
            ...mappedData,
            rating: Number(mappedData.rating) || 0,
            totalReviews: Number(mappedData.totalReviews) || 0,
            logo: getShopLogo(mappedData.media) || null
          });
        } else {
          setSaveStatus({ type: 'error', message: 'Failed to load shop data from database' });
        }
      } catch (error) {
        console.error('ZoneShopProfile: Error loading shop data from database:', error);
        setSaveStatus({ type: 'error', message: 'Failed to load shop data from database' });
      } finally {
        setLoading(false);
      }
    };

    if (shopId && zoneId) {
      loadShopData();
    }
  }, [shopId, zoneId]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name?.trim()) errors.name = 'Shop name is required';
    if (!formData.phone?.trim()) errors.phone = 'Phone number is required';
    if (!formData.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }
    
    setValidationErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      setSaveStatus({ type: 'error', message: 'Please fix the validation errors' });
      setTimeout(() => setSaveStatus(null), 3000);
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    // Close the edit modal first
    setShowEditModal(false);
    
    // Then trigger OTP verification
    setPendingChanges(formData);
    setShowOTPVerification(true);
  };

  const handleOTPVerified = async () => {
    if (!pendingChanges) return;
    
    setSaving(true);
    try {
      // Prepare data for backend API
      const updateData = {
        name: pendingChanges.name || '',
        description: pendingChanges.description || '',
        cuisine: pendingChanges.cuisine || ''
      };
      
      const contactInfo = {};
      if (pendingChanges.phone && pendingChanges.phone.trim() !== '') contactInfo.phone = pendingChanges.phone.trim();
      if (pendingChanges.email && pendingChanges.email.trim() !== '') contactInfo.email = pendingChanges.email.trim();
      if (Object.keys(contactInfo).length > 0) updateData.contactInfo = contactInfo;
      
      if (pendingChanges.address && pendingChanges.address.trim() !== '') {
        updateData.location = { address: pendingChanges.address.trim() };
      }
      
      // Handle image upload if there's a new logo
      if (pendingChanges.logo && pendingChanges.logo.file && pendingChanges.logo.file instanceof File) {
        try {
          const imageUrl = await ImageUploadService.uploadImage(pendingChanges.logo.file, {
            folder: `shops/${shopId}`,
            transformation: { width: 400, height: 400, crop: 'fill', quality: 'auto' }
          });
          
          if (!updateData.media) updateData.media = { images: [] };
          updateData.media.images = updateData.media.images || [];
          updateData.media.images = updateData.media.images.filter(img => img.imageType !== 'logo');
          updateData.media.images.push({
            url: imageUrl.url || imageUrl,
            imageType: 'logo',
            publicId: imageUrl.publicId
          });
        } catch (uploadError) {
          throw new Error(`Logo upload failed: ${uploadError.message}`);
        }
      } else if (pendingChanges.media && pendingChanges.media.images && pendingChanges.media.images.length > 0) {
        updateData.media = pendingChanges.media;
      }
      
      const response = await DatabaseService.saveData(`/shops/zones/${zoneId}/shop/${shopId}`, updateData, 'PUT');
      
      if (response) {
        const updatedShopData = {
          ...shopData,
          ...pendingChanges,
          media: updateData.media || shopData.media
        };
        setShopData(updatedShopData);
        setFormData(updatedShopData);
        setShowEditModal(false);
        setSaveStatus({ type: 'success', message: 'Shop profile updated successfully!' });
      }
    } catch (error) {
      let errorMessage = 'Failed to save shop profile to database';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      setSaveStatus({ type: 'error', message: errorMessage });
    } finally {
      setSaving(false);
      setPendingChanges(null);
      setShowOTPVerification(false);
      setTimeout(() => setSaveStatus(null), 5000);
    }
  };

  const handleOTPCancel = () => {
    setShowOTPVerification(false);
    setPendingChanges(null);
    setSaveStatus({ type: 'error', message: 'Profile update cancelled' });
    setTimeout(() => setSaveStatus(null), 3000);
  };

  if (loading) {
    return (
      <ZoneShopLayout>
        <div className="min-h-screen bg-theme-bg-primary flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-theme-accent-primary mx-auto mb-4"></div>
            <div className="text-lg font-raleway text-theme-text-primary">Loading Shop Profile...</div>
          </div>
        </div>
      </ZoneShopLayout>
    );
  }

  return (
    <ZoneShopLayout>
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
            <h1 className="text-3xl sm:text-4xl font-fredoka text-theme-text-primary mb-2">Shop Profile</h1>
            <p className="text-theme-text-secondary font-raleway">Manage your shop's public identity and core details</p>
          </motion.div>

          {/* Main Shop Header Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-theme-bg-secondary rounded-3xl p-8 mb-8 border border-theme-border-primary shadow-sm relative overflow-hidden"
          >
            {/* Subtle glow behind logo */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-theme-accent-primary/10 rounded-full blur-[80px] pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
              {/* Shop Logo */}
              <div className="flex-shrink-0">
                <div className="w-32 h-32 rounded-full bg-theme-bg-primary border border-theme-border-primary shadow-lg p-2 flex items-center justify-center overflow-hidden relative group">
                  {getShopLogo() ? (
                    <img
                      src={getShopLogo()}
                      alt="Shop Logo"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <FaStore className="text-4xl text-theme-text-tertiary" />
                  )}
                </div>
              </div>

              {/* Shop Info */}
              <div className="flex-1 text-center md:text-left flex flex-col justify-center min-h-[8rem]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                  <h2 className="text-3xl font-fredoka text-theme-text-primary">
                    {shopData.name || 'Unnamed Shop'}
                  </h2>
                  
                  {/* Status Badge */}
                  <div className={`self-center md:self-auto px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${
                    shopData.status === 'active'
                      ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                      : 'bg-red-500/10 text-red-600 border border-red-500/20'
                  }`}>
                    {shopData.status === 'active' ? 'Active' : 'Inactive'}
                  </div>
                </div>

                <p className="text-theme-text-secondary font-raleway mb-4 max-w-2xl leading-relaxed">
                  {shopData.description || 'No description provided.'}
                </p>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-3 mt-auto">
                  <div className="flex items-center space-x-2 text-theme-text-secondary">
                    <FaMapMarkerAlt className="text-theme-accent-primary shrink-0" />
                    <span className="font-raleway text-sm">{shopData.address || 'Address not provided'}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-theme-text-secondary">
                    <FaPhone className="text-theme-accent-primary shrink-0" />
                    <span className="font-raleway text-sm">{shopData.phone || 'Phone not provided'}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-theme-text-secondary">
                    <FaEnvelope className="text-theme-accent-primary shrink-0" />
                    <span className="font-raleway text-sm">{shopData.email || 'Email not provided'}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Detailed Information Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            
            {/* Basic Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-theme-bg-secondary border border-theme-border-primary rounded-3xl p-8 shadow-sm"
            >
              <h3 className="text-lg font-fredoka text-theme-text-primary mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-theme-accent-primary/10 flex items-center justify-center text-theme-accent-primary">
                  <FaInfoCircle size={18} />
                </div>
                Basic Details
              </h3>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-theme-bg-primary border border-theme-border-primary flex items-center justify-center text-theme-text-tertiary">
                    <FaStore size={14} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-1">Shop Name</div>
                    <div className="font-raleway text-theme-text-primary">{shopData.name || 'Not provided'}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-theme-bg-primary border border-theme-border-primary flex items-center justify-center text-theme-text-tertiary">
                    <span className="font-bold text-xs">C</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-1">Cuisine Type</div>
                    <div className="font-raleway text-theme-text-primary">{shopData.cuisine || 'Not provided'}</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-theme-bg-secondary border border-theme-border-primary rounded-3xl p-8 shadow-sm"
            >
              <h3 className="text-lg font-fredoka text-theme-text-primary mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-theme-accent-primary/10 flex items-center justify-center text-theme-accent-primary">
                  <FaPhone size={18} />
                </div>
                Contact Details
              </h3>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-theme-bg-primary border border-theme-border-primary flex items-center justify-center text-theme-text-tertiary shrink-0">
                    <FaMapMarkerAlt size={14} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-1">Address</div>
                    <div className="font-raleway text-theme-text-primary leading-relaxed">{shopData.address || 'Not provided'}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-theme-bg-primary border border-theme-border-primary flex items-center justify-center text-theme-text-tertiary">
                    <FaPhone size={14} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-1">Phone</div>
                    <div className="font-raleway text-theme-text-primary">{shopData.phone || 'Not provided'}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-theme-bg-primary border border-theme-border-primary flex items-center justify-center text-theme-text-tertiary">
                    <FaEnvelope size={14} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-1">Email</div>
                    <div className="font-raleway text-theme-text-primary">{shopData.email || 'Not provided'}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:pl-72">
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
                    <h2 className="text-2xl font-fredoka text-theme-text-primary">Edit Shop Profile</h2>
                    <p className="text-xs text-theme-text-tertiary font-raleway mt-1">Update your shop's public information</p>
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
                    
                    {/* Shop Logo Section */}
                    <div>
                      <h3 className="text-sm font-bold text-theme-text-secondary uppercase tracking-widest mb-4">Shop Logo</h3>
                      <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-2xl bg-theme-bg-secondary border border-theme-border-primary shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                          {formData.logo?.preview || typeof formData.logo === 'string' ? (
                            <img src={formData.logo?.preview || formData.logo} alt="Shop Logo" className="w-full h-full object-cover" />
                          ) : (
                            <FaStore className="text-3xl text-theme-text-tertiary" />
                          )}
                        </div>
                        <div className="flex-1">
                          <ImageUpload
                            currentImage={formData.logo?.preview || (typeof formData.logo === 'string' ? formData.logo : null)}
                            onImageChange={(imageUrl, file) => {
                              handleInputChange('logo', { preview: imageUrl, file: file });
                            }}
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
                          <label className="block text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-2">Shop Name *</label>
                          <input
                            type="text"
                            value={formData.name || ''}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            className={`w-full px-4 py-3 rounded-xl font-raleway text-theme-text-primary border bg-theme-bg-secondary focus:outline-none focus:ring-2 focus:ring-theme-accent-primary/50 transition-all ${
                              validationErrors.name ? 'border-status-error' : 'border-theme-border-primary'
                            }`}
                            placeholder="Enter shop name"
                          />
                          {validationErrors.name && <p className="text-status-error text-xs mt-1">{validationErrors.name}</p>}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-2">Cuisine Type</label>
                          <input
                            type="text"
                            value={formData.cuisine || ''}
                            onChange={(e) => handleInputChange('cuisine', e.target.value)}
                            className="w-full px-4 py-3 rounded-xl font-raleway text-theme-text-primary border border-theme-border-primary bg-theme-bg-secondary focus:outline-none focus:ring-2 focus:ring-theme-accent-primary/50 transition-all"
                            placeholder="e.g. Italian, Indian, Fast Food"
                          />
                        </div>
                      </div>

                      <div className="mt-6">
                        <label className="block text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-2">Description</label>
                        <textarea
                          value={formData.description || ''}
                          onChange={(e) => handleInputChange('description', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl font-raleway text-theme-text-primary border border-theme-border-primary bg-theme-bg-secondary focus:outline-none focus:ring-2 focus:ring-theme-accent-primary/50 transition-all resize-none"
                          placeholder="Enter shop description"
                          rows="3"
                        />
                      </div>
                    </div>

                    <hr className="border-theme-border-primary" />

                    {/* Contact Information */}
                    <div>
                      <h3 className="text-sm font-bold text-theme-text-secondary uppercase tracking-widest mb-4">Contact Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-2">Phone Number *</label>
                          <input
                            type="tel"
                            value={formData.phone || ''}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            className={`w-full px-4 py-3 rounded-xl font-raleway text-theme-text-primary border bg-theme-bg-secondary focus:outline-none focus:ring-2 focus:ring-theme-accent-primary/50 transition-all ${
                              validationErrors.phone ? 'border-status-error' : 'border-theme-border-primary'
                            }`}
                            placeholder="Phone number"
                          />
                          {validationErrors.phone && <p className="text-status-error text-xs mt-1">{validationErrors.phone}</p>}
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-2">Email Address *</label>
                          <input
                            type="email"
                            value={formData.email || ''}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            className={`w-full px-4 py-3 rounded-xl font-raleway text-theme-text-primary border bg-theme-bg-secondary focus:outline-none focus:ring-2 focus:ring-theme-accent-primary/50 transition-all ${
                              validationErrors.email ? 'border-status-error' : 'border-theme-border-primary'
                            }`}
                            placeholder="Email address"
                          />
                          {validationErrors.email && <p className="text-status-error text-xs mt-1">{validationErrors.email}</p>}
                        </div>
                      </div>
                    </div>

                    <hr className="border-theme-border-primary" />

                    {/* Location Information */}
                    <div>
                      <h3 className="text-sm font-bold text-theme-text-secondary uppercase tracking-widest mb-4">Location Details</h3>
                      <div>
                        <label className="block text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-2">Complete Address</label>
                        <textarea
                          value={formData.address || ''}
                          onChange={(e) => handleInputChange('address', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl font-raleway text-theme-text-primary border border-theme-border-primary bg-theme-bg-secondary focus:outline-none focus:ring-2 focus:ring-theme-accent-primary/50 transition-all resize-none"
                          placeholder="Enter complete address"
                          rows="2"
                        />
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
                    disabled={saving}
                    className="px-6 py-3 bg-theme-accent-primary text-white rounded-xl font-raleway font-bold hover:bg-theme-accent-secondary transition-colors flex items-center gap-2 shadow-lg shadow-theme-accent-primary/20 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-theme-text-inverse"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <FaSave />
                        <span>Save Changes (OTP)</span>
                      </>
                    )}
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
          email={formData.email || pendingChanges?.email}
          purpose="profile_update"
          entityId={shopId}
          title="Verify Shop Profile Update"
          description="For security, please verify your email address to save shop profile changes."
        />
        
      </div>
    </ZoneShopLayout>
  );
};

export default ZoneShopProfile;