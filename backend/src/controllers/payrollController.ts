import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';

// Frontend sends flat fields; we accept both flat and array formats
const upsertSalaryStructureSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  // Accept flat format from frontend
  baseSalary: z.number().min(0).optional(),
  hra: z.number().min(0).optional(),
  transportAllowance: z.number().min(0).optional(),
  medicalAllowance: z.number().min(0).optional(),
  specialAllowance: z.number().min(0).optional(),
  taxDeduction: z.number().min(0).optional(),
  pfDeduction: z.number().min(0).optional(),
  otherDeductions: z.number().min(0).optional(),
  // Also accept legacy array format
  basicSalary: z.number().min(0).optional(),
  allowances: z.array(z.object({ name: z.string(), amount: z.number().min(0) })).optional(),
  deductions: z.array(z.object({ name: z.string(), amount: z.number().min(0) })).optional(),
});

const processPayrollSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020),
});

// Helper: map the flat frontend fields to allowance/deduction arrays
function mapFlatToStructure(data: z.infer<typeof upsertSalaryStructureSchema>) {
  // Support both baseSalary (frontend) and basicSalary (legacy)
  const basicSalary = data.baseSalary ?? data.basicSalary ?? 0;

  // If allowances array provided directly, use it; otherwise map flat fields
  const allowances: { name: string; amount: number }[] = data.allowances ?? [
    ...(data.hra !== undefined ? [{ name: 'HRA', amount: data.hra }] : []),
    ...(data.transportAllowance !== undefined ? [{ name: 'Transport Allowance', amount: data.transportAllowance }] : []),
    ...(data.medicalAllowance !== undefined ? [{ name: 'Medical Allowance', amount: data.medicalAllowance }] : []),
    ...(data.specialAllowance !== undefined ? [{ name: 'Special Allowance', amount: data.specialAllowance }] : []),
  ];

  const deductions: { name: string; amount: number }[] = data.deductions ?? [
    ...(data.taxDeduction !== undefined ? [{ name: 'Tax Deduction', amount: data.taxDeduction }] : []),
    ...(data.pfDeduction !== undefined ? [{ name: 'PF Deduction', amount: data.pfDeduction }] : []),
    ...(data.otherDeductions !== undefined && data.otherDeductions > 0 ? [{ name: 'Other Deductions', amount: data.otherDeductions }] : []),
  ];

  return { basicSalary, allowances, deductions };
}

// Helper: convert DB structure record to flat format for frontend
function toFlatStructure(s: any) {
  const allowanceMap: Record<string, number> = {};
  (s.allowances || []).forEach((a: any) => { allowanceMap[a.name] = a.amount; });
  const deductionMap: Record<string, number> = {};
  (s.deductions || []).forEach((d: any) => { deductionMap[d.name] = d.amount; });

  const hra = allowanceMap['HRA'] ?? 0;
  const transportAllowance = allowanceMap['Transport Allowance'] ?? 0;
  const medicalAllowance = allowanceMap['Medical Allowance'] ?? 0;
  const specialAllowance = allowanceMap['Special Allowance'] ?? 0;
  const taxDeduction = deductionMap['Tax Deduction'] ?? 0;
  const pfDeduction = deductionMap['PF Deduction'] ?? 0;
  const otherDeductions = deductionMap['Other Deductions'] ?? 0;

  const totalAllowances = hra + transportAllowance + medicalAllowance + specialAllowance;
  const totalDeductions = taxDeduction + pfDeduction + otherDeductions;
  const netSalary = s.basicSalary + totalAllowances - totalDeductions;

  return {
    id: s.id,
    employeeId: s.employeeId,
    baseSalary: s.basicSalary,
    hra,
    transportAllowance,
    medicalAllowance,
    specialAllowance,
    taxDeduction,
    pfDeduction,
    otherDeductions,
    netSalary,
    employee: s.employee ?? undefined,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export const getPayrollDashboard = async (req: Request, res: Response) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Count active employees
    const employeeCount = await prisma.employee.count({ where: { status: 'ACTIVE' } });

    // Sum netSalary for all salary structures to get total monthly payroll
    const salaryStructures = await prisma.salaryStructure.findMany({
      where: { employee: { status: 'ACTIVE' } },
      include: { allowances: true, deductions: true }
    });

    let totalMonthlyPayroll = 0;
    for (const s of salaryStructures) {
      const totalAllowances = s.allowances.reduce((sum: number, a: any) => sum + a.amount, 0);
      const totalDeductions = s.deductions.reduce((sum: number, d: any) => sum + d.amount, 0);
      totalMonthlyPayroll += s.basicSalary + totalAllowances - totalDeductions;
    }

    // Payroll records for the current month
    const salaryRecords = await prisma.salaryRecord.findMany({
      where: { month: currentMonth, year: currentYear },
      include: {
        employee: { include: { department: true, designation: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const processedCount = salaryRecords.filter((r: any) => ['PROCESSED', 'PAID'].includes(r.status)).length;
    const pendingCount = salaryRecords.filter((r: any) => r.status === 'PENDING').length;

    // Map records to frontend shape
    const records = salaryRecords.map((r: any) => {
      // Fetch the correct salary structure for this employee
      const struct = salaryStructures.find((s: any) => s.employeeId === r.employeeId);
      
      let baseSalary = r.basicSalary;
      let allowances = r.totalAllowances;
      let deductions = r.totalDeductions;
      let netSalary = r.netSalary;
      
      if (struct) {
        baseSalary = struct.basicSalary;
        allowances = struct.allowances.reduce((sum: number, a: any) => sum + a.amount, 0);
        deductions = struct.deductions.reduce((sum: number, d: any) => sum + d.amount, 0);
        netSalary = baseSalary + allowances - deductions;
      }

      return {
        id: r.id,
        employeeId: r.employeeId,
        month: r.month,
        year: r.year,
        baseSalary,
        allowances,
        deductions,
        netSalary,
        status: r.status,
        paidAt: r.updatedAt,
        employee: r.employee ? {
          id: r.employee.id,
          firstName: r.employee.status === 'DELETED' ? 'Deleted' : r.employee.firstName,
          lastName: r.employee.status === 'DELETED' ? 'Employee' : r.employee.lastName,
          email: r.employee.status === 'DELETED' ? '' : r.employee.user?.email ?? '',
          department: r.employee.status === 'DELETED' ? null : r.employee.department,
          designation: r.employee.status === 'DELETED' ? null : r.employee.designation,
          status: r.employee.status,
        } : undefined,
      };
    });

    res.status(200).json({
      success: true,
      summary: {
        totalMonthlyPayroll: Math.round(totalMonthlyPayroll),
        processedCount,
        pendingCount,
        employeeCount,
      },
      records,
    });
  } catch (error) {
    console.error('Get payroll dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payroll data' });
  }
};

export const getSalaryStructures = async (req: Request, res: Response) => {
  try {
    const structures = await prisma.salaryStructure.findMany({
      where: {
        employee: { status: { not: 'DELETED' } }
      },
      include: {
        allowances: true,
        deductions: true,
        employee: true,
      },
      orderBy: { createdAt: 'asc' }
    });

    const flat = structures.map(toFlatStructure);

    res.status(200).json({ success: true, data: flat });
  } catch (error) {
    console.error('Get salary structures error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch salary structures' });
  }
};

export const upsertSalaryStructure = async (req: Request, res: Response) => {
  try {
    const data = upsertSalaryStructureSchema.parse(req.body);

    if (!data.employeeId) {
      return res.status(400).json({ success: false, message: 'Employee ID is required' });
    }

    const emp = await prisma.employee.findUnique({ where: { id: data.employeeId } });
    if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });

    const { basicSalary, allowances, deductions } = mapFlatToStructure(data);

    if (basicSalary <= 0) {
      return res.status(400).json({ success: false, message: 'Base salary must be greater than 0' });
    }

    // Check existing salary structure
    const existing = await prisma.salaryStructure.findUnique({ where: { employeeId: data.employeeId } });

    if (existing) {
      // Delete old allowances & deductions for clean update
      await prisma.salaryAllowance.deleteMany({ where: { salaryStructureId: existing.id } });
      await prisma.salaryDeduction.deleteMany({ where: { salaryStructureId: existing.id } });

      const updated = await prisma.salaryStructure.update({
        where: { id: existing.id },
        data: {
          basicSalary,
          allowances: allowances.length > 0 ? { create: allowances } : undefined,
          deductions: deductions.length > 0 ? { create: deductions } : undefined,
        },
        include: { allowances: true, deductions: true }
      });
      
      // Auto-upsert the payroll slip for the current month so they appear immediately
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const totalAllowances = allowances.reduce((sum, a) => sum + a.amount, 0);
      const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
      const netSalary = basicSalary + totalAllowances - totalDeductions;
      
      await prisma.salaryRecord.upsert({
        where: { employeeId_month_year: { employeeId: data.employeeId, month: currentMonth, year: currentYear } },
        create: {
          employeeId: data.employeeId,
          month: currentMonth,
          year: currentYear,
          basicSalary,
          totalAllowances,
          totalDeductions,
          totalBonuses: 0,
          netSalary,
          status: 'PROCESSED'
        },
        update: {
          basicSalary,
          totalAllowances,
          totalDeductions,
          netSalary
        }
      });

      return res.status(200).json({
        success: true,
        data: toFlatStructure(updated),
        message: 'Salary structure updated successfully'
      });
    } else {
      const created = await prisma.salaryStructure.create({
        data: {
          employeeId: data.employeeId,
          basicSalary,
          allowances: allowances.length > 0 ? { create: allowances } : undefined,
          deductions: deductions.length > 0 ? { create: deductions } : undefined,
        },
        include: { allowances: true, deductions: true }
      });
      
      // Auto-upsert the payroll slip for the current month so they appear immediately
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const totalAllowances = allowances.reduce((sum, a) => sum + a.amount, 0);
      const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
      const netSalary = basicSalary + totalAllowances - totalDeductions;
      
      await prisma.salaryRecord.upsert({
        where: { employeeId_month_year: { employeeId: data.employeeId, month: currentMonth, year: currentYear } },
        create: {
          employeeId: data.employeeId,
          month: currentMonth,
          year: currentYear,
          basicSalary,
          totalAllowances,
          totalDeductions,
          totalBonuses: 0,
          netSalary,
          status: 'PROCESSED'
        },
        update: {
          basicSalary,
          totalAllowances,
          totalDeductions,
          netSalary
        }
      });

      return res.status(201).json({
        success: true,
        data: toFlatStructure(created),
        message: 'Salary structure created successfully'
      });
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: error.issues.map((i: any) => i.message).join(', '),
        errors: error.issues
      });
    }
    console.error('Upsert salary structure error:', error);
    res.status(500).json({ success: false, message: 'Failed to save salary structure' });
  }
};

export const processMonthlyPayroll = async (req: Request, res: Response) => {
  try {
    const { month, year } = processPayrollSchema.parse(req.body);

    const activeEmployees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      include: {
        salaryStructure: {
          include: { allowances: true, deductions: true }
        }
      }
    });

    let processedCount = 0;

    for (const emp of activeEmployees) {
      if (!emp.salaryStructure) continue;

      const basic = emp.salaryStructure.basicSalary || 0;
      const totalAllowances = emp.salaryStructure.allowances?.reduce((sum: number, a: any) => sum + a.amount, 0) || 0;
      const totalDeductions = emp.salaryStructure.deductions?.reduce((sum: number, d: any) => sum + d.amount, 0) || 0;
      const totalBonuses = 0;
      const netSalary = basic + totalAllowances - totalDeductions + totalBonuses;

      await prisma.salaryRecord.upsert({
        where: {
          employeeId_month_year: {
            employeeId: emp.id,
            month,
            year
          }
        },
        create: {
          employeeId: emp.id,
          month,
          year,
          basicSalary: basic,
          totalAllowances,
          totalDeductions,
          totalBonuses,
          netSalary,
          status: 'PROCESSED'
        },
        update: {
          basicSalary: basic,
          totalAllowances,
          totalDeductions,
          netSalary,
          status: 'PROCESSED'
        }
      });
      processedCount++;
    }

    res.status(200).json({
      success: true,
      message: `Successfully processed payroll for ${processedCount} employees for ${month}/${year}`,
      processedCount
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error('Process payroll error:', error);
    res.status(500).json({ success: false, message: 'Failed to process payroll' });
  }
};

export const updateSalaryRecordStatus = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    if (!['PENDING', 'PROCESSED', 'PAID'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid salary status' });
    }

    const updated = await prisma.salaryRecord.update({
      where: { id },
      data: { status }
    });

    res.status(200).json({ success: true, data: updated, message: `Salary status updated to ${status}` });
  } catch (error) {
    console.error('Update salary status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update salary status' });
  }
};
