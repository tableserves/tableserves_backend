import React from 'react';
import ZoneAdminLayout from './ZoneAdminLayout';
import UpgradeTab from '../subscription/UpgradeTab';

const ZoneAdminUpgrade = () => {
  return (
    <ZoneAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-fredoka text-gray-900 dark:text-white mb-2">
            Upgrade Your Zone Plan
          </h1>
          <p className="text-gray-600 dark:text-gray-300 font-raleway text-sm sm:text-base">
            Choose the perfect plan for your food zone
          </p>
        </div>
        
        <UpgradeTab />
      </div>
    </ZoneAdminLayout>
  );
};

export default ZoneAdminUpgrade;