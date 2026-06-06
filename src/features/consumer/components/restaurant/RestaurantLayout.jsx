import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import RestaurantNavbar from './RestaurantNavbar';

const RestaurantLayout = () => {
  // Grab the current location to use as a key for route transitions
  const location = useLocation();

  return (
    <div className="relative min-h-[100dvh] bg-slate-50 flex flex-col font-sans selection:bg-accent/20 z-0">
      {/* Subtle top gradient for a premium "illuminated" native app feel */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-slate-200/50 to-transparent -z-10 pointer-events-none" />

      <RestaurantNavbar />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {/* AnimatePresence allows components to animate OUT before the new route mounts */}
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname} // This tells Framer Motion the route changed
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ 
              duration: 0.35, 
              ease: [0.22, 1, 0.36, 1] // Custom cubic-bezier for a snappy, Apple-like easing
            }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default RestaurantLayout;