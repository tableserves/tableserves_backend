import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { upgradePlan } from '../../store/slices/subscriptionSlice';
import { RESTAURANT_PLANS, ZONE_PLANS } from '../../constants/plans';

export default function UpgradeModal({ planType = 'restaurant', onClose }) {
  const dispatch = useDispatch();
  const [selected, setSelected] = useState('medium');

  const plans = planType === 'zone' ? ZONE_PLANS : RESTAURANT_PLANS;

  const handleUpgrade = () => {
    dispatch(upgradePlan({ planKey: selected, planType }));
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-lg p-4">
        <h2 className="text-lg font-fredoka mb-3">Upgrade Plan</h2>
        <div className="space-y-2 mb-4">
          {Object.values(plans).map((p) => (
            <label key={p.key} className="flex items-center justify-between p-2 border rounded cursor-pointer">
              <div>
                <div className="font-raleway font-semibold">{p.label}</div>
                <div className="text-xs text-gray-500">
                  {p.planType === 'restaurant' ? `Max Tables: ${p.maxTables}` : `Max Tables: ${p.maxTables ?? 'Custom'}, Max Vendors: ${p.maxVendors ?? 'Custom'}`}
                </div>
              </div>
              <input type="radio" name="plan" value={p.key} checked={selected === p.key} onChange={() => setSelected(p.key)} />
            </label>
          ))}
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-2 text-sm border rounded">Cancel</button>
          <button onClick={handleUpgrade} className="px-3 py-2 text-sm bg-accent text-white rounded">Upgrade</button>
        </div>
      </div>
    </div>
  );
}

