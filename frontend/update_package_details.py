import re

file_path = r'c:\Users\Stefin\OneDrive\Desktop\business crm\frontend\src\pages\public\PackageDetail.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the start of the return block for the main render (starts at 'return (' and ends before the modals)
# Wait, let's search for 'return (' at the top level
match = re.search(r'^\s*return\s*\(\s*<div className="bg-slate-50 min-h-screen', content, re.MULTILINE)
if not match:
    print("Could not find start of return block!")
    exit(1)

start_idx = match.start()

# Now find where the modals start so we can keep them
# Let's search for {/* ENQUIRY MODAL */}
modal_match = re.search(r'^\s*\{\/\*\s*ENQUIRY MODAL\s*\*\/\s*\}', content, re.MULTILINE)
if not modal_match:
    print("Could not find start of modals!")
    exit(1)

modal_idx = modal_match.start()

new_jsx = '''  return (
    <div className="bg-[#f4f5ff] min-h-screen text-[#1d1e20] font-sans pb-24">
      {/* 1. TOP HEADER SECTION */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/packages" className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Packages
          </Link>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-[#f8e5ed] text-[#800040] font-bold text-[10px] uppercase tracking-wider rounded-full">
              {pkg.category?.name || 'Signature Luxury Collection'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. MAIN TWO-COLUMN LAYOUT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
        
        {/* Left Column (Main Content) */}
        <div className="lg:w-[65%] space-y-12 w-full">
          
          {/* Title and Overview */}
          <div className="space-y-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
              {pkg.title}
            </h1>
            
            <p className="text-[#6D7081] text-[15px] leading-relaxed">
              {pkg.overview}
            </p>
          </div>

          {/* Tour Map */}
          {pkg.mapImage && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-slate-900">Tour Map</h2>
              
              <div className="text-[13px] text-slate-600 space-y-1">
                <div className="flex"><span className="text-slate-400 w-20">Route:</span> <span className="font-medium text-slate-700">{routePoints.map(r => r.location).join(' - ')}</span></div>
                <div className="flex"><span className="text-slate-400 w-20">Highlights:</span> <span className="font-medium text-slate-700">{pkg.topHighlights?.map(h => h.title).join(' • ') || 'Various Locations'}</span></div>
              </div>

              <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-white p-2">
                <img src={pkg.mapImage} alt="Route Map" className="w-full h-auto rounded-xl" />
              </div>
            </div>
          )}

          {/* Itinerary Accordion */}
          {pkg.itineraryDays && pkg.itineraryDays.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-900">Itinerary</h2>
              
              <div className="space-y-3">
                {pkg.itineraryDays.map((day) => {
                  const isExpanded = expandedDay === day.dayNumber;
                  return (
                    <div key={day.id} className="bg-white rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-slate-100 overflow-hidden">
                      <button 
                        onClick={() => setExpandedDay(isExpanded ? null : day.dayNumber)}
                        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <span className="bg-[#800040] text-white text-[10px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap uppercase tracking-wider min-w-max">
                            DAY {day.dayNumber} | {day.location || 'DESTINATION'}
                          </span>
                          <span className="font-bold text-sm text-slate-800 uppercase tracking-wide truncate">
                            {day.title}
                          </span>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                      </button>
                      
                      {isExpanded && (
                        <div className="px-5 pb-6 pt-2">
                           <div className="relative pl-7 ml-5">
                             <div className="absolute left-0 top-3 bottom-3 w-px bg-slate-200"></div>
                             
                             {day.activities && day.activities.length > 0 ? (
                               day.activities.map((act, i) => (
                                 <div key={act.id || i} className="relative py-3">
                                   <div className="absolute left-[-3.5px] top-[18px] w-[9px] h-[9px] rounded-full bg-[#800040]"></div>
                                   <p className="text-[13px] text-slate-600 leading-relaxed uppercase">{act.description}</p>
                                 </div>
                               ))
                             ) : (
                                 <div className="relative py-3">
                                   <div className="absolute left-[-3.5px] top-[18px] w-[9px] h-[9px] rounded-full bg-[#800040]"></div>
                                   <p className="text-[13px] text-slate-600 leading-relaxed uppercase">{day.description}</p>
                                 </div>
                             )}
                           </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Included / Excluded */}
          <div className="pt-2">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Included / Excluded</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
              {(pkg.inclusions?.length ? pkg.inclusions : defaultInclusions.map((t,i)=>({id:i.toString(), text:t}))).map((inc: any) => (
                <div key={inc.id} className="flex items-start text-[11px] text-slate-600 font-bold uppercase tracking-wide">
                  <CheckCircle2 className="w-4 h-4 text-[#800040] mr-2 shrink-0" />
                  <span>{inc.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Date Selection & Booking Section */}
          <div id="date-selection" className="scroll-mt-24 pt-6">
             <h2 className="text-xl font-bold text-slate-900 mb-6">Select Departure Dates</h2>
             <GlobalTravelCalendar preselectedPackage={{ id: pkg.id, title: pkg.title }} />
          </div>

        </div>

        {/* Right Column (Sticky Sidebar) */}
        <div className="lg:w-[35%] w-full">
          <div className="sticky top-24 bg-white rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
            
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Starting Price</div>
            
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-bold text-slate-600">From</div>
              <div className="text-3xl font-black text-slate-900">
                ?{basePrice.toLocaleString('en-IN')}
              </div>
            </div>
            
            <div className="inline-block bg-[#f8e5ed] text-[#800040] text-[10px] font-bold px-3 py-1.5 rounded-full mb-8 uppercase tracking-wider">
              Best Price Guaranteed
            </div>

            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setIsModalOpen(true); }}>
              <input 
                required
                className="w-full bg-[#f4f5ff]/70 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#800040] focus:bg-white transition-colors" 
                placeholder="Name" 
              />
              <input 
                required
                className="w-full bg-[#f4f5ff]/70 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#800040] focus:bg-white transition-colors" 
                placeholder="Phone Number" 
              />
              <input 
                type="email"
                required
                className="w-full bg-[#f4f5ff]/70 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#800040] focus:bg-white transition-colors" 
                placeholder="Email Address" 
              />
              <textarea 
                className="w-full bg-[#f4f5ff]/70 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#800040] focus:bg-white transition-colors min-h-[120px] resize-y" 
                placeholder="Message"
              ></textarea>
              
              <button 
                type="submit"
                className="w-full bg-[#800040] hover:bg-[#600030] text-white font-bold py-4 rounded-xl uppercase text-[11px] tracking-widest shadow-lg shadow-[#800040]/20 transition-all mt-4"
              >
                SEND ENQUIRY
              </button>

              <WhatsAppEnquiryButton
                packageName={pkg.title}
                variant="outline"
                className="w-full py-3.5 rounded-xl text-[11px] uppercase tracking-widest border-slate-200 mt-3 flex justify-center"
              />
            </form>
          </div>
        </div>

      </div>

      '''

new_content = content[:start_idx] + new_jsx + content[modal_idx:]
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Done replacing JSX block.")
