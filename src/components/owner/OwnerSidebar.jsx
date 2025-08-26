import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FaTachometerAlt, 
  FaUtensils, 
  FaShoppingCart, 
  FaTable, 
  FaChartBar, 
  FaCog 
} from 'react-icons/fa';

const OwnerSidebar = ({ isOpen }) => {
  const menuItems = [
    { path: '/owner', icon: FaTachometerAlt, label: 'Dashboard', exact: true },
    { path: '/owner/menu', icon: FaUtensils, label: 'Menu Management' },
    { path: '/owner/orders', icon: FaShoppingCart, label: 'Orders' },
    { path: '/owner/tables', icon: FaTable, label: 'Tables & QR' },
    { path: '/owner/analytics', icon: FaChartBar, label: 'Analytics' },
    { path: '/owner/settings', icon: FaCog, label: 'Settings' },
  ];

  return (
    <motion.aside
      initial={{ x: -250 }}
      animate={{ x: 0 }}
      className={`fixed left-0 top-16 h-full bg-white/5 backdrop-blur-lg border-r border-white/10 transition-all duration-300 z-40 ${
        isOpen ? 'w-64' : 'w-16'
      }`}
    >
      <div className="p-4">
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-accent text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {isOpen && (
                <span className="ml-3 font-raleway font-medium">
                  {item.label}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </motion.aside>
  );
};

export default OwnerSidebar;