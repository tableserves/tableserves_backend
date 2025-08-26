import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import LocalStorageService from '../../../services/LocalStorageService';
import {
  FaMapMarkerAlt,
  FaSearch,
  FaStore,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaBuilding,
  FaUsers,
  FaRupeeSign,
  FaDollarSign
} from 'react-icons/fa';
import SuperAdminLayout from '../SuperAdminLayout';

const FoodZonesManagement = () => {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  
  useEffect(() => {
    // Load zones from localStorage - include free, basic, and advanced plans (exclude premium)
    const loadZones = () => {
      try {
        // Initialize sample data if needed
        const existingZones = JSON.parse(localStorage.getItem('tableserve_zones') || '[]');
        if (existingZones.length === 0) {
          // Import and create sample zones if none exist
          import('../../../services/SampleDataService').then(({ default: SampleDataService }) => {
            SampleDataService.createSampleZones();
            // Reload after creating sample data
            setTimeout(() => loadZones(), 100);
          });
          return;
        }
        
        // Load zones from the correct localStorage key
        const zoneData = localStorage.getItem('tableserve_zones');
        const allZones = zoneData ? JSON.parse(zoneData) : [];
        
        // Filter zones to show only free, basic, and advanced plans (exclude premium and starter)
        const filteredZones = allZones.filter(zone => {
          const plan = zone.subscriptionPlan || zone.subscription?.plan || zone.subscription?.key || 'free';
          return ['free', 'basic', 'advanced'].includes(plan.toLowerCase());
        });
        
        console.log('Loading zones for Super Admin:', {
          total: allZones.length,
          filtered: filteredZones.length,
          allPlans: allZones.map(z => z.subscriptionPlan || z.subscription?.plan || 'free'),
          filteredPlans: filteredZones.map(z => z.subscriptionPlan || z.subscription?.plan || 'free')
        });
        
        setZones(filteredZones);
        setLoading(false);
      } catch (error) {
        console.error('Error loading zones:', error);
        setZones([]);
        setLoading(false);
      }
    };

    loadZones();
    
    // Listen for subscription updates
    const handleSubscriptionUpdate = () => {
      console.log('Super Admin: Zone subscription update detected');
      setTimeout(() => loadZones(), 100); // Small delay to ensure data is saved
    };
    
    window.addEventListener('subscriptionUpdated', handleSubscriptionUpdate);
    
    return () => {
      window.removeEventListener('subscriptionUpdated', handleSubscriptionUpdate);
    };
  }, []);

  const filteredZones = zones.filter(zone => {
    const matchesSearch = zone.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      zone.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      zone.ownerName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || zone.status === statusFilter;
    
    const zonePlan = zone.subscriptionPlan || zone.subscription?.plan || zone.subscription?.key || 'free';
    const matchesPlan = planFilter === 'all' || zonePlan.toLowerCase() === planFilter;
    
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'status-success bg-green-500/20';
      case 'suspended': return 'status-error bg-red-500/20';
      case 'pending': return 'status-warning bg-yellow-500/20';
      default: return 'text-theme-text-tertiary bg-gray-500/20';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <FaCheckCircle />;
      case 'suspended': return <FaTimesCircle />;
      case 'pending': return <FaClock />;
      default: return <FaClock />;
    }
  };



  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-theme-text-secondary text-xl">Loading food zones...</div>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-fredoka text-theme-text-primary mb-2">Food Zone Management</h1>
            <p className="text-theme-text-secondary font-raleway text-sm sm:text-base">Manage food zone accounts (Free, Basic & Advanced plans)</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 sm:p-6 border border-secondary">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-secondary" />
              <input
                type="text"
                placeholder="Search zones, cities, or owners..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/10 border border-secondary rounded-lg pl-10 pr-4 py-2 text-theme-text-secondary placeholder--secondary focus:outline-none focus:border-accent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white/10 border border-secondary rounded-lg px-4 py-2 text-theme-text-secondary focus:outline-none focus:border-accent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
            
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="bg-white/10 border border-secondary rounded-lg px-4 py-2 text-theme-text-secondary focus:outline-none focus:border-accent"
            >
              <option value="all">All Plans</option>
              <option value="free">Free Plan</option>
              <option value="basic">Basic Plan</option>
              <option value="advanced">Advanced Plan</option>
            </select>

          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 sm:p-6 border border-secondary shadow-md"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <FaMapMarkerAlt className="text-white text-xl" />
              </div>
            </div>
            <h3 className="text-2xl font-sans text-theme-text-secondary mb-1">{zones.length}</h3>
            <p className="text-theme-text-secondary font-raleway">Total Zones</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 sm:p-6 border border-secondary shadow-md"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                <FaCheckCircle className="text-white text-xl" />
              </div>
            </div>
            <h3 className="text-2xl font-fredoka text-theme-text-secondary mb-1">{zones.filter(z => z.status === 'active').length}</h3>
            <p className="text-theme-text-secondary font-raleway">Active Zones</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 sm:p-6 border border-secondary shadow-md"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <FaStore className="text-white text-xl" />
              </div>
            </div>
            <h3 className="text-2xl font-sans text-theme-text-secondary mb-1">{zones.reduce((sum, z) => sum + (Number(z?.vendors || z?.currentVendors || z?.vendorCount) || 0), 0)}</h3>
            <p className="text-theme-text-secondary font-raleway">Total Vendors</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 sm:p-6 border border-secondary shadow-md"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center">
                <FaRupeeSign className="text-white text-xl" />
              </div>
            </div>
            <h3 className="text-2xl font-sans text-theme-text-secondary mb-1">₹{zones.reduce((sum, z) => sum + (Number(z?.monthlyRevenue) || 0), 0).toLocaleString('en-IN')}</h3>
            <p className="text-theme-text-secondary font-raleway">Monthly Revenue</p>
          </motion.div>
        </div>

        {/* Zones List */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-secondary overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left p-4 text-theme-text-secondary font-raleway font-semibold">Zone</th>
                  <th className="text-left p-4 text-theme-text-secondary font-raleway font-semibold">Owner</th>
                  <th className="text-left p-4 text-theme-text-secondary font-raleway font-semibold">Plan</th>
                  <th className="text-left p-4 text-theme-text-secondary font-raleway font-semibold">Performance</th>
                  <th className="text-left p-4 text-theme-text-secondary font-raleway font-semibold">Status</th>
                  <th className="text-left p-4 text-theme-text-secondary font-raleway font-semibold">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {filteredZones.map((zone) => (
                  <motion.tr
                    key={zone.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-t border-secondary hover:bg-white/5 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <img
                          src={zone.logo || '/api/placeholder/40/40'}
                          alt={zone.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <div>
                          <h4 className="text-theme-text-primary font-raleway font-medium">{zone.name}</h4>
                          <p className="text-theme-text-secondary font-raleway text-sm">{zone.city}, {zone.state}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-theme-text-primary font-raleway">{zone.ownerName}</p>
                        <p className="text-theme-text-secondary font-raleway text-sm">{zone.ownerPhone}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-raleway ${
                        (zone.subscriptionPlan || zone.subscription?.plan || 'free').toLowerCase() === 'advanced'
                          ? 'bg-purple-500/20 text-purple-400'
                          : (zone.subscriptionPlan || zone.subscription?.plan || 'free').toLowerCase() === 'basic'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-green-500/20 text-green-400'
                      }`}>
                        <span className="capitalize">{zone.subscriptionPlan || zone.subscription?.plan || zone.subscription?.key || 'Free'}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-theme-text-primary font-sans font-medium">
                          {zone.vendors || zone.currentVendors || zone.vendorCount || 0} Vendors
                        </p>
                        <p className="text-theme-text-secondary font-raleway text-sm">
                          {zone.tables || zone.tableCount || 0} Tables
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-raleway ${getStatusColor(zone.status)}`}>
                        {getStatusIcon(zone.status)}
                        <span className="capitalize">{zone.status}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-theme-text-primary font-sans font-medium">₹{(zone.revenue || zone.monthlyRevenue || '0').toString().replace('₹', '').replace(',', '')}</p>
                        <p className="text-theme-text-secondary font-raleway text-sm">{zone.orders || zone.totalOrders || 0} orders</p>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {filteredZones.length === 0 && (
            <div className="text-center py-12">
              <FaMapMarkerAlt className="text-6xl text-theme-text-tertiary mx-auto mb-4" />
              <h3 className="text-xl font-fredoka text-theme-text-primary mb-2">
                {zones.length === 0 ? 'No Food Zones Yet' : 'No Zones Found'}
              </h3>
              <p className="text-theme-text-secondary font-raleway mb-4">
                {zones.length === 0
                  ? 'Food Zones will appear here once clients create accounts'
                  : 'No zones match your current search criteria'
                }
              </p>
            
            </div>
          )}
        </div>

        
      </div>
    </SuperAdminLayout>
  );
};

export default FoodZonesManagement;
