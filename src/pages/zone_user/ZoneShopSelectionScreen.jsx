import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaStar, FaClock, FaMapMarkerAlt, FaStore, FaExclamationTriangle } from 'react-icons/fa';
import ZoneUserLayout from './ZoneUserLayout';
import ZoneUserNavbar from './ZoneUserNavbar';
import LocalStorageService from '../../services/LocalStorageService';
import { generateShopUrl, generateZoneUrl } from '../../utils/urlUtils';


const ZoneShopSelectionScreen = () => {
  const { zoneId, tableId, userId } = useParams();
  const navigate = useNavigate();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zone, setZone] = useState(null);
  const [error, setError] = useState(null);



  useEffect(() => {
    const fetchZoneAndVendors = async () => {
      try {
        setLoading(true);

        const zoneData = LocalStorageService.getZoneById(zoneId);
        if (!zoneData) {
          throw new Error('Zone not found');
        }
        setZone(zoneData);

        const vendors = LocalStorageService.getZoneVendors(zoneId);

        if (!vendors || vendors.length === 0) {
          setError('No shops available in this zone. Please try again later.');
          setShops([]);
          setLoading(false);
          return;
        }

        const activeVendors = vendors
          .filter(vendor => vendor.status === 'active' || !vendor.status)
          .map(vendor => ({
            id: vendor.id,
            name: vendor.name,
            cuisine: vendor.cuisine || 'Various',
            rating: vendor.rating || 4.5,
            deliveryTime: '10-15 min',
            image: vendor.logo || '/api/placeholder/300/200',
            description: vendor.description || 'Delicious food available',
            isOpen: true,
            distance: 'In zone'
          }));

        if (activeVendors.length === 0) {
          setError('No active shops available in this zone. Please try again later.');
        }

        setShops(activeVendors);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching zone data:', error);
        setError(error.message);
        setLoading(false);
      }
    };

    fetchZoneAndVendors();
  }, [zoneId]);

  const handleShopSelect = (shopId) => {
    navigate(generateShopUrl(zoneId, tableId, userId, shopId, 'menu'));
  };

  const handleViewAllMenu = () => {
    navigate(generateZoneUrl(zoneId, tableId, userId, 'menu'));
  };



  if (loading) {
    return (
      <ZoneUserLayout>
        <ZoneUserNavbar title="Loading Zone..." />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        </div>
      </ZoneUserLayout>
    );
  }

  if (error) {
    return (
      <ZoneUserLayout>
        <ZoneUserNavbar title="Error" />
        <div className="flex flex-col items-center justify-center h-64 p-4 text-center">
          <FaExclamationTriangle className="text-red-500 text-4xl mb-4" />
          <h2 className="text-xl font-fredoka text-primary-bg mb-2">Something went wrong</h2>
          <p className="text-placeholder-subtext font-raleway mb-6">{error}</p>


        </div>
      </ZoneUserLayout>
    );
  }

  return (
    <ZoneUserLayout>
      <ZoneUserNavbar title={zone?.name || "Food Zone"} />

      <div className="max-w-md mx-auto p-4">
        {/* Welcome Section */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-fredoka text-primary-bg mb-2">Welcome to {zone?.name}</h1>
          <p className="text-placeholder-subtext font-raleway">
            {zone?.description || "Choose from our amazing food vendors"}
          </p>
        </div>

        {shops.length > 0 ? (
          <>
            {/* View All Menu Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleViewAllMenu}
              className="w-full bg-accent text-white py-4 rounded-xl font-raleway font-bold text-lg mb-6 shadow-lg hover:bg-hover-shade transition-colors duration-300"
            >
              🍽️ View All Menus Together
            </motion.button>

            {/* Shop List */}
            <div className="space-y-4">
              <h2 className="text-lg font-fredoka text-primary-bg mb-4">Or browse by vendor:</h2>

              {shops.map((shop, index) => (
                <motion.div
                  key={shop.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  onClick={() => shop.isOpen && handleShopSelect(shop.id)}
                  className={`bg-white rounded-xl shadow-md overflow-hidden cursor-pointer transition-all duration-300 ${shop.isOpen
                    ? 'hover:shadow-lg hover:scale-[1.02]'
                    : 'opacity-60 cursor-not-allowed'
                    }`}
                >
                  <div className="relative">
                    <img
                      src={shop.image}
                      alt={shop.name}
                      className="w-full h-32 object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5Gb29kIFZlbmRvcjwvdGV4dD48L3N2Zz4=';
                      }}
                    />
                    {!shop.isOpen && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <span className="text-white font-bold">Currently Closed</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-white rounded-full px-2 py-1 flex items-center">
                      <FaStar className="text-yellow-500 text-xs mr-1" />
                      <span className="text-xs font-bold">{shop.rating}</span>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-fredoka text-primary-bg">{shop.name}</h3>
                        <p className="text-sm text-placeholder-subtext">{shop.cuisine}</p>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{shop.description}</p>

                    <div className="flex items-center justify-between text-xs text-placeholder-subtext">
                      <div className="flex items-center">
                        <FaClock className="mr-1" />
                        <span>{shop.deliveryTime}</span>
                      </div>
                      <div className="flex items-center">
                        <FaMapMarkerAlt className="mr-1" />
                        <span>{shop.distance}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FaStore className="text-accent text-5xl mb-4 opacity-50" />
            <h2 className="text-xl font-fredoka text-primary-bg mb-2">No Vendors Available</h2>
            <p className="text-placeholder-subtext font-raleway mb-6">
              This food zone doesn't have any active vendors yet.
            </p>



            <p className="text-xs text-gray-500 max-w-xs">
              Zone ID: {zoneId} • Table: {tableId}
            </p>
          </div>
        )}
      </div>
    </ZoneUserLayout>
  );
};

export default ZoneShopSelectionScreen;
