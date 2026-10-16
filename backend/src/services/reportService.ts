import { PrismaClient } from '@prisma/client';
import Decimal from 'decimal.js';

const prisma = new PrismaClient();

export interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  type: 'REVENUE' | 'EXPENSE' | 'PAYROLL' | 'GST' | 'PAYMENTS';
}

/**
 * Escapes CSV values to prevent CSV Injection (formula injection)
 * and properly wraps fields containing commas.
 */
const escapeCSV = (value: any): string => {
  if (value === null || value === undefined) return '';
  let str = String(value);
  // Prevent CSV Injection
  if (/^[=\+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  // Escape quotes and wrap in quotes if containing comma or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const formatCSV = (headers: string[], rows: any[][]): string => {
  const headerRow = headers.map(escapeCSV).join(',');
  const dataRows = rows.map(row => row.map(escapeCSV).join(','));
  return [headerRow, ...dataRows].join('\n');
};

export const generateReportCSV = async (filters: ReportFilters): Promise<string> => {
  const dateQuery: any = {};
  if (filters.startDate && filters.endDate) {
    const end = new Date(filters.endDate);
    end.setHours(23, 59, 59, 999);
    dateQuery.gte = new Date(filters.startDate);
    dateQuery.lte = end;
  } else if (filters.startDate) {
    dateQuery.gte = new Date(filters.startDate);
  } else if (filters.endDate) {
    const end = new Date(filters.endDate);
    end.setHours(23, 59, 59, 999);
    dateQuery.lte = end;
  }

  switch (filters.type) {
    case 'REVENUE': {
      const [customerPayments, revenueRecords] = await Promise.all([
        prisma.customerPayment.findMany({
          where: Object.keys(dateQuery).length
            ? { transaction: { date: dateQuery, type: 'INCOME' } }
            : { transaction: { type: 'INCOME' } },
          include: {
            customer: true,
            transaction: {
              include: { createdBy: true, gstRecord: true }
            }
          }
        }),
        prisma.revenueRecord.findMany({
          where: Object.keys(dateQuery).length ? { date: dateQuery } : {},
          include: { customer: true, createdBy: true }
        })
      ]);

      const headers = ['Reference Number', 'Date', 'Customer', 'Revenue Type', 'Amount (INR)', 'Payment Status', 'GST Status', 'Logged By'];
      const rows: any[][] = [];

      // Map Customer Payments into Revenue Report rows
      customerPayments.forEach(cp => {
        const ref = cp.transaction?.referenceNumber || cp.id;
        const date = cp.transaction?.date ? cp.transaction.date.toISOString().split('T')[0] : '';
        const customerName = `${cp.customer?.firstName || ''} ${cp.customer?.lastName || ''}`.trim() || 'Unknown';
        const type = cp.paymentType || 'Payment';
        const amount = cp.transaction?.amount || 0;
        const status = cp.transaction?.status || 'COMPLETED';
        const gst = cp.transaction?.gstRecord ? 'GST Included' : 'N/A';
        const loggedBy = `${cp.transaction?.createdBy?.firstName || ''} ${cp.transaction?.createdBy?.lastName || ''}`.trim() || 'System';

        rows.push([ref, date, customerName, type, amount, status, gst, loggedBy]);
      });

      // Map standalone Revenue Records (avoiding duplicates)
      const existingRefs = new Set(rows.map(r => r[0]));
      revenueRecords.forEach(rr => {
        if (!existingRefs.has(rr.referenceNumber)) {
          const ref = rr.referenceNumber;
          const date = rr.date.toISOString().split('T')[0];
          const customerName = `${rr.customer?.firstName || ''} ${rr.customer?.lastName || ''}`.trim() || 'Unknown';
          const type = rr.revenueType;
          const amount = rr.amount;
          const status = rr.paymentStatus;
          const gst = rr.gstStatus;
          const loggedBy = `${rr.createdBy?.firstName || ''} ${rr.createdBy?.lastName || ''}`.trim() || 'System';

          rows.push([ref, date, customerName, type, amount, status, gst, loggedBy]);
        }
      });

      // Sort by date descending
      rows.sort((a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime());

      return formatCSV(headers, rows);
    }
    case 'EXPENSE': {
      const expenses = await prisma.expense.findMany({
        where: Object.keys(dateQuery).length ? { expenseDate: dateQuery, status: { in: ['APPROVED', 'PAID'] } } : { status: { in: ['APPROVED', 'PAID'] } },
        include: { category: true, createdBy: true }
      });

      const headers = ['Expense ID', 'Date', 'Category', 'Description', 'Taxable Amount', 'Total Tax', 'Total Amount', 'Status', 'Logged By'];
      const rows = expenses.map(e => [
        e.id,
        e.expenseDate.toISOString().split('T')[0],
        e.category?.name || 'Uncategorized',
        e.description || '',
        e.taxableAmount,
        e.totalTaxAmount,
        e.totalAmount,
        e.status,
        `${e.createdBy?.firstName || ''} ${e.createdBy?.lastName || ''}`.trim() || 'Unknown'
      ]);
      return formatCSV(headers, rows);
    }
    case 'PAYROLL': {
      // For payroll, we combine paid salaries, bonuses, and incentives
      const [salaries, bonuses, incentives] = await Promise.all([
        prisma.salaryRecord.findMany({
          where: Object.keys(dateQuery).length ? { createdAt: dateQuery, status: 'PAID' } : { status: 'PAID' },
          include: { employee: true }
        }),
        prisma.employeeBonus.findMany({
          where: Object.keys(dateQuery).length ? { createdAt: dateQuery, status: 'PAID' } : { status: 'PAID' },
          include: { employee: true }
        }),
        prisma.employeeIncentive.findMany({
          where: Object.keys(dateQuery).length ? { createdAt: dateQuery, status: 'PAID' } : { status: 'PAID' },
          include: { employee: true }
        })
      ]);

      const headers = ['Type', 'Date Ledgered', 'Employee', 'Department', 'Amount (INR)'];
      const rows: any[][] = [];

      salaries.forEach(s => rows.push(['SALARY', s.createdAt.toISOString().split('T')[0], `${s.employee.firstName} ${s.employee.lastName}`, s.employee.departmentId || '', s.netSalary]));
      bonuses.forEach(b => rows.push(['BONUS', b.createdAt.toISOString().split('T')[0], `${b.employee.firstName} ${b.employee.lastName}`, b.employee.departmentId || '', b.amount]));
      incentives.forEach(i => rows.push(['COMMISSION', i.createdAt.toISOString().split('T')[0], `${i.employee.firstName} ${i.employee.lastName}`, i.employee.departmentId || '', i.amount]));

      // Sort rows by Date
      rows.sort((a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime());

      return formatCSV(headers, rows);
    }
    case 'PAYMENTS': {
      const payments = await prisma.customerPayment.findMany({
        where: Object.keys(dateQuery).length 
          ? { transaction: { date: dateQuery, status: 'COMPLETED' } } 
          : { transaction: { status: 'COMPLETED' } },
        include: { customer: true, transaction: true }
      });

      const headers = ['Receipt No', 'Date', 'Customer', 'Payment Method', 'Amount (INR)'];
      const rows = payments.map(p => [
        p.transaction?.referenceNumber || '',
        p.transaction?.date ? p.transaction.date.toISOString().split('T')[0] : '',
        `${p.customer?.firstName || ''} ${p.customer?.lastName || ''}`.trim() || 'Unknown',
        p.transaction?.paymentMethod || '',
        p.transaction?.amount || 0
      ]);
      return formatCSV(headers, rows);
    }
    default:
      throw new Error(`Report type ${filters.type} not supported`);
  }
};
