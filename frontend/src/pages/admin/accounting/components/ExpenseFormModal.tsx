import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import api from '../../../../services/api';

export default function ExpenseFormModal({ onClose, onSuccess, initialData }: any) {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    categoryId: initialData?.categoryId || '',
    expenseDate: initialData ? new Date(initialData.expenseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    amount: initialData?.amount || 0,
    vendorName: initialData?.vendorName || '',
    vendorGstin: initialData?.vendorGstin || '',
    gstApplicable: initialData?.gstApplicable ?? false,
    gstType: initialData?.gstType || 'NON_GST',
    gstRate: initialData?.gstRate || 0,
    isInclusive: initialData?.isInclusive ?? false,
    isInterState: initialData?.isInterState ?? false,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/accounting/expenses/categories');
      setCategories(res.data.data.filter((c: any) => c.isActive));
      if (!initialData && res.data.data.length > 0) {
        setFormData(prev => ({ ...prev, categoryId: res.data.data[0].id }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setFetching(false);
    }
  };

  const calculatePreview = () => {
    if (!formData.gstApplicable || formData.gstType === 'EXEMPT' || formData.gstType === 'NON_GST') {
      return { total: formData.amount, tax: 0 };
    }
    
    let tax = 0;
    let total = formData.amount;
    
    if (formData.isInclusive) {
      const taxable = formData.amount / (1 + formData.gstRate / 100);
      tax = formData.amount - taxable;
    } else {
      tax = (formData.amount * formData.gstRate) / 100;
      total = formData.amount + tax;
    }
    
    return { total, tax };
  };

  const preview = calculatePreview();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (initialData) {
        await api.put(`/accounting/expenses/${initialData.id}`, formData);
      } else {
        await api.post('/accounting/expenses', formData);
      }
      onSuccess();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save expense');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl flex flex-col my-8">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{initialData ? 'Edit Expense' : 'Add Expense'}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {fetching ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : (
          <form id="expense-form" onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Expense Title <span className="text-red-500">*</span></label>
                <input 
                  type="text" required
                  placeholder="e.g. Monthly Office Internet"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expense Category <span className="text-red-500">*</span></label>
                <select 
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.categoryId}
                  onChange={e => setFormData({...formData, categoryId: e.target.value})}
                >
                  <option value="" disabled>Select Expense Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expense Date <span className="text-red-500">*</span></label>
                <input 
                  type="date" required
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.expenseDate}
                  onChange={e => setFormData({...formData, expenseDate: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vendor Name</label>
                <input 
                  type="text"
                  placeholder="Company Name"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.vendorName}
                  onChange={e => setFormData({...formData, vendorName: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vendor GSTIN</label>
                <input 
                  type="text"
                  placeholder="Optional"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase"
                  value={formData.vendorGstin}
                  onChange={e => setFormData({...formData, vendorGstin: e.target.value})}
                />
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Financials & GST</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Base Amount (₹) <span className="text-red-500">*</span></label>
                  <input 
                    type="number" required min="0" step="0.01"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold"
                    value={formData.amount || ''}
                    onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                  />
                </div>
                
                <div className="flex items-center pt-6">
                  <label className="flex items-center space-x-2 text-sm font-medium text-slate-700">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={formData.gstApplicable}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData({...formData, gstApplicable: checked, gstType: checked ? 'GST' : 'NON_GST'})
                      }}
                    />
                    <span>Apply GST</span>
                  </label>
                </div>
              </div>

              {formData.gstApplicable && formData.gstType === 'GST' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">GST Rate (%)</label>
                    <select
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                      value={formData.gstRate}
                      onChange={(e) => setFormData({...formData, gstRate: Number(e.target.value)})}
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tax Mode</label>
                    <select
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                      value={formData.isInclusive ? "INCLUSIVE" : "EXCLUSIVE"}
                      onChange={(e) => setFormData({...formData, isInclusive: e.target.value === "INCLUSIVE"})}
                    >
                      <option value="EXCLUSIVE">Exclusive (Added to Base)</option>
                      <option value="INCLUSIVE">Inclusive (Included in Base)</option>
                    </select>
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Inter-State</label>
                     <label className="flex items-center space-x-2 mt-2 text-sm text-slate-600">
                       <input 
                         type="checkbox" 
                         className="rounded"
                         checked={formData.isInterState}
                         onChange={(e) => setFormData({...formData, isInterState: e.target.checked})}
                       />
                       <span>Apply IGST</span>
                     </label>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 w-full sm:w-1/2 md:w-1/3">
                  <div className="flex justify-between text-sm text-slate-600 mb-1">
                    <span>Tax:</span>
                    <span>₹{preview.tax.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between font-bold text-blue-900 text-lg border-t border-blue-200 pt-2 mt-2">
                    <span>Total:</span>
                    <span>₹{preview.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
               <textarea 
                 rows={3}
                 className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                 value={formData.description}
                 onChange={e => setFormData({...formData, description: e.target.value})}
               ></textarea>
            </div>
          </form>
        )}
        
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3 rounded-b-2xl sticky bottom-0">
          <button 
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button 
            form="expense-form"
            type="submit"
            disabled={loading || fetching}
            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Expense
          </button>
        </div>
      </div>
    </div>
  );
}
