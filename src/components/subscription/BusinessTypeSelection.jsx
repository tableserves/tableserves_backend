import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FaUtensils, 
  FaBuilding, 
  FaCheck, 
  FaArrowRight, 
  FaTable, 
  FaUsers, 
  FaStore,
  FaChevronRight,
  FaCheckCircle
} from 'react-icons/fa';
import { useDispatch } from 'react-redux';
import { setSubscription } from '../../store/slices/subscriptionSlice';
import { getFreePlanForType, resolvePlanMetadata } from '../../constants/plans';
import { useNavigate } from 'react-router-dom';
import LocalStorageService from '../../services/LocalStorageService';

export default function BusinessTypeSelection() {
  const [selectedType, setSelectedType] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    // Get temporary signup data
    const tempData = localStorage.getItem('tableserve_temp_signup');
    if (!tempData) {
      // If no temp data, redirect to signup
      navigate('/tableserve/signup');
      return;
    }
    
    try {
      const parsed = JSON.parse(tempData);
      // Check if data is recent (within 30 minutes)
      if (Date.now() - parsed.timestamp > 30 * 60 * 1000) {
        localStorage.removeItem('tableserve_temp_signup');
        navigate('/tableserve/signup');
        return;
      }
      setUserData(parsed);
    } catch (error) {
      console.error('Failed to parse temp signup data:', error);
      navigate('/tableserve/signup');
    }
  }, [navigate]);

  const businessTypes = [
    {
      type: 'restaurant',
      title: 'Single Restaurant',
      description: 'Perfect for individual restaurants and cafes',
      icon: FaUtensils,
      features: [
        '1 Table (Free Plan)',
        '1 Category',
        '2 Menu Items',
        'Basic QR Code',
        'Order Management'
      ],
      color: 'orange',
      gradient: 'from-orange-500 to-red-500'
    },
    {
      type: 'zone',
      title: 'Food Zone',
      description: 'Ideal for food courts and multi-vendor spaces',
      icon: FaBuilding,
      features: [
        '1 Shop (Free Plan)',
        '1 QR Code',
        '1 Category',
        '1 Menu Item',
        'Multi-Vendor Ready'
      ],
      color: 'blue',
      gradient: 'from-blue-500 to-indigo-500'
    }
  ];

  const handleContinue = async () => {
    if (!selectedType || !userData) {
      alert('Please select your hotel or restaurant type to continue.');
      return;
    }

    setLoading(true);
    try {
      // Apply the free plan for the selected type
      const freePlan = getFreePlanForType(selectedType);
      const subscriptionData = resolvePlanMetadata({ 
        planKey: 'free', 
        planType: selectedType 
      });

      // Ensure all required properties are present for free plan
      const enhancedSubscriptionData = {
        ...subscriptionData,
        key: 'free',
        label: 'Free Starter',
        planType: selectedType,
        priceINR: 0,
        status: 'active',
        startedAt: new Date().toISOString(),
        features: {
          ...subscriptionData.features,
          crudMenu: true, // Ensure basic menu management is allowed
          qrGeneration: true // Ensure basic QR generation is allowed
        }
      };

      console.log('Creating account with enhanced subscription data:', {
        selectedType,
        freePlan,
        subscriptionData,
        enhancedSubscriptionData,
        maxCategories: enhancedSubscriptionData.maxCategories,
        maxMenuItems: enhancedSubscriptionData.maxMenuItems,
        maxTables: enhancedSubscriptionData.maxTables
      });

      // Save to Redux store and localStorage with enhanced data
      dispatch(setSubscription(enhancedSubscriptionData));
      try {
        localStorage.setItem('tableserve_subscription', JSON.stringify(enhancedSubscriptionData));
        console.log('Subscription successfully saved to localStorage');
      } catch (error) {
        console.warn('Failed to save subscription to localStorage:', error);
      }

      // Create the account based on selected type
      if (selectedType === 'restaurant') {
        console.log('Creating restaurant with data:', {
          userData: userData.name,
          subscriptionData
        });
        
        const newRestaurant = LocalStorageService.addRestaurant({
          name: userData.name,
          ownerName: userData.ownerName,
          ownerEmail: userData.ownerEmail,
          ownerPhone: userData.ownerPhone,
          status: 'active',
          loginCredentials: {
            username: userData.username,
            password: userData.password,
          },
          subscription: enhancedSubscriptionData, // Full enhanced subscription object
          subscriptionPlan: enhancedSubscriptionData.key || 'free', // Plan key
          type: 'restaurant'
        });
        
        console.log('Restaurant created successfully:', {
          restaurantId: newRestaurant?.id,
          subscription: newRestaurant?.subscription,
          subscriptionKey: newRestaurant?.subscription?.key
        });
        
        // Restaurant credentials are automatically saved by LocalStorageService.addRestaurant
        // But we need to ensure the type is set correctly and include subscription
        if (newRestaurant) {
          LocalStorageService.saveShopCredentials({
            id: newRestaurant.id,
            restaurantId: newRestaurant.id,
            name: newRestaurant.name,
            ownerName: newRestaurant.ownerName,
            ownerEmail: newRestaurant.ownerEmail,
            ownerPhone: newRestaurant.ownerPhone,
            loginCredentials: {
              username: userData.username,
              password: userData.password,
            },
            type: 'restaurant_owner', // Critical for authentication
            status: 'active',
            createdAt: newRestaurant.createdAt,
            subscription: enhancedSubscriptionData, // Include subscription data
            subscriptionPlan: enhancedSubscriptionData.key
          });
        }
        
        setSuccessData({
          type: 'restaurant',
          name: userData.name,
          ownerName: userData.ownerName,
          username: userData.username,
          plan: enhancedSubscriptionData
        });
        
      } else if (selectedType === 'zone') {
        console.log('Creating zone with data:', {
          userData: userData.name,
          subscriptionData
        });
        
        const newZone = LocalStorageService.addZone({
          name: userData.name,
          ownerName: userData.ownerName,
          ownerEmail: userData.ownerEmail,
          ownerPhone: userData.ownerPhone,
          status: 'active',
          loginCredentials: {
            username: userData.username,
            password: userData.password,
          },
          subscription: enhancedSubscriptionData, // Full enhanced subscription object
          subscriptionPlan: enhancedSubscriptionData.key || 'free', // Plan key
          type: 'zone'
        });
        
        console.log('Zone created successfully:', {
          zoneId: newZone?.id,
          subscription: newZone?.subscription,
          subscriptionKey: newZone?.subscription?.key
        });
        
        // Save zone admin credentials for login - this was missing!
        if (newZone) {
          LocalStorageService.saveShopCredentials({
            id: newZone.id,
            zoneId: newZone.id,
            name: newZone.name,
            ownerName: newZone.ownerName,
            ownerEmail: newZone.ownerEmail,
            ownerPhone: newZone.ownerPhone,
            loginCredentials: {
              username: userData.username,
              password: userData.password,
            },
            type: 'zone_admin', // Critical for authentication
            status: 'active',
            createdAt: newZone.createdAt,
            subscription: enhancedSubscriptionData, // Include subscription data
            subscriptionPlan: enhancedSubscriptionData.key
          });
        }
        
        setSuccessData({
          type: 'zone',
          name: userData.name,
          ownerName: userData.ownerName,
          username: userData.username,
          plan: enhancedSubscriptionData
        });
      }
      
      // Clear temporary data
      localStorage.removeItem('tableserve_temp_signup');
      
      // Show success modal
      setShowSuccessModal(true);
      
    } catch (error) {
      console.error('Failed to create account:', error);
      alert('Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    
    try {
      // Set up user authentication before navigation
      if (successData?.type === 'restaurant') {
        // Get the created restaurant data to navigate to its dashboard
        const restaurants = JSON.parse(localStorage.getItem('tableserve_restaurants') || '[]');
        const userRestaurant = restaurants.find(r => {
          return r.loginCredentials && r.loginCredentials.username === successData.username;
        });
        
        console.log('Restaurant navigation debug:', {
          restaurants: restaurants.length,
          username: successData.username,
          foundRestaurant: userRestaurant,
          restaurantCredentials: userRestaurant?.loginCredentials
        });
        
        if (userRestaurant) {
          // Set up user session for auto-login
          const userSession = {
            id: userRestaurant.id,
            name: userRestaurant.ownerName,
            role: 'restaurant_owner',
            username: successData.username,
            restaurantId: userRestaurant.id,
            email: userRestaurant.ownerEmail,
            phone: userRestaurant.ownerPhone,
            subscription: userRestaurant.subscription
          };
          
          // Store user session
          localStorage.setItem('tableserve_user', JSON.stringify(userSession));
          sessionStorage.setItem('currentOwner', JSON.stringify(userSession));
          
          navigate(`/tableserve/restaurant/${userRestaurant.id}/dashboard`);
          return;
        }
      } else if (successData?.type === 'zone') {
        // Get the created zone data to navigate to its dashboard
        const zones = JSON.parse(localStorage.getItem('tableserve_zones') || '[]');
        const userZone = zones.find(z => {
          return z.loginCredentials && z.loginCredentials.username === successData.username;
        });
        
        console.log('Zone navigation debug:', {
          zones: zones.length,
          username: successData.username,
          foundZone: userZone,
          zoneCredentials: userZone?.loginCredentials
        });
        
        if (userZone) {
          // Set up user session for auto-login
          const userSession = {
            id: userZone.id,
            name: userZone.ownerName,
            role: 'zone_admin',
            username: successData.username,
            zoneId: userZone.id,
            zoneName: userZone.name,
            email: userZone.ownerEmail,
            phone: userZone.ownerPhone,
            subscription: userZone.subscription
          };
          
          // Store user session
          localStorage.setItem('tableserve_user', JSON.stringify(userSession));
          
          navigate(`/tableserve/zone/${userZone.id}/dashboard`);
          return;
        }
      }
      
      // If we reach here, something went wrong
      console.error('Failed to find created account for navigation:', {
        successData,
        restaurants: JSON.parse(localStorage.getItem('tableserve_restaurants') || '[]'),
        zones: JSON.parse(localStorage.getItem('tableserve_zones') || '[]')
      });
      
      // Fallback: try to login with the credentials
      alert('Account created successfully! Please login with your credentials to access your dashboard.');
      navigate('/tableserve/login');
      
    } catch (error) {
      console.error('Navigation error:', error);
      alert('Account created successfully! Please login with your credentials to access your dashboard.');
      navigate('/tableserve/login');
    }
  };

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Select Your Hotel or Restaurant Type
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            You're registered with our <span className="text-green-600 font-semibold">Default Free Starter Plan</span>.
            <br />Choose your hotel or restaurant type to get the appropriate free plan and access your dashboard.
          </p>
        </motion.div>

        {/* Business Type Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {businessTypes.map((type, index) => {
            const isSelected = selectedType === type.type;
            const IconComponent = type.icon;

            return (
              <motion.div
                key={type.type}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedType(type.type)}
                className={`relative rounded-2xl border-2 transition-all duration-300 cursor-pointer overflow-hidden ${
                  isSelected
                    ? `border-${type.color}-300 bg-gradient-to-br from-${type.color}-50 to-${type.color}-100 shadow-lg ring-4 ring-${type.color}-100`
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }`}
              >
                {/* Selection Indicator */}
                {isSelected && (
                  <div className={`absolute top-0 right-0 bg-gradient-to-r ${type.gradient} text-white p-3 rounded-bl-xl`}>
                    <FaCheck className="text-lg" />
                  </div>
                )}

                <div className="p-8">
                  {/* Header */}
                  <div className="flex items-start mb-6">
                    <div className={`p-4 rounded-2xl bg-gradient-to-r ${type.gradient} text-white mr-4`}>
                      <IconComponent className="text-2xl" />
                    </div>
                    <div className="flex-1">
                      <h3 className={`text-2xl font-bold mb-2 ${
                        isSelected ? `text-${type.color}-700` : 'text-gray-900'
                      }`}>
                        {type.title}
                      </h3>
                      <p className="text-gray-600">
                        {type.description}
                      </p>
                    </div>
                  </div>

                  {/* Free Plan Features */}
                  <div className="mb-6">
                    <div className="flex items-center mb-4">
                      <span className={`bg-${type.color}-100 text-${type.color}-700 text-sm font-semibold px-3 py-1 rounded-full`}>
                        Free {type.title} Plan
                      </span>
                    </div>
                    <ul className="space-y-3">
                      {type.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center">
                          <div className={`bg-${type.color}-100 p-1 rounded-full mr-3`}>
                            <FaCheck className={`text-${type.color}-600 text-xs`} />
                          </div>
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Upgrade Note */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Need more?</span> Upgrade to paid plans anytime for advanced features, analytics, and unlimited capacity.
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Continue Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleContinue}
            disabled={!selectedType || loading}
            className={`inline-flex items-center px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 ${
              selectedType && !loading
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Creating Account...
              </>
            ) : (
              <>
                Apply {selectedType ? businessTypes.find(t => t.type === selectedType)?.title : 'Selection'} Plan & Access Dashboard
                <FaArrowRight className="ml-2" />
              </>
            )}
          </motion.button>
          
          {selectedType && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-gray-500 mt-4"
            >
              This will apply the appropriate free plan and grant dashboard access
            </motion.p>
          )}
        </motion.div>

        {/* Footer Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12 p-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-200"
        >
          <h4 className="font-semibold text-orange-800 mb-2">
            🎯 Almost Ready!
          </h4>
          <p className="text-orange-700">
            Select your hotel or restaurant type to automatically apply the appropriate free plan and access your dashboard.
          </p>
        </motion.div>
      </div>
      
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
          >
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FaCheckCircle className="text-green-500 text-3xl" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Setup Complete!
              </h3>
              <div className="space-y-2 text-gray-600 mb-6">
                <p><span className="font-semibold">Business:</span> {successData?.name}</p>
                <p><span className="font-semibold">Owner:</span> {successData?.ownerName}</p>
                <p><span className="font-semibold">Plan:</span> Free {successData?.type === 'restaurant' ? 'Restaurant' : 'Zone'} Plan</p>
                <p><span className="font-semibold">Status:</span> <span className="text-green-600">Ready to use!</span></p>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSuccessModalClose}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300"
              >
                Access My Dashboard
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}