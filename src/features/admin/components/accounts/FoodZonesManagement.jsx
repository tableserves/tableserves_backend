import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DatabaseService from '../../../../services/DatabaseService';
import {
  FaMapMarkerAlt,
  FaSearch,
  FaStore,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaFilter
} from 'react-icons/fa';
import SuperAdminLayout from '../SuperAdminLayout';

const FoodZonesManagement = () => {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');

  useEffect(() => {
    const fetchZones = async () => {
      try {
        setLoading(true);
        const data = await DatabaseService.getZones();
        
        const transformedZones = (Array.isArray(data) ? data : []).map(zone => {
          return {
            id: zone._id || zone.id,
            name: zone.name || 'Unnamed Zone',
            description: zone.description || '',
            location: zone.location || '',
            
            // Owner information
            ownerName: (
              zone.adminId?.profile?.name || zone.adminId?.name ||
              zone.admin?.profile?.name || zone.admin?.name ||
              zone.ownerName || 'Unknown Owner'
            ),
            ownerEmail: (
              zone.adminId?.email || zone.admin?.email ||
              zone.contactInfo?.email || zone.ownerEmail || 'No email'
            ),
            ownerPhone: (
              zone.adminId?.phone || zone.admin?.phone ||
              zone.contactInfo?.phone || zone.ownerPhone || 'No phone'
            ),
            
            // Location parsing
            city: zone.city || (zone.location && zone.location.includes(',') ? zone.location.split(',')[0]?.trim() : zone.location) || 'Unknown City',
            state: zone.state || (zone.location && zone.location.includes(',') ? zone.location.split(',')[1]?.trim() : '') || 'Unknown State',
            
            // Subscription & Status
            subscriptionPlan: (
              zone.subscriptionId?.planType || zone.subscriptionId?.plan ||
              zone.subscription?.planType || zone.subscription?.plan ||
              zone.subscriptionPlan || 'free'
            ),
            status: (() => {
              const originalStatus = zone.status;
              const isActive = zone.active;
              if (originalStatus === 'inactive' || isActive === false) return 'inactive';
              if (originalStatus === 'active' || isActive === true) return 'active';
              if (originalStatus === 'suspended') return 'suspended';
              return 'pending';
            })(),
            
            // Performance metrics
            vendors: Number(zone.stats?.totalShops || zone.vendors || zone.currentVendors || zone.vendorCount || 0),
            logo: zone.settings?.theme?.logoUrl || zone.logo || null,
          };
        });
        
        // Filter zones to show only free, basic, and advanced plans
        const filteredToAllowedPlans = transformedZones.filter(zone => {
          const plan = zone.subscriptionPlan || 'free';
          return ['free', 'basic', 'advanced'].includes(plan.toLowerCase());
        });

        setZones(filteredToAllowedPlans);
      } catch (error) {
        console.error('Error fetching zones:', error);
        setZones([]);
      } finally {
        setLoading(false);
      }
    };

    fetchZones();
  }, []);

  // Memoized filtering for better performance
  const filteredZones = useMemo(() => {
    return zones.filter(zone => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = zone.name?.toLowerCase().includes(search) ||
        zone.city?.toLowerCase().includes(search) ||
        zone.ownerName?.toLowerCase().includes(search);
      
      const matchesStatus = statusFilter === 'all' || zone.status === statusFilter;
      
      const zonePlan = (zone.subscriptionPlan || 'free').toLowerCase();
      const matchesPlan = planFilter === 'all' || zonePlan === planFilter;
      
      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [zones, searchTerm, statusFilter, planFilter]);

  // Memoized top-level stats
  const stats = useMemo(() => {
    return {
      total: zones.length,
      active: zones.filter(z => z.status === 'active').length,
      vendors: zones.reduce((sum, z) => sum + z.vendors, 0)
    };
  }, [zones]);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
      case 'suspended': 
      case 'inactive': return 'bg-rose-500/10 text-rose-500 border-rose-500/30';
      case 'pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/30';
    }
  };

  const getPlanStyle = (plan) => {
    const lowerPlan = (plan || 'free').toLowerCase();
    if (lowerPlan === 'advanced') return 'bg-purple-500/10 text-purple-500 border-purple-500/30';
    if (lowerPlan === 'basic') return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
    return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
  };

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center min-h-[70vh]">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center">
            <div className="w-14 h-14 border-4 border-theme-border-primary border-t-theme-accent-primary rounded-full animate-spin mb-4"></div>
            <p className="text-theme-text-primary font-fredoka text-xl">Loading Food Zones...</p>
          </motion.div>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-8 max-w-[1400px] mx-auto pb-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-theme-bg-secondary p-6 sm:p-8 rounded-3xl border border-theme-border-primary/60 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-theme-accent-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-fredoka text-theme-text-primary mb-1">Food Zone Management</h1>
            <p className="text-theme-text-secondary font-raleway">Manage and monitor Standard, Basic, and Advanced zone plans.</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-theme-bg-secondary border border-theme-border-primary/60 rounded-3xl p-6 relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-sm font-medium text-theme-text-tertiary font-raleway uppercase tracking-wider mb-2">Total Zones</p>
                <p className="text-3xl font-fredoka text-theme-text-primary">{stats.total}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 shadow-purple-500/20 shadow-lg text-white">
                <FaMapMarkerAlt className="text-xl" />
              </div>
            </div>
            <FaMapMarkerAlt className="absolute -bottom-6 -right-6 text-8xl text-purple-500 opacity-5 group-hover:opacity-10 transition-all duration-500 transform group-hover:scale-110" />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-theme-bg-secondary border border-theme-border-primary/60 rounded-3xl p-6 relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-sm font-medium text-theme-text-tertiary font-raleway uppercase tracking-wider mb-2">Active Zones</p>
                <p className="text-3xl font-fredoka text-theme-text-primary">{stats.active}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/20 shadow-lg text-white">
                <FaCheckCircle className="text-xl" />
              </div>
            </div>
            <FaCheckCircle className="absolute -bottom-6 -right-6 text-8xl text-emerald-500 opacity-5 group-hover:opacity-10 transition-all duration-500 transform group-hover:scale-110" />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-theme-bg-secondary border border-theme-border-primary/60 rounded-3xl p-6 relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-sm font-medium text-theme-text-tertiary font-raleway uppercase tracking-wider mb-2">Total Vendors</p>
                <p className="text-3xl font-fredoka text-theme-text-primary">{stats.vendors}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 shadow-blue-500/20 shadow-lg text-white">
                <FaStore className="text-xl" />
              </div>
            </div>
            <FaStore className="absolute -bottom-6 -right-6 text-8xl text-blue-500 opacity-5 group-hover:opacity-10 transition-all duration-500 transform group-hover:scale-110" />
          </motion.div>
        </div>

        {/* Filters */}
        <div className="bg-theme-bg-secondary border border-theme-border-primary/60 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary" />
            <input
              type="text"
              placeholder="Search by zone name, city, or owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-theme-bg border border-theme-border-primary rounded-xl pl-11 pr-4 py-3 text-sm text-theme-text-primary placeholder-theme-text-tertiary focus:outline-none focus:border-theme-accent-primary transition-colors"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative min-w-[150px]">
              <FaFilter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary text-xs" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-theme-bg border border-theme-border-primary rounded-xl pl-10 pr-4 py-3 text-sm text-theme-text-primary focus:outline-none focus:border-theme-accent-primary appearance-none cursor-pointer transition-colors"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="relative min-w-[150px]">
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="w-full bg-theme-bg border border-theme-border-primary rounded-xl px-4 py-3 text-sm text-theme-text-primary focus:outline-none focus:border-theme-accent-primary appearance-none cursor-pointer transition-colors"
              >
                <option value="all">All Plans</option>
                <option value="free">Free Plan</option>
                <option value="basic">Basic Plan</option>
                <option value="advanced">Advanced Plan</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-theme-bg-secondary border border-theme-border-primary/60 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left border-collapse">
              <thead className="bg-theme-bg/50 border-b border-theme-border-primary/60">
                <tr>
                  <th className="px-6 py-5 text-xs font-bold text-theme-text-tertiary uppercase tracking-wider">Zone Info</th>
                  <th className="px-6 py-5 text-xs font-bold text-theme-text-tertiary uppercase tracking-wider">Owner Details</th>
                  <th className="px-6 py-5 text-xs font-bold text-theme-text-tertiary uppercase tracking-wider">Subscription</th>
                  <th className="px-6 py-5 text-xs font-bold text-theme-text-tertiary uppercase tracking-wider">Performance</th>
                  <th className="px-6 py-5 text-xs font-bold text-theme-text-tertiary uppercase tracking-wider">Status</th>
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
                          <div className="w-12 h-12 rounded-xl bg-theme-bg border border-theme-border-primary flex items-center justify-center overflow-hidden shadow-sm">
                            {zone.logo ? (
                              <img src={zone.logo} alt={zone.name} className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                            ) : (
                              <FaMapMarkerAlt className="text-theme-text-tertiary text-lg" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-theme-text-primary font-raleway text-sm">{zone.name}</p>
                            <p className="text-xs text-theme-text-secondary mt-0.5">{zone.city}, {zone.state}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <p className="text-sm font-semibold text-theme-text-primary">{zone.ownerName}</p>
                        <p className="text-xs text-theme-text-secondary mt-0.5">{zone.ownerPhone}</p>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full border ${getPlanStyle(zone.subscriptionPlan)}`}>
                          {zone.subscriptionPlan || 'Free'}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <FaStore className="text-theme-text-tertiary text-sm" />
                          <span className="text-sm font-medium text-theme-text-primary">{zone.vendors} Vendors</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full border inline-flex items-center space-x-1.5 ${getStatusStyle(zone.status)}`}>
                          {zone.status === 'active' && <FaCheckCircle className="text-xs" />}
                          {zone.status === 'suspended' && <FaTimesCircle className="text-xs" />}
                          {zone.status === 'pending' && <FaClock className="text-xs" />}
                          <span>{zone.status}</span>
                        </span>
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
                  <FaMapMarkerAlt className="text-3xl text-theme-text-tertiary opacity-50" />
                </div>
                <h3 className="text-lg font-fredoka text-theme-text-primary mb-1">
                  {zones.length === 0 ? 'No Food Zones Found' : 'No Matches Found'}
                </h3>
                <p className="text-theme-text-secondary font-raleway text-sm">
                  {zones.length === 0
                    ? 'Zones will appear here once registered.'
                    : 'Try adjusting your search or filter settings.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default FoodZonesManagement;