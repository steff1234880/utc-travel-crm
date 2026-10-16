import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Loader2, Eye, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../../services/api';
import ExpenseFormModal from './components/ExpenseFormModal';
import { useAuth } from '../../../context/AuthContext';

export default function ExpenseManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialStatus = queryParams.get('status') || 'all';

  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [search, setSearch] = useState('');
  
  const { hasPermission } = useAuth();
  const canDelete = hasPermission('expenses:delete');

  useEffect(() => {
    fetchExpenses();
  }, [statusFilter]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/accounting/expenses?status=${statusFilter}`);
      setExpenses(res.data.data);
    } catch (error) {
      console.error('Failed to fetch expenses', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      if (!window.confirm(`Are you sure you want to change status to ${newStatus}?`)) return;
      await api.patch(`/accounting/expenses/${id}/status`, { status: newStatus });
      fetchExpenses();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update status');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await api.delete(`/accounting/expenses/${id}`);
      fetchExpenses();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete expense');
    }
  };

  const openEdit = (expense: any) => {
    if (expense.status === 'PAID') {
      alert('Cannot edit a paid expense');
      return;
    }
    setEditingExpense(expense);
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingExpense(null);
    setShowModal(true);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
  };

  const getStatusBadge = (status: string) => {
    const map: any = {
      DRAFT: 'bg-slate-100 text-slate-700',
      SUBMITTED: 'bg-amber-100 text-amber-700',
      APPROVED: 'bg-indigo-100 text-indigo-700',
      PAID: 'bg-emerald-100 text-emerald-700',
      REJECTED: 'bg-red-100 text-red-700',
      CANCELLED: 'bg-slate-100 text-slate-500 line-through'
    };
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${map[status] || map.DRAFT}`}>{status}</span>;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Expenses</h1>
          <p className="text-slate-500 mt-1">Manage vendor payments, overheads, and reimbursements</p>
        </div>
        <div className="flex gap-3">
          <button 
             onClick={() => navigate('/admin/accounting/expenses/dashboard')}
             className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium"
          >
            Dashboard
          </button>
          <button 
            onClick={openCreate}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Expense
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex gap-2">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Pending Approval</option>
              <option value="APPROVED">Approved (Unpaid)</option>
              <option value="PAID">Paid</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <input 
               type="text"
               placeholder="Search expenses..."
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="w-full sm:w-64 pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
             />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                  <th className="p-4">Expense Ref</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Title & Vendor</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.filter(e => !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.expenseNumber.toLowerCase().includes(search.toLowerCase())).map(expense => (
                  <tr key={expense.id} className="hover:bg-slate-50">
                    <td className="p-4 text-sm font-medium text-slate-900">{expense.expenseNumber}</td>
                    <td className="p-4 text-sm text-slate-600">{new Date(expense.expenseDate).toLocaleDateString()}</td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-slate-900">{expense.title}</div>
                      <div className="text-xs text-slate-500">{expense.vendorName || 'No vendor'}</div>
                    </td>
                    <td className="p-4 text-sm text-slate-600">{expense.category?.name}</td>
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{formatCurrency(expense.totalAmount)}</div>
                      {expense.gstApplicable && expense.gstType === 'GST' && (
                        <div className="text-xs text-slate-500">Includes {formatCurrency(expense.totalTaxAmount)} GST</div>
                      )}
                    </td>
                    <td className="p-4">{getStatusBadge(expense.status)}</td>
                    <td className="p-4 text-right space-x-2">
                      {expense.status !== 'PAID' && expense.status !== 'CANCELLED' && (
                        <button onClick={() => openEdit(expense)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      
                      {expense.status === 'SUBMITTED' && (
                         <>
                           <button onClick={() => handleStatusChange(expense.id, 'APPROVED')} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded" title="Approve">
                             <CheckCircle className="w-4 h-4" />
                           </button>
                           <button onClick={() => handleStatusChange(expense.id, 'REJECTED')} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Reject">
                             <XCircle className="w-4 h-4" />
                           </button>
                         </>
                      )}
                      {expense.status === 'APPROVED' && (
                         <button onClick={() => handleStatusChange(expense.id, 'PAID')} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded border border-emerald-200" title="Mark as Paid">
                           Pay
                         </button>
                      )}
                      {expense.status === 'DRAFT' && (
                         <button onClick={() => handleStatusChange(expense.id, 'SUBMITTED')} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded border border-amber-200" title="Submit">
                           Submit
                         </button>
                      )}
                      {canDelete && (
                         <button onClick={() => handleDeleteExpense(expense.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Delete">
                           <Trash2 className="w-4 h-4" />
                         </button>
                      )}
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-500">No expenses found matching the filters</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <ExpenseFormModal 
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); fetchExpenses(); }}
          initialData={editingExpense}
        />
      )}
    </div>
  );
}
