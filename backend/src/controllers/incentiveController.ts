import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import {
  calculateEmployeePerformance,
  snapshotMonthlyPerformanceScores
} from '../services/performanceCalculationService';
import { payIncentive } from '../services/payrollAccountingService';

/**
 * Audit log helper for incentive and performance modifications
 */
async function logIncentiveAudit(
  reqUser: { userId: string; email?: string; roleName?: string } | undefined,
  action: string,
  recordId: string,
  details: string,
  previousValue?: any,
  newValue?: any
) {
  try {
    const userId = reqUser?.userId || null;
    const userEmail = reqUser?.email || 'System';
    const userRole = reqUser?.roleName || 'Admin';

    await prisma.auditLog.create({
      data: {
        userId,
        userEmail,
        userRole,
        action,
        module: 'INCENTIVES_PERFORMANCE',
        recordId,
        details,
        previousValue: previousValue ? JSON.stringify(previousValue) : null,
        newValue: newValue ? JSON.stringify(newValue) : null,
        status: 'SUCCESS'
      }
    });
  } catch (err: any) {
    console.warn('Audit log creation error:', err.message);
  }
}

/**
 * 1. GET /api/incentives/performance
 * Calculates/fetches performance scores for employees for a given month and year.
 * Allowed: CEO, Admin, HR, Department Managers (filtered to department)
 */
export const getPerformanceScores = async (req: Request, res: Response): Promise<void> => {
  try {
    const month = parseInt(req.query.month as string) || (new Date().getMonth() + 1);
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const departmentQuery = (req.query.department as string) || 'ALL';
    const refresh = req.query.refresh === 'true';

    const user = req.user!;
    const userRole = (user.roleName || '').toLowerCase();
    const userPerms = user.permissions || [];
    const isSuperOrAdmin =
      userRole.includes('ceo') ||
      userRole.includes('admin') ||
      userRole.includes('super');

    // Department manager check: if user is not super/admin, check their employee department
    let allowedDepartment: string | null = null;
    let currentEmployeeId: string | null = null;

    const callerEmployee = await prisma.employee.findFirst({
      where: { userId: user.userId },
      include: { department: true }
    });

    if (callerEmployee) {
      currentEmployeeId = callerEmployee.id;
      if (!isSuperOrAdmin && !userPerms.includes('hr:view')) {
        // Restricted to their department
        allowedDepartment = callerEmployee.department?.name || null;
      }
    }

    const effectiveDepartment = allowedDepartment || (departmentQuery !== 'ALL' ? departmentQuery : undefined);

    // If refresh requested or snapshots don't exist yet, run snapshot calculations
    let scores = await prisma.employeePerformanceScore.findMany({
      where: {
        month,
        year,
        ...(effectiveDepartment ? { department: { contains: effectiveDepartment, mode: 'insensitive' } } : {})
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            status: true,
            user: { select: { email: true } },
            department: { select: { name: true } },
            designation: { select: { name: true } }
          }
        },
        incentives: {
          where: { month, year }
        }
      },
      orderBy: [{ score: 'desc' }]
    });

    if (scores.length === 0 || refresh) {
      await snapshotMonthlyPerformanceScores(month, year, effectiveDepartment);
      scores = await prisma.employeePerformanceScore.findMany({
        where: {
          month,
          year,
          ...(effectiveDepartment ? { department: { contains: effectiveDepartment, mode: 'insensitive' } } : {})
        },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              status: true,
              user: { select: { email: true } },
              department: { select: { name: true } },
              designation: { select: { name: true } }
            }
          },
          incentives: {
            where: { month, year }
          }
        },
        orderBy: [{ score: 'desc' }]
      });
    }

    // Format response
    const formatted = scores.map(s => ({
      id: s.id,
      employeeId: s.employeeId,
      employeeName: `${s.employee.firstName} ${s.employee.lastName}`.trim(),
      email: s.employee.user?.email || '',
      department: s.department,
      designation: s.designation || s.employee.designation?.name || 'Staff',
      month: s.month,
      year: s.year,
      score: s.score,
      grade: s.grade,
      hasData: s.hasData,
      summary: s.summary,
      metrics: s.metrics,
      unavailableMetrics: s.unavailableMetrics,
      calculatedAt: s.calculatedAt,
      incentive: s.incentives?.[0] || null
    }));

    res.json({
      success: true,
      data: {
        month,
        year,
        department: effectiveDepartment || 'ALL',
        count: formatted.length,
        scores: formatted
      }
    });
  } catch (error: any) {
    console.error('Error fetching performance scores:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve performance scores' });
  }
};

/**
 * 2. GET /api/incentives/employee/:id
 * Individual performance history and incentive records for a specific employee.
 * Access: Super Admin, Admin, HR, Department Manager, or the employee themself.
 */
export const getEmployeePerformanceDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const employeeId = req.params.id as string;
    const user = req.user!;
    const userRole = (user.roleName || '').toLowerCase();
    const userPerms = user.permissions || [];
    const isSuperOrAdmin =
      userRole.includes('ceo') ||
      userRole.includes('admin') ||
      userRole.includes('super');

    // IDOR Protection: Employees can only view their own history
    const callerEmployee = await prisma.employee.findFirst({
      where: { userId: user.userId }
    });

    if (!isSuperOrAdmin && !userPerms.includes('hr:view')) {
      if (!callerEmployee || callerEmployee.id !== employeeId) {
        res.status(403).json({ error: 'Access denied: You can only view your own performance records' });
        return;
      }
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: true,
        designation: true,
        user: { select: { email: true } }
      }
    });

    if (!employee) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    // Retrieve score history across last 12 months
    const history = await prisma.employeePerformanceScore.findMany({
      where: { employeeId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 12
    });

    // Retrieve incentive records
    const incentives = await prisma.employeeIncentive.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
      include: {
        transaction: {
          select: {
            id: true,
            referenceNumber: true,
            paymentMethod: true,
            status: true,
            createdAt: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        employee: {
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`.trim(),
          email: employee.user?.email || '',
          department: employee.department?.name,
          designation: employee.designation?.name,
          joiningDate: employee.joiningDate
        },
        performanceHistory: history,
        incentives
      }
    });
  } catch (error: any) {
    console.error('Error fetching employee performance history:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch employee performance details' });
  }
};

/**
 * 3. GET /api/incentives/my-performance
 * Returns the currently authenticated employee's performance score and incentive history.
 */
export const getMyPerformance = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const employee = await prisma.employee.findFirst({
      where: { userId: user.userId },
      include: {
        department: true,
        designation: true
      }
    });

    if (!employee) {
      res.status(404).json({ error: 'No employee record associated with your user account' });
      return;
    }

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Fetch current month score (calculating if not yet stored)
    let currentScore = await prisma.employeePerformanceScore.findUnique({
      where: {
        employeeId_month_year: {
          employeeId: employee.id,
          month: currentMonth,
          year: currentYear
        }
      }
    });

    if (!currentScore) {
      const liveEval = await calculateEmployeePerformance(employee.id, currentMonth, currentYear);
      currentScore = await prisma.employeePerformanceScore.create({
        data: {
          employeeId: employee.id,
          month: currentMonth,
          year: currentYear,
          department: liveEval.department,
          designation: employee.designation?.name,
          score: liveEval.score,
          grade: liveEval.grade,
          hasData: liveEval.hasData,
          summary: liveEval.summary,
          metrics: liveEval.metrics as any,
          unavailableMetrics: liveEval.unavailableMetrics as any
        }
      });
    }

    const [history, incentives] = await Promise.all([
      prisma.employeePerformanceScore.findMany({
        where: { employeeId: employee.id },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: 12
      }),
      prisma.employeeIncentive.findMany({
        where: { employeeId: employee.id },
        orderBy: { createdAt: 'desc' },
        include: {
          transaction: {
            select: {
              referenceNumber: true,
              paymentMethod: true,
              createdAt: true
            }
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        employee: {
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`.trim(),
          department: employee.department?.name,
          designation: employee.designation?.name
        },
        currentPerformance: currentScore,
        history,
        incentives
      }
    });
  } catch (error: any) {
    console.error('Error fetching personal performance:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch personal performance' });
  }
};

/**
 * 4. POST /api/incentives/create-or-update
 * Admin / CEO sets or edits the manual incentive amount and remarks for an employee.
 * Only CEO / Admin / Super Admin can set incentive amounts.
 */
export const createOrUpdateIncentive = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      employeeId,
      month,
      year,
      amount,
      reason,
      notes,
      type = 'INCENTIVE'
    } = req.body;

    if (!employeeId || month === undefined || month === null || year === undefined || year === null || amount === undefined || amount === null) {
      res.status(400).json({ error: 'employeeId, month, year, and amount are required' });
      return;
    }

    const parsedMonth = parseInt(month, 10);
    const parsedYear = parseInt(year, 10);

    if (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
      res.status(400).json({ error: 'month must be an integer between 1 and 12' });
      return;
    }

    if (isNaN(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
      res.status(400).json({ error: 'year must be a valid 4-digit year' });
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      res.status(400).json({ error: 'Incentive amount must be a non-negative number' });
      return;
    }

    // Verify employee exists
    const employeeExists = await prisma.employee.findUnique({
      where: { id: employeeId }
    });
    if (!employeeExists) {
      res.status(404).json({ error: `Employee with ID ${employeeId} does not exist` });
      return;
    }

    const user = req.user!;
    const period = `${parsedMonth}/${parsedYear}`;

    // Find if a score snapshot exists for linking
    const scoreSnapshot = await prisma.employeePerformanceScore.findUnique({
      where: {
        employeeId_month_year: {
          employeeId,
          month: parsedMonth,
          year: parsedYear
        }
      }
    });

    // Check if an incentive already exists and is already PAID
    const existing = await prisma.employeeIncentive.findUnique({
      where: {
        employeeId_month_year: {
          employeeId,
          month: parsedMonth,
          year: parsedYear
        }
      }
    });

    if (existing && existing.status === 'PAID') {
      res.status(400).json({ error: 'Cannot modify an incentive that has already been PAID' });
      return;
    }

    const defaultReason = reason || `Performance Incentive for ${period}`;

    // Atomic Prisma Upsert using the compound unique key: employeeId_month_year
    const incentive = await prisma.employeeIncentive.upsert({
      where: {
        employeeId_month_year: {
          employeeId,
          month: parsedMonth,
          year: parsedYear
        }
      },
      create: {
        employeeId,
        amount: numAmount,
        type,
        reason: defaultReason,
        period,
        month: parsedMonth,
        year: parsedYear,
        status: 'PENDING',
        createdById: user.userId,
        notes: notes || null,
        scoreSnapshotId: scoreSnapshot?.id || null
      },
      update: {
        amount: numAmount,
        reason: defaultReason,
        notes: notes !== undefined ? notes : existing?.notes,
        status: 'PENDING', // reset to pending for review when amount is updated
        scoreSnapshotId: scoreSnapshot?.id || existing?.scoreSnapshotId
      }
    });

    await logIncentiveAudit(
      user,
      existing ? 'UPDATE_INCENTIVE_AMOUNT' : 'CREATE_INCENTIVE',
      incentive.id,
      `${existing ? 'Updated' : 'Created'} incentive amount to ₹${numAmount} for period ${period}`,
      existing ? { amount: existing.amount, status: existing.status } : null,
      { amount: numAmount, period, employeeId, status: 'PENDING' }
    );

    res.json({
      success: true,
      message: 'Incentive amount saved successfully and submitted for approval',
      data: incentive
    });
  } catch (error: any) {
    console.error('Error saving incentive:', error);
    res.status(500).json({ error: error.message || 'Failed to save incentive' });
  }
};

/**
 * 5. PATCH /api/incentives/:id/status
 * CEO / Super Admin approves or rejects an incentive.
 */
export const updateIncentiveStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status, rejectionReason, notes } = req.body;
    const user = req.user!;

    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
      res.status(400).json({ error: 'Status must be APPROVED, REJECTED, or PENDING' });
      return;
    }

    const existing = await prisma.employeeIncentive.findUnique({
      where: { id },
      include: { employee: true }
    });

    if (!existing) {
      res.status(404).json({ error: 'Incentive record not found' });
      return;
    }

    if (existing.status === 'PAID') {
      res.status(400).json({ error: 'Cannot change status of an already PAID incentive' });
      return;
    }

    const updated = await prisma.employeeIncentive.update({
      where: { id },
      data: {
        status,
        approvedById: status === 'APPROVED' ? user.userId : null,
        rejectionReason: status === 'REJECTED' ? (rejectionReason || 'Rejected by Admin') : null,
        notes: notes !== undefined ? notes : existing.notes
      }
    });

    await logIncentiveAudit(
      user,
      `INCENTIVE_${status}`,
      updated.id,
      `Incentive marked as ${status} by ${user.email} (Amount: ₹${updated.amount})`,
      { status: existing.status },
      { status, rejectionReason }
    );

    res.json({
      success: true,
      message: `Incentive successfully marked as ${status}`,
      data: updated
    });
  } catch (error: any) {
    console.error('Error updating incentive status:', error);
    res.status(500).json({ error: error.message || 'Failed to update incentive status' });
  }
};

/**
 * 6. POST /api/incentives/:id/payout
 * Accountant processes payment for an APPROVED incentive.
 * Generates official FinancialTransaction and marks incentive as PAID.
 */
export const processIncentivePayout = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { paymentMethod = 'BANK_TRANSFER', referenceNumber } = req.body;
    const user = req.user!;

    const incentive = await prisma.employeeIncentive.findUnique({
      where: { id },
      include: { employee: true }
    });

    if (!incentive) {
      res.status(404).json({ error: 'Incentive record not found' });
      return;
    }

    if (incentive.status !== 'APPROVED') {
      res.status(400).json({ error: `Only APPROVED incentives can be paid. Current status: ${incentive.status}` });
      return;
    }

    if (incentive.transactionId) {
      res.status(400).json({ error: 'This incentive has already been paid.' });
      return;
    }

    // Execute atomic payment via payroll accounting service
    const result = await payIncentive(id, user.userId, paymentMethod);

    // Update reference if provided
    if (referenceNumber) {
      await prisma.employeeIncentive.update({
        where: { id },
        data: {
          paymentReference: referenceNumber,
          paymentMethod,
          paidAt: new Date()
        }
      });
    }

    await logIncentiveAudit(
      user,
      'INCENTIVE_PAYOUT_COMPLETED',
      id,
      `Processed incentive payout of ₹${incentive.amount} to ${incentive.employee.firstName} ${incentive.employee.lastName} via ${paymentMethod}`,
      { status: 'APPROVED' },
      { status: 'PAID', paymentMethod, referenceNumber }
    );

    res.json({
      success: true,
      message: 'Incentive payout processed successfully and financial transaction created',
      data: result
    });
  } catch (error: any) {
    console.error('Error processing incentive payout:', error);
    res.status(500).json({ error: error.message || 'Failed to process incentive payout' });
  }
};

/**
 * 7. GET /api/incentives/payouts
 * Returns all incentives (Approved, Pending, Paid) for accounting reconciliation.
 */
export const getAllIncentivePayouts = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.query.status as string;
    const includePendingAll = req.query.includePendingAll === 'true';
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;

    let where: any = {};
    if (includePendingAll) {
      // Return all unreviewed pending incentives across all periods, plus any records matching the current month/year
      where = {
        OR: [
          { status: 'PENDING' },
          {
            ...(status && status !== 'ALL' ? { status } : {}),
            ...(month ? { month } : {}),
            ...(year ? { year } : {})
          }
        ]
      };
    } else {
      if (status && status !== 'ALL') {
        where.status = status;
      }
      if (month) where.month = month;
      if (year) where.year = year;
    }

    const incentives = await prisma.employeeIncentive.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            user: { select: { email: true } },
            department: { select: { name: true } },
            designation: { select: { name: true } }
          }
        },
        transaction: {
          select: {
            id: true,
            referenceNumber: true,
            paymentMethod: true,
            status: true,
            createdAt: true
          }
        },
        scoreSnapshot: {
          select: {
            score: true,
            grade: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: incentives.map(i => ({
        ...i,
        employee: {
          ...i.employee,
          email: i.employee.user?.email || ''
        }
      }))
    });
  } catch (error: any) {
    console.error('Error fetching incentive payouts:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch incentive payouts' });
  }
};
