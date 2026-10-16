import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Clock, Star } from 'lucide-react';
import api from '../../services/api';

interface RelatedPackage {
  id: string;
  title: string;
  slug: string;
  durationDays: number;
  durationNights: number;
  basePrice?: number;
  destination?: { name: string };
  images?: Array<{ url: string }>;
}

export default function DestinationDetail() {
  const { slug } = useParams();
  
  const { data: destsRes, isLoading: destLoading } = useQuery<{ data: Array<any> }>({
    queryKey: ['public-destinations'],
    queryFn: async () => {
      const res = await api.get('/packages/destinations');
      return res.data;
    }
  });

  const dest = destsRes?.data?.find((d: any) => d.slug === slug || d.name.toLowerCase() === slug);

  const { data: pkgsRes } = useQuery<{ data: RelatedPackage[] }>({
    queryKey: ['destination-packages', slug],
    queryFn: async () => {
      const res = await api.get('/packages?status=PUBLISHED');
      return res.data;
    }
  });

  const relatedPackages = pkgsRes?.data || [];

  if (destLoading) return <div className="text-center py-24 text-slate-500">Loading destination...</div>;
  if (!dest) return <div className="text-center py-24 text-red-500">Destination not found.</div>;

  return (
    <div className="bg-slate-50 pb-24 min-h-screen">
      <div className="w-full h-[50vh] relative bg-slate-900">
        <img src={dest.image || 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=800&auto=format&fit=crop'} alt={dest.name} className="w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-4 tracking-tight">{dest.name}</h1>
            <p className="text-xl md:text-2xl text-slate-200 font-light">{dest.tagline || 'Explore'}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link to="/destinations" className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium mb-12 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Destinations
        </Link>
        
        <div className="max-w-3xl mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">About {dest.name}</h2>
          <p className="text-lg text-slate-600 leading-relaxed">{dest.description || `Discover the incredible beauty of ${dest.name} with our curated packages.`}</p>
        </div>

        <h3 className="text-2xl font-bold text-slate-900 mb-8">Popular Packages in {dest.name}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {relatedPackages.slice(0, 3).map((pkg) => (
            <div key={pkg.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow group flex flex-col h-full border border-slate-100">
              <div className="h-56 overflow-hidden relative">
                <img src={pkg.images?.[0]?.url || 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=800&auto=format&fit=crop'} alt={pkg.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm font-bold text-slate-900 shadow flex items-center">
                  <Star className="w-4 h-4 text-yellow-500 mr-1 fill-current" /> 4.9
                </div>
              </div>
              <div className="p-6 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{pkg.title}</h2>
                </div>
                <div className="flex flex-col space-y-2 mb-4 text-sm text-slate-600 font-medium">
                  <div className="flex items-center"><MapPin className="w-4 h-4 mr-2 text-blue-500"/> {pkg.destination?.name || dest.name}</div>
                  <div className="flex items-center"><Clock className="w-4 h-4 mr-2 text-blue-500"/> {pkg.durationDays}D / {pkg.durationNights}N</div>
                </div>
                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xl font-bold text-slate-900">{pkg.basePrice ? `₹${pkg.basePrice.toLocaleString()}` : '₹1,500'}</span>
                  <Link to={`/packages/${pkg.slug}`} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full text-sm font-medium transition-colors">
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
