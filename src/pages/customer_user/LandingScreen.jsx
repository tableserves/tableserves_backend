import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUtensils, FaCocktail, FaIceCream, FaHamburger, FaArrowRight } from 'react-icons/fa';
import cat1 from '../../assets/cat1.png';

const LandingScreen = () => {
  const { restaurantId, tableId, userId, zoneId } = useParams();
  const navigate = useNavigate();

  // Debug logging to help troubleshoot route parameters (only log once per mount)
  React.useEffect(() => {
    console.log('LandingScreen mounted with params:', { restaurantId, tableId, userId, zoneId });
  }, []); // Empty dependency array to log only once on mount

  const handleStartOrdering = () => {
    // Navigate to appropriate starting point based on zone vs restaurant
    let menuRoute;
    if (zoneId && tableId && userId) {
      // For zone users, start with shop selection
      menuRoute = `/tableserve/zone/${zoneId}/table/${tableId}/user/${userId}/shops`;
    } else if (zoneId && tableId) {
      // For zone users without userId, start with shop selection
      menuRoute = `/tableserve/zone/${zoneId}/table/${tableId}/shops`;
    } else if (restaurantId && tableId && userId) {
      // For restaurant users, go directly to menu
      menuRoute = `/tableserve/restaurant/${restaurantId}/table/${tableId}/user/${userId}/menu`;
    } else if (restaurantId && tableId) {
      // For restaurant users without userId, go directly to menu
      menuRoute = `/tableserve/restaurant/${restaurantId}/table/${tableId}/menu`;
    } else {
      menuRoute = '/tableserve';
    }
    console.log('Navigating to:', menuRoute);
    navigate(menuRoute);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent via-accent/90 to-accent/80 text-gray-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent)] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.1),transparent)] pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 relative z-10"
      >
        <motion.div
          className="flex flex-col items-center mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="relative mb-6">
            <motion.img
              src={cat1}
              alt="Restaurant Logo"
              className="w-20 h-20 rounded-2xl object-cover ring-4 ring-accent/20"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            />
            <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-accent/90 backdrop-blur px-4 py-1 rounded-full">
              <span className="text-white text-sm font-medium">Welcome</span>
            </div>
          </div>
          <h1 className="text-3xl font-raleway font-bold text-center mb-2 capitalize bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            {restaurantName.replace(/-/g, ' ')}
          </h1>
          <p className="text-gray-600 text-center text-base font-raleway">Discover a world of flavors</p>
        </motion.div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <motion.div
            className="group bg-gradient-to-br from-orange-100 to-orange-50 h-24 rounded-2xl flex flex-col items-center justify-center cursor-pointer "

          >
            <FaUtensils className="text-2xl text-accent mb-2 group-hover:scale-110 transition-transform duration-300" />
            <span className="text-lg font-raleway text-gray-800 group-hover:text-accent transition-colors duration-300">Starters</span>
          </motion.div>

          <motion.div
            className="group bg-gradient-to-br from-red-100 to-red-50 h-24 rounded-2xl flex flex-col items-center justify-center cursor-pointer "



          >
            <FaHamburger className="text-2xl text-accent mb-2 group-hover:scale-110 transition-transform duration-300" />
            <span className="text-lg font-raleway text-gray-800 group-hover:text-accent transition-colors duration-300">Mains</span>
          </motion.div>

          <motion.div
            className="group bg-gradient-to-br from-blue-100 to-blue-50 h-24 rounded-2xl flex flex-col items-center justify-center cursor-pointer "
            whileHover={{ scale: 1.02, y: -5 }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <FaCocktail className="text-2xl text-accent mb-2 group-hover:scale-110 transition-transform duration-300" />
            <span className="text-lg font-raleway text-gray-800 group-hover:text-accent transition-colors duration-300">Beverages</span>
          </motion.div>

          <motion.div
            className="group bg-gradient-to-br from-pink-100 to-pink-50 h-24 rounded-2xl flex flex-col items-center justify-center cursor-pointer"
            whileHover={{ scale: 1.02, y: -5 }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
          >
            <FaIceCream className="text-2xl text-accent mb-2 group-hover:scale-110 transition-transform duration-300" />
            <span className="text-lg font-raleway text-gray-800 group-hover:text-accent transition-colors duration-300">Desserts</span>
          </motion.div>
        </div>

        <motion.div
          className="bg-gradient-to-r from-accent to-accent/90 text-white p-4 rounded-2xl text-center font-raleway mb-6 relative overflow-hidden group"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          whileHover={{ scale: 1.02 }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2),transparent)] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <span className="block text-sm text-white/80 mb-1">Limited Time</span>
          <span className="block text-xl font-semibold">Special Offer: 10% off on all desserts!</span>
        </motion.div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleStartOrdering}
          className="w-full bg-gradient-to-r from-accent to-accent/90 text-white py-4 rounded-2xl font-fredoka text-xl tracking-wide shadow-xl
                     hover:shadow-2xl hover:shadow-accent/20 transition-all duration-300 relative overflow-hidden group"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2),transparent)] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
          <div className="flex items-center justify-center space-x-2">
            <span>Start Ordering</span>
            <FaArrowRight className="group-hover:translate-x-1 transition-transform duration-300" />
          </div>
        </motion.button>
      </motion.div>
    </div>
  );
};

export default LandingScreen;