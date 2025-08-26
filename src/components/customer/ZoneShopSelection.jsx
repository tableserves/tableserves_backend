import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  FaStore,
  FaStar,
  FaClock,
  FaUtensils,
  FaArrowRight,
  FaMapMarkerAlt,
  FaExclamationTriangle,
  FaArrowLeft
} from 'react-icons/fa';
import { 
  fetchZoneAndShops,
  selectCurrentZone,
  selectZoneShops,
  selectZoneLoading,
  selectZoneError
} from '../../store/slices/entitiesSlice';
import { generateShopUrl, validateUrlParams, cleanUrl } from '../../utils/urlUtils';
import logger from '../../services/LoggingService';

const ZoneShopSelection = () => {
  const { zoneId, tableId, userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  // Enhanced parameter validation
  const urlParams = { zoneId, tableId, userId };
  const validation = validateUrlParams(urlParams);

  // Use the new entities slice selectors with fallback values
  const zone = useSelector(selectCurrentZone);
  const shops = useSelector(selectZoneShops) || [];
  const loading = useSelector(selectZoneLoading);
  const error = useSelector(selectZoneError);

  // Enhanced URL normalization with proper logging
  useEffect(() => {
    if (userId === 'undefined' || userId === 'null') {
      const currentPath = location.pathname;
      const normalizedPath = cleanUrl(currentPath);

      if (normalizedPath !== currentPath) {
        logger.debug('Normalizing ZoneShopSelection URL', {
          from: currentPath,
          to: normalizedPath,
          userId
        }, 'ZoneShopSelection');
        navigate(normalizedPath, { replace: true });
        return;
      }
    }
    
    // Log URL validation issues
    if (!validation.isValid) {
      logger.error('Invalid URL parameters in ZoneShopSelection', {
        params: urlParams,
        errors: validation.errors
      }, 'ZoneShopSelection');
    }
  }, [location.pathname, userId, navigate, validation, urlParams]);

  useEffect(() => {
    if (zoneId && validation.isValid) {
      logger.debug('Fetching zone and shops', { zoneId }, 'ZoneShopSelection');
      dispatch(fetchZoneAndShops(zoneId));
    }
  }, [zoneId, dispatch, validation.isValid]);

  const handleShopSelect = (shopId) => {
    try {
      // Use enhanced URL generation with proper user ID handling
      const shopUrl = generateShopUrl(zoneId, tableId, userId, shopId, 'menu');
      logger.route('ZoneShopSelection - shop selected', shopUrl, {
        zoneId,
        tableId,
        userId,
        shopId
      });
      navigate(shopUrl);
    } catch (error) {
      logger.error('Failed to navigate to shop', error, 'ZoneShopSelection');
      // Fallback navigation
      navigate(`/tableserve/zone/${zoneId}/table/${tableId}/shop/${shopId}/menu`);
    }
  };

  const handleGoBack = () => {
    // Navigate back to zone home or appropriate parent route
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-raleway">Loading zone shops...</p>
          <p className="text-gray-500 font-raleway text-sm mt-2">Please wait while we fetch available vendors</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <FaExclamationTriangle className="text-6xl text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-fredoka text-gray-800 mb-4">Unable to Load Zone</h1>
          <p className="text-gray-600 font-raleway mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => {
                if (zoneId) {
                  dispatch(fetchZoneAndShops(zoneId));
                }
              }}
              className="w-full bg-accent text-white py-3 px-6 rounded-xl font-raleway font-semibold hover:bg-accent/90 transition-colors"
            >
              🔄 Try Again
            </button>
            <button
              onClick={handleGoBack}
              className="w-full bg-gray-200 text-gray-700 py-3 px-6 rounded-xl font-raleway font-semibold hover:bg-gray-300 transition-colors flex items-center justify-center"
            >
              <FaArrowLeft className="mr-2" /> Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <FaMapMarkerAlt className="text-accent mr-2" />
              <span className="text-sm font-raleway text-gray-600">Table {tableId}</span>
            </div>
            <h1 className="text-3xl font-fredoka text-gray-800 mb-2">
              {zone?.name || 'Loading Zone...'}
            </h1>
            <p className="text-gray-600 font-raleway">
              Choose from our amazing food vendors
            </p>
          </div>
        </div>
      </div>

      {/* Shop Selection */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center">
              <FaExclamationTriangle className="text-red-400 mr-2" />
              <span className="text-red-700 font-raleway text-sm">
                Failed to load some shops. Some vendors may not be displayed.
              </span>
            </div>
          </div>
        )}

        {shops.length === 0 && !loading ? (
          <div className="text-center py-12">
            <FaStore className="text-6xl text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-fredoka text-gray-600 mb-2">No Shops Available</h2>
            <p className="text-gray-500 font-raleway">
              There are currently no active shops in this zone.
            </p>
            <button
              onClick={() => {
                logger.debug('Retrying zone shops fetch', { zoneId }, 'ZoneShopSelection');
                dispatch(fetchZoneAndShops(zoneId));
              }}
              className="mt-4 px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors"
            >
              🔄 Refresh Shops
            </button>
          </div>
        ) : (
          <>
            {/* Shop count indicator */}
            <div className="mb-6 text-center">
              <p className="text-gray-600 font-raleway">
                {shops.length} {shops.length === 1 ? 'vendor' : 'vendors'} available
              </p>
            </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shops.map((shop, index) => (
              <motion.div
                key={shop.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer"
                onClick={() => handleShopSelect(shop.id)}
              >
                {/* Shop Image */}
                <div className="h-48 bg-gradient-to-br from-accent/20 to-accent/40 relative overflow-hidden">
                  {shop.logo ? (
                    <img
                      src={shop.logo}
                      alt={shop.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <FaStore className="text-4xl text-accent" />
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute top-4 right-4">
                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-raleway">
                      Open
                    </span>
                  </div>
                </div>

                {/* Shop Info */}
                <div className="p-6">
                  <h3 className="text-xl font-fredoka text-gray-800 mb-2">
                    {shop.name}
                  </h3>

                  <p className="text-gray-600 font-raleway text-sm mb-4 line-clamp-2">
                    {shop.description || 'Delicious food awaits you!'}
                  </p>

                  {/* Shop Stats */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <FaStar className="text-yellow-400 mr-1" />
                      <span className="text-sm font-raleway text-gray-600">
                        {shop.rating || '4.5'} ({shop.reviews || '50+'})</span>
                    </div>

                    <div className="flex items-center">
                      <FaClock className="text-gray-400 mr-1" />
                      <span className="text-sm font-raleway text-gray-600">
                        {shop.prepTime || '15-20'} min
                      </span>
                    </div>
                  </div>

                  {/* Cuisine Type */}
                  <div className="flex items-center mb-4">
                    <FaUtensils className="text-accent mr-2" />
                    <span className="text-sm font-raleway text-gray-600">
                      {shop.cuisine || 'Multi-Cuisine'}
                    </span>
                  </div>

                  {/* Order Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-accent text-white py-3 rounded-xl font-raleway font-semibold flex items-center justify-center hover:bg-accent/90 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShopSelect(shop.id);
                    }}
                  >
                    View Menu
                    <FaArrowRight className="ml-2" />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
          </>
        )}
      </div>

      {/* Enhanced Zone Info Footer */}
      {zone && (
        <div className="bg-white border-t border-gray-200 mt-12">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <FaMapMarkerAlt className="text-accent mr-2" />
                <p className="text-gray-600 font-raleway text-sm">
                  Table {tableId} • {zone?.name || 'Loading Zone...'}
                </p>
              </div>
              {zone?.address && (
                <p className="text-gray-500 font-raleway text-xs">
                  📍 {zone.address}{zone.city && `, ${zone.city}`}
                </p>
              )}
              {userId && (
                <p className="text-gray-400 font-raleway text-xs mt-1">
                  User Session: {userId.slice(0, 8)}...
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZoneShopSelection;
