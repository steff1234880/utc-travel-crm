import React, { useState, useEffect } from 'react';
import { X, Users, CheckCircle2, AlertCircle, Calendar, MapPin, DollarSign, Clock, RefreshCw } from 'lucide-react';
import { groupTourService, GroupTourCalendarItem } from '../services/groupTourService';

interface JoinGroupTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupTour: GroupTourCalendarItem | null;
  onSuccess?: () => void;
}

export default function JoinGroupTourModal({
  isOpen,
  onClose,
  groupTour,
  onSuccess,
}: JoinGroupTourModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [adults, setAdults] = useState(1);
  const [child6to17, setChild6to17] = useState(0);
  const [child2to5, setChild2to5] = useState(0);
  const [infants, setInfants] = useState(0);

  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ message: string; enquiryRef: string } | null>(null);

  useEffect(() => {
    if (isOpen && groupTour && groupTour.pricing) {
      const hasNormal = groupTour.pricing.some(p => p.title.toLowerCase() === 'normal');
      if (hasNormal) {
        setSelectedTier('Normal');
      }
    }
  }, [isOpen, groupTour]);

  if (!isOpen || !groupTour) return null;

  const numberOfPeople = adults + child6to17 + child2to5 + infants;

  const hasNormalPricing = groupTour?.pricing?.some((p: any) => p.title.toLowerCase() === 'normal');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedTier) {
      setError('Please select a pricing tier.');
      return;
    }

    if (!customerName?.trim() || !customerEmail?.trim() || !customerPhone?.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    const numberOfPeople = (adults || 0) + (child6to17 || 0) + (child2to5 || 0) + (infants || 0);

    if (numberOfPeople === 0) {
      setError('Please select at least 1 traveller.');
      return;
    }

    if (numberOfPeople > (groupTour?.availableSlots || 0)) {
      setError(`Only ${groupTour?.availableSlots} slot${(groupTour?.availableSlots || 0) > 1 ? 's are' : ' is'} currently available.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await groupTourService.joinGroupTour(groupTour.id || '', {
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        numberOfPeople,
        notes: `Tier: ${selectedTier} | Adults: ${adults}, Child(6-17): ${child6to17}, Child(2-5): ${child2to5}, Infants: ${infants}\n${notes || ''}`,
      });

      setSuccessResult({
        message: String(res?.message || 'Booking successful'),
        enquiryRef: String(res?.enquiryRef || 'N/A'),
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Error joining group tour:', err);
      let msg = err?.response?.data?.error || err?.message || 'Failed to join group tour. Please try again.';
      if (typeof msg !== 'string') {
        msg = JSON.stringify(msg);
      }
      setError(String(msg));
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setSelectedTier(null);
    setAdults(1);
    setChild6to17(0);
    setChild2to5(0);
    setInfants(0);
    setNotes('');
    setError(null);
    setSuccessResult(null);
    onClose();
  };

  const getTierPricing = (tierName: string) => {
    if (!groupTour || !groupTour.pricing) return null;
    return groupTour.pricing.find((p) => p.title.toLowerCase() === tierName.toLowerCase());
  };

  const calculateTotalPrice = () => {
    if (!selectedTier) return 0;
    const pricing = getTierPricing(selectedTier);
    if (!pricing) return 0;
    return (
      (pricing.adultPrice || 0) * adults +
      (pricing.child6to17Price || 0) * child6to17 +
      (pricing.child2to5Price || 0) * child2to5 +
      (pricing.infantPrice || 0) * infants
    );
  };

  const TIERS = ['Essential', 'Signature', 'Elite'];

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Almost Full':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Full':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-6 text-white relative">
          <button
            onClick={resetAndClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2 text-xs font-bold text-blue-200 uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Join Group Tour</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">{groupTour.title}</h2>
          <p className="text-xs text-blue-100 mt-1 flex items-center">
            <MapPin className="w-3.5 h-3.5 mr-1" /> {groupTour.destination}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Summary Banner */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs text-slate-700">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">Dates:</span>
              <span className="font-bold text-slate-800 flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1 text-blue-600" />
                {new Date(groupTour.startDate).toLocaleDateString()} – {new Date(groupTour.endDate).toLocaleDateString()}
              </span>
            </div>
            {hasNormalPricing ? null : (
              <div className="flex flex-col space-y-2 pt-2">
                <span className="font-semibold text-slate-900 mb-1">Select Pricing Tier:</span>
                <div className="grid grid-cols-3 gap-2">
                  {TIERS.map((tier) => {
                    const pricing = getTierPricing(tier);
                    const isSelected = selectedTier === tier;
                    
                    return (
                      <div 
                        key={tier}
                        onClick={() => pricing && setSelectedTier(tier)}
                        className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                          !pricing 
                            ? 'opacity-50 border-slate-200 bg-slate-50 cursor-not-allowed' 
                            : isSelected 
                              ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' 
                              : 'border-slate-200 bg-white hover:border-blue-300'
                        }`}
                      >
                        <div className={`font-bold text-[11px] uppercase tracking-wider ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                          {tier}
                        </div>
                        {pricing ? (
                          <div className={`text-xs mt-1 font-bold ${isSelected ? 'text-blue-600' : 'text-slate-500'}`}>
                            From ₹{(pricing.adultPrice || (pricing as any).price || 0).toLocaleString('en-IN')}
                          </div>
                        ) : (
                          <div className="text-[10px] mt-1 text-slate-400">Not Available</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="font-semibold text-slate-900">Slot Availability:</span>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${getStatusBadgeClass(groupTour.status)}`}>
                  {groupTour.status}
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {groupTour.availableSlots} available / {groupTour.totalSlots} total
                </span>
              </div>
            </div>
          </div>

          {successResult ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="text-lg font-bold text-emerald-900">Booking Enquiry Confirmed!</h3>
              <p className="text-xs text-emerald-800">{successResult.message}</p>
              <div className="p-3 bg-white rounded-lg border border-emerald-200 text-xs font-mono text-slate-700">
                Enquiry Ref: <span className="font-bold text-emerald-700">{successResult.enquiryRef}</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Our sales team will contact you shortly to confirm travel details and payment.
              </p>
              <button
                onClick={resetAndClose}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                Close & Return to Calendar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. rahul@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 98765 43210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-3">Traveller Details (Must be at least 1 Adult)</label>
                
                {!selectedTier ? (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                    Please select a pricing tier above to configure travellers.
                  </div>
                ) : (
                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    {/* Adult */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900">Adult (18+)</div>
                        <div className="text-[10px] text-slate-500">₹{getTierPricing(selectedTier)?.adultPrice?.toLocaleString('en-IN')}</div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button type="button" onClick={() => setAdults(Math.max(1, adults - 1))} className="w-7 h-7 rounded-full bg-white border border-slate-300 flex items-center justify-center text-slate-600 font-bold hover:bg-slate-100">-</button>
                        <span className="text-xs font-bold w-4 text-center">{adults}</span>
                        <button type="button" onClick={() => setAdults(adults + 1)} className="w-7 h-7 rounded-full bg-white border border-slate-300 flex items-center justify-center text-slate-600 font-bold hover:bg-slate-100">+</button>
                      </div>
                    </div>
                    {/* Child 6-17 */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <div>
                        <div className="text-xs font-bold text-slate-900">Child (6–17)</div>
                        <div className="text-[10px] text-slate-500">₹{getTierPricing(selectedTier)?.child6to17Price?.toLocaleString('en-IN')}</div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button type="button" onClick={() => setChild6to17(Math.max(0, child6to17 - 1))} className="w-7 h-7 rounded-full bg-white border border-slate-300 flex items-center justify-center text-slate-600 font-bold hover:bg-slate-100">-</button>
                        <span className="text-xs font-bold w-4 text-center">{child6to17}</span>
                        <button type="button" onClick={() => setChild6to17(child6to17 + 1)} className="w-7 h-7 rounded-full bg-white border border-slate-300 flex items-center justify-center text-slate-600 font-bold hover:bg-slate-100">+</button>
                      </div>
                    </div>
                    {/* Child 2-5 */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <div>
                        <div className="text-xs font-bold text-slate-900">Child (2–5)</div>
                        <div className="text-[10px] text-slate-500">₹{getTierPricing(selectedTier)?.child2to5Price?.toLocaleString('en-IN')}</div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button type="button" onClick={() => setChild2to5(Math.max(0, child2to5 - 1))} className="w-7 h-7 rounded-full bg-white border border-slate-300 flex items-center justify-center text-slate-600 font-bold hover:bg-slate-100">-</button>
                        <span className="text-xs font-bold w-4 text-center">{child2to5}</span>
                        <button type="button" onClick={() => setChild2to5(child2to5 + 1)} className="w-7 h-7 rounded-full bg-white border border-slate-300 flex items-center justify-center text-slate-600 font-bold hover:bg-slate-100">+</button>
                      </div>
                    </div>
                    {/* Infant */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <div>
                        <div className="text-xs font-bold text-slate-900">Infant (0–2)</div>
                        <div className="text-[10px] text-slate-500">₹{getTierPricing(selectedTier)?.infantPrice?.toLocaleString('en-IN')}</div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button type="button" onClick={() => setInfants(Math.max(0, infants - 1))} className="w-7 h-7 rounded-full bg-white border border-slate-300 flex items-center justify-center text-slate-600 font-bold hover:bg-slate-100">-</button>
                        <span className="text-xs font-bold w-4 text-center">{infants}</span>
                        <button type="button" onClick={() => setInfants(infants + 1)} className="w-7 h-7 rounded-full bg-white border border-slate-300 flex items-center justify-center text-slate-600 font-bold hover:bg-slate-100">+</button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                      <span className="font-bold text-slate-900 text-xs">Total People: {numberOfPeople}</span>
                      <span className="font-black text-blue-700 text-sm">₹{(calculateTotalPrice() || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Special Notes / Requests</label>
                <textarea
                  rows={2}
                  placeholder="Dietary requirements, room preferences, extra luggage..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={resetAndClose}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || groupTour.availableSlots <= 0}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Reserving Seats...
                    </>
                  ) : (
                    <>
                      <Users className="w-3.5 h-3.5 mr-1.5" />
                      Confirm & Join ({numberOfPeople} Seat{numberOfPeople > 1 ? 's' : ''})
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
