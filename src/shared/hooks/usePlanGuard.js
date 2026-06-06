import { useSelector } from 'react-redux';

// Simple guard hook to enforce plan limits/features on the client
export default function usePlanGuard() {
  const subscription = useSelector((s) => s.subscription.current);

  const withinTableLimit = (currentTablesCount) => {
    if (!subscription) return true; // allow until fetched
    const max = subscription.maxTables;
    if (max == null) return true; // custom/unlimited
    return currentTablesCount < max; // allow adding only if strictly less
  };

  const withinVendorLimit = (currentVendorsCount) => {
    if (!subscription || subscription.planType !== 'zone') return true;
    const max = subscription.maxVendors;
    if (max == null) return true;
    return currentVendorsCount < max;
  };

  const hasFeature = (key) => !!subscription?.features?.[key];

  return {
    subscription,
    withinTableLimit,
    withinVendorLimit,
    hasFeature,
  };
}

