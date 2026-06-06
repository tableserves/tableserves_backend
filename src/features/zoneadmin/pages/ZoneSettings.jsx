import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import DatabaseService from '../../../services/DatabaseService';
import EmailOTPVerification from '../../../components/common/EmailOTPVerification';
import { usePlanRestrictions } from '../../subscription/components/PlanRestrictions';
import {
  FaCog,
  FaStore,
  FaShieldAlt,
  FaSave,
  FaUndo,
  FaCheckCircle,
  FaExclamationTriangle,
  FaBuilding,
  FaTable,
  FaCrown,
  FaArrowRight
} from 'react-icons/fa';
import ZoneAdminLayout from './ZoneAdminLayout';

// Helper function to map operating hours
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

const ZoneSettings = () => {
  const { zoneId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.ui.auth);
  const { subscription, currentCounts, subscriptionLimits } = usePlanRestrictions();

  const hasPermission = user?.role === 'zone_admin';
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(null);

  const [settings, setSettings] = useState({
    general: {
      zoneName: '', description: '', ownerName: '', ownerEmail: '', ownerPhone: '',
      address: '', city: '', state: '', zipCode: '', timezone: 'Asia/Kolkata'
    },
    business: {
      maxVendors: 20, maxTablesPerVendor: 15
    }
  });

  useEffect(() => {
    loadSettings();
  }, [zoneId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const zoneData = await DatabaseService.getZone(zoneId);
      if (zoneData) {
        const mappedSettings = {
          general: {
            zoneName: zoneData.name || '',
            description: zoneData.description || '',
            ownerName: zoneData.ownerName || zoneData.adminId?.profile?.name || '',
            ownerEmail: zoneData.contactInfo?.email || zoneData.ownerEmail || zoneData.adminId?.email || '',
            ownerPhone: zoneData.contactInfo?.phone || zoneData.ownerPhone || zoneData.adminId?.phone || '',
            address: zoneData.location || zoneData.address || '',
            city: zoneData.city || '',
            state: zoneData.state || '',
            zipCode: zoneData.zipCode || '',
            timezone: 'Asia/Kolkata'
          },
          business: {
            operatingHours: mapOperatingHours(zoneData.settings?.operatingHours),
            maxVendors: zoneData.maxVendors || zoneData.settings?.maxVendors || 20,
            maxTablesPerVendor: zoneData.maxTables || zoneData.settings?.maxTables || 15,
          }
        };
        setSettings(mappedSettings);
        setHasChanges(false);
      }
    } catch (error) {
      console.error('ZoneSettings: Error loading zone settings', error);
      setSaveStatus({ type: 'error', message: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value }
    }));
    setHasChanges(true);
  };

  const validateForm = () => {
    if (!settings.general.zoneName?.trim()) {
      setSaveStatus({ type: 'error', message: 'Zone name is required' });
      return false;
    }
    if (!settings.general.ownerEmail?.trim()) {
      setSaveStatus({ type: 'error', message: 'Owner email is required' });
      return false;
    }
    return true;
  };

  const saveSettings = async () => {
    if (!validateForm()) return;
    setPendingChanges(settings);
    setShowOTPVerification(true);
  };

  const handleOTPVerified = async () => {
    if (!pendingChanges) return;
    setLoading(true);
    try {
      const updateData = {
        name: pendingChanges.general.zoneName,
        description: pendingChanges.general.description,
        location: pendingChanges.general.address,
        contactInfo: {
          phone: pendingChanges.general.ownerPhone,
          email: pendingChanges.general.ownerEmail
        },
        ownerName: pendingChanges.general.ownerName,
        ownerEmail: pendingChanges.general.ownerEmail,
        ownerPhone: pendingChanges.general.ownerPhone,
        address: pendingChanges.general.address,
        city: pendingChanges.general.city,
        state: pendingChanges.general.state,
        zipCode: pendingChanges.general.zipCode,
        settings: {
          operatingHours: mapOperatingHoursToBackend(pendingChanges.business?.operatingHours),
          maxVendors: pendingChanges.business?.maxVendors || 50,
          maxTables: pendingChanges.business?.maxTablesPerVendor || 100,
          theme: {
            primaryColor: '#2563eb',
            secondaryColor: '#64748b',
            logoUrl: null
          }
        },
        maxVendors: pendingChanges.business?.maxVendors || 50,
        maxTables: pendingChanges.business?.maxTablesPerVendor || 100,
        timezone: pendingChanges.general.timezone
      };
      
      const response = await DatabaseService.saveData(`/zones/${zoneId}`, updateData, 'PUT');
      if (response) {
        setHasChanges(false);
        setSaveStatus({ type: 'success', message: 'Settings updated successfully!' });
        setTimeout(() => loadSettings(), 1000);
      }
    } catch (error) {
      setSaveStatus({ type: 'error', message: error.message || 'Failed to save settings' });
    } finally {
      setLoading(false);
      setPendingChanges(null);
      setShowOTPVerification(false);
      setTimeout(() => setSaveStatus(null), 5000);
    }
  };

  const handleOTPCancel = () => {
    setShowOTPVerification(false);
    setPendingChanges(null);
    setSaveStatus({ type: 'error', message: 'Update cancelled' });
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const resetSettings = () => {
    if (window.confirm('Reset all settings to last saved values?')) {
      loadSettings();
      setHasChanges(false);
      setSaveStatus({ type: 'info', message: 'Settings reset' });
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const tabs = [
    { id: 'general', label: 'General Info', icon: FaCog },
    { id: 'business', label: 'Shop & Table Limits', icon: FaStore },
  ];

  if (!hasPermission) {
    return (
      <ZoneAdminLayout>
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="bg-theme-bg-secondary border border-theme-border-primary rounded-3xl p-10 text-center max-w-md shadow-2xl">
            <div className="w-20 h-20 bg-status-error/10 text-status-error rounded-full flex items-center justify-center mx-auto mb-6">
              <FaShieldAlt className="text-4xl" />
            </div>
            <h2 className="text-2xl font-fredoka text-theme-text-primary mb-2">Access Denied</h2>
            <p className="text-theme-text-secondary font-raleway mb-6 text-sm">
              You do not have permission to view or modify zone settings. This area is restricted to Zone Administrators.
            </p>
            <button onClick={() => navigate(`/zone/${zoneId}/dashboard`)} className="px-6 py-3 bg-theme-bg-hover text-theme-text-primary rounded-xl font-raleway font-bold transition-colors">
              Return to Dashboard
            </button>
          </div>
        </div>
      </ZoneAdminLayout>
    );
  }

  return (
    <ZoneAdminLayout>
      <div className="min-h-screen bg-theme-bg-primary pb-20">
        
        {/* Save Status Toast */}
        <AnimatePresence>
          {saveStatus && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className={`fixed top-24 right-8 z-50 px-6 py-4 rounded-xl shadow-2xl border flex items-center gap-3 backdrop-blur-md ${
                saveStatus.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-600' :
                saveStatus.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-600' :
                'bg-blue-500/10 border-blue-500/30 text-blue-600'
              }`}
            >
              {saveStatus.type === 'success' ? <FaCheckCircle size={20} /> : <FaExclamationTriangle size={20} />}
              <span className="font-raleway font-semibold text-sm">{saveStatus.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ambient Top Background */}
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-theme-accent-primary/5 to-transparent pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
          
          {/* Sticky Header with Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sticky top-[80px] z-30 bg-theme-bg-primary/80 backdrop-blur-xl py-4 border-b border-theme-border-primary">
            <div>
              <h1 className="text-3xl font-fredoka text-theme-text-primary mb-1">Zone Settings</h1>
              <p className="text-theme-text-tertiary font-raleway text-sm">
                Configure your zone preferences and business rules
              </p>
            </div>
            <div className="flex space-x-3 w-full sm:w-auto">
              <button
                onClick={resetSettings}
                disabled={!hasChanges || loading}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-theme-bg-secondary border border-theme-border-primary text-theme-text-secondary rounded-xl font-raleway font-bold hover:bg-theme-bg-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <FaUndo size={14} />
                <span>Reset</span>
              </button>
              <button
                onClick={saveSettings}
                disabled={!hasChanges || loading}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-theme-accent-primary text-white rounded-xl font-raleway font-bold hover:bg-theme-accent-secondary transition-all shadow-lg shadow-theme-accent-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <FaSave size={14} />
                <span>{loading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>

          {/* Horizontal Segmented Tabs (Replaces left sidebar) */}
          <div className="flex items-center gap-2 mb-8 bg-theme-bg-secondary/50 border border-theme-border-primary p-1.5 rounded-2xl overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[160px] flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-raleway font-bold text-sm transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-theme-accent-primary text-white shadow-md'
                    : 'text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-hover'
                }`}
              >
                <tab.icon size={16} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Main Content Area - Now full width */}
          <div className="w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="bg-theme-bg-secondary border border-theme-border-primary rounded-3xl p-6 sm:p-10 shadow-sm"
              >
                
                {/* --- GENERAL TAB --- */}
                {activeTab === 'general' && (
                  <div className="space-y-10">
                    <div>
                      <h2 className="text-2xl font-fredoka text-theme-text-primary mb-6">General Information</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-2">Zone Name *</label>
                          <input
                            type="text"
                            value={settings.general.zoneName}
                            onChange={(e) => handleSettingChange('general', 'zoneName', e.target.value)}
                            className="w-full px-4 py-3.5 rounded-xl border border-theme-border-primary bg-theme-bg-primary text-theme-text-primary font-raleway focus:outline-none focus:ring-2 focus:ring-theme-accent-primary/50 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-2">Description</label>
                          <input
                            type="text"
                            value={settings.general.description}
                            onChange={(e) => handleSettingChange('general', 'description', e.target.value)}
                            className="w-full px-4 py-3.5 rounded-xl border border-theme-border-primary bg-theme-bg-primary text-theme-text-primary font-raleway focus:outline-none focus:ring-2 focus:ring-theme-accent-primary/50 transition-all"
                            placeholder="Brief description"
                          />
                        </div>
                      </div>
                    </div>

                    <hr className="border-theme-border-primary" />

                    <div>
                      <h2 className="text-2xl font-fredoka text-theme-text-primary mb-6">Owner Contact</h2>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-2">Full Name *</label>
                          <input
                            type="text"
                            value={settings.general.ownerName}
                            onChange={(e) => handleSettingChange('general', 'ownerName', e.target.value)}
                            className="w-full px-4 py-3.5 rounded-xl border border-theme-border-primary bg-theme-bg-primary text-theme-text-primary font-raleway focus:outline-none focus:ring-2 focus:ring-theme-accent-primary/50 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-2">Email Address *</label>
                          <input
                            type="email"
                            value={settings.general.ownerEmail}
                            onChange={(e) => handleSettingChange('general', 'ownerEmail', e.target.value)}
                            className="w-full px-4 py-3.5 rounded-xl border border-theme-border-primary bg-theme-bg-primary text-theme-text-primary font-raleway focus:outline-none focus:ring-2 focus:ring-theme-accent-primary/50 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-2">Phone *</label>
                          <input
                            type="tel"
                            value={settings.general.ownerPhone}
                            onChange={(e) => handleSettingChange('general', 'ownerPhone', e.target.value)}
                            className="w-full px-4 py-3.5 rounded-xl border border-theme-border-primary bg-theme-bg-primary text-theme-text-primary font-raleway focus:outline-none focus:ring-2 focus:ring-theme-accent-primary/50 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <hr className="border-theme-border-primary" />

                    <div>
                      <h2 className="text-2xl font-fredoka text-theme-text-primary mb-6">Location</h2>
                      <div className="space-y-6">
                        <div>
                          <label className="block text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-2">Address *</label>
                          <input
                            type="text"
                            value={settings.general.address}
                            onChange={(e) => handleSettingChange('general', 'address', e.target.value)}
                            className="w-full px-4 py-3.5 rounded-xl border border-theme-border-primary bg-theme-bg-primary text-theme-text-primary font-raleway focus:outline-none focus:ring-2 focus:ring-theme-accent-primary/50 transition-all"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <label className="block text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-2">City</label>
                            <input
                              type="text"
                              value={settings.general.city}
                              onChange={(e) => handleSettingChange('general', 'city', e.target.value)}
                              className="w-full px-4 py-3.5 rounded-xl border border-theme-border-primary bg-theme-bg-primary text-theme-text-primary font-raleway focus:outline-none focus:ring-2 focus:ring-theme-accent-primary/50 transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-2">State</label>
                            <input
                              type="text"
                              value={settings.general.state}
                              onChange={(e) => handleSettingChange('general', 'state', e.target.value)}
                              className="w-full px-4 py-3.5 rounded-xl border border-theme-border-primary bg-theme-bg-primary text-theme-text-primary font-raleway focus:outline-none focus:ring-2 focus:ring-theme-accent-primary/50 transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-2">ZIP Code</label>
                            <input
                              type="text"
                              value={settings.general.zipCode}
                              onChange={(e) => handleSettingChange('general', 'zipCode', e.target.value)}
                              className="w-full px-4 py-3.5 rounded-xl border border-theme-border-primary bg-theme-bg-primary text-theme-text-primary font-raleway focus:outline-none focus:ring-2 focus:ring-theme-accent-primary/50 transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* --- BUSINESS / LIMITS TAB --- */}
                {activeTab === 'business' && (
                  <div className="space-y-8">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h2 className="text-2xl font-fredoka text-theme-text-primary">Zone Capacities</h2>
                        
                      </div>
                      <p className="text-sm text-theme-text-secondary font-raleway mb-6">
                        These limits are enforced by your current subscription tier. To increase capacity, please upgrade your plan.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Max Vendors Limit */}
                      <div className="bg-theme-bg-primary border border-theme-border-primary rounded-3xl p-6 flex items-center justify-between shadow-sm opacity-90 pointer-events-none">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 bg-theme-bg-secondary rounded-2xl flex items-center justify-center border border-theme-border-primary">
                            <FaBuilding className="text-theme-text-tertiary text-xl" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-1">Max Vendors / Shops</p>
                            <p className="text-2xl font-fredoka text-theme-text-primary">
                              {(() => {
                                const maxVendors = subscription?.maxVendors ?? subscription?.limits?.maxVendors ?? subscriptionLimits?.maxVendors;
                                return maxVendors === -1 ? 'Unlimited' : (maxVendors ?? 3);
                              })()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Max Tables Limit */}
                      <div className="bg-theme-bg-primary border border-theme-border-primary rounded-3xl p-6 flex items-center justify-between shadow-sm opacity-90 pointer-events-none">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 bg-theme-bg-secondary rounded-2xl flex items-center justify-center border border-theme-border-primary">
                            <FaTable className="text-theme-text-tertiary text-xl" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-theme-text-tertiary uppercase tracking-widest mb-1">Max Tables Per Shop</p>
                            <p className="text-2xl font-fredoka text-theme-text-primary">
                              {(() => {
                                const maxTables = subscription?.maxTables ?? subscription?.limits?.maxTables ?? subscriptionLimits?.maxTables;
                                return maxTables === -1 ? 'Unlimited' : (maxTables ?? 5);
                              })()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Upgrade Banner */}
                    <div className="mt-8 bg-gradient-to-r from-purple-500/10 to-theme-accent-primary/10 border border-theme-accent-primary/20 rounded-3xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-gradient-to-br from-theme-accent-primary to-purple-500 rounded-full flex items-center justify-center text-white shrink-0 shadow-lg">
                          <FaCrown size={24} />
                        </div>
                        <div>
                          <h4 className="font-fredoka text-theme-text-primary text-xl mb-1">Need more capacity?</h4>
                          <p className="text-sm font-raleway text-theme-text-secondary">Scale your operations instantly by upgrading your subscription tier.</p>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/zone/${zoneId}/upgrade`)}
                        className="w-full sm:w-auto shrink-0 bg-theme-bg-primary hover:bg-theme-bg-hover text-theme-text-primary border border-theme-border-primary px-8 py-3.5 rounded-xl font-raleway font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                      >
                        View Upgrade Plans <FaArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                )}
                
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Modals */}
        <EmailOTPVerification
          isOpen={showOTPVerification}
          onClose={() => setShowOTPVerification(false)}
          onCancel={handleOTPCancel}
          onVerified={handleOTPVerified}
          email={settings.general.ownerEmail}
          purpose="profile_update"
          entityId={zoneId}
          title="Verify Settings Update"
          description="For security, please verify your email to apply these critical changes."
        />
      </div>
    </ZoneAdminLayout>
  );
};

export default ZoneSettings;