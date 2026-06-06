import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DatabaseService from '../../../services/DatabaseService';
import EmailOTPVerification from '../../../components/common/EmailOTPVerification';
import {
  FaSave,
  FaStore,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaListAlt,
  FaCheckCircle,
  FaExclamationCircle
} from 'react-icons/fa';
import ZoneShopLayout from '../pages/ZoneShopLayout';

const ZoneShopSettings = () => {
  const { zoneId, shopId } = useParams();
  const [settings, setSettings] = useState({
    shopInfo: { name: '', description: '', phone: '', email: '', address: '' }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const response = await DatabaseService.getData(`/shops/zones/${zoneId}/shop/${shopId}`);
        if (response && response.shop) {
          const shopData = response.shop;
          setSettings({
            shopInfo: {
              name: shopData.name || '',
              description: shopData.description || '',
              phone: shopData.contactInfo?.phone || '',
              email: shopData.contactInfo?.email || '',
              address: shopData.location?.address || shopData.address || ''
            }
          });
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    };
    if (shopId && zoneId) loadSettings();
  }, [zoneId, shopId]);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      shopInfo: { ...prev.shopInfo, [key]: value }
    }));
  };

  const handleSaveSettings = () => {
    if (!settings.shopInfo?.email?.trim()) {
      setSaveStatus({ type: 'error', message: 'Email is required for verification' });
      return;
    }
    setPendingChanges(settings);
    setShowOTPVerification(true);
  };

  const handleOTPVerified = async () => {
    setSaving(true);
    try {
      const updateData = {
        name: pendingChanges.shopInfo.name,
        description: pendingChanges.shopInfo.description,
        contactInfo: {
          phone: pendingChanges.shopInfo.phone,
          email: pendingChanges.shopInfo.email
        },
        location: { address: pendingChanges.shopInfo.address }
      };
      
      const response = await DatabaseService.saveData(`/shops/zones/${zoneId}/shop/${shopId}`, updateData, 'PUT');
      if (response) {
        setSaveStatus({ type: 'success', message: 'General settings updated!' });
        setTimeout(() => setSaveStatus(null), 5000);
      }
    } catch (error) {
      setSaveStatus({ type: 'error', message: error.message });
    } finally {
      setSaving(false);
      setShowOTPVerification(false);
    }
  };

  if (loading) return (
    <ZoneShopLayout>
      <div className="h-96 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-theme-accent-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-theme-text-secondary font-raleway">Loading General Settings...</p>
      </div>
    </ZoneShopLayout>
  );

  return (
    <ZoneShopLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-fredoka text-theme-text-primary">General Settings</h1>
            <p className="text-theme-text-secondary font-raleway mt-1">Manage your storefront's public identity and contact details.</p>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="group flex items-center justify-center space-x-2 bg-theme-accent-primary hover:bg-theme-accent-hover text-white px-8 py-3 rounded-xl transition-all shadow-lg shadow-theme-accent-primary/20 active:scale-95 disabled:opacity-50"
          >
            {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FaSave className="group-hover:rotate-12 transition-transform" />}
            <span className="font-bold tracking-wide">Save Changes</span>
          </button>
        </div>

        {/* Form Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-theme-bg-secondary rounded-3xl border border-theme-border-primary p-6 md:p-8 shadow-sm"
        >
          <div className="flex items-center gap-3 border-b border-theme-border-primary pb-4 mb-8">
            <div className="p-2 bg-theme-accent-primary/10 rounded-lg text-theme-accent-primary text-lg">
              <FaListAlt />
            </div>
            <h3 className="text-xl font-fredoka text-theme-text-primary">Storefront Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField 
              label="Shop Name" 
              icon={<FaStore />}
              value={settings.shopInfo?.name} 
              onChange={(val) => handleSettingChange('name', val)} 
            />
            <InputField 
              label="Public Email" 
              icon={<FaEnvelope />}
              value={settings.shopInfo?.email} 
              onChange={(val) => handleSettingChange('email', val)} 
            />
            <InputField 
              label="Contact Number" 
              icon={<FaPhone />}
              value={settings.shopInfo?.phone} 
              onChange={(val) => handleSettingChange('phone', val)} 
            />
            <InputField 
              label="Location Address" 
              icon={<FaMapMarkerAlt />}
              value={settings.shopInfo?.address} 
              onChange={(val) => handleSettingChange('address', val)} 
            />
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-bold text-theme-text-tertiary uppercase tracking-wider ml-1">Store Biography</label>
              <textarea
                value={settings.shopInfo?.description}
                onChange={(e) => handleSettingChange('description', e.target.value)}
                className="w-full bg-theme-bg-primary border border-theme-border-primary rounded-2xl p-4 text-theme-text-primary focus:ring-2 focus:ring-theme-accent-primary outline-none h-32 transition-all resize-none"
                placeholder="Tell customers about your kitchen and cuisine..."
              />
            </div>
          </div>
        </motion.div>
      </div>

      <EmailOTPVerification
        isOpen={showOTPVerification}
        onClose={() => setShowOTPVerification(false)}
        onVerified={handleOTPVerified}
        email={settings.shopInfo?.email}
        title="Confirm Settings Update"
      />

      {/* Save Status Notification */}
      <AnimatePresence>
        {saveStatus && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`fixed bottom-8 right-8 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-md border ${
              saveStatus.type === 'success' 
                ? 'bg-green-500/90 border-green-400 text-white' 
                : 'bg-red-500/90 border-red-400 text-white'
            }`}
          >
            {saveStatus.type === 'success' ? <FaCheckCircle className="text-xl" /> : <FaExclamationCircle className="text-xl" />}
            <span className="font-bold font-raleway">{saveStatus.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </ZoneShopLayout>
  );
};

const InputField = ({ label, icon, value, onChange, type = "text" }) => (
  <div className="space-y-2">
    <label className="text-sm font-bold text-theme-text-tertiary uppercase tracking-wider ml-1">{label}</label>
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-text-tertiary group-focus-within:text-theme-accent-primary transition-colors">
        {icon}
      </div>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-theme-bg-primary border border-theme-border-primary rounded-2xl pl-12 pr-4 py-3.5 text-theme-text-primary focus:ring-2 focus:ring-theme-accent-primary outline-none transition-all"
      />
    </div>
  </div>
);

export default ZoneShopSettings;