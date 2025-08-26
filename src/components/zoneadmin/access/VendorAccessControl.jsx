import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import {
  FaLock,
  FaUnlock,
  FaStore,
  FaToggleOff,
  FaExclamationTriangle,
  FaTimes,
  FaClock,
  FaUser,
  FaPhone,
  FaEnvelope
} from 'react-icons/fa';
import ZoneAdminLayout from '../ZoneAdminLayout';
import LocalStorageService from '../../../services/LocalStorageService';

const VendorAccessControl = () => {
  const { zoneId } = useParams();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [accessAction, setAccessAction] = useState('');
  const [accessReason, setAccessReason] = useState('');

  useEffect(() => {
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

    if (zoneId) {
      loadVendors();
    }
  }, [zoneId]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-status-success bg-status-success-light';
      case 'suspended': return 'text-status-error bg-status-error-light';
      case 'pending': return 'text-status-warning bg-status-warning-light';
      case 'inactive': return 'text-theme-text-tertiary bg-theme-bg-secondary';
      default: return 'text-theme-text-tertiary bg-theme-bg-secondary';
    }
  };

  const getAccessIcon = (status) => {
    switch (status) {
      case 'active': return <FaUnlock className="text-status-success" />;
      case 'suspended': return <FaLock className="text-status-error" />;
      case 'pending': return <FaClock className="text-status-warning" />;
      default: return <FaLock className="text-theme-text-tertiary" />;
    }
  };

  const handleAccessAction = (vendor, action) => {
    setSelectedVendor(vendor);
    setAccessAction(action);
    setAccessReason('');
    setShowAccessModal(true);
  };

  const confirmAccessAction = () => {
    if (!selectedVendor || !accessAction) return;

    let newStatus = selectedVendor.status;
    switch (accessAction) {
      case 'activate':
        newStatus = 'active';
        break;
      case 'suspend':
        newStatus = 'suspended';
        break;
      case 'deactivate':
        newStatus = 'inactive';
        break;
    }

    // Update vendor status
    const updatedVendor = LocalStorageService.updateZoneVendor(zoneId, selectedVendor.id, {
      status: newStatus,
      lastStatusChange: new Date().toISOString(),
      statusChangeReason: accessReason
    });

    if (updatedVendor) {
      setVendors(prev => prev.map(v =>
        v.id === selectedVendor.id ? updatedVendor : v
      ));
    }

    setShowAccessModal(false);
    setSelectedVendor(null);
    setAccessAction('');
    setAccessReason('');
  };

  const getActionText = (action) => {
    switch (action) {
      case 'activate': return 'Activate';
      case 'suspend': return 'Suspend';
      case 'deactivate': return 'Deactivate';
      default: return '';
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'activate': return 'bg-status-success hover:bg-status-success/90';
      case 'suspend': return 'bg-status-error hover:bg-status-error/90';
      case 'deactivate': return 'bg-theme-text-tertiary hover:bg-theme-text-tertiary/90';
      default: return 'bg-theme-accent-primary hover:bg-theme-accent-primary/90';
    }
  };

  if (loading) {
    return (
      <ZoneAdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 spinner-theme rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-theme-text-primary font-raleway">Loading vendor access data...</p>
          </div>
        </div>
      </ZoneAdminLayout>
    );
  }

  return (
    <ZoneAdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-fredoka text-theme-text-primary mb-2">
            Vendor Access Control
          </h1>
          <p className="text-theme-text-secondary font-raleway">
            Manage vendor access permissions and account status
          </p>
        </div>

        {/* Access Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="admin-card rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-theme-text-tertiary font-raleway text-sm">Active Vendors</p>
                <p className="text-2xl font-fredoka text-status-success">
                  {vendors.filter(v => v.status === 'active').length}
                </p>
              </div>
              <FaUnlock className="text-status-success text-2xl" />
            </div>
          </div>

          <div className="admin-card rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-theme-text-tertiary font-raleway text-sm">Suspended</p>
                <p className="text-2xl font-fredoka text-status-error">
                  {vendors.filter(v => v.status === 'suspended').length}
                </p>
              </div>
              <FaLock className="text-status-error text-2xl" />
            </div>
          </div>

          <div className="admin-card rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-theme-text-tertiary font-raleway text-sm">Pending</p>
                <p className="text-2xl font-fredoka text-status-warning">
                  {vendors.filter(v => v.status === 'pending').length}
                </p>
              </div>
              <FaClock className="text-status-warning text-2xl" />
            </div>
          </div>

          <div className="admin-card rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-theme-text-tertiary font-raleway text-sm">Total Vendors</p>
                <p className="text-2xl font-fredoka text-theme-text-primary">{vendors.length}</p>
              </div>
              <FaStore className="text-theme-accent-primary text-2xl" />
            </div>
          </div>
        </div>

        {/* Vendors Table */}
        <div className="admin-card rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-theme-bg-secondary">
                <tr>
                  <th className="text-left p-4 text-theme-text-primary font-raleway font-semibold">Vendor</th>
                  <th className="text-left p-4 text-theme-text-primary font-raleway font-semibold">Owner</th>
                  <th className="text-left p-4 text-theme-text-primary font-raleway font-semibold">Contact</th>
                  <th className="text-left p-4 text-theme-text-primary font-raleway font-semibold">Status</th>
                  <th className="text-left p-4 text-theme-text-primary font-raleway font-semibold">Last Activity</th>
                  <th className="text-left p-4 text-theme-text-primary font-raleway font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center p-8">
                      <div className="text-theme-text-tertiary">
                        <FaStore className="text-4xl mx-auto mb-4 opacity-50" />
                        <p className="font-raleway">No vendors found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  vendors.map((vendor) => (
                    <motion.tr
                      key={vendor.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-theme-border-primary hover:bg-theme-bg-hover transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-theme-accent-primary rounded-lg flex items-center justify-center overflow-hidden">
                            {vendor.logo ? (
                              <img
                                src={vendor.logo}
                                alt={`${vendor.name} logo`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <FaStore className="text-theme-text-inverse" />
                            )}
                          </div>
                          <div>
                            <p className="font-raleway font-medium text-theme-text-primary">{vendor.name}</p>
                            <p className="text-theme-text-tertiary font-raleway text-sm">{vendor.cuisine}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <FaUser className="text-theme-text-tertiary" />
                          <span className="font-raleway text-theme-text-primary">{vendor.ownerName}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <FaPhone className="text-theme-text-tertiary text-xs" />
                            <span className="font-raleway text-theme-text-secondary text-sm">{vendor.ownerPhone}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <FaEnvelope className="text-theme-text-tertiary text-xs" />
                            <span className="font-raleway text-theme-text-secondary text-sm">{vendor.ownerEmail}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          {getAccessIcon(vendor.status)}
                          <span className={`px-3 py-1 rounded-full text-xs font-raleway font-medium ${getStatusColor(vendor.status)}`}>
                            {vendor.status}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-raleway text-theme-text-primary text-sm">
                            {vendor.lastActivity ? new Date(vendor.lastActivity).toLocaleDateString() : 'Never'}
                          </p>
                          <p className="font-raleway text-theme-text-tertiary text-xs">
                            {vendor.lastActivity ? new Date(vendor.lastActivity).toLocaleTimeString() : ''}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          {vendor.status === 'active' && (
                            <button
                              onClick={() => handleAccessAction(vendor, 'suspend')}
                              className="p-2 text-status-error hover:bg-status-error/10 rounded-lg transition-colors"
                              title="Suspend Vendor"
                            >
                              <FaLock />
                            </button>
                          )}
                          {(vendor.status === 'suspended' || vendor.status === 'inactive') && (
                            <button
                              onClick={() => handleAccessAction(vendor, 'activate')}
                              className="p-2 text-status-success hover:bg-status-success/10 rounded-lg transition-colors"
                              title="Activate Vendor"
                            >
                              <FaUnlock />
                            </button>
                          )}
                          {vendor.status === 'active' && (
                            <button
                              onClick={() => handleAccessAction(vendor, 'deactivate')}
                              className="p-2 text-theme-text-tertiary hover:bg-theme-text-tertiary/10 rounded-lg transition-colors"
                              title="Deactivate Vendor"
                            >
                              <FaToggleOff />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Access Action Modal */}
        {showAccessModal && selectedVendor && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="admin-card rounded-2xl p-6 w-full max-w-md"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-status-warning/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaExclamationTriangle className="text-2xl text-status-warning" />
                </div>
                <h2 className="text-xl font-fredoka text-theme-text-primary mb-2">
                  {getActionText(accessAction)} Vendor
                </h2>
                <p className="text-theme-text-secondary font-raleway mb-6">
                  Are you sure you want to {accessAction} <strong>{selectedVendor.name}</strong>?
                </p>

                <div className="mb-6">
                  <label className="block text-theme-text-primary font-raleway font-medium mb-2">
                    Reason (Optional)
                  </label>
                  <textarea
                    value={accessReason}
                    onChange={(e) => setAccessReason(e.target.value)}
                    className="input-theme rounded-lg px-4 py-2 w-full"
                    rows="3"
                    placeholder="Enter reason for this action..."
                  />
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={() => setShowAccessModal(false)}
                    className="flex-1 btn-secondary py-2 rounded-lg font-raleway"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmAccessAction}
                    className={`flex-1 text-white py-2 rounded-lg font-raleway ${getActionColor(accessAction)}`}
                  >
                    {getActionText(accessAction)}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </ZoneAdminLayout>
  );
};

export default VendorAccessControl;
