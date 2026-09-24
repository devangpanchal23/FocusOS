-- CreateTable
CREATE TABLE "AutomationCondition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleId" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "conditionOperator" TEXT NOT NULL,
    "thresholdValue" TEXT NOT NULL,
    "scopeValue" TEXT,
    "timeWindowStart" TEXT,
    "timeWindowEnd" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutomationCondition_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AutomationRule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DataSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "deviceId" TEXT,
    "adapterVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastSeenAt" DATETIME,
    "lastSyncAt" DATETIME,
    "syncToken" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DataSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DataSource_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RawEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "deviceId" TEXT,
    "eventHash" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processingStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RawEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RawEvent_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RawEvent_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UnifiedEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "rawEventId" TEXT,
    "deviceId" TEXT,
    "sourceType" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "applicationId" TEXT,
    "categoryId" TEXT,
    "domain" TEXT,
    "title" TEXT,
    "startedAt" DATETIME NOT NULL,
    "endedAt" DATETIME,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "isDistraction" BOOLEAN NOT NULL DEFAULT false,
    "isIdle" BOOLEAN NOT NULL DEFAULT false,
    "date" TEXT NOT NULL,
    "confidence" REAL NOT NULL DEFAULT 1.0,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UnifiedEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UnifiedEvent_rawEventId_fkey" FOREIGN KEY ("rawEventId") REFERENCES "RawEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UnifiedEvent_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UnifiedEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UnifiedEvent_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BrowserExclusionRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "domainPattern" TEXT NOT NULL,
    "reason" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BrowserExclusionRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DomainCategoryRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "domainPattern" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "isDistraction" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DomainCategoryRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DomainCategoryRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimeIntelligenceBaseline" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "hourOfDay" INTEGER NOT NULL,
    "meanMinutes" REAL NOT NULL,
    "stdDevMinutes" REAL NOT NULL,
    "sampleDays" INTEGER NOT NULL,
    "computedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimeIntelligenceBaseline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimeIntelligenceAnomaly" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "scopeLabel" TEXT NOT NULL,
    "hourOfDay" INTEGER NOT NULL,
    "actualMinutes" REAL NOT NULL,
    "baselineMean" REAL NOT NULL,
    "zScore" REAL NOT NULL,
    "direction" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimeIntelligenceAnomaly_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MobileLinkToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "consumedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MobileLinkToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AutomationRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "conditionOperator" TEXT NOT NULL,
    "thresholdValue" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "actionTarget" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "conditionLogic" TEXT NOT NULL DEFAULT 'SINGLE',
    CONSTRAINT "AutomationRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AutomationRule" ("actionTarget", "actionType", "conditionOperator", "createdAt", "id", "isEnabled", "lastTriggeredAt", "name", "thresholdValue", "triggerType", "updatedAt", "userId") SELECT "actionTarget", "actionType", "conditionOperator", "createdAt", "id", "isEnabled", "lastTriggeredAt", "name", "thresholdValue", "triggerType", "updatedAt", "userId" FROM "AutomationRule";
DROP TABLE "AutomationRule";
ALTER TABLE "new_AutomationRule" RENAME TO "AutomationRule";
CREATE TABLE "new_AutomationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "triggeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conditionSnapshotJson" TEXT,
    "triggerSource" TEXT NOT NULL DEFAULT 'SCHEDULED',
    CONSTRAINT "AutomationLog_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AutomationRule" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AutomationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AutomationLog" ("id", "message", "ruleId", "triggeredAt", "userId") SELECT "id", "message", "ruleId", "triggeredAt", "userId" FROM "AutomationLog";
DROP TABLE "AutomationLog";
ALTER TABLE "new_AutomationLog" RENAME TO "AutomationLog";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "DataSource_syncToken_key" ON "DataSource"("syncToken");

-- CreateIndex
CREATE INDEX "DataSource_userId_sourceType_idx" ON "DataSource"("userId", "sourceType");

-- CreateIndex
CREATE INDEX "RawEvent_userId_processingStatus_idx" ON "RawEvent"("userId", "processingStatus");

-- CreateIndex
CREATE INDEX "RawEvent_dataSourceId_occurredAt_idx" ON "RawEvent"("dataSourceId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "RawEvent_userId_eventHash_key" ON "RawEvent"("userId", "eventHash");

-- CreateIndex
CREATE UNIQUE INDEX "UnifiedEvent_rawEventId_key" ON "UnifiedEvent"("rawEventId");

-- CreateIndex
CREATE INDEX "UnifiedEvent_userId_date_idx" ON "UnifiedEvent"("userId", "date");

-- CreateIndex
CREATE INDEX "UnifiedEvent_userId_sourceType_date_idx" ON "UnifiedEvent"("userId", "sourceType", "date");

-- CreateIndex
CREATE INDEX "UnifiedEvent_userId_startedAt_idx" ON "UnifiedEvent"("userId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BrowserExclusionRule_userId_domainPattern_key" ON "BrowserExclusionRule"("userId", "domainPattern");

-- CreateIndex
CREATE UNIQUE INDEX "DomainCategoryRule_userId_domainPattern_key" ON "DomainCategoryRule"("userId", "domainPattern");

-- CreateIndex
CREATE UNIQUE INDEX "TimeIntelligenceBaseline_userId_scopeType_scopeId_hourOfDay_key" ON "TimeIntelligenceBaseline"("userId", "scopeType", "scopeId", "hourOfDay");

-- CreateIndex
CREATE INDEX "TimeIntelligenceAnomaly_userId_date_idx" ON "TimeIntelligenceAnomaly"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "MobileLinkToken_code_key" ON "MobileLinkToken"("code");

