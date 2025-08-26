import React from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import UserNavbar from './UserNavbar';

const UserLayout = ({ children }) => {
  const { restaurantId: paramRestaurantId, tableNumber: paramTableNumber } = useParams();

  // Ensure parameters are always strings
  const restaurantId = String(paramRestaurantId || '');
  const tableNumber = String(paramTableNumber || '');

  return (
    <div className="min-h-screen bg-primary">
      <UserNavbar restaurantId={restaurantId} tableNumber={tableNumber} />
      
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="pt-16"
      >
        {children}
      </motion.main>
    </div>
  );
};

export default UserLayout;