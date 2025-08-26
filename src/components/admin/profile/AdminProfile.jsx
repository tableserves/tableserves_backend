import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaShieldAlt,
  FaKey,
  FaSave,
  FaEdit,
  FaEye,
  FaEyeSlash,
  FaCheck,
  FaTimes
} from 'react-icons/fa';
import SuperAdminLayout from '../SuperAdminLayout';
import ImageUpload from '../../common/ImageUpload';
import ProfileOTPVerification from '../../common/ProfileOTPVerification';

const AdminProfile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(null);

  const [profileData, setProfileData] = useState({
    name: 'John Smith',
    email: 'john.smith@tableserve.com',
    phone: '+1 (555) 123-4567',
    role: 'Super Administrator',
    department: 'Platform Management',
    location: 'New York, USA',
    joinDate: '2023-01-15',
    lastLogin: '2024-01-20T10:30:00Z',
    avatar: null
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: true,
    emailNotifications: true,
    smsNotifications: false,
    loginAlerts: true,
    sessionTimeout: 30
  });

  const tabs = [
    { id: 'profile', label: 'Profile Information', icon: FaUser },
    { id: 'security', label: 'Security Settings', icon: FaShieldAlt },
    { id: 'password', label: 'Change Password', icon: FaKey }
  ];

  const handleProfileChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSecurityChange = (field, value) => {
    setSecuritySettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = () => {
    // Store pending changes and show OTP verification
    setPendingChanges(profileData);
    setShowOTPVerification(true);
  };

  const handleOTPVerified = () => {
    try {
      // In a real app, this would save to backend
      console.log('Saving profile:', pendingChanges);
      setIsEditing(false);
      setPendingChanges(null);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  };

  const handleOTPCancel = () => {
    setShowOTPVerification(false);
    setPendingChanges(null);
  };

  const handleChangePassword = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      alert('Password must be at least 8 characters long!');
      return;
    }
    // In a real app, this would call the backend
    console.log('Changing password');
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    alert('Password changed successfully!');
  };

  const handleSaveSecurity = () => {
    // In a real app, this would save to backend
    console.log('Saving security settings:', securitySettings);
    alert('Security settings updated successfully!');
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      {/* Avatar Section */}
      <div className="flex items-center space-x-6">
        {isEditing ? (
          <div className="w-18 h-18">
            <ImageUpload
              currentImage={profileData.avatar}
              onImageChange={(imageUrl) => setProfileData({ ...profileData, avatar: imageUrl })}
              label="Upload avatar"
              size="medium"
              shape="circle"
            />
          </div>
        ) : (
          <div className="w-24 h-24 bg-accent rounded-full flex items-center justify-center">
            {profileData.avatar ? (
              <img src={profileData.avatar} alt="Profile" className="w-24 h-24 rounded-full object-cover" />
            ) : (
              <FaUser className="text-3xl text-inverse" />
            )}
          </div>
        )}
        <div>
          <h3 className="text-xl font-fredoka text-theme-text-primary">{profileData.name}</h3>
          <p className="text-theme-text-secondary font-raleway">{profileData.role}</p>
          <p className="text-theme-text-tertiary font-raleway text-sm">Joined {new Date(profileData.joinDate).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Profile Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-theme-text-primary font-raleway font-medium mb-2">Full Name</label>
          <input
            type="text"
            value={profileData.name}
            onChange={(e) => handleProfileChange('name', e.target.value)}
            disabled={!isEditing}
            className={`w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none ${!isEditing ? 'opacity-60' : ''}`}
          />
        </div>
        <div>
          <label className="block text-theme-text-primary font-raleway font-medium mb-2">Email Address</label>
          <input
            type="email"
            value={profileData.email}
            onChange={(e) => handleProfileChange('email', e.target.value)}
            disabled={!isEditing}
            className={`w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none ${!isEditing ? 'opacity-60' : ''}`}
          />
        </div>
        <div>
          <label className="block text-theme-text-primary font-raleway font-medium mb-2">Phone Number</label>
          <input
            type="tel"
            value={profileData.phone}
            onChange={(e) => handleProfileChange('phone', e.target.value)}
            disabled={!isEditing}
            className={`w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none ${!isEditing ? 'opacity-60' : ''}`}
          />
        </div>
        <div>
          <label className="block text-theme-text-primary font-raleway font-medium mb-2">Department</label>
          <input
            type="text"
            value={profileData.department}
            onChange={(e) => handleProfileChange('department', e.target.value)}
            disabled={!isEditing}
            className={`w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none ${!isEditing ? 'opacity-60' : ''}`}
          />
        </div>
        <div>
          <label className="block text-theme-text-primary font-raleway font-medium mb-2">Location</label>
          <input
            type="text"
            value={profileData.location}
            onChange={(e) => handleProfileChange('location', e.target.value)}
            disabled={!isEditing}
            className={`w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none ${!isEditing ? 'opacity-60' : ''}`}
          />
        </div>
        <div>
          <label className="block text-theme-text-primary font-raleway font-medium mb-2">Role</label>
          <input
            type="text"
            value={profileData.role}
            disabled
            className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none opacity-60"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-4">
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="btn-primary px-6 py-2 rounded-lg font-raleway flex items-center space-x-2"
          >
            <FaEdit />
            <span>Edit Profile</span>
          </button>
        ) : (
          <>
            <button
              onClick={handleSaveProfile}
              className="btn-primary px-6 py-2 rounded-lg font-raleway flex items-center space-x-2"
            >
              <FaShieldAlt />
              <span>Save Changes (OTP Required)</span>
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="btn-secondary px-6 py-2 rounded-lg font-raleway flex items-center space-x-2"
            >
              <FaTimes />
              <span>Cancel</span>
            </button>
          </>
        )}
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        {Object.entries(securitySettings).map(([key, value]) => {
          if (key === 'sessionTimeout') {
            return (
              <div key={key}>
                <label className="block text-theme-text-primary font-raleway font-medium mb-2">
                  Session Timeout (minutes)
                </label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => handleSecurityChange(key, parseInt(e.target.value))}
                  className="w-full input-theme rounded-lg px-4 py-2 font-raleway focus:outline-none"
                  min="5"
                  max="480"
                />
              </div>
            );
          }

          return (
            <div key={key} className="flex items-center justify-between">
              <div>
                <h3 className="text-theme-text-primary font-raleway font-medium capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </h3>
                <p className="text-theme-text-secondary font-raleway text-sm">
                  {key === 'twoFactorEnabled' && 'Require two-factor authentication for login'}
                  {key === 'emailNotifications' && 'Receive security alerts via email'}
                  {key === 'smsNotifications' && 'Receive security alerts via SMS'}
                  {key === 'loginAlerts' && 'Get notified of new login attempts'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => handleSecurityChange(key, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-theme-bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-theme-accent-primary"></div>
              </label>
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSaveSecurity}
        className="btn-primary px-6 py-2 rounded-lg font-raleway flex items-center space-x-2"
      >
        <FaSave />
        <span>Save Security Settings</span>
      </button>
    </div>
  );

  const renderPasswordTab = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-theme-text-primary font-raleway font-medium mb-2">Current Password</label>
          <div className="relative flex">
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              value={passwordData.currentPassword}
              onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
              className="w-full input-theme rounded-lg px-4 py-2 pr-12 font-raleway focus:outline-none"
              placeholder="Enter current password"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-8 top-5 transform -translate-y-1/2 text-theme-text-tertiary hover:text-theme-text-primary"
            >
              {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-theme-text-primary font-raleway font-medium mb-2">New Password</label>
          <div className="relative flex ">
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={passwordData.newPassword}
              onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
              className="w-full input-theme rounded-lg px-4 py-2 pr-12 font-raleway focus:outline-none"
              placeholder="Enter new password"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-8 top-5 transform -translate-y-1/2 text-theme-text-tertiary hover:text-theme-text-primary"
            >
              {showNewPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-theme-text-primary font-raleway font-medium mb-2">Confirm New Password</label>
          <div className="relative flex">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={passwordData.confirmPassword}
              onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
              className="w-full input-theme rounded-lg px-4 py-2 pr-12 font-raleway focus:outline-none"
              placeholder="Confirm new password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-8 top-5 transform -translate-y-1/2 text-theme-text-tertiary hover:text-theme-text-primary"
            >
              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>
      </div>

      <div className="admin-card rounded-lg p-4">
        <h4 className="text-theme-text-primary font-raleway font-medium mb-2">Password Requirements</h4>
        <ul className="text-theme-text-secondary font-raleway text-sm space-y-1">
          <li className="flex items-center space-x-2">
            <FaCheck className={passwordData.newPassword.length >= 8 ? 'text-status-success' : 'text-theme-text-tertiary'} />
            <span>At least 8 characters long</span>
          </li>
          <li className="flex items-center space-x-2">
            <FaCheck className={/[A-Z]/.test(passwordData.newPassword) ? 'text-status-success' : 'text-theme-text-tertiary'} />
            <span>Contains uppercase letter</span>
          </li>
          <li className="flex items-center space-x-2">
            <FaCheck className={/[a-z]/.test(passwordData.newPassword) ? 'text-status-success' : 'text-theme-text-tertiary'} />
            <span>Contains lowercase letter</span>
          </li>
          <li className="flex items-center space-x-2">
            <FaCheck className={/[0-9]/.test(passwordData.newPassword) ? 'text-status-success' : 'text-theme-text-tertiary'} />
            <span>Contains number</span>
          </li>
        </ul>
      </div>

      <button
        onClick={handleChangePassword}
        disabled={!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
        className="btn-primary px-6 py-2 rounded-lg font-raleway flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FaKey />
        <span>Change Password</span>
      </button>
    </div>
  );

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-fredoka text-theme-text-primary mb-2">Profile Settings</h1>
          <p className="text-theme-text-secondary font-raleway text-sm sm:text-base">Manage your account information and security settings</p>
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
                {activeTab === 'profile' && renderProfileTab()}
                {activeTab === 'security' && renderSecurityTab()}
                {activeTab === 'password' && renderPasswordTab()}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* OTP Verification Modal */}
      <ProfileOTPVerification
        isOpen={showOTPVerification}
        onClose={() => setShowOTPVerification(false)}
        onCancel={handleOTPCancel}
        onVerified={handleOTPVerified}
        phoneNumber={profileData.phone}
        purpose="profile_update"
        entityId="super_admin"
        title="Verify Profile Update"
        description="For security, please verify your phone number to save profile changes."
      />
    </SuperAdminLayout>
  );
};

export default AdminProfile;
