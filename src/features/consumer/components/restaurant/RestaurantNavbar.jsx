import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaStore, FaMapMarkerAlt, FaUtensils } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRestaurantDetails } from '../../../../store/slices/entitiesSlice';

const RestaurantNavbar = ({ showBackButton = false, title }) => {
  const { restaurantId, tableId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const restaurant = useSelector((state) => state.entities.currentRestaurant);
  const loading = useSelector((state) => state.entities.restaurantLoading);

  useEffect(() => {
    if (restaurantId) {
      dispatch(fetchRestaurantDetails({ restaurantId }));
    }
  }, [restaurantId, dispatch]);

  const handleBackClick = () => {
    navigate(-1);
  };

  const displayTitle = title || (loading ? "Loading..." : restaurant?.name ? restaurant.name : "Restaurant Menu");

  const getLogoImage = () => {
    if (!restaurant?.media?.images || !Array.isArray(restaurant.media.images)) return null;
    const logo = restaurant.media.images.find(img => img.imageType === 'logo');
    return logo?.url || restaurant.media.images[0]?.url || null;
  };

  const logoUrl = getLogoImage();

  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-accent to-[#FF8534] shadow-lg border-b border-white/10">
      <div className="max-w-3xl mx-auto px-4 py-3">
        <div className="flex items-center min-h-[55px]">
          
          {/* Back button */}
          {showBackButton && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleBackClick}
              className="w-10 h-10 rounded-full bg-white/15 border border-white/10 flex items-center justify-center mr-3 flex-shrink-0 text-white hover:bg-white/25 transition-colors backdrop-blur-sm"
            >
              <FaArrowLeft className="text-[15px]" />
            </motion.button>
          )}
          
          {/* Restaurant Info */}
          <div className="flex items-center flex-1 min-w-0">
            {/* Restaurant Logo */}
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={displayTitle}
                className="w-11 h-11 rounded-xl object-cover border-2 border-white/20 mr-3 flex-shrink-0 shadow-sm"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }}
              />
            ) : null}
            
            {/* Fallback Icon */}
            <div 
              className={`${logoUrl ? 'hidden' : 'flex'} w-11 h-11 bg-white/15 rounded-xl border border-white/10 items-center justify-center mr-3 flex-shrink-0 backdrop-blur-sm`} 
              style={{ display: logoUrl ? 'none' : 'flex' }}
            >
              <FaStore className="text-white text-xl drop-shadow-sm" />
            </div>
            
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <h1 className="text-[17px] font-bold text-white tracking-tight leading-tight truncate drop-shadow-sm">
                {displayTitle}
              </h1>
              
              {/* Metrics Row */}
              <div className="flex items-center gap-1.5 mt-0.5 truncate">
                <FaMapMarkerAlt className="text-white/85" size={10} />
                <span className="text-[11px] font-semibold text-white/85 uppercase tracking-wider truncate">
                  Table {tableId}
                </span>
                
                {restaurant?.cuisine && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-white/40 flex-shrink-0 mx-1" />
                    <span className="inline-flex items-center gap-1 flex-shrink-0 text-[11px] font-semibold text-white/85 uppercase tracking-wider truncate">
                      <FaUtensils className="text-white/90" size={9} />
                      <span className="truncate max-w-[80px]">{restaurant.cuisine}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </nav>
  );
};

export default RestaurantNavbar;
