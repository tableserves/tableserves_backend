import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';
import {
  FaUser,
  FaKey,
  FaEdit,
  FaEye,
  FaEyeSlash,
  FaSearch,
  FaFilter,
  FaDownload,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaStore,
  FaPhone,
  FaEnvelope,
  FaSave,
  FaTimes,
  FaCopy,
  FaCheck,
  FaExclamationTriangle
} from 'react-icons/fa';
import ZoneAdminLayout from '../ZoneAdminLayout';
import LocalStorageService from '../../../services/LocalStorageService';

const VendorCredentials = () => {
  const { zoneId } = useParams();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showPasswords, setShowPasswords] = useState({});
  const [editingCredentials, setEditingCredentials] = useState(null);
  const [credentialForm, setCredentialForm] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [copiedField, setCopiedField] = useState('');

  useEffect(() => {
    loadVendors();
  }, [zoneId]);

  const loadVendors = () => {
    setLoading(true);
    try {
      const zoneVendors = LocalStorageService.getZoneVendors(zoneId);
      setVendors(zoneVendors);
    } catch (error) {
      console.error('Error loading vendors:', error);
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.loginCredentials?.username?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || vendor.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const togglePasswordVisibility = (vendorId) => {
    setShowPasswords(prev => ({
      ...prev,
      [vendorId]: !prev[vendorId]
    }));
  };

  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(''), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleEditCredentials = (vendor) => {
    setEditingCredentials(vendor.id);
    setCredentialForm({
      username: vendor.loginCredentials?.username || '',
      password: vendor.loginCredentials?.password || '',
      confirmPassword: vendor.loginCredentials?.password || ''
    });
  };

  const handleSaveCredentials = () => {
    if (credentialForm.password !== credentialForm.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    if (!credentialForm.username.trim() || !credentialForm.password.trim()) {
      alert('Username and password are required!');
      return;
    }

    const updatedVendor = LocalStorageService.updateZoneVendor(zoneId, editingCredentials, {
      loginCredentials: {
        username: credentialForm.username,
        password: credentialForm.password,
        lastLogin: null,
        updatedAt: new Date().toISOString()
      }
    });

    if (updatedVendor) {
      setVendors(vendors.map(vendor =>
        vendor.id === editingCredentials ? updatedVendor : vendor
      ));
      setEditingCredentials(null);
      setCredentialForm({ username: '', password: '', confirmPassword: '' });
    }
  };

  const cancelEdit = () => {
    setEditingCredentials(null);
    setCredentialForm({ username: '', password: '', confirmPassword: '' });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-status-success bg-status-success-light';
      case 'pending': return 'text-status-warning bg-status-warning-light';
      case 'inactive': return 'text-status-error bg-status-error-light';
      case 'suspended': return 'text-red-600 bg-red-100';
      default: return 'text-theme-text-tertiary bg-theme-bg-secondary';
    }
  };

  const exportCredentials = () => {
    const credentialsData = filteredVendors.map(vendor => ({
      vendorName: vendor.name,
      ownerName: vendor.ownerName,
      phone: vendor.ownerPhone,
      email: vendor.ownerEmail,
      username: vendor.loginCredentials?.username || 'Not Set',
      password: vendor.loginCredentials?.password || 'Not Set',
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

  if (loading) {
    return (
      <ZoneAdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-theme-text-primary text-xl">Loading vendor credentials...</div>
        </div>
      </ZoneAdminLayout>
    );
  }

  return (
    <ZoneAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-fredoka text-theme-text-primary mb-2">
              Vendor Login Credentials
            </h1>
            <p className="text-theme-text-secondary font-raleway text-sm sm:text-base">
              Manage vendor login credentials and access information
            </p>
          </div>
          <button
            onClick={exportCredentials}
            className="w-full sm:w-auto bg-theme-accent-primary hover:bg-theme-accent-hover text-theme-text-inverse px-4 py-2 rounded-lg font-raleway font-semibold flex items-center justify-center space-x-2"
          >
            <FaDownload />
            <span>Export Credentials</span>
          </button>
        </div>

        {/* Search and Filter */}
        <div className="admin-card rounded-xl p-4">
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary" />
              <input
                type="text"
                placeholder="Search vendors, owners, or usernames..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-theme rounded-lg pl-10 pr-4 py-2 w-full"
              />
            </div>
            <div className="relative">
              <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-theme rounded-lg pl-10 pr-8 py-2 appearance-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </div>

        {/* Credentials Table */}
        <div className="admin-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-theme-bg-secondary">
                <tr>
                  <th className="text-left p-4 font-raleway font-semibold text-theme-text-primary">Vendor</th>
                  <th className="text-left p-4 font-raleway font-semibold text-theme-text-primary">Contact</th>
                  <th className="text-left p-4 font-raleway font-semibold text-theme-text-primary">Login Credentials</th>
                  <th className="text-left p-4 font-raleway font-semibold text-theme-text-primary">Status</th>
                  <th className="text-left p-4 font-raleway font-semibold text-theme-text-primary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="border-b border-theme-border-primary hover:bg-theme-bg-hover">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-theme-accent-primary rounded-full flex items-center justify-center">
                          <FaStore className="text-theme-text-inverse" />
                        </div>
                        <div>
                          <div className="font-raleway font-semibold text-theme-text-primary">{vendor.name}</div>
                          <div className="text-sm text-theme-text-secondary">{vendor.ownerName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-sm text-theme-text-secondary">
                          <FaPhone className="text-xs" />
                          <span>{vendor.ownerPhone}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-theme-text-secondary">
                          <FaEnvelope className="text-xs" />
                          <span>{vendor.ownerEmail}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {editingCredentials === vendor.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Username"
                            value={credentialForm.username}
                            onChange={(e) => setCredentialForm({...credentialForm, username: e.target.value})}
                            className="input-theme rounded px-3 py-1 text-sm w-full"
                          />
                          <input
                            type="password"
                            placeholder="Password"
                            value={credentialForm.password}
                            onChange={(e) => setCredentialForm({...credentialForm, password: e.target.value})}
                            className="input-theme rounded px-3 py-1 text-sm w-full"
                          />
                          <input
                            type="password"
                            placeholder="Confirm Password"
                            value={credentialForm.confirmPassword}
                            onChange={(e) => setCredentialForm({...credentialForm, confirmPassword: e.target.value})}
                            className="input-theme rounded px-3 py-1 text-sm w-full"
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <FaUser className="text-xs text-theme-text-tertiary" />
                            <span className="text-sm font-mono">{vendor.loginCredentials?.username || 'Not Set'}</span>
                            <button
                              onClick={() => copyToClipboard(vendor.loginCredentials?.username || '', `username-${vendor.id}`)}
                              className="text-theme-text-tertiary hover:text-theme-accent-primary"
                            >
                              {copiedField === `username-${vendor.id}` ? <FaCheck className="text-green-500" /> : <FaCopy />}
                            </button>
                          </div>
                          <div className="flex items-center space-x-2">
                            <FaKey className="text-xs text-theme-text-tertiary" />
                            <span className="text-sm font-mono">
                              {showPasswords[vendor.id] 
                                ? vendor.loginCredentials?.password || 'Not Set'
                                : '••••••••'
                              }
                            </span>
                            <button
                              onClick={() => togglePasswordVisibility(vendor.id)}
                              className="text-theme-text-tertiary hover:text-theme-accent-primary"
                            >
                              {showPasswords[vendor.id] ? <FaEyeSlash /> : <FaEye />}
                            </button>
                            <button
                              onClick={() => copyToClipboard(vendor.loginCredentials?.password || '', `password-${vendor.id}`)}
                              className="text-theme-text-tertiary hover:text-theme-accent-primary"
                            >
                              {copiedField === `password-${vendor.id}` ? <FaCheck className="text-green-500" /> : <FaCopy />}
                            </button>
                          </div>
                          {vendor.loginCredentials?.lastLogin && (
                            <div className="flex items-center space-x-2 text-xs text-theme-text-tertiary">
                              <FaClock />
                              <span>Last login: {new Date(vendor.loginCredentials.lastLogin).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-raleway font-medium ${getStatusColor(vendor.status)}`}>
                        {vendor.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {editingCredentials === vendor.id ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={handleSaveCredentials}
                            className="text-green-600 hover:text-green-700 p-1"
                            title="Save"
                          >
                            <FaSave />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="text-red-600 hover:text-red-700 p-1"
                            title="Cancel"
                          >
                            <FaTimes />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEditCredentials(vendor)}
                          className="text-theme-accent-primary hover:text-theme-accent-hover p-1"
                          title="Edit Credentials"
                        >
                          <FaEdit />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredVendors.length === 0 && (
          <div className="admin-card rounded-xl p-8 text-center">
            <FaExclamationTriangle className="text-4xl text-theme-text-tertiary mx-auto mb-4" />
            <h3 className="text-lg font-raleway font-semibold text-theme-text-primary mb-2">
              No Vendors Found
            </h3>
            <p className="text-theme-text-secondary">
              {searchTerm || statusFilter !== 'all' 
                ? 'No vendors match your current filters.' 
                : 'No vendors have been added to this zone yet.'
              }
            </p>
          </div>
        )}
      </div>
    </ZoneAdminLayout>
  );
};

export default VendorCredentials;
