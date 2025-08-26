import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaRupeeSign,
  FaCreditCard,
  FaMoneyBillWave,
  FaMobileAlt,
  FaDownload,
  FaCalendarAlt,
  FaFilter,
  FaSearch,
  FaChartPie
} from 'react-icons/fa';
import ZoneShopLayout from '../ZoneShopLayout';

const ZoneShopTransactionReports = () => {
  const { zoneId, shopId } = useParams();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [dateRange, setDateRange] = useState('today');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Mock transaction data
  const mockTransactions = [
    {
      id: 'TXN-001',
      orderId: 'ORD-001',
      amount: 687,
      paymentMethod: 'card',
      status: 'completed',
      timestamp: '2024-01-15T12:55:00Z',
      customerName: 'John Doe',
      transactionId: 'TXN123456789'
    },
    {
      id: 'TXN-002',
      orderId: 'ORD-004',
      amount: 648,
      paymentMethod: 'upi',
      status: 'completed',
      timestamp: '2024-01-15T14:45:00Z',
      customerName: 'Emily Davis',
      transactionId: 'UPI987654321'
    },
    {
      id: 'TXN-003',
      orderId: 'ORD-005',
      amount: 299,
      paymentMethod: 'cash',
      status: 'completed',
      timestamp: '2024-01-15T15:20:00Z',
      customerName: 'Alex Kumar',
      transactionId: 'CASH001'
    },
    {
      id: 'TXN-004',
      orderId: 'ORD-006',
      amount: 450,
      paymentMethod: 'card',
      status: 'failed',
      timestamp: '2024-01-15T16:10:00Z',
      customerName: 'Priya Sharma',
      transactionId: 'TXN456789123',
      failureReason: 'Insufficient funds'
    }
  ];

  useEffect(() => {
    setTimeout(() => {
      setTransactions(mockTransactions);
      setFilteredTransactions(mockTransactions);
      setLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    let filtered = transactions.filter(txn => {
      const matchesSearch = txn.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           txn.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           txn.transactionId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPayment = paymentFilter === 'all' || txn.paymentMethod === paymentFilter;
      return matchesSearch && matchesPayment;
    });

    setFilteredTransactions(filtered);
  }, [transactions, searchTerm, paymentFilter]);

  const getPaymentIcon = (method) => {
    switch (method) {
      case 'card':
        return <FaCreditCard className="text-blue-500" />;
      case 'upi':
        return <FaMobileAlt className="text-purple-500" />;
      case 'cash':
        return <FaMoneyBillWave className="text-green-500" />;
      default:
        return <FaRupeeSign className="text-theme-text-tertiary" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-theme-text-tertiary bg-theme-bg-secondary';
    }
  };

  const calculateStats = () => {
    const completed = filteredTransactions.filter(txn => txn.status === 'completed');
    const totalRevenue = completed.reduce((sum, txn) => sum + txn.amount, 0);
    
    const paymentBreakdown = {
      card: completed.filter(txn => txn.paymentMethod === 'card').reduce((sum, txn) => sum + txn.amount, 0),
      upi: completed.filter(txn => txn.paymentMethod === 'upi').reduce((sum, txn) => sum + txn.amount, 0),
      cash: completed.filter(txn => txn.paymentMethod === 'cash').reduce((sum, txn) => sum + txn.amount, 0)
    };

    return {
      totalTransactions: filteredTransactions.length,
      completedTransactions: completed.length,
      totalRevenue,
      failedTransactions: filteredTransactions.filter(txn => txn.status === 'failed').length,
      paymentBreakdown
    };
  };

  const stats = calculateStats();

  const exportToCSV = () => {
    const csvContent = [
      ['Transaction ID', 'Order ID', 'Customer', 'Amount', 'Payment Method', 'Status', 'Timestamp'],
      ...filteredTransactions.map(txn => [
        txn.transactionId,
        txn.orderId,
        txn.customerName,
        txn.amount,
        txn.paymentMethod,
        txn.status,
        new Date(txn.timestamp).toLocaleString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transaction-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <ZoneShopLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-theme-accent-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-theme-text-secondary">Loading transaction reports...</p>
          </div>
        </div>
      </ZoneShopLayout>
    );
  }

  return (
    <ZoneShopLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-fredoka text-theme-text-primary mb-2">
              Transaction Reports
            </h1>
            <p className="text-theme-text-secondary font-raleway">
              Detailed payment and transaction analysis
            </p>
          </div>
          <button
            onClick={exportToCSV}
            className="flex items-center space-x-2 bg-theme-accent-primary text-white px-4 py-2 rounded-lg hover:bg-theme-accent-hover transition-colors mt-4 sm:mt-0"
          >
            <FaDownload />
            <span className="font-raleway">Export CSV</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="admin-card p-4 rounded-xl"
          >
            <div className="flex items-center space-x-3">
              <FaRupeeSign className="text-theme-accent-primary text-xl" />
              <div>
                <p className="text-2xl font-fredoka text-theme-text-primary">₹{stats.totalRevenue.toLocaleString()}</p>
                <p className="text-theme-text-secondary font-raleway text-sm">Total Revenue</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="admin-card p-4 rounded-xl"
          >
            <div className="flex items-center space-x-3">
              <FaChartPie className="text-green-500 text-xl" />
              <div>
                <p className="text-2xl font-fredoka text-theme-text-primary">{stats.completedTransactions}</p>
                <p className="text-theme-text-secondary font-raleway text-sm">Successful</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="admin-card p-4 rounded-xl"
          >
            <div className="flex items-center space-x-3">
              <FaRupeeSign className="text-red-500 text-xl" />
              <div>
                <p className="text-2xl font-fredoka text-theme-text-primary">{stats.failedTransactions}</p>
                <p className="text-theme-text-secondary font-raleway text-sm">Failed</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="admin-card p-4 rounded-xl"
          >
            <div className="flex items-center space-x-3">
              <FaChartPie className="text-blue-500 text-xl" />
              <div>
                <p className="text-2xl font-fredoka text-theme-text-primary">{stats.totalTransactions}</p>
                <p className="text-theme-text-secondary font-raleway text-sm">Total Transactions</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Payment Method Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="admin-card p-6 rounded-xl"
          >
            <h3 className="text-lg font-fredoka text-theme-text-primary mb-4">Payment Method Breakdown</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-theme-bg-secondary rounded-lg">
                <div className="flex items-center space-x-3">
                  <FaCreditCard className="text-blue-500 text-xl" />
                  <span className="font-raleway text-theme-text-primary">Card Payments</span>
                </div>
                <span className="font-fredoka text-theme-text-primary">₹{stats.paymentBreakdown.card.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-theme-bg-secondary rounded-lg">
                <div className="flex items-center space-x-3">
                  <FaMobileAlt className="text-purple-500 text-xl" />
                  <span className="font-raleway text-theme-text-primary">UPI Payments</span>
                </div>
                <span className="font-fredoka text-theme-text-primary">₹{stats.paymentBreakdown.upi.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-theme-bg-secondary rounded-lg">
                <div className="flex items-center space-x-3">
                  <FaMoneyBillWave className="text-green-500 text-xl" />
                  <span className="font-raleway text-theme-text-primary">Cash Payments</span>
                </div>
                <span className="font-fredoka text-theme-text-primary">₹{stats.paymentBreakdown.cash.toLocaleString()}</span>
              </div>
            </div>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2 admin-card p-6 rounded-xl"
          >
            <h3 className="text-lg font-fredoka text-theme-text-primary mb-4">Filters</h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary" />
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-theme-border-primary rounded-lg bg-theme-bg-secondary text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-theme-accent-primary"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <FaCalendarAlt className="text-theme-text-tertiary" />
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="px-4 py-2 border border-theme-border-primary rounded-lg bg-theme-bg-secondary text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-theme-accent-primary"
                  >
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <FaFilter className="text-theme-text-tertiary" />
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    className="px-4 py-2 border border-theme-border-primary rounded-lg bg-theme-bg-secondary text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-theme-accent-primary"
                  >
                    <option value="all">All Methods</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Transactions Table */}
        <div className="admin-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-theme-bg-secondary">
                <tr>
                  <th className="text-left p-4 font-raleway font-medium text-theme-text-primary">Transaction</th>
                  <th className="text-left p-4 font-raleway font-medium text-theme-text-primary">Order</th>
                  <th className="text-left p-4 font-raleway font-medium text-theme-text-primary">Customer</th>
                  <th className="text-left p-4 font-raleway font-medium text-theme-text-primary">Amount</th>
                  <th className="text-left p-4 font-raleway font-medium text-theme-text-primary">Payment</th>
                  <th className="text-left p-4 font-raleway font-medium text-theme-text-primary">Status</th>
                  <th className="text-left p-4 font-raleway font-medium text-theme-text-primary">Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((txn, index) => (
                  <motion.tr
                    key={txn.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border-b border-theme-border-primary hover:bg-theme-bg-hover"
                  >
                    <td className="p-4">
                      <div>
                        <p className="font-raleway font-medium text-theme-text-primary">{txn.id}</p>
                        <p className="text-sm text-theme-text-tertiary">{txn.transactionId}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-raleway text-theme-text-primary">{txn.orderId}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-raleway text-theme-text-primary">{txn.customerName}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-raleway font-medium text-theme-text-primary">₹{txn.amount}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        {getPaymentIcon(txn.paymentMethod)}
                        <span className="font-raleway text-theme-text-primary capitalize">{txn.paymentMethod}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-raleway capitalize ${getStatusColor(txn.status)}`}>
                        {txn.status}
                      </span>
                      {txn.failureReason && (
                        <p className="text-xs text-red-500 mt-1">{txn.failureReason}</p>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-theme-text-primary">
                        {new Date(txn.timestamp).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <FaRupeeSign className="text-6xl text-theme-text-tertiary mx-auto mb-4" />
            <h3 className="text-xl font-fredoka text-theme-text-primary mb-2">No transactions found</h3>
            <p className="text-theme-text-secondary font-raleway">
              {searchTerm || paymentFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'No transactions available for the selected time period'
              }
            </p>
          </div>
        )}
      </div>
    </ZoneShopLayout>
  );
};

export default ZoneShopTransactionReports;
