const fs = require('fs');

let content = fs.readFileSync('c:/Users/Stefin/OneDrive/Desktop/business crm/frontend/src/components/EnquiryModal.tsx', 'utf-8');

content = content.replace('defaultDate?: string;', 'defaultDate?: string;\n  isCustomMode?: boolean;');
content = content.replace('defaultDate,\n}: EnquiryModalProps', 'defaultDate,\n  isCustomMode = false,\n}: EnquiryModalProps');

const schema_old = `const enquirySchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().optional(),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(5, 'Phone number is required'),
  travelDate: z.string().min(1, 'Travel date is required'),
  requirements: z.string().optional(),
});`;

const schema_new = `const enquirySchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().optional(),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(5, 'Phone number is required'),
  travelDate: z.string().optional(),
  requirements: z.string().optional(),
  destination: z.string().optional(),
  travelDateFrom: z.string().optional(),
  travelDateTo: z.string().optional(),
  travellerCount: z.any().transform(v => Number(v)).optional(),
});`;
content = content.replace(schema_old, schema_new);

const submit_old = `      const payload = {
        firstName: data.firstName,
        lastName: data.lastName || '',
        email: data.email,
        phone: data.phone,
        source: 'Website Package Booking',
        packageId: selectedPkgId || packageId || undefined,
        destination: currentPkg?.destination?.name || undefined,
        packageName: displayPackageName,
        packageTier: tierInfo.name,
        packagePrice: tierInfo.basePrice,
        perAdultPrice: tierInfo.perAdult,
        perChild6to11Price: tierInfo.perChild6to11,
        perChild2to5Price: tierInfo.perChild2to5,
        infantPrice: tierInfo.infant0to2,
        singleSupplementPrice: tierInfo.singleSupplement,
        adultCount: adultCount,
        child6to11Count: child6to11Count,
        child2to5Count: child2to5Count,
        childCount: child6to11Count + child2to5Count,
        infantCount: infantCount,
        isSingleSupplement: isSingleSuppActive,
        travelDate: data.travelDate,
        travellerCount: totalTravellers,
        calculatedTotalAmount: calculatedTotalAmount,
        paymentStatus: 'PENDING',
        specialRequests: data.requirements,
      };`;

const submit_new = `      if (isCustomMode) {
        if (!data.travelDateFrom || !data.travelDateTo) { setErrorMessage("Please select both From and To dates."); setStatus('error'); return; }
        if (new Date(data.travelDateFrom) > new Date(data.travelDateTo)) { setErrorMessage("To Date cannot be before From Date."); setStatus('error'); return; }
        if (!data.destination) { setErrorMessage("Please enter a destination."); setStatus('error'); return; }
        if (!data.travellerCount || data.travellerCount < 1) { setErrorMessage("Please enter a valid number of travellers."); setStatus('error'); return; }
      } else {
        if (!data.travelDate) { setErrorMessage("Travel date is required."); setStatus('error'); return; }
      }

      const payload = isCustomMode ? {
        firstName: data.firstName,
        lastName: data.lastName || '',
        email: data.email,
        phone: data.phone,
        source: 'Website Custom Tour',
        packageId: undefined,
        destination: data.destination,
        packageName: 'Custom Tour',
        packageTier: undefined,
        packagePrice: 0,
        perAdultPrice: 0,
        perChild6to11Price: 0,
        perChild2to5Price: 0,
        infantPrice: 0,
        singleSupplementPrice: 0,
        adultCount: data.travellerCount || 1,
        child6to11Count: 0,
        child2to5Count: 0,
        childCount: 0,
        infantCount: 0,
        isSingleSupplement: false,
        travelDate: \`\${data.travelDateFrom} to \${data.travelDateTo}\`,
        travellerCount: data.travellerCount || 1,
        calculatedTotalAmount: 0,
        paymentStatus: 'PENDING',
        specialRequests: data.requirements,
      } : {
        firstName: data.firstName,
        lastName: data.lastName || '',
        email: data.email,
        phone: data.phone,
        source: 'Website Package Booking',
        packageId: selectedPkgId || packageId || undefined,
        destination: currentPkg?.destination?.name || undefined,
        packageName: displayPackageName,
        packageTier: tierInfo.name,
        packagePrice: tierInfo.basePrice,
        perAdultPrice: tierInfo.perAdult,
        perChild6to11Price: tierInfo.perChild6to11,
        perChild2to5Price: tierInfo.perChild2to5,
        infantPrice: tierInfo.infant0to2,
        singleSupplementPrice: tierInfo.singleSupplement,
        adultCount: adultCount,
        child6to11Count: child6to11Count,
        child2to5Count: child2to5Count,
        childCount: child6to11Count + child2to5Count,
        infantCount: infantCount,
        isSingleSupplement: isSingleSuppActive,
        travelDate: data.travelDate,
        travellerCount: totalTravellers,
        calculatedTotalAmount: calculatedTotalAmount,
        paymentStatus: 'PENDING',
        specialRequests: data.requirements,
      };`;
content = content.replace(submit_old, submit_new);

const header_old = `<div className="inline-flex items-center space-x-1.5 bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3" />
              <span>Official Website Package Booking</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">{displayPackageName}</h2>
            <p className="text-xs text-slate-300 font-medium mt-0.5">Pre-selected Tier: <span className="text-amber-400 font-bold">{tierInfo.name} (Base ₹{tierInfo.basePrice.toLocaleString()})</span></p>`;

const header_new = `<div className="inline-flex items-center space-x-1.5 bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3" />
              <span>{isCustomMode ? 'Custom Tour Enquiry' : 'Official Website Package Booking'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">{isCustomMode ? 'Plan Your Custom Journey' : displayPackageName}</h2>
            {!isCustomMode && <p className="text-xs text-slate-300 font-medium mt-0.5">Pre-selected Tier: <span className="text-amber-400 font-bold">{tierInfo.name} (Base ₹{tierInfo.basePrice.toLocaleString()})</span></p>}`;
content = content.replace(header_old, header_new);

const success_info_old = `<p><strong>Package:</strong> {tierInfo.name} Tier</p>
                <p><strong>Travellers:</strong> {totalTravellers} ({adultCount} Adults, {child6to11Count + child2to5Count} Children, {infantCount} Infants)</p>
                <p><strong>Estimated Total:</strong> ₹{calculatedTotalAmount.toLocaleString()}</p>
                <p><strong>Payment Status:</strong> PENDING</p>`;

const success_info_new = `{!isCustomMode && <p><strong>Package:</strong> {tierInfo.name} Tier</p>}
                {isCustomMode && <p><strong>Custom Tour</strong></p>}
                {!isCustomMode && <p><strong>Travellers:</strong> {totalTravellers} ({adultCount} Adults, {child6to11Count + child2to5Count} Children, {infantCount} Infants)</p>}
                {!isCustomMode && <p><strong>Estimated Total:</strong> ₹{calculatedTotalAmount.toLocaleString()}</p>}
                <p><strong>Payment Status:</strong> PENDING</p>`;
content = content.replace(success_info_old, success_info_new);

const package_selector_old = `{/* 0. WHERE ARE YOU GOING? - DYNAMIC PACKAGE SELECTOR */}
              {!packageId && packages.length > 0 && (`

const package_selector_new = `{/* CUSTOM MODE: DESTINATION */}
              {isCustomMode && (
                <div className="space-y-2 pb-4 border-b border-slate-100">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" /> Where do you want to go? *
                  </label>
                  <input
                    {...register('destination')}
                    required={isCustomMode}
                    placeholder="e.g. Sri Lanka, Paris, Bali"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* 0. WHERE ARE YOU GOING? - DYNAMIC PACKAGE SELECTOR */}
              {!isCustomMode && !packageId && packages.length > 0 && (`;
content = content.replace(package_selector_old, package_selector_new);

const tiers_old = `{/* 1. SELECT PACKAGE TIER */}
              <div className="space-y-2">`;
const tiers_new = `{/* 1. SELECT PACKAGE TIER */}
              {!isCustomMode && (
              <div className="space-y-2">`;
content = content.replace(tiers_old, tiers_new);

const tiers_close_old = `</button>
                  ))}
                </div>
              </div>

              {/* 2. CUSTOMER CONTACT INFORMATION */}`;
const tiers_close_new = `</button>
                  ))}
                </div>
              </div>
              )}

              {/* 2. CUSTOMER CONTACT INFORMATION */}`;
content = content.replace(tiers_close_old, tiers_close_new);

const travel_date_old = `{/* 3. TRAVEL DATE & TRAVELLER BREAKDOWN */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-600" /> Travel Date & Travellers Breakdown
                </h4>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expected Departure Date *</label>
                  <input
                    type="date"
                    {...register('travelDate')}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white"
                  />
                  {errors.travelDate && <p className="text-rose-600 text-[10px] font-bold mt-1">{errors.travelDate.message}</p>}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Adults (₹{tierInfo.perAdult.toLocaleString()})</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={adultCount}
                      onChange={(e) => setAdultCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-black bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Child 6-11 (₹{tierInfo.perChild6to11.toLocaleString()})</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={child6to11Count}
                      onChange={(e) => setChild6to11Count(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-black bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Child 2-5 (₹{tierInfo.perChild2to5.toLocaleString()})</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={child2to5Count}
                      onChange={(e) => setChild2to5Count(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-black bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Infant 0-2 (₹{tierInfo.infant0to2.toLocaleString()})</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={infantCount}
                      onChange={(e) => setInfantCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-black bg-white"
                    />
                  </div>
                </div>

                {adultCount === 1 && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                    <label className="flex items-center space-x-2 cursor-pointer font-bold text-amber-900">
                      <input
                        type="checkbox"
                        checked={isSingleSupplement}
                        onChange={(e) => setIsSingleSupplement(e.target.checked)}
                        className="w-4 h-4 text-amber-600 rounded border-slate-300"
                      />
                      <span>Apply Single Room Supplement (+₹{tierInfo.singleSupplement.toLocaleString()})</span>
                    </label>
                  </div>
                )}
              </div>`;

const travel_date_new = `{/* 3. TRAVEL DATE & TRAVELLER BREAKDOWN */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-600" /> Travel Date & Travellers
                </h4>

                {isCustomMode ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Travel From Date *</label>
                        <input
                          type="date"
                          {...register('travelDateFrom')}
                          required={isCustomMode}
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Travel To Date *</label>
                        <input
                          type="date"
                          {...register('travelDateTo')}
                          required={isCustomMode}
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Number of Travellers *</label>
                      <input
                        type="number"
                        min="1"
                        {...register('travellerCount', { valueAsNumber: true })}
                        required={isCustomMode}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Expected Departure Date *</label>
                      <input
                        type="date"
                        {...register('travelDate')}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white"
                      />
                      {errors.travelDate && <p className="text-rose-600 text-[10px] font-bold mt-1">{errors.travelDate.message}</p>}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Adults (₹{tierInfo.perAdult.toLocaleString()})</label>
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={adultCount}
                          onChange={(e) => setAdultCount(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl font-black bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Child 6-11 (₹{tierInfo.perChild6to11.toLocaleString()})</label>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={child6to11Count}
                          onChange={(e) => setChild6to11Count(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl font-black bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Child 2-5 (₹{tierInfo.perChild2to5.toLocaleString()})</label>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={child2to5Count}
                          onChange={(e) => setChild2to5Count(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl font-black bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Infant 0-2 (₹{tierInfo.infant0to2.toLocaleString()})</label>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={infantCount}
                          onChange={(e) => setInfantCount(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl font-black bg-white"
                        />
                      </div>
                    </div>
                    {adultCount === 1 && (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                        <label className="flex items-center space-x-2 cursor-pointer font-bold text-amber-900">
                          <input
                            type="checkbox"
                            checked={isSingleSupplement}
                            onChange={(e) => setIsSingleSupplement(e.target.checked)}
                            className="w-4 h-4 text-amber-600 rounded border-slate-300"
                          />
                          <span>Apply Single Room Supplement (+₹{tierInfo.singleSupplement.toLocaleString()})</span>
                        </label>
                      </div>
                    )}
                  </>
                )}
              </div>`;
content = content.replace(travel_date_old, travel_date_new);


const summary_old = `{/* 4. DYNAMIC REAL-TIME PRICE CALCULATION SUMMARY CARD */}
              <div className="p-4 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl shadow-md space-y-3 border border-slate-800">`;
const summary_new = `{/* 4. DYNAMIC REAL-TIME PRICE CALCULATION SUMMARY CARD */}
              {!isCustomMode && (
              <div className="p-4 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl shadow-md space-y-3 border border-slate-800">`;
content = content.replace(summary_old, summary_new);

const summary_close_old = `<span className="text-2xl text-amber-400 font-black font-mono">₹{calculatedTotalAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Special Requests */}`;
const summary_close_new = `<span className="text-2xl text-amber-400 font-black font-mono">₹{calculatedTotalAmount.toLocaleString()}</span>
                </div>
              </div>
              )}

              {/* Special Requests */}`;
content = content.replace(summary_close_old, summary_close_new);

fs.writeFileSync('c:/Users/Stefin/OneDrive/Desktop/business crm/frontend/src/components/EnquiryModal.tsx', content);
