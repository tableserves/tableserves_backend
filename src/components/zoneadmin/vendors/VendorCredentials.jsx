import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import {
  FaEye,
  FaEyeSlash,
  FaSearch,
  FaFilter,
  FaDownload,
  FaStore,
  FaSave,
  FaCopy,
  FaCheck,
  FaExclamationTriangle,
  FaUser,
  FaKey,
  FaEdit
} from 'react-icons/fa';
import ZoneAdminLayout from '../ZoneAdminLayout';
import ApiService from '../../../shared/api/ApiService';
import { safeToastSuccess, safeToastError } from '../../../utils/toastUtils';
import { ErrorBoundary } from '../../../shared/errors/ErrorBoundary';

// Ultra-compact, stylish password requirement component
const PasswordRequirement = ({ met, text }) => (
  <div className="flex items-center gap-1.5">
    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all ${met ? 'bg-status-success' : 'bg-theme-bg-tertiary border border-theme-border'}`}>
      {met && <FaCheck className="text-white text-[8px]" />}
    </div>
    <span className={`text-[10px] font-raleway font-bold uppercase tracking-wider transition-colors ${met ? 'text-status-success' : 'text-theme-text-tertiary'}`}>
      {text}
    </span>
  </div>
);

// Password strength indicator
const PasswordStrengthBar = ({ requirements }) => {
  const metCount = Object.values(requirements).filter(Boolean).length - 1; // Exclude isValid
  const strength = metCount === 0 ? 0 : (metCount / 5) * 100;
  
  const getStrengthColor = () => {
    if (strength === 0) return 'bg-gray-300';
    if (strength <= 40) return 'bg-red-500';
    if (strength <= 60) return 'bg-amber-500';
    if (strength <= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  
  const getStrengthLabel = () => {
    if (strength === 0) return '';
    if (strength <= 40) return 'Weak';
    if (strength <= 60) return 'Fair';
    if (strength <= 80) return 'Good';
    return 'Strong';
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold text-theme-text-tertiary uppercase tracking-wider">Strength</span>
        {strength > 0 && (
          <span className={`text-[9px] font-bold uppercase tracking-wider ${
            strength <= 40 ? 'text-red-500' : 
            strength <= 60 ? 'text-amber-500' : 
            strength <= 80 ? 'text-yellow-500' : 
            'text-green-500'
          }`}>
            {getStrengthLabel()}
          </span>
        )}
      </div>
      <div className="h-1.5 bg-theme-bg-tertiary rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 ${getStrengthColor()}`}
          style={{ width: `${strength}%` }}
        />
      </div>
    </div>
  );
};

const VendorCredentials = () => {
  const { zoneId } = useParams();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showPasswords, setShowPasswords] = useState({});
  const [copiedField, setCopiedField] = useState('');
  
  // Editing State
  const [editingCredentials, setEditingCredentials] = useState(null);
  const [credentialForm, setCredentialForm] = useState({ username: '', password: '', confirmPassword: '' });
  const [passwordRequirements, setPasswordRequirements] = useState({ length: false, uppercase: false, lowercase: false, number: false, symbol: false });

  // Password Validation Logic
  const validatePassword = (password) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      symbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };
    const isValid = Object.values(checks).every(Boolean);
    return { ...checks, isValid };
  };

  const isPasswordValid = credentialForm.password ? passwordRequirements.isValid : true;
  const confirmPasswordMatches = credentialForm.password === credentialForm.confirmPassword;
  const canSave = credentialForm.username.trim() && (!credentialForm.password || (isPasswordValid && confirmPasswordMatches));

  // Fetch Data
  const loadVendors = async () => {
    setLoading(true);
    setError(null);
    try {
      const vendorsData = await ApiService.getZoneVendors(zoneId);
      setVendors(Array.isArray(vendorsData) ? vendorsData : []);
    } catch (err) {
      setError(`Error loading vendors: ${err.message}`);
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (zoneId) {
      loadVendors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneId]);

  // Optimized Filtering with safety checks
  const filteredVendors = useMemo(() => {
    return vendors.filter(vendor => {
      const matchesSearch = 
        vendor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.loginCredentials?.username?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || vendor.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [vendors, searchTerm, statusFilter]);

  const copyToClipboard = async (text, field) => {
    try {
      if (!text || text.trim() === '') {
        return;
      }
      
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(''), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  // Editing Handlers
  const handleEditCredentials = (vendor) => {
    setEditingCredentials(vendor.id);
    setCredentialForm({
      username: vendor.loginCredentials?.username || '',
      password: '',
      confirmPassword: ''
    });
    setPasswordRequirements({ length: false, uppercase: false, lowercase: false, number: false, symbol: false });
  };

  const handlePasswordChange = (e) => {
    const password = e.target.value;
    setCredentialForm({ ...credentialForm, password });
    const validation = validatePassword(password);
    setPasswordRequirements(validation);
  };

  const handleConfirmPasswordChange = (e) => {
    setCredentialForm({ ...credentialForm, confirmPassword: e.target.value });
  };

  const handleSaveCredentials = async () => {
    if (!credentialForm.username.trim()) {
      safeToastError('Username is required.');
      return;
    }
    if (credentialForm.password && credentialForm.password !== credentialForm.confirmPassword) {
      safeToastError('Passwords do not match.');
      return;
    }
    if (credentialForm.password && !isPasswordValid) {
      safeToastError('Password does not meet security requirements.');
      return;
    }

    try {
      const credentialData = {
        username: credentialForm.username,
        password: credentialForm.password
      };
      
      await ApiService.updateVendorCredentials(zoneId, editingCredentials, credentialData);
      await loadVendors();
      cancelEdit();
      safeToastSuccess('Vendor credentials updated successfully.');
    } catch (err) {
      console.error('Error updating credentials:', err);
      safeToastError('Failed to update credentials. Please try again.');
    }
  };

  const cancelEdit = () => {
    setEditingCredentials(null);
    setCredentialForm({ username: '', password: '', confirmPassword: '' });
    setPasswordRequirements({ length: false, uppercase: false, lowercase: false, number: false, symbol: false });
  };

  const exportCredentials = () => {
    const credentialsData = filteredVendors.map(vendor => ({
      vendorName: vendor.name,
      ownerName: vendor.ownerName,
      phone: vendor.ownerPhone,
      email: vendor.ownerEmail,
      username: vendor.loginCredentials?.username || 'Not Set',
      password: vendor.loginCredentials?.password === '••••••••' ? 'Encrypted' : vendor.loginCredentials?.password || 'Not Set',
      status: vendor.status,
      lastLogin: vendor.loginCredentials?.lastLogin || 'Never'
    }));

    const csvContent = [
      ['Vendor Name', 'Owner Name', 'Phone', 'Email', 'Username', 'Password', 'Status', 'Last Login'],
      ...credentialsData.map(row => Object.values(row))
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendor-credentials-zone-${zoneId}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-500/10 border-green-500/20';
      case 'pending': return 'text-amber-600 bg-amber-500/10 border-amber-500/20';
      case 'inactive': case 'suspended': return 'text-red-600 bg-red-500/10 border-red-500/20';
      default: return 'text-theme-text-secondary bg-theme-bg-secondary border-theme-border';
    }
  };

  if (loading) {
    return (
      <ZoneAdminLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-theme-accent-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-theme-text-secondary font-medium font-raleway">Loading credentials securely...</p>
          </div>
        </div>
      </ZoneAdminLayout>
    );
  }

  const inputClass = "w-full bg-theme-bg-primary border border-theme-border text-theme-text-primary rounded-xl px-4 py-2.5 pr-12 font-raleway shadow-sm focus:outline-none focus:ring-2 focus:ring-theme-accent-primary/40 focus:border-theme-accent-primary transition-all";

  return (
    <ErrorBoundary>
      <ZoneAdminLayout>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-12">
          
          {/* Header & Export */}
          <div className="admin-card p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 border border-theme-border shadow-sm">
            <div>
              <h1 className="text-2xl sm:text-3xl font-fredoka text-theme-text-primary mb-1">
                Access Management
              </h1>
              <p className="text-theme-text-secondary font-raleway text-sm">
                Manage vendor login credentials and account access safely.
              </p>
            </div>
            <button
              onClick={exportCredentials}
              className="px-5 py-2.5 rounded-xl font-raleway font-bold flex items-center justify-center gap-2 bg-theme-bg-secondary border border-theme-border text-theme-text-primary hover:bg-theme-border transition-colors shadow-sm w-full sm:w-auto"
            >
              <FaDownload className="text-theme-accent-primary text-sm" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-2">
            <div className="relative flex-1">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-text-tertiary" />
              <input
                type="text"
                placeholder="Search vendors, owners, or usernames..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-theme-bg-primary border border-theme-border text-theme-text-primary rounded-xl pl-11 pr-4 py-3 font-raleway focus:outline-none focus:border-theme-accent-primary transition-colors text-sm shadow-sm"
              />
            </div>
            <div className="relative min-w-[180px]">
              <FaFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-text-tertiary text-xs" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-theme-bg-primary border border-theme-border text-theme-text-primary rounded-xl pl-10 pr-8 py-3 font-raleway focus:outline-none focus:border-theme-accent-primary transition-colors text-sm appearance-none cursor-pointer shadow-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-status-danger/10 border border-status-danger/20 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FaExclamationTriangle className="text-status-danger text-xl" />
                <p className="text-status-danger font-raleway text-sm font-semibold">{error}</p>
              </div>
              <button onClick={loadVendors} className="px-4 py-1.5 bg-status-danger text-white rounded-lg text-sm font-bold shadow-sm hover:bg-red-600 transition-colors">
                Retry
              </button>
            </div>
          )}

          {/* Credentials Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredVendors.length === 0 && !error ? (
              <div className="col-span-full admin-card rounded-2xl p-12 flex flex-col items-center justify-center text-center border border-theme-border border-dashed">
                <div className="w-20 h-20 bg-theme-bg-secondary rounded-full flex items-center justify-center mb-4">
                  <FaKey className="text-3xl text-theme-text-tertiary" />
                </div>
                <h3 className="text-xl font-fredoka text-theme-text-primary mb-2">No Credentials Found</h3>
                <p className="text-theme-text-secondary font-raleway max-w-sm">
                  {searchTerm || statusFilter !== 'all' ? 'Try adjusting your search criteria.' : 'No vendors currently exist in this zone.'}
                </p>
              </div>
            ) : (
              filteredVendors.map((vendor) => (
                <motion.div
                  key={vendor.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className="admin-card rounded-2xl overflow-hidden border border-theme-border shadow-sm hover:shadow-lg hover:border-theme-accent-primary/30 transition-all duration-300 flex flex-col bg-white dark:bg-theme-bg-primary"
                >
                  {/* Card Header (Shop Info) */}
                  <div className="p-5 flex items-start gap-4 border-b border-theme-border">
                    <div className="w-12 h-12 shrink-0 bg-theme-accent-primary/10 rounded-xl flex items-center justify-center overflow-hidden">
                      {vendor.logo ? (
                        <img src={vendor.logo} alt={vendor.name} className="w-full h-full object-cover" />
                      ) : (
                        <FaStore className="text-theme-accent-primary text-xl" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="text-lg font-fredoka text-theme-text-primary truncate">{vendor.name}</h3>
                        <span className={`shrink-0 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${getStatusColor(vendor.status)}`}>
                          {vendor.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <FaUser className="text-theme-text-tertiary text-[10px]" />
                        <p className="text-sm font-raleway font-semibold text-theme-text-secondary truncate">{vendor.ownerName}</p>
                      </div>
                    </div>
                  </div>

                  {/* Card Body (Credentials / Edit Form) */}
                  <div className="p-5 flex-1 bg-theme-bg-secondary/30">
                    {editingCredentials === vendor.id ? (
                      // EDIT MODE
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-theme-text-secondary uppercase tracking-wider mb-1.5">Username</label>
                          <input
                            type="text"
                            placeholder="vendor_username"
                            value={credentialForm.username}
                            onChange={(e) => setCredentialForm({...credentialForm, username: e.target.value})}
                            className={inputClass}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-bold text-theme-text-secondary uppercase tracking-wider mb-1.5">New Password</label>
                          <div className="relative w-full">
                            <input
                              type={showPasswords[vendor.id] ? 'text' : 'password'}
                              placeholder="Enter new password"
                              value={credentialForm.password}
                              onChange={handlePasswordChange}
                              className={inputClass}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPasswords(prev => ({ ...prev, [vendor.id]: !prev[vendor.id] }))}
                              className="!absolute right-4 top-1/2 !-translate-y-1/2 z-20 p-2 text-theme-text-tertiary hover:text-theme-accent-primary transition-colors"
                              aria-label={showPasswords[vendor.id] ? 'Hide password' : 'Show password'}
                            >
                              {showPasswords[vendor.id] ? <FaEyeSlash className="text-sm" /> : <FaEye className="text-sm" />}
                            </button>
                          </div>
                          
                          {/* Live Password Checklist */}
                          {credentialForm.password && (
                            <div className="mt-3 p-3.5 bg-theme-bg-primary border border-theme-border rounded-xl space-y-3 shadow-sm">
                              {/* Password Guide */}
                              <div className="flex items-start gap-2.5 p-3 bg-theme-accent-primary/5 border border-theme-accent-primary/20 rounded-lg">
                                <div className="w-6 h-6 shrink-0 bg-theme-accent-primary/10 rounded-md flex items-center justify-center">
                                  <FaKey className="text-theme-accent-primary text-xs" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-bold text-theme-text-primary uppercase tracking-wider mb-1.5">Password Requirements</p>
                                  <p className="text-xs text-theme-text-secondary leading-relaxed">
                                    Use 8+ characters with uppercase, lowercase, numbers & symbols. Example: <span className="font-mono font-bold text-theme-accent-primary">MyShop@2024!</span>
                                  </p>
                                </div>
                              </div>
                              
                              <PasswordStrengthBar requirements={passwordRequirements} />
                              <div className="grid grid-cols-2 gap-y-2 gap-x-1">
                                <PasswordRequirement met={passwordRequirements.length} text="8+ Chars" />
                                <PasswordRequirement met={passwordRequirements.uppercase} text="Uppercase" />
                                <PasswordRequirement met={passwordRequirements.lowercase} text="Lowercase" />
                                <PasswordRequirement met={passwordRequirements.number} text="Number" />
                                <PasswordRequirement met={passwordRequirements.symbol} text="Symbol" />
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-xs font-bold text-theme-text-secondary uppercase tracking-wider mb-1.5">Confirm Password</label>
                          <div className="relative w-full">
                            <input
                              type={showPasswords[`${vendor.id}-confirm`] ? 'text' : 'password'}
                              placeholder="Confirm new password"
                              value={credentialForm.confirmPassword}
                              onChange={handleConfirmPasswordChange}
                              className={`${inputClass} ${
                                credentialForm.password && credentialForm.confirmPassword && !confirmPasswordMatches
                                  ? 'border-red-500 ring-1 ring-red-500'
                                  : ''
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPasswords(prev => ({ ...prev, [`${vendor.id}-confirm`]: !prev[`${vendor.id}-confirm`] }))}
                              className="!absolute right-4 top-1/2 !-translate-y-1/2 z-20 p-2 text-theme-text-tertiary hover:text-theme-accent-primary transition-colors"
                              aria-label={showPasswords[`${vendor.id}-confirm`] ? 'Hide confirm password' : 'Show confirm password'}
                            >
                              {showPasswords[`${vendor.id}-confirm`] ? <FaEyeSlash className="text-sm" /> : <FaEye className="text-sm" />}
                            </button>
                          </div>
                          {credentialForm.password && credentialForm.confirmPassword && !confirmPasswordMatches && (
                            <p className="mt-1.5 text-xs font-bold text-status-danger">Passwords do not match.</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      // VIEW MODE
                      <div className="space-y-4">
                        <div>
                          <span className="block text-[10px] font-bold text-theme-text-tertiary uppercase tracking-wider mb-1">Username</span>
                          <div className="flex items-center justify-between bg-theme-bg-primary border border-theme-border rounded-xl px-4 py-2.5">
                            <span className="font-mono text-sm text-theme-text-primary font-semibold">
                              {vendor.loginCredentials?.username || <span className="text-theme-text-tertiary italic">Not configured</span>}
                            </span>
                            {vendor.loginCredentials?.username && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(vendor.loginCredentials.username, `username-${vendor.id}`);
                                }}
                                className="text-theme-text-tertiary hover:text-theme-accent-primary transition-all p-1.5 rounded-md hover:bg-theme-bg-secondary"
                                title="Copy username"
                              >
                                {copiedField === `username-${vendor.id}` ? (
                                  <FaCheck className="text-status-success animate-pulse" />
                                ) : (
                                  <FaCopy />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Actions (Bottom) */}
                  <div className="p-4 bg-theme-bg-primary border-t border-theme-border flex items-center justify-end">
                    {editingCredentials === vendor.id ? (
                      <div className="flex space-x-2 w-full">
                        <button
                          onClick={cancelEdit}
                          className="flex-1 py-2.5 rounded-lg font-raleway font-bold text-theme-text-secondary border border-theme-border hover:bg-theme-bg-secondary transition-colors text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveCredentials}
                          disabled={!canSave}
                          className={`flex-1 py-2.5 rounded-lg font-raleway font-bold flex items-center justify-center gap-2 text-sm transition-all shadow-sm
                            ${canSave ? 'bg-status-success text-white hover:bg-green-600' : 'bg-theme-bg-tertiary text-theme-text-tertiary cursor-not-allowed'}
                          `}
                        >
                          <FaSave /> Save
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEditCredentials(vendor)}
                        className="px-4 py-2.5 w-full rounded-lg text-sm font-bold flex items-center justify-center gap-2 border border-theme-accent-primary/30 bg-theme-accent-primary text-white shadow-sm hover:bg-theme-accent-primary/90 hover:shadow-md transition-all duration-150"
                      >
                        <FaEdit className="text-sm" />
                        <span>Manage Access</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>

        </motion.div>
      </ZoneAdminLayout>
    </ErrorBoundary>
  );
};

export default VendorCredentials;