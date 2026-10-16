import { Request, Response } from 'express';
import { generatePnLStatement, PnLFilters } from '../services/pnlService';

export const getPnLDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    
    const filters: PnLFilters = {};
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    const statement = await generatePnLStatement(filters);
    
    res.json({ success: true, data: statement });
  } catch (error) {
    console.error('Error generating P&L dashboard:', error);
    res.status(500).json({ error: 'Failed to generate P&L dashboard' });
  }
};

export const getPnLStatement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    
    const filters: PnLFilters = {};
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    const statement = await generatePnLStatement(filters);
    
    // For the detailed statement, the frontend will parse the breakdown objects
    res.json({ success: true, data: statement });
  } catch (error) {
    console.error('Error generating P&L statement:', error);
    res.status(500).json({ error: 'Failed to generate P&L statement' });
  }
};
