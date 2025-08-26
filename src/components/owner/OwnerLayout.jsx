import React, { useState } from 'react';
import { motion } from 'framer-motion';
import OwnerSidebar from './OwnerSidebar';
import OwnerNavbar from './OwnerNavbar';

const OwnerLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-primary">
      <OwnerNavbar 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
      />
      
      <div className="flex">
        <OwnerSidebar isOpen={sidebarOpen} />
        
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`flex-1 transition-all duration-300 ${
            sidebarOpen ? 'ml-64' : 'ml-16'
          } pt-16`}
        >
          <div className="p-6">
            {children}
          </div>
        </motion.main>
      </div>
    </div>
  );
};

export default OwnerLayout;