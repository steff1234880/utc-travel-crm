import re

file_path = r'c:\Users\Stefin\OneDrive\Desktop\business crm\frontend\src\pages\public\Packages.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Change export default function Home to Packages
content = content.replace('export default function Home() {', 'export default function Packages() {')

# 2. Add imports
content = re.sub(r'import\s+{\s*Link\s*}\s+from\s+\'react-router-dom\';', "import { Link, useSearchParams } from 'react-router-dom';", content)
content = re.sub(r'import\s+{([\s\S]*?)}\s+from\s+\'lucide-react\';', r"import { \1, Search, Filter, AlertCircle } from 'lucide-react';", content)

# 3. Inject <PackagesListing /> right before the last </div> of Packages
enquiry_str = 'isCustomMode={isCustomMode}\n      />'
idx = content.find(enquiry_str)
if idx != -1:
    idx2 = content.find('</div>', idx)
    if idx2 != -1:
        content = content[:idx2] + '      <PackagesListing />\n    ' + content[idx2:]

# 4. Add PackagesListing logic at the end of the file
packages_listing_code = '''
export interface TravelPackageItem {
  id: string;
  title: string;
  slug: string;
  overview: string;
  durationDays: number;
  durationNights: number;
  basePrice?: number;
  currency?: string;
  destination?: { id: string; name: string };
  images?: Array<{ url: string; isFeatured: boolean }>;
}

function PackagesListing() {
  const [searchParams] = useSearchParams();
  const destId = searchParams.get('destination');
  
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedDestFilter, setSelectedDestFilter] = React.useState(destId || '');

  React.useEffect(() => {
    if (destId) {
      setSelectedDestFilter(destId);
    }
  }, [destId]);

  const { data: destsData } = useQuery<{ data: Array<{ id: string; name: string }> }>({
    queryKey: ['destinations-list'],
    queryFn: async () => {
      const res = await api.get('/packages/destinations');
      return res.data;
    }
  });

  const { data: pkgsData, isLoading, isError, refetch } = useQuery<{ data: TravelPackageItem[] }>({
    queryKey: ['public-packages', searchTerm, selectedDestFilter],
    queryFn: async () => {
      let query = `/packages?status=PUBLISHED&`;
      if (searchTerm) query += `search=${encodeURIComponent(searchTerm)}&`;
      if (selectedDestFilter) query += `destinationId=${selectedDestFilter}&`;

      const res = await api.get(query);
      return res.data;
    }
  });

  const packages = pkgsData?.data || [];
  const destinations = destsData?.data || [];

  return (
    <div id="all-packages" className="bg-slate-50 py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Our Premium Travel Packages</h1>
          <p className="text-lg text-slate-600">Handcrafted itineraries designed for unforgettable experiences and ultimate luxury.</p>
        </div>

        {/* Search & Filters */}
        <div className="max-w-4xl mx-auto mb-12 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by package title or destination..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm"
            />
          </div>

          <select
            value={selectedDestFilter}
            onChange={(e) => setSelectedDestFilter(e.target.value)}
            className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            <option value="">All Destinations</option>
            {destinations.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-20 text-slate-500">Loading travel packages from database...</div>
        ) : isError ? (
          <div className="text-center py-16 text-red-500">
            <AlertCircle className="w-10 h-10 mx-auto mb-2" />
            <p className="font-bold">Failed to load packages.</p>
            <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">Retry</button>
          </div>
        ) : packages.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 max-w-xl mx-auto shadow-sm p-8">
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Packages Found</h3>
            <p className="text-slate-500 text-sm">Try broadening your search or clearing destination filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {packages.map((pkg) => {
              const mainImg = pkg.images?.[0]?.url || 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=800&auto=format&fit=crop';
              return (
                <div key={pkg.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col h-full border border-slate-100">
                  <div className="h-56 overflow-hidden relative bg-slate-200">
                    <img src={mainImg} alt={pkg.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-slate-900 shadow flex items-center">
                      <Star className="w-3.5 h-3.5 text-yellow-500 mr-1 fill-current" /> 4.9
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-grow">
                    <h2 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-2">{pkg.title}</h2>
                    <div className="flex flex-col space-y-1.5 mb-4 text-sm text-slate-600 font-medium">
                      <div className="flex items-center"><MapPin className="w-4 h-4 mr-2 text-blue-500 shrink-0"/> {pkg.destination?.name || 'Multiple Destinations'}</div>
                      <div className="flex items-center"><Clock className="w-4 h-4 mr-2 text-blue-500 shrink-0"/> {pkg.durationDays} Days / {pkg.durationNights} Nights</div>
                    </div>
                    <p className="text-slate-600 mb-6 line-clamp-2 text-sm leading-relaxed">{pkg.overview}</p>
                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xl font-extrabold text-slate-900">
                        {pkg.basePrice ? `₹${pkg.basePrice.toLocaleString()}` : 'Price on request'}
                      </span>
                      <Link to={`/packages/${pkg.slug}`} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full text-sm font-bold transition-colors">
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
'''

content = content + '\n\n' + packages_listing_code

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS')
