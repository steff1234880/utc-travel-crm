import React from 'react';
import { FileText, Trash2 } from 'lucide-react';

interface PaymentTableProps {
  transactions: any[];
  onViewReceipt: (payment: any) => void;
  onEditTransaction?: (tx: any) => void;
  onDeleteTransaction?: (tx: any) => void;
}

export default function PaymentTable({ transactions, onViewReceipt, onEditTransaction, onDeleteTransaction }: PaymentTableProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
  };

  const formatPaymentType = (type?: string) => {
    if (!type) return 'Payment';
    switch (type.toUpperCase()) {
      case 'ADVANCE': return 'Advance';
      case 'PARTIAL': return 'Partial';
      case 'FINAL': return 'Final';
      case 'INCENTIVE': return 'Incentive';
      case 'COMMISSION': return 'Commission';
      case 'OTHER': return 'Other';
      default: return type;
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider font-semibold text-slate-500">
            <th className="p-4">Reference</th>
            <th className="p-4">Customer</th>
            <th className="p-4">Type</th>
            <th className="p-4">Amount</th>
            <th className="p-4">Status</th>
            <th className="p-4">Date</th>
            <th className="p-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {transactions.length === 0 ? (
            <tr>
              <td colSpan={7} className="p-8 text-center text-slate-500">
                No payments found matching the selected criteria.
              </td>
            </tr>
          ) : (
            transactions.map((tx: any) => {
              const customer = tx.customerPayment?.customer || tx.refund?.customer;
              const isRefund = tx.type === 'REFUND';
              return (
                <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <span className="font-medium text-slate-900">{tx.referenceNumber}</span>
                  </td>
                  <td className="p-4">
                    {customer ? (
                      <div>
                        <p className="font-medium text-slate-900">{customer.firstName} {customer.lastName}</p>
                        <p className="text-xs text-slate-500">{customer.email}</p>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Unknown</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      isRefund ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {isRefund ? 'Refund' : formatPaymentType(tx.customerPayment?.paymentType)}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-slate-900">
                    {formatCurrency(tx.amount)}
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      tx.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                      tx.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600 text-sm">
                    {new Date(tx.date).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => onViewReceipt(tx)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center text-xs font-semibold"
                        title="View Receipt"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1" />
                        Receipt
                      </button>
                      {onEditTransaction && !isRefund && (
                        <button 
                          onClick={() => onEditTransaction(tx)}
                          className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors inline-flex items-center text-xs font-semibold"
                          title="Edit Transaction"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1" />
                          Edit
                        </button>
                      )}
                      {onDeleteTransaction && (
                        <button 
                          onClick={() => onDeleteTransaction(tx)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center text-xs font-semibold"
                          title="Delete Transaction"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
