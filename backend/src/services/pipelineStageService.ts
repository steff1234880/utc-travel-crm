import prisma from '../utils/prisma';
import { Prisma } from '@prisma/client';

/**
 * Resolves a valid pipeline stage ID.
 * If stageIdOrName is provided:
 *   - Checks if it's an existing stage ID or unique stage name.
 *   - If valid, returns that stage's ID.
 * If not provided or invalid:
 *   - Resolves the configured default stage (isDefault: true) or the stage named 'New',
 *     or the first stage by orderIndex.
 */
export async function resolveDefaultPipelineStageId(
  stageIdOrName?: string | null,
  tx?: Prisma.TransactionClient
): Promise<string> {
  const db = tx || prisma;

  if (stageIdOrName && typeof stageIdOrName === 'string') {
    const trimmed = stageIdOrName.trim();
    if (trimmed) {
      // 1. Check by ID
      const byId = await db.salesPipelineStage.findUnique({
        where: { id: trimmed }
      });
      if (byId) return byId.id;

      // 2. Check by name (case-insensitive search)
      const byName = await db.salesPipelineStage.findFirst({
        where: {
          name: { equals: trimmed, mode: 'insensitive' }
        }
      });
      if (byName) return byName.id;
    }
  }

  // Fallback 1: Stage marked isDefault: true
  const defaultStage = await db.salesPipelineStage.findFirst({
    where: { isDefault: true }
  });
  if (defaultStage) return defaultStage.id;

  // Fallback 2: Stage named 'New'
  const newStage = await db.salesPipelineStage.findFirst({
    where: { name: { equals: 'New', mode: 'insensitive' } }
  });
  if (newStage) return newStage.id;

  // Fallback 3: First available stage by orderIndex
  const firstStage = await db.salesPipelineStage.findFirst({
    orderBy: { orderIndex: 'asc' }
  });
  if (firstStage) return firstStage.id;

  throw new Error('No SalesPipelineStage configured in database');
}

/**
 * Repairs all existing Sales Leads where pipelineStageId is NULL or invalid.
 */
export async function repairOrphanedSalesLeads(tx?: Prisma.TransactionClient): Promise<{
  repairedCount: number;
  repairedLeadIds: string[];
}> {
  const db = tx || prisma;

  const defaultStageId = await resolveDefaultPipelineStageId(null, db);
  const allStages = await db.salesPipelineStage.findMany({ select: { id: true } });
  const validStageIds = allStages.map(s => s.id);

  // Find all leads with null or invalid stage
  const allLeads = await db.salesLead.findMany({
    select: { id: true, pipelineStageId: true }
  });

  const orphanedIds = allLeads
    .filter(l => !l.pipelineStageId || !validStageIds.includes(l.pipelineStageId))
    .map(l => l.id);

  if (orphanedIds.length > 0) {
    await db.salesLead.updateMany({
      where: { id: { in: orphanedIds } },
      data: { pipelineStageId: defaultStageId }
    });
  }

  return {
    repairedCount: orphanedIds.length,
    repairedLeadIds: orphanedIds
  };
}

