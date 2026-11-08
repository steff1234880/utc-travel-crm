-- Migration: Add Hybrid Automatic Lead Assignment System Models & Fields

-- 1. Extend SalesLead with assignment metadata
ALTER TABLE "SalesLead" ADD COLUMN IF NOT EXISTS "assignmentType" TEXT NOT NULL DEFAULT 'UNASSIGNED';
ALTER TABLE "SalesLead" ADD COLUMN IF NOT EXISTS "assignedAt" TIMESTAMP(3);

-- 2. Extend SystemSettings with lead assignment controls
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "autoAssignLeads" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "lastAssignedLeadExecId" TEXT;

-- 3. Create LeadAssignmentHistory table
CREATE TABLE IF NOT EXISTS "LeadAssignmentHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "salesLeadId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "previousAssigneeId" TEXT,
    "assignedById" TEXT,
    "assignmentType" TEXT NOT NULL DEFAULT 'AUTOMATIC',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeadAssignmentHistory_salesLeadId_fkey" FOREIGN KEY ("salesLeadId") REFERENCES "SalesLead"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LeadAssignmentHistory_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LeadAssignmentHistory_previousAssigneeId_fkey" FOREIGN KEY ("previousAssigneeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LeadAssignmentHistory_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "LeadAssignmentHistory_salesLeadId_idx" ON "LeadAssignmentHistory"("salesLeadId");
CREATE INDEX IF NOT EXISTS "LeadAssignmentHistory_assignedToId_idx" ON "LeadAssignmentHistory"("assignedToId");
CREATE INDEX IF NOT EXISTS "LeadAssignmentHistory_createdAt_idx" ON "LeadAssignmentHistory"("createdAt");

