import React from 'react';
import SingleRestaurantLayout from './SingleRestaurantLayout';
import UpgradeTab from '../subscription/UpgradeTab';

const SingleRestaurantUpgrade = () => {
  return (
    <SingleRestaurantLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-fredoka text-gray-900 dark:text-white mb-2">
            Upgrade Your Plan
          </h1>
          <p className="text-gray-600 dark:text-gray-300 font-raleway text-sm sm:text-base">
            Choose the perfect plan for your restaurant
          </p>
        </div>
        
        <UpgradeTab />
      </div>
    </SingleRestaurantLayout>
  );
};

export default SingleRestaurantUpgrade;