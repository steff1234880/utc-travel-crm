import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Plus, Search, Edit, Trash2, FolderPlus, Eye, BookOpen, Tag } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  featuredImage?: string;
  status: string;
  views: number;
  publishedAt?: string;
  createdAt: string;
  category?: Category | null;
  categoryId?: string | null;
}

export default function BlogManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [postForm, setPostForm] = useState({
    title: '',
    excerpt: '',
    content: '',
    featuredImage: '',
    categoryId: '',
    status: 'PUBLISHED'
  });

  const [newCatName, setNewCatName] = useState('');

  // Fetch Categories
  const { data: catRes } = useQuery<{ success: boolean; data: Category[] }>({
    queryKey: ['admin-blog-categories'],
    queryFn: async () => {
      const res = await api.get('/blogs/categories/all');
      return res.data;
    }
  });

  // Fetch Posts
  const { data: postsRes, isLoading } = useQuery<{ success: boolean; data: BlogPost[] }>({
    queryKey: ['admin-blog-posts', searchTerm, statusFilter, categoryFilter],
    queryFn: async () => {
      let query = `/blogs/admin/all?`;
      if (searchTerm) query += `search=${encodeURIComponent(searchTerm)}&`;
      if (statusFilter) query += `status=${statusFilter}&`;
      if (categoryFilter) query += `category=${categoryFilter}&`;
      const res = await api.get(query);
      return res.data;
    }
  });

  // Create Post Mutation
  const createPostMutation = useMutation({
    mutationFn: async (data: typeof postForm) => {
      const res = await api.post('/blogs', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      closePostModal();
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to create blog post');
    }
  });

  // Update Post Mutation
  const updatePostMutation = useMutation({
    mutationFn: async (data: typeof postForm) => {
      const res = await api.put(`/blogs/${editingId}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      closePostModal();
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to update blog post');
    }
  });

  // Delete Post Mutation
  const deletePostMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/blogs/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete blog post');
    }
  });

  // Add Category Mutation
  const createCatMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await api.post('/blogs/categories', { name });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-categories'] });
      setNewCatName('');
      setIsCategoryModalOpen(false);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to add category');
    }
  });

  const closePostModal = () => {
    setIsPostModalOpen(false);
    setIsEditMode(false);
    setEditingId(null);
    setPostForm({ title: '', excerpt: '', content: '', featuredImage: '', categoryId: '', status: 'PUBLISHED' });
  };

  const handleEditClick = (e: React.MouseEvent, post: BlogPost) => {
    e.stopPropagation();
    setIsEditMode(true);
    setEditingId(post.id);
    setPostForm({
      title: post.title,
      excerpt: post.excerpt || '',
      content: post.content || '',
      featuredImage: post.featuredImage || '',
      categoryId: post.categoryId || post.category?.id || '',
      status: post.status
    });
    setIsPostModalOpen(true);
  };

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...postForm };
    if (!payload.categoryId) {
      payload.categoryId = null as any;
    }
    if (isEditMode) {
      updatePostMutation.mutate(payload);
    } else {
      createPostMutation.mutate(payload);
    }
  };

  const categories = catRes?.data || [];
  const posts = postsRes?.data || [];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Blog & Articles</h1>
          <p className="text-slate-500 mt-1">Manage public articles, luxury travel guides, and blog categories.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors"
          >
            <FolderPlus className="w-5 h-5 mr-2 text-slate-500" />
            Add Category
          </button>
          <button
            onClick={() => {
              setIsEditMode(false);
              setPostForm({ title: '', excerpt: '', content: '', featuredImage: '', categoryId: categories[0]?.id || '', status: 'PUBLISHED' });
              setIsPostModalOpen(true);
            }}
            className="flex items-center px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Post
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading articles...</div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100 text-left text-sm font-bold text-slate-500 uppercase">
              <tr>
                <th className="px-6 py-4">Article</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Views</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Published</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {posts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No articles found.
                  </td>
                </tr>
              ) : (
                posts.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 max-w-md">
                        <div className="w-12 h-12 rounded-lg bg-slate-200 overflow-hidden shrink-0">
                          {post.featuredImage ? (
                            <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xs">BLOG</div>
                          )}
                        </div>
                        <div className="truncate">
                          <p className="font-bold text-slate-900 truncate">{post.title}</p>
                          <p className="text-xs text-slate-500 truncate">{post.excerpt}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-medium">
                      {post.category ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                          <Tag className="w-3 h-3 mr-1" />
                          {post.category.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Uncategorized</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium text-sm">
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4 text-slate-400" />
                        {post.views || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        post.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {post.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                      {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Article"
                          onClick={(e) => handleEditClick(e, post)}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Article"
                          onClick={() => { if (confirm('Delete this blog post?')) deletePostMutation.mutate(post.id); }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Post Modal */}
      {isPostModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {isEditMode ? 'Edit Article' : 'New Article'}
              </h2>
            </div>

            <form onSubmit={handlePostSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Article Title</label>
                <input required type="text" value={postForm.title} onChange={e => setPostForm({ ...postForm, title: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Top 10 Hidden Travel Spots in 2027" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Category</label>
                <select value={postForm.categoryId} onChange={e => setPostForm({ ...postForm, categoryId: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select Category...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Featured Image URL</label>
                <input type="url" value={postForm.featuredImage} onChange={e => setPostForm({ ...postForm, featuredImage: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://images.unsplash.com/..." />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Excerpt (Short Summary)</label>
                <textarea rows={2} required value={postForm.excerpt} onChange={e => setPostForm({ ...postForm, excerpt: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Brief summary of the article for listing cards..."></textarea>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Content (HTML formatted)</label>
                <textarea rows={6} required value={postForm.content} onChange={e => setPostForm({ ...postForm, content: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm" placeholder="<p>Write your blog content here...</p>"></textarea>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Status</label>
                <select value={postForm.status} onChange={e => setPostForm({ ...postForm, status: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="PUBLISHED">PUBLISHED</option>
                  <option value="DRAFT">DRAFT</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={closePostModal} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={createPostMutation.isPending || updatePostMutation.isPending} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {createPostMutation.isPending || updatePostMutation.isPending ? 'Saving...' : (isEditMode ? 'Update Article' : 'Publish Article')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Add Blog Category</h2>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if (newCatName) createCatMutation.mutate(newCatName); }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Category Name</label>
                <input required type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Travel Tips" />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={createCatMutation.isPending} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {createCatMutation.isPending ? 'Adding...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
