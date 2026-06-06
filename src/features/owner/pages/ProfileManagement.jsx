import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaStore,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaShieldAlt,
  FaEdit,
  FaCheckCircle,
  FaExclamationTriangle,
  FaGlobe,
  FaImage,
  FaUtensils,
  FaUniversity,
  FaCreditCard,
  FaIdCard
} from 'react-icons/fa';
import SingleRestaurantLayout from '../components/SingleRestaurantLayout';
import ImageUpload from '../../../components/common/ImageUpload';
import EmailOTPVerification from '../../../components/common/EmailOTPVerification';
import DatabaseService from '../../../services/DatabaseService';
import { restaurantAPI } from '../../../shared/api/api';
import ImageUploadService from '../../../services/ImageUploadService';

const ProfileInputField = ({ label, icon: Icon, value, onChange, disabled, error, type = 'text', required, ...props }) => (
  <div>
    <label className="block text-xs font-bold text-theme-text-tertiary uppercase tracking-wider mb-2">
      {label} {required && <span className="text-status-error">*</span>}
    </label>
    <div className="relative">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-text-tertiary" />}
      <input
        type={type}
        value={value || ''}
        onChange={onChange}
        disabled={disabled}
        className={`w-full ${Icon ? 'pl-11' : 'pl-4'} pr-4 py-2.5 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent ${
          disabled
            ? 'bg-theme-bg-secondary border-theme-border-primary text-theme-text-secondary cursor-not-allowed'
            : error
              ? 'bg-status-error-light border-status-error text-status-error focus:border-status-error'
              : 'input-theme'
        }`}
        {...props}
      />
    </div>
    {error && <p className="text-status-error text-xs mt-1.5 font-medium">{error}</p>}
  </div>
);

const ProfileManagement = () => {
  const { restaurantId } = useParams();
  const user = JSON.parse(localStorage.getItem('tableserve_user') || '{}');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('restaurant');
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [restaurantData, setRestaurantData] = useState({
    name: '', description: '', cuisine: '', ownerName: '', ownerPhone: '', ownerEmail: '', 
    address: '', city: '', state: '', zipCode: '', website: '', logo: null,
    bankDetails: {
      accountHolderName: '',
      accountNumber: '',
      ifscCode: '',
      accountType: 'savings'
    }
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [formData, setFormData] = useState({});

  const getLogoFromMediaImages = (restaurant) => {
    const logoImage = restaurant.media?.images?.find(img => img.imageType === 'logo');
    return logoImage ? logoImage.url : null;
  };

  const handleImageUpload = async (imageUrl, file, fieldName) => {
    if (file) {
      try {
        setUploading(true);
        const uploadResult = await ImageUploadService.uploadImage(file, {
          folder: `restaurants/${restaurantId}`,
          tags: [restaurantId, fieldName]
        });
        handleInputChange(fieldName, uploadResult.url);
        return uploadResult.url;
      } catch (error) {
        setSaveStatus({ type: 'error', message: `Failed to upload ${fieldName}: ${error.message}` });
        setTimeout(() => setSaveStatus(null), 5000);
        return null;
      } finally {
        setUploading(false);
      }
    } else {
      handleInputChange(fieldName, imageUrl);
      return imageUrl;
    }
  };

  useEffect(() => {
    const loadRestaurantData = async () => {
      try {
        const targetRestaurantId = restaurantId || user.restaurantId;
        const restaurant = await DatabaseService.getRestaurant(targetRestaurantId);
        
        if (restaurant) {
          const processedRestaurant = {
            ...restaurant,
            ownerPhone: restaurant.contact?.phone || restaurant.ownerPhone || '',
            ownerEmail: restaurant.contact?.email || restaurant.ownerEmail || '',
            address: restaurant.contact?.address?.street || restaurant.address || '',
            city: restaurant.contact?.address?.city || restaurant.city || '',
            state: restaurant.contact?.address?.state || restaurant.state || '',
            zipCode: restaurant.contact?.address?.zipCode || restaurant.zipCode || '',
            website: restaurant.contact?.website || restaurant.website || '',
            logo: getLogoFromMediaImages(restaurant) || restaurant.logo || null,
            bankDetails: restaurant.bankDetails || {
              accountHolderName: '',
              accountNumber: '',
              ifscCode: '',
              accountType: 'savings'
            }
          };
          setRestaurantData(processedRestaurant);
          setFormData(processedRestaurant);
        }
      } catch (error) {
        console.error('Error loading restaurant data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (restaurantId && loading) {
      loadRestaurantData();
    }
  }, [restaurantId, loading, user.restaurantId]);

  const validateForm = () => {
    const errors = {};
    if (!formData.name?.trim()) errors.name = 'Restaurant name is required';
    if (!formData.ownerName?.trim()) errors.ownerName = 'Owner name is required';
    if (!formData.ownerPhone?.trim()) {
      errors.ownerPhone = 'Phone number is required';
    } else if (!/^\+?[\d\s-()]+$/.test(formData.ownerPhone)) {
      errors.ownerPhone = 'Invalid phone format';
    }
    if (!formData.ownerEmail?.trim()) {
      errors.ownerEmail = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ownerEmail)) {
      errors.ownerEmail = 'Invalid email format';
    }
    if (!formData.address?.trim()) errors.address = 'Address is required';

    // Bank details validation (optional but if provided, must be valid)
    if (formData.bankDetails) {
      if (formData.bankDetails.accountNumber && !/^\d{9,18}$/.test(formData.bankDetails.accountNumber)) {
        errors.bankAccountNumber = 'Account number must be 9-18 digits';
      }
      if (formData.bankDetails.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.bankDetails.ifscCode)) {
        errors.bankIfscCode = 'Invalid IFSC code format (e.g., SBIN0001234)';
      }
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

  const handleSave = () => {
    if (!validateForm()) {
      setSaveStatus({ type: 'error', message: 'Please fix the validation errors' });
      return;
    }
    if (!formData.ownerEmail || formData.ownerEmail.trim() === '') {
      setSaveStatus({ type: 'error', message: 'Email address is required for profile verification' });
      return;
    }
    setPendingChanges(formData);
    setShowOTPVerification(true);
  };

  const saveProfile = async (profileData) => {
    try {
      const sanitizedData = {
        name: profileData.name,
        description: profileData.description,
        cuisine: profileData.cuisine,
        contact: {
          address: {
            street: profileData.address || '',
            city: profileData.city || '',
            state: profileData.state || '',
            zipCode: profileData.zipCode || '',
            country: 'IN'
          },
          phone: profileData.ownerPhone || '',
          email: profileData.ownerEmail || '',
          website: profileData.website || ''
        },
        ownerName: profileData.ownerName,
        ownerPhone: profileData.ownerPhone,
        ownerEmail: profileData.ownerEmail,
        address: profileData.address,
        city: profileData.city,
        state: profileData.state,
        zipCode: profileData.zipCode,
        website: profileData.website,
        logo: profileData.logo,
        bankDetails: profileData.bankDetails || {
          accountHolderName: '',
          accountNumber: '',
          ifscCode: '',
          accountType: 'savings'
        }
      };
      
      const allowedFields = ['name', 'description', 'cuisine', 'contact', 'ownerName', 'ownerPhone', 'ownerEmail', 'address', 'city', 'state', 'zipCode', 'website', 'logo', 'bankDetails'];
      const finalSanitizedData = {};
      allowedFields.forEach(field => {
        if (sanitizedData[field] !== undefined) finalSanitizedData[field] = sanitizedData[field];
      });
      
      const response = await restaurantAPI.update(restaurantId, finalSanitizedData);
      
      if (response.success) {
        const mappedResponseData = {
          ...response.data,
          ownerPhone: response.data.contact?.phone || response.data.ownerPhone || '',
          ownerEmail: response.data.contact?.email || response.data.ownerEmail || '',
          address: response.data.contact?.address?.street || response.data.address || '',
          city: response.data.contact?.address?.city || response.data.city || '',
          state: response.data.contact?.address?.state || response.data.state || '',
          zipCode: response.data.contact?.address?.zipCode || response.data.zipCode || '',
          website: response.data.contact?.website || response.data.website || '',
          logo: getLogoFromMediaImages(response.data) || response.data.logo || null,
          bankDetails: response.data.bankDetails || {
            accountHolderName: '',
            accountNumber: '',
            ifscCode: '',
            accountType: 'savings'
          }
        };
        
        setRestaurantData(mappedResponseData);
        setIsEditing(false);
        setSaveStatus({ type: 'success', message: 'Profile securely updated.' });
        window.dispatchEvent(new CustomEvent('restaurantProfileUpdated', { detail: { restaurantId, profileData: mappedResponseData } }));
      } else {
        throw new Error(response.message || 'Failed to save profile');
      }

      setTimeout(() => setSaveStatus(null), 5000);
    } catch (error) {
      setSaveStatus({ type: 'error', message: error.message || 'Failed to save profile' });
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

  const handleOTPClose = () => setShowOTPVerification(false);

  const handleOTPCancel = () => {
    setShowOTPVerification(false);
    setPendingChanges(null);
    setSaveStatus({ type: 'error', message: 'Profile update cancelled' });
    setTimeout(() => setSaveStatus(null), 3000);
  };

  if (loading) {
    return (
      <SingleRestaurantLayout>
        <div className="flex items-center justify-center h-full min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-theme-text-secondary tracking-wide">Loading Configuration...</p>
          </div>
        </div>
      </SingleRestaurantLayout>
    );
  }

  return (
    <SingleRestaurantLayout>
      <div className="w-full h-full flex flex-col gap-6 pb-12">
        
        {/* Save Status Toast */}
        <AnimatePresence>
          {saveStatus && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`p-4 rounded-xl shadow-lg border flex items-center gap-3 z-50 ${
                saveStatus.type === 'success' 
                  ? 'bg-status-success-light border-status-success text-status-success' 
                  : 'bg-status-error-light border-status-error text-status-error'
              }`}
            >
              {saveStatus.type === 'success' ? <FaCheckCircle className="text-status-success text-lg" /> : <FaExclamationTriangle className="text-status-error text-lg" />}
              <span className="text-sm font-semibold">{saveStatus.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header Section */}
        <div className="admin-card p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-theme-text-primary tracking-tight mb-1">Configuration</h1>
            <p className="text-theme-text-secondary text-sm">Manage establishment identity, contact points, and secure parameters.</p>
          </div>
          
          <div className="flex w-full md:w-auto gap-3">
            {!isEditing ? (
              <button
                onClick={() => {
                  setIsEditing(true);
                  setFormData(restaurantData);
                }}
                className="flex-1 md:flex-none bg-theme-bg-primary hover:bg-theme-bg-hover text-theme-text-primary border border-theme-border-primary px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <FaEdit /> Modify Config
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setFormData(restaurantData);
                    setValidationErrors({});
                  }}
                  className="flex-1 md:flex-none bg-theme-bg-primary hover:bg-theme-bg-hover text-theme-text-secondary border border-theme-border-primary px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={handleSave}
                  className="flex-[2] md:flex-none btn-primary px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <FaShieldAlt /> Secure Save
                </button>
              </>
            )}
          </div>
        </div>

        {/* Form Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Identity Column */}
          <div className="xl:col-span-1 space-y-6">
            <div className="admin-card rounded-2xl p-6">
              <h3 className="text-sm font-bold text-theme-text-primary mb-4 pb-2 border-b border-theme-border-primary flex items-center gap-2">
                <FaImage className="text-theme-text-tertiary" /> Brand Identity
              </h3>
              
              <div className="flex flex-col items-center">
                {isEditing ? (
                  <div className="w-full max-w-[200px]">
                    <ImageUpload
                      currentImage={formData.logo}
                      onImageChange={(imageUrl, file) => handleImageUpload(imageUrl, file, 'logo')}
                      label="Upload SVG/PNG"
                      size="medium"
                      shape="rounded"
                      uploading={uploading}
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-xl bg-theme-bg-secondary border-2 border-theme-border-primary border-dashed flex items-center justify-center overflow-hidden mb-4">
                    {restaurantData.logo ? (
                      <img src={restaurantData.logo} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <FaStore className="text-4xl text-theme-text-tertiary" />
                    )}
                  </div>
                )}
                
                {!isEditing && (
                  <div className="text-center w-full mt-2">
                    <h2 className="font-bold text-theme-text-primary text-lg truncate">{restaurantData.name || 'Unnamed Entity'}</h2>
                    <p className="text-xs font-semibold text-accent uppercase tracking-wider mt-1">{restaurantData.cuisine || 'Classification Pending'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Configuration Column */}
          <div className="xl:col-span-2 space-y-6">
            <div className="admin-card rounded-2xl p-6 sm:p-8">
              <h3 className="text-sm font-bold text-theme-text-primary mb-6 pb-2 border-b border-theme-border-primary">Core Parameters</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <ProfileInputField label="Entity Name" icon={FaStore} value={isEditing ? formData.name : restaurantData.name} onChange={(e) => handleInputChange('name', e.target.value)} disabled={!isEditing} error={validationErrors.name} required placeholder="Registered Name" />
                <ProfileInputField label="Primary Cuisine" icon={FaUtensils} value={isEditing ? formData.cuisine : restaurantData.cuisine} onChange={(e) => handleInputChange('cuisine', e.target.value)} disabled={!isEditing} error={validationErrors.cuisine} placeholder="e.g., Japanese, Bakery" />
                
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-theme-text-tertiary uppercase tracking-wider mb-2">Description</label>
                  <textarea
                    value={isEditing ? formData.description || '' : restaurantData.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-3 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none h-24 ${
                      !isEditing ? 'bg-theme-bg-secondary border border-theme-border-primary text-theme-text-secondary cursor-not-allowed' : 'input-theme'
                    }`}
                    placeholder="Brief summary for customer display..."
                  />
                </div>
              </div>
            </div>

            {/* Bottom 2-Column Grid for Contact and Location */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Secure Contact Vector */}
              <div className="admin-card rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-6 pb-2 border-b border-theme-border-primary">
                  <h3 className="text-sm font-bold text-theme-text-primary">Secure Contact Vector</h3>
                  <FaShieldAlt className="text-accent text-sm" title="Modifications require OTP" />
                </div>
                
                <div className="grid grid-cols-1 gap-5">
                  <ProfileInputField label="Administrator Name" icon={FaUser} value={isEditing ? formData.ownerName : restaurantData.ownerName} onChange={(e) => handleInputChange('ownerName', e.target.value)} disabled={!isEditing} error={validationErrors.ownerName} required placeholder="Authorized Contact" />
                  <ProfileInputField label="Verification Email" icon={FaEnvelope} type="email" value={isEditing ? formData.ownerEmail : restaurantData.ownerEmail} onChange={(e) => handleInputChange('ownerEmail', e.target.value)} disabled={!isEditing} error={validationErrors.ownerEmail} required placeholder="admin@domain.com" />
                  <ProfileInputField label="Support Phone" icon={FaPhone} type="tel" value={isEditing ? formData.ownerPhone : restaurantData.ownerPhone} onChange={(e) => handleInputChange('ownerPhone', e.target.value)} disabled={!isEditing} error={validationErrors.ownerPhone} required placeholder="+1 234 567 8900" />
                  <ProfileInputField label="Web Endpoint" icon={FaGlobe} type="url" value={isEditing ? formData.website : restaurantData.website} onChange={(e) => handleInputChange('website', e.target.value)} disabled={!isEditing} error={validationErrors.website} placeholder="https://domain.com" />
                </div>
              </div>

              {/* Location Vector */}
              <div className="admin-card rounded-2xl p-6">
                <h3 className="text-sm font-bold text-theme-text-primary mb-6 pb-2 border-b border-theme-border-primary">Location Vector</h3>
                
                <div className="grid grid-cols-1 gap-5">
                  <ProfileInputField label="Street Address" icon={FaMapMarkerAlt} value={isEditing ? formData.address : restaurantData.address} onChange={(e) => handleInputChange('address', e.target.value)} disabled={!isEditing} error={validationErrors.address} required placeholder="Unit, Building, Street" />
                  <ProfileInputField label="City" value={isEditing ? formData.city : restaurantData.city} onChange={(e) => handleInputChange('city', e.target.value)} disabled={!isEditing} error={validationErrors.city} placeholder="City" />
                  <ProfileInputField label="Region / State" value={isEditing ? formData.state : restaurantData.state} onChange={(e) => handleInputChange('state', e.target.value)} disabled={!isEditing} error={validationErrors.state} placeholder="State/Province" />
                  <ProfileInputField label="Postal Code" value={isEditing ? formData.zipCode : restaurantData.zipCode} onChange={(e) => handleInputChange('zipCode', e.target.value)} disabled={!isEditing} error={validationErrors.zipCode} placeholder="ZIP/Postal Code" />
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* OTP Modal */}
        <EmailOTPVerification
          isOpen={showOTPVerification}
          onClose={handleOTPClose}
          onCancel={handleOTPCancel}
          onVerified={handleOTPVerified}
          email={formData.ownerEmail || pendingChanges?.ownerEmail}
          purpose="profile_update"
          entityId={restaurantId}
          title="Security Clearance Required"
          description="A modification to secure profile parameters has been requested. Verify control of the registered email address to proceed."
        />
      </div>
    </SingleRestaurantLayout>
  );
};

export default ProfileManagement;