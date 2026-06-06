import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaStar, FaClock, FaMapMarkerAlt, FaStore, FaExclamationTriangle } from 'react-icons/fa';
import ZoneUserLayout from '../../components/zone/ZoneLayout';
import ZoneUserNavbar from '../../components/zone/ZoneNavbar';
import ApiService from '../../../../shared/api/ApiService';
import { generateShopUrl, generateZoneUrl } from '../../../../shared/routing/urlUtils';

// --- Clean Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 15 }
  }
};

const ZoneShopSelectionScreen = () => {
  const { zoneId, tableId, userId } = useParams();
  const navigate = useNavigate();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zone, setZone] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchZoneAndShops = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 ZoneShopSelectionScreen: Starting REAL-TIME DATABASE fetch for zoneId:', zoneId);
        
        // Use ApiService to fetch zone shops from the database
        const { shops: fetchedShops, zone: zoneData } = await ApiService.getZoneShops(zoneId);
        
        if (!zoneData) {
          throw new Error('Zone not found in database');
        }
        setZone(zoneData);

        if (!fetchedShops || fetchedShops.length === 0) {
          setError('No shops available in this zone. Please try again later.');
          setShops([]);
          setLoading(false);
          return;
        }

        // Transform the API response
        const transformedShops = fetchedShops
          .filter(shop => shop.status === 'active')
          .map(shop => {
            const getShopImage = (shopData) => {
              if (shopData.media?.images && Array.isArray(shopData.media.images) && shopData.media.images.length > 0) {
                const logoImage = shopData.media.images.find(img => img.imageType === 'logo');
                if (logoImage && logoImage.url) return logoImage.url;
                
                const bannerImage = shopData.media.images.find(img => img.imageType === 'banner');
                if (bannerImage && bannerImage.url) return bannerImage.url;
                
                const firstImage = shopData.media.images[0];
                if (firstImage && (firstImage.url || firstImage)) return firstImage.url || firstImage;
              }
              if (shopData.images && Array.isArray(shopData.images) && shopData.images.length > 0) {
                return shopData.images[0].url || shopData.images[0];
              }
              if (shopData.logo) return shopData.logo;
              if (shopData.media?.logo) return shopData.media.logo;
              return null;
            };

            const imageUrl = getShopImage(shop);

            return {
              id: shop._id,
              name: shop.name,
              cuisine: shop.category || 'Various',
              rating: shop.rating?.average || 4.5,
              deliveryTime: '10-15 min',
              image: imageUrl,
              description: shop.description || 'Delicious food available',
              isOpen: shop.status === 'active',
              distance: 'In zone',
              phone: shop.contactInfo?.phone || '',
              email: shop.contactInfo?.email || ''
            };
          });

        setShops(transformedShops);
        setLoading(false);
      } catch (error) {
        console.error('❌ ZoneShopSelectionScreen: Error fetching zone data from DATABASE:', error);
        setError(error.message || 'Failed to load zone shops from database. Please try again.');
        setLoading(false);
      }
    };

    if (zoneId) {
      fetchZoneAndShops();
    }
  }, [zoneId]);

  const handleShopSelect = (shopId) => {
    // Ensure we have a valid userId, generate one if needed
    const validUserId = userId || `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    navigate(generateShopUrl(zoneId, tableId, validUserId, shopId, 'menu'));
  };

  const handleViewAllMenu = () => {
    // Ensure we have a valid userId, generate one if needed
    const validUserId = userId || `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const url = generateZoneUrl(zoneId, tableId, validUserId, 'menu');
    navigate(url);
  };

  if (loading) {
    return (
      <ZoneUserLayout>
        <ZoneUserNavbar title="Loading Zone..." />
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <div className="w-10 h-10 border-[3px] border-slate-200 border-t-accent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium text-sm tracking-wide">Finding Vendors...</p>
        </div>
      </ZoneUserLayout>
    );
  }

  if (error) {
    return (
      <ZoneUserLayout>
        <ZoneUserNavbar title="No shop Avaliable" />
        <div className="flex flex-col items-center justify-center h-[60vh] p-6 text-center">
          <h2 className="text-xl font-bold text-slate-800 mb-2">Oops!!!!</h2>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </ZoneUserLayout>
    );
  }

  return (
    <ZoneUserLayout>
      {/* Set a clean light background for the whole screen */}
      <div className="min-h-screen bg-slate-50 pb-12">
        <ZoneUserNavbar title={zone?.name || "Food Zone"} />

        <div className="max-w-md mx-auto p-5">
          
          {/* Welcome Section */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.4 }}
            className="text-center mb-8 pt-2"
          >
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
              Welcome to {zone?.name}
            </h1>
            <p className="text-slate-500 text-sm font-medium px-2 leading-relaxed">
              {zone?.description || "Explore and choose from our curated selection of amazing food vendors."}
            </p>
          </motion.div>

          {/* Solid, Simple CTA Button removed as per request for no merged menu concept */}

          {shops.length > 0 ? (
            <div className="space-y-4">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 mb-4"
              >
                <h2 className="text-[13px] font-bold text-slate-400 uppercase tracking-widest pl-1">Browse by vendor</h2>
              </motion.div>

              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-5"
              >
                {shops.map((shop) => (
                  <motion.div
                    variants={cardVariants}
                    key={shop.id}
                    onClick={() => shop.isOpen && handleShopSelect(shop.id)}
                    className={`bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden relative transition-all duration-200 ${
                      shop.isOpen
                        ? 'cursor-pointer hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] hover:-translate-y-1'
                        : 'opacity-70 cursor-not-allowed'
                    }`}
                  >
                    <div className="relative">
                      {/* Shop Image */}
                      {shop.image ? (
                        <div className="w-full h-40 relative bg-slate-100">
                          <img
                            src={shop.image}
                            alt={`${shop.name} - ${shop.cuisine}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              if (e.target.parentElement) {
                                  e.target.parentElement.style.display = 'none';
                                  if (e.target.parentElement.nextElementSibling) {
                                      e.target.parentElement.nextElementSibling.style.display = 'flex';
                                  }
                              }
                            }}
                          />
                        </div>
                      ) : null}

                      {/* Clean Fallback */}
                      <div
                        className={`${shop.image ? 'hidden' : 'flex'} w-full h-40 bg-slate-50 flex-col items-center justify-center relative border-b border-slate-100`}
                        style={{ display: shop.image ? 'none' : 'flex' }}
                      >
                        <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-3">
                          <FaStore className="text-2xl text-accent" />
                        </div>
                        <p className="text-sm font-bold text-slate-800">{shop.name}</p>
                        <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wide">{shop.cuisine}</p>
                      </div>
                      
                      {/* Clean Closed State */}
                      {!shop.isOpen && (
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center z-20">
                          <div className="bg-white px-4 py-1.5 rounded-full shadow-sm border border-slate-200">
                            <span className="text-slate-800 font-bold text-xs tracking-wide uppercase">Currently Closed</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Minimalist Card Content */}
                    <div className="p-4 sm:p-5">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">{shop.name}</h3>
                          <p className="text-[13px] font-semibold text-accent mt-0.5">{shop.cuisine}</p>
                        </div>
                        {/* Rating Pill */}
                        <div className="bg-slate-50 flex items-center gap-1 px-2 py-1 rounded-md border border-slate-100">
                          <FaStar className="text-yellow-400 text-[10px]" />
                          <span className="text-xs font-bold text-slate-700">{shop.rating}</span>
                        </div>
                      </div>

                      <p className="text-[13px] text-slate-500 mt-2 mb-4 line-clamp-2 leading-relaxed">
                        {shop.description}
                      </p>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-100">
                          <FaClock className="text-slate-400 text-[10px]" />
                          <span className="text-[11px] font-semibold text-slate-600 tracking-wide">{shop.deliveryTime}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-100">
                          <FaMapMarkerAlt className="text-slate-400 text-[10px]" />
                          <span className="text-[11px] font-semibold text-slate-600 tracking-wide">{shop.distance}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-slate-100 shadow-sm"
            >
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <FaStore className="text-slate-300 text-2xl" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 mb-1">No Vendors Available</h2>
              <p className="text-slate-500 text-sm mb-4 px-6">
                This food zone doesn't have any active vendors yet. Please check back later.
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </ZoneUserLayout>
  );
};

export default ZoneShopSelectionScreen;