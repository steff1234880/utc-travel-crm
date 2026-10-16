import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, CheckCircle, AlertCircle, Sparkles, User, Calendar, CreditCard, ShieldCheck, MapPin, ArrowRight, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

// ─── GROUP TOUR schema ────────────────────────────────────────────────────────
const groupEnquirySchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().optional(),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(5, 'Phone number is required'),
  travelDate: z.string().min(1, 'Travel date is required'),
  requirements: z.string().optional(),
});
type GroupEnquiryFormData = z.infer<typeof groupEnquirySchema>;

// ─── CUSTOM TOUR schema ───────────────────────────────────────────────────────
const customEnquirySchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().optional(),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(5, 'Phone number is required'),
  destination: z.string().min(2, 'Destination is required'),
  travelDateFrom: z.string().min(1, 'From date is required'),
  travelDateTo: z.string().min(1, 'To date is required'),
  travellerCount: z.coerce.number().min(1, 'At least 1 traveller required'),
  requirements: z.string().optional(),
});
type CustomEnquiryFormData = z.infer<typeof customEnquirySchema>;

// ─── Props ────────────────────────────────────────────────────────────────────
export interface PackageTierDetails {
  name: string;
  basePrice: number;
  perAdult: number;
  perChild6to11: number;
  perChild2to5: number;
  infant0to2: number;
  singleSupplement: number;
}

interface EnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageName?: string;
  packageId?: string;
  selectedTier?: string;
  defaultDate?: string;
  isCustomMode?: boolean;
}

// ─── CUSTOM TOUR FORM (self-contained) ────────────────────────────────────────
function CustomTourForm({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState('Failed to submit enquiry.');


  // Traveller counts
  const [adultCount, setAdultCount] = useState<number>(2);
  const [child6to17Count, setChild6to17Count] = useState<number>(0);
  const [child2to5Count, setChild2to5Count] = useState<number>(0);
  const [infantCount, setInfantCount] = useState<number>(0);

  const { register, handleSubmit, formState: { errors } } = useForm<CustomEnquiryFormData>({
    resolver: zodResolver(customEnquirySchema),
    defaultValues: { travellerCount: 2 },
  });

  const onSubmit = async (data: CustomEnquiryFormData) => {
    if (new Date(data.travelDateFrom) > new Date(data.travelDateTo)) {
      setErrorMessage('"To Date" must be after "From Date".');
      setStatus('error');
      return;
    }
    setStatus('submitting');
    try {
      const totalTravellers = adultCount + child6to17Count + child2to5Count + infantCount;
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName || '',
        email: data.email,
        phone: data.phone,
        source: 'Website Custom Tour',
        destination: data.destination,
        packageName: 'Custom Tour',
        packageTier: 'Custom',
        packagePrice: 0,
        perAdultPrice: 0,
        perChild6to11Price: 0,
        perChild2to5Price: 0,
        infantPrice: 0,
        singleSupplementPrice: 0,
        adultCount: adultCount,
        child6to11Count: child6to17Count,
        child2to5Count: child2to5Count,
        childCount: child6to17Count + child2to5Count,
        infantCount: infantCount,
        isSingleSupplement: false,
        travelDate: data.travelDateFrom,
        travelDateFrom: data.travelDateFrom,
        travelDateTo: data.travelDateTo,
        travellerCount: totalTravellers,
        calculatedTotalAmount: 0,
        paymentStatus: 'PENDING',
        specialRequests: `Requirements: ${data.requirements || 'None'}`,
      };
      const response = await api.post('/enquiries/submit', payload);
      setReferenceNumber(response.data.referenceNumber || '');
      setStatus('success');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; errors?: { message: string }[] } } };
      if (err.response?.data?.errors) {
        setErrorMessage(err.response.data.errors.map((e) => e.message).join(', '));
      } else if (err.response?.data?.message) {
        setErrorMessage(err.response.data.message);
      } else {
        setErrorMessage('Failed to submit enquiry. Please try again.');
      }
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
        <CheckCircle className="w-16 h-16 text-emerald-500" />
        <h3 className="text-2xl font-black text-slate-900">Custom Tour Enquiry Received!</h3>
        {referenceNumber && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-2.5 rounded-2xl text-sm font-bold shadow-sm">
            Reference Code: <span className="font-mono text-base">{referenceNumber}</span>
          </div>
        )}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 max-w-md text-xs text-slate-600 space-y-1 text-left">
          <p><strong>Type:</strong> Custom Tour</p>
          <p className="pt-2 text-slate-500">Our senior travel specialist will contact you shortly to design your perfect itinerary.</p>
        </div>
        <button onClick={onClose} className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-lg">
          Done &amp; Close
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 text-xs text-slate-900">
      {status === 'error' && (
        <div className="bg-rose-50 text-rose-800 p-4 rounded-2xl flex items-start border border-rose-200 font-bold">
          <AlertCircle className="w-5 h-5 mr-3 shrink-0 mt-0.5 text-rose-600" />
          <p>{errorMessage}</p>
        </div>
      )}

      {/* DESTINATION */}
      <div className="space-y-2 pb-4 border-b border-slate-100">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-emerald-600" /> Where do you want to go? *
        </label>
        <input
          {...register('destination')}
          placeholder="e.g. Sri Lanka, Paris, Bali, Dubai"
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.destination && <p className="text-rose-600 text-[10px] font-bold mt-1">{errors.destination.message}</p>}
      </div>

      {/* CONTACT DETAILS */}
      <div className="space-y-3">
        <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
          <User className="w-4 h-4 text-blue-600" /> Your Contact Details
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1">First Name *</label>
            <input {...register('firstName')} placeholder="e.g. Rahul" className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white" />
            {errors.firstName && <p className="text-rose-600 text-[10px] font-bold mt-1">{errors.firstName.message}</p>}
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Last Name</label>
            <input {...register('lastName')} placeholder="e.g. Sharma" className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
            <input type="email" {...register('email')} placeholder="rahul@example.com" className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white" />
            {errors.email && <p className="text-rose-600 text-[10px] font-bold mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Phone / WhatsApp *</label>
            <input {...register('phone')} placeholder="+91 98765 43210" className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white" />
            {errors.phone && <p className="text-rose-600 text-[10px] font-bold mt-1">{errors.phone.message}</p>}
          </div>
        </div>
      </div>

      {/* TRAVEL DATES & TRAVELLERS */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-indigo-600" /> Travel Dates &amp; Travellers
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1">From Date *</label>
            <input type="date" {...register('travelDateFrom')} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white" />
            {errors.travelDateFrom && <p className="text-rose-600 text-[10px] font-bold mt-1">{errors.travelDateFrom.message}</p>}
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">To Date *</label>
            <input type="date" {...register('travelDateTo')} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white" />
            {errors.travelDateTo && <p className="text-rose-600 text-[10px] font-bold mt-1">{errors.travelDateTo.message}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium px-1">
          <span>Example:</span>
          <span className="font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">10/07/2026</span>
          <ArrowRight className="w-3 h-3" />
          <span className="font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">15/07/2026</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 mt-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
              Adults (18+)
            </label>
            <input type="number" min="1" max="30" value={adultCount}
              onChange={(e) => setAdultCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl font-black bg-white" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
              Child (6-17)
            </label>
            <input type="number" min="0" max="20" value={child6to17Count}
              onChange={(e) => setChild6to17Count(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl font-black bg-white" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
              Child (2-5)
            </label>
            <input type="number" min="0" max="20" value={child2to5Count}
              onChange={(e) => setChild2to5Count(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl font-black bg-white" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
              Infant (0-2)
            </label>
            <input type="number" min="0" max="10" value={infantCount}
              onChange={(e) => setInfantCount(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl font-black bg-white" />
          </div>
        </div>
        {/* Hidden travellerCount to satisfy zod schema */}
        <input type="hidden" {...register('travellerCount')} value={adultCount + child6to17Count + child2to5Count + infantCount} />
      </div>



      {/* REQUIREMENTS */}
      <div>
        <label className="block font-bold text-slate-700 mb-1">Requirements / Message (Optional)</label>
        <textarea {...register('requirements')} rows={3} placeholder="Any specific requirements, interests, budget, preferred hotel category, or special requests..." className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white resize-none" />
      </div>

      {/* FOOTER */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center text-[10px] font-bold text-slate-400 space-x-1">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Instant CRM Enquiry Sync</span>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} disabled={status === 'submitting'} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
          <button type="submit" disabled={status === 'submitting'} className="bg-[#8b182b] text-white px-7 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-[#a31c33] transition-colors shadow-lg shadow-rose-900/30 disabled:opacity-50 flex items-center gap-2">
            {status === 'submitting' ? 'Submitting...' : 'Send Custom Tour Enquiry'}
          </button>
        </div>
      </div>
    </form>
  );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
export default function EnquiryModal({
  isOpen,
  onClose,
  packageName,
  packageId,
  defaultDate,
  isCustomMode = false,
}: EnquiryModalProps) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('Failed to submit booking enquiry.');

  // Traveller counts
  const [adultCount, setAdultCount] = useState<number>(2);
  const [child6to17Count, setChild6to17Count] = useState<number>(0);
  const [child2to5Count, setChild2to5Count] = useState<number>(0);
  const [infantCount, setInfantCount] = useState<number>(0);

  // Dynamic package selection state
  const [selectedPkgId, setSelectedPkgId] = useState<string>(packageId || '');

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<GroupEnquiryFormData>({
    resolver: zodResolver(groupEnquirySchema),
    defaultValues: { travelDate: defaultDate || '' }
  });

  const { data: pkgsData } = useQuery({
    queryKey: ['public-packages-enquiry'],
    queryFn: async () => {
      const res = await api.get('/packages?status=PUBLISHED').catch(() => null);
      return res?.data?.data || [];
    },
    enabled: isOpen && !isCustomMode
  });

  const packages = pkgsData || [];

  useEffect(() => {
    if (packageId) {
      setSelectedPkgId(packageId);
    } else if (isOpen && !selectedPkgId && packages.length > 0) {
      setSelectedPkgId(packages[0].id);
    }
  }, [packageId, isOpen, packages]);

  useEffect(() => {
    if (isOpen && defaultDate) {
      setValue('travelDate', defaultDate);
    }
  }, [isOpen, defaultDate, setValue]);

  const currentPkg = packages.find((p: any) => p.id === selectedPkgId);
  const displayPackageName = currentPkg?.title || packageName || 'Group Tour Package';

  // ─── Resolve Normal pricing from the package's pricingVars ──────────────────
  // The package stores ONE pricingVar with title='Normal' (or the first entry as fallback)
  const packagePricingVars = currentPkg?.pricingVars || [];
  const normalPricingVar = packagePricingVars.find((pv: any) =>
    pv.title === 'Normal' || pv.title === 'normal'
  ) || packagePricingVars[0] || null;

  const normalPricing = {
    perAdult: normalPricingVar?.adultPrice || normalPricingVar?.price || 0,
    perChild6to17: normalPricingVar?.child6to17Price || 0,
    perChild2to5: normalPricingVar?.child2to5Price || 0,
    perInfant: normalPricingVar?.infantPrice || 0,
  };

  // ─── Live totals ─────────────────────────────────────────────────────────────
  const adultsTotal = adultCount * normalPricing.perAdult;
  const child6to17Total = child6to17Count * normalPricing.perChild6to17;
  const child2to5Total = child2to5Count * normalPricing.perChild2to5;
  const infantsTotal = infantCount * normalPricing.perInfant;
  const totalTravellers = adultCount + child6to17Count + child2to5Count + infantCount;
  const calculatedTotalAmount = adultsTotal + child6to17Total + child2to5Total + infantsTotal;

  const onSubmit = async (data: GroupEnquiryFormData) => {
    setStatus('submitting');
    try {
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName || '',
        email: data.email,
        phone: data.phone,
        source: 'Website Package Booking',
        packageId: selectedPkgId || packageId || undefined,
        destination: currentPkg?.destination?.name || undefined,
        packageName: displayPackageName,
        packageTier: 'Normal',
        packagePrice: normalPricing.perAdult,
        perAdultPrice: normalPricing.perAdult,
        perChild6to11Price: normalPricing.perChild6to17,
        perChild2to5Price: normalPricing.perChild2to5,
        infantPrice: normalPricing.perInfant,
        singleSupplementPrice: 0,
        adultCount: adultCount,
        child6to11Count: child6to17Count,
        child2to5Count: child2to5Count,
        childCount: child6to17Count + child2to5Count,
        infantCount: infantCount,
        isSingleSupplement: false,
        travelDate: data.travelDate,
        travellerCount: totalTravellers,
        calculatedTotalAmount: calculatedTotalAmount,
        paymentStatus: 'PENDING',
        specialRequests: data.requirements,
      };

      const response = await api.post('/enquiries/submit', payload);
      setReferenceNumber(response.data.referenceNumber);
      setStatus('success');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; errors?: { message: string }[] } } };
      if (err.response?.data?.errors) {
        setErrorMessage(err.response.data.errors.map((e) => e.message).join(', '));
      } else if (err.response?.data?.message) {
        setErrorMessage(err.response.data.message);
      } else {
        setErrorMessage('Failed to submit booking enquiry. Please try again.');
      }
      setStatus('error');
    }
  };

  const handleClose = () => {
    reset();
    setStatus('idle');
    setReferenceNumber('');
    setAdultCount(2);
    setChild6to17Count(0);
    setChild2to5Count(0);
    setInfantCount(0);
    onClose();
  };

  if (!isOpen) return null;

  // ─── CUSTOM TOUR MODE ─────────────────────────────────────────────────────────
  if (isCustomMode) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
          {/* Header */}
          <div className="p-5 sm:p-6 bg-gradient-to-r from-[#4a0e17] via-[#8b182b] to-[#4a0e17] text-white flex items-center justify-between border-b border-rose-900/50 shrink-0">
            <div>
              <div className="inline-flex items-center space-x-1.5 bg-white/10 text-rose-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1">
                <Sparkles className="w-3 h-3" />
                <span>Custom Tour Enquiry</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">Plan Your Custom Journey</h2>
              <p className="text-xs text-rose-200 font-medium mt-0.5">Tell us your dream destination — we'll design the perfect itinerary.</p>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-full text-rose-300 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          {/* Body */}
          <div className="p-5 sm:p-7 overflow-y-auto">
            <CustomTourForm onClose={handleClose} />
          </div>
        </div>
      </div>
    );
  }

  // ─── GROUP TOUR / PACKAGE BOOKING MODE ───────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">

        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div>
            <div className="inline-flex items-center space-x-1.5 bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3" />
              <span>Group Tour Booking</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">{displayPackageName}</h2>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              Select your tier — age-based rates apply
            </p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6">
          {status === 'success' ? (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-emerald-500" />
              <h3 className="text-2xl font-black text-slate-900">Booking Enquiry Received!</h3>
              {referenceNumber && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-2.5 rounded-2xl text-sm font-bold shadow-sm">
                  Reference Code: <span className="font-mono text-base">{referenceNumber}</span>
                </div>
              )}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 max-w-md text-xs text-slate-600 space-y-1 text-left">
                <p><strong>Package:</strong> {displayPackageName}</p>
                <p><strong>Travellers:</strong> {totalTravellers} ({adultCount} Adults, {child6to17Count + child2to5Count} Children, {infantCount} Infants)</p>
                {calculatedTotalAmount > 0 && <p><strong>Estimated Total:</strong> ₹{calculatedTotalAmount.toLocaleString()}</p>}
                <p><strong>Payment Status:</strong> PENDING</p>
                <p className="pt-2 text-slate-500">Our senior travel specialist will contact you shortly to confirm dates and process your itinerary.</p>
              </div>
              <button onClick={handleClose} className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-lg">
                Done &amp; Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 text-xs text-slate-900">

              {status === 'error' && (
                <div className="bg-rose-50 text-rose-800 p-4 rounded-2xl flex items-start border border-rose-200 font-bold">
                  <AlertCircle className="w-5 h-5 mr-3 shrink-0 mt-0.5 text-rose-600" />
                  <p>{errorMessage}</p>
                </div>
              )}

              {/* 0. WHERE ARE YOU GOING? - DYNAMIC PACKAGE SELECTOR */}
              {!packageId && packages.length > 0 && (
                <div className="space-y-2 pb-4 border-b border-slate-100">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" /> Where are you going?
                  </label>
                  <select
                    value={selectedPkgId}
                    onChange={(e) => setSelectedPkgId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {packages.map((pkg: any) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.title} {pkg.destination ? `(${pkg.destination.name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 1. TIER PRICING DISPLAY */}
              {normalPricingVar && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 uppercase tracking-wider pb-2 border-b border-indigo-200">
                    <Users className="w-4 h-4 text-indigo-600" /> Tier Pricing (Per Person)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="bg-white rounded-xl p-2.5 border border-indigo-100">
                      <div className="text-[9px] font-bold text-slate-500 uppercase mb-1">Adult (18+)</div>
                      <div className="text-sm font-black text-indigo-700">₹{normalPricing.perAdult.toLocaleString()}</div>
                    </div>
                    <div className="bg-white rounded-xl p-2.5 border border-indigo-100">
                      <div className="text-[9px] font-bold text-slate-500 uppercase mb-1">Child (6-17)</div>
                      <div className="text-sm font-black text-indigo-700">₹{normalPricing.perChild6to17.toLocaleString()}</div>
                    </div>
                    <div className="bg-white rounded-xl p-2.5 border border-indigo-100">
                      <div className="text-[9px] font-bold text-slate-500 uppercase mb-1">Child (2-5)</div>
                      <div className="text-sm font-black text-indigo-700">₹{normalPricing.perChild2to5.toLocaleString()}</div>
                    </div>
                    <div className="bg-white rounded-xl p-2.5 border border-indigo-100">
                      <div className="text-[9px] font-bold text-slate-500 uppercase mb-1">Infant (0-2)</div>
                      <div className="text-sm font-black text-indigo-700">₹{normalPricing.perInfant.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. CUSTOMER CONTACT INFORMATION */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-600" /> Customer Contact Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">First Name *</label>
                    <input {...register('firstName')} placeholder="e.g. Rahul" className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white" />
                    {errors.firstName && <p className="text-rose-600 text-[10px] font-bold mt-1">{errors.firstName.message}</p>}
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Last Name</label>
                    <input {...register('lastName')} placeholder="e.g. Sharma" className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                    <input type="email" {...register('email')} placeholder="rahul@example.com" className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white" />
                    {errors.email && <p className="text-rose-600 text-[10px] font-bold mt-1">{errors.email.message}</p>}
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phone / WhatsApp Number *</label>
                    <input {...register('phone')} placeholder="+91 98765 43210" className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white" />
                    {errors.phone && <p className="text-rose-600 text-[10px] font-bold mt-1">{errors.phone.message}</p>}
                  </div>
                </div>
              </div>

              {/* 3. TRAVEL DATE & TRAVELLERS */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-600" /> Travel Date &amp; Travellers
                </h4>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expected Departure Date *</label>
                  <input type="date" {...register('travelDate')} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white" />
                  {errors.travelDate && <p className="text-rose-600 text-[10px] font-bold mt-1">{errors.travelDate.message}</p>}
                </div>

                {/* Traveller Counts */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Adults (18+){normalPricing.perAdult > 0 ? ` — ₹${normalPricing.perAdult.toLocaleString()}` : ''}
                    </label>
                    <input type="number" min="1" max="30" value={adultCount}
                      onChange={(e) => setAdultCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-black bg-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Child (6-17){normalPricing.perChild6to17 > 0 ? ` — ₹${normalPricing.perChild6to17.toLocaleString()}` : ''}
                    </label>
                    <input type="number" min="0" max="20" value={child6to17Count}
                      onChange={(e) => setChild6to17Count(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-black bg-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Child (2-5){normalPricing.perChild2to5 > 0 ? ` — ₹${normalPricing.perChild2to5.toLocaleString()}` : ''}
                    </label>
                    <input type="number" min="0" max="20" value={child2to5Count}
                      onChange={(e) => setChild2to5Count(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-black bg-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Infant (0-2){normalPricing.perInfant > 0 ? ` — ₹${normalPricing.perInfant.toLocaleString()}` : ''}
                    </label>
                    <input type="number" min="0" max="10" value={infantCount}
                      onChange={(e) => setInfantCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-black bg-white" />
                  </div>
                </div>
              </div>

              {/* 4. LIVE TOTAL CALCULATION (only show if pricing is set) */}
              {calculatedTotalAmount > 0 && (
                <div className="p-4 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl shadow-md space-y-3 border border-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-amber-400" /> Live Booking Total
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      Payment: PENDING
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] font-medium text-slate-300">
                    {adultsTotal > 0 && (
                      <div className="flex justify-between">
                        <span>Adults ({adultCount} × ₹{normalPricing.perAdult.toLocaleString()}):</span>
                        <span className="font-mono text-white">₹{adultsTotal.toLocaleString()}</span>
                      </div>
                    )}
                    {child6to17Total > 0 && (
                      <div className="flex justify-between">
                        <span>Children 6-17 ({child6to17Count} × ₹{normalPricing.perChild6to17.toLocaleString()}):</span>
                        <span className="font-mono text-white">₹{child6to17Total.toLocaleString()}</span>
                      </div>
                    )}
                    {child2to5Total > 0 && (
                      <div className="flex justify-between">
                        <span>Children 2-5 ({child2to5Count} × ₹{normalPricing.perChild2to5.toLocaleString()}):</span>
                        <span className="font-mono text-white">₹{child2to5Total.toLocaleString()}</span>
                      </div>
                    )}
                    {infantsTotal > 0 && (
                      <div className="flex justify-between">
                        <span>Infants 0-2 ({infantCount} × ₹{normalPricing.perInfant.toLocaleString()}):</span>
                        <span className="font-mono text-white">₹{infantsTotal.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-800 pt-2">
                    <span className="uppercase text-xs text-slate-200 font-black">Total ({totalTravellers} Travellers):</span>
                    <span className="text-2xl text-amber-400 font-black font-mono">₹{calculatedTotalAmount.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Special Requests */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Special Requirements / Notes (Optional)</label>
                <textarea {...register('requirements')} rows={2}
                  placeholder="Dietary preferences, room configuration, or special requests..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white resize-none" />
              </div>

              {/* Footer Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center text-[10px] font-bold text-slate-400 space-x-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Instant CRM Enquiry Sync</span>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={handleClose} disabled={status === 'submitting'} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={status === 'submitting'} className="bg-blue-600 text-white px-7 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30 disabled:opacity-50 flex items-center gap-2">
                    {status === 'submitting' ? 'Processing...' : 'Book / Submit Enquiry'}
                  </button>
                </div>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
}
