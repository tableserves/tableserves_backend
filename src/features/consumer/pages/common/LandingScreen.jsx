import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowRight, FaMapMarkerAlt } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRestaurantDetails, fetchZoneAndShops } from '../../../../store/slices/entitiesSlice';
import DatabaseService from '../../../../services/DatabaseService';
import cat1 from '../../../../assets/cat1.png';
import logo from '../../../../assets/logo.svg';

// --- Clean Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.6, 
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

const LandingScreen = () => {
  const { restaurantId, tableId, userId, zoneId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Local state for direct data fetch
  const [localRestaurantData, setLocalRestaurantData] = useState(null);
  const [fetchingFromBackend, setFetchingFromBackend] = useState(false);
  const [localZoneData, setLocalZoneData] = useState(null);
  const [fetchingZoneFromBackend, setFetchingZoneFromBackend] = useState(false);
  
  // Get data from Redux store
  const restaurant = useSelector((state) => state.entities.currentRestaurant);
  const zone = useSelector((state) => state.entities.currentZone);
  const loading = useSelector((state) => 
    state.entities.restaurantLoading || state.entities.zoneLoading || fetchingFromBackend || fetchingZoneFromBackend
  );

  // Get current entity data (prioritize local over Redux)
  const currentRestaurant = useMemo(() => localRestaurantData ?? restaurant, [localRestaurantData, restaurant]);
  const currentZone = useMemo(() => localZoneData ?? zone, [localZoneData, zone]);

  // Extract entity name with enhanced logic
  const entityName = useMemo(() => {
    if (currentRestaurant?.name && currentRestaurant.name !== 'undefined' && !currentRestaurant.isTemporary) {
      return currentRestaurant.name;
    }
    if (currentZone?.name && currentZone.name !== 'undefined') {
      return currentZone.name;
    }
    if (restaurantId) {
      if (fetchingFromBackend) return 'Loading...';
      return `Restaurant ${restaurantId.slice(-6).toUpperCase()}`;
    }
    if (zoneId) {
      if (fetchingZoneFromBackend) return 'Loading...';
      return `Food Zone ${zoneId.slice(-6).toUpperCase()}`;
    }
    return 'TableServe';
  }, [currentRestaurant, currentZone, restaurantId, zoneId, fetchingFromBackend, fetchingZoneFromBackend]);

  // Get logo image from media.images array
  const getLogoImage = useCallback((entity) => {
    if (!entity?.media?.images) return cat1;
    const logoImage = entity.media.images.find(img => img.imageType === 'logo');
    return logoImage?.url ?? cat1;
  }, []);

  // Get restaurant and zone images (memoized)
  const restaurantImage = useMemo(() => getLogoImage(currentRestaurant), [currentRestaurant, getLogoImage]);
  const zoneImage = useMemo(() => getLogoImage(currentZone), [currentZone, getLogoImage]);

  // Get display information for current entity (memoized)
  const displayInfo = useMemo(() => {
    const isZoneContext = !!zoneId;
    const entity = isZoneContext ? currentZone : currentRestaurant;
    const image = isZoneContext ? zoneImage : restaurantImage;
    const hasCustomImage = !!entity?.media?.images?.find(img => img.imageType === 'logo');
    
    const description = entity?.description?.trim() 
      ? entity.description 
      : (entity?.name ? 'No specific description provided.' : 'No information available.');
    
    return {
      name: entityName,
      description,
      image,
      hasCustomImage
    };
  }, [zoneId, currentZone, currentRestaurant, zoneImage, restaurantImage, entityName]);

  // Fetch restaurant data from backend API
  useEffect(() => {
    if (!restaurantId || localRestaurantData || fetchingFromBackend) return;

    const fetchRestaurantFromBackend = async () => {
      setFetchingFromBackend(true);
      try {
        const restaurantData = await DatabaseService.getRestaurant(restaurantId);
        
        if (restaurantData) {
          setLocalRestaurantData({
            id: restaurantData._id ?? restaurantData.id,
            name: restaurantData.name ?? `Restaurant ${restaurantId.slice(-6).toUpperCase()}`,
            description: restaurantData.description ?? 'Welcome to our restaurant',
            address: restaurantData.address,
            city: restaurantData.city,
            state: restaurantData.state,
            cuisine: restaurantData.cuisine,
            status: restaurantData.status,
            media: restaurantData.media,
            coverImage: restaurantData.coverImage
          });
        } else {
          setLocalRestaurantData({
            id: restaurantId,
            name: `Restaurant ${restaurantId.slice(-6).toUpperCase()}`,
            description: 'Welcome to our restaurant'
          });
        }
      } catch (error) {
        console.error('Failed to fetch restaurant:', error);
        setLocalRestaurantData({
          id: restaurantId,
          name: `Restaurant ${restaurantId.slice(-6).toUpperCase()}`,
          description: 'Welcome to our restaurant'
        });
      } finally {
        setFetchingFromBackend(false);
      }
    };
    
    fetchRestaurantFromBackend();
  }, [restaurantId, localRestaurantData, fetchingFromBackend]);

  // Fetch zone data from backend API
  useEffect(() => {
    if (!zoneId || localZoneData || fetchingZoneFromBackend) return;

    const fetchZoneFromBackend = async () => {
      setFetchingZoneFromBackend(true);
      try {
        const zoneData = await DatabaseService.getZone(zoneId);
        
        if (zoneData) {
          setLocalZoneData({
            id: zoneData._id ?? zoneData.id,
            name: zoneData.name ?? `Zone ${zoneId.slice(-6).toUpperCase()}`,
            description: zoneData.description ?? 'Welcome to our food zone',
            location: zoneData.location,
            media: zoneData.media
          });
        } else {
          setLocalZoneData({
            id: zoneId,
            name: `Food Zone ${zoneId.slice(-6).toUpperCase()}`,
            description: 'Welcome to our food zone'
          });
        }
      } catch (error) {
        console.error('Failed to fetch zone:', error);
        setLocalZoneData({
          id: zoneId,
          name: `Food Zone ${zoneId.slice(-6).toUpperCase()}`,
          description: 'Welcome to our food zone'
        });
      } finally {
        setFetchingZoneFromBackend(false);
      }
    };
    
    fetchZoneFromBackend();
  }, [zoneId, localZoneData, fetchingZoneFromBackend]);

  // Fetch entity details from Redux when component mounts
  useEffect(() => {
    if (restaurantId && !restaurant) {
      dispatch(fetchRestaurantDetails({ restaurantId }));
    } else if (zoneId && !zone) {
      dispatch(fetchZoneAndShops(zoneId));
    }
  }, [restaurantId, zoneId, restaurant, zone, dispatch]);
  
  // Retry mechanism if data is still not loaded after a delay
  useEffect(() => {
    if (restaurantId && !restaurant && !loading) {
      const timer = setTimeout(() => {
        dispatch(fetchRestaurantDetails({ restaurantId }));
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [restaurantId, restaurant, loading, dispatch]);

  const handleStartOrdering = useCallback(() => {
    let menuRoute;
    if (zoneId) {
      menuRoute = userId 
        ? `/zone/${zoneId}/table/${tableId}/user/${userId}/shops`
        : `/zone/${zoneId}/table/${tableId}/shops`;
    } else if (restaurantId) {
      menuRoute = userId
        ? `/restaurant/${restaurantId}/table/${tableId}/user/${userId}/menu`
        : `/restaurant/${restaurantId}/table/${tableId}/menu`;
    } else {
      menuRoute = '/tableserve';
    }
    navigate(menuRoute);
  }, [zoneId, restaurantId, tableId, userId, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-5 relative overflow-hidden">
      
      {/* Soft, Minimal Ambient Background */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-accent pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-accent/5 blur-[100px] pointer-events-none" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-[420px] bg-white rounded-[2rem] p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 relative z-10"
      >
        
        {/* Header: Table Indicator */}
        <motion.div variants={itemVariants} className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 border border-slate-100 shadow-sm">
            <FaMapMarkerAlt className="text-accent text-[12px]" />
            <span className="text-xs font-bold text-slate-600 tracking-wider uppercase">Table {tableId}</span>
          </div>
        </motion.div>

        {/* Profile Section */}
        <div className="flex flex-col items-center text-center">
          <motion.div variants={itemVariants} className="relative mb-6">
            {/* Elegant Drop Shadow matching the image */}
            <div className="absolute inset-0 bg-accent/20 rounded-full blur-xl translate-y-3 scale-90 opacity-60" />
            
            {/* Crisp Image Container */}
            <div className="relative w-28 h-28 rounded-full bg-white border-4 border-white shadow-[0_8px_20px_rgba(0,0,0,0.08)] overflow-hidden z-10">
              <img
                src={displayInfo.image}
                alt={`${displayInfo.name} Logo`}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.src = cat1; }}
              />
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="w-full mb-8">
            <h1 className="text-2xl sm:text-[1.75rem] font-extrabold text-slate-800 tracking-tight leading-tight mb-3">
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.span 
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="inline-block animate-pulse text-slate-400"
                  >
                    Loading...
                  </motion.span>
                ) : (
                  <motion.span
                    key="name"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {displayInfo.name}
                  </motion.span>
                )}
              </AnimatePresence>
            </h1>
            
            {/* Clean Description */}
            <p className="text-slate-500 text-[14px] leading-relaxed min-h-[3em] px-2">
              {displayInfo.description}
            </p>
          </motion.div>
        </div>

        {/* Simple & Advanced CTA Button */}
        <motion.div variants={itemVariants} className="w-full">
          <button
            type="button"
            onClick={handleStartOrdering}
            className="w-full bg-accent text-white py-4 px-6 rounded-2xl font-bold text-[1.05rem] tracking-wide flex items-center justify-center gap-3 shadow-[0_8px_20px_-6px_var(--tw-shadow-color)] shadow-accent/40 hover:shadow-accent/60 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            Start Ordering
            <FaArrowRight className="text-sm" />
          </button>
        </motion.div>

        {/* Minimal Footer Branding */}
        <motion.div variants={itemVariants} className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Powered by</span>
          <div className="flex items-center gap-1.5 opacity-80 grayscale transition-all duration-300 hover:grayscale-0 hover:opacity-100 cursor-default">
            <img src={logo} alt="TableServe" className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold text-slate-700 tracking-tight">TableServe</span>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
};

export default LandingScreen;