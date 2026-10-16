import React from 'react';
import { PieChart, BarChart2 } from 'lucide-react';

interface RevenueReportTableProps {
  data: any[];
  groupBy: 'package' | 'customer' | 'type';
  isLoading: boolean;
}

export const RevenueReportTable: React.FC<RevenueReportTableProps> = ({ data, groupBy, isLoading }) => {
  if (isLoading) {
    return <div className="py-8 text-center text-slate-500">Loading reports...</div>;
  }

  if (data.length === 0) {
    return <div className="py-8 text-center text-slate-500">No data available for the selected report.</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          {groupBy === 'package' && <BarChart2 className="w-4 h-4 text-primary" />}
          {groupBy === 'customer' && <PieChart className="w-4 h-4 text-emerald-600" />}
          {groupBy === 'type' && <PieChart className="w-4 h-4 text-purple-600" />}
          Revenue by {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                {groupBy === 'package' ? 'Package Title' : groupBy === 'customer' ? 'Customer Name' : 'Revenue Type'}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Total Revenue</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">
                  {groupBy === 'package' && row.packageTitle}
                  {groupBy === 'customer' && (
                    <div>
                      <div>{row.customerName}</div>
                      <div className="text-xs text-slate-500 font-normal">{row.email}</div>
                    </div>
                  )}
                  {groupBy === 'type' && row.revenueType}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-bold text-right">
                  ₹{row.totalRevenue.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
