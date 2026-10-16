import { Router } from 'express';
import {
  getHRStats,
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDesignations,
  createDesignation,
  updateDesignation,
  deleteDesignation,
  deleteEmployee
} from '../controllers/hrController';
import {
  getEmployeeAttendanceAndPerformance,
  getMonthlyTopPerformers,
  logEmployeeAttendance
} from '../controllers/attendancePerformanceController';
import {
  getMyTodayAttendance,
  employeeCheckIn,
  employeeCheckOut,
  getMyAttendanceHistory,
  getAllEmployeesAttendance,
  correctAttendanceRecord,
  getMyLeaves,
  applyForLeave,
  cancelMyLeave,
  getAllLeaveRequests,
  actionOnLeaveRequest
} from '../controllers/attendanceManagementController';
import { authenticate, authorizeRole, requireModuleAccess } from '../middleware/authMiddleware';

const router = Router();

// Dashboard (Any authenticated user can view their own basic HR stats, or HR/Admin for all)
router.get('/stats', authenticate, requireModuleAccess('HR'), getHRStats);

// Monthly Top Performers & Rankings (Authorized HR & Admin roles)
router.get('/monthly-top-performers', authenticate, authorizeRole(['HR_MANAGER', 'ADMIN', 'SUPER_ADMIN', 'CEO / Super Admin', 'Admin']), getMonthlyTopPerformers);

// ----------------------------------------------------
// ATTENDANCE SELF-SERVICE & MANAGEMENT
// ----------------------------------------------------
// Employee Self-service
router.get('/attendance/today', authenticate, getMyTodayAttendance);
router.post('/attendance/check-in', authenticate, employeeCheckIn);
router.post('/attendance/check-out', authenticate, employeeCheckOut);
router.get('/attendance/my-history', authenticate, getMyAttendanceHistory);

// Admin/HR View All & Correct Attendance
router.get('/attendance', authenticate, authorizeRole(['HR_MANAGER', 'ADMIN', 'SUPER_ADMIN', 'CEO / Super Admin', 'Admin']), getAllEmployeesAttendance);
router.patch('/attendance/:id', authenticate, authorizeRole(['HR_MANAGER', 'ADMIN', 'SUPER_ADMIN', 'CEO / Super Admin', 'Admin']), correctAttendanceRecord);

// ----------------------------------------------------
// LEAVE MANAGEMENT
// ----------------------------------------------------
// Employee Self-service
router.get('/leaves/my', authenticate, getMyLeaves);
router.post('/leaves/apply', authenticate, applyForLeave);
router.post('/leaves/:id/cancel', authenticate, cancelMyLeave);

// Admin/HR Manage All Leaves
router.get('/leaves', authenticate, authorizeRole(['HR_MANAGER', 'ADMIN', 'SUPER_ADMIN', 'CEO / Super Admin', 'Admin']), getAllLeaveRequests);
router.post('/leaves/:id/action', authenticate, authorizeRole(['HR_MANAGER', 'ADMIN', 'SUPER_ADMIN', 'CEO / Super Admin', 'Admin']), actionOnLeaveRequest);

// ----------------------------------------------------
// EMPLOYEES & DIRECTORY
// ----------------------------------------------------
// HR, ADMIN, SUPER_ADMIN can view all employees.
router.get('/employees', authenticate, authorizeRole(['HR_MANAGER', 'ADMIN', 'SUPER_ADMIN']), getEmployees);
router.post('/employees', authenticate, authorizeRole(['HR_MANAGER', 'ADMIN', 'SUPER_ADMIN']), createEmployee);

// Employee Attendance & Performance overview (Authorized HR/Admin or self)
router.get('/employees/:id/attendance-performance', authenticate, getEmployeeAttendanceAndPerformance);
router.post('/employees/:id/attendance', authenticate, authorizeRole(['HR_MANAGER', 'ADMIN', 'SUPER_ADMIN', 'CEO / Super Admin', 'Admin']), logEmployeeAttendance);

// Everyone can view basic info, but hrController will filter sensitive info if not HR
router.get('/employees/:id', authenticate, requireModuleAccess('Employees'), getEmployeeById);
router.patch('/employees/:id', authenticate, authorizeRole(['HR_MANAGER', 'ADMIN', 'SUPER_ADMIN']), updateEmployee);
router.delete('/employees/:id', authenticate, authorizeRole(['HR_MANAGER', 'ADMIN', 'SUPER_ADMIN']), deleteEmployee);

// Departments
router.get('/departments', authenticate, requireModuleAccess('HR'), getDepartments);
router.post('/departments', authenticate, authorizeRole(['HR_MANAGER', 'ADMIN', 'SUPER_ADMIN']), createDepartment);
router.patch('/departments/:id', authenticate, authorizeRole(['HR_MANAGER', 'ADMIN', 'SUPER_ADMIN']), updateDepartment);
router.delete('/departments/:id', authenticate, authorizeRole(['HR_MANAGER', 'ADMIN', 'SUPER_ADMIN']), deleteDepartment);

// Designations
router.get('/designations', authenticate, requireModuleAccess('HR'), getDesignations);
router.post('/designations', authenticate, authorizeRole(['HR_MANAGER', 'ADMIN', 'SUPER_ADMIN']), createDesignation);
router.patch('/designations/:id', authenticate, authorizeRole(['HR_MANAGER', 'ADMIN', 'SUPER_ADMIN']), updateDesignation);
router.delete('/designations/:id', authenticate, authorizeRole(['HR_MANAGER', 'ADMIN', 'SUPER_ADMIN']), deleteDesignation);

export default router;
