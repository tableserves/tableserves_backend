import { motion } from 'framer-motion';
import {
  FaCreditCard,
  FaDollarSign,
  FaCheck,
  FaTimes,
  FaExclamationTriangle,
  FaDownload,
  FaEye,
  FaEdit
} from 'react-icons/fa';
import SuperAdminLayout from './SuperAdminLayout';
import { useState, useEffect } from 'react';

const AdminBilling = () => {
  const [activeTab, setActiveTab] = useState('overview');

  // Mock billing data
  const billingStats = [
    {
      title: 'Monthly Revenue',
      value: '₹15,420',
      change: '+8.5%',
      icon: FaDollarSign,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20'
    },
    {
      title: 'Active Subscriptions',
      value: '23',
      change: '+2',
      icon: FaCheck,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20'
    },
    {
      title: 'Failed Payments',
      value: '3',
      change: '-1',
      icon: FaExclamationTriangle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20'
    },
    {
      title: 'Pending Renewals',
      value: '7',
      change: '+3',
      icon: FaCreditCard,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20'
    }
  ];

  // Mock data for subscriptions and transactions (if needed for other tabs)
  const subscriptions = []; // Add mock data if you implement the subscriptions tab
  const transactions = []; // Add mock data if you implement the transactions tab
  const plans = []; // Add mock data if you implement the plans tab

  const getPlanColor = (plan) => {
    switch (plan) {
      case 'Basic': return 'bg-blue-600/20 text-blue-400';
      case 'Premium': return 'bg-green-600/20 text-green-400';
      case 'Enterprise': return 'bg-purple-600/20 text-purple-400';
      default: return 'bg-gray-600/20 text-gray-400';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-green-600/20 text-green-400';
      case 'Inactive': return 'bg-red-600/20 text-red-400';
      case 'Pending': return 'bg-yellow-600/20 text-yellow-400';
      default: return 'bg-gray-600/20 text-gray-400';
    }
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl sm:text-3xl font-fredoka text-theme-text-primary mb-2">Billing Management</h1>
          <p className="text-theme-text-secondary font-raleway text-sm sm:text-base">Platform billing and subscription management</p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {billingStats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="admin-card rounded-2xl p-6 flex items-center space-x-4"
            >
              <div className={`p-3 rounded-full ${stat.color} bg-opacity-20`}>
                <stat.icon className="text-2xl" />
              </div>
              <div>
                <p className="text-sm font-medium text-theme-text-secondary font-raleway">{stat.title}</p>
                <p className="text-2xl font-semibold text-theme-text-primary font-fredoka">{stat.value}</p>
                <p className={`text-xs font-raleway ${stat.change.startsWith('+') ? 'status-success' : 'status-error'}`}>
                  {stat.change} since last month
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('overview')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'transactions' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Transactions
              </button>
              <button
                onClick={() => setActiveTab('invoices')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'invoices' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Invoices
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="admin-card rounded-lg p-6"
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Billing Overview</h2>
            <p className="text-gray-600 mb-4">Detailed summary of your billing activities.</p>
            {/* Add more overview content here */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Current Plan</h3>
                <p className="text-gray-600">Premium Business Plan</p>
                <p className="text-gray-600 text-sm">Next billing date: October 26, 2023</p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Payment Method</h3>
                <p className="text-gray-600">Visa **** **** **** 1234</p>
                <button className="text-indigo-600 hover:text-indigo-800 text-sm mt-1">Update Payment</button>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'transactions' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="admin-card rounded-lg p-6"
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Transactions</h2>
            <p className="text-gray-600 mb-4">A list of your most recent billing transactions.</p>
            {/* Transaction Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="bg-theme-bg-card divide-y divide-theme-border-primary">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">2023-09-25</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Monthly Subscription</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹99.00</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Completed</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-indigo-600 hover:text-indigo-900"><FaEye className="inline-block mr-1" />View</button>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">2023-08-25</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Monthly Subscription</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹99.00</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Completed</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-indigo-600 hover:text-indigo-900"><FaEye className="inline-block mr-1" />View</button>
                    </td>
                  </tr>
                  {/* More transactions */}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'invoices' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="admin-card rounded-lg p-6"
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Invoices</h2>
            <p className="text-gray-600 mb-4">Access and download your past invoices.</p>
            {/* Invoice List */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice ID</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="bg-theme-bg-card divide-y divide-theme-border-primary">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">INV-2023-001</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">2023-09-25</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">$99.00</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-indigo-600 hover:text-indigo-900"><FaDownload className="inline-block mr-1" />Download</button>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">INV-2023-002</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">2023-08-25</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">$99.00</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-indigo-600 hover:text-indigo-900"><FaDownload className="inline-block mr-1" />Download</button>
                    </td>
                  </tr>
                  {/* More invoices */}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </SuperAdminLayout>
  );
};

export default AdminBilling;
