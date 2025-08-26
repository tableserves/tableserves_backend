import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaBars, FaSignOutAlt, FaUser } from 'react-icons/fa';
import { logout } from '../../store/slices/uiSlice';

const OwnerNavbar = ({ sidebarOpen, setSidebarOpen }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.ui.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 bg-white/10 backdrop-blur-lg border-b border-white/20 z-50"
    >
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-white hover:text-accent transition-colors"
          >
            <FaBars size={20} />
          </button>
          
          <div className="text-xl font-fredoka text-accent">
            TableServe Owner
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* User info */}
          <div className="flex items-center space-x-2 text-white">
            <FaUser className="text-accent" />
            <span className="font-raleway">{user?.name || 'Restaurant Owner'}</span>
          </div>

          {/* Logout button */}
          <motion.button
            onClick={handleLogout}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center space-x-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg transition-colors font-raleway"
          >
            <FaSignOutAlt />
            <span>Logout</span>
          </motion.button>
        </div>
      </div>
    </motion.nav>
  );
};

export default OwnerNavbar;
