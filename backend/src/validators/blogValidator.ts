import { z } from 'zod';

export const createBlogSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  slug: z.string().min(3, 'Slug must be at least 3 characters'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  excerpt: z.string().optional(),
  featuredImage: z.string().url().optional().or(z.literal('')),
  isFeatured: z.boolean().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
  categoryId: z.string().uuid().optional().nullable(),
});

export const updateBlogSchema = createBlogSchema.partial();
