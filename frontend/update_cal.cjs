const fs = require('fs');
const path = 'c:/Users/Stefin/OneDrive/Desktop/business crm/frontend/src/components/GlobalTravelCalendar.tsx';

let code = fs.readFileSync(path, 'utf8');

// Reduce button size
code = code.replace(/h-8 w-8 sm:h-9 sm:w-9/g, "h-7 w-7 sm:h-8 sm:w-8 text-[11px]");

// Reduce outer padding
code = code.replace(/p-5 sm:p-6/g, "p-3 sm:p-4");

// Reduce gap in grid
// <div key={i} className="grid grid-cols-7 gap-1"> -> gap-0.5
code = code.replace(/className="grid grid-cols-7 gap-1"/g, 'className="grid grid-cols-7 gap-0.5"');
code = code.replace(/<div className="grid grid-cols-7 gap-1 mb-1.5">/g, '<div className="grid grid-cols-7 gap-0.5 mb-1.5">');

// Reduce text size for header and month nav
code = code.replace(/text-lg uppercase/g, "text-sm uppercase");
code = code.replace(/text-xs font-bold text-slate-900 uppercase tracking-wide font-serif/g, "text-[11px] font-bold text-slate-900 uppercase tracking-wide font-serif");

// Reduce spacing
code = code.replace(/space-y-4 text-slate-900/g, "space-y-2 text-slate-900");
code = code.replace(/space-y-3 pb-3/g, "space-y-2 pb-2");
code = code.replace(/space-y-3/g, "space-y-2");

fs.writeFileSync(path, code, 'utf8');
console.log("Updated GlobalTravelCalendar.tsx");
