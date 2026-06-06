import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import PaymentService from '../../../shared/payments/PaymentService';
import PlanService from '../services/PlanService';
import PlanUpgrade from './PlanUpgrade';
import logger from '../../../services/LoggingService';

const PlanStatus = ({ planType = 'restaurant', showUpgradeButton = true }) => {
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [planUsage, setPlanUsage] = useState(null);

  useEffect(() => {
    loadCurrentPlan();
    loadPlanUsage();
  }, []);

  const loadCurrentPlan = async () => {
    try {
      setLoading(true);
      const response = await PaymentService.getCurrentPlan();
      
      if (response.success) {
        setCurrentPlan(response.data);
      }
    } catch (error) {
      logger.error('Failed to load current plan', error, 'PlanStatus');
      // Don't show error toast for plan status as it might be called frequently
    } finally {
      setLoading(false);
    }
  };

  const loadPlanUsage = async () => {
    try {
      const response = await PlanService.getPlanUsage();
      if (response.success) {
        setPlanUsage(response.data);
      }
    } catch (error) {
      logger.error('Failed to load plan usage', error, 'PlanStatus');
    }
  };

  const handleUpgradeSuccess = (upgradeData) => {
    // Refresh current plan data
    loadCurrentPlan();
    loadPlanUsage();
    
    toast.success(`Successfully upgraded to ${upgradeData.plan.name}!`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysRemaining = (expiryDate) => {
    return PlanService.getDaysRemaining(expiryDate);
  };

  const isPlanExpired = (expiryDate) => {
    return PlanService.isPlanExpired(expiryDate);
  };

  const getStatusColor = (status, expiryDate) => {
    if (status === 'expired' || isPlanExpired(expiryDate)) {
      return 'text-red-600 bg-red-100';
    }
    if (status === 'active') {
      const daysRemaining = getDaysRemaining(expiryDate);
      if (daysRemaining <= 7) {
        return 'text-yellow-600 bg-yellow-100';
      }
      return 'text-green-600 bg-green-100';
    }
    return 'text-gray-600 bg-gray-100';
  };

  const getStatusText = (status, expiryDate) => {
    if (status === 'expired' || isPlanExpired(expiryDate)) {
      return 'Expired';
    }
    if (status === 'active') {
      const daysRemaining = getDaysRemaining(expiryDate);
      if (daysRemaining === 0) {
        return 'Expires Today';
      }
      if (daysRemaining <= 7) {
        return `${daysRemaining} days left`;
      }
      return 'Active';
    }
    if (status === 'free') {
      return 'Free Plan';
    }
    return status || 'Unknown';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  const plan = currentPlan?.plan;
  const status = currentPlan?.status || 'free';
  const expiryDate = currentPlan?.expiryDate;
  const daysRemaining = getDaysRemaining(expiryDate);
  const expired = isPlanExpired(expiryDate);

  return (
    <>
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Current Plan
            </h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status, expiryDate)}`}>
              {getStatusText(status, expiryDate)}
            </span>
          </div>

          <div className="space-y-4">
            {/* Plan Name */}
            <div>
              <h4 className="text-xl font-bold text-gray-900">
                {plan?.name || 'Free Plan'}
              </h4>
              {plan?.description && (
                <p className="text-gray-600 text-sm mt-1">{plan.description}</p>
              )}
            </div>

            {/* Plan Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Expiry Information */}
              {expiryDate && (
                <div>
                  <p className="text-sm text-gray-600">Expires On</p>
                  <p className="font-semibold text-gray-900">{formatDate(expiryDate)}</p>
                  {!expired && daysRemaining <= 7 && (
                    <p className="text-sm text-yellow-600 mt-1">
                      ⚠️ Plan expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
                    </p>
                  )}
                  {expired && (
                    <p className="text-sm text-red-600 mt-1">
                      ❌ Plan has expired
                    </p>
                  )}
                </div>
              )}

              {/* Plan Type */}
              <div>
                <p className="text-sm text-gray-600">Plan Type</p>
                <p className="font-semibold text-gray-900 capitalize">
                  {plan?.planType || planType}
                </p>
              </div>
            </div>

            {/* Plan Limits */}
            {plan?.limits && (
              <div>
                <h5 className="font-semibold text-gray-900 mb-2">Plan Limits</h5>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(plan.limits).map(([key, value]) => {
                    if (value === null || value === undefined) return null;
                    
                    const labels = {
                      maxMenus: 'Menus',
                      maxCategories: 'Categories',
                      maxMenuItems: 'Menu Items',
                      maxTables: 'Tables',
                      maxShops: 'Shops',
                      maxVendors: 'Vendors'
                    };

                    return (
                      <div key={key} className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">{labels[key] || key}</p>
                        <p className="font-bold text-lg text-gray-900">
                          {value === -1 ? '∞' : value}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Plan Features */}
            {plan?.features && (
              <div>
                <h5 className="font-semibold text-gray-900 mb-2">Features</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Object.entries(plan.features)
                    .filter(([key, value]) => value === true)
                    .map(([key, value]) => {
                      const featureLabels = {
                        crudMenu: 'Menu Management',
                        qrGeneration: 'QR Code Generation',
                        qrCustomization: 'QR Code Customization',
                        analytics: 'Analytics & Reports',
                        modifiers: 'Menu Item Modifiers',
                        watermark: 'No Tableserves Watermark',
                        vendorManagement: 'Vendor Management',
                        prioritySupport: 'Priority Support',
                        premiumBranding: 'Premium Branding'
                      };

                      return (
                        <div key={key} className="flex items-center text-sm">
                          <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className="text-gray-700">
                            {featureLabels[key] || key}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {showUpgradeButton && (
              <div className="pt-4 border-t border-gray-200">
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    {status === 'free' ? 'Upgrade Plan' : 'Change Plan'}
                  </button>
                  
                  {expired && (
                    <button
                      onClick={() => setShowUpgradeModal(true)}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-semibold"
                    >
                      Renew Plan
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Expiry Warning */}
            {!expired && daysRemaining <= 3 && daysRemaining > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm text-yellow-800">
                      <strong>Plan Expiring Soon!</strong> Your plan will expire in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}. 
                      Upgrade or renew to continue enjoying premium features.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Expired Notice */}
            {expired && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-red-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm text-red-800">
                      <strong>Plan Expired!</strong> Your plan expired on {formatDate(expiryDate)}. 
                      Some features may be limited. Please renew your plan to restore full access.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Plan Upgrade Modal */}
      {showUpgradeModal && (
        <PlanUpgrade
          planType={planType}
          currentPlan={plan}
          onUpgradeSuccess={handleUpgradeSuccess}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </>
  );
};

export default PlanStatus;