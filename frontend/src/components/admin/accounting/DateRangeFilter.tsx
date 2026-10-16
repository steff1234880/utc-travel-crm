import React from 'react';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ startDate, endDate, onChange }) => {
  return (
    <div className="flex items-center space-x-2">
      <div>
        <input 
          type="date" 
          value={startDate} 
          onChange={(e) => onChange(e.target.value, endDate)}
          className="border border-slate-300 rounded-md shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
        />
      </div>
      <span className="text-slate-500">to</span>
      <div>
        <input 
          type="date" 
          value={endDate} 
          onChange={(e) => onChange(startDate, e.target.value)}
          className="border border-slate-300 rounded-md shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
        />
      </div>
    </div>
  );
};
