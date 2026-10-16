const fs = require('fs');
const path = 'c:/Users/Stefin/OneDrive/Desktop/business crm/frontend/src/components/GlobalTravelCalendar.tsx';

let code = fs.readFileSync(path, 'utf8');

// 1. Constrain width of the main wrapper
code = code.replace(
  /<div className="bg-white rounded-3xl p-3 sm:p-4 border border-stone-200\/90 shadow-md space-y-2 text-slate-900 w-full">/,
  '<div className="bg-white rounded-[24px] p-5 border border-stone-200/90 shadow-lg space-y-4 text-slate-900 w-full max-w-[420px] mx-auto">'
);
// Fallback in case it's still p-5 sm:p-6
code = code.replace(
  /<div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200\/90 shadow-md space-y-4 text-slate-900 w-full">/,
  '<div className="bg-white rounded-[24px] p-5 border border-stone-200/90 shadow-lg space-y-4 text-slate-900 w-full max-w-[420px] mx-auto">'
);

// 2. Adjust button size for dates
code = code.replace(/h-7 w-7 sm:h-8 sm:w-8 text-\[11px\]/g, "w-10 h-10 sm:w-11 sm:h-11 text-sm");
code = code.replace(/<div key=\{j\} className="h-7 w-7 sm:h-8 sm:w-8 text-\[11px\]"><\/div>/g, '<div key={j} className="w-10 h-10 sm:w-11 sm:h-11"></div>');
// Fallbacks
code = code.replace(/h-8 w-8 sm:h-9 sm:w-9/g, "w-10 h-10 sm:w-11 sm:h-11 text-sm");
code = code.replace(/<div key=\{j\} className="h-8 w-8 sm:h-9 sm:w-9"><\/div>/g, '<div key={j} className="w-10 h-10 sm:w-11 sm:h-11"></div>');

// 3. Make grid gaps slightly bigger for the calendar to look proportional
code = code.replace(/className="grid grid-cols-7 gap-0.5"/g, 'className="grid grid-cols-7 gap-1"');
code = code.replace(/<div className="grid grid-cols-7 gap-0.5 mb-1.5">/g, '<div className="grid grid-cols-7 gap-1 mb-2">');
// Fallbacks
code = code.replace(/<div className="grid grid-cols-7 gap-1 mb-1.5">/g, '<div className="grid grid-cols-7 gap-1 mb-2">');

// 4. Adjust the main action buttons at the bottom to look like the large "VIEW ALL DEPARTURES" button
code = code.replace(
  /w-full py-2.5 bg-\[#8b182b\] hover:bg-\[#a31c33\] text-white font-bold text-xs/g,
  "w-full py-3.5 bg-[#8b182b] hover:bg-[#a31c33] text-white font-bold text-sm rounded-[14px]"
);

// 5. Adjust the header text back to a proportional size
code = code.replace(/text-sm uppercase/g, "text-base uppercase");
code = code.replace(/text-\[11px\] font-bold text-slate-900 uppercase tracking-wide font-serif/g, "text-sm font-bold text-[#001738] uppercase tracking-wide font-serif");

// 6. Adjust spacing
code = code.replace(/space-y-2 text-slate-900/g, "space-y-5 text-slate-900");
code = code.replace(/space-y-2 pb-2/g, "space-y-4 pb-3");
code = code.replace(/space-y-2/g, "space-y-4");

// 7. Adjust days of week color
code = code.replace(/text-\[10px\] font-bold text-slate-400 uppercase tracking-wider/g, "text-[11px] font-bold text-[#8ba3c7] uppercase tracking-wider");

// Write back
fs.writeFileSync(path, code, 'utf8');
console.log("Updated GlobalTravelCalendar.tsx for the exact card size.");
