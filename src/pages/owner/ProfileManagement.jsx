import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaStore,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaClock,
  FaCamera,
  FaSave,
  FaEdit,
  FaTimes,
  FaCheck,
  FaUtensils,
  FaDollarSign,
  FaUsers,
  FaShieldAlt,
  FaExclamationTriangle,
  FaCheckCircle
} from 'react-icons/fa';
import SingleRestaurantLayout from '../../components/owner/SingleRestaurantLayout';
import ImageUpload from '../../components/common/ImageUpload';
import ProfileOTPVerification from '../../components/common/ProfileOTPVerification';
import LocalStorageService from '../../services/LocalStorageService';

const ProfileManagement = () => {
  const { restaurantId } = useParams();
  const user = JSON.parse(localStorage.getItem('tableserve_user') || '{}');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('restaurant');
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  const [restaurantData, setRestaurantData] = useState({
    name: '',
    description: '',
    cuisine: '',
    ownerPhone: '',
    ownerEmail: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    website: '',
    logo: null,
    coverImage: null,
    operatingHours: {
      monday: { open: '09:00', close: '22:00', closed: false },
      tuesday: { open: '09:00', close: '22:00', closed: false },
      wednesday: { open: '09:00', close: '22:00', closed: false },
      thursday: { open: '09:00', close: '22:00', closed: false },
      friday: { open: '09:00', close: '22:00', closed: false },
      saturday: { open: '09:00', close: '22:00', closed: false },
      sunday: { open: '09:00', close: '22:00', closed: false }
    },
    features: {
      delivery: false,
      takeaway: false,
      dineIn: true,
      parking: false,
      wifi: false,
      cardPayment: false,
      cashPayment: true
    }
  });

  const [formData, setFormData] = useState({});

  // Load restaurant data on component mount
  useEffect(() => {
    const loadRestaurantData = () => {
      try {
        // Use restaurantId from URL params or fall back to user's restaurantId
        const targetRestaurantId = restaurantId || user.restaurantId;
        console.log('Loading restaurant with ID:', targetRestaurantId);
        console.log('User data:', user);

        const restaurant = LocalStorageService.getRestaurantById(targetRestaurantId);
        console.log('Loaded restaurant data:', restaurant);
        if (restaurant) {
          // Ensure operatingHours and features are properly structured
          const processedRestaurant = {
            ...restaurant,
            operatingHours: restaurant.operatingHours || {
              monday: { open: '09:00', close: '22:00', closed: false },
              tuesday: { open: '09:00', close: '22:00', closed: false },
              wednesday: { open: '09:00', close: '22:00', closed: false },
              thursday: { open: '09:00', close: '22:00', closed: false },
              friday: { open: '09:00', close: '22:00', closed: false },
              saturday: { open: '09:00', close: '22:00', closed: false },
              sunday: { open: '09:00', close: '22:00', closed: false }
            },
            features: restaurant.features || {
              delivery: false,
              takeaway: false,
              dineIn: true,
              parking: false,
              wifi: false,
              cardPayment: false,
              cashPayment: true
            }
          };
          console.log('Processed restaurant data:', processedRestaurant);
          setRestaurantData(processedRestaurant);
          setFormData(processedRestaurant);
        } else {
          // Create default restaurant structure
          const defaultRestaurant = {
            id: restaurantId,
            name: '',
            description: '',
            cuisine: '',
            ownerName: '',
            ownerPhone: '',
            ownerEmail: '',
            address: '',
            city: '',
            state: '',
            zipCode: '',
            website: '',
            logo: null,
            coverImage: null,
            operatingHours: {
              monday: { open: '09:00', close: '22:00', closed: false },
              tuesday: { open: '09:00', close: '22:00', closed: false },
              wednesday: { open: '09:00', close: '22:00', closed: false },
              thursday: { open: '09:00', close: '22:00', closed: false },
              friday: { open: '09:00', close: '22:00', closed: false },
              saturday: { open: '09:00', close: '22:00', closed: false },
              sunday: { open: '09:00', close: '22:00', closed: false }
            },
            features: {
              delivery: false,
              takeaway: false,
              dineIn: true,
              parking: false,
              wifi: false,
              cardPayment: false,
              cashPayment: true
            },
            status: 'active',
            tables: 0,
            revenue: '₹0',
            orders: 0
          };
          setRestaurantData(defaultRestaurant);
          setFormData(defaultRestaurant);
        }
      } catch (error) {
        console.error('Error loading restaurant data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (restaurantId) {
      loadRestaurantData();
    }
  }, [restaurantId]);

  const tabs = [
    { id: 'restaurant', label: 'Restaurant Info', icon: FaStore },
    { id: 'hours', label: 'Operating Hours', icon: FaClock },
    { id: 'features', label: 'Features & Services', icon: FaUtensils }
  ];

  // Validation function
  const validateForm = () => {
    const errors = {};

    if (!formData.name?.trim()) {
      errors.name = 'Restaurant name is required';
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
      console.log('Saving restaurant profile data:', profileData);

      // Save to the main restaurants array
      LocalStorageService.updateRestaurant(restaurantId, profileData);

      // Also save to the specific profile key that the sidebar checks
      localStorage.setItem(`restaurant_profile_${restaurantId}`, JSON.stringify(profileData));

      setRestaurantData(profileData);
      setIsEditing(false);
      setSaveStatus({ type: 'success', message: 'Restaurant profile updated successfully with OTP verification!' });

      // Trigger a custom event to notify the sidebar to refresh
      window.dispatchEvent(new CustomEvent('restaurantProfileUpdated', {
        detail: { restaurantId, profileData }
      }));

      setTimeout(() => setSaveStatus(null), 5000);
    } catch (error) {
      console.error('Error saving restaurant profile:', error);
      setSaveStatus({ type: 'error', message: 'Failed to save restaurant profile' });
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

  const handleOTPClose = () => {
    console.log('OTP modal closed');
    setShowOTPVerification(false);
    // Don't show cancelled message or clear pending changes here
    // This will be called after successful verification too
  };

  const handleOTPCancel = () => {
    console.log('OTP verification cancelled by user');
    setShowOTPVerification(false);
    setPendingChanges(null);
    setSaveStatus({ type: 'error', message: 'Profile update cancelled' });
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const formatOperatingHours = (hours) => {
    if (!hours || hours.closed) return 'Closed';
    return `${hours.open || '00:00'} - ${hours.close || '00:00'}`;
  };





  const renderRestaurantTab = () => (
    <div className="space-y-6">
      {/* Logo and Cover Image */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-theme-text-primary font-raleway font-medium mb-2">Restaurant Logo</label>
          {isEditing ? (
            <ImageUpload
              currentImage={formData.logo}
              onImageChange={(imageUrl) => handleInputChange('logo', imageUrl)}
              label="Upload restaurant logo"
              size="medium"
              shape="rounded"
            />
          ) : (
            <div className="w-32 h-32 bg-theme-bg-secondary rounded-lg flex items-center justify-center">
              {restaurantData.logo ? (
                <img src={restaurantData.logo} alt="Logo" className="w-full h-full object-cover rounded-lg" />
              ) : (
                <FaStore className="text-3xl text-theme-accent-primary" />
              )}
            </div>
          )}
        </div>
        <div>
          <label className="block text-theme-text-primary font-raleway font-medium mb-2">Cover Image</label>
          {isEditing ? (
            <ImageUpload
              currentImage={formData.coverImage}
              onImageChange={(imageUrl) => handleInputChange('coverImage', imageUrl)}
              label="Upload cover image"
              size="large"
              shape="rounded"
            />
          ) : (
            <div className="w-full h-32 bg-theme-bg-secondary rounded-lg flex items-center justify-center">
              {restaurantData.coverImage ? (
                <img src={restaurantData.coverImage} alt="Cover" className="w-full h-full object-cover rounded-lg" />
              ) : (
                <FaCamera className="text-3xl text-theme-accent-primary" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Restaurant Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-theme-text-primary font-raleway font-medium mb-2">
            Restaurant Name *
          </label>
          <input
            type="text"
            value={isEditing ? formData.name || '' : restaurantData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            disabled={!isEditing}
            className={`w-full px-4 py-3 border rounded-lg font-raleway focus:outline-none focus:ring-2 focus:ring-theme-accent-primary ${validationErrors.name
              ? 'border-red-500 bg-red-50'
              : 'border-theme-border-primary bg-theme-bg-secondary'
              } ${!isEditing ? 'opacity-60' : ''}`}
            placeholder="Enter restaurant name"
          />
          {validationErrors.name && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.name}</p>
          )}
        </div>
        <div>
          <label className="block text-theme-text-primary font-raleway font-medium mb-2">Cuisine Type</label>
          <input
            type="text"
            value={isEditing ? formData.cuisine || '' : restaurantData.cuisine}
            onChange={(e) => handleInputChange('cuisine', e.target.value)}
            disabled={!isEditing}
            className={`w-full px-4 py-3 border border-theme-border-primary bg-theme-bg-secondary rounded-lg font-raleway focus:outline-none focus:ring-2 focus:ring-theme-accent-primary ${!isEditing ? 'opacity-60' : ''}`}
            placeholder="e.g., Italian, Chinese, Indian"
          />
        </div>
        <div>
          <label className="block text-theme-text-primary font-raleway font-medium mb-2">
            Owner Name *
          </label>
          <input
            type="text"
            value={isEditing ? formData.ownerName || '' : restaurantData.ownerName}
            onChange={(e) => handleInputChange('ownerName', e.target.value)}
            disabled={!isEditing}
            className={`w-full px-4 py-3 border rounded-lg font-raleway focus:outline-none focus:ring-2 focus:ring-theme-accent-primary ${validationErrors.ownerName
              ? 'border-red-500 bg-red-50'
              : 'border-theme-border-primary bg-theme-bg-secondary'
              } ${!isEditing ? 'opacity-60' : ''}`}
            placeholder="Enter owner name"
          />
          {validationErrors.ownerName && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.ownerName}</p>
          )}
        </div>
        <div>
          <label className="block text-theme-text-primary font-raleway font-medium mb-2">
            Phone Number *
          </label>
          <input
            type="tel"
            value={isEditing ? formData.ownerPhone || '' : restaurantData.ownerPhone}
            onChange={(e) => handleInputChange('ownerPhone', e.target.value)}
            disabled={!isEditing}
            className={`w-full px-4 py-3 border rounded-lg font-raleway focus:outline-none focus:ring-2 focus:ring-theme-accent-primary ${validationErrors.ownerPhone
              ? 'border-red-500 bg-red-50'
              : 'border-theme-border-primary bg-theme-bg-secondary'
              } ${!isEditing ? 'opacity-60' : ''}`}
            placeholder="Enter phone number"
          />
          {validationErrors.ownerPhone && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.ownerPhone}</p>
          )}
        </div>
        <div>
          <label className="block text-theme-text-primary font-raleway font-medium mb-2">
            Email Address *
          </label>
          <input
            type="email"
            value={isEditing ? formData.ownerEmail || '' : restaurantData.ownerEmail}
            onChange={(e) => handleInputChange('ownerEmail', e.target.value)}
            disabled={!isEditing}
            className={`w-full px-4 py-3 border rounded-lg font-raleway focus:outline-none focus:ring-2 focus:ring-theme-accent-primary ${validationErrors.ownerEmail
              ? 'border-red-500 bg-red-50'
              : 'border-theme-border-primary bg-theme-bg-secondary'
              } ${!isEditing ? 'opacity-60' : ''}`}
            placeholder="Enter email address"
          />
          {validationErrors.ownerEmail && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.ownerEmail}</p>
          )}
        </div>
        <div>
          <label className="block text-theme-text-primary font-raleway font-medium mb-2">Website</label>
          <input
            type="url"
            value={isEditing ? formData.website || '' : restaurantData.website}
            onChange={(e) => handleInputChange('website', e.target.value)}
            disabled={!isEditing}
            className={`w-full px-4 py-3 border border-theme-border-primary bg-theme-bg-secondary rounded-lg font-raleway focus:outline-none focus:ring-2 focus:ring-theme-accent-primary ${!isEditing ? 'opacity-60' : ''}`}
            placeholder="https://yourrestaurant.com"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-theme-text-primary font-raleway font-medium mb-2">
            Address *
          </label>
          <textarea
            value={isEditing ? formData.address || '' : restaurantData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            disabled={!isEditing}
            className={`w-full px-4 py-3  border rounded-lg font-raleway focus:outline-none focus:ring-2 focus:ring-theme-accent-primary resize-none ${validationErrors.address
              ? 'border-red-500 bg-red-50 '
              : 'border-theme-border-primary bg-theme-bg-secondary '
              } ${!isEditing ? 'opacity-60 ' : ''}`}
            placeholder="Enter complete address"
            rows="2"
          />
          {validationErrors.address && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.address}</p>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="block text-theme-text-primary font-raleway font-medium mb-2">Description</label>
          <textarea
            value={isEditing ? formData.description || '' : restaurantData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            disabled={!isEditing}
            className={`w-full px-4 py-3 border border-theme-border-primary bg-theme-bg-secondary rounded-lg font-raleway focus:outline-none focus:ring-2 focus:ring-theme-accent-primary h-24 resize-none ${!isEditing ? 'opacity-60' : ''}`}
            placeholder="Describe your restaurant"
          />
        </div>

        {/* Location Details */}
        <div>
          <label className="block text-theme-text-primary font-raleway font-medium mb-2">City</label>
          <input
            type="text"
            value={isEditing ? formData.city || '' : restaurantData.city}
            onChange={(e) => handleInputChange('city', e.target.value)}
            disabled={!isEditing}
            className={`w-full px-4 py-3 border border-theme-border-primary bg-theme-bg-secondary rounded-lg font-raleway focus:outline-none focus:ring-2 focus:ring-theme-accent-primary ${!isEditing ? 'opacity-60' : ''}`}
            placeholder="Enter city"
          />
        </div>
        <div>
          <label className="block text-theme-text-primary font-raleway font-medium mb-2">State</label>
          <input
            type="text"
            value={isEditing ? formData.state || '' : restaurantData.state}
            onChange={(e) => handleInputChange('state', e.target.value)}
            disabled={!isEditing}
            className={`w-full px-4 py-3 border border-theme-border-primary bg-theme-bg-secondary rounded-lg font-raleway focus:outline-none focus:ring-2 focus:ring-theme-accent-primary ${!isEditing ? 'opacity-60' : ''}`}
            placeholder="Enter state"
          />
        </div>
      </div>
    </div>
  );



  const renderHoursTab = () => {
    const currentHours = isEditing ? formData.operatingHours : restaurantData.operatingHours;
    console.log('Current hours data:', currentHours);
    const hoursData = currentHours || {
      monday: { open: '09:00', close: '22:00', closed: false },
      tuesday: { open: '09:00', close: '22:00', closed: false },
      wednesday: { open: '09:00', close: '22:00', closed: false },
      thursday: { open: '09:00', close: '22:00', closed: false },
      friday: { open: '09:00', close: '22:00', closed: false },
      saturday: { open: '09:00', close: '22:00', closed: false },
      sunday: { open: '09:00', close: '22:00', closed: false }
    };

    return (
      <div className="space-y-4">
        {Object.entries(hoursData).map(([day, hours]) => (
        <div key={day} className="flex items-center space-x-4 p-4 admin-card rounded-lg">
          <div className="w-24">
            <span className="text-theme-text-primary font-raleway font-medium capitalize">{day}</span>
          </div>
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={!hours.closed}
                onChange={(e) => handleOperatingHoursChange(day, 'closed', !e.target.checked)}
                disabled={!isEditing}
                className="rounded"
              />
              <span className="text-theme-text-secondary font-raleway text-sm">Open</span>
            </label>
          </div>
          {!hours.closed && (
            <>
              <input
                type="time"
                value={isEditing ? (formData.operatingHours?.[day]?.open || hours.open) : hours.open}
                onChange={(e) => handleOperatingHoursChange(day, 'open', e.target.value)}
                disabled={!isEditing}
                className={`input-theme rounded px-3 py-1 font-raleway ${!isEditing ? 'opacity-60' : ''}`}
              />
              <span className="text-theme-text-tertiary">to</span>
              <input
                type="time"
                value={isEditing ? (formData.operatingHours?.[day]?.close || hours.close) : hours.close}
                onChange={(e) => handleOperatingHoursChange(day, 'close', e.target.value)}
                disabled={!isEditing}
                className={`input-theme rounded px-3 py-1 font-raleway ${!isEditing ? 'opacity-60' : ''}`}
              />
            </>
          )}
          {hours.closed && (
            <span className="text-theme-text-tertiary font-raleway">Closed</span>
          )}
        </div>
        ))}
      </div>
    );
  };

  const renderFeaturesTab = () => {
    const currentFeatures = isEditing ? formData.features : restaurantData.features;
    console.log('Current features data:', currentFeatures);
    const featuresData = currentFeatures || {
      delivery: false,
      takeaway: false,
      dineIn: true,
      parking: false,
      wifi: false,
      cardPayment: false,
      cashPayment: true
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(featuresData).map(([feature, enabled]) => (
        <div key={feature} className="flex items-center justify-between p-4 admin-card rounded-lg">
          <div>
            <h3 className="text-theme-text-primary font-raleway font-medium capitalize">
              {feature.replace(/([A-Z])/g, ' $1').trim()}
            </h3>
            <p className="text-theme-text-secondary font-raleway text-sm">
              {feature === 'delivery' && 'Offer delivery service'}
              {feature === 'takeaway' && 'Allow takeaway orders'}
              {feature === 'dineIn' && 'Accept dine-in customers'}
              {feature === 'parking' && 'Parking available'}
              {feature === 'wifi' && 'Free WiFi for customers'}
              {feature === 'cardPayment' && 'Accept card payments'}
              {feature === 'cashPayment' && 'Accept cash payments'}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isEditing ? (formData.features?.[feature] ?? enabled) : enabled}
              onChange={(e) => handleNestedInputChange('features', feature, e.target.checked)}
              disabled={!isEditing}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent dark:peer-checked:bg-accent peer-disabled:opacity-50"></div>
          </label>
        </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <SingleRestaurantLayout>
        <div className="min-h-screen bg-theme-bg-primary flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-theme-accent-primary mx-auto mb-4"></div>
            <div className="text-xl font-raleway text-theme-text-primary">Loading Restaurant Profile...</div>
          </div>
        </div>
      </SingleRestaurantLayout>
    );
  }

  return (
    <SingleRestaurantLayout>
      <div className="space-y-6">
        {/* Save Status */}
        {saveStatus && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`px-6 py-3 rounded-lg shadow-lg ${saveStatus.type === 'success'
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

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-fredoka text-theme-text-primary mb-2">Restaurant Profile</h1>
            <p className="text-theme-text-secondary font-raleway text-sm sm:text-base">Manage your restaurant information and settings</p>
          </div>
          <div className="flex space-x-2">
            {!isEditing ? (
              <button
                onClick={() => {
                  setIsEditing(true);
                  setFormData(restaurantData); // Initialize form with current data
                }}
                className="bg-theme-accent-primary text-white px-6 py-2 rounded-lg font-raleway flex items-center space-x-2 hover:bg-theme-accent-hover transition-colors"
              >
                <FaEdit />
                <span>Edit Profile</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  className="bg-theme-accent-primary text-white px-6 py-2 rounded-lg font-raleway flex items-center space-x-2 hover:bg-theme-accent-hover transition-colors"
                >
                  <FaShieldAlt />
                  <span>Save Changes (OTP Required)</span>
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setFormData(restaurantData);
                    setValidationErrors({});
                  }}
                  className="bg-theme-bg-secondary text-theme-text-primary border border-theme-border-primary px-6 py-2 rounded-lg font-raleway flex items-center space-x-2 hover:bg-theme-bg-tertiary transition-colors"
                >
                  <FaTimes />
                  <span>Cancel</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Profile Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Tabs */}
          <div className="lg:col-span-1">
            <div className="admin-card rounded-2xl p-4">
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors font-raleway ${activeTab === tab.id
                      ? 'bg-theme-accent-primary text-theme-text-inverse'
                      : 'text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-hover'
                      }`}
                  >
                    <tab.icon />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="admin-card rounded-2xl p-6">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                {activeTab === 'restaurant' && renderRestaurantTab()}
                {activeTab === 'hours' && renderHoursTab()}
                {activeTab === 'features' && renderFeaturesTab()}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* OTP Verification Modal */}
      <ProfileOTPVerification
        isOpen={showOTPVerification}
        onClose={handleOTPClose}
        onCancel={handleOTPCancel}
        onVerified={handleOTPVerified}
        phoneNumber={formData.ownerPhone || pendingChanges?.ownerPhone}
        purpose="profile_update"
        entityId={restaurantId}
        title="Verify Profile Update"
        description="For security, please verify your phone number to save profile changes."
      />
    </SingleRestaurantLayout>
  );
};

export default ProfileManagement;
