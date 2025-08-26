import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  FaQrcode, 
  FaUtensils, 
  FaShoppingCart, 
  FaArrowRight,
  FaMapMarkerAlt,
  FaClock,
  FaStar,
  FaWifi
} from 'react-icons/fa';
import { MdOutlineRamenDining } from 'react-icons/md';
import { generateContextualUrl } from '../../utils/urlUtils';
import logger from '../../services/LoggingService';

const WelcomeScreen = () => {
  const { restaurantId, zoneId, tableId, userId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.ui.auth);
  const [showDetails, setShowDetails] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  const urlParams = { restaurantId, zoneId, tableId, userId };
  const isZone = !!zoneId;
  const isRestaurant = !!restaurantId;

  // Welcome steps for the tutorial
  const welcomeSteps = [
    {
      icon: FaQrcode,
      title: "Welcome to TableServe!",
      description: isZone 
        ? "You've scanned a QR code for a food zone with multiple vendors"
        : "You've scanned a QR code to access the digital menu",
      color: "text-blue-500"
    },
    {
      icon: isZone ? FaUtensils : MdOutlineRamenDining,
      title: isZone ? "Choose Your Vendor" : "Browse the Menu",
      description: isZone
        ? "Select from multiple food vendors and browse their menus"
        : "Explore delicious dishes and add your favorites to cart",
      color: "text-green-500"
    },
    {
      icon: FaShoppingCart,
      title: "Order & Enjoy",
      description: "Add items to cart, complete your order, and enjoy your meal delivered to your table",
      color: "text-accent"
    }
  ];

  // Auto-advance steps
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentStep < welcomeSteps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [currentStep, welcomeSteps.length]);

  // Check if user has seen welcome before
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('tableserve_welcome_seen');
    if (hasSeenWelcome) {
      handleGetStarted();
    }
  }, []);

  const handleGetStarted = () => {
    try {
      // Mark welcome as seen
      localStorage.setItem('tableserve_welcome_seen', 'true');
      
      // Navigate to appropriate screen
      const targetPath = isZone ? 'shops' : 'menu';
      const targetUrl = generateContextualUrl(urlParams, targetPath);
      
      logger.route('WelcomeScreen - getting started', targetUrl, {
        params: urlParams,
        isFirstTime: true
      });
      
      navigate(targetUrl);
    } catch (error) {
      logger.error('Failed to navigate from welcome screen', error, 'WelcomeScreen');
      // Fallback navigation
      navigate('/tableserve');
    }
  };

  const handleSkip = () => {
    handleGetStarted();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-accent/10 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FaMapMarkerAlt className="text-accent mr-2" />
              <span className="text-sm font-raleway text-gray-600">
                Table {tableId} {isZone ? `• Zone` : `• Restaurant`}
              </span>
            </div>
            <button
              onClick={handleSkip}
              className="text-gray-500 hover:text-gray-700 font-raleway text-sm"
            >
              Skip intro
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-md mx-auto text-center">
          {/* Logo/Brand */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="mb-8"
          >
            <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <MdOutlineRamenDining className="text-3xl text-white" />
            </div>
            <h1 className="text-3xl font-fredoka text-gray-800 mb-2">TableServe</h1>
            <p className="text-gray-600 font-raleway">Digital Dining Experience</p>
          </motion.div>

          {/* Welcome Steps */}
          <div className="space-y-6 mb-8">
            {welcomeSteps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ 
                    opacity: isActive || isCompleted ? 1 : 0.3,
                    x: 0,
                    scale: isActive ? 1.05 : 1
                  }}
                  transition={{ delay: index * 0.2 }}
                  className={`p-6 rounded-2xl ${
                    isActive 
                      ? 'bg-white shadow-lg border-2 border-accent/20' 
                      : 'bg-white/50 shadow-sm'
                  }`}
                >
                  <div className="flex items-center mb-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${
                      isActive ? 'bg-accent' : 'bg-gray-200'
                    }`}>
                      <Icon className={`text-xl ${
                        isActive ? 'text-white' : 'text-gray-500'
                      }`} />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="text-lg font-fredoka text-gray-800 mb-1">
                        {step.title}
                      </h3>
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${
                          isCompleted ? 'bg-green-500' : isActive ? 'bg-accent' : 'bg-gray-300'
                        }`} />
                        <span className="text-xs text-gray-500">
                          Step {index + 1} of {welcomeSteps.length}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 font-raleway text-sm text-left">
                    {step.description}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* Quick Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="bg-gradient-to-r from-accent/10 to-blue-500/10 rounded-2xl p-4 mb-8"
          >
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <FaClock className="text-accent text-xl mx-auto mb-1" />
                <p className="text-xs font-raleway text-gray-600">Fast Service</p>
              </div>
              <div>
                <FaStar className="text-yellow-500 text-xl mx-auto mb-1" />
                <p className="text-xs font-raleway text-gray-600">Quality Food</p>
              </div>
              <div>
                <FaWifi className="text-blue-500 text-xl mx-auto mb-1" />
                <p className="text-xs font-raleway text-gray-600">Contactless</p>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGetStarted}
              className="w-full bg-accent text-white py-4 px-6 rounded-2xl font-fredoka text-lg tracking-wide shadow-lg hover:bg-accent/90 transition-colors flex items-center justify-center"
            >
              {isZone ? 'Choose Vendor' : 'View Menu'}
              <FaArrowRight className="ml-2" />
            </motion.button>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4 }}
              onClick={() => setShowDetails(!showDetails)}
              className="w-full text-gray-500 hover:text-gray-700 font-raleway text-sm py-2"
            >
              {showDetails ? 'Hide details' : 'How it works'}
            </motion.button>
          </div>

          {/* Additional Details */}
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 p-4 bg-gray-50 rounded-xl text-left"
            >
              <h4 className="font-fredoka text-gray-800 mb-2">How TableServe Works:</h4>
              <ul className="text-sm text-gray-600 font-raleway space-y-1">
                <li>• Scan QR code at your table</li>
                <li>• Browse digital menu on your phone</li>
                <li>• Add items to cart and place order</li>
                <li>• Pay securely through the app</li>
                <li>• Food delivered directly to your table</li>
              </ul>
              
              {user && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Welcome back, {user.name || 'valued customer'}!
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-100 py-4">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs text-gray-500 font-raleway">
            Need help? Look for staff assistance or ask your server
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;