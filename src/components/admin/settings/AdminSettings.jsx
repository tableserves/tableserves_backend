import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FaCog, 
  FaDatabase,
  FaShieldAlt,
  FaBell,
  FaGlobe,
  FaUsers,
  FaKey,
  FaSave,
  FaDownload,
  FaUpload,
  FaTrash,
  FaExclamationTriangle
} from 'react-icons/fa';
import SuperAdminLayout from '../SuperAdminLayout';

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    general: {
      platformName: 'TableServe',
      platformDescription: 'Digital Menu & Ordering Platform',
      supportEmail: 'support@tableserve.com',
      maintenanceMode: false,
      allowRegistrations: true
    },
    security: {
      sessionTimeout: 30,
      passwordMinLength: 8,
      requireTwoFactor: false,
      allowPasswordReset: true,
      maxLoginAttempts: 5
    },
    notifications: {
      emailNotifications: true,
      
      orderAlerts: true,
      systemAlerts: true
    },
    database: {
      autoBackup: true,
      backupFrequency: 'daily',
      retentionDays: 30,
      lastBackup: '2024-01-20T10:30:00Z'
    }
  });

  const tabs = [
    { id: 'general', label: 'General', icon: FaCog },
    { id: 'security', label: 'Security', icon: FaShieldAlt },
    { id: 'notifications', label: 'Notifications', icon: FaBell },
  ];

  const handleSettingChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const handleSaveSettings = () => {
    // In a real app, this would save to backend
    console.log('Saving settings:', settings);
    alert('Settings saved successfully!');
  };

  const handleExportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tableserve-settings.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-theme-text-primary font-raleway font-medium mb-2">Platform Name</label>
       <p className='border rounded-md p-2 border-black/20 cursor-not-allowed'>TableServes </p>
      </div>
      <div>
        <label className="block text-theme-text-primary font-raleway font-medium mb-2">Platform Description</label>
        <textarea
          value={settings.general.platformDescription}
          onChange={(e) => handleSettingChange('general', 'platformDescription', e.target.value)}
          className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none h-24 resize-none"
        />
      </div>
      <div>
        <label className="block text-theme-text-primary font-raleway font-medium mb-2">Support Email</label>
        <input
          type="email"
          value={settings.general.supportEmail}
          onChange={(e) => handleSettingChange('general', 'supportEmail', e.target.value)}
          className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none"
        />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-theme-text-primary font-raleway font-medium">Maintenance Mode</h3>
          <p className="text-theme-text-secondary font-raleway text-sm">Temporarily disable platform access</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.general.maintenanceMode}
            onChange={(e) => handleSettingChange('general', 'maintenanceMode', e.target.checked)}
            className="sr-only peer"
          />
          <div className="relative w-11 h-6 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-500"></div>
        </label>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-theme-text-primary font-raleway font-medium">Allow New Registrations</h3>
          <p className="text-theme-text-secondary font-raleway text-sm">Allow new restaurants to register</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.general.allowRegistrations}
            onChange={(e) => handleSettingChange('general', 'allowRegistrations', e.target.checked)}
            className="sr-only peer"
          />
          <div className="relative w-11 h-6 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-500"></div>
        </label>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-theme-text-primary font-raleway font-medium mb-2">Session Timeout (minutes)</label>
        <input
          type="number"
          value={settings.security.sessionTimeout}
          onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
          className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none"
          min="5"
          max="480"
        />
      </div>
      <div>
        <label className="block text-theme-text-primary font-raleway font-medium mb-2">Minimum Password Length</label>
        <input
          type="number"
          value={settings.security.passwordMinLength}
          onChange={(e) => handleSettingChange('security', 'passwordMinLength', parseInt(e.target.value))}
          className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none"
          min="6"
          max="32"
        />
      </div>
      <div>
        <label className="block text-theme-text-primary font-raleway font-medium mb-2">Max Login Attempts</label>
        <input
          type="number"
          value={settings.security.maxLoginAttempts}
          onChange={(e) => handleSettingChange('security', 'maxLoginAttempts', parseInt(e.target.value))}
          className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none"
          min="3"
          max="10"
        />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-theme-text-primary font-raleway font-medium">Require Two-Factor Authentication</h3>
          <p className="text-theme-text-secondary font-raleway text-sm">Require 2FA for all admin accounts</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.security.requireTwoFactor}
            onChange={(e) => handleSettingChange('security', 'requireTwoFactor', e.target.checked)}
            className="sr-only peer"
          />
          <div className="relative w-11 h-6 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-500"></div>
        </label>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      {Object.entries(settings.notifications).map(([key, value]) => (
        <div key={key} className="flex items-center justify-between">
          <div>
            <h3 className="text-theme-text-primary font-raleway font-medium capitalize">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </h3>
            <p className="text-theme-text-secondary font-raleway text-sm">
              {key === 'emailNotifications' && 'Send notifications via email'}
             {key === 'orderAlerts' && 'Alert for new orders'}
              {key === 'systemAlerts' && 'Alert for system events'}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => handleSettingChange('notifications', key, e.target.checked)}
              className="sr-only peer"
            />
            <div className="relative w-11 h-6 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-500"></div>
          </label>
        </div>
      ))}
    </div>
  );

  
  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-fredoka text-theme-text-primary mb-2">Platform Settings</h1>
            <p className="text-theme-text-secondary font-raleway text-sm sm:text-base">Configure platform-wide settings and preferences</p>
          </div>
          <div className="flex space-x-2">
            
            <button
              onClick={handleSaveSettings}
              className="btn-primary px-4 py-2 rounded-lg font-raleway flex items-center space-x-2"
            >
              <FaSave />
              <span>Save Changes</span>
            </button>
          </div>
        </div>

        {/* Settings Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Tabs */}
          <div className="lg:col-span-1">
            <div className="admin-card rounded-2xl p-4">
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors font-raleway ${
                      activeTab === tab.id
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
                {activeTab === 'general' && renderGeneralSettings()}
                {activeTab === 'security' && renderSecuritySettings()}
                {activeTab === 'notifications' && renderNotificationSettings()}
                {activeTab === 'database' && renderDatabaseSettings()}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default AdminSettings;
