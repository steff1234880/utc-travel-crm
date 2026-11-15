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
  createdAt?: Date;
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
 * Find all active, eligible Sales Executives and Sales Managers.
 * Rules:
 * - Employee status must be 'ACTIVE'
 * - Linked User must be active (isActive === true)
 * - Must belong to Sales Executive or Sales Manager role or designation (excluding admins, CEOs, directors, and coordinators)
 * - Sorted by ID ascending for deterministic sequential round-robin ordering
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
    // Sort eligible users by ID ascending
    orderBy: [{ id: 'asc' }]
  });

  const eligible: EligibleExecutive[] = [];

  for (const emp of employees) {
    const roleName = emp.user?.role?.name || '';
    const desigName = emp.designation?.name || '';
    const deptName = emp.department?.name || '';

    const lowerRole = roleName.toLowerCase().trim();
    const lowerDesig = desigName.toLowerCase().trim();

    // Check if role or designation is Sales Executive or Sales Manager
    const isSalesExecRole = lowerRole.includes('sales executive') || lowerRole === 'sales_executive';
    const isSalesExecDesig = lowerDesig.includes('sales executive');
    const isSalesManagerRole = lowerRole.includes('sales manager') || lowerRole === 'sales_manager';
    const isSalesManagerDesig = lowerDesig.includes('sales manager');

    // Exclude admins, CEOs, directors, and coordinators outright
    const isExcluded = ['admin', 'ceo', 'director', 'coordinator']
      .some(k => lowerRole.includes(k) || lowerDesig.includes(k));

    if ((isSalesExecRole || isSalesExecDesig || isSalesManagerRole || isSalesManagerDesig) && !isExcluded) {
      const resolvedRoleName = (isSalesManagerRole || isSalesManagerDesig)
        ? (roleName || desigName || 'Sales Manager')
        : (roleName || desigName || 'Sales Executive');

      eligible.push({
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.user?.email || '',
        roleName: resolvedRoleName,
        departmentName: deptName,
        designationName: desigName,
        createdAt: emp.createdAt
      });
    }
  }

  eligible.sort((a, b) => a.id.localeCompare(b.id));
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
    // 0. Lock the lead row so manual and automatic assignment serialize
    await tx.$executeRaw`SELECT id FROM "SalesLead" WHERE id = ${leadId} FOR UPDATE`;

    // 1. Fetch lead (after lock, so state is authoritative)
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

    // 5. Strict sequential Round Robin sorted by ID ascending.
    // getEligibleSalesExecutives already returns eligible users sorted by id asc.
    const lastAssignedId = settings?.lastAssignedLeadExecId;
    let nextIndex = 0;

    if (lastAssignedId) {
      const currentIndex = eligibleExecutives.findIndex(e => e.id === lastAssignedId);
      if (currentIndex >= 0) {
        nextIndex = (currentIndex + 1) % eligibleExecutives.length;
      } else {
        // Previous assignee is no longer eligible (inactive/deleted): continue with the first
        // eligible user whose ID comes after lastAssignedId, or wrap around to index 0.
        const idx = eligibleExecutives.findIndex(e => e.id.localeCompare(lastAssignedId) > 0);
        nextIndex = idx >= 0 ? idx : 0;
      }
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

    // 9. Maintain enquiry-to-lead ownership synchronization if lead is linked to an enquiry
    if (lead.enquiryId) {
      await tx.enquiryAssignment.deleteMany({
        where: { enquiryId: lead.enquiryId }
      });
      await tx.enquiryAssignment.create({
        data: {
          enquiryId: lead.enquiryId,
          employeeId: selectedCandidate.id
        }
      });
    }

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
    // Lock the lead row so a concurrent automatic assignment cannot interleave
    await tx.$executeRaw`SELECT id FROM "SalesLead" WHERE id = ${leadId} FOR UPDATE`;

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
        include: { user: { include: { role: true } }, designation: true }
      });
      if (!targetEmployee) {
        throw new Error(`Target employee with ID ${targetEmployeeId} not found`);
      }
      if (targetEmployee.status !== 'ACTIVE' || targetEmployee.user?.isActive === false) {
        throw new Error('Cannot assign lead to an inactive or deleted employee');
      }
      const eligiblePool = await getEligibleSalesExecutives(tx);
      if (!eligiblePool.some(e => e.id === targetEmployeeId)) {
        throw new Error('Target employee is not an eligible active Sales Executive or Sales Manager');
      }
    }

    const previousAssigneeId = lead.assignedToId;
    const now = new Date();

    // Prevent duplicate assignment records if the lead is already assigned to the exact same employee
    if (previousAssigneeId && targetEmployeeId && previousAssigneeId === targetEmployeeId) {
      const latestHistory = await tx.leadAssignmentHistory.findFirst({
        where: { salesLeadId: leadId },
        orderBy: { createdAt: 'desc' },
        include: {
          assignedTo: true,
          previousAssignee: true,
          assignedBy: {
            select: { id: true, email: true }
          }
        }
      });
      return {
        success: true,
        lead,
        history: latestHistory
      };
    }

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

    // Maintain enquiry-to-lead ownership synchronization if lead is linked to an enquiry
    if (lead.enquiryId) {
      await tx.enquiryAssignment.deleteMany({
        where: { enquiryId: lead.enquiryId }
      });
      if (targetEmployeeId) {
        await tx.enquiryAssignment.create({
          data: {
            enquiryId: lead.enquiryId,
            employeeId: targetEmployeeId
          }
        });
      }
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
  const [settings, workload, unassignedCount, unassignedLeads, recentHistory, rawLeads] = await Promise.all([
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
    }),
    prisma.salesLead.findMany({
      where: {
        status: { notIn: ['ARCHIVED', 'DELETED'] }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        source: true,
        status: true,
        assignmentType: true,
        assignedToId: true,
        assignedAt: true,
        createdAt: true,
        pipelineStage: {
          select: { id: true, name: true, color: true }
        },
        assignedTo: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            designation: { select: { name: true } },
            user: {
              select: {
                email: true,
                role: { select: { name: true } }
              }
            }
          }
        }
      }
    })
  ]);

  const leads = rawLeads.map((lead) => {
    const rawRoleName = lead.assignedTo?.user?.role?.name || lead.assignedTo?.designation?.name || '';
    const isManager =
      rawRoleName.toLowerCase().includes('manager') ||
      rawRoleName.toUpperCase() === 'SALES_MANAGER';
    const assignedEmployeeRole = lead.assignedTo
      ? (isManager ? 'Sales Manager' : 'Sales Executive')
      : null;
    const assignedEmployeeName = lead.assignedTo
      ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`.trim()
      : 'Unassigned';
    const assignmentStatus = lead.assignedToId
      ? (lead.assignmentType === 'MANUAL' ? 'MANUAL' : 'AUTOMATIC')
      : 'UNASSIGNED';

    return {
      id: lead.id,
      title: lead.title,
      source: lead.source,
      status: lead.status,
      assignmentType: lead.assignmentType,
      assignmentStatus,
      assignedToId: lead.assignedToId,
      assignedEmployeeName,
      assignedEmployeeRole,
      assignedAt: lead.assignedAt,
      createdAt: lead.createdAt,
      pipelineStage: lead.pipelineStage,
      assignedTo: lead.assignedTo
        ? {
            id: lead.assignedTo.id,
            employeeId: lead.assignedTo.employeeId,
            firstName: lead.assignedTo.firstName,
            lastName: lead.assignedTo.lastName,
            roleName: assignedEmployeeRole
          }
        : null
    };
  });

  const totalActiveWorkload = workload.reduce((sum, w) => sum + w.activeLeadsCount, 0);
  const totalWonLeads = workload.reduce((sum, w) => sum + w.wonLeadsCount, 0);

  return {
    autoAssignEnabled: settings ? settings.autoAssignLeads : true,
    lastAssignedLeadExecId: settings?.lastAssignedLeadExecId || null,
    totalActiveWorkload,
    totalWonLeads,
    unassignedCount,
    executives: workload,
    unassignedLeads,
    recentHistory,
    leads
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
