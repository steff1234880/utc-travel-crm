import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getExpenseCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.expenseCategory.findMany({
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching expense categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

export const createExpenseCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      res.status(400).json({ error: 'Category name is required' });
      return;
    }

    const category = await prisma.expenseCategory.create({
      data: { name, description }
    });
    
    res.status(201).json({ success: true, data: category });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Category with this name already exists' });
    } else {
      console.error('Error creating expense category:', error);
      res.status(500).json({ error: 'Failed to create category' });
    }
  }
};

export const updateExpenseCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, description, isActive } = req.body;
    
    const category = await prisma.expenseCategory.update({
      where: { id },
      data: { name, description, isActive }
    });
    
    res.json({ success: true, data: category });
  } catch (error) {
    console.error('Error updating expense category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
};
