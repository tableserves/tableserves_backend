import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DatabaseService from '../../../../services/DatabaseService';
import { ZONE_PLANS } from '../../../../features/subscription/constants/plans';
import { safeToastSuccess, safeToastError } from '../../../../shared/utils/toastUtils';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaLock,
  FaUnlock,
  FaSearch,
  FaCopy,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaCrown,
  FaTimes,
  FaEye,
  FaEyeSlash,
  FaBuilding,
  FaInfoCircle,
  FaKey,
  FaUserShield,
  FaMapMarkerAlt,
  FaFilter
} from 'react-icons/fa';
import SuperAdminLayout from '../SuperAdminLayout';

const PasswordRequirement = ({ met, text }) => (
  <div className="flex items-center space-x-2">
    {met ? (
      <FaCheckCircle className="text-emerald-500 text-xs" />
    ) : (
      <FaTimesCircle className="text-theme-text-tertiary text-xs opacity-50" />
    )}
    <span className={`text-xs font-medium tracking-wide ${met ? 'text-emerald-500' : 'text-theme-text-secondary'}`}>
      {text}
    </span>
  </div>
);

const ZoneAdvancedManagement = () => {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCredentialEditModal, setShowCredentialEditModal] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);
  const [actionType, setActionType] = useState('');
  const [copiedField, setCopiedField] = useState(null);
  
  // Form states
  const [credentialForm, setCredentialForm] = useState({ username: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordInForm, setShowPasswordInForm] = useState(false);
  
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false, uppercase: false, lowercase: false, number: false, symbol: false
  });

  const [formData, setFormData] = useState({
    name: '', description: '', ownerName: '', ownerEmail: '', username: '', ownerPhone: '',
    address: '', city: '', state: '', zipCode: '', subscriptionPlan: 'premium', status: 'active',
    password: '', logo: null, maxTables: null, maxVendors: null,
    paymentConfig: { upiId: '', paymentModel: 'shop-wise' }
  });

  const handleUsernameChange = (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
    setFormData({ ...formData, username: value });
  };

  const loadZones = useCallback(async () => {
    try {
      const allZones = await DatabaseService.getZones();
      const zonesArray = Array.isArray(allZones) ? allZones : [];
      const zonePremium = zonesArray.filter(z => z && z.subscriptionPlan === 'premium');

      const zonesWithVendorCount = await Promise.all(zonePremium.map(async (zone) => {
        try {
          const vendors = await DatabaseService.getData(`/zones/${zone.id}/vendors`);
          const vendorsArray = Array.isArray(vendors) ? vendors : [];
          return {
            ...zone,
            vendorCount: vendorsArray.length,
            logo: zone.logo || zone.settings?.theme?.logoUrl || zone.media?.images?.find(img => img.imageType === 'logo')?.url || null,
            ownerName: zone.ownerName || zone.adminId?.profile?.name || zone.adminId?.name || 'Unknown Owner',
            ownerEmail: zone.ownerEmail || zone.adminId?.email || zone.contactInfo?.email || 'No email',
            ownerPhone: zone.ownerPhone || zone.adminId?.phone || zone.contactInfo?.phone || 'No phone',
            address: zone.address || '', city: zone.city || '', state: zone.state || ''
          };
        } catch (error) {
          return {
            ...zone, vendorCount: 0,
            logo: zone.logo || zone.settings?.theme?.logoUrl || zone.media?.images?.find(img => img.imageType === 'logo')?.url || null,
            ownerName: zone.ownerName || zone.adminId?.profile?.name || zone.adminId?.name || 'Unknown Owner',
            ownerEmail: zone.ownerEmail || zone.adminId?.email || zone.contactInfo?.email || 'No email',
            ownerPhone: zone.ownerPhone || zone.adminId?.phone || zone.contactInfo?.phone || 'No phone',
            address: zone.address || '', city: zone.city || '', state: zone.state || ''
          };
        }
      }));

      setZones(zonesWithVendorCount);
    } catch (error) {
      console.error('Error loading zones:', error);
      setZones([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  // Memoized stats
  const stats = useMemo(() => ({
    total: zones.length,
    active: zones.filter(z => z.status === 'active').length,
    pending: zones.filter(z => z.status === 'pending').length,
    vendors: zones.reduce((sum, z) => sum + (z.vendorCount || 0), 0)
  }), [zones]);

  const filteredZones = useMemo(() => {
    return zones.filter(zone => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = (zone.name || '').toLowerCase().includes(search) || (zone.ownerName || '').toLowerCase().includes(search);
      const matchesStatus = statusFilter === 'all' || zone.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [zones, searchTerm, statusFilter]);

  const validatePassword = (password) => {
    setPasswordRequirements({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      symbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    });
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
      case 'suspended': return 'bg-rose-500/10 text-rose-500 border-rose-500/30';
      case 'pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/30';
    }
  };

  const getInitials = (name) => name && name !== 'Unknown Owner' ? name.charAt(0).toUpperCase() : 'Z';

  // --- Actions ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!editingZone) {
      if (!formData.password) return safeToastError('Password is required for new zone accounts');
      if (!Object.values(passwordRequirements).every(Boolean)) return safeToastError('Password does not meet all security requirements.');
    }

    if (editingZone) {
      const updateData = { ...formData };
      delete updateData.password;
      
      try {
        const updatedZone = await DatabaseService.saveData(`/zones/${editingZone.id}`, updateData, 'PUT');
        
        if (editingZone.subscriptionId && (formData.maxTables !== (editingZone.maxTables || null) || formData.maxVendors !== (editingZone.maxVendors || null))) {
          try {
            const subscriptionId = typeof editingZone.subscriptionId === 'object' ? editingZone.subscriptionId.id || editingZone.subscriptionId._id : editingZone.subscriptionId;
            if (subscriptionId) {
              await DatabaseService.saveData(`subscriptions/admin/subscriptions/${subscriptionId}/limits`, {
                maxTables: formData.maxTables || -1, maxShops: formData.maxVendors || -1, maxVendors: formData.maxVendors || -1
              }, 'PATCH');
            }
          } catch (err) {}
        }
        
        setZones(zones.map(z => z.id === editingZone.id ? { ...z, ...formData, id: z.id, vendorCount: z.vendorCount || 0, logo: formData.logo || z.logo, loginCredentials: z.loginCredentials } : z));
        safeToastSuccess('Premium zone updated successfully!');
        resetForm();
      } catch (error) {
        safeToastError('Failed to update premium zone. Please try again.');
      }
    } else {
      const username = formData.username || formData.name.toLowerCase().replace(/\s+/g, '');
      const userData = {
        username, email: formData.ownerEmail, phone: formData.ownerPhone, password: formData.password, role: 'zone_admin', businessType: 'zone',
        profile: { name: formData.ownerName, businessName: formData.name, username }, skipFreeSubscription: true
      };

      try {
        const createdUser = await DatabaseService.saveData('/auth/register', userData, 'POST');
        if (!createdUser?.user?.id) throw new Error('User creation failed');
        
        const userId = createdUser.user.id;
        const premiumSubscription = ZONE_PLANS.premium;
        
        const subscriptionData = {
          userId, planKey: 'zone_enterprise', planType: 'zone', planName: 'Zone Premium Plan', features: premiumSubscription.features,
          limits: { maxTables: formData.maxTables || -1, maxShops: formData.maxVendors || -1, maxVendors: formData.maxVendors || -1, maxCategories: -1, maxMenuItems: -1, maxUsers: 10, maxOrdersPerMonth: -1, maxStorageGB: 10 },
          pricing: { amount: 0, currency: 'INR', interval: 'monthly', trialDays: 0 }, status: 'active'
        };

        const createdSubscription = await DatabaseService.saveData('/subscriptions/admin/subscriptions/custom', subscriptionData, 'POST');
        if (!createdSubscription?._id) throw new Error('Subscription creation failed');

        const zoneData = {
          adminId: userId, subscriptionId: createdSubscription._id, name: formData.name, description: formData.description,
          location: `${formData.address || ''}, ${formData.city || ''}, ${formData.state || ''}`.trim().replace(/^,\s*|,\s*$/g, ''),
          contactInfo: { email: formData.ownerEmail, phone: formData.ownerPhone, address: formData.address, city: formData.city, state: formData.state, zipCode: formData.zipCode },
          ownerName: formData.ownerName, ownerEmail: formData.ownerEmail, ownerPhone: formData.ownerPhone, logo: formData.logo, media: { images: [] },
          subscriptionPlan: formData.subscriptionPlan, status: formData.status || 'active', active: (formData.status || 'active') === 'active',
          vendorCount: 0, lastActive: null, paymentConfig: formData.paymentConfig, maxTables: formData.maxTables, maxVendors: formData.maxVendors
        };

        const newZone = await DatabaseService.saveData('/admin/zones', zoneData, 'POST');
        setZones([...zones, { ...newZone, vendorCount: 0 }]);
        safeToastSuccess('Premium Zone Account Created Successfully!');
        resetForm();
      } catch (error) {
        const errorMessage = error.response?.data?.message || error.message || '';
        const errorString = errorMessage.toLowerCase();
        
        if (error.response?.status === 409 || errorString.includes('duplicate') || errorString.includes('already exists')) {
          let specificConflict = 'A record with these details';
          
          if (errorString.includes('email')) {
            specificConflict = 'This Email Address';
          } else if (errorString.includes('phone')) {
            specificConflict = 'This Phone Number';
          } else if (errorString.includes('username')) {
            specificConflict = 'This Username';
          } else if (errorString.includes('name') || errorString.includes('zone')) {
            specificConflict = 'This Zone Name';
          }
          
          safeToastError(`${specificConflict} is already registered to another account. Please use unique details.`);
        } else if (errorString.includes('already manages an active zone')) {
          safeToastError('This admin user already has an active zone.');
        } else {
          // Fallback to exactly showing the raw error if it's readable and short, else generic
          const msg = errorMessage.length > 0 && errorMessage.length < 100 ? errorMessage : 'Failed to create premium zone.';
          safeToastError(msg);
        }
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', description: '', ownerName: '', ownerEmail: '', username: '', ownerPhone: '', address: '', city: '', state: '', zipCode: '', subscriptionPlan: 'premium', status: 'active', password: '', logo: null, maxTables: null, maxVendors: null, paymentConfig: { upiId: '', paymentModel: 'shop-wise' }
    });
    setPasswordRequirements({ length: false, uppercase: false, lowercase: false, number: false, symbol: false });
    setEditingZone(null);
    setShowForm(false);
    setShowPasswordInForm(false);
  };

  const handleEdit = (zone) => {
    setFormData({
      name: zone.name, description: zone.description, ownerName: zone.ownerName, ownerEmail: zone.ownerEmail, ownerPhone: zone.ownerPhone,
      address: zone.address, city: zone.city, state: zone.state, zipCode: zone.zipCode, subscriptionPlan: zone.subscriptionPlan, status: zone.status,
      logo: zone.logo, maxTables: zone.maxTables || null, maxVendors: zone.maxVendors || null, paymentConfig: zone.paymentConfig || { upiId: '', paymentModel: 'shop-wise' }
    });
    setEditingZone(zone);
    setShowForm(true);
  };

  const toggleStatus = (zoneId) => {
    const zone = zones.find(z => z.id === zoneId);
    if (zone) {
      setSelectedZone(zone);
      setActionType(zone.status === 'active' ? 'suspend' : 'activate');
      setShowConfirmModal(true);
    }
  };

  const confirmStatusChange = async () => {
    if (selectedZone) {
      const newStatus = selectedZone.status === 'active' ? 'suspended' : 'active';
      try {
        await DatabaseService.saveData(`/zones/${selectedZone.id}`, { status: newStatus }, 'PUT');
        setZones(zones.map(z => z.id === selectedZone.id ? { ...z, status: newStatus } : z));
        safeToastSuccess(`Zone status changed to ${newStatus} successfully!`);
      } catch (error) {
        safeToastError('Failed to update zone status.');
      }
    }
    setShowConfirmModal(false);
    setSelectedZone(null);
    setActionType('');
  };

  const copyCredentials = async (zone) => {
    try {
      const freshZoneData = await DatabaseService.getData(`/zones/${zone.id}`);
      setSelectedZone({ ...zone, ...freshZoneData, loginCredentials: freshZoneData.loginCredentials || zone.loginCredentials });
    } catch (e) {
      setSelectedZone(zone);
    }
    setShowCredentialsModal(true);
    setCopiedField(null);
  };

  const handleEditCredentials = (zone) => {
    setSelectedZone(zone);
    setCredentialForm({ username: zone.loginCredentials?.username || zone.name.toLowerCase().replace(/\s+/g, '_'), password: '', confirmPassword: '' });
    setShowCredentialEditModal(true);
  };

  const handleSaveCredentials = async () => {
    if (credentialForm.password !== credentialForm.confirmPassword) return safeToastError('Passwords do not match!');
    if (!credentialForm.username.trim()) return safeToastError('Username is required!');

    try {
      const updateData = { loginCredentials: { username: credentialForm.username } };
      if (credentialForm.password.trim()) updateData.loginCredentials.password = credentialForm.password;

      await DatabaseService.saveData(`/zones/${selectedZone.id}/credentials`, updateData, 'PUT');
      setZones(zones.map(z => z.id === selectedZone.id ? { ...z, loginCredentials: { ...z.loginCredentials, username: credentialForm.username, ...(credentialForm.password.trim() && { password: credentialForm.password }) } } : z));
      
      setShowCredentialEditModal(false);
      setCredentialForm({ username: '', password: '', confirmPassword: '' });
      safeToastSuccess('Credentials updated successfully!');
    } catch (error) {
      safeToastError('Failed to update credentials. Please try again.');
    }
  };

  const handleCopyToClipboard = async () => {
    if (!selectedZone) return;
    
    let freshUsername = null;
    try {
      if (!selectedZone.loginCredentials?.username && selectedZone.adminId) {
        const userData = await DatabaseService.getData(`/admin/users/${selectedZone.adminId}`);
        if (userData?.username) freshUsername = userData.username;
      }
    } catch (e) {}

    const username = selectedZone.loginCredentials?.username || freshUsername || selectedZone.username || (selectedZone.ownerName ? selectedZone.ownerName.toLowerCase().replace(/\s+/g, '_') : selectedZone.name.toLowerCase().replace(/\s+/g, '_'));
    
    const credentials = `Premium Zone Credentials:\nZone: ${selectedZone.name}\nOwner: ${selectedZone.ownerName}\nEmail: ${selectedZone.ownerEmail}\nPhone: ${selectedZone.ownerPhone}\n\nLogin Details:\nUsername: ${username}\nLogin URL: ${window.location.origin}/login\n\nPlan: Premium\nMax Vendors: ${selectedZone.maxVendors || 'Unlimited'}\nMax Shops Per Vendor: ${selectedZone.maxTables || 'Unlimited'}\nStatus: ${selectedZone.status}`;

    try {
      await navigator.clipboard.writeText(credentials);
      setShowCredentialsModal(false);
      setSelectedZone(null);
      safeToastSuccess('Credentials copied to clipboard!');
    } catch (err) {
      safeToastError('Failed to copy credentials.');
    }
  };

  const handleDelete = (zoneId) => {
    const zone = zones.find(z => z.id === zoneId);
    if (zone) {
      setSelectedZone(zone);
      setShowDeleteModal(true);
    }
  };

  const confirmDelete = async () => {
    if (selectedZone) {
      try {
        await DatabaseService.deleteData(`/admin/zones/${selectedZone.id}`, { permanent: 'true' });
        
        if (selectedZone.adminId) {
          const adminId = typeof selectedZone.adminId === 'object' ? selectedZone.adminId.id || selectedZone.adminId._id : selectedZone.adminId;
          if (adminId && typeof adminId === 'string') await DatabaseService.deleteData(`/admin/users/${adminId}`, { hardDelete: 'true' });
        }

        if (selectedZone.subscriptionId) {
          const subscriptionId = typeof selectedZone.subscriptionId === 'object' ? selectedZone.subscriptionId.id || selectedZone.subscriptionId._id : selectedZone.subscriptionId;
          if (subscriptionId && typeof subscriptionId === 'string') await DatabaseService.deleteData(`/admin/subscriptions/${subscriptionId}`, { hardDelete: 'true' });
        }

        setZones(zones.filter(z => z.id !== selectedZone.id));
        safeToastSuccess('Premium zone and related data deleted successfully.');
      } catch (error) {
        safeToastError('Failed to delete premium zone and related data.');
      }
    }
    setShowDeleteModal(false);
    setSelectedZone(null);
  };

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center min-h-[70vh]">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center">
            <div className="w-14 h-14 border-4 border-theme-border-primary border-t-amber-500 rounded-full animate-spin mb-4"></div>
            <p className="text-theme-text-primary font-fredoka text-xl">Loading Premium Zones...</p>
          </motion.div>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-8 max-w-[1400px] mx-auto pb-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-theme-bg-secondary p-6 sm:p-8 rounded-3xl border border-theme-border-primary/60 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-fredoka text-theme-text-primary mb-1 flex items-center">
              <FaCrown className="mr-3 text-amber-500" /> Premium Zones
            </h1>
            <p className="text-theme-text-secondary font-raleway">Create and manage Enterprise Food Zones with custom configurations.</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="relative z-10 w-full sm:w-auto px-6 py-3 rounded-xl font-raleway font-semibold flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white shadow-md transition-all duration-300 transform hover:scale-105"
          >
            <FaPlus />
            <span>Create Premium Zone</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: 'Total Premium', value: stats.total, icon: FaCrown, gradient: 'from-amber-400 to-orange-500', shadow: 'shadow-orange-500/20' },
            { title: 'Active Zones', value: stats.active, icon: FaCheckCircle, gradient: 'from-emerald-400 to-emerald-600', shadow: 'shadow-emerald-500/20' },
            { title: 'Pending Approval', value: stats.pending, icon: FaClock, gradient: 'from-yellow-400 to-yellow-600', shadow: 'shadow-yellow-500/20' },
            { title: 'Total Vendors', value: stats.vendors, icon: FaBuilding, gradient: 'from-blue-400 to-blue-600', shadow: 'shadow-blue-500/20' }
          ].map((stat, index) => (
            <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="bg-theme-bg-secondary border border-theme-border-primary/60 rounded-3xl p-6 relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-sm font-medium text-theme-text-tertiary font-raleway uppercase tracking-wider mb-2">{stat.title}</p>
                  <p className="text-3xl font-fredoka text-theme-text-primary">{stat.value}</p>
                </div>
                <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${stat.gradient} ${stat.shadow} shadow-lg text-white`}>
                  <stat.icon className="text-xl" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-theme-bg-secondary border border-theme-border-primary/60 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary" />
            <input
              type="text"
              placeholder="Search premium zones by name or owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-theme-bg border border-theme-border-primary rounded-xl pl-11 pr-4 py-3 text-sm text-theme-text-primary placeholder-theme-text-tertiary focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
          <div className="relative min-w-[160px]">
            <FaFilter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary text-xs" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-theme-bg border border-theme-border-primary rounded-xl pl-10 pr-4 py-3 text-sm text-theme-text-primary focus:outline-none focus:border-amber-500 appearance-none cursor-pointer transition-colors"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-theme-bg-secondary border border-theme-border-primary/60 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left border-collapse">
              <thead className="bg-theme-bg/50 border-b border-theme-border-primary/60">
                <tr>
                  <th className="px-6 py-5 text-xs font-bold text-theme-text-tertiary uppercase tracking-wider">Zone Details</th>
                  <th className="px-6 py-5 text-xs font-bold text-theme-text-tertiary uppercase tracking-wider">Owner Info</th>
                  <th className="px-6 py-5 text-xs font-bold text-theme-text-tertiary uppercase tracking-wider">Location</th>
                  <th className="px-6 py-5 text-xs font-bold text-theme-text-tertiary uppercase tracking-wider">Status & Vendors</th>
                  <th className="px-6 py-5 text-xs font-bold text-theme-text-tertiary uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border-primary/40">
                <AnimatePresence>
                  {filteredZones.map((zone) => (
                    <motion.tr
                      key={zone.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-theme-bg/40 transition-colors group"
                    >
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-fredoka text-lg shadow-sm overflow-hidden">
                            {zone.logo ? (
                               <img src={zone.logo} alt="" className="w-full h-full object-cover" />
                            ) : (
                               getInitials(zone.name)
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-theme-text-primary font-raleway text-sm flex items-center">
                              {zone.name}
                              <FaCrown className="ml-2 text-amber-500 text-[10px]" />
                            </h3>
                            <p className="text-xs text-theme-text-secondary mt-0.5">{zone.description ? (zone.description.length > 30 ? `${zone.description.substring(0, 30)}...` : zone.description) : 'No description'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <p className="text-sm font-semibold text-theme-text-primary">{zone.ownerName}</p>
                        <p className="text-xs text-theme-text-secondary mt-0.5">{zone.ownerEmail}</p>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center space-x-2 text-theme-text-secondary">
                          <FaMapMarkerAlt className="text-sm" />
                          <span className="text-sm font-medium text-theme-text-primary">
                            {zone.city && zone.state ? `${zone.city}, ${zone.state}` : zone.city || zone.state || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex flex-col space-y-2 items-start">
                          <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border inline-flex items-center space-x-1.5 ${getStatusStyle(zone.status)}`}>
                            {zone.status === 'active' && <FaCheckCircle className="text-xs" />}
                            {zone.status === 'suspended' && <FaTimesCircle className="text-xs" />}
                            {zone.status === 'pending' && <FaClock className="text-xs" />}
                            <span>{zone.status}</span>
                          </span>
                          <span className="text-xs font-semibold text-theme-text-tertiary">
                            <FaBuilding className="inline mr-1 text-blue-500" /> {zone.vendorCount || 0} Vendors
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button onClick={() => handleEdit(zone)} className="w-8 h-8 rounded-lg bg-theme-bg border border-theme-border-primary flex items-center justify-center text-blue-500 hover:text-white hover:bg-blue-500 transition-colors" title="Edit">
                            <FaEdit />
                          </button>
                          <button onClick={() => toggleStatus(zone.id)} className={`w-8 h-8 rounded-lg bg-theme-bg border border-theme-border-primary flex items-center justify-center transition-colors ${zone.status === 'active' ? 'text-rose-500 hover:text-white hover:bg-rose-500' : 'text-emerald-500 hover:text-white hover:bg-emerald-500'}`} title={zone.status === 'active' ? 'Suspend' : 'Activate'}>
                            {zone.status === 'active' ? <FaLock /> : <FaUnlock />}
                          </button>
                          <button onClick={() => copyCredentials(zone)} className="w-8 h-8 rounded-lg bg-theme-bg border border-theme-border-primary flex items-center justify-center text-amber-500 hover:text-white hover:bg-amber-500 transition-colors" title="Credentials">
                            <FaKey />
                          </button>
                          <button onClick={() => handleDelete(zone.id)} className="w-8 h-8 rounded-lg bg-theme-bg border border-theme-border-primary flex items-center justify-center text-red-500 hover:text-white hover:bg-red-500 transition-colors" title="Delete">
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>

            {/* Empty State */}
            {filteredZones.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-theme-bg rounded-full flex items-center justify-center mb-4 border border-theme-border-primary shadow-sm">
                  <FaCrown className="text-3xl text-theme-text-tertiary opacity-50" />
                </div>
                <h3 className="text-lg font-fredoka text-theme-text-primary mb-1">
                  {zones.length === 0 ? 'No Premium Zones Found' : 'No Matches Found'}
                </h3>
                <p className="text-theme-text-secondary font-raleway text-sm">
                  {zones.length === 0 ? 'Click "Create Premium Zone" to add one.' : 'Try adjusting your search filters.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* --- MODALS --- */}
        
        {/* Create/Edit Form Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-theme-bg-secondary border border-theme-border-primary rounded-3xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                
                <div className="flex items-center justify-between mb-8 relative z-10 border-b border-theme-border-primary pb-4">
                  <h2 className="text-2xl font-fredoka text-theme-text-primary flex items-center">
                    <FaCrown className="mr-3 text-amber-500" />
                    {editingZone ? 'Edit Premium Zone' : 'Create Premium Zone'}
                  </h2>
                  <button onClick={resetForm} className="w-10 h-10 rounded-full bg-theme-bg border border-theme-border-primary flex items-center justify-center text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-hover transition-colors">
                    <FaTimes />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-theme-text-secondary flex items-center">
                      <FaInfoCircle className="mr-2 text-blue-500" /> Basic Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-theme-text-primary font-medium mb-1.5 text-sm">Zone Name *</label>
                        {!editingZone ? (
                          <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-theme-bg border border-theme-border-primary rounded-xl px-4 py-2.5 text-sm text-theme-text-primary focus:outline-none focus:border-amber-500" placeholder="Zone Name" required />
                        ) : (
                          <div className="w-full bg-theme-bg border border-theme-border-primary/50 rounded-xl px-4 py-2.5 text-sm text-theme-text-secondary cursor-not-allowed">{formData.name}</div>
                        )}
                      </div>
                      <div>
                        <label className="block text-theme-text-primary font-medium mb-1.5 text-sm">Zone Type</label>
                        <div className="w-full bg-theme-bg border border-theme-border-primary/50 rounded-xl px-4 py-2.5 text-sm text-theme-text-secondary cursor-not-allowed">Food Zone</div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-theme-text-primary font-medium mb-1.5 text-sm">Description</label>
                        {!editingZone ? (
                          <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full bg-theme-bg border border-theme-border-primary rounded-xl px-4 py-2.5 text-sm text-theme-text-primary focus:outline-none focus:border-amber-500 min-h-[80px]" placeholder="Brief description" />
                        ) : (
                          <div className="w-full bg-theme-bg border border-theme-border-primary/50 rounded-xl px-4 py-2.5 text-sm text-theme-text-secondary cursor-not-allowed min-h-[80px]">{formData.description || 'N/A'}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Owner Info */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-theme-text-secondary flex items-center">
                      <FaUserShield className="mr-2 text-emerald-500" /> Owner Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-theme-text-primary font-medium mb-1.5 text-sm">Owner Name *</label>
                        {!editingZone ? (
                          <input type="text" value={formData.ownerName} onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })} className="w-full bg-theme-bg border border-theme-border-primary rounded-xl px-4 py-2.5 text-sm text-theme-text-primary focus:outline-none focus:border-amber-500" placeholder="Full Name" required />
                        ) : (
                          <div className="w-full bg-theme-bg border border-theme-border-primary/50 rounded-xl px-4 py-2.5 text-sm text-theme-text-secondary cursor-not-allowed">{formData.ownerName}</div>
                        )}
                      </div>
                      <div>
                        <label className="block text-theme-text-primary font-medium mb-1.5 text-sm">Owner Email *</label>
                        {!editingZone ? (
                          <input type="email" value={formData.ownerEmail} onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })} className="w-full bg-theme-bg border border-theme-border-primary rounded-xl px-4 py-2.5 text-sm text-theme-text-primary focus:outline-none focus:border-amber-500" placeholder="Email Address" required />
                        ) : (
                          <div className="w-full bg-theme-bg border border-theme-border-primary/50 rounded-xl px-4 py-2.5 text-sm text-theme-text-secondary cursor-not-allowed">{formData.ownerEmail}</div>
                        )}
                      </div>
                      <div>
                        <label className="block text-theme-text-primary font-medium mb-1.5 text-sm">Owner Phone *</label>
                        {!editingZone ? (
                          <input type="tel" value={formData.ownerPhone} onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })} className="w-full bg-theme-bg border border-theme-border-primary rounded-xl px-4 py-2.5 text-sm text-theme-text-primary focus:outline-none focus:border-amber-500" placeholder="Phone Number" maxLength={10} required />
                        ) : (
                          <div className="w-full bg-theme-bg border border-theme-border-primary/50 rounded-xl px-4 py-2.5 text-sm text-theme-text-secondary cursor-not-allowed">{formData.ownerPhone}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Location Info (Only for creation) */}
                  {!editingZone && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-theme-text-secondary flex items-center">
                        <FaMapMarkerAlt className="mr-2 text-rose-500" /> Location Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-4">
                          <label className="block text-theme-text-primary font-medium mb-1.5 text-sm">Street Address</label>
                          <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full bg-theme-bg border border-theme-border-primary rounded-xl px-4 py-2.5 text-sm text-theme-text-primary focus:outline-none focus:border-amber-500" placeholder="Address" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-theme-text-primary font-medium mb-1.5 text-sm">City</label>
                          <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full bg-theme-bg border border-theme-border-primary rounded-xl px-4 py-2.5 text-sm text-theme-text-primary focus:outline-none focus:border-amber-500" placeholder="City" />
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-theme-text-primary font-medium mb-1.5 text-sm">State</label>
                          <input type="text" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} className="w-full bg-theme-bg border border-theme-border-primary rounded-xl px-4 py-2.5 text-sm text-theme-text-primary focus:outline-none focus:border-amber-500" placeholder="State" />
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-theme-text-primary font-medium mb-1.5 text-sm">ZIP Code</label>
                          <input type="text" value={formData.zipCode} onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })} className="w-full bg-theme-bg border border-theme-border-primary rounded-xl px-4 py-2.5 text-sm text-theme-text-primary focus:outline-none focus:border-amber-500" placeholder="ZIP" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Premium Configuration */}
                  <div className="space-y-4 bg-amber-500/5 border border-amber-500/20 p-5 rounded-2xl">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-amber-500 flex items-center mb-4">
                      <FaCrown className="mr-2" /> Premium Zone Configuration
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-theme-text-primary font-medium mb-1.5 text-sm">Max Vendors Limit *</label>
                        <input type="number" value={formData.maxVendors || ''} onChange={(e) => setFormData({ ...formData, maxVendors: parseInt(e.target.value) || null })} className="w-full bg-theme-bg border border-theme-border-primary rounded-xl px-4 py-2.5 text-sm text-theme-text-primary focus:outline-none focus:border-amber-500" placeholder="Enter limit (e.g. 10)" min="1" required />
                        <p className="text-theme-text-tertiary text-xs mt-2 font-medium">Maximum number of vendors/shops allowed in this zone.</p>
                      </div>
                      <div>
                        <label className="block text-theme-text-primary font-medium mb-1.5 text-sm">Max Tables Per Vendor *</label>
                        <input type="number" value={formData.maxTables || ''} onChange={(e) => setFormData({ ...formData, maxTables: parseInt(e.target.value) || null })} className="w-full bg-theme-bg border border-theme-border-primary rounded-xl px-4 py-2.5 text-sm text-theme-text-primary focus:outline-none focus:border-amber-500" placeholder="Enter limit (e.g. 50)" min="1" required />
                        <p className="text-theme-text-tertiary text-xs mt-2 font-medium">Table QR generation limit for each vendor.</p>
                      </div>
                    </div>
                  </div>

                  {/* Login Credentials (Only for creation) */}
                  {!editingZone && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-theme-text-secondary flex items-center">
                        <FaKey className="mr-2 text-purple-500" /> Admin Credentials
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-theme-text-primary font-medium mb-1.5 text-sm">Username *</label>
                          <input type="text" value={formData.username} onChange={handleUsernameChange} className="w-full bg-theme-bg border border-theme-border-primary rounded-xl px-4 py-2.5 text-sm text-theme-text-primary focus:outline-none focus:border-amber-500" placeholder="Lowercase & numbers only" required />
                        </div>
                        <div>
                          <label className="block text-theme-text-primary font-medium mb-1.5 text-sm">Password *</label>
                          <div className="relative">
                            <input type={showPasswordInForm ? "text" : "password"} value={formData.password} onChange={(e) => { const newPw = e.target.value; setFormData({ ...formData, password: newPw }); validatePassword(newPw); }} className={`w-full bg-theme-bg border rounded-xl px-4 py-2.5 text-sm text-theme-text-primary focus:outline-none pr-10 ${Object.values(passwordRequirements).every(Boolean) ? 'border-emerald-500 focus:border-emerald-500' : 'border-theme-border-primary focus:border-amber-500'}`} placeholder="Secure password" required autoComplete="new-password" />
                            <button type="button" onClick={() => setShowPasswordInForm(!showPasswordInForm)} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary hover:text-theme-text-primary">
                              {showPasswordInForm ? <FaEyeSlash /> : <FaEye />}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="bg-theme-bg border border-theme-border-primary/50 p-4 rounded-xl">
                        <p className="text-xs font-bold uppercase tracking-wider text-theme-text-secondary mb-3">Security Requirements</p>
                        <div className="grid grid-cols-2 gap-y-2">
                          <PasswordRequirement met={passwordRequirements.length} text="8+ characters" />
                          <PasswordRequirement met={passwordRequirements.uppercase} text="Uppercase (A-Z)" />
                          <PasswordRequirement met={passwordRequirements.lowercase} text="Lowercase (a-z)" />
                          <PasswordRequirement met={passwordRequirements.number} text="Number (0-9)" />
                          <PasswordRequirement met={passwordRequirements.symbol} text="Symbol (!@#$)" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end space-x-3 pt-6 border-t border-theme-border-primary">
                    <button type="button" onClick={resetForm} className="px-6 py-2.5 bg-theme-bg border border-theme-border-primary hover:bg-theme-bg-hover text-theme-text-primary rounded-xl font-medium transition-colors">Cancel</button>
                    <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-orange-500 hover:to-orange-700 text-white rounded-xl font-bold transition-all shadow-md">
                      {editingZone ? 'Save Changes' : 'Create Account'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Credentials View Modal */}
        <AnimatePresence>
          {showCredentialsModal && selectedZone && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-theme-bg-secondary border border-theme-border-primary rounded-3xl p-8 w-full max-w-xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                
                <div className="flex items-center justify-between mb-8 relative z-10 border-b border-theme-border-primary pb-4">
                  <h3 className="text-xl font-fredoka text-theme-text-primary flex items-center">
                    <FaKey className="mr-3 text-blue-500" /> Account Credentials
                  </h3>
                  <button onClick={() => { setShowCredentialsModal(false); setSelectedZone(null); }} className="w-10 h-10 rounded-full bg-theme-bg border border-theme-border-primary flex items-center justify-center text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-hover transition-colors">
                    <FaTimes />
                  </button>
                </div>
                
                <div className="space-y-6 relative z-10">
                  <div className="bg-theme-bg border border-theme-border-primary/50 rounded-2xl p-5">
                    <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-theme-border-primary/50">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-theme-text-tertiary mb-1">Zone</p>
                        <p className="font-semibold text-sm text-theme-text-primary">{selectedZone.name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-theme-text-tertiary mb-1">Owner</p>
                        <p className="font-semibold text-sm text-theme-text-primary">{selectedZone.ownerName}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-theme-text-tertiary mb-2">Login Username</p>
                      <div className="flex items-center space-x-2">
                        <p className="font-mono bg-theme-bg-secondary border border-theme-border-primary px-3 py-2 rounded-lg text-theme-text-primary text-sm flex-1 break-all">
                          {selectedZone.loginCredentials?.username || selectedZone.name.toLowerCase().replace(/\s+/g, '_')}
                        </p>
                        <button
                          onClick={() => {
                            const username = selectedZone.loginCredentials?.username || selectedZone.name.toLowerCase().replace(/\s+/g, '_');
                            navigator.clipboard.writeText(username);
                            setCopiedField('username');
                            setTimeout(() => setCopiedField(null), 2000);
                          }}
                          className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-colors ${copiedField === 'username' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-theme-bg border-theme-border-primary text-theme-text-secondary hover:text-blue-500 hover:border-blue-500/30'}`}
                          title={copiedField === 'username' ? 'Copied!' : 'Copy Username'}
                        >
                          {copiedField === 'username' ? <FaCheckCircle /> : <FaCopy />}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-2">
                    <button onClick={() => { setShowCredentialsModal(false); setSelectedZone(null); }} className="px-5 py-2.5 bg-theme-bg border border-theme-border-primary hover:bg-theme-bg-hover text-theme-text-primary rounded-xl font-medium transition-colors text-sm">Close</button>
                    <button onClick={() => handleEditCredentials(selectedZone)} className="px-5 py-2.5 bg-theme-bg border border-theme-border-primary hover:border-blue-500/50 text-blue-500 rounded-xl font-medium flex items-center transition-colors text-sm"><FaEdit className="mr-2" /> Edit Login</button>
                    <button onClick={handleCopyToClipboard} className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-semibold flex items-center shadow-md text-sm"><FaCopy className="mr-2" /> Copy All</button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Credentials Modal */}
        <AnimatePresence>
          {showCredentialEditModal && selectedZone && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-theme-bg-secondary border border-theme-border-primary rounded-3xl p-8 w-full max-w-md shadow-2xl relative">
                <div className="flex items-center justify-between mb-8 border-b border-theme-border-primary pb-4">
                  <h3 className="text-xl font-fredoka text-theme-text-primary flex items-center">
                    <FaLock className="mr-3 text-blue-500" /> Edit Login
                  </h3>
                  <button onClick={() => setShowCredentialEditModal(false)} className="w-8 h-8 rounded-full bg-theme-bg border border-theme-border-primary flex items-center justify-center text-theme-text-secondary hover:text-theme-text-primary transition-colors">
                    <FaTimes />
                  </button>
                </div>
                <div className="space-y-5">
                  <div>
                    <label className="block text-theme-text-primary font-medium mb-1.5 text-sm">Username</label>
                    <input type="text" value={credentialForm.username} onChange={(e) => setCredentialForm({...credentialForm, username: e.target.value})} className="w-full bg-theme-bg border border-theme-border-primary rounded-xl px-4 py-2.5 text-sm text-theme-text-primary focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-theme-text-primary font-medium mb-1.5 text-sm">New Password (Optional)</label>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} value={credentialForm.password} onChange={(e) => setCredentialForm({...credentialForm, password: e.target.value})} className="w-full bg-theme-bg border border-theme-border-primary rounded-xl px-4 py-2.5 text-sm text-theme-text-primary focus:outline-none focus:border-blue-500 pr-10" placeholder="Leave blank to keep current" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary hover:text-theme-text-primary">
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>
                  {credentialForm.password && (
                    <div>
                      <label className="block text-theme-text-primary font-medium mb-1.5 text-sm">Confirm Password</label>
                      <div className="relative">
                        <input type={showConfirmPassword ? "text" : "password"} value={credentialForm.confirmPassword} onChange={(e) => setCredentialForm({...credentialForm, confirmPassword: e.target.value})} className="w-full bg-theme-bg border border-theme-border-primary rounded-xl px-4 py-2.5 text-sm text-theme-text-primary focus:outline-none focus:border-blue-500 pr-10" />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary hover:text-theme-text-primary">
                          {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end space-x-3 pt-4 border-t border-theme-border-primary">
                    <button onClick={() => setShowCredentialEditModal(false)} className="px-5 py-2 bg-theme-bg border border-theme-border-primary hover:bg-theme-bg-hover text-theme-text-primary rounded-xl font-medium text-sm transition-colors">Cancel</button>
                    <button onClick={handleSaveCredentials} className="px-5 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-semibold text-sm shadow-md transition-all">Save</button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteModal && selectedZone && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-theme-bg-secondary border border-theme-border-primary rounded-3xl p-8 w-full max-w-md shadow-2xl relative text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center">
                  <FaTrash className="text-3xl text-rose-500" />
                </div>
                <h3 className="text-2xl font-fredoka text-theme-text-primary mb-2">Delete Account?</h3>
                <p className="text-theme-text-secondary font-raleway text-sm mb-6">
                  Are you sure you want to permanently delete <strong className="text-theme-text-primary">{selectedZone.name}</strong>?
                </p>
                <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4 mb-8 text-left">
                  <p className="text-rose-500 text-sm font-medium flex items-start">
                    <FaExclamationTriangle className="mt-0.5 mr-2 flex-shrink-0" />
                    This action cannot be undone. All vendors, orders, and QR configurations will be wiped.
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button onClick={() => { setShowDeleteModal(false); setSelectedZone(null); }} className="flex-1 px-4 py-3 bg-theme-bg border border-theme-border-primary hover:bg-theme-bg-hover text-theme-text-primary rounded-xl font-semibold transition-colors">Cancel</button>
                  <button onClick={confirmDelete} className="flex-1 px-4 py-3 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white rounded-xl font-bold shadow-md transition-all">Delete Permanently</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status Toggle Modal */}
        <AnimatePresence>
          {showConfirmModal && selectedZone && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-theme-bg-secondary border border-theme-border-primary rounded-3xl p-8 w-full max-w-md shadow-2xl relative text-center">
                <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center border ${actionType === 'suspend' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
                  {actionType === 'suspend' ? <FaLock className="text-3xl" /> : <FaUnlock className="text-3xl" />}
                </div>
                <h3 className="text-2xl font-fredoka text-theme-text-primary mb-2 capitalize">{actionType} Zone</h3>
                <p className="text-theme-text-secondary font-raleway text-sm mb-8">
                  Are you sure you want to {actionType} <strong className="text-theme-text-primary">{selectedZone.name}</strong>? {actionType === 'suspend' && 'Vendors inside this zone will lose access.'}
                </p>
                <div className="flex space-x-3">
                  <button onClick={() => { setShowConfirmModal(false); setSelectedZone(null); setActionType(''); }} className="flex-1 px-4 py-3 bg-theme-bg border border-theme-border-primary hover:bg-theme-bg-hover text-theme-text-primary rounded-xl font-semibold transition-colors">Cancel</button>
                  <button onClick={confirmStatusChange} className={`flex-1 px-4 py-3 text-white rounded-xl font-bold shadow-md transition-all ${actionType === 'suspend' ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600' : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600'}`}>
                    Confirm {actionType}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </SuperAdminLayout>
  );
};

export default ZoneAdvancedManagement;