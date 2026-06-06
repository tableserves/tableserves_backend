import React from 'react';

const Bar = ({ used, max, label }) => {
  const pct = max ? Math.min(100, Math.round((used / max) * 100)) : 0;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{label}</span>
        <span>
          {max == null ? `${used} used` : `${used} of ${max}`}
        </span>
      </div>
      {max != null && (
        <div className="h-2 bg-gray-200 rounded">
          <div className="h-2 bg-accent rounded" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
};

export default function PlanUsageIndicator({ tablesUsed = 0, tablesMax, vendorsUsed = 0, vendorsMax }) {
  return (
    <div className="p-3 bg-white rounded-lg border border-gray-200">
      <Bar used={tablesUsed} max={tablesMax} label="Tables" />
      {vendorsMax !== undefined && (
        <Bar used={vendorsUsed} max={vendorsMax} label="Vendors" />
      )}
    </div>
  );
}

