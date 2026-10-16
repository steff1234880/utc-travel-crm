import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Summary Cards
    const totalEmployees = await prisma.employee.count({ where: { status: 'ACTIVE' } });
    const totalDepartments = await prisma.department.count();
    const totalDesignations = await prisma.designation.count();
    
    const activeSalaryStructures = await prisma.salaryStructure.findMany({
      where: { employee: { status: 'ACTIVE' } },
      include: { allowances: true, deductions: true }
    });
    
    const totalMonthlyPayroll = activeSalaryStructures.reduce((sum, s) => {
      const allowances = s.allowances.reduce((a, b) => a + b.amount, 0);
      const deductions = s.deductions.reduce((a, b) => a + b.amount, 0);
      return sum + s.basicSalary + allowances - deductions;
    }, 0);

    // Statistics: Department-wise employee count
    const departments = await prisma.department.findMany({
      include: {
        _count: {
          select: { employees: { where: { status: 'ACTIVE' } } }
        }
      }
    });

    const departmentStats = departments.map(d => ({
      name: d.name,
      employeeCount: d._count.employees
    }));

    // Recent Activity: Employees
    const recentEmployees = await prisma.employee.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        department: { select: { name: true } },
        designation: { select: { name: true } }
      }
    });

    // Recent Activity: Payroll Slips
    const recentPayrollSlips = await prisma.salaryRecord.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: { select: { firstName: true, lastName: true } }
      }
    });

    // Recent Activity: Enquiries
    const enquiriesData = await prisma.enquiry.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { firstName: true, lastName: true, email: true } },
        package: { select: { title: true } }
      }
    });

    const recentEnquiries = enquiriesData.map(e => ({
      id: e.id,
      customerName: `${e.customer.firstName} ${e.customer.lastName}`,
      email: e.customer.email,
      subject: e.package ? `Inquiry for ${e.package.title}` : (e.destination ? `Inquiry for ${e.destination}` : 'General Inquiry'),
      status: e.status,
      createdAt: e.createdAt
    }));

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalEmployees,
          totalDepartments,
          totalDesignations,
          totalMonthlyPayroll
        },
        statistics: {
          departmentStats
        },
        recentActivity: {
          recentEmployees,
          recentPayrollSlips,
          recentEnquiries
        }
      }
    });
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
  }
};
