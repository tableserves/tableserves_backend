import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FaCheck,
  FaTimes,
  FaExclamationTriangle,
  FaCrown,
  FaCalendarAlt,
  FaChartBar,
  FaUpgrade
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import ApiService from '../../../services/ApiService';

const PlanUsageCard = ({ onUpgradeClick }) => {
  const [planData, setPlanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPlanUsage();
  }, []);

  const fetchPlanUsage = async () => {
    try {
      setLoading(true);
      const response = await ApiService.get('/plans/usage');
      
      if (response.success) {
        setPlanData(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch plan usage');
      }
    } catch (error) {
      console.error('Error fetching plan usage:', error);
      setError(error.message);
      toast.error('Failed to load plan information');
    } finally {
      setLoading(false);
    }
  };

  const getUsagePercentage = (used, limit) => {
    if (limit === null) return 0; // Unlimited
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'text-red-600 bg-red-100';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const formatDaysRemaining = (days) => {
    if (days === null) return 'Never expires';
    if (days <= 0) return 'Expired';
    if (days === 1) return '1 day remaining';
    return `${days} days remaining`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border border-red-200">
        <div className="flex items-center space-x-3 text-red-700">
          <FaExclamationTriangle className="text-xl" />
          <div>
            <h3 className="font-bold">Error Loading Plan</h3>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchPlanUsage}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!planData) return null;

  const { plan, usage, limits, status, expiryDate, daysRemaining } = planData;
  const isFreePlan = plan.key === 'free';
  const isExpired = status === 'expired' || daysRemaining <= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
    >
      {/* Plan Header */}
      <div className={`p-6 ${isFreePlan ? 'bg-gray-50' : 'bg-gradient-to-r from-orange-500 to-orange-600'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isFreePlan ? 'bg-gray-200' : 'bg-white/20'
            }`}>
              <FaCrown className={`text-xl ${isFreePlan ? 'text-gray-600' : 'text-white'}`} />
            </div>
            <div>
              <h3 className={`font-bold text-xl ${isFreePlan ? 'text-gray-800' : 'text-white'}`}>
                {plan.name}
              </h3>
              <p className={`text-sm ${isFreePlan ? 'text-gray-600' : 'text-white/80'}`}>
                {plan.planType === 'restaurant' ? 'Restaurant Plan' : 'Zone Plan'}
              </p>
            </div>
          </div>
          
          {!isFreePlan && (
            <div className="text-right">
              <div className="text-white text-2xl font-bold">
                ₹{plan.price.toLocaleString('en-IN')}
              </div>
              <div className="text-white/80 text-sm">per month</div>
            </div>
          )}
        </div>

        {/* Plan Status */}
        <div className="mt-4 flex items-center space-x-2">
          <FaCalendarAlt className={`${isFreePlan ? 'text-gray-600' : 'text-white'}`} />
          <span className={`text-sm font-medium ${isFreePlan ? 'text-gray-700' : 'text-white'}`}>
            {isExpired ? (
              <span className="text-red-200">Plan Expired</span>
            ) : (
              formatDaysRemaining(daysRemaining)
            )}
          </span>
        </div>
      </div>

      {/* Usage Statistics */}
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <FaChartBar className="text-gray-600" />
          <h4 className="font-bold text-gray-800">Usage Statistics</h4>
        </div>

        <div className="space-y-4">
          {/* Menus Usage */}
          {limits.maxMenus !== undefined && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Menus</span>
                <span className="text-sm text-gray-600">
                  {usage.categories || 0} / {limits.maxMenus === null ? '∞' : limits.maxMenus}
                </span>
              </div>
              {limits.maxMenus !== null && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      getUsageColor(getUsagePercentage(usage.categories || 0, limits.maxMenus)).includes('red') 
                        ? 'bg-red-500' 
                        : getUsageColor(getUsagePercentage(usage.categories || 0, limits.maxMenus)).includes('yellow')
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${getUsagePercentage(usage.categories || 0, limits.maxMenus)}%` }}
                  ></div>
                </div>
              )}
            </div>
          )}

          {/* Categories Usage */}
          {limits.maxCategories !== undefined && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Categories</span>
                <span className="text-sm text-gray-600">
                  {usage.categories || 0} / {limits.maxCategories === null ? '∞' : limits.maxCategories}
                </span>
              </div>
              {limits.maxCategories !== null && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      getUsagePercentage(usage.categories || 0, limits.maxCategories) >= 90 
                        ? 'bg-red-500' 
                        : getUsagePercentage(usage.categories || 0, limits.maxCategories) >= 70
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${getUsagePercentage(usage.categories || 0, limits.maxCategories)}%` }}
                  ></div>
                </div>
              )}
            </div>
          )}

          {/* Menu Items Usage */}
          {limits.maxMenuItems !== undefined && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Menu Items</span>
                <span className="text-sm text-gray-600">
                  {usage.menuItems || 0} / {limits.maxMenuItems === null ? '∞' : limits.maxMenuItems}
                </span>
              </div>
              {limits.maxMenuItems !== null && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      getUsagePercentage(usage.menuItems || 0, limits.maxMenuItems) >= 90 
                        ? 'bg-red-500' 
                        : getUsagePercentage(usage.menuItems || 0, limits.maxMenuItems) >= 70
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${getUsagePercentage(usage.menuItems || 0, limits.maxMenuItems)}%` }}
                  ></div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Upgrade Button */}
        {(isFreePlan || isExpired) && onUpgradeClick && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={onUpgradeClick}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-3 rounded-lg font-bold flex items-center justify-center space-x-2 transition-all duration-200 transform hover:scale-105"
            >
              <FaUpgrade />
              <span>{isExpired ? 'Renew Plan' : 'Upgrade Plan'}</span>
            </button>
          </div>
        )}

        {/* Warning for near limits */}
        {!isFreePlan && !isExpired && (
          <>
            {Object.entries(limits).some(([key, limit]) => {
              if (limit === null) return false;
              const used = usage[key.replace('max', '').toLowerCase()] || 0;
              return getUsagePercentage(used, limit) >= 90;
            }) && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2 text-yellow-700">
                  <FaExclamationTriangle className="text-sm" />
                  <span className="text-sm font-medium">
                    You're approaching your plan limits. Consider upgrading to avoid service interruption.
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

export default PlanUsageCard;
