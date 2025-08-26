import React from 'react';
import { Outlet } from 'react-router-dom';

const ZoneUserLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-white text-black relative">
      {/* Main Content */}
      <main className="min-h-screen">
        {children || <Outlet />}
      </main>
    </div>
  );
};

export default ZoneUserLayout;
