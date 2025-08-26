import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import {
  FaDollarSign,
  FaStore,
  FaCalendarAlt,
  FaDownload,
  FaEye,
  FaFilter,
  FaChartBar,
  FaCreditCard,
  FaPercent,
  FaArrowUp,
  FaArrowDown
} from 'react-icons/fa';
import ZoneAdminLayout from '../ZoneAdminLayout';
import LocalStorageService from '../../../services/LocalStorageService';

const PayoutTracking = () => {
  const { zoneId } = useParams();
  const [payouts, setPayouts] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('month');
  const [shopFilter, setShopFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);

  useEffect(() => {
    const loadData = () => {
      setLoading(true);
      try {
        // Load shops and payouts from localStorage
        const zoneShops = LocalStorageService.getZoneShops(zoneId);
        const zonePayouts = LocalStorageService.getItem(`zone_payouts_${zoneId}`) || [];
        
        setShops(zoneShops);
        setPayouts(zonePayouts);
      } catch (error) {
        console.error('Error loading payout data:', error);
        setShops([]);
        setPayouts([]);
      } finally {
        setLoading(false);
      }
    };

    if (zoneId) {
      loadData();
    }
  }, [zoneId]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-status-warning bg-status-warning-light';
      case 'processing': return 'text-status-info bg-status-info-light';
      case 'completed': return 'text-status-success bg-status-success-light';
      case 'failed': return 'text-status-error bg-status-error-light';
      default: return 'text-theme-text-tertiary bg-theme-bg-secondary';
    }
  };

  const filteredPayouts = payouts.filter(payout => {
    const matchesShop = shopFilter === 'all' || payout.shopId === shopFilter;
    const matchesStatus = statusFilter === 'all' || payout.status === statusFilter;
    
    // Date filtering
    const payoutDate = new Date(payout.createdAt);
    const today = new Date();
    const matchesDate = dateFilter === 'all' || 
      (dateFilter === 'week' && payoutDate >= new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) ||
      (dateFilter === 'month' && payoutDate >= new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)) ||
      (dateFilter === 'quarter' && payoutDate >= new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000));

    return matchesShop && matchesStatus && matchesDate;
  });

  const calculateTotals = () => {
    const totalRevenue = filteredPayouts.reduce((sum, payout) => sum + payout.totalRevenue, 0);
    const totalCommission = filteredPayouts.reduce((sum, payout) => sum + payout.commissionAmount, 0);
    const totalPayout = filteredPayouts.reduce((sum, payout) => sum + payout.payoutAmount, 0);
    
    return { totalRevenue, totalCommission, totalPayout };
  };

  const { totalRevenue, totalCommission, totalPayout } = calculateTotals();

  const handleViewPayout = (payout) => {
    setSelectedPayout(payout);
    setShowPayoutModal(true);
  };

  if (loading) {
    return (
      <ZoneAdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 spinner-theme rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-theme-text-primary font-raleway">Loading payout data...</p>
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
            Payout Tracking
          </h1>
          <p className="text-theme-text-secondary font-raleway">
            Track revenue splits and payouts for all shops in your zone
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="admin-card rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-theme-text-tertiary font-raleway text-sm">Total Revenue</p>
                <p className="text-2xl font-fredoka text-theme-text-primary">₹{totalRevenue.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-theme-accent-primary/20 rounded-lg flex items-center justify-center">
                <FaDollarSign className="text-theme-accent-primary text-xl" />
              </div>
            </div>
          </div>

          <div className="admin-card rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-theme-text-tertiary font-raleway text-sm">Zone Commission</p>
                <p className="text-2xl font-fredoka text-theme-text-primary">₹{totalCommission.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-status-warning/20 rounded-lg flex items-center justify-center">
                <FaPercent className="text-status-warning text-xl" />
              </div>
            </div>
          </div>

          <div className="admin-card rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-theme-text-tertiary font-raleway text-sm">Shop Payouts</p>
                <p className="text-2xl font-fredoka text-theme-text-primary">₹{totalPayout.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-status-success/20 rounded-lg flex items-center justify-center">
                <FaCreditCard className="text-status-success text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="admin-card rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-theme-text-primary font-raleway font-medium mb-2">Date Range</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="input-theme rounded-lg px-4 py-2 w-full"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="all">All Time</option>
              </select>
            </div>

            <div>
              <label className="block text-theme-text-primary font-raleway font-medium mb-2">Shop</label>
              <select
                value={shopFilter}
                onChange={(e) => setShopFilter(e.target.value)}
                className="input-theme rounded-lg px-4 py-2 w-full"
              >
                <option value="all">All Shops</option>
                {shops.map(shop => (
                  <option key={shop.id} value={shop.id}>{shop.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-theme-text-primary font-raleway font-medium mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-theme rounded-lg px-4 py-2 w-full"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Payouts Table */}
        <div className="admin-card rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-theme-bg-secondary">
                <tr>
                  <th className="text-left p-4 text-theme-text-primary font-raleway font-semibold">Payout ID</th>
                  <th className="text-left p-4 text-theme-text-primary font-raleway font-semibold">Shop</th>
                  <th className="text-left p-4 text-theme-text-primary font-raleway font-semibold">Period</th>
                  <th className="text-left p-4 text-theme-text-primary font-raleway font-semibold">Revenue</th>
                  <th className="text-left p-4 text-theme-text-primary font-raleway font-semibold">Commission</th>
                  <th className="text-left p-4 text-theme-text-primary font-raleway font-semibold">Payout</th>
                  <th className="text-left p-4 text-theme-text-primary font-raleway font-semibold">Status</th>
                  <th className="text-left p-4 text-theme-text-primary font-raleway font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayouts.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center p-8">
                      <div className="text-theme-text-tertiary">
                        <FaDollarSign className="text-4xl mx-auto mb-4 opacity-50" />
                        <p className="font-raleway">No payout records found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPayouts.map((payout) => (
                    <motion.tr
                      key={payout.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-theme-border-primary hover:bg-theme-bg-hover transition-colors"
                    >
                      <td className="p-4">
                        <span className="font-raleway font-medium text-theme-text-primary">#{payout.id}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <FaStore className="text-theme-accent-primary" />
                          <span className="font-raleway text-theme-text-primary">{payout.shopName}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-raleway text-theme-text-primary text-sm">{payout.period}</p>
                          <p className="font-raleway text-theme-text-tertiary text-xs">
                            {new Date(payout.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-raleway font-semibold text-theme-text-primary">₹{payout.totalRevenue.toLocaleString()}</span>
                      </td>
                      <td className="p-4">
                        <div>
                          <span className="font-raleway font-semibold text-status-warning">₹{payout.commissionAmount.toLocaleString()}</span>
                          <p className="text-theme-text-tertiary font-raleway text-xs">({payout.commissionRate}%)</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-raleway font-semibold text-status-success">₹{payout.payoutAmount.toLocaleString()}</span>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-raleway font-medium ${getStatusColor(payout.status)}`}>
                          {payout.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleViewPayout(payout)}
                          className="p-2 text-theme-text-secondary hover:text-theme-accent-primary hover:bg-theme-accent-primary/10 rounded-lg transition-colors"
                          title="View Payout Details"
                        >
                          <FaEye />
                        </button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payout Details Modal */}
        {showPayoutModal && selectedPayout && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="admin-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-fredoka text-theme-text-primary">
                  Payout Details - #{selectedPayout.id}
                </h2>
                <button
                  onClick={() => setShowPayoutModal(false)}
                  className="text-theme-text-tertiary hover:text-theme-text-primary"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-6">
                {/* Payout Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-fredoka text-theme-text-primary mb-3">Payout Information</h3>
                    <div className="space-y-2">
                      <p className="text-theme-text-secondary font-raleway">
                        <strong>Shop:</strong> {selectedPayout.shopName}
                      </p>
                      <p className="text-theme-text-secondary font-raleway">
                        <strong>Period:</strong> {selectedPayout.period}
                      </p>
                      <p className="text-theme-text-secondary font-raleway">
                        <strong>Status:</strong> 
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${getStatusColor(selectedPayout.status)}`}>
                          {selectedPayout.status}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-fredoka text-theme-text-primary mb-3">Financial Breakdown</h3>
                    <div className="space-y-2">
                      <p className="text-theme-text-secondary font-raleway">
                        <strong>Total Revenue:</strong> ₹{selectedPayout.totalRevenue.toLocaleString()}
                      </p>
                      <p className="text-theme-text-secondary font-raleway">
                        <strong>Commission ({selectedPayout.commissionRate}%):</strong> ₹{selectedPayout.commissionAmount.toLocaleString()}
                      </p>
                      <p className="text-theme-text-primary font-raleway font-semibold text-lg">
                        <strong>Net Payout:</strong> ₹{selectedPayout.payoutAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </ZoneAdminLayout>
  );
};

export default PayoutTracking;
