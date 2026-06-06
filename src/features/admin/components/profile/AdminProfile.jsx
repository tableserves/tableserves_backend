import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaKey,
  FaSave,
  FaEdit,
  FaEye,
  FaEyeSlash,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaTimes,
  FaSyncAlt,
  FaShieldAlt
} from 'react-icons/fa';
import SuperAdminLayout from '../SuperAdminLayout';
import EmailOTPVerification from '../../../../components/common/EmailOTPVerification';
import ApiService from '../../../../shared/api/ApiService';
import RealTimeService from '../../../../services/RealTimeService';
import simpleTokenService from '../../../../shared/auth/SimpleTokenService';
import { logger } from '../../../../shared/logging/logger';
import { safeToastSuccess, safeToastError } from '../../../../shared/utils/toastUtils';

const PasswordRequirement = ({ met, text }) => (
  <div className="flex items-center space-x-2">
    {met ? <FaCheckCircle className="text-emerald-500 text-xs" /> : <FaTimesCircle className="text-theme-text-tertiary text-xs opacity-50" />}
    <span className={`text-xs font-medium tracking-wide ${met ? 'text-emerald-500' : 'text-theme-text-secondary'}`}>{text}</span>
  </div>
);

const AdminProfile = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.ui.auth);
  
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const [profileData, setProfileData] = useState({ name: '', email: '', phone: '', role: '', joinDate: '', lastLogin: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordRequirements, setPasswordRequirements] = useState({ length: false, uppercase: false, lowercase: false, number: false });

  const loadProfileData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ApiService.get('/auth/profile');
      const userData = response.data?.data || response.data;
      
      if (!userData) throw new Error('No profile data received');
      
      let name = userData.profile?.name || userData.profile?.firstName || userData.profile?.fullName || userData.username || userData.name || userData.displayName || '';
      const email = userData.email || userData.userEmail || '';
      const phone = userData.phone || userData.phoneNumber || userData.mobile || '';
      const role = userData.role === 'admin' ? 'Super Administrator' : userData.role || userData.userRole || 'Admin';
      
      const joinDate = userData.createdAt ? new Date(userData.createdAt).toISOString().split('T')[0] : '';
      const lastLogin = userData.lastLogin || userData.lastLoginAt || '';
      
      setProfileData({ name, email, phone, role, joinDate, lastLogin });
    } catch (error) {
      logger.error('Failed to load admin profile data:', error);
      safeToastError('Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleProfileUpdated = useCallback((data) => {
    const userId = data.userId || data.user?.id || data.data?.id || data.profileData?.id;
    if (userId === user?.id) {
      let updatedData = data.profileData || data.data || data;
      setProfileData(prev => ({
        ...prev,
        name: updatedData.profile?.name || updatedData.name || prev.name,
        email: updatedData.email || prev.email,
        phone: updatedData.phone || prev.phone,
        role: updatedData.role || prev.role
      }));
    }
  }, [user?.id]);

  const handleReconnect = useCallback(async () => {
    safeToastSuccess('Real-time connection restored');
    await loadProfileData();
  }, [loadProfileData]);

  useEffect(() => {
    loadProfileData();

    const initRealTime = async () => {
      try {
        if (typeof RealTimeService.connect === 'function' && !RealTimeService.isConnected) await RealTimeService.connect();
        
        ['profile_updated', 'admin_profile_updated', 'admin_profile_update'].forEach(event => {
          if (typeof RealTimeService.addEventListener === 'function') RealTimeService.addEventListener(event, handleProfileUpdated);
        });
        
        if (user?.id && typeof RealTimeService.joinRoom === 'function') {
          RealTimeService.joinRoom('admin', user.id);
          RealTimeService.joinRoom('user', user.id);
        }
        
        if (typeof RealTimeService.addEventListener === 'function') RealTimeService.addEventListener('reconnect', handleReconnect);
      } catch (error) {
        logger.error('Real-time init failed:', error);
      }
    };

    initRealTime();
    
    return () => {
      ['profile_updated', 'admin_profile_updated', 'admin_profile_update'].forEach(event => {
        if (typeof RealTimeService.removeEventListener === 'function') RealTimeService.removeEventListener(event, handleProfileUpdated);
      });
      if (typeof RealTimeService.removeEventListener === 'function') RealTimeService.removeEventListener('reconnect', handleReconnect);
      if (user?.id && typeof RealTimeService.leaveRoom === 'function') {
        RealTimeService.leaveRoom('admin', user.id);
        RealTimeService.leaveRoom('user', user.id);
      }
    };
  }, [user?.id, loadProfileData, handleProfileUpdated, handleReconnect]);

  const handleProfileChange = (field, value) => {
    if (validationErrors[field]) setValidationErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field, value) => {
    if (validationErrors[field]) setValidationErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
    setPasswordData(prev => ({ ...prev, [field]: value }));
  };

  const validateProfileData = () => {
    const errors = {};
    if (!profileData.name?.trim()) errors.name = 'Name is required';
    if (!profileData.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) errors.email = 'Valid email is required';
    if (!profileData.phone?.trim() || !/^\d{10}$/.test(profileData.phone)) errors.phone = 'Valid 10-digit phone is required';
    return errors;
  };

  const validatePasswordData = () => {
    const errors = {};
    if (!passwordData.currentPassword?.trim()) errors.currentPassword = 'Current password is required';
    
    const pw = passwordData.newPassword;
    if (!pw?.trim()) errors.newPassword = 'New password is required';
    else if (pw.length < 8 || !/[A-Z]/.test(pw) || !/[a-z]/.test(pw) || !/[0-9]/.test(pw)) errors.newPassword = 'Password does not meet requirements';
    
    if (passwordData.newPassword !== passwordData.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    if (passwordData.currentPassword === passwordData.newPassword) errors.newPassword = 'New password must be different';
    
    return errors;
  };

  const handleSaveProfile = () => {
    const errors = validateProfileData();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return safeToastError(Object.values(errors)[0]);
    }
    setValidationErrors({});
    setPendingChanges(profileData);
    setShowOTPVerification(true);
  };

  const handleOTPVerified = async () => {
    try {
      setSaving(true);
      const token = simpleTokenService.getAccessToken();
      if (!token) return safeToastError('Session expired. Please log in again.');

      const profilePayload = {
        name: pendingChanges.name?.trim(),
        email: pendingChanges.email?.trim().toLowerCase(),
        phone: pendingChanges.phone?.replace(/\D/g, '').slice(0, 10)
      };

      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(profilePayload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update profile');
      }

      if (typeof RealTimeService.emit === 'function') {
        RealTimeService.emit('admin_profile_update', { userId: user?.id, profileData: pendingChanges, source: 'admin_panel' });
      }

      setProfileData(pendingChanges);
      setIsEditing(false);
      setPendingChanges(null);
      safeToastSuccess('Profile updated successfully!');
    } catch (error) {
      safeToastError(error.message);
    } finally {
      setSaving(false);
      setShowOTPVerification(false);
    }
  };

  const handleChangePassword = async () => {
    const errors = validatePasswordData();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return safeToastError(Object.values(errors)[0]);
    }

    try {
      setChangingPassword(true);
      const token = simpleTokenService.getAccessToken();
      if (!token) return safeToastError('Session expired. Please log in again.');

      const payload = { currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword, confirmPassword: passwordData.confirmPassword };
      
      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to change password');
      }

      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      safeToastSuccess('Password changed successfully!');
    } catch (error) {
      safeToastError(error.message);
    } finally {
      setChangingPassword(false);
    }
  };

  const getInitials = (name) => name ? name.charAt(0).toUpperCase() : 'A';

  const tabs = [
    { id: 'profile', label: 'Personal Info', icon: FaUser },
    { id: 'password', label: 'Security & Login', icon: FaKey }
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-6 max-w-[1000px] mx-auto pb-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-theme-bg-secondary p-6 sm:p-8 rounded-3xl border border-theme-border-primary/60 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-fredoka text-theme-text-primary mb-1 flex items-center">
              <FaShieldAlt className="mr-3 text-blue-500" /> Profile Settings
            </h1>
            <p className="text-theme-text-secondary font-raleway">Manage your administrative account information.</p>
          </div>
          <button onClick={loadProfileData} disabled={loading} className="relative z-10 px-6 py-2.5 bg-theme-bg border border-theme-border-primary hover:border-theme-accent-primary/50 text-theme-text-primary rounded-xl font-medium transition-all shadow-sm flex items-center space-x-2 disabled:opacity-50">
            <FaSyncAlt className={loading ? 'animate-spin text-theme-accent-primary' : 'text-theme-text-secondary'} />
            <span>Refresh Profile</span>
          </button>
        </div>

        {/* Horizontal Animated Tabs */}
        <div className="flex justify-center md:justify-start">
          <div className="inline-flex p-1.5 space-x-1 bg-theme-bg-secondary/80 backdrop-blur-md rounded-2xl border border-theme-border-primary/50 shadow-sm w-full md:w-auto overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center space-x-2 px-6 py-3 text-sm font-bold font-raleway rounded-xl transition-all whitespace-nowrap outline-none ${
                  activeTab === tab.id ? 'text-white' : 'text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg/50'
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeProfileTabIndicator"
                    className="absolute inset-0 bg-blue-500 rounded-xl -z-10 shadow-md"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <tab.icon className={`text-base relative z-10 ${activeTab === tab.id ? 'text-white' : 'text-theme-text-tertiary'}`} />
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area (Full Width) */}
        <div className="bg-theme-bg-secondary border border-theme-border-primary/60 rounded-3xl p-6 sm:p-8 shadow-sm min-h-[450px]">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              
              {activeTab === 'profile' && (
                <div className="space-y-8 max-w-4xl mx-auto">
                  {/* Avatar & Header */}
                  <div className="flex items-center space-x-6 pb-6 border-b border-theme-border-primary/50">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-fredoka text-3xl shadow-lg shadow-blue-500/20">
                      {getInitials(profileData.name)}
                    </div>
                    <div>
                      <h3 className="text-2xl font-fredoka text-theme-text-primary mb-1">{profileData.name || 'Admin User'}</h3>
                      <p className="text-sm font-semibold uppercase tracking-wider text-blue-500">{profileData.role}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-theme-text-primary font-medium mb-1.5 text-sm">Full Name</label>
                      <input
                        type="text" value={profileData.name} onChange={(e) => handleProfileChange('name', e.target.value)} disabled={!isEditing}
                        className={`w-full bg-theme-bg border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors ${!isEditing ? 'opacity-70 cursor-not-allowed border-theme-border-primary text-theme-text-secondary' : 'text-theme-text-primary focus:border-blue-500 border-theme-border-primary hover:border-theme-border-primary/80'} ${validationErrors.name ? 'border-rose-500' : ''}`}
                      />
                      {validationErrors.name && <p className="text-rose-500 text-xs mt-1.5 font-medium">{validationErrors.name}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-theme-text-primary font-medium mb-1.5 text-sm">Email Address</label>
                      <div className="relative">
                        <FaEnvelope className="absolute left-4 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary" />
                        <input
                          type="email" value={profileData.email} onChange={(e) => handleProfileChange('email', e.target.value)} disabled={!isEditing}
                          className={`w-full bg-theme-bg border rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none transition-colors ${!isEditing ? 'opacity-70 cursor-not-allowed border-theme-border-primary text-theme-text-secondary' : 'text-theme-text-primary focus:border-blue-500 border-theme-border-primary hover:border-theme-border-primary/80'} ${validationErrors.email ? 'border-rose-500' : ''}`}
                        />
                      </div>
                      {validationErrors.email && <p className="text-rose-500 text-xs mt-1.5 font-medium">{validationErrors.email}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-theme-text-primary font-medium mb-1.5 text-sm">Phone Number</label>
                      <div className="relative">
                        <FaPhone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary" />
                        <input
                          type="tel" maxLength={10} value={profileData.phone} onChange={(e) => handleProfileChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} disabled={!isEditing}
                          className={`w-full bg-theme-bg border rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none transition-colors ${!isEditing ? 'opacity-70 cursor-not-allowed border-theme-border-primary text-theme-text-secondary' : 'text-theme-text-primary focus:border-blue-500 border-theme-border-primary hover:border-theme-border-primary/80'} ${validationErrors.phone ? 'border-rose-500' : ''}`}
                        />
                      </div>
                      {validationErrors.phone && <p className="text-rose-500 text-xs mt-1.5 font-medium">{validationErrors.phone}</p>}
                    </div>

                    <div>
                      <label className="block text-theme-text-primary font-medium mb-1.5 text-sm">System Role</label>
                      <input type="text" value={profileData.role} disabled className="w-full bg-theme-bg/50 border border-theme-border-primary/50 rounded-xl px-4 py-3 text-sm text-theme-text-tertiary cursor-not-allowed" />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-6 border-t border-theme-border-primary/50">
                    {!isEditing ? (
                      <button onClick={() => setIsEditing(true)} disabled={loading} className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-semibold flex items-center shadow-md transition-all">
                        <FaEdit className="mr-2" /> Edit Details
                      </button>
                    ) : (
                      <>
                        <button onClick={() => { setIsEditing(false); setValidationErrors({}); }} disabled={saving} className="px-6 py-2.5 bg-theme-bg border border-theme-border-primary hover:bg-theme-bg-hover text-theme-text-primary rounded-xl font-medium transition-colors">
                          Cancel
                        </button>
                        <button onClick={handleSaveProfile} disabled={saving} className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold flex items-center shadow-md transition-all disabled:opacity-50">
                          {saving ? <FaSpinner className="animate-spin mr-2" /> : <FaSave className="mr-2" />}
                          <span>Save & Verify</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'password' && (
                <div className="space-y-6 max-w-2xl mx-auto">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                      <FaKey />
                    </div>
                    <h3 className="text-2xl font-fredoka text-theme-text-primary">Change Password</h3>
                    <p className="text-theme-text-secondary font-raleway mt-1 text-sm">Ensure your account is using a long, random password to stay secure.</p>
                  </div>
                  
                  <div className="space-y-5">
                    <div>
                      <label className="block text-theme-text-primary font-medium mb-1.5 text-sm">Current Password</label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'} value={passwordData.currentPassword} onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                          className={`w-full bg-theme-bg border rounded-xl px-4 py-3 pr-12 text-sm text-theme-text-primary focus:outline-none focus:border-blue-500 transition-colors ${validationErrors.currentPassword ? 'border-rose-500' : 'border-theme-border-primary'}`}
                        />
                        <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary hover:text-theme-text-primary">
                          {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                      {validationErrors.currentPassword && <p className="text-rose-500 text-xs mt-1.5 font-medium">{validationErrors.currentPassword}</p>}
                    </div>

                    <div>
                      <label className="block text-theme-text-primary font-medium mb-1.5 text-sm">New Password</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'} value={passwordData.newPassword} 
                          onChange={(e) => {
                            handlePasswordChange('newPassword', e.target.value);
                            setPasswordRequirements({
                              length: e.target.value.length >= 8,
                              uppercase: /[A-Z]/.test(e.target.value),
                              lowercase: /[a-z]/.test(e.target.value),
                              number: /[0-9]/.test(e.target.value)
                            });
                          }}
                          className={`w-full bg-theme-bg border rounded-xl px-4 py-3 pr-12 text-sm text-theme-text-primary focus:outline-none transition-colors ${validationErrors.newPassword ? 'border-rose-500' : Object.values(passwordRequirements).every(Boolean) && passwordData.newPassword ? 'border-emerald-500 focus:border-emerald-500' : 'border-theme-border-primary focus:border-blue-500'}`}
                        />
                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary hover:text-theme-text-primary">
                          {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                      {validationErrors.newPassword && <p className="text-rose-500 text-xs mt-1.5 font-medium">{validationErrors.newPassword}</p>}
                    </div>

                    <div className="bg-theme-bg border border-theme-border-primary/50 p-5 rounded-2xl">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-theme-text-tertiary mb-3">Password Requirements</p>
                      <div className="grid grid-cols-2 gap-y-2.5">
                        <PasswordRequirement met={passwordRequirements.length} text="8+ characters" />
                        <PasswordRequirement met={passwordRequirements.uppercase} text="Uppercase (A-Z)" />
                        <PasswordRequirement met={passwordRequirements.lowercase} text="Lowercase (a-z)" />
                        <PasswordRequirement met={passwordRequirements.number} text="Number (0-9)" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-theme-text-primary font-medium mb-1.5 text-sm">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'} value={passwordData.confirmPassword} onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                          className={`w-full bg-theme-bg border rounded-xl px-4 py-3 pr-12 text-sm text-theme-text-primary focus:outline-none focus:border-blue-500 transition-colors ${validationErrors.confirmPassword ? 'border-rose-500' : 'border-theme-border-primary'}`}
                        />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary hover:text-theme-text-primary">
                          {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                      {validationErrors.confirmPassword && <p className="text-rose-500 text-xs mt-1.5 font-medium">{validationErrors.confirmPassword}</p>}
                    </div>

                    <div className="flex justify-end pt-6 border-t border-theme-border-primary/50">
                      <button onClick={handleChangePassword} disabled={!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword || changingPassword} className="px-6 py-3 w-full sm:w-auto bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-bold flex items-center justify-center shadow-md transition-all disabled:opacity-50">
                        {changingPassword ? <FaSpinner className="animate-spin mr-2" /> : <FaKey className="mr-2" />}
                        <span>Update Password</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

      </div>

      <EmailOTPVerification
        isOpen={showOTPVerification}
        onClose={() => { setShowOTPVerification(false); setPendingChanges(null); }}
        onCancel={() => { setShowOTPVerification(false); setPendingChanges(null); }}
        onVerified={handleOTPVerified}
        email={profileData.email}
        purpose="profile_update"
        entityId="super_admin"
        title="Verify Profile Update"
        description="For security, please verify your email address to save profile changes."
      />
    </SuperAdminLayout>
  );
};

export default AdminProfile;