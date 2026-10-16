import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { createBlogSchema, updateBlogSchema } from '../validators/blogValidator';
import { z } from 'zod';

export const getBlogs = async (req: Request, res: Response) => {
  try {
    const blogs = await prisma.blogPost.findMany({
      where: { status: 'PUBLISHED' },
      include: { author: { select: { email: true } }, category: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch blogs' });
  }
};

export const getAdminBlogs = async (req: Request, res: Response) => {
  try {
    const { search, status, category } = req.query;
    let where: any = {};
    if (search) {
      where.title = { contains: search as string, mode: 'insensitive' };
    }
    if (status) {
      where.status = status as string;
    }
    if (category) {
      where.category = { name: category as string };
    }
    const blogs = await prisma.blogPost.findMany({
      where,
      include: { author: { select: { email: true } }, category: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: blogs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch admin blogs' });
  }
};

export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.blogCategory.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const category = await prisma.blogCategory.create({ data: { name, slug } });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category' });
  }
};

export const getBlogBySlug = async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug as string;
    const blog = await prisma.blogPost.findUnique({
      where: { slug },
      include: { author: { select: { email: true } }, category: true }
    });
    
    if (!blog) return res.status(404).json({ error: 'Blog not found' });
    res.json(blog);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch blog' });
  }
};

export const createBlog = async (req: Request, res: Response) => {
  try {
    const body = { ...req.body };
    if (!body.slug && body.title) {
      body.slug = body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
    }
    const data = createBlogSchema.parse(body);
    const authorId = req.user?.userId; // Assumes auth middleware populates req.user
    
    if (!authorId) return res.status(401).json({ error: 'Unauthorized' });

    const newBlog = await prisma.blogPost.create({
      data: { ...data, authorId, publishedAt: data.status === 'PUBLISHED' ? new Date() : null }
    });
    res.status(201).json({ success: true, data: newBlog });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.issues });
    }
    res.status(500).json({ error: 'Failed to create blog' });
  }
};

export const updateBlog = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = updateBlogSchema.parse(req.body);
    
    const updatedBlog = await prisma.blogPost.update({
      where: { id },
      data
    });
    res.json(updatedBlog);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.issues });
    }
    res.status(500).json({ error: 'Failed to update blog' });
  }
};

export const deleteBlog = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.blogPost.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete blog' });
  }
};
