const fs = require('fs');
const path = 'c:/Users/Stefin/OneDrive/Desktop/business crm/frontend/src/pages/admin/PackageManagement.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('import GlobalTravelCalendar')) {
    content = content.replace(/import AdminPackageMediaModal from '\.\.\/\.\.\/components\/admin\/AdminPackageMediaModal';/, 
    "import AdminPackageMediaModal from '../../components/admin/AdminPackageMediaModal';\nimport GlobalTravelCalendar from '../../components/GlobalTravelCalendar';");
}

const calendarJsx = 
      {/* Calendar view for admins */}
      <div className="mb-8">
        <GlobalTravelCalendar />
      </div>
;

content = content.replace(/<div className="bg-white rounded-2xl shadow-sm border border-slate-200">/, calendarJsx + '\n      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">');

fs.writeFileSync(path, content, 'utf8');
console.log('Added calendar to PackageManagement.tsx');
