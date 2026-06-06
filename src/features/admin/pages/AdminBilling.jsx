import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaCreditCard,
  FaDollarSign,
  FaCheck,
  FaTimes,
  FaExclamationTriangle,
  FaDownload,
  FaEye,
  FaSyncAlt,
  FaRegFileAlt,
  FaBoxOpen
} from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';
import SuperAdminLayout from '../components/SuperAdminLayout';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

const AdminBilling = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  
  const [billingStats, setBillingStats] = useState({
    monthlyRevenue: 0,
    activeSubscriptions: 0,
    failedPayments: 0,
    pendingRenewals: 0
  });

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [subscriptionsRes, paymentsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/admin/subscriptions`, config).catch(() => ({ data: { data: [] } })),
        axios.get(`${API_BASE_URL}/payment/history?limit=50`, config).catch(() => ({ data: { data: { payments: [] } } }))
      ]);

      const subscriptionsData = subscriptionsRes.data?.data || [];
      const paymentsData = paymentsRes.data?.data?.payments || [];

      // Calculate stats
      const activeSubscriptions = subscriptionsData.filter(sub => sub.status === 'active').length;
      const failedPayments = paymentsData.filter(p => p.status === 'failed').length;
      
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      const pendingRenewals = subscriptionsData.filter(sub => {
        if (!sub.endDate || sub.status !== 'active') return false;
        const endDate = new Date(sub.endDate);
        return endDate <= sevenDaysFromNow && endDate > new Date();
      }).length;

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyRevenue = paymentsData
        .filter(p => {
          if (p.status !== 'paid') return false;
          const paymentDate = new Date(p.createdAt);
          return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
        })
        .reduce((sum, p) => sum + (p.totalAmount || 0), 0);

      setBillingStats({ monthlyRevenue, activeSubscriptions, failedPayments, pendingRenewals });
      setSubscriptions(subscriptionsData);
      setTransactions(paymentsData);

    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const getInitials = (email) => {
    if (!email) return 'U';
    return email.charAt(0).toUpperCase();
  };

  const getPlanStyle = (planKey) => {
    if (!planKey) return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    const key = planKey.toLowerCase();
    if (key.includes('premium') || key.includes('enterprise')) return 'bg-purple-500/10 text-purple-500 border-purple-500/30 shadow-purple-500/10';
    if (key.includes('advanced') || key.includes('professional')) return 'bg-blue-500/10 text-blue-500 border-blue-500/30 shadow-blue-500/10';
    return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 shadow-emerald-500/10';
  };

  const getStatusStyle = (status) => {
    if (!status) return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    const lowerStatus = status.toLowerCase();
    if (['active', 'paid', 'completed'].includes(lowerStatus)) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
    if (['inactive', 'failed', 'cancelled'].includes(lowerStatus)) return 'bg-rose-500/10 text-rose-500 border-rose-500/30';
    if (['pending', 'trial'].includes(lowerStatus)) return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
    return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  };

  const handleAction = (actionName) => toast.info(`${actionName} feature coming soon!`);

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center min-h-[70vh]">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center">
            <div className="relative w-16 h-16 flex items-center justify-center mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-theme-border-primary opacity-20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-theme-accent-primary border-t-transparent animate-spin"></div>
              <FaDollarSign className="text-theme-accent-primary text-xl animate-pulse" />
            </div>
            <p className="text-theme-text-primary font-fredoka text-xl mb-1">Loading Financials</p>
            <p className="text-theme-text-tertiary font-raleway text-sm">Securely fetching billing records...</p>
          </motion.div>
        </div>
      </SuperAdminLayout>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'transactions', label: `Transactions (${transactions.length})` },
    { id: 'subscriptions', label: `Subscriptions (${subscriptions.length})` }
  ];

  const stats = [
    { title: 'Monthly Revenue', value: formatCurrency(billingStats.monthlyRevenue), icon: FaDollarSign, gradient: 'from-emerald-400 to-emerald-600', text: 'text-emerald-500', shadow: 'shadow-emerald-500/20' },
    { title: 'Active Subscriptions', value: billingStats.activeSubscriptions, icon: FaCheck, gradient: 'from-blue-400 to-blue-600', text: 'text-blue-500', shadow: 'shadow-blue-500/20' },
    { title: 'Failed Payments', value: billingStats.failedPayments, icon: FaExclamationTriangle, gradient: 'from-rose-400 to-rose-600', text: 'text-rose-500', shadow: 'shadow-rose-500/20' },
    { title: 'Pending Renewals', value: billingStats.pendingRenewals, icon: FaCreditCard, gradient: 'from-amber-400 to-amber-600', text: 'text-amber-500', shadow: 'shadow-amber-500/20' }
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-8 max-w-[1400px] mx-auto pb-10">
        
        {/* Header Area */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-theme-bg-secondary p-8 rounded-3xl border border-theme-border-primary/60 relative overflow-hidden">
          {/* Decorative Background Blur */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-theme-accent-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
          
          <div className="relative z-10">
            <motion.h1 
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} 
              className="text-3xl md:text-4xl font-fredoka text-theme-text-primary mb-2"
            >
              Billing & Financials
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
              className="text-theme-text-secondary font-raleway"
            >
              Monitor platform revenue, transactions, and subscription health.
            </motion.p>
          </div>
          <motion.button 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
            onClick={() => fetchBillingData(true)}
            disabled={isRefreshing}
            className="relative z-10 flex items-center justify-center space-x-2 px-6 py-3 bg-theme-bg border border-theme-border-primary hover:border-theme-accent-primary/50 rounded-xl text-theme-text-primary transition-all shadow-sm hover:shadow-md disabled:opacity-50 group font-medium"
          >
            <FaSyncAlt className={`${isRefreshing ? 'animate-spin text-theme-accent-primary' : 'text-theme-text-secondary group-hover:text-theme-accent-primary transition-colors'}`} />
            <span>{isRefreshing ? 'Syncing Data...' : 'Refresh Data'}</span>
          </motion.button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div 
              key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} 
              className="relative overflow-hidden bg-theme-bg-secondary border border-theme-border-primary/60 rounded-3xl p-6 group hover:border-theme-border-primary transition-colors duration-300 shadow-sm hover:shadow-md"
            >
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-sm font-medium text-theme-text-tertiary font-raleway uppercase tracking-wider mb-2">{stat.title}</p>
                  <p className="text-3xl font-fredoka text-theme-text-primary">{stat.value}</p>
                </div>
                <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${stat.gradient} ${stat.shadow} shadow-lg text-white`}>
                  <stat.icon className="text-xl" />
                </div>
              </div>
              {/* Subtle background icon */}
              <stat.icon className={`absolute -bottom-6 -right-6 text-8xl ${stat.text} opacity-5 group-hover:opacity-10 transition-opacity duration-500 transform group-hover:scale-110 group-hover:-rotate-12`} />
            </motion.div>
          ))}
        </div>

        {/* Segmented Control Tabs */}
        <div className="flex justify-center md:justify-start">
          <div className="inline-flex p-1.5 space-x-1 bg-theme-bg-secondary/80 backdrop-blur-md rounded-2xl border border-theme-border-primary/50 shadow-sm w-full md:w-auto overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-6 py-3 text-sm font-bold font-raleway rounded-xl transition-all whitespace-nowrap outline-none ${
                  activeTab === tab.id ? 'text-white' : 'text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg/50'
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-theme-accent-primary rounded-xl -z-10 shadow-md"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="min-h-[500px]">
          <AnimatePresence mode="wait">
            
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* Financial Summary */}
                <div className="xl:col-span-1 space-y-6">
                  <div className="bg-theme-bg-secondary border border-theme-border-primary/60 rounded-3xl p-8 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                    <h2 className="text-xl font-fredoka text-theme-text-primary mb-8 relative z-10">Revenue Insights</h2>
                    
                    <div className="space-y-8 relative z-10">
                      <div>
                        <p className="text-sm font-medium text-theme-text-tertiary mb-1 font-raleway uppercase tracking-wider">Current Month</p>
                        <p className="text-4xl font-bold text-emerald-500 font-fredoka tracking-tight">{formatCurrency(billingStats.monthlyRevenue)}</p>
                      </div>
                      <div className="h-px w-full bg-theme-border-primary/50"></div>
                      <div>
                        <p className="text-sm font-medium text-theme-text-tertiary mb-1 font-raleway uppercase tracking-wider">Active User Base</p>
                        <p className="text-3xl font-bold text-theme-text-primary font-fredoka tracking-tight">{billingStats.activeSubscriptions}</p>
                      </div>
                      <div className="h-px w-full bg-theme-border-primary/50"></div>
                      <div>
                        <p className="text-sm font-medium text-theme-text-tertiary mb-1 font-raleway uppercase tracking-wider">Avg. Revenue Per User</p>
                        <p className="text-2xl font-bold text-theme-text-primary font-fredoka tracking-tight">
                          {billingStats.activeSubscriptions > 0 ? formatCurrency(billingStats.monthlyRevenue / billingStats.activeSubscriptions) : formatCurrency(0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Transactions Mini-Table */}
                <div className="xl:col-span-2">
                  <div className="bg-theme-bg-secondary border border-theme-border-primary/60 rounded-3xl p-8 shadow-sm h-full">
                    <div className="flex justify-between items-center mb-8">
                      <h2 className="text-xl font-fredoka text-theme-text-primary">Recent Transactions</h2>
                      <button onClick={() => setActiveTab('transactions')} className="text-sm text-theme-accent-primary hover:text-theme-accent-secondary font-bold transition-colors">View All →</button>
                    </div>
                    
                    {transactions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 text-theme-text-tertiary">
                        <FaRegFileAlt className="text-4xl mb-4 opacity-50" />
                        <p className="font-raleway">No recent transactions to display.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {transactions.slice(0, 5).map((transaction) => (
                          <div key={transaction._id} className="flex items-center justify-between p-5 bg-theme-bg border border-theme-border-primary/40 hover:border-theme-border-primary rounded-2xl transition-all duration-300 group shadow-sm hover:shadow-md">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 rounded-full bg-theme-bg-secondary border border-theme-border-primary flex items-center justify-center text-theme-text-primary font-fredoka text-lg shadow-inner">
                                {getInitials(transaction.userId?.email || 'U')}
                              </div>
                              <div>
                                <p className="font-semibold text-theme-text-primary font-raleway">{transaction.userId?.email || 'Unknown User'}</p>
                                <p className="text-sm text-theme-text-tertiary mt-0.5 font-medium">{formatDate(transaction.createdAt)}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-6">
                              <div className="text-right">
                                <p className="font-bold text-theme-text-primary text-lg">{formatCurrency(transaction.totalAmount)}</p>
                                <span className={`inline-block mt-1 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusStyle(transaction.status)}`}>
                                  {transaction.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TRANSACTIONS TAB */}
            {activeTab === 'transactions' && (
              <motion.div key="transactions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="bg-theme-bg-secondary border border-theme-border-primary/60 rounded-3xl shadow-sm overflow-hidden">
                {transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-theme-text-tertiary">
                    <FaRegFileAlt className="text-5xl mb-4 opacity-40" />
                    <p className="font-raleway text-lg">No transactions recorded yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left border-collapse">
                      <thead className="bg-theme-bg/50 border-b border-theme-border-primary/60">
                        <tr>
                          <th className="px-8 py-5 text-xs font-bold text-theme-text-tertiary uppercase tracking-wider">Date</th>
                          <th className="px-8 py-5 text-xs font-bold text-theme-text-tertiary uppercase tracking-wider">Customer</th>
                          <th className="px-8 py-5 text-xs font-bold text-theme-text-tertiary uppercase tracking-wider">Plan Details</th>
                          <th className="px-8 py-5 text-xs font-bold text-theme-text-tertiary uppercase tracking-wider">Amount</th>
                          <th className="px-8 py-5 text-xs font-bold text-theme-text-tertiary uppercase tracking-wider">Status</th>
                          <th className="px-8 py-5 text-xs font-bold text-theme-text-tertiary uppercase tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-theme-border-primary/40">
                        {transactions.map((t) => (
                          <tr key={t._id} className="hover:bg-theme-bg/40 transition-colors group">
                            <td className="px-8 py-5 whitespace-nowrap text-sm text-theme-text-secondary font-medium">{formatDate(t.createdAt)}</td>
                            <td className="px-8 py-5 whitespace-nowrap">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-theme-bg border border-theme-border-primary flex items-center justify-center text-xs font-bold text-theme-text-secondary">
                                  {getInitials(t.userId?.email)}
                                </div>
                                <span className="text-sm font-semibold text-theme-text-primary">{t.userId?.email || 'N/A'}</span>
                              </div>
                            </td>
                            <td className="px-8 py-5 whitespace-nowrap">
                              <span className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full border ${getPlanStyle(t.planId?.key)}`}>
                                {t.planId?.name || 'Custom'}
                              </span>
                            </td>
                            <td className="px-8 py-5 whitespace-nowrap text-sm font-bold text-theme-text-primary">{formatCurrency(t.totalAmount)}</td>
                            <td className="px-8 py-5 whitespace-nowrap">
                              <span className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full border ${getStatusStyle(t.status)}`}>
                                {t.status}
                              </span>
                            </td>
                            <td className="px-8 py-5 whitespace-nowrap text-sm font-medium text-right space-x-4">
                              <button onClick={() => handleAction('View Details')} className="text-theme-text-tertiary hover:text-theme-text-primary transition-colors inline-flex items-center"><FaEye className="mr-2" /> View</button>
                              {t.status === 'paid' && (
                                <button onClick={() => handleAction('Download Invoice')} className="text-theme-accent-primary hover:text-theme-accent-secondary transition-colors inline-flex items-center"><FaDownload className="mr-2" /> PDF</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}

            {/* SUBSCRIPTIONS TAB */}
            {activeTab === 'subscriptions' && (
              <motion.div key="subscriptions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="bg-theme-bg-secondary border border-theme-border-primary/60 rounded-3xl shadow-sm overflow-hidden">
                {subscriptions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-theme-text-tertiary">
                    <FaBoxOpen className="text-5xl mb-4 opacity-40" />
                    <p className="font-raleway text-lg">No active subscriptions found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left border-collapse">
                      <thead className="bg-theme-bg/50 border-b border-theme-border-primary/60">
                        <tr>
                          <th className="px-8 py-5 text-xs font-bold text-theme-text-tertiary uppercase tracking-wider">Customer</th>
                          <th className="px-8 py-5 text-xs font-bold text-theme-text-tertiary uppercase tracking-wider">Subscription Plan</th>
                          <th className="px-8 py-5 text-xs font-bold text-theme-text-tertiary uppercase tracking-wider">Type</th>
                          <th className="px-8 py-5 text-xs font-bold text-theme-text-tertiary uppercase tracking-wider">Status</th>
                          <th className="px-8 py-5 text-xs font-bold text-theme-text-tertiary uppercase tracking-wider">Billing Cycle</th>
                          <th className="px-8 py-5 text-xs font-bold text-theme-text-tertiary uppercase tracking-wider text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-theme-border-primary/40">
                        {subscriptions.map((s) => (
                          <tr key={s._id} className="hover:bg-theme-bg/40 transition-colors group">
                            <td className="px-8 py-5 whitespace-nowrap">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-theme-bg border border-theme-border-primary flex items-center justify-center text-xs font-bold text-theme-text-secondary">
                                  {getInitials(s.userId?.email)}
                                </div>
                                <span className="text-sm font-semibold text-theme-text-primary">{s.userId?.email || 'N/A'}</span>
                              </div>
                            </td>
                            <td className="px-8 py-5 whitespace-nowrap">
                              <span className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full border ${getPlanStyle(s.planKey)}`}>
                                {s.planName || s.planKey}
                              </span>
                            </td>
                            <td className="px-8 py-5 whitespace-nowrap text-sm text-theme-text-secondary font-medium capitalize">{s.planType}</td>
                            <td className="px-8 py-5 whitespace-nowrap">
                              <span className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full border ${getStatusStyle(s.status)}`}>
                                {s.status}
                              </span>
                            </td>
                            <td className="px-8 py-5 whitespace-nowrap text-sm text-theme-text-secondary font-medium">
                              <span className="text-theme-text-primary">{formatDate(s.startDate)}</span>
                              <span className="mx-2 text-theme-text-tertiary opacity-50">→</span> 
                              <span className="text-theme-text-primary">{formatDate(s.endDate)}</span>
                            </td>
                            <td className="px-8 py-5 whitespace-nowrap text-sm font-bold text-theme-text-primary text-right">{formatCurrency(s.pricing?.amount || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </SuperAdminLayout>
  );
};

export default AdminBilling;