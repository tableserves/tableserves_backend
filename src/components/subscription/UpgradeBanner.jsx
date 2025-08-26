import React from 'react';
import { motion } from 'framer-motion';
import { 
  FaExclamationTriangle, 
  FaArrowUp, 
  FaTimes, 
  FaRocket,
  FaChartLine,
  FaCrown
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

export default function UpgradeBanner({ 
  type, // 'tables', 'categories', 'menuItems', 'shops', 'vendors'
  currentCount, 
  limit, 
  businessType, // 'restaurant' or 'zone'
  onClose,
  show = true 
}) {
  const navigate = useNavigate();

  if (!show) return null;

  const getTypeText = () => {
    switch (type) {
      case 'tables': return 'tables';
      case 'categories': return 'categories';
      case 'menuItems': return 'menu items';
      case 'shops': return 'shops';
      case 'vendors': return 'vendors';
      default: return 'items';
    }
  };

  const getUpgradeFeatures = () => {
    if (businessType === 'restaurant') {
      return [
        'Up to 8 tables',
        '15 categories',
        '20 menu items per category',
        'Advanced analytics',
        'Premium QR customization'
      ];
    } else {
      return [
        'Up to 5 shops',
        '5 tables per shop',
        'Vendor management',
        'Advanced analytics',
        'Premium branding'
      ];
    }
  };

  const getUpgradePrice = () => {
    return businessType === 'restaurant' ? '₹1,299/month' : '₹1,999/month';
  };

  const handleUpgrade = () => {
    navigate('/tableserve/pricing');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className="fixed top-4 left-4 right-4 z-50 md:left-8 md:right-8"
    >
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl shadow-2xl border border-orange-300 overflow-hidden">
          <div className="p-6">
            <div className="flex items-start justify-between">
              {/* Left side - Warning info */}
              <div className="flex items-start space-x-4 flex-1">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <FaExclamationTriangle className="text-white text-xl" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">
                    Plan Limit Reached!
                  </h3>
                  <p className="text-orange-100 mb-4">
                    You've reached your limit of <span className="font-semibold">{limit} {getTypeText()}</span>. 
                    Currently using <span className="font-semibold">{currentCount}/{limit}</span>.
                    Upgrade to continue adding more {getTypeText()}.
                  </p>
                  
                  {/* Mobile-friendly upgrade features */}
                  <div className="hidden md:block">
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {getUpgradeFeatures().slice(0, 4).map((feature, index) => (
                        <div key={index} className="flex items-center text-sm text-orange-100">
                          <FaRocket className="text-white mr-2 text-xs" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right side - Upgrade action */}
              <div className="flex items-center space-x-3 flex-shrink-0 ml-4">
                <div className="text-right hidden md:block">
                  <div className="text-white font-bold text-lg">
                    {getUpgradePrice()}
                  </div>
                  <div className="text-orange-200 text-sm">
                    Advanced Plan
                  </div>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleUpgrade}
                  className="bg-white text-orange-600 font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center whitespace-nowrap"
                >
                  <FaArrowUp className="mr-2" />
                  Upgrade Now
                </motion.button>
                
                {onClose && (
                  <button
                    onClick={onClose}
                    className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                  >
                    <FaTimes className="text-white text-sm" />
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Bottom section for mobile */}
          <div className="md:hidden bg-white/10 p-4">
            <div className="grid grid-cols-2 gap-2 text-xs text-orange-100">
              {getUpgradeFeatures().slice(0, 4).map((feature, index) => (
                <div key={index} className="flex items-center">
                  <FaRocket className="text-white mr-1 text-xs" />
                  {feature}
                </div>
              ))}
            </div>
            <div className="text-center mt-3 text-orange-100">
              <span className="font-semibold text-white">{getUpgradePrice()}</span> - Advanced Plan
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Hook for easy usage throughout the app
export function useUpgradeBanner() {
  const [bannerData, setBannerData] = React.useState(null);

  const showUpgradeBanner = ({ type, currentCount, limit, businessType }) => {
    setBannerData({ type, currentCount, limit, businessType, show: true });
  };

  const hideUpgradeBanner = () => {
    setBannerData(prev => prev ? { ...prev, show: false } : null);
  };

  const UpgradeBannerComponent = bannerData ? (
    <UpgradeBanner
      type={bannerData.type}
      currentCount={bannerData.currentCount}
      limit={bannerData.limit}
      businessType={bannerData.businessType}
      show={bannerData.show}
      onClose={hideUpgradeBanner}
    />
  ) : null;

  return {
    showUpgradeBanner,
    hideUpgradeBanner,
    UpgradeBannerComponent
  };
}

// Utility function to check limits and trigger banner
export function checkPlanLimits(subscription, currentCounts) {
  if (!subscription) return null;

  const { planType, maxTables, maxCategories, maxMenuItems, maxShops, maxVendors } = subscription;
  
  // Check each limit
  if (maxTables && currentCounts.tables >= maxTables) {
    return {
      type: 'tables',
      currentCount: currentCounts.tables,
      limit: maxTables,
      businessType: planType
    };
  }
  
  if (maxCategories && currentCounts.categories >= maxCategories) {
    return {
      type: 'categories',
      currentCount: currentCounts.categories,
      limit: maxCategories,
      businessType: planType
    };
  }
  
  if (maxMenuItems && currentCounts.menuItems >= maxMenuItems) {
    return {
      type: 'menuItems',
      currentCount: currentCounts.menuItems,
      limit: maxMenuItems,
      businessType: planType
    };
  }
  
  if (maxShops && currentCounts.shops >= maxShops) {
    return {
      type: 'shops',
      currentCount: currentCounts.shops,
      limit: maxShops,
      businessType: planType
    };
  }
  
  if (maxVendors && currentCounts.vendors >= maxVendors) {
    return {
      type: 'vendors',
      currentCount: currentCounts.vendors,
      limit: maxVendors,
      businessType: planType
    };
  }
  
  return null;
}