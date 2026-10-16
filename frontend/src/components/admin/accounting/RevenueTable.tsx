import React from 'react';
import { RevenueTypeBadge } from './RevenueTypeBadge';
import { RevenueStatusBadge } from './RevenueStatusBadge';
import { Eye } from 'lucide-react';

interface RevenueRecord {
  id: string;
  referenceNumber: string;
  customer: { firstName: string; lastName?: string; email: string };
  package?: { title: string };
  amount: number;
  date: string;
  revenueType: string;
  paymentStatus: string;
  gstStatus: string;
  createdBy: { user: { email: string } };
}

interface RevenueTableProps {
  records: RevenueRecord[];
  isLoading: boolean;
  onViewDetails?: (id: string) => void;
}

export const RevenueTable: React.FC<RevenueTableProps> = ({ records, isLoading, onViewDetails }) => {
  if (isLoading) {
    return <div className="py-12 text-center text-slate-500">Loading revenues...</div>;
  }

  if (records.length === 0) {
    return <div className="py-12 text-center text-slate-500 border border-slate-200 rounded-lg bg-slate-50">No revenue records found.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Reference</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Customer</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Package / Details</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status / Type</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {records.map((record) => (
            <tr key={record.id} className="hover:bg-slate-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                {record.referenceNumber}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-slate-900">{record.customer.firstName} {record.customer.lastName}</div>
                <div className="text-sm text-slate-500">{record.customer.email}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                {record.package ? record.package.title : 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-bold text-slate-900">₹{record.amount.toLocaleString()}</div>
                <div className="text-xs text-slate-500">{record.gstStatus === 'GST_INCLUDED' ? 'GST Inc.' : 'Non-GST'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap space-y-1 flex flex-col items-start">
                <RevenueStatusBadge status={record.paymentStatus} />
                <div className="mt-1">
                  <RevenueTypeBadge type={record.revenueType} />
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                {new Date(record.date).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                {onViewDetails && (
                  <button 
                    onClick={() => onViewDetails(record.id)}
                    className="text-primary hover:text-blue-900 bg-blue-50 p-2 rounded-lg"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
