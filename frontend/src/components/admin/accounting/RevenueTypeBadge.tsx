import React from 'react';

type RevenueType = 'PACKAGE' | 'CUSTOMIZED_TOUR' | 'BOOKING_SERVICE' | 'OTHER_SERVICE';

interface RevenueTypeBadgeProps {
  type: string;
}

export const RevenueTypeBadge: React.FC<RevenueTypeBadgeProps> = ({ type }) => {
  const getStyle = (t: string) => {
    switch (t) {
      case 'PACKAGE': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CUSTOMIZED_TOUR': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'BOOKING_SERVICE': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'OTHER_SERVICE': return 'bg-slate-100 text-slate-800 border-slate-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getLabel = (t: string) => {
    return t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getStyle(type)}`}>
      {getLabel(type)}
    </span>
  );
};
