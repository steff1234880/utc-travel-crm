import { Request, Response } from 'express';
import { generateReportCSV, ReportFilters } from '../services/reportService';

export const exportReportCSV = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, startDate, endDate } = req.query;

    if (!type || !['REVENUE', 'EXPENSE', 'PAYROLL', 'GST', 'PAYMENTS'].includes(type as string)) {
      res.status(400).json({ error: 'Invalid report type' });
      return;
    }

    const filters: ReportFilters = {
      type: type as any
    };

    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    const csvString = await generateReportCSV(filters);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type}_REPORT_${new Date().toISOString().split('T')[0]}.csv"`);
    
    res.status(200).send(csvString);
  } catch (error: any) {
    console.error('Error generating CSV report:', error);
    res.status(500).json({ error: error.message || 'Failed to generate report' });
  }
};
