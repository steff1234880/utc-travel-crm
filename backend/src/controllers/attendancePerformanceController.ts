import { Request, Response } from 'express';
import prisma from '../utils/prisma';

// Helper to determine role category
function getRoleCategory(roleName?: string, designationName?: string, departmentName?: string): 'SALES' | 'OPERATIONS' | 'GENERAL' {
  const combined = `${roleName || ''} ${designationName || ''} ${departmentName || ''}`.toLowerCase();
  if (combined.includes('sales') || combined.includes('crm') || combined.includes('enquiry') || combined.includes('lead')) {
    return 'SALES';
  }
  if (combined.includes('operation') || combined.includes('tour') || combined.includes('coordinator') || combined.includes('booking') || combined.includes('ticket')) {
    return 'OPERATIONS';
  }
  return 'GENERAL';
}

// Calculate genuine performance score from real underlying records and targets
interface PerformanceScoreParams {
  category: 'SALES' | 'OPERATIONS' | 'GENERAL';
  attendancePercentage?: number | null;
  tasksAssigned: number;
  tasksCompleted: number;
  leadsHandled: number;
  leadsConverted: number;
  bookingsPrepared: number;
  toursCoordinated: number;
  targets: any[];
}

function calculateEmployeeScore(params: PerformanceScoreParams) {
  const {
    category,
    tasksAssigned,
    tasksCompleted,
    leadsHandled,
    leadsConverted,
    bookingsPrepared,
    toursCoordinated,
    targets
  } = params;

  const breakdown: Array<{ metric: string; weight: number; score: number; maxScore: number; note: string }> = [];
  const unavailableMetrics: string[] = [];

  // Check if ANY genuine performance activity or targets exist for this employee in this period
  const hasTasks = tasksAssigned > 0 || tasksCompleted > 0;
  const hasSales = leadsHandled > 0 || leadsConverted > 0;
  const hasBookingsOrTours = bookingsPrepared > 0 || toursCoordinated > 0;
  const hasTargets = targets && targets.length > 0;

  const hasPerformanceData = hasTasks || hasSales || hasBookingsOrTours || hasTargets;

  if (!hasPerformanceData) {
    return {
      hasPerformanceData: false,
      totalScore: null as number | null,
      grade: null as string | null,
      breakdown: [],
      unavailableMetrics: ['No performance records (tasks, sales leads, bookings, or targets) recorded for this employee in this period']
    };
  }

  // Active scoring components based on genuine records
  const components: Array<{ name: string; scorePct: number; baseWeight: number; note: string }> = [];

  if (category === 'SALES') {
    // 1. Sales Lead Conversion Rate (if leads handled)
    if (leadsHandled > 0) {
      const convRate = Math.min(1, leadsConverted / leadsHandled);
      const convPct = Math.round(convRate * 100);
      components.push({
        name: 'Sales Conversion & Deals Won',
        scorePct: convPct,
        baseWeight: 50,
        note: `${leadsConverted} converted out of ${leadsHandled} leads (${convPct}%)`
      });
    } else {
      unavailableMetrics.push('Sales Leads: No active leads assigned in this period');
    }

    // 2. Sales Targets Achievement (if targets configured)
    if (targets && targets.length > 0) {
      let totalAchievementRate = 0;
      targets.forEach(t => {
        const rate = t.targetValue > 0 ? (t.achievedValue || 0) / t.targetValue : 1;
        totalAchievementRate += Math.min(1.2, rate);
      });
      const avgTargetPct = Math.min(100, Math.round((totalAchievementRate / targets.length) * 100));
      components.push({
        name: 'Sales Target Achievement',
        scorePct: avgTargetPct,
        baseWeight: 35,
        note: `Average target achievement: ${avgTargetPct}% across ${targets.length} target(s)`
      });
    } else {
      unavailableMetrics.push('Sales Targets: No configured sales targets for this month');
    }

    // 3. Operational & Follow-up Tasks (if tasks assigned)
    if (tasksAssigned > 0) {
      const effectiveAssigned = Math.max(tasksAssigned, tasksCompleted);
      const taskRate = Math.min(1, tasksCompleted / effectiveAssigned);
      const taskPct = Math.round(taskRate * 100);
      components.push({
        name: 'Sales Tasks & Follow-ups',
        scorePct: taskPct,
        baseWeight: 15,
        note: `${tasksCompleted} of ${effectiveAssigned} tasks completed (${taskPct}%)`
      });
    }

  } else if (category === 'OPERATIONS') {
    // 1. Operational Tasks Execution (if tasks assigned)
    if (tasksAssigned > 0) {
      const effectiveAssigned = Math.max(tasksAssigned, tasksCompleted);
      const taskRate = Math.min(1, tasksCompleted / effectiveAssigned);
      const taskPct = Math.round(taskRate * 100);
      components.push({
        name: 'Operational Tasks Execution',
        scorePct: taskPct,
        baseWeight: 50,
        note: `${tasksCompleted} of ${effectiveAssigned} tasks completed (${taskPct}%)`
      });
    } else {
      unavailableMetrics.push('Operational Tasks: No tasks assigned in this month');
    }

    // 2. Bookings Prepared & Tours Coordinated
    if (hasBookingsOrTours) {
      const totalOps = bookingsPrepared + toursCoordinated;
      const opsPct = Math.min(100, totalOps >= 5 ? 100 : totalOps * 20);
      components.push({
        name: 'Bookings Prepared & Tours Coordinated',
        scorePct: opsPct,
        baseWeight: 35,
        note: `${bookingsPrepared} bookings prepared, ${toursCoordinated} tours coordinated`
      });
    }

    // 3. Targets (if configured)
    if (targets && targets.length > 0) {
      let totalRate = 0;
      targets.forEach(t => {
        const rate = t.targetValue > 0 ? (t.achievedValue || 0) / t.targetValue : 1;
        totalRate += Math.min(1.2, rate);
      });
      const avgPct = Math.min(100, Math.round((totalRate / targets.length) * 100));
      components.push({
        name: 'Operational Targets',
        scorePct: avgPct,
        baseWeight: 15,
        note: `Average target achievement: ${avgPct}%`
      });
    }

  } else {
    // GENERAL / ADMIN / HR
    if (tasksAssigned > 0) {
      const effectiveAssigned = Math.max(tasksAssigned, tasksCompleted);
      const taskRate = Math.min(1, tasksCompleted / effectiveAssigned);
      const taskPct = Math.round(taskRate * 100);
      components.push({
        name: 'Assigned Responsibilities & Tasks',
        scorePct: taskPct,
        baseWeight: 70,
        note: `${tasksCompleted} of ${effectiveAssigned} tasks completed (${taskPct}%)`
      });
    } else {
      unavailableMetrics.push('Tasks: No tasks assigned in this month');
    }

    if (targets && targets.length > 0) {
      let totalRate = 0;
      targets.forEach(t => {
        const rate = t.targetValue > 0 ? (t.achievedValue || 0) / t.targetValue : 1;
        totalRate += Math.min(1.2, rate);
      });
      const avgPct = Math.min(100, Math.round((totalRate / targets.length) * 100));
      components.push({
        name: 'Configured Targets',
        scorePct: avgPct,
        baseWeight: 30,
        note: `Average target achievement: ${avgPct}%`
      });
    }
  }

  if (components.length === 0) {
    return {
      hasPerformanceData: false,
      totalScore: null as number | null,
      grade: null as string | null,
      breakdown: [],
      unavailableMetrics: ['No active performance benchmarks or records available for this role in this period']
    };
  }

  // Normalize component weights so they sum to 100%
  const totalBaseWeight = components.reduce((acc, c) => acc + c.baseWeight, 0);
  let totalScore = 0;

  components.forEach(c => {
    const normalizedWeight = Math.round((c.baseWeight / totalBaseWeight) * 100);
    const scoreVal = Math.round((c.scorePct / 100) * normalizedWeight);
    totalScore += scoreVal;
    breakdown.push({
      metric: c.name,
      weight: normalizedWeight,
      score: scoreVal,
      maxScore: normalizedWeight,
      note: c.note
    });
  });

  totalScore = Math.min(100, Math.max(0, Math.round(totalScore)));

  let grade = 'SATISFACTORY';
  if (totalScore >= 85) grade = 'EXCELLENT';
  else if (totalScore >= 70) grade = 'GOOD';
  else if (totalScore >= 50) grade = 'SATISFACTORY';
  else grade = 'NEEDS_IMPROVEMENT';

  return {
    hasPerformanceData: true,
    totalScore,
    grade,
    breakdown,
    unavailableMetrics
  };
}

// 1. Get Employee Attendance & Performance Details
export const getEmployeeAttendanceAndPerformance = async (req: Request, res: Response) => {
  try {
    const employeeId = req.params.id as string;
    const now = new Date();
    const month = parseInt(req.query.month as string) || (now.getMonth() + 1);
    const year = parseInt(req.query.year as string) || now.getFullYear();

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: true,
        designation: true,
        user: { select: { email: true, role: true } }
      }
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // RBAC: Check requester is HR/Admin or self
    const requesterRole = req.user?.roleName || '';
    const normalizedRole = requesterRole.toUpperCase().trim();
    const isHRorAdmin = normalizedRole.includes('SUPER') || normalizedRole.includes('CEO') || 
                        normalizedRole.includes('ADMIN') || normalizedRole === 'HR_MANAGER';
    const isSelf = employee.userId === req.user?.userId;

    if (!isHRorAdmin && !isSelf) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access restricted: You do not have permission to view this employee’s attendance and performance records.' 
      });
    }

    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month - 1, lastDay, 23, 59, 59, 999));

    // Fetch Attendance records for this month
    const attendances = await prisma.employeeAttendance.findMany({
      where: {
        employeeId,
        date: { gte: startDate, lte: endDate }
      },
      orderBy: { date: 'asc' }
    });

    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let onLeaveCount = 0;

    attendances.forEach(att => {
      const s = att.status.toUpperCase();
      if (s === 'PRESENT') presentCount++;
      else if (s === 'ABSENT') absentCount++;
      else if (s === 'LATE') lateCount++;
      else if (s === 'HALF_DAY') halfDayCount++;
      else if (s === 'ON_LEAVE') onLeaveCount++;
    });

    const totalLoggedDays = attendances.length;
    const attendancePercentage = totalLoggedDays > 0
      ? Math.round(((presentCount + lateCount + onLeaveCount + 0.5 * halfDayCount) / totalLoggedDays) * 100 * 10) / 10
      : null;

    // Daily records formatted
    const dailyRecords = attendances.map(att => {
      const d = new Date(att.date);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return {
        id: att.id,
        date: d.toISOString().split('T')[0],
        dayOfWeek: days[d.getDay()],
        status: att.status,
        checkInTime: att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
        checkOutTime: att.checkOutTime ? new Date(att.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
        workingHours: att.workingHours !== null && att.workingHours !== undefined
          ? att.workingHours
          : (att.status === 'PRESENT' ? 8.5 : att.status === 'LATE' ? 8.0 : att.status === 'HALF_DAY' ? 4.0 : 0),
        notes: att.notes
      };
    });

    // Role category
    const roleCategory = getRoleCategory(employee.user?.role?.name, employee.designation?.name, employee.department?.name);

    // Operational tasks
    const tasksAssigned = await prisma.operationalTask.count({
      where: {
        assignedEmployeeId: employeeId,
        createdAt: { gte: startDate, lte: endDate }
      }
    });

    const tasksCompleted = await prisma.operationalTask.count({
      where: {
        OR: [
          { assignedEmployeeId: employeeId, status: 'Completed' },
          { completedById: employeeId, status: 'Completed' }
        ],
        updatedAt: { gte: startDate, lte: endDate }
      }
    });

    // Sales leads
    const leadsHandled = await prisma.salesLead.count({
      where: {
        assignedToId: employeeId,
        createdAt: { gte: startDate, lte: endDate }
      }
    });

    const leadsConverted = await prisma.salesLead.count({
      where: {
        assignedToId: employeeId,
        status: { in: ['WON', 'CONVERTED', 'Closed Won', 'WON_DEAL'] },
        updatedAt: { gte: startDate, lte: endDate }
      }
    });

    // Enquiries
    const enquiriesAssigned = await prisma.enquiryAssignment.count({
      where: {
        employeeId,
        assignedAt: { gte: startDate, lte: endDate }
      }
    });

    // Quotations created
    const quotationsCreated = await prisma.quotation.count({
      where: {
        salesLead: { assignedToId: employeeId },
        createdAt: { gte: startDate, lte: endDate }
      }
    });

    // Bookings prepared
    const bookingsPrepared = await prisma.bookingPreparation.count({
      where: {
        preparedById: employeeId,
        createdAt: { gte: startDate, lte: endDate }
      }
    });

    // Tours coordinated
    const toursCoordinated = await prisma.tour.count({
      where: {
        coordinatorId: employeeId,
        createdAt: { gte: startDate, lte: endDate }
      }
    });

    // Targets
    const targets = await prisma.employeeTarget.findMany({
      where: {
        employeeId,
        month,
        year
      }
    });

    // Calculate transparent score based genuinely on recorded activity
    const scoreResult = calculateEmployeeScore({
      category: roleCategory,
      attendancePercentage,
      tasksAssigned,
      tasksCompleted,
      leadsHandled,
      leadsConverted,
      bookingsPrepared,
      toursCoordinated,
      targets
    });

    // Performance trend for past 4 months using strict UTC month boundaries
    const monthlyTrend = [];
    for (let i = 3; i >= 0; i--) {
      const trendDate = new Date(Date.UTC(year, month - 1 - i, 1));
      const tMonth = trendDate.getUTCMonth() + 1;
      const tYear = trendDate.getUTCFullYear();
      const tLastDay = new Date(Date.UTC(tYear, tMonth, 0)).getUTCDate();
      const tStart = new Date(Date.UTC(tYear, tMonth - 1, 1, 0, 0, 0, 0));
      const tEnd = new Date(Date.UTC(tYear, tMonth - 1, tLastDay, 23, 59, 59, 999));

      const tAtts = await prisma.employeeAttendance.findMany({
        where: { employeeId, date: { gte: tStart, lte: tEnd } }
      });

      let tPres = 0, tLate = 0, tHalf = 0, tLeave = 0;
      tAtts.forEach(a => {
        if (a.status === 'PRESENT') tPres++;
        else if (a.status === 'LATE') tLate++;
        else if (a.status === 'HALF_DAY') tHalf++;
        else if (a.status === 'ON_LEAVE') tLeave++;
      });
      const tAttPct = tAtts.length > 0 ? Math.round(((tPres + tLate + tLeave + 0.5 * tHalf) / tAtts.length) * 100) : null;

      const tTasksComp = await prisma.operationalTask.count({
        where: {
          OR: [{ assignedEmployeeId: employeeId, status: 'Completed' }, { completedById: employeeId, status: 'Completed' }],
          updatedAt: { gte: tStart, lte: tEnd }
        }
      });

      const tConverted = await prisma.salesLead.count({
        where: {
          assignedToId: employeeId,
          status: { in: ['WON', 'CONVERTED', 'Closed Won'] },
          updatedAt: { gte: tStart, lte: tEnd }
        }
      });

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      monthlyTrend.push({
        monthName: `${monthNames[tMonth - 1]} ${tYear}`,
        month: tMonth,
        year: tYear,
        attendancePercentage: tAttPct,
        tasksCompleted: tTasksComp,
        leadsConverted: tConverted,
        isCurrent: tMonth === month && tYear === year
      });
    }

    res.status(200).json({
      success: true,
      data: {
        employee: {
          id: employee.id,
          employeeId: employee.employeeId,
          firstName: employee.firstName,
          lastName: employee.lastName,
          profilePhoto: employee.profilePhoto,
          email: employee.user?.email,
          department: employee.department?.name || 'General',
          designation: employee.designation?.name || 'Staff',
          role: employee.user?.role?.name || 'Employee',
          status: employee.status,
          joiningDate: employee.joiningDate
        },
        period: {
          month,
          year,
          monthName: new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' })
        },
        attendance: {
          present: presentCount,
          absent: absentCount,
          late: lateCount,
          halfDay: halfDayCount,
          onLeave: onLeaveCount,
          totalLoggedDays,
          attendancePercentage,
          dailyRecords
        },
        performance: {
          roleCategory,
          score: scoreResult.totalScore,
          scoreGrade: scoreResult.grade,
          scoringBreakdown: scoreResult.breakdown,
          unavailableMetrics: scoreResult.unavailableMetrics,
          tasks: {
            assigned: tasksAssigned,
            completed: tasksCompleted,
            completionRate: tasksAssigned > 0 ? Math.round((tasksCompleted / tasksAssigned) * 100) : null,
            isApplicable: roleCategory === 'OPERATIONS' || tasksAssigned > 0
          },
          sales: {
            leadsHandled,
            leadsConverted,
            conversionRate: leadsHandled > 0 ? Math.round((leadsConverted / leadsHandled) * 100) : null,
            enquiriesAssigned,
            quotationsCreated,
            isApplicable: roleCategory === 'SALES' || leadsHandled > 0
          },
          bookings: {
            bookingsPrepared,
            toursCoordinated,
            isApplicable: roleCategory === 'OPERATIONS' || bookingsPrepared > 0
          },
          targets: {
            hasTargets: targets.length > 0,
            items: targets.map(t => ({
              type: t.targetType,
              target: t.targetValue,
              achieved: t.achievedValue || 0,
              unit: t.unit,
              percentage: t.targetValue > 0 ? Math.round(((t.achievedValue || 0) / t.targetValue) * 100) : 0
            }))
          },
          monthlyTrend
        }
      }
    });

  } catch (error) {
    console.error('Error fetching employee attendance & performance:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance & performance details' });
  }
};

// 2. Get Monthly Top Performers & Rankings
export const getMonthlyTopPerformers = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month as string) || (now.getMonth() + 1);
    const year = parseInt(req.query.year as string) || now.getFullYear();
    const departmentId = req.query.departmentId as string;
    const roleFilter = req.query.role as string;

    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month - 1, lastDay, 23, 59, 59, 999));

    // Where condition for active employees
    const whereCondition: any = { status: 'ACTIVE' };
    if (departmentId && departmentId !== 'ALL') {
      whereCondition.departmentId = departmentId;
    }

    const employees = await prisma.employee.findMany({
      where: whereCondition,
      include: {
        department: true,
        designation: true,
        user: { select: { email: true, role: true } }
      }
    });

    const evaluatedEmployees: any[] = [];

    for (const emp of employees) {
      if (roleFilter && roleFilter !== 'ALL') {
        const empRole = emp.user?.role?.name || '';
        if (empRole.toLowerCase() !== roleFilter.toLowerCase()) {
          continue;
        }
      }

      // Attendances
      const attendances = await prisma.employeeAttendance.findMany({
        where: { employeeId: emp.id, date: { gte: startDate, lte: endDate } }
      });

      let presentCount = 0, lateCount = 0, halfDayCount = 0, onLeaveCount = 0;
      attendances.forEach(a => {
        if (a.status === 'PRESENT') presentCount++;
        else if (a.status === 'LATE') lateCount++;
        else if (a.status === 'HALF_DAY') halfDayCount++;
        else if (a.status === 'ON_LEAVE') onLeaveCount++;
      });
      const totalLogged = attendances.length;
      const attendancePercentage = totalLogged > 0
        ? Math.round(((presentCount + lateCount + onLeaveCount + 0.5 * halfDayCount) / totalLogged) * 100 * 10) / 10
        : null;

      const roleCategory = getRoleCategory(emp.user?.role?.name, emp.designation?.name, emp.department?.name);

      // Tasks
      const tasksAssigned = await prisma.operationalTask.count({
        where: { assignedEmployeeId: emp.id, createdAt: { gte: startDate, lte: endDate } }
      });
      const tasksCompleted = await prisma.operationalTask.count({
        where: {
          OR: [{ assignedEmployeeId: emp.id, status: 'Completed' }, { completedById: emp.id, status: 'Completed' }],
          updatedAt: { gte: startDate, lte: endDate }
        }
      });

      // Sales
      const leadsHandled = await prisma.salesLead.count({
        where: { assignedToId: emp.id, createdAt: { gte: startDate, lte: endDate } }
      });
      const leadsConverted = await prisma.salesLead.count({
        where: {
          assignedToId: emp.id,
          status: { in: ['WON', 'CONVERTED', 'Closed Won', 'WON_DEAL'] },
          updatedAt: { gte: startDate, lte: endDate }
        }
      });

      // Bookings
      const bookingsPrepared = await prisma.bookingPreparation.count({
        where: { preparedById: emp.id, createdAt: { gte: startDate, lte: endDate } }
      });

      // Tours coordinated
      const toursCoordinated = await prisma.tour.count({
        where: { coordinatorId: emp.id, createdAt: { gte: startDate, lte: endDate } }
      });

      // Targets
      const targets = await prisma.employeeTarget.findMany({
        where: { employeeId: emp.id, month, year }
      });

      const scoreResult = calculateEmployeeScore({
        category: roleCategory,
        attendancePercentage,
        tasksAssigned,
        tasksCompleted,
        leadsHandled,
        leadsConverted,
        bookingsPrepared,
        toursCoordinated,
        targets
      });

      evaluatedEmployees.push({
        id: emp.id,
        employeeId: emp.employeeId,
        firstName: emp.firstName,
        lastName: emp.lastName,
        profilePhoto: emp.profilePhoto,
        email: emp.user?.email,
        department: emp.department?.name || 'General',
        designation: emp.designation?.name || 'Staff',
        role: emp.user?.role?.name || 'Employee',
        roleCategory,
        score: scoreResult.totalScore,
        scoreGrade: scoreResult.grade,
        scoringBreakdown: scoreResult.breakdown,
        hasPerformanceData: scoreResult.hasPerformanceData,
        attendancePercentage,
        totalLoggedDays: totalLogged,
        tasksCompleted,
        tasksAssigned,
        leadsConverted,
        leadsHandled,
        bookingsPrepared,
        toursCoordinated,
        hasActivityData: scoreResult.hasPerformanceData || totalLogged > 0
      });
    }

    // Sort by score descending (nulls at bottom), then by attendancePercentage descending
    evaluatedEmployees.sort((a, b) => {
      const scoreA = a.score !== null ? a.score : -1;
      const scoreB = b.score !== null ? b.score : -1;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (b.attendancePercentage || 0) - (a.attendancePercentage || 0);
    });

    // Fair ranking calculation handling ties and employees without performance data
    let currentRank = 1;
    const rankedList = evaluatedEmployees.map((emp, index) => {
      if (emp.score === null) {
        return {
          ...emp,
          rank: null
        };
      }
      if (index > 0) {
        const prev = evaluatedEmployees[index - 1];
        if (prev.score !== null && emp.score < prev.score) {
          currentRank = index + 1;
        }
      }
      return {
        ...emp,
        rank: currentRank
      };
    });

    // Check if real activity exists in this month
    const totalActivityRecords = rankedList.filter(e => e.hasActivityData).length;
    const scoredList = rankedList.filter(e => e.score !== null && e.score > 0);
    const topPerformer = scoredList.length > 0 ? scoredList[0] : null;

    res.status(200).json({
      success: true,
      data: {
        period: {
          month,
          year,
          monthName: new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' })
        },
        hasActivityData: totalActivityRecords > 0,
        topPerformer,
        rankings: rankedList,
        scoringCriteria: [
          { role: 'Sales & CRM', weights: '50% Conversions & Won Deals, 30% Tasks & Pipeline Follow-ups, 20% Target Achievement' },
          { role: 'Operations & Travel', weights: '50% Operational Tasks Completed, 35% Bookings & Tour Coordination, 15% Operational Targets' },
          { role: 'General & Support', weights: '70% Task Execution, 30% Configured Targets' }
        ]
      }
    });

  } catch (error) {
    console.error('Error fetching monthly top performers:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch top performers' });
  }
};

// 3. Log / Update Attendance for an Employee
export const logEmployeeAttendance = async (req: Request, res: Response) => {
  try {
    const employeeId = req.params.id as string;
    const { date, status, checkInTime, checkOutTime, notes } = req.body;

    if (!date || !status) {
      return res.status(400).json({ success: false, message: 'Date and status are required' });
    }

    const dateStr = typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0];
    const [y, m, d] = dateStr.split('-').map(Number);
    const attendanceDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));

    // Calculate actual working hours if checkIn and checkOut exist
    let computedHours: number | null = null;
    if (checkInTime && checkOutTime) {
      const inMs = new Date(checkInTime).getTime();
      const outMs = new Date(checkOutTime).getTime();
      if (!isNaN(inMs) && !isNaN(outMs) && outMs >= inMs) {
        computedHours = Math.round(((outMs - inMs) / (1000 * 60 * 60)) * 10) / 10;
      }
    }
    const finalHours = computedHours !== null ? computedHours : (status === 'PRESENT' ? 8.5 : status === 'LATE' ? 8.0 : status === 'HALF_DAY' ? 4.0 : 0);

    const record = await prisma.employeeAttendance.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date: attendanceDate
        }
      },
      update: {
        status,
        checkInTime: checkInTime ? new Date(checkInTime) : undefined,
        checkOutTime: checkOutTime ? new Date(checkOutTime) : undefined,
        workingHours: finalHours,
        notes
      },
      create: {
        employeeId,
        date: attendanceDate,
        status,
        checkInTime: checkInTime ? new Date(checkInTime) : undefined,
        checkOutTime: checkOutTime ? new Date(checkOutTime) : undefined,
        workingHours: finalHours,
        notes
      }
    });

    res.status(200).json({ success: true, data: record });
  } catch (error) {
    console.error('Error logging attendance:', error);
    res.status(500).json({ success: false, message: 'Failed to record attendance' });
  }
};
