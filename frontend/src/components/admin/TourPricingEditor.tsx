import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface PricingTier {
  id: string;
  tierId: string;
  tierName: string;
  basePrice: number;
  adultPrice: number;
  child6to17: number;
  child2to5: number;
  infantPrice: number;
}

export default function TourPricingEditor() {
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PricingTier>>({});

  const fetchTiers = async () => {
    try {
      const res = await axios.get('/api/tour-pricing', { withCredentials: true });
      if (res.data.success) {
        setTiers(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load pricing tiers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTiers();
  }, []);

  const handleEdit = (tier: PricingTier) => {
    setEditingId(tier.id);
    setEditForm({ ...tier });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSave = async (id: string) => {
    try {
      const res = await axios.put('/api/tour-pricing/' + id, editForm, { withCredentials: true });
      if (res.data.success) {
        toast.success('Pricing updated successfully');
        setTiers(tiers.map(t => t.id === id ? { ...t, ...editForm } as PricingTier : t));
        setEditingId(null);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update pricing');
    }
  };

  if (loading) return <div>Loading pricing...</div>;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8">
      <h3 className="text-lg font-bold text-slate-900 mb-4">Global Tour Pricing (Group & Custom Tour Tiers)</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
            <tr>
              <th className="p-4">Package Format</th>
              <th className="p-4">Adult (18+)</th>
              <th className="p-4">Child (6-17)</th>
              <th className="p-4">Child (2-5)</th>
              <th className="p-4">Infant (0-2)</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tiers.map(tier => {
              const isEditing = editingId === tier.id;
              return (
                <tr key={tier.id} className="hover:bg-slate-50">
                  <td className="p-4 font-medium text-indigo-700">{tier.tierName}</td>
                  
                  <td className="p-4">
                    {isEditing ? (
                      <input type="number" className="w-24 px-2 py-1 border rounded" value={editForm.adultPrice || 0} onChange={e => setEditForm({...editForm, adultPrice: Number(e.target.value)})} />
                    ) : (
                      <span>?{tier.adultPrice.toLocaleString()}</span>
                    )}
                  </td>
                  
                  <td className="p-4">
                    {isEditing ? (
                      <input type="number" className="w-24 px-2 py-1 border rounded" value={editForm.child6to17 || 0} onChange={e => setEditForm({...editForm, child6to17: Number(e.target.value)})} />
                    ) : (
                      <span>?{tier.child6to17.toLocaleString()}</span>
                    )}
                  </td>
                  
                  <td className="p-4">
                    {isEditing ? (
                      <input type="number" className="w-24 px-2 py-1 border rounded" value={editForm.child2to5 || 0} onChange={e => setEditForm({...editForm, child2to5: Number(e.target.value)})} />
                    ) : (
                      <span>?{tier.child2to5.toLocaleString()}</span>
                    )}
                  </td>
                  
                  <td className="p-4">
                    {isEditing ? (
                      <input type="number" className="w-24 px-2 py-1 border rounded" value={editForm.infantPrice || 0} onChange={e => setEditForm({...editForm, infantPrice: Number(e.target.value)})} />
                    ) : (
                      <span>?{tier.infantPrice.toLocaleString()}</span>
                    )}
                  </td>
                  
                  <td className="p-4">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleSave(tier.id)} className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700">Save</button>
                        <button onClick={handleCancel} className="bg-slate-200 text-slate-700 px-3 py-1 rounded text-sm hover:bg-slate-300">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => handleEdit(tier)} className="text-indigo-600 hover:text-indigo-800 font-medium text-sm">Edit</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
