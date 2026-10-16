import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import { MOCK_BLOGS, Blog } from './BlogList';

export default function BlogDetail() {
  const { slug } = useParams();

  const { data, isLoading, error } = useQuery<Blog>({
    queryKey: ['blog', slug],
    queryFn: async () => {
      const response = await api.get(`/blogs/${slug}`);
      return response.data;
    },
    enabled: !!slug,
    retry: 1
  });

  const mockBlog = MOCK_BLOGS.find(b => b.slug === slug);
  const blog = error || !data ? mockBlog : data;

  if (isLoading) return <div className="text-center py-24">Loading article...</div>;
  if (!blog) return <div className="text-center py-24 text-red-500">Article not found.</div>;

  return (
    <div className="bg-white pb-24">
      <div className="w-full h-64 md:h-96 relative bg-slate-900">
        {blog.featuredImage && (
          <img src={blog.featuredImage} alt={blog.title} className="w-full h-full object-cover opacity-60" />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="max-w-4xl text-center px-4">
            {blog.category && (
              <span className="text-blue-400 font-bold tracking-wider uppercase mb-4 block">
                {blog.category.name}
              </span>
            )}
            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 leading-tight">
              {blog.title}
            </h1>
            <div className="flex items-center justify-center space-x-6 text-slate-300">
              <div className="flex items-center"><Calendar className="w-4 h-4 mr-2"/> {new Date(blog.publishedAt).toLocaleDateString()}</div>
              <div className="flex items-center"><User className="w-4 h-4 mr-2"/> By {blog.author.email.split('@')[0]}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link to="/blog" className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium mb-12 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to all articles
        </Link>
        
        <div className="prose prose-lg prose-blue max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: blog.content || '<p>No content available.</p>' }}>
        </div>
      </div>
    </div>
  );
}
