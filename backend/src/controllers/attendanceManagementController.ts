import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logAudit } from '../utils/auditLogger';

// Helper to fetch office timings and attendance rules from SystemSettings
export async function getOfficeTimings() {
  const settings = await prisma.systemSettings.findUnique({
    where: { id: 'default' }
  });

  return {
    officeStartTime: settings?.officeStartTime || '09:30',
    officeEndTime: settings?.officeEndTime || '18:30',
    breakStartTime: settings?.breakStartTime || '13:00',
    breakEndTime: settings?.breakEndTime || '14:00',
    gracePeriodMins: settings?.gracePeriodMins !== undefined && settings?.gracePeriodMins !== null ? settings.gracePeriodMins : 15,
    workingDays: settings?.workingDays || '1,2,3,4,5',
    halfDayHours: settings?.halfDayHours || 4.5,
    fullDayMinHours: settings?.fullDayMinHours || 8.0,
    overtimeMinHours: settings?.overtimeMinHours || 9.5
  };
}

// Helper to calculate business/working days between two dates using configured working days
async function calculateWorkingDays(startDate: Date, endDate: Date): Promise<number> {
  const timings = await getOfficeTimings();
  const allowedDays = timings.workingDays.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));

  let count = 0;
  const cur = new Date(startDate);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (cur <= end) {
    const day = cur.getDay();
    if (allowedDays.includes(day)) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

// Helper to get or auto-link employee profile for authenticated user
export async function getOrCreateEmployeeForUser(userId: string) {
  let employee = await prisma.employee.findUnique({
    where: { userId }
  });
  if (!employee) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user) return null;
    const nameParts = user.email.split('@')[0].trim().split('.');
    const firstName = nameParts[0] || 'Staff';
    const lastName = nameParts.slice(1).join(' ') || 'Member';
    const empCount = await prisma.employee.count();
    const empId = `EMP${String(empCount + 1).padStart(4, '0')}`;
    employee = await prisma.employee.create({
      data: {
        userId: user.id,
        employeeId: empId,
        firstName,
        lastName,
        joiningDate: new Date()
      }
    });
  }
  return employee;
}

// Helper to get normalized date for today
export function getTodayDate(): Date {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
}

// ----------------------------------------------------
// 1. EMPLOYEE SELF-SERVICE ATTENDANCE
// ----------------------------------------------------

// GET /api/hr/attendance/today - Get current authenticated employee's status for today
export const getMyTodayAttendance = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const employee = await getOrCreateEmployeeForUser(userId);

    if (!employee) {
      return res.status(404).json({ success: false, message: 'No employee record linked to current user account' });
    }

    const today = getTodayDate();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    let record = await prisma.employeeAttendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: today
        }
      }
    });

    if (!record) {
      record = await prisma.employeeAttendance.findFirst({
        where: {
          employeeId: employee.id,
          OR: [
            { date: { gte: startOfToday, lte: endOfToday } },
            { createdAt: { gte: startOfToday, lte: endOfToday } }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        employee: {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          employeeId: employee.employeeId
        },
        date: today.toISOString().split('T')[0],
        officeTimings: await getOfficeTimings(),
        record: record ? {
          id: record.id,
          status: record.status,
          checkInTime: record.checkInTime,
          checkOutTime: record.checkOutTime,
          workingHours: record.workingHours,
          notes: record.notes
        } : null
      }
    });
  } catch (error) {
    console.error('Error fetching today attendance:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch attendance status' });
  }
};

// POST /api/hr/attendance/check-in - Employee Check In
export const employeeCheckIn = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const employee = await getOrCreateEmployeeForUser(userId);

    if (!employee) {
      return res.status(400).json({ success: false, message: 'Employee profile not found for this account' });
    }

    const now = new Date();
    const today = getTodayDate();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Check if record already exists
    let existing = await prisma.employeeAttendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: today
        }
      }
    });

    if (!existing) {
      existing = await prisma.employeeAttendance.findFirst({
        where: {
          employeeId: employee.id,
          OR: [
            { date: { gte: startOfToday, lte: endOfToday } },
            { createdAt: { gte: startOfToday, lte: endOfToday } }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    if (existing && existing.checkInTime) {
      return res.status(400).json({
        success: false,
        message: `Already checked in today at ${new Date(existing.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      });
    }

    // Determine status using configured office timings
    const timings = await getOfficeTimings();
    const [startH, startM] = timings.officeStartTime.split(':').map(Number);
    const officeStartMins = startH * 60 + startM;
    const allowedStartMins = officeStartMins + (timings.gracePeriodMins || 0);

    const checkInMins = now.getHours() * 60 + now.getMinutes();
    const isLate = checkInMins > allowedStartMins;
    const lateMins = isLate ? checkInMins - officeStartMins : 0;
    const initialStatus = isLate ? 'LATE' : 'PRESENT';

    const defaultLateNote = isLate ? `Late arrival: ${lateMins} mins after ${timings.officeStartTime}` : undefined;
    const notes = req.body.notes ? req.body.notes : defaultLateNote;

    const attendance = await prisma.employeeAttendance.upsert({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: existing ? existing.date : today
        }
      },
      update: {
        checkInTime: now,
        status: existing?.status === 'ON_LEAVE' ? 'ON_LEAVE' : initialStatus,
        notes: notes || existing?.notes
      },
      create: {
        employeeId: employee.id,
        date: today,
        checkInTime: now,
        status: initialStatus,
        notes
      }
    });

    await logAudit({
      req,
      action: 'ATTENDANCE_CHECK_IN',
      module: 'Attendance',
      recordId: attendance.id,
      newValue: { employeeId: employee.employeeId, checkInTime: now, status: attendance.status },
      status: 'SUCCESS',
      details: `Employee ${employee.firstName} ${employee.lastName} checked in (${attendance.status})`
    });

    return res.status(200).json({
      success: true,
      message: `Checked in successfully at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      data: attendance
    });
  } catch (error) {
    console.error('Error during check in:', error);
    return res.status(500).json({ success: false, message: 'Failed to record check in' });
  }
};

// POST /api/hr/attendance/check-out - Employee Check Out
export const employeeCheckOut = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const employee = await getOrCreateEmployeeForUser(userId);

    if (!employee) {
      return res.status(400).json({ success: false, message: 'Employee profile not found' });
    }

    const now = new Date();
    const today = getTodayDate();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    let existing = await prisma.employeeAttendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: today
        }
      }
    });

    if (!existing) {
      existing = await prisma.employeeAttendance.findFirst({
        where: {
          employeeId: employee.id,
          OR: [
            { date: { gte: startOfToday, lte: endOfToday } },
            { createdAt: { gte: startOfToday, lte: endOfToday } }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    if (!existing || !existing.checkInTime) {
      return res.status(400).json({
        success: false,
        message: 'Cannot check out before checking in'
      });
    }

    if (existing.checkOutTime) {
      return res.status(400).json({
        success: false,
        message: `Already checked out today at ${new Date(existing.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      });
    }

    // Calculate working hours using configured rules
    const timings = await getOfficeTimings();
    const checkInMs = new Date(existing.checkInTime).getTime();
    const checkOutMs = now.getTime();
    const diffHours = Math.max(0, (checkOutMs - checkInMs) / (1000 * 60 * 60));
    const roundedHours = Math.round(diffHours * 10) / 10;

    // Check early departure
    const [endH, endM] = timings.officeEndTime.split(':').map(Number);
    const officeEndMins = endH * 60 + endM;
    const checkOutMins = now.getHours() * 60 + now.getMinutes();
    const isEarlyDeparture = checkOutMins < officeEndMins;
    const earlyMins = isEarlyDeparture ? officeEndMins - checkOutMins : 0;

    // Apply half-day and overtime rules
    let updatedStatus = existing.status;
    if (existing.status !== 'ON_LEAVE') {
      if (roundedHours < timings.fullDayMinHours && roundedHours >= timings.halfDayHours) {
        updatedStatus = 'HALF_DAY';
      } else if (roundedHours < timings.halfDayHours) {
        updatedStatus = 'HALF_DAY';
      }
    }

    // Build descriptive notes if applicable
    const notesParts: string[] = [];
    if (req.body.notes) {
      notesParts.push(req.body.notes);
    } else if (existing.notes) {
      notesParts.push(existing.notes);
    }
    if (isEarlyDeparture && earlyMins > 10) {
      notesParts.push(`Early departure: ${earlyMins} mins before ${timings.officeEndTime}`);
    }
    if (roundedHours >= timings.overtimeMinHours) {
      const otHours = Math.round((roundedHours - timings.fullDayMinHours) * 10) / 10;
      notesParts.push(`Overtime: +${otHours}h worked`);
    }

    const attendance = await prisma.employeeAttendance.update({
      where: { id: existing.id },
      data: {
        checkOutTime: now,
        workingHours: roundedHours,
        status: updatedStatus,
        notes: notesParts.length > 0 ? notesParts.join(' | ') : existing.notes
      }
    });

    await logAudit({
      req,
      action: 'ATTENDANCE_CHECK_OUT',
      module: 'Attendance',
      recordId: attendance.id,
      newValue: { employeeId: employee.employeeId, checkOutTime: now, workingHours: roundedHours },
      status: 'SUCCESS',
      details: `Employee ${employee.firstName} ${employee.lastName} checked out after ${roundedHours}h`
    });

    return res.status(200).json({
      success: true,
      message: `Checked out successfully at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${roundedHours} hours worked)`,
      data: attendance
    });
  } catch (error) {
    console.error('Error during check out:', error);
    return res.status(500).json({ success: false, message: 'Failed to record check out' });
  }
};

// GET /api/hr/attendance/my-history - Employee View Their Own Attendance
export const getMyAttendanceHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const employee = await getOrCreateEmployeeForUser(userId);

    if (!employee) {
      return res.status(400).json({ success: false, message: 'Employee profile not found' });
    }

    const now = new Date();
    const month = parseInt(req.query.month as string) || (now.getMonth() + 1);
    const year = parseInt(req.query.year as string) || now.getFullYear();

    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month - 1, lastDay, 23, 59, 59, 999));

    const records = await prisma.employeeAttendance.findMany({
      where: {
        employeeId: employee.id,
        date: { gte: startDate, lte: endDate }
      },
      orderBy: { date: 'asc' }
    });

    let present = 0, late = 0, halfDay = 0, absent = 0, onLeave = 0;
    records.forEach(r => {
      const s = r.status.toUpperCase();
      if (s === 'PRESENT') present++;
      else if (s === 'LATE') late++;
      else if (s === 'HALF_DAY') halfDay++;
      else if (s === 'ON_LEAVE') onLeave++;
      else if (s === 'ABSENT') absent++;
    });

    const totalLogged = records.length;
    // Calculate adherence percentage: Approved leave is treated fairly as adhering to schedule
    const percentage = totalLogged > 0
      ? Math.round(((present + late + onLeave + 0.5 * halfDay) / totalLogged) * 100 * 10) / 10
      : null;

    return res.status(200).json({
      success: true,
      data: {
        period: { month, year },
        summary: {
          present,
          late,
          halfDay,
          onLeave,
          absent,
          totalLogged,
          percentage
        },
        records: records.map(r => ({
          id: r.id,
          date: new Date(r.date).toISOString().split('T')[0],
          status: r.status,
          checkInTime: r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
          checkOutTime: r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
          workingHours: r.workingHours !== null && r.workingHours !== undefined
            ? r.workingHours
            : (r.status === 'PRESENT' ? 8.5 : r.status === 'LATE' ? 8.0 : r.status === 'HALF_DAY' ? 4.0 : 0),
          notes: r.notes
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching my attendance history:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch attendance history' });
  }
};

// ----------------------------------------------------
// 2. ADMIN / HR ATTENDANCE MANAGEMENT
// ----------------------------------------------------

// GET /api/hr/attendance - Admin View All Attendance with filters
export const getAllEmployeesAttendance = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month as string) || (now.getMonth() + 1);
    const year = parseInt(req.query.year as string) || now.getFullYear();
    const departmentId = req.query.departmentId as string;
    const employeeId = req.query.employeeId as string;
    const filterDate = req.query.date as string;

    let startDate: Date;
    let endDate: Date;

    if (filterDate) {
      const dateStr = filterDate.split('T')[0];
      const [fYear, fMonth, fDay] = dateStr.split('-').map(Number);
      startDate = new Date(Date.UTC(fYear, fMonth - 1, fDay, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(fYear, fMonth - 1, fDay, 23, 59, 59, 999));
    } else {
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(year, month - 1, lastDay, 23, 59, 59, 999));
    }

    const whereClause: any = {
      date: { gte: startDate, lte: endDate }
    };

    if (employeeId && employeeId !== 'ALL') {
      whereClause.employeeId = employeeId;
    }

    if (departmentId && departmentId !== 'ALL') {
      whereClause.employee = { departmentId };
    }

    const records = await prisma.employeeAttendance.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            department: { select: { id: true, name: true } },
            designation: { select: { name: true } }
          }
        }
      },
      orderBy: [{ date: 'desc' }, { employee: { firstName: 'asc' } }]
    });

    // Compute Summary counts
    let presentCount = 0, lateCount = 0, halfDayCount = 0, onLeaveCount = 0, absentCount = 0, missingCheckOut = 0;
    records.forEach(r => {
      const s = r.status.toUpperCase();
      if (s === 'PRESENT') presentCount++;
      else if (s === 'LATE') lateCount++;
      else if (s === 'HALF_DAY') halfDayCount++;
      else if (s === 'ON_LEAVE') onLeaveCount++;
      else if (s === 'ABSENT') absentCount++;

      if (r.checkInTime && !r.checkOutTime && s !== 'ON_LEAVE' && s !== 'ABSENT') {
        missingCheckOut++;
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        period: { month, year, filterDate },
        officeTimings: await getOfficeTimings(),
        summary: {
          totalRecords: records.length,
          present: presentCount,
          late: lateCount,
          halfDay: halfDayCount,
          onLeave: onLeaveCount,
          absent: absentCount,
          missingCheckOut
        },
        records: records.map(r => ({
          id: r.id,
          employeeId: r.employeeId,
          employeeNumber: r.employee.employeeId,
          employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
          department: r.employee.department?.name || 'General',
          designation: r.employee.designation?.name || 'Staff',
          date: new Date(r.date).toISOString().split('T')[0],
          status: r.status,
          checkInTime: r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
          checkOutTime: r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
          workingHours: r.workingHours,
          notes: r.notes
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching all attendance:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch attendance records' });
  }
};

// PATCH /api/hr/attendance/:id - Admin Correct/Update Attendance Record with Audit Trail
export const correctAttendanceRecord = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status, checkInTime, checkOutTime, workingHours, notes, reason } = req.body;

    const existing = await prisma.employeeAttendance.findUnique({
      where: { id },
      include: { employee: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    const previousValue = {
      status: existing.status,
      checkInTime: existing.checkInTime,
      checkOutTime: existing.checkOutTime,
      workingHours: existing.workingHours,
      notes: existing.notes
    };

    const updateData: any = {};
    if (status) updateData.status = status;
    if (checkInTime !== undefined) updateData.checkInTime = checkInTime ? new Date(checkInTime) : null;
    if (checkOutTime !== undefined) updateData.checkOutTime = checkOutTime ? new Date(checkOutTime) : null;
    if (workingHours !== undefined) updateData.workingHours = Number(workingHours);
    if (notes !== undefined) updateData.notes = notes;

    const updated = await prisma.employeeAttendance.update({
      where: { id },
      data: updateData
    });

    await logAudit({
      req,
      action: 'ATTENDANCE_CORRECTION',
      module: 'Attendance',
      recordId: id,
      previousValue: JSON.stringify(previousValue),
      newValue: JSON.stringify(updateData),
      status: 'SUCCESS',
      details: `Admin corrected attendance for ${existing.employee.firstName} ${existing.employee.lastName}. Reason: ${reason || 'Administrative adjustment'}`
    });

    return res.status(200).json({
      success: true,
      message: 'Attendance record corrected successfully',
      data: updated
    });
  } catch (error) {
    console.error('Error correcting attendance:', error);
    return res.status(500).json({ success: false, message: 'Failed to correct attendance record' });
  }
};

// ----------------------------------------------------
// 3. LEAVE MANAGEMENT
// ----------------------------------------------------

// GET /api/hr/leaves/my - Employee View Their Own Leave History & Balances
export const getMyLeaves = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const employee = await prisma.employee.findUnique({
      where: { userId }
    });

    if (!employee) {
      return res.status(400).json({ success: false, message: 'Employee profile not found' });
    }

    const currentYear = new Date().getFullYear();

    // Fetch or initialize leave balance for current year
    let balances = await prisma.employeeLeaveBalance.findMany({
      where: { employeeId: employee.id, year: currentYear }
    });

    if (balances.length === 0) {
      // Standard annual entitlements
      const defaultTypes = [
        { leaveType: 'CASUAL', totalDays: 12 },
        { leaveType: 'SICK', totalDays: 10 },
        { leaveType: 'EARNED', totalDays: 15 }
      ];

      for (const d of defaultTypes) {
        await prisma.employeeLeaveBalance.create({
          data: {
            employeeId: employee.id,
            year: currentYear,
            leaveType: d.leaveType,
            totalDays: d.totalDays,
            usedDays: 0
          }
        });
      }

      balances = await prisma.employeeLeaveBalance.findMany({
        where: { employeeId: employee.id, year: currentYear }
      });
    }

    // Fetch employee's leave requests
    const requests = await prisma.leaveRequest.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({
      success: true,
      data: {
        balances: balances.map(b => ({
          leaveType: b.leaveType,
          totalDays: b.totalDays,
          usedDays: b.usedDays,
          remainingDays: Math.max(0, b.totalDays - b.usedDays)
        })),
        requests: requests.map(r => ({
          id: r.id,
          leaveType: r.leaveType,
          startDate: new Date(r.startDate).toISOString().split('T')[0],
          endDate: new Date(r.endDate).toISOString().split('T')[0],
          daysCount: r.daysCount,
          reason: r.reason,
          status: r.status,
          actionNotes: r.actionNotes,
          createdAt: r.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching my leaves:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch leave requests' });
  }
};

// POST /api/hr/leaves/apply - Employee Apply For Leave
export const applyForLeave = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const employee = await prisma.employee.findUnique({
      where: { userId }
    });

    if (!employee) {
      return res.status(400).json({ success: false, message: 'Employee profile not found' });
    }

    const { leaveType, startDate, endDate, reason } = req.body;

    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({ success: false, message: 'Leave type, start date, end date, and reason are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (end < start) {
      return res.status(400).json({ success: false, message: 'End date cannot be prior to start date' });
    }

    // Calculate working days (respecting configured working days)
    const daysCount = await calculateWorkingDays(start, end);
    if (daysCount <= 0) {
      return res.status(400).json({ success: false, message: 'Selected date range contains no working days' });
    }

    // Check for conflicting active leave requests
    const conflicting = await prisma.leaveRequest.findFirst({
      where: {
        employeeId: employee.id,
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [
          { startDate: { lte: end }, endDate: { gte: start } }
        ]
      }
    });

    if (conflicting) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending or approved leave request overlapping these dates'
      });
    }

    // Check leave balance if CASUAL, SICK, or EARNED
    const currentYear = start.getFullYear();
    const balance = await prisma.employeeLeaveBalance.findUnique({
      where: {
        employeeId_year_leaveType: {
          employeeId: employee.id,
          year: currentYear,
          leaveType: leaveType.toUpperCase()
        }
      }
    });

    if (balance) {
      const remaining = balance.totalDays - balance.usedDays;
      if (daysCount > remaining) {
        return res.status(400).json({
          success: false,
          message: `Insufficient leave balance: You requested ${daysCount} days, but only have ${remaining} days available for ${leaveType}`
        });
      }
    }

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        employeeId: employee.id,
        leaveType: leaveType.toUpperCase(),
        startDate: start,
        endDate: end,
        daysCount,
        reason,
        status: 'PENDING'
      }
    });

    await logAudit({
      req,
      action: 'LEAVE_APPLY',
      module: 'Leaves',
      recordId: leaveRequest.id,
      newValue: { leaveType, daysCount, startDate, endDate },
      status: 'SUCCESS',
      details: `Employee ${employee.firstName} ${employee.lastName} applied for ${daysCount} days ${leaveType} leave`
    });

    return res.status(201).json({
      success: true,
      message: 'Leave application submitted successfully',
      data: leaveRequest
    });
  } catch (error) {
    console.error('Error applying for leave:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit leave application' });
  }
};

// POST /api/hr/leaves/:id/cancel - Employee Cancel Pending Leave Request
export const cancelMyLeave = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.userId;
    const employee = await prisma.employee.findUnique({ where: { userId } });

    if (!employee) {
      return res.status(400).json({ success: false, message: 'Employee profile not found' });
    }

    const leaveRequest = await prisma.leaveRequest.findUnique({ where: { id } });

    if (!leaveRequest || leaveRequest.employeeId !== employee.id) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    if (leaveRequest.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a leave request that is already ${leaveRequest.status.toLowerCase()}`
      });
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    return res.status(200).json({
      success: true,
      message: 'Leave request cancelled successfully',
      data: updated
    });
  } catch (error) {
    console.error('Error cancelling leave:', error);
    return res.status(500).json({ success: false, message: 'Failed to cancel leave request' });
  }
};

// GET /api/hr/leaves - Admin View All Leave Requests
export const getAllLeaveRequests = async (req: Request, res: Response) => {
  try {
    const { status, departmentId, employeeId } = req.query;

    const whereClause: any = {};
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }
    if (employeeId && employeeId !== 'ALL') {
      whereClause.employeeId = employeeId;
    }
    if (departmentId && departmentId !== 'ALL') {
      whereClause.employee = { departmentId };
    }

    const requests = await prisma.leaveRequest.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            department: { select: { name: true } },
            designation: { select: { name: true } }
          }
        }
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }]
    });

    return res.status(200).json({
      success: true,
      data: requests.map(r => ({
        id: r.id,
        employeeId: r.employeeId,
        employeeNumber: r.employee.employeeId,
        employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
        department: r.employee.department?.name || 'General',
        designation: r.employee.designation?.name || 'Staff',
        leaveType: r.leaveType,
        startDate: new Date(r.startDate).toISOString().split('T')[0],
        endDate: new Date(r.endDate).toISOString().split('T')[0],
        daysCount: r.daysCount,
        reason: r.reason,
        status: r.status,
        actionNotes: r.actionNotes,
        actionAt: r.actionAt,
        createdAt: r.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching all leave requests:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch leave requests' });
  }
};

// POST /api/hr/leaves/:id/action - Admin Approve or Reject Leave Request
export const actionOnLeaveRequest = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { action, actionNotes } = req.body; // action: 'APPROVED' | 'REJECTED'

    if (!['APPROVED', 'REJECTED'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be APPROVED or REJECTED' });
    }

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: true }
    });

    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    if (leaveRequest.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Leave request has already been ${leaveRequest.status.toLowerCase()}`
      });
    }

    const now = new Date();

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: action,
        actionById: req.user?.userId,
        actionAt: now,
        actionNotes: actionNotes || undefined
      }
    });

    if (action === 'APPROVED') {
      // 1. Deduct leave balance
      const startYear = new Date(leaveRequest.startDate).getFullYear();
      await prisma.employeeLeaveBalance.updateMany({
        where: {
          employeeId: leaveRequest.employeeId,
          year: startYear,
          leaveType: leaveRequest.leaveType
        },
        data: {
          usedDays: { increment: leaveRequest.daysCount }
        }
      });

      // 2. Mark attendance as ON_LEAVE for working days in range
      const cur = new Date(leaveRequest.startDate);
      cur.setHours(0, 0, 0, 0);
      const end = new Date(leaveRequest.endDate);
      end.setHours(0, 0, 0, 0);

      while (cur <= end) {
        const dayOfWeek = cur.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          const leaveDate = new Date(cur);
          await prisma.employeeAttendance.upsert({
            where: {
              employeeId_date: {
                employeeId: leaveRequest.employeeId,
                date: leaveDate
              }
            },
            update: {
              status: 'ON_LEAVE',
              notes: `Approved ${leaveRequest.leaveType} leave (${leaveRequest.reason})`
            },
            create: {
              employeeId: leaveRequest.employeeId,
              date: leaveDate,
              status: 'ON_LEAVE',
              workingHours: 0,
              notes: `Approved ${leaveRequest.leaveType} leave (${leaveRequest.reason})`
            }
          });
        }
        cur.setDate(cur.getDate() + 1);
      }
    }

    await logAudit({
      req,
      action: `LEAVE_${action}`,
      module: 'Leaves',
      recordId: id,
      newValue: { status: action, actionNotes },
      status: 'SUCCESS',
      details: `Admin ${action.toLowerCase()} leave request for ${leaveRequest.employee.firstName} ${leaveRequest.employee.lastName}`
    });

    return res.status(200).json({
      success: true,
      message: `Leave request ${action.toLowerCase()} successfully`,
      data: updated
    });
  } catch (error) {
    console.error('Error actioning leave request:', error);
    return res.status(500).json({ success: false, message: 'Failed to process leave action' });
  }
};
