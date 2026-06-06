import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaShoppingCart, FaArrowLeft, FaUtensils, FaClock, FaStore, FaMapMarkerAlt } from 'react-icons/fa';
import { generateZoneUrl } from '../../../../shared/routing/urlUtils';
import { useDispatch, useSelector } from 'react-redux';
import { fetchZoneAndShops } from '../../../../store/slices/entitiesSlice';

const ZoneUserNavbar = ({ cartItemCount = 0, showBackButton = false, title, shopInfo = null }) => {
  const { zoneId, tableId, userId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const zone = useSelector((state) => state.entities.currentZone);
  const loading = useSelector((state) => state.entities.zoneLoading);

  useEffect(() => {
    if (zoneId) {
      dispatch(fetchZoneAndShops(zoneId));
    }
  }, [zoneId, dispatch]);

  const handleBackClick = () => {
    navigate(-1);
  };

  const handleCartClick = () => {
    // Ensure we have a valid userId, generate one if needed
    const validUserId = userId || `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    navigate(generateZoneUrl(zoneId, tableId, validUserId, 'cart'));
  };

  const displayTitle = title || (loading ? "Loading..." : zone ? zone.name : "Food Zone");

  return (
    <nav className="sticky top-0 z-50 bg-accent shadow-[0_4px_20px_-5px_rgba(0,0,0,0.15)] border-b border-white/10">
      <div className="max-w-md mx-auto px-4 py-3">
        <div className="flex items-center justify-between min-h-[55px]">
          
          {/* Left side - Back button and Info */}
          <div className="flex items-center flex-1 overflow-hidden">
            
            {/* Elegant Translucent Back Button */}
            {(showBackButton || shopInfo) && (
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={handleBackClick}
                className="w-10 h-10 rounded-full bg-white/15 border border-white/10 flex items-center justify-center mr-3 flex-shrink-0 text-white hover:bg-white/25 transition-colors backdrop-blur-md"
              >
                <FaArrowLeft className="text-[15px]" />
              </motion.button>
            )}
            
            {shopInfo ? (
              /* --- SHOP INFO DISPLAY --- */
              <div className="flex items-center flex-1 min-w-0 pr-2">
                {/* Shop Logo */}
                {shopInfo.logo ? (
                  <img
                    src={shopInfo.logo}
                    alt={shopInfo.name}
                    className="w-11 h-11 rounded-xl object-cover border-2 border-white/20 mr-3 flex-shrink-0 shadow-sm"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                
                {/* Shop Fallback Icon */}
                <div 
                  className={`${shopInfo.logo ? 'hidden' : 'flex'} w-11 h-11 bg-white/15 rounded-xl border border-white/10 items-center justify-center mr-3 flex-shrink-0 backdrop-blur-md`} 
                  style={{ display: shopInfo.logo ? 'none' : 'flex' }}
                >
                  <FaStore className="text-white text-xl" />
                </div>
                
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h1 className="text-[17px] font-extrabold text-white tracking-tight leading-tight truncate drop-shadow-sm">
                    {shopInfo.name}
                  </h1>
                  
                  {/* Clean Metrics Row */}
                  <div className="flex items-center gap-2 text-[11px] font-bold text-white/85 mt-0.5 truncate">
                    {shopInfo.cuisine && (
                      <span className="inline-flex items-center gap-1 flex-shrink-0">
                        <FaUtensils className="text-white/90" size={10} />
                        <span className="truncate max-w-[80px]">{shopInfo.cuisine}</span>
                      </span>
                    )}
                    
                    {shopInfo.cuisine && shopInfo.prepTime && (
                      <span className="w-1 h-1 rounded-full bg-white/40 flex-shrink-0" />
                    )}
                    
                    {shopInfo.prepTime && (
                      <span className="inline-flex items-center gap-1 flex-shrink-0">
                        <FaClock className="text-white/90" size={10} />
                        {shopInfo.prepTime}m
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* --- REGULAR ZONE DISPLAY --- */
              <div className="flex items-center overflow-hidden pr-2">
                {/* Soft White Avatar Icon */}
                <div className="w-11 h-11 bg-white/15 border border-white/10 rounded-xl flex items-center justify-center mr-3 flex-shrink-0 backdrop-blur-md">
                  <span className="text-white font-black text-sm tracking-widest drop-shadow-sm">FZ</span>
                </div>
                
                <div className="flex flex-col justify-center truncate">
                  <h1 className="text-[18px] font-extrabold text-white tracking-tight leading-tight truncate drop-shadow-sm">
                    {displayTitle}
                  </h1>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <FaMapMarkerAlt className="text-white/85" size={10} />
                    <p className="text-[11px] font-bold text-white/85 uppercase tracking-widest truncate">
                      Table {tableId}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right side - Cart Button */}
          <div className="relative flex-shrink-0 ml-2">
            {cartItemCount > 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCartClick}
                className="relative w-11 h-11 bg-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.1)] flex items-center justify-center text-accent transition-shadow"
              >
                <FaShoppingCart className="text-[17px]" />
                
                {/* Crisp Notification Badge */}
                <span className="absolute -top-2 -right-2 bg-slate-900 text-white text-[11px] font-black rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5 border-2 border-white">
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              </motion.button>
            )}
          </div>
          
        </div>
      </div>
    </nav>
  );
};

export default ZoneUserNavbar;