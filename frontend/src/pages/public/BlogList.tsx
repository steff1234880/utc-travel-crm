import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  featuredImage: string;
  publishedAt: string;
  author: { email: string };
  category: { name: string } | null;
}

export const MOCK_BLOGS: Blog[] = [
  {
    id: '1',
    title: 'Top 10 Hidden Gems in Europe for 2027',
    slug: 'top-10-hidden-gems-europe-2027',
    excerpt: 'Discover the most breathtaking and uncrowded destinations across Europe that you need to visit before they become mainstream.',
    content: '<p>Europe is full of surprises. While Paris and Rome are beautiful, true luxury lies in the undiscovered...</p><h2>1. The Azores, Portugal</h2><p>Often called the Hawaii of the mid-Atlantic...</p>',
    featuredImage: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=800&auto=format&fit=crop',
    publishedAt: new Date().toISOString(),
    author: { email: 'sarah.travels@utc.com' },
    category: { name: 'Destinations' }
  },
  {
    id: '2',
    title: 'How to Pack for a 14-Day Luxury Cruise',
    slug: 'pack-for-luxury-cruise',
    excerpt: 'Essential packing tips for your next luxury cruise. Learn what to bring for formal nights, excursions, and relaxing days at sea.',
    content: '<p>Packing for a cruise can be daunting. With limited space but varying dress codes, strategy is key...</p>',
    featuredImage: 'https://images.unsplash.com/photo-1599640842225-85d111c60e6b?q=80&w=800&auto=format&fit=crop',
    publishedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    author: { email: 'james.cruise@utc.com' },
    category: { name: 'Travel Tips' }
  },
  {
    id: '3',
    title: 'The Ultimate Guide to Kyoto in Autumn',
    slug: 'kyoto-in-autumn',
    excerpt: 'Experience the magic of changing leaves, ancient temples, and authentic Japanese cuisine in our comprehensive Kyoto guide.',
    content: '<p>Autumn in Kyoto is nothing short of magical. The fiery red maple leaves contrast beautifully with historic temples...</p>',
    featuredImage: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop',
    publishedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    author: { email: 'yuki.asia@utc.com' },
    category: { name: 'Cultural Experiences' }
  }
];

export default function BlogList() {
  const { data, isLoading, error } = useQuery<Blog[]>({
    queryKey: ['blogs'],
    queryFn: async () => {
      const response = await api.get('/blogs');
      return response.data;
    },
    retry: 1
  });

  // Use mock data if API is down
  const blogs = error || !data ? MOCK_BLOGS : data;

  return (
    <div className="bg-slate-50 py-16 sm:py-24 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Travel Blog</h1>
          <p className="text-lg text-slate-600">Insights, tips, and stories from our travel experts around the globe.</p>
        </div>

        {isLoading ? (
          <div className="text-center text-slate-500 py-12">Loading articles...</div>
        ) : blogs?.length === 0 ? (
          <div className="text-center text-slate-500 py-12 bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            <h3 className="text-xl font-medium mb-2">No Articles Yet</h3>
            <p>Check back later for exciting travel stories.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogs?.map((blog) => (
              <Link to={`/blog/${blog.slug}`} key={blog.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow group flex flex-col h-full border border-slate-100">
                <div className="h-48 overflow-hidden relative bg-slate-200">
                  {blog.featuredImage ? (
                    <img src={blog.featuredImage} alt={blog.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">No Image</div>
                  )}
                  {blog.category && (
                    <span className="absolute top-4 left-4 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      {blog.category.name}
                    </span>
                  )}
                </div>
                <div className="p-6 flex flex-col flex-grow">
                  <div className="flex items-center text-sm text-slate-500 mb-3 space-x-4">
                    <span>{new Date(blog.publishedAt).toLocaleDateString()}</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">{blog.title}</h2>
                  <p className="text-slate-600 mb-6 line-clamp-3">{blog.excerpt}</p>
                  <div className="mt-auto pt-4 border-t border-slate-100 text-sm font-medium text-blue-600">
                    Read Article &rarr;
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
