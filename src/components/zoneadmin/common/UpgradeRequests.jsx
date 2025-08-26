import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import {
    FaUsers,
    FaTable,
    FaClock,
    FaCheckCircle,
    FaTimesCircle,
    FaExclamationTriangle,
    FaTrash,
    FaEye
} from 'react-icons/fa';
import ZoneAdminLayout from '../ZoneAdminLayout';

const UpgradeRequests = () => {
    const { zoneId } = useParams();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadRequests = () => {
            try {
                const allRequests = JSON.parse(localStorage.getItem('upgrade_requests') || '[]');
                const zoneRequests = allRequests.filter(request => request.zoneId === zoneId);
                setRequests(zoneRequests.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
            } catch (error) {
                console.error('Error loading upgrade requests:', error);
                setRequests([]);
            } finally {
                setLoading(false);
            }
        };

        if (zoneId) {
            loadRequests();
        }
    }, [zoneId]);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'approved':
                return <FaCheckCircle className="text-green-500" />;
            case 'rejected':
                return <FaTimesCircle className="text-red-500" />;
            case 'pending':
                return <FaClock className="text-yellow-500" />;
            default:
                return <FaExclamationTriangle className="text-gray-500" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved':
                return 'bg-green-100 text-green-800';
            case 'rejected':
                return 'bg-red-100 text-red-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getRequestTypeIcon = (type) => {
        if (type.includes('vendor')) {
            return <FaUsers className="text-blue-500" />;
        }
        if (type.includes('table')) {
            return <FaTable className="text-purple-500" />;
        }
        return <FaExclamationTriangle className="text-gray-500" />;
    };

    const deleteRequest = (requestId) => {
        if (window.confirm('Are you sure you want to delete this request?')) {
            try {
                const allRequests = JSON.parse(localStorage.getItem('upgrade_requests') || '[]');
                const updatedRequests = allRequests.filter(request => request.id !== requestId);
                localStorage.setItem('upgrade_requests', JSON.stringify(updatedRequests));
                setRequests(requests.filter(request => request.id !== requestId));
            } catch (error) {
                console.error('Error deleting request:', error);
                alert('Failed to delete request. Please try again.');
            }
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <ZoneAdminLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-theme-text-primary text-xl">Loading requests...</div>
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
                            Upgrade Requests
                        </h1>
                        <p className="text-theme-text-secondary font-raleway text-sm sm:text-base">
                            View and manage your plan upgrade requests
                        </p>
                    </div>
                </div>

                {/* Request Status Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/10 backdrop-blur-lg admin-card rounded-2xl p-4 border border-white/10"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                                <FaClock className="text-white text-sm" />
                            </div>
                            <span className="text-2xl font-sans text-theme-text-primary">
                                {requests.filter(r => r.status === 'pending').length}
                            </span>
                        </div>
                        <p className="text-theme-text-secondary font-raleway text-sm">Pending</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white/10 backdrop-blur-lg admin-card rounded-2xl p-4 border border-white/10"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                                <FaCheckCircle className="text-white text-sm" />
                            </div>
                            <span className="text-2xl font-sans text-theme-text-primary">
                                {requests.filter(r => r.status === 'approved').length}
                            </span>
                        </div>
                        <p className="text-theme-text-secondary font-raleway text-sm">Approved</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white/10 backdrop-blur-lg admin-card rounded-2xl p-4 border border-white/10"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                                <FaTimesCircle className="text-white text-sm" />
                            </div>
                            <span className="text-2xl font-sans text-theme-text-primary">
                                {requests.filter(r => r.status === 'rejected').length}
                            </span>
                        </div>
                        <p className="text-theme-text-secondary font-raleway text-sm">Rejected</p>
                    </motion.div>
                </div>

                {/* Requests List */}
                <div className="space-y-4">
                    {requests.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FaExclamationTriangle className="text-gray-400 text-2xl" />
                            </div>
                            <h3 className="text-lg font-fredoka text-theme-text-primary mb-2">
                                No Upgrade Requests
                            </h3>
                            <p className="text-theme-text-secondary font-raleway">
                                You haven't submitted any upgrade requests yet.
                            </p>
                        </div>
                    ) : (
                        requests.map((request) => (
                            <motion.div
                                key={request.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="admin-card rounded-2xl p-6"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-12 h-12 bg-theme-accent-primary bg-opacity-20 rounded-xl flex items-center justify-center">
                                            {getRequestTypeIcon(request.requestType)}
                                        </div>
                                        <div>
                                            <h3 className="text-theme-text-primary font-fredoka text-lg">
                                                {request.requestType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            </h3>
                                            <p className="text-theme-text-secondary font-raleway text-sm">
                                                {formatDate(request.timestamp)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1 ${getStatusColor(request.status)}`}>
                                            {getStatusIcon(request.status)}
                                            <span className="capitalize">{request.status}</span>
                                        </span>
                                        <button
                                            onClick={() => deleteRequest(request.id)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete Request"
                                        >
                                            <FaTrash className="text-sm" />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <p className="text-gray-600 font-raleway text-sm">Current Limit</p>
                                        <p className="font-semibold text-lg">{request.currentLimit || 'N/A'}</p>
                                    </div>
                                    <div className="bg-blue-50 rounded-lg p-3">
                                        <p className="text-blue-600 font-raleway text-sm">Requested Limit</p>
                                        <p className="font-semibold text-lg text-blue-700">{request.requestedLimit}</p>
                                    </div>
                                    <div className="bg-yellow-50 rounded-lg p-3">
                                        <p className="text-yellow-600 font-raleway text-sm">Current Usage</p>
                                        <p className="font-semibold text-lg text-yellow-700">{request.currentUsage}</p>
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-gray-600 font-raleway text-sm mb-2">Request Details:</p>
                                    <p className="text-gray-800 font-raleway">{request.message}</p>
                                </div>

                                {request.status === 'pending' && (
                                    <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                                        <p className="text-yellow-800 font-raleway text-sm">
                                            <FaClock className="inline mr-2" />
                                            Your request is being reviewed. We'll contact you within 24 hours.
                                        </p>
                                    </div>
                                )}

                                {request.status === 'approved' && (
                                    <div className="mt-4 p-3 bg-green-50 rounded-lg">
                                        <p className="text-green-800 font-raleway text-sm">
                                            <FaCheckCircle className="inline mr-2" />
                                            Request approved! Your new limits will be active within 24 hours.
                                        </p>
                                    </div>
                                )}

                                {request.status === 'rejected' && (
                                    <div className="mt-4 p-3 bg-red-50 rounded-lg">
                                        <p className="text-red-800 font-raleway text-sm">
                                            <FaTimesCircle className="inline mr-2" />
                                            Request was not approved. Please contact support for more information.
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </ZoneAdminLayout>
    );
};

export default UpgradeRequests;