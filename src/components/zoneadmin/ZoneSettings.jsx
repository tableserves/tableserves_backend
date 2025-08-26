import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  FaCog,
  FaUser,
  FaStore,
  FaBell,
  FaShieldAlt,
  FaRupeeSign,
  FaGlobe,
  FaSave,
  FaUndo,
  FaToggleOn,
  FaToggleOff,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaClock,
  FaPercentage,
  FaUsers,
  FaCheckCircle,
  FaExclamationTriangle
} from 'react-icons/fa';
import ZoneAdminLayout from './ZoneAdminLayout';

const ZoneSettings = () => {
  const { zoneId } = useParams();
  const { user } = useSelector((state) => state.ui.auth);

  // Check if user has permission to access zone settings
  const hasPermission = user?.role === 'zone_admin';
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  const [settings, setSettings] = useState({
    general: {
      zoneName: 'Food Court Zone',
      description: 'Premium food court with multiple vendors',
      ownerName: 'Zone Administrator',
      ownerEmail: 'admin@foodcourt.com',
      ownerPhone: '+91 9876543210',
      address: '123 Business District',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400001',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      language: 'en'
    },
    business: {
      operatingHours: {
        monday: { open: '09:00', close: '22:00', closed: false },
        tuesday: { open: '09:00', close: '22:00', closed: false },
        wednesday: { open: '09:00', close: '22:00', closed: false },
        thursday: { open: '09:00', close: '22:00', closed: false },
        friday: { open: '09:00', close: '23:00', closed: false },
        saturday: { open: '09:00', close: '23:00', closed: false },
        sunday: { open: '10:00', close: '22:00', closed: false }
      },
      maxVendors: 20,
      maxTablesPerVendor: 15,
      commissionRate: 8.5,
      serviceCharge: 2.50,
      taxRate: 18.0,
      autoApproveVendors: false,
      allowVendorRegistration: true
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: true,
      newVendorAlerts: true,
      orderAlerts: true,
      paymentAlerts: true,
      systemAlerts: true,
      weeklyReports: true,
      monthlyReports: true
    },
    security: {
      twoFactorAuth: false,
      sessionTimeout: 30,
      passwordExpiry: 90,
      loginAlerts: true,
      ipWhitelist: '',
      allowVendorDataExport: true,
      requireVendorVerification: true
    },
    payment: {
      upiId: 'foodcourt@paytm',
      paymentModel: 'zone-wise', // zone-wise, vendor-wise
      autoSettlement: true,
      settlementFrequency: 'weekly', // daily, weekly, monthly
      minimumSettlement: 1000,
      paymentGateway: 'razorpay',
      acceptCash: true,
      acceptUPI: true,
      acceptCards: true
    }
  });

  useEffect(() => {
    loadSettings();
  }, [zoneId]);

  const loadSettings = () => {
    try {
      const savedSettings = localStorage.getItem(`zone_settings_${zoneId}`);
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSettingChange = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const handleNestedSettingChange = (section, parentKey, childKey, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [parentKey]: {
          ...prev[section][parentKey],
          [childKey]: value
        }
      }
    }));
    setHasChanges(true);
  };

  const saveSettings = () => {
    setLoading(true);
    try {
      localStorage.setItem(`zone_settings_${zoneId}`, JSON.stringify(settings));
      setSaveStatus({ type: 'success', message: 'Settings saved successfully!' });
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus({ type: 'error', message: 'Failed to save settings' });
    } finally {
      setLoading(false);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const resetSettings = () => {
    if (window.confirm('Are you sure you want to reset all settings to default values?')) {
      loadSettings();
      setHasChanges(false);
      setSaveStatus({ type: 'info', message: 'Settings reset to saved values' });
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: FaCog },
    { id: 'business', label: 'Hotel or Restaurant', icon: FaStore },
    { id: 'notifications', label: 'Notifications', icon: FaBell },
    { id: 'security', label: 'Security', icon: FaShieldAlt },
    { id: 'payment', label: 'Payment', icon: FaRupeeSign }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-theme-text-secondary font-raleway font-medium mb-2">
                  Zone Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={settings.general.zoneName}
                  onChange={(e) => handleSettingChange('general', 'zoneName', e.target.value)}
                  className="input-theme w-full px-4 py-3 rounded-lg font-raleway autofill-fix"
                  required
                />
              </div>

              <div>
                <label className="block text-theme-text-secondary font-raleway font-medium mb-2">
                  Owner Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={settings.general.ownerName}
                  onChange={(e) => handleSettingChange('general', 'ownerName', e.target.value)}
                  className="input-theme w-full px-4 py-3 rounded-lg font-raleway autofill-fix"
                  required
                />
              </div>

              <div>
                <label className="block text-theme-text-secondary font-raleway font-medium mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={settings.general.ownerEmail}
                  onChange={(e) => handleSettingChange('general', 'ownerEmail', e.target.value)}
                  className="input-theme w-full px-4 py-3 rounded-lg font-raleway autofill-fix"
                  required
                />
              </div>

              <div>
                <label className="block text-theme-text-secondary font-raleway font-medium mb-2">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={settings.general.ownerPhone}
                  onChange={(e) => handleSettingChange('general', 'ownerPhone', e.target.value)}
                  className="input-theme w-full px-4 py-3 rounded-lg font-raleway autofill-fix"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-theme-text-secondary font-raleway font-medium mb-2">
                Description
              </label>
              <textarea
                value={settings.general.description}
                onChange={(e) => handleSettingChange('general', 'description', e.target.value)}
                rows="3"
                className="input-theme w-full px-4 py-3 rounded-lg font-raleway autofill-fix"
                placeholder="Brief description of your zone"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-theme-text-secondary font-raleway font-medium mb-2">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={settings.general.city}
                  onChange={(e) => handleSettingChange('general', 'city', e.target.value)}
                  className="input-theme w-full px-4 py-3 rounded-lg font-raleway autofill-fix"
                  required
                />
              </div>

              <div>
                <label className="block text-theme-text-secondary font-raleway font-medium mb-2">
                  State <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={settings.general.state}
                  onChange={(e) => handleSettingChange('general', 'state', e.target.value)}
                  className="input-theme w-full px-4 py-3 rounded-lg font-raleway autofill-fix"
                  required
                />
              </div>

              <div>
                <label className="block text-theme-text-secondary font-raleway font-medium mb-2">
                  ZIP Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={settings.general.zipCode}
                  onChange={(e) => handleSettingChange('general', 'zipCode', e.target.value)}
                  className="input-theme w-full px-4 py-3 rounded-lg font-raleway autofill-fix"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-theme-text-secondary font-raleway font-medium mb-2">
                Address <span className="text-red-500">*</span>
              </label>
              <textarea
                value={settings.general.address}
                onChange={(e) => handleSettingChange('general', 'address', e.target.value)}
                rows="2"
                className="input-theme w-full px-4 py-3 rounded-lg font-raleway autofill-fix"
                placeholder="Complete address"
                required
              />
            </div>
          </div>
        );

      case 'business':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-theme-text-secondary font-raleway font-medium mb-2">
                  Max Vendors <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.business.maxVendors}
                  onChange={(e) => handleSettingChange('business', 'maxVendors', parseInt(e.target.value))}
                  className="input-theme w-full px-4 py-3 rounded-lg font-raleway autofill-fix"
                  required
                />
              </div>

              <div>
                <label className="block text-theme-text-secondary font-raleway font-medium mb-2">
                  Max Tables per Vendor
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={settings.business.maxTablesPerVendor}
                  onChange={(e) => handleSettingChange('business', 'maxTablesPerVendor', parseInt(e.target.value))}
                  className="input-theme w-full px-4 py-3 rounded-lg font-raleway autofill-fix"
                />
              </div>

              <div>
                <label className="block text-theme-text-secondary font-raleway font-medium mb-2">
                  Commission Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  step="0.1"
                  value={settings.business.commissionRate}
                  onChange={(e) => handleSettingChange('business', 'commissionRate', parseFloat(e.target.value))}
                  className="input-theme w-full px-4 py-3 rounded-lg font-raleway autofill-fix"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-theme-text-secondary font-raleway font-medium mb-2">
                  Service Charge (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.50"
                  value={settings.business.serviceCharge}
                  onChange={(e) => handleSettingChange('business', 'serviceCharge', parseFloat(e.target.value))}
                  className="input-theme w-full px-4 py-3 rounded-lg font-raleway autofill-fix"
                />
              </div>

              <div>
                <label className="block text-theme-text-secondary font-raleway font-medium mb-2">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  step="0.1"
                  value={settings.business.taxRate}
                  onChange={(e) => handleSettingChange('business', 'taxRate', parseFloat(e.target.value))}
                  className="input-theme w-full px-4 py-3 rounded-lg font-raleway autofill-fix"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-theme-bg-secondary rounded-lg">
                <div>
                  <h4 className="font-raleway font-medium text-theme-text-primary">Auto-approve Vendors</h4>
                  <p className="text-sm text-theme-text-secondary">Automatically approve new vendor registrations</p>
                </div>
                <button
                  onClick={() => handleSettingChange('business', 'autoApproveVendors', !settings.business.autoApproveVendors)}
                  className={`text-2xl ${settings.business.autoApproveVendors ? 'text-green-500' : 'text-gray-400'}`}
                >
                  {settings.business.autoApproveVendors ? <FaToggleOn /> : <FaToggleOff />}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-theme-bg-secondary rounded-lg">
                <div>
                  <h4 className="font-raleway font-medium text-theme-text-primary">Allow Vendor Registration</h4>
                  <p className="text-sm text-theme-text-secondary">Allow new vendors to register for your zone</p>
                </div>
                <button
                  onClick={() => handleSettingChange('business', 'allowVendorRegistration', !settings.business.allowVendorRegistration)}
                  className={`text-2xl ${settings.business.allowVendorRegistration ? 'text-green-500' : 'text-gray-400'}`}
                >
                  {settings.business.allowVendorRegistration ? <FaToggleOn /> : <FaToggleOff />}
                </button>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(settings.notifications).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-4 bg-theme-bg-secondary rounded-lg">
                  <div>
                    <h4 className="font-raleway font-medium text-theme-text-primary capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </h4>
                    <p className="text-sm text-theme-text-secondary">
                      {key === 'emailNotifications' && 'Receive notifications via email'}
                      {key === 'smsNotifications' && 'Receive notifications via SMS'}
                      {key === 'newVendorAlerts' && 'Get notified when new vendors register'}
                      {key === 'orderAlerts' && 'Get notified about new orders'}
                      {key === 'paymentAlerts' && 'Get notified about payments'}
                      {key === 'systemAlerts' && 'Receive system maintenance alerts'}
                      {key === 'weeklyReports' && 'Receive weekly performance reports'}
                      {key === 'monthlyReports' && 'Receive monthly analytics reports'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleSettingChange('notifications', key, !value)}
                    className={`text-2xl ${value ? 'text-green-500' : 'text-gray-400'}`}
                  >
                    {value ? <FaToggleOn /> : <FaToggleOff />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-theme-text-secondary font-raleway font-medium mb-2">
                  Session Timeout (minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={settings.security.sessionTimeout}
                  onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
                  className="input-theme w-full px-4 py-3 rounded-lg font-raleway autofill-fix"
                />
              </div>

              <div>
                <label className="block text-theme-text-secondary font-raleway font-medium mb-2">
                  Password Expiry (days)
                </label>
                <input
                  type="number"
                  min="30"
                  max="365"
                  value={settings.security.passwordExpiry}
                  onChange={(e) => handleSettingChange('security', 'passwordExpiry', parseInt(e.target.value))}
                  className="input-theme w-full px-4 py-3 rounded-lg font-raleway autofill-fix"
                />
              </div>
            </div>

            <div className="space-y-4">
              {['twoFactorAuth', 'loginAlerts', 'allowVendorDataExport', 'requireVendorVerification'].map((key) => (
                <div key={key} className="flex items-center justify-between p-4 bg-theme-bg-secondary rounded-lg">
                  <div>
                    <h4 className="font-raleway font-medium text-theme-text-primary capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </h4>
                    <p className="text-sm text-theme-text-secondary">
                      {key === 'twoFactorAuth' && 'Enable two-factor authentication for enhanced security'}
                      {key === 'loginAlerts' && 'Get notified about login attempts'}
                      {key === 'allowVendorDataExport' && 'Allow vendors to export their data'}
                      {key === 'requireVendorVerification' && 'Require verification for new vendors'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleSettingChange('security', key, !settings.security[key])}
                    className={`text-2xl ${settings.security[key] ? 'text-green-500' : 'text-gray-400'}`}
                  >
                    {settings.security[key] ? <FaToggleOn /> : <FaToggleOff />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      case 'payment':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-theme-text-secondary font-raleway font-medium mb-2">
                  UPI ID
                </label>
                <input
                  type="text"
                  value={settings.payment.upiId}
                  onChange={(e) => handleSettingChange('payment', 'upiId', e.target.value)}
                  className="input-theme w-full px-4 py-3 rounded-lg font-raleway autofill-fix"
                  placeholder="yourname@paytm"
                />
              </div>

              <div>
                <label className="block text-theme-text-secondary font-raleway font-medium mb-2">
                  Payment Model
                </label>
                <select
                  value={settings.payment.paymentModel}
                  onChange={(e) => handleSettingChange('payment', 'paymentModel', e.target.value)}
                  className="input-theme w-full px-4 py-3 rounded-lg font-raleway"
                >
                  <option value="zone-wise">Zone-wise Collection</option>
                  <option value="vendor-wise">Vendor-wise Collection</option>
                </select>
              </div>

              <div>
                <label className="block text-theme-text-secondary font-raleway font-medium mb-2">
                  Settlement Frequency
                </label>
                <select
                  value={settings.payment.settlementFrequency}
                  onChange={(e) => handleSettingChange('payment', 'settlementFrequency', e.target.value)}
                  className="input-theme w-full px-4 py-3 rounded-lg font-raleway"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-theme-text-secondary font-raleway font-medium mb-2">
                  Minimum Settlement (₹)
                </label>
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={settings.payment.minimumSettlement}
                  onChange={(e) => handleSettingChange('payment', 'minimumSettlement', parseInt(e.target.value))}
                  className="input-theme w-full px-4 py-3 rounded-lg font-raleway autofill-fix"
                />
              </div>
            </div>

            <div className="space-y-4">
              {['autoSettlement', 'acceptCash', 'acceptUPI', 'acceptCards'].map((key) => (
                <div key={key} className="flex items-center justify-between p-4 bg-theme-bg-secondary rounded-lg">
                  <div>
                    <h4 className="font-raleway font-medium text-theme-text-primary capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </h4>
                    <p className="text-sm text-theme-text-secondary">
                      {key === 'autoSettlement' && 'Automatically settle payments based on frequency'}
                      {key === 'acceptCash' && 'Accept cash payments from customers'}
                      {key === 'acceptUPI' && 'Accept UPI payments from customers'}
                      {key === 'acceptCards' && 'Accept card payments from customers'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleSettingChange('payment', key, !settings.payment[key])}
                    className={`text-2xl ${settings.payment[key] ? 'text-green-500' : 'text-gray-400'}`}
                  >
                    {settings.payment[key] ? <FaToggleOn /> : <FaToggleOff />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return <div>Content for {activeTab} tab</div>;
    }
  };

  // Show access denied message for non-zone-admin users
  if (!hasPermission) {
    return (
      <ZoneAdminLayout>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="admin-card rounded-2xl p-8 text-center">
            <FaShieldAlt className="text-6xl text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-fredoka text-theme-text-primary mb-2">Access Denied</h2>
            <p className="text-theme-text-secondary font-raleway mb-4">
              You don't have permission to access zone settings. Only zone administrators can modify these settings.
            </p>
            <p className="text-sm text-theme-text-tertiary font-raleway">
              Current role: <span className="font-semibold">{user?.role || 'Unknown'}</span>
            </p>
          </div>
        </div>
      </ZoneAdminLayout>
    );
  }

  return (
    <ZoneAdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-fredoka text-theme-text-primary mb-2">Zone Settings</h1>
            <p className="text-theme-text-secondary font-raleway text-sm sm:text-base">
              Configure your zone preferences and business settings
            </p>
          </div>

          <div className="flex space-x-3 mt-4 sm:mt-0">
            <button
              onClick={resetSettings}
              disabled={!hasChanges}
              className="btn-secondary px-4 py-2 rounded-lg font-raleway font-semibold flex items-center space-x-2 disabled:opacity-50"
            >
              <FaUndo />
              <span>Reset</span>
            </button>
            <button
              onClick={saveSettings}
              disabled={loading || !hasChanges}
              className="btn-primary px-4 py-2 rounded-lg font-raleway font-semibold flex items-center space-x-2 disabled:opacity-50"
            >
              <FaSave />
              <span>{loading ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>

        {/* Status Message */}
        {saveStatus && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
              saveStatus.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
              saveStatus.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
              'bg-blue-100 text-blue-800 border border-blue-200'
            }`}
          >
            {saveStatus.type === 'success' ? <FaCheckCircle /> : <FaExclamationTriangle />}
            <span className="font-raleway">{saveStatus.message}</span>
          </motion.div>
        )}

        <div className="admin-card rounded-2xl overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-theme-border-primary">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-2 border-b-2 font-raleway font-medium text-sm flex items-center space-x-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-theme-accent-primary text-theme-accent-primary'
                      : 'border-transparent text-theme-text-secondary hover:text-theme-text-primary'
                  }`}
                >
                  <tab.icon />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </ZoneAdminLayout>
  );
};

export default ZoneSettings;
