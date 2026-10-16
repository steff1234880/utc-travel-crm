import { z } from 'zod';

export const createEmployeeSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  employeeId: z.string().min(1, 'Employee ID is required'),
  joiningDate: z.string().optional(),
  departmentId: z.string().optional(),
  designationId: z.string().optional(),
  role: z.string().min(2, 'Role is required'),
  designation: z.string().min(2, 'Designation is required'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'RESIGNED', 'TERMINATED']).default('ACTIVE'),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']).default('FULL_TIME'),
  reportingManagerId: z.string().optional(),
  bankDetails: z.string().optional(),
  password: z.string().optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export const createDepartmentSchema = z.object({
  name: z.string().min(2, 'Department name is required'),
  description: z.string().optional(),
});

export const createDesignationSchema = z.object({
  name: z.string().min(2, 'Designation name is required'),
  departmentId: z.string().min(1, 'Department ID is required'),
  isActive: z.boolean().optional(),
});

export const updateDesignationSchema = z.object({
  name: z.string().min(2, 'Designation name is required').optional(),
  departmentId: z.string().min(1, 'Department ID is required').optional(),
  isActive: z.boolean().optional(),
});

export const salaryStructureSchema = z.object({
  basicSalary: z.number().min(0),
  effectiveDate: z.string().optional(),
  allowances: z.array(z.object({
    name: z.string(),
    amount: z.number().min(0)
  })).optional(),
  deductions: z.array(z.object({
    name: z.string(),
    amount: z.number().min(0)
  })).optional(),
});

export const bonusIncentiveSchema = z.object({
  amount: z.number().min(0),
  reason: z.string().min(2, 'Reason is required'),
  period: z.string().optional(),
  type: z.enum(['SALES', 'PERFORMANCE', 'COMMISSION']).optional(),
  notes: z.string().optional(),
});
