-- Migration: Add Meta Integration Models
-- Create MetaConfig table
CREATE TABLE IF NOT EXISTS "MetaConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "appId" TEXT,
    "appSecret" TEXT,
    "verifyToken" TEXT,
    "pixelId" TEXT,
    "capiAccessToken" TEXT,
    "testEventCode" TEXT,
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "autoSyncLeads" BOOLEAN NOT NULL DEFAULT true,
    "trackPixel" BOOLEAN NOT NULL DEFAULT true,
    "trackCapi" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "webhookStatus" TEXT NOT NULL DEFAULT 'INACTIVE',
    "webhookLastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create MetaAccount table
CREATE TABLE IF NOT EXISTS "MetaAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "accessToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "metadata" JSONB,
    "lastSyncAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "MetaAccount_platform_accountId_key" ON "MetaAccount"("platform", "accountId");

-- Create MetaMessage table
CREATE TABLE IF NOT EXISTS "MetaMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "externalId" TEXT,
    "senderId" TEXT NOT NULL,
    "senderName" TEXT,
    "recipientId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "content" TEXT NOT NULL,
    "templateName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "enquiryId" TEXT,
    "customerId" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MetaMessage_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MetaMessage_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "MetaMessage_externalId_key" ON "MetaMessage"("externalId");
CREATE INDEX IF NOT EXISTS "MetaMessage_platform_senderId_idx" ON "MetaMessage"("platform", "senderId");
CREATE INDEX IF NOT EXISTS "MetaMessage_enquiryId_idx" ON "MetaMessage"("enquiryId");
CREATE INDEX IF NOT EXISTS "MetaMessage_customerId_idx" ON "MetaMessage"("customerId");

-- Create MetaProcessedEvent table
CREATE TABLE IF NOT EXISTS "MetaProcessedEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payloadSummary" TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS "MetaProcessedEvent_eventId_key" ON "MetaProcessedEvent"("eventId");

