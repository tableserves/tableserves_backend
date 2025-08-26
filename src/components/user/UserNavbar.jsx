import React, { useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaShoppingCart, FaTable, FaUser } from 'react-icons/fa';
import { CartContext } from '../../context/CartContext';

const UserNavbar = ({ restaurantId: propRestaurantId, tableNumber: propTableNumber }) => {
  const navigate = useNavigate();
  const params = useParams();
  const cartContext = useContext(CartContext);
  const cartItemCount = cartContext ? cartContext.cartItemCount : 0;

  // Ensure restaurantId and tableNumber are always strings
  const restaurantId = String(propRestaurantId || '');
  const tableNumber = String(propTableNumber || '');

  // Handle cart navigation
  const handleCartClick = () => {
    const { restaurantId: urlRestaurantId, tableId, userId, zoneId, shopId } = params;
    
    let cartRoute;
    if (zoneId && tableId && userId) {
      cartRoute = `/tableserve/zone/${zoneId}/table/${tableId}/user/${userId}/cart`;
    } else if (zoneId && tableId) {
      cartRoute = `/tableserve/zone/${zoneId}/table/${tableId}/cart`;
    } else if (urlRestaurantId && tableId && userId) {
      cartRoute = `/tableserve/restaurant/${urlRestaurantId}/table/${tableId}/user/${userId}/cart`;
    } else if (urlRestaurantId && tableId) {
      cartRoute = `/tableserve/restaurant/${urlRestaurantId}/table/${tableId}/cart`;
    } else if (restaurantId && tableNumber) {
      // Fallback using props
      cartRoute = `/tableserve/restaurant/${restaurantId}/table/${tableNumber}/cart`;
    } else {
      cartRoute = '/tableserve';
    }
    
    console.log('🛒 UserNavbar - Navigating to cart:', cartRoute);
    navigate(cartRoute);
  };

  return (
    <motion.nav
      initial={{ y: -50 }}
      animate={{ y: 0 }}
      className="bg-white"
    >
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-fredoka text-accent">TableServe</h1>
          <div className="flex items-center space-x-2 text-white/70">
            <FaTable className="w-4 h-4" />
            {/* <span className="font-raleway text-sm">Table {tableNumber}</span> */}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={handleCartClick}
            className="relative bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <FaShoppingCart className="w-4 h-4" />
            <span className="font-raleway">Cart</span>
            {cartItemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </button>

          {/* {isAuthenticated && ( */}
            {/* <button
              onClick={() => {
                if (restaurantId) {
                  navigate(`/tableserve/restaurant/${restaurantId}/table/${tableNumber}/user/${user.id}/profile`);
                }
                else {
                  const zoneId = window.location.pathname.split('/')[3];
                  navigate(`/tableserve/zone/${zoneId}/table/${tableNumber}/user/${user.id}/profile`);
                }
              }}
              className="relative bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <FaUser className="w-4 h-4" />
              <span className="font-raleway">Profile</span>
            </button> */}
          {/* )} */}
        </div>
      </div>
    </motion.nav>
  );
};

export default UserNavbar;