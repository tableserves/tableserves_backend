import React from 'react';
import logo from '../../../../assets/logo.svg';

const BrandFooter = () => {
  return (
    <footer className="bg-primary border-t border-slate-800 py-4">
      <div className="max-w-3xl mx-auto px-2">
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <span className="text-white text-xs">Powered by</span>
          <img src={logo} alt="Tableserves" className="w-5 h-5" />
          <span className="text-accent text-sm font-semibold">Tableserves</span>
        </div>
        <div className="flex items-center justify-center">
          <span className="text-white text-[10px]">Made with ❤️ in India</span>
        </div>
      </div>
    </footer>
  );
};

export default BrandFooter;