import React from 'react';

interface RevenueStatusBadgeProps {
  status: string;
}

export const RevenueStatusBadge: React.FC<RevenueStatusBadgeProps> = ({ status }) => {
  const getStyle = (s: string) => {
    switch (s.toUpperCase()) {
      case 'COMPLETED':
      case 'SUCCESS':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'PARTIAL':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'FAILED':
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'PENDING':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getStyle(status)}`}>
      {status}
    </span>
  );
};
