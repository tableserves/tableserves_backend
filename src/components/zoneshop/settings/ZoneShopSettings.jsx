import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaCog,
  FaBell,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaSave,
  FaStore,
  FaClock,
  FaToggleOn,
  FaToggleOff,
  FaKey,
  FaShieldAlt
} from 'react-icons/fa';
import ZoneShopLayout from '../ZoneShopLayout';

const ZoneShopSettings = () => {
  const { zoneId, shopId } = useParams();
  const [settings, setSettings] = useState({});
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Mock settings data
  const mockSettings = {
    shopInfo: {
      name: 'Dinesh Shop',
      description: 'Authentic Indian cuisine with modern twist',
      phone: '+91 98765 43210',
      email: 'dinesh@shop.com',
      address: '123 Food Street, Zone 1'
    },
    operatingHours: {
      monday: { open: '09:00', close: '22:00', closed: false },
      tuesday: { open: '09:00', close: '22:00', closed: false },
      wednesday: { open: '09:00', close: '22:00', closed: false },
      thursday: { open: '09:00', close: '22:00', closed: false },
      friday: { open: '09:00', close: '23:00', closed: false },
      saturday: { open: '09:00', close: '23:00', closed: false },
      sunday: { open: '10:00', close: '22:00', closed: false }
    },
    notifications: {
      newOrders: true,
      lowStock: true,
      dailyReports: false,
      promotions: true,
      systemUpdates: false
    },
    privacy: {
      showOnlineStatus: true,
      allowCustomerReviews: true,
      shareAnalytics: false,
      marketingEmails: true
    },
    orderSettings: {
      autoAcceptOrders: false,
      preparationTime: 25,
      maxOrdersPerHour: 15,
      enableTakeaway: true,
      enableDineIn: true
    }
  };

  useEffect(() => {
    const loadSettings = () => {
      setLoading(true);
      try {
        // Load real settings from localStorage
        const savedSettings = JSON.parse(localStorage.getItem(`tableserve_zone_${zoneId}_shop_${shopId}_settings`) || '{}');

        // If no saved settings, get vendor data and create default settings
        if (Object.keys(savedSettings).length === 0) {
          const vendors = JSON.parse(localStorage.getItem(`tableserve_zone_${zoneId}_vendors`) || '[]');
          const vendor = vendors.find(v => v.id === shopId);

          if (vendor) {
            const defaultSettings = {
              shopInfo: {
                name: vendor.name || '',
                description: vendor.description || '',
                phone: vendor.ownerPhone || '',
                email: vendor.ownerEmail || '',
                address: vendor.address || ''
              },
              operatingHours: vendor.operatingHours || {
                monday: { open: '09:00', close: '22:00', closed: false },
                tuesday: { open: '09:00', close: '22:00', closed: false },
                wednesday: { open: '09:00', close: '22:00', closed: false },
                thursday: { open: '09:00', close: '22:00', closed: false },
                friday: { open: '09:00', close: '22:00', closed: false },
                saturday: { open: '09:00', close: '22:00', closed: false },
                sunday: { open: '09:00', close: '22:00', closed: false }
              },
              notifications: {
                newOrders: true,
                lowStock: true,
                dailyReports: false,
                promotions: true,
                systemUpdates: false
              },
              privacy: {
                showOnlineStatus: true,
                allowCustomerReviews: true,
                shareAnalytics: false,
                marketingEmails: true
              },
              orderSettings: {
                autoAcceptOrders: false,
                preparationTime: 25,
                maxOrdersPerHour: 15,
                enableTakeaway: true,
                enableDineIn: true
              }
            };
            setSettings(defaultSettings);
          } else {
            setSettings({});
          }
        } else {
          setSettings(savedSettings);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        setSettings({});
      }
      setLoading(false);
    };

    loadSettings();
  }, [zoneId, shopId]);

  const handleSettingChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const handleOperatingHoursChange = (day, field, value) => {
    setSettings(prev => ({
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

  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    // Simulate API call
    setTimeout(() => {
      setSaving(false);
      alert('Settings saved successfully!');
    }, 1500);
  };

  const handlePasswordUpdate = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      alert('Password must be at least 6 characters long!');
      return;
    }

    setSaving(true);
    // Simulate API call
    setTimeout(() => {
      setSaving(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      alert('Password updated successfully!');
    }, 1500);
  };

  if (loading) {
    return (
      <ZoneShopLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-theme-accent-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-theme-text-secondary">Loading settings...</p>
          </div>
        </div>
      </ZoneShopLayout>
    );
  }

  return (
    <ZoneShopLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-fredoka text-theme-text-primary mb-2">
              Shop Settings
            </h1>
            <p className="text-theme-text-secondary font-raleway">
              Manage your shop preferences and configurations
            </p>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center space-x-2 bg-theme-accent-primary text-white px-6 py-2 rounded-lg hover:bg-theme-accent-hover transition-colors disabled:opacity-50 mt-4 sm:mt-0"
          >
            <FaSave />
            <span className="font-raleway">{saving ? 'Saving...' : 'Save All Settings'}</span>
          </button>
        </div>

        {/* Shop Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="admin-card p-6 rounded-xl"
        >
          <div className="flex items-center space-x-3 mb-6">
            <FaStore className="text-theme-accent-primary text-xl" />
            <h2 className="text-xl font-fredoka text-theme-text-primary">Shop Information</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-theme-text-primary font-raleway font-medium mb-2">Shop Name</label>
              <input
                type="text"
                value={settings.shopInfo?.name || ''}
                onChange={(e) => handleSettingChange('shopInfo', 'name', e.target.value)}
                className="w-full px-4 py-2 border border-theme-border-primary rounded-lg bg-theme-bg-secondary text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-theme-accent-primary"
              />
            </div>
            <div>
              <label className="block text-theme-text-primary font-raleway font-medium mb-2">Phone Number</label>
              <input
                type="tel"
                value={settings.shopInfo?.phone || ''}
                onChange={(e) => handleSettingChange('shopInfo', 'phone', e.target.value)}
                className="w-full px-4 py-2 border border-theme-border-primary rounded-lg bg-theme-bg-secondary text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-theme-accent-primary"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-theme-text-primary font-raleway font-medium mb-2">Description</label>
              <textarea
                value={settings.shopInfo?.description || ''}
                onChange={(e) => handleSettingChange('shopInfo', 'description', e.target.value)}
                className="w-full px-4 py-2 border border-theme-border-primary rounded-lg bg-theme-bg-secondary text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-theme-accent-primary h-24 resize-none"
                placeholder="Describe your shop and cuisine"
              />
            </div>
          </div>
        </motion.div>

        {/* Operating Hours */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="admin-card p-6 rounded-xl"
        >
          <div className="flex items-center space-x-3 mb-6">
            <FaClock className="text-theme-accent-primary text-xl" />
            <h2 className="text-xl font-fredoka text-theme-text-primary">Operating Hours</h2>
          </div>
          <div className="space-y-4">
            {Object.entries(settings.operatingHours || {}).map(([day, hours]) => (
              <div key={day} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-4 bg-theme-bg-secondary rounded-lg">
                <div className="font-raleway font-medium text-theme-text-primary capitalize">
                  {day}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleOperatingHoursChange(day, 'closed', !hours.closed)}
                    className="flex items-center space-x-2"
                  >
                    {hours.closed ? (
                      <FaToggleOff className="text-2xl text-gray-400" />
                    ) : (
                      <FaToggleOn className="text-2xl text-theme-accent-primary" />
                    )}
                    <span className="text-sm font-raleway text-theme-text-secondary">
                      {hours.closed ? 'Closed' : 'Open'}
                    </span>
                  </button>
                </div>
                {!hours.closed && (
                  <>
                    <div>
                      <label className="block text-xs font-raleway text-theme-text-secondary mb-1">Opening</label>
                      <input
                        type="time"
                        value={hours.open}
                        onChange={(e) => handleOperatingHoursChange(day, 'open', e.target.value)}
                        className="w-full px-3 py-2 border border-theme-border-primary rounded-lg bg-theme-bg-primary text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-theme-accent-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-raleway text-theme-text-secondary mb-1">Closing</label>
                      <input
                        type="time"
                        value={hours.close}
                        onChange={(e) => handleOperatingHoursChange(day, 'close', e.target.value)}
                        className="w-full px-3 py-2 border border-theme-border-primary rounded-lg bg-theme-bg-primary text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-theme-accent-primary"
                      />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="admin-card p-6 rounded-xl"
        >
          <div className="flex items-center space-x-3 mb-6">
            <FaBell className="text-theme-accent-primary text-xl" />
            <h2 className="text-xl font-fredoka text-theme-text-primary">Notification Preferences</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(settings.notifications || {}).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-4 bg-theme-bg-secondary rounded-lg">
                <span className="font-raleway text-theme-text-primary capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <button
                  onClick={() => handleSettingChange('notifications', key, !value)}
                  className="flex items-center"
                >
                  {value ? (
                    <FaToggleOn className="text-2xl text-theme-accent-primary" />
                  ) : (
                    <FaToggleOff className="text-2xl text-gray-400" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Security Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="admin-card p-6 rounded-xl"
        >
          <div className="flex items-center space-x-3 mb-6">
            <FaShieldAlt className="text-theme-accent-primary text-xl" />
            <h2 className="text-xl font-fredoka text-theme-text-primary">Security Settings</h2>
          </div>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-fredoka text-theme-text-primary mb-4 flex items-center space-x-2">
                <FaKey />
                <span>Change Password</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-theme-text-primary font-raleway font-medium mb-2">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                      className="w-full px-4 py-2 pr-10 border border-theme-border-primary rounded-lg bg-theme-bg-secondary text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-theme-accent-primary"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary hover:text-theme-text-primary"
                    >
                      {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-theme-text-primary font-raleway font-medium mb-2">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                      className="w-full px-4 py-2 pr-10 border border-theme-border-primary rounded-lg bg-theme-bg-secondary text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-theme-accent-primary"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary hover:text-theme-text-primary"
                    >
                      {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-theme-text-primary font-raleway font-medium mb-2">Confirm Password</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                    className="w-full px-4 py-2 border border-theme-border-primary rounded-lg bg-theme-bg-secondary text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-theme-accent-primary"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
              <button
                onClick={handlePasswordUpdate}
                disabled={saving || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                className="mt-4 flex items-center space-x-2 bg-theme-accent-primary text-white px-4 py-2 rounded-lg hover:bg-theme-accent-hover transition-colors disabled:opacity-50"
              >
                <FaLock />
                <span className="font-raleway">Update Password</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </ZoneShopLayout>
  );
};

export default ZoneShopSettings;
