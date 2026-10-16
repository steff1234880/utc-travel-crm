import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { Plus, Trash2, FileText, Save, ArrowLeft } from 'lucide-react';

const QuotationBuilder = () => {
  const { id, quoteId } = useParams(); const leadId = id;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!quoteId);
  
  const [formData, setFormData] = useState({
    validityDate: '',
    destination: '',
    travelDates: '',
    duration: '',
    basePrice: 0,
    discounts: 0,
    taxes: 0, // Legacy, kept for backwards compatibility but we use backend calculations
    gstApplicable: true,
    gstType: 'GST',
    gstRate: 5, // Default 5%
    isInclusive: false,
    isInterState: false,
    placeOfSupply: '',
    items: [{ title: '', quantity: 1, unitPrice: 0 }]
  });

  useEffect(() => {
    if (quoteId) {
      fetchQuote();
    }
  }, [quoteId]);

  const fetchQuote = async () => {
    try {
      const { data } = await api.get(`/crm/quotations/${quoteId}`);
      const q = data.data;
      setFormData({
        validityDate: new Date(q.validityDate).toISOString().split('T')[0],
        destination: q.destination || '',
        travelDates: q.travelDates || '',
        duration: q.duration || '',
        basePrice: q.basePrice || 0,
        discounts: q.discounts || 0,
        taxes: q.taxes || 0,
        gstApplicable: q.gstApplicable ?? true,
        gstType: q.gstType || 'GST',
        gstRate: q.gstRate || 5,
        isInclusive: q.isInclusive ?? false,
        isInterState: q.isInterState ?? false,
        placeOfSupply: q.placeOfSupply || '',
        items: q.items?.length ? q.items.map((i: any) => ({
          title: i.title,
          description: i.description || '',
          quantity: i.quantity,
          unitPrice: i.unitPrice
        })) : [{ title: '', quantity: 1, unitPrice: 0 }]
      });
    } catch (error) {
      console.error('Failed to fetch quotation', error);
      alert('Failed to fetch existing quotation data.');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { title: '', quantity: 1, unitPrice: 0 }]
    });
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const calculateSubTotal = () => {
    const itemsTotal = formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    return Number(formData.basePrice) + itemsTotal + Number(formData.taxes) - Number(formData.discounts);
  };

  const calculateTotal = () => {
    const subTotal = calculateSubTotal();
    let taxAmount = 0;
    if (formData.gstApplicable && formData.gstType === 'GST' && !formData.isInclusive) {
       taxAmount = (subTotal * formData.gstRate) / 100;
    }
    return subTotal + taxAmount;
  };

  const calculateTaxPreview = () => {
    const subTotal = calculateSubTotal();
    if (!formData.gstApplicable || formData.gstType === 'EXEMPT') return 0;
    if (formData.isInclusive) {
      return subTotal - (subTotal / (1 + formData.gstRate / 100));
    }
    return (subTotal * formData.gstRate) / 100;
  };

  const handleSave = async () => {
    if (!leadId) return alert('Lead ID is missing');
    setLoading(true);
    try {
      // First get the lead to get customerId
      const leadRes = await api.get(`/crm/leads/${leadId}`);
      const customerId = leadRes.data.data.customerId;

      if (quoteId) {
        await api.put(`/crm/quotations/${quoteId}`, {
          salesLeadId: leadId,
          customerId,
          ...formData
        });
        alert('Quotation Updated!');
      } else {
        await api.post('/crm/quotations', {
          salesLeadId: leadId,
          customerId,
          ...formData
        });
        alert('Quotation Created!');
      }
      navigate(`/admin/crm/leads/${leadId}`);
    } catch (error: any) {
      console.error('Failed to save quotation', error);
      alert(error.response?.data?.error || 'Failed to save quotation');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) return <div className="p-8 text-center text-gray-500">Loading quotation...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(`/admin/crm/leads/${leadId}`)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" /> {quoteId ? 'Edit Quotation' : 'Build Quotation'}
          </h1>
        </div>
        <button 
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> Save Quotation
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">General Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Validity Date</label>
            <input 
              type="date"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.validityDate}
              onChange={(e) => setFormData({...formData, validityDate: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
            <input 
              type="text"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. Maldives"
              value={formData.destination}
              onChange={(e) => setFormData({...formData, destination: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Travel Dates</label>
            <input 
              type="text"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. Dec 10 - Dec 17, 2026"
              value={formData.travelDates}
              onChange={(e) => setFormData({...formData, travelDates: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
            <input 
              type="text"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. 7 Days / 6 Nights"
              value={formData.duration}
              onChange={(e) => setFormData({...formData, duration: e.target.value})}
            />
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Pricing Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base Price (₹)</label>
            <input 
              type="number"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.basePrice}
              onChange={(e) => setFormData({...formData, basePrice: Number(e.target.value)})}
            />
          </div>
        </div>
      </div>

      {/* Tax Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Tax & GST Settings</h2>
        
        <div className="flex items-center space-x-6 mb-6">
          <label className="flex items-center space-x-2 text-sm font-medium text-slate-700">
            <input 
              type="checkbox" 
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              checked={formData.gstApplicable}
              onChange={(e) => setFormData({...formData, gstApplicable: e.target.checked})}
            />
            <span>Apply Tax / GST</span>
          </label>
        </div>

        {formData.gstApplicable && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tax Type</label>
              <select
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.gstType}
                onChange={(e) => setFormData({...formData, gstType: e.target.value})}
              >
                <option value="GST">GST (Standard)</option>
                <option value="NON_GST">Non-GST</option>
                <option value="EXEMPT">Exempted</option>
              </select>
            </div>

            {formData.gstType === 'GST' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">GST Rate (%)</label>
                  <input 
                    type="number"
                    step="0.1"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.gstRate}
                    onChange={(e) => setFormData({...formData, gstRate: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tax Mode</label>
                  <select
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.isInclusive ? "INCLUSIVE" : "EXCLUSIVE"}
                    onChange={(e) => setFormData({...formData, isInclusive: e.target.value === "INCLUSIVE"})}
                  >
                    <option value="EXCLUSIVE">Exclusive (Added to Subtotal)</option>
                    <option value="INCLUSIVE">Inclusive (Included in Base Price)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Inter-State Transaction (IGST)</label>
                  <label className="flex items-center space-x-2 mt-2 text-sm text-slate-600">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={formData.isInterState}
                      onChange={(e) => setFormData({...formData, isInterState: e.target.checked})}
                    />
                    <span>Apply IGST instead of CGST/SGST</span>
                  </label>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900">Line Items</h2>
          <button onClick={addItem} className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm font-medium">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
        
        <div className="space-y-4">
          {formData.items.map((item, index) => (
            <div key={index} className="flex gap-4 items-end bg-gray-50 p-4 rounded-lg">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                <input 
                  type="text"
                  placeholder="e.g. Flight Tickets"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
                  value={item.title}
                  onChange={(e) => handleItemChange(index, 'title', e.target.value)}
                />
              </div>
              <div className="w-24">
                <label className="block text-xs font-medium text-gray-500 mb-1">Qty</label>
                <input 
                  type="number"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                />
              </div>
              <div className="w-32">
                <label className="block text-xs font-medium text-gray-500 mb-1">Unit Price</label>
                <input 
                  type="number"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
                  value={item.unitPrice}
                  onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                />
              </div>
              <button 
                onClick={() => removeItem(index)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-md mb-[2px]"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Totals</h2>
        <div className="space-y-3 max-w-sm ml-auto">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Subtotal Items:</span>
            <span className="font-medium">₹{formData.items.reduce((s, i) => s + (i.quantity * i.unitPrice), 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Other Adjustments:</span>
            <input 
              type="number" 
              className="w-24 px-2 py-1 border border-gray-200 rounded text-right"
              value={formData.taxes}
              onChange={(e) => setFormData({...formData, taxes: Number(e.target.value)})}
            />
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Discounts:</span>
            <input 
              type="number" 
              className="w-24 px-2 py-1 border border-gray-200 rounded text-right text-red-500"
              value={formData.discounts}
              onChange={(e) => setFormData({...formData, discounts: Number(e.target.value)})}
            />
          </div>
          <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
            <span className="font-bold text-gray-900">Total Amount:</span>
            <span className="text-xl font-bold text-blue-600">₹{calculateTotal().toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
          </div>
          {formData.gstApplicable && formData.gstType === 'GST' && (
            <div className="text-xs text-slate-500 text-right mt-1">
              Includes {formData.isInterState ? 'IGST' : 'CGST + SGST'} of ₹{calculateTaxPreview().toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuotationBuilder;
