import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  FaCog,
  FaBell,
  FaUser,
  FaStore,
  FaCreditCard,
  FaGlobe,
  FaMoon,
  FaShieldAlt,
  FaSun,
  FaToggleOn,
  FaToggleOff,
  FaSave,
  FaEdit,
  FaKey,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt
} from 'react-icons/fa';
import SingleRestaurantLayout from '../../components/owner/SingleRestaurantLayout';

const Settings = () => {
  const { restaurantId } = useParams();
  const { user } = useSelector((state) => state.ui.auth);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    general: {
      restaurantName: 'Bella Vista Restaurant',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      language: 'en',
      dateFormat: 'DD/MM/YYYY'
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      orderAlerts: true,
      lowStockAlerts: true,
      customerReviews: true,
      promotionalEmails: false
    },
    appearance: {
      theme: 'light',
      primaryColor: '#3B82F6',
      fontSize: 'medium',
      compactMode: false
    },
    business: {
      autoAcceptOrders: false,
      maxOrdersPerHour: 50,
      preparationTime: 25,
      deliveryRadius: 5,
      minimumOrderValue: 15.00,
      taxRate: 8.5,
      serviceCharge: 2.50
    },
    security: {
      twoFactorAuth: false,
      sessionTimeout: 30,
      passwordExpiry: 90,
      loginAlerts: true
    },
    integrations: {
      googleAnalytics: false,
      facebookPixel: false,
      mailchimp: false,
      stripe: true,
      paypal: false
    }
  });

  useEffect(() => {
    loadSettings();
  }, [restaurantId]);

  const loadSettings = () => {
    try {
      // In a real app, this would fetch from an API
      const savedSettings = localStorage.getItem(`settings_${restaurantId}`);
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (category, key, value) => {
    const updatedSettings = {
      ...settings,
      [category]: {
        ...settings[category],
        [key]: value
      }
    };
    setSettings(updatedSettings);
    localStorage.setItem(`settings_${restaurantId}`, JSON.stringify(updatedSettings));
  };

  const saveAllSettings = () => {
    localStorage.setItem(`settings_${restaurantId}`, JSON.stringify(settings));
    // In a real app, this would send to an API
    alert('Settings saved successfully!');
  };

  const tabs = [
    { id: 'general', label: 'General', icon: FaCog },
    { id: 'notifications', label: 'Notifications', icon: FaBell },
    { id: 'security', label: 'Security', icon: FaShieldAlt },
  ];

  if (loading) {
    return (
      <SingleRestaurantLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-secondary font-raleway">Loading settings...</p>
          </div>
        </div>
      </SingleRestaurantLayout>
    );
  }

  return (
    <SingleRestaurantLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-fredoka text-secondary mb-2">Restaurant Settings</h1>
            <p className="text-secondary font-raleway text-sm sm:text-base">Configure your restaurant preferences and settings</p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={saveAllSettings}
            className="mt-4 sm:mt-0 btn-primary px-6 py-3 rounded-xl font-raleway font-semibold flex items-center space-x-2"
          >
            <FaSave />
            <span>Save All Changes</span>
          </motion.button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Settings Navigation */}
          <div className="lg:col-span-1">
            <div className="admin-card rounded-2xl p-4">
              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-raleway text-sm transition-colors ${activeTab === tab.id
                        ? 'bg-theme-accent-primary text-theme-text-inverse'
                        : 'text-theme-text-primary hover:bg-theme-bg-secondary'
                        }`}
                    >
                      <Icon />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            <div className="admin-card rounded-2xl p-6">
              {/* General Settings */}
              {activeTab === 'general' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <h2 className="text-xl font-fredoka text-theme-text-primary mb-4">General Settings</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-theme-text-primary font-raleway font-medium mb-2">Restaurant Name</label>
                      <input
                        type="text"
                        value={settings.general.restaurantName}
                        onChange={(e) => updateSetting('general', 'restaurantName', e.target.value)}
                        className="w-full px-4 py-3 border border-theme-border-primary rounded-lg bg-theme-bg-primary text-theme-text-primary focus:outline-none focus:border-theme-accent-primary autofill-protected"
                      />
                    </div>

                    <div>
                      <label className="block text-theme-text-primary font-raleway font-medium mb-2">Timezone</label>
                      <select
                        value={settings.general.timezone}
                        onChange={(e) => updateSetting('general', 'timezone', e.target.value)}
                        className="w-full px-4 py-3 border border-theme-border-primary rounded-lg bg-theme-bg-primary text-theme-text-primary focus:outline-none focus:border-theme-accent-primary autofill-protected"
                      >
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-theme-text-primary font-raleway font-medium mb-2">Currency</label>
                      <select
                        value={settings.general.currency}
                        onChange={(e) => updateSetting('general', 'currency', e.target.value)}
                        className="w-full px-4 py-3 border border-theme-border-primary rounded-lg bg-theme-bg-primary text-theme-text-primary focus:outline-none focus:border-theme-accent-primary autofill-protected"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="CAD">CAD (C$)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-theme-text-primary font-raleway font-medium mb-2">Language</label>
                      <select
                        value={settings.general.language}
                        onChange={(e) => updateSetting('general', 'language', e.target.value)}
                        className="w-full px-4 py-3 border border-theme-border-primary rounded-lg bg-theme-bg-primary text-theme-text-primary focus:outline-none focus:border-theme-accent-primary autofill-protected"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Notifications Settings */}
              {activeTab === 'notifications' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <h2 className="text-xl font-fredoka text-theme-text-primary mb-4">Notification Preferences</h2>

                  <div className="space-y-4">
                    {Object.entries(settings.notifications).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-4 bg-theme-bg-secondary rounded-lg">
                        <div>
                          <h3 className="text-theme-text-primary font-raleway font-medium capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </h3>
                          <p className="text-theme-text-secondary font-raleway text-sm">
                            {key === 'emailNotifications' && 'Receive notifications via email'}
                            {key === 'smsNotifications' && 'Receive notifications via SMS'}
                            {key === 'pushNotifications' && 'Receive push notifications in browser'}
                            {key === 'orderAlerts' && 'Get notified when new orders arrive'}
                            {key === 'lowStockAlerts' && 'Get notified when items are low in stock'}
                            {key === 'customerReviews' && 'Get notified about new customer reviews'}
                            {key === 'promotionalEmails' && 'Receive promotional emails from TableServe'}
                          </p>
                        </div>
                        <button
                          onClick={() => updateSetting('notifications', key, !value)}
                          className={`text-2xl ${value ? 'text-theme-accent-primary' : 'text-theme-text-tertiary'}`}
                        >
                          {value ? <FaToggleOn /> : <FaToggleOff />}
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}


              {/* Security Settings */}
              {activeTab === 'security' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <h2 className="text-xl font-fredoka text-theme-text-primary mb-4">Security Settings</h2>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-theme-bg-secondary rounded-lg">
                      <div>
                        <h3 className="text-theme-text-primary font-raleway font-medium">Two-Factor Authentication</h3>
                        <p className="text-theme-text-secondary font-raleway text-sm">Add an extra layer of security to your account</p>
                      </div>
                      <button
                        onClick={() => updateSetting('security', 'twoFactorAuth', !settings.security.twoFactorAuth)}
                        className={`text-2xl ${settings.security.twoFactorAuth ? 'text-theme-accent-primary' : 'text-theme-text-tertiary'}`}
                      >
                        {settings.security.twoFactorAuth ? <FaToggleOn /> : <FaToggleOff />}
                      </button>
                    </div>

                    <div>
                      <label className="block text-theme-text-primary font-raleway font-medium mb-2">Session Timeout (minutes)</label>
                      <input
                        type="number"
                        value={settings.security.sessionTimeout}
                        onChange={(e) => updateSetting('security', 'sessionTimeout', parseInt(e.target.value))}
                        className="w-full px-4 py-3 border border-theme-border-primary rounded-lg bg-theme-bg-primary text-theme-text-primary focus:outline-none focus:border-theme-accent-primary autofill-protected"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-theme-bg-secondary rounded-lg">
                      <div>
                        <h3 className="text-theme-text-primary font-raleway font-medium">Login Alerts</h3>
                        <p className="text-theme-text-secondary font-raleway text-sm">Get notified of new login attempts</p>
                      </div>
                      <button
                        onClick={() => updateSetting('security', 'loginAlerts', !settings.security.loginAlerts)}
                        className={`text-2xl ${settings.security.loginAlerts ? 'text-theme-accent-primary' : 'text-theme-text-tertiary'}`}
                      >
                        {settings.security.loginAlerts ? <FaToggleOn /> : <FaToggleOff />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Integrations Settings */}
              {activeTab === 'integrations' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <h2 className="text-xl font-fredoka text-theme-text-primary mb-4">Third-party Integrations</h2>

                  <div className="space-y-4">
                    {Object.entries(settings.integrations).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-4 bg-theme-bg-secondary rounded-lg">
                        <div>
                          <h3 className="text-theme-text-primary font-raleway font-medium capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </h3>
                          <p className="text-theme-text-secondary font-raleway text-sm">
                            {key === 'googleAnalytics' && 'Track website analytics and customer behavior'}
                            {key === 'facebookPixel' && 'Track conversions and optimize Facebook ads'}
                            {key === 'mailchimp' && 'Sync customer data for email marketing'}
                            {key === 'stripe' && 'Process credit card payments securely'}
                            {key === 'paypal' && 'Accept PayPal payments from customers'}
                          </p>
                        </div>
                        <button
                          onClick={() => updateSetting('integrations', key, !value)}
                          className={`text-2xl ${value ? 'text-theme-accent-primary' : 'text-theme-text-tertiary'}`}
                        >
                          {value ? <FaToggleOn /> : <FaToggleOff />}
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </SingleRestaurantLayout>
  );
};

export default Settings;
