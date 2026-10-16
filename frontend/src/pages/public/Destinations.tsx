import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

export default function Destinations() {
  const { data: destsData, isLoading } = useQuery<{ data: Array<{ id: string; name: string; slug: string; tagline?: string; image?: string; description?: string; packages?: any[] }> }>({
    queryKey: ['public-destinations'],
    queryFn: async () => {
      const res = await api.get('/packages/destinations');
      return res.data;
    }
  });

  const destinations = destsData?.data || [];

  return (
    <div className="bg-slate-50 py-16 sm:py-24 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Explore Destinations</h1>
          <p className="text-lg text-slate-600">Discover handpicked regions across the globe for your next luxury getaway.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {isLoading ? (
            <div className="col-span-1 md:col-span-2 text-center py-20 text-slate-500">Loading destinations...</div>
          ) : destinations.length === 0 ? (
            <div className="col-span-1 md:col-span-2 text-center py-16 text-slate-500">No destinations available.</div>
          ) : destinations.map((dest) => (
            <Link to={`/packages?destination=${dest.id}`} key={dest.id} className="group relative rounded-3xl overflow-hidden shadow-lg h-96 block">
              <img src={dest.image || 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=800&auto=format&fit=crop'} alt={dest.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300"></div>
              <div className="absolute bottom-0 left-0 p-8 w-full">
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-blue-400 font-semibold tracking-wider uppercase text-sm mb-2 block">{dest.tagline || 'Explore'}</span>
                    <h2 className="text-3xl font-bold text-white mb-2">{dest.name}</h2>
                    <p className="text-slate-300 line-clamp-2 max-w-md">{dest.description || 'Discover incredible packages and experiences.'}</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-center shrink-0">
                    <span className="block text-2xl font-bold">{dest.packages?.length || 0}</span>
                    <span className="text-xs uppercase tracking-wider">Packages</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
