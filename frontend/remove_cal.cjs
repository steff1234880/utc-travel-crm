const fs = require('fs');
const filePath = 'c:/Users/Stefin/OneDrive/Desktop/business crm/frontend/src/pages/public/PackageDetail.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Remove import
content = content.replace(/import GlobalTravelCalendar from '\.\.\/\.\.\/components\/GlobalTravelCalendar';\s*/g, '');

// Remove the calendar rendering block
// It might look like:
// {/* Date Selection & Booking Section */}
// <div id="date-selection" className="scroll-mt-24 pt-6">
//    <h2 className="text-xl font-bold text-slate-900 mb-6">Select Departure Dates</h2>
//    <GlobalTravelCalendar preselectedPackage={{ id: pkg.id, title: pkg.title }} />
// </div>
content = content.replace(/\{\/\*\s*Date Selection & Booking Section\s*\*\/\}\s*<div id="date-selection"[\s\S]*?<\/div>/g, '');

// Also catch the older style if it was there
content = content.replace(/\{\/\*\s*6\. DATE SELECTION SECTION \(EMBEDS GlobalTravelCalendar\)\s*\*\/\}\s*<div id="date-selection"[\s\S]*?<\/div>/g, '');

fs.writeFileSync(filePath, content, 'utf8');
console.log("Removed GlobalTravelCalendar from PackageDetail.tsx");
