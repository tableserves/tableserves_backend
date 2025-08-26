import React from 'react';
import { motion } from 'framer-motion';
import { FaUsers, FaTable } from 'react-icons/fa';

function getZoneSubscription() {
  try {
    const raw = localStorage.getItem('tableserve_subscription');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function QuotaBanner({ zoneId, currentCount = 0, type = 'vendors' }) {
  const sub = getZoneSubscription();
  const max = type === 'vendors' ? sub?.maxVendors : sub?.maxTables;
  const remaining = max == null ? null : Math.max(0, max - currentCount);

  const Icon = type === 'vendors' ? FaUsers : FaTable;
  const label = type === 'vendors' ? 'Vendors' : 'Tables';

  return (
    <motion.div
      initial={{ scale: 0.98 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="flex items-center admin-card rounded-xl p-4 justify-between"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
          <Icon className="text-accent" />
        </div>
        <div>
          <p className="font-raleway text-sm text-theme-text-secondary">Plan Quota</p>
          {max == null ? (
            <p className="font-fredoka text-theme-text-primary">Custom limit</p>
          ) : (
            <p className="font-fredoka text-theme-text-primary">{currentCount} used of {max}</p>
          )}
        </div>
      </div>
      {max != null && (
        <motion.div
          initial={{ y: -2, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-sm font-raleway ml-5 text-accent"
        >
          {remaining} {label.toLowerCase()} pending
        </motion.div>
      )}
    </motion.div>
  );
}

