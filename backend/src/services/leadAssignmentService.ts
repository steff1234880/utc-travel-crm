import prisma from '../utils/prisma';
import { Prisma } from '@prisma/client';

export interface EligibleExecutive {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roleName: string;
  departmentName?: string;
  designationName?: string;
}

export interface ExecutiveWorkload extends EligibleExecutive {
  activeLeadsCount: number;
  wonLeadsCount: number;
  totalLeadsCount: number;
  lastAssignedAt?: Date | null;
}

// Terminal stages and statuses to exclude from active workload
export const TERMINAL_STATUSES = ['WON', 'LOST', 'CLOSED', 'ARCHIVED'];
export const TERMINAL_STAGES = ['Won', 'Lost', 'Closed', 'WON', 'LOST', 'CLOSED'];

/**
 * Find all active, eligible Sales Executives.
 * Rules:
 * - Employee status must be 'ACTIVE'
 * - Linked User must be active (isActive === true)
 * - Must belong to Sales Executive role, designation, or department (excluding managers)
 */
export async function getEligibleSalesExecutives(tx?: Prisma.TransactionClient): Promise<EligibleExecutive[]> {
  const db = tx || prisma;
  const employees = await db.employee.findMany({
    where: {
      status: 'ACTIVE',
      user: {
        isActive: true
      }
    },
    include: {
      user: {
        include: {
          role: true
        }
      },
      department: true,
      designation: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  const eligible: EligibleExecutive[] = [];

  for (const emp of employees) {
    const roleName = emp.user?.role?.name || '';
    const desigName = emp.designation?.name || '';
    const deptName = emp.department?.name || '';

    const lowerRole = roleName.toLowerCase();
    const lowerDesig = desigName.toLowerCase();
    const lowerDept = deptName.toLowerCase();

    // Check if role or designation is Sales Executive
    const isSalesExecRole = lowerRole.includes('sales executive') || lowerRole === 'sales_executive';
    const isSalesExecDesig = lowerDesig.includes('sales executive');
    
    // Check if in Sales department and not a manager/director/coordinator
    const isSalesDeptExec = lowerDept.includes('sales') && 
      !lowerRole.includes('manager') && 
      !lowerRole.includes('admin') && 
      !lowerRole.includes('ceo') && 
      !lowerDesig.includes('manager') &&
      !lowerDesig.includes('director');

    if (isSalesExecRole || isSalesExecDesig || isSalesDeptExec) {
      eligible.push({
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.user?.email || '',
        roleName: roleName || desigName || 'Sales Executive',
        departmentName: deptName,
        designationName: desigName
      });
    }
  }

  return eligible;
}

/**
 * Calculate active lead count for a given employee.
 * Excludes Won, Lost, Closed, and Archived leads.
 */
export async function getExecutiveActiveLeadCount(employeeId: string, tx?: Prisma.TransactionClient): Promise<number> {
  const db = tx || prisma;
  return db.salesLead.count({
    where: {
      assignedToId: employeeId,
      status: { notIn: TERMINAL_STATUSES },
      OR: [
        { pipelineStageId: null },
        {
          pipelineStage: {
            name: { notIn: TERMINAL_STAGES }
          }
        }
      ]
    }
  });
}

/**
 * Get full team workload metrics for all eligible executives.
 */
export async function getTeamWorkload(tx?: Prisma.TransactionClient): Promise<ExecutiveWorkload[]> {
  const db = tx || prisma;
  const executives = await getEligibleSalesExecutives(db);
  const workloads: ExecutiveWorkload[] = [];

  for (const exec of executives) {
    const [activeLeadsCount, wonLeadsCount, totalLeadsCount, lastAssignment] = await Promise.all([
      db.salesLead.count({
        where: {
          assignedToId: exec.id,
          status: { notIn: TERMINAL_STATUSES },
          OR: [
            { pipelineStageId: null },
            { pipelineStage: { name: { notIn: TERMINAL_STAGES } } }
          ]
        }
      }),
      db.salesLead.count({
        where: {
          assignedToId: exec.id,
          OR: [
            { status: 'WON' },
            { pipelineStage: { name: { in: ['Won', 'WON'] } } }
          ]
        }
      }),
      db.salesLead.count({
        where: { assignedToId: exec.id }
      }),
      db.leadAssignmentHistory.findFirst({
        where: { assignedToId: exec.id },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      })
    ]);

    workloads.push({
      ...exec,
      activeLeadsCount,
      wonLeadsCount,
      totalLeadsCount,
      lastAssignedAt: lastAssignment?.createdAt || null
    });
  }

  return workloads;
}

/**
 * Automatically assign a lead using strict sequential Round Robin distribution.
 * 
 * Rules:
 * 1. Assign each new lead to the next eligible Sales Executive in a fixed, consistent order.
 * 2. After the last Sales Executive, restart from the first.
 * 3. Never consider active lead count, workload, or lowest lead count.
 * 4. Persist the last assignment position in the database (SystemSettings.lastAssignedLeadExecId)
 *    so the sequence continues correctly after server restarts.
 * 5. Skip inactive or unavailable Sales Executives.
 * 6. Preserve existing manual lead assignments without overwriting them.
 * 7. Concurrency-safe: Runs in a Prisma transaction locking/updating SystemSettings sequentially.
 */
export async function assignLeadAutomatically(leadId: string): Promise<{
  assigned: boolean;
  assignedTo?: EligibleExecutive | null;
  reason: string;
  lead: any;
}> {
  return prisma.$transaction(async (tx) => {
    // 1. Fetch lead
    const lead = await tx.salesLead.findUnique({
      where: { id: leadId },
      include: {
        assignedTo: true,
        pipelineStage: true,
        customer: true
      }
    });

    if (!lead) {
      throw new Error(`Lead with ID ${leadId} not found`);
    }

    // 2. Prevent overwriting manual or existing assignment
    if (lead.assignmentType === 'MANUAL' && lead.assignedToId) {
      return {
        assigned: false,
        assignedTo: lead.assignedTo ? {
          id: lead.assignedTo.id,
          firstName: lead.assignedTo.firstName,
          lastName: lead.assignedTo.lastName,
          email: '',
          roleName: 'Sales Executive'
        } : null,
        reason: 'Lead was manually assigned previously; preserved as protected.',
        lead
      };
    }

    if (lead.assignedToId && lead.assignmentType === 'AUTOMATIC') {
      return {
        assigned: true,
        assignedTo: lead.assignedTo ? {
          id: lead.assignedTo.id,
          firstName: lead.assignedTo.firstName,
          lastName: lead.assignedTo.lastName,
          email: '',
          roleName: 'Sales Executive'
        } : null,
        reason: 'Lead already automatically assigned; duplicate assignment skipped.',
        lead
      };
    }

    // 3. Atomically lock or fetch SystemSettings to sequence concurrent assignments
    // Upsert ensures 'default' settings exist
    await tx.systemSettings.upsert({
      where: { id: 'default' },
      update: {},
      create: {
        id: 'default',
        autoAssignLeads: true
      }
    });

    // Use raw query for row-level locking (FOR UPDATE) in PostgreSQL to strictly serialize concurrent Round Robin steps
    try {
      await tx.$executeRawUnsafe(`SELECT id FROM "SystemSettings" WHERE id = 'default' FOR UPDATE`);
    } catch (lockErr) {
      // If table locking raw query isn't supported in isolated test engines, proceed safely in transaction
    }

    const settings = await tx.systemSettings.findUnique({ where: { id: 'default' } });

    if (settings && settings.autoAssignLeads === false) {
      const updated = await tx.salesLead.update({
        where: { id: leadId },
        data: {
          assignmentType: 'UNASSIGNED',
          assignedToId: null
        }
      });

      await tx.leadAssignmentHistory.create({
        data: {
          salesLeadId: leadId,
          assignedToId: null,
          previousAssigneeId: lead.assignedToId,
          assignmentType: 'AUTOMATIC',
          reason: 'Automatic lead assignment is currently disabled in System Settings. Queued for manual assignment.'
        }
      });

      return {
        assigned: false,
        reason: 'Auto-assignment is turned OFF in System Settings.',
        lead: updated
      };
    }

    // 4. Find eligible active sales executives
    const eligibleExecutives = await getEligibleSalesExecutives(tx);

    if (eligibleExecutives.length === 0) {
      const updated = await tx.salesLead.update({
        where: { id: leadId },
        data: {
          assignmentType: 'UNASSIGNED',
          assignedToId: null
        }
      });

      await tx.leadAssignmentHistory.create({
        data: {
          salesLeadId: leadId,
          assignedToId: null,
          previousAssigneeId: lead.assignedToId,
          assignmentType: 'AUTOMATIC',
          reason: 'No eligible active Sales Executives found. Queued for Sales Manager review.'
        }
      });

      return {
        assigned: false,
        reason: 'No eligible active Sales Executives found.',
        lead: updated
      };
    }

    // 5. Strict sequential Round Robin order
    // Sort executives deterministically by ID to ensure a stable, fixed sequence
    eligibleExecutives.sort((a, b) => a.id.localeCompare(b.id));

    const lastAssignedId = settings?.lastAssignedLeadExecId;
    let nextIndex = 0;

    if (lastAssignedId) {
      const currentIndex = eligibleExecutives.findIndex(e => e.id === lastAssignedId);
      if (currentIndex >= 0) {
        // Next executive in circular sequence
        nextIndex = (currentIndex + 1) % eligibleExecutives.length;
      } else {
        // If the previously assigned executive is now inactive/unavailable, start from index 0
        nextIndex = 0;
      }
    } else {
      nextIndex = 0;
    }

    const selectedCandidate = eligibleExecutives[nextIndex];

    // 6. Persist last assignment position in the database
    await tx.systemSettings.update({
      where: { id: 'default' },
      data: { lastAssignedLeadExecId: selectedCandidate.id }
    });

    // 7. Assign lead & record history
    const now = new Date();
    const updatedLead = await tx.salesLead.update({
      where: { id: leadId },
      data: {
        assignedToId: selectedCandidate.id,
        assignmentType: 'AUTOMATIC',
        assignedAt: now
      },
      include: {
        assignedTo: true,
        pipelineStage: true,
        customer: true
      }
    });

    const assignmentReason = `Auto-assigned via Strict Sequential Round Robin (Position ${nextIndex + 1} of ${eligibleExecutives.length})`;

    await tx.leadAssignmentHistory.create({
      data: {
        salesLeadId: leadId,
        assignedToId: selectedCandidate.id,
        previousAssigneeId: lead.assignedToId,
        assignmentType: 'AUTOMATIC',
        reason: assignmentReason,
        createdAt: now
      }
    });

    // 8. Record SalesActivity
    await tx.salesActivity.create({
      data: {
        salesLeadId: leadId,
        employeeId: selectedCandidate.id,
        action: 'LEAD_ASSIGNED',
        description: `Lead automatically assigned to ${selectedCandidate.firstName} ${selectedCandidate.lastName} via Sequential Round Robin.`
      }
    });

    return {
      assigned: true,
      assignedTo: selectedCandidate,
      reason: assignmentReason,
      lead: updatedLead
    };
  }, {
    maxWait: 10000,
    timeout: 25000
  });
}

/**
 * Manually assign or reassign a lead.
 * Accessible to Sales Manager, CEO, and Admin.
 * Sets assignmentType = 'MANUAL', protecting it from automatic redistribution.
 */
export async function assignLeadManually(
  leadId: string,
  targetEmployeeId: string | null,
  assignedByUserId: string,
  reason?: string
): Promise<{
  success: boolean;
  lead: any;
  history: any;
}> {
  return prisma.$transaction(async (tx) => {
    const lead = await tx.salesLead.findUnique({
      where: { id: leadId },
      include: { assignedTo: true, customer: true }
    });

    if (!lead) {
      throw new Error(`Lead with ID ${leadId} not found`);
    }

    let targetEmployee = null;
    if (targetEmployeeId) {
      targetEmployee = await tx.employee.findUnique({
        where: { id: targetEmployeeId },
        include: { user: true }
      });
      if (!targetEmployee) {
        throw new Error(`Target employee with ID ${targetEmployeeId} not found`);
      }
    }

    const previousAssigneeId = lead.assignedToId;
    const now = new Date();

    const updatedLead = await tx.salesLead.update({
      where: { id: leadId },
      data: {
        assignedToId: targetEmployeeId,
        assignmentType: targetEmployeeId ? 'MANUAL' : 'UNASSIGNED',
        assignedAt: targetEmployeeId ? now : null
      },
      include: {
        assignedTo: true,
        customer: true,
        pipelineStage: true
      }
    });

    const isReassignment = !!previousAssigneeId && previousAssigneeId !== targetEmployeeId;
    const actionLabel = targetEmployeeId
      ? (isReassignment ? 'REASSIGNED' : 'ASSIGNED')
      : 'UNASSIGNED';

    const historyReason = reason?.trim() || (
      targetEmployeeId
        ? (isReassignment ? 'Manual lead reassignment by management' : 'Manual lead assignment by management')
        : 'Lead manually unassigned by management'
    );

    const history = await tx.leadAssignmentHistory.create({
      data: {
        salesLeadId: leadId,
        assignedToId: targetEmployeeId,
        previousAssigneeId,
        assignedById: assignedByUserId,
        assignmentType: 'MANUAL',
        reason: historyReason,
        createdAt: now
      },
      include: {
        assignedTo: true,
        previousAssignee: true,
        assignedBy: {
          select: { id: true, email: true }
        }
      }
    });

    // Record SalesActivity if assigned to an employee
    if (targetEmployeeId && targetEmployee) {
      await tx.salesActivity.create({
        data: {
          salesLeadId: leadId,
          employeeId: targetEmployee.id,
          action: actionLabel,
          description: `Lead manually ${isReassignment ? 'reassigned' : 'assigned'} to ${targetEmployee.firstName} ${targetEmployee.lastName}${reason ? ` (Reason: ${reason})` : ''}`
        }
      });
    }

    return {
      success: true,
      lead: updatedLead,
      history
    };
  }, {
    maxWait: 10000,
    timeout: 25000
  });
}

/**
 * Get comprehensive lead assignment overview, team workload, and unassigned leads queue.
 */
export async function getAssignmentOverview() {
  const [settings, workload, unassignedCount, unassignedLeads, recentHistory] = await Promise.all([
    prisma.systemSettings.findUnique({
      where: { id: 'default' },
      select: { autoAssignLeads: true, lastAssignedLeadExecId: true }
    }),
    getTeamWorkload(),
    prisma.salesLead.count({
      where: {
        OR: [
          { assignedToId: null },
          { assignmentType: 'UNASSIGNED' }
        ],
        status: { notIn: TERMINAL_STATUSES }
      }
    }),
    prisma.salesLead.findMany({
      where: {
        OR: [
          { assignedToId: null },
          { assignmentType: 'UNASSIGNED' }
        ],
        status: { notIn: TERMINAL_STATUSES }
      },
      take: 15,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        pipelineStage: true
      }
    }),
    prisma.leadAssignmentHistory.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        salesLead: {
          select: { id: true, title: true, source: true, customer: true }
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true }
        },
        previousAssignee: {
          select: { id: true, firstName: true, lastName: true }
        },
        assignedBy: {
          select: { id: true, email: true }
        }
      }
    })
  ]);

  const totalActiveWorkload = workload.reduce((sum, w) => sum + w.activeLeadsCount, 0);
  const totalWonLeads = workload.reduce((sum, w) => sum + w.wonLeadsCount, 0);

  return {
    autoAssignEnabled: settings ? settings.autoAssignLeads : true,
    totalActiveWorkload,
    totalWonLeads,
    unassignedCount,
    executives: workload,
    unassignedLeads,
    recentHistory
  };
}

/**
 * Get assignment history for a specific lead.
 */
export async function getLeadAssignmentHistory(leadId: string) {
  return prisma.leadAssignmentHistory.findMany({
    where: { salesLeadId: leadId },
    orderBy: { createdAt: 'desc' },
    include: {
      assignedTo: {
        select: { id: true, firstName: true, lastName: true }
      },
      previousAssignee: {
        select: { id: true, firstName: true, lastName: true }
      },
      assignedBy: {
        select: { id: true, email: true }
      }
    }
  });
}

/**
 * Toggle auto-assignment setting (CEO / Admin control).
 */
export async function setAutoAssignmentSetting(enabled: boolean, userId: string) {
  const updated = await prisma.systemSettings.upsert({
    where: { id: 'default' },
    update: { autoAssignLeads: enabled },
    create: {
      id: 'default',
      autoAssignLeads: enabled
    }
  });

  await prisma.auditLog.create({
    data: {
      userId,
      userEmail: 'system',
      action: 'UPDATE_SYSTEM_SETTINGS',
      module: 'Sales CRM',
      recordId: 'default',
      details: `Automatic Lead Assignment toggled to ${enabled ? 'ENABLED' : 'DISABLED'}`
    }
  });

  return {
    success: true,
    autoAssignLeads: updated.autoAssignLeads
  };
}
