-- AlterTable
ALTER TABLE "DataSource" ADD COLUMN "instanceKey" TEXT;
ALTER TABLE "DataSource" ADD COLUMN "label" TEXT;

-- CreateTable
CREATE TABLE "AutomationConditionGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleId" TEXT NOT NULL,
    "logic" TEXT NOT NULL,
    "parentGroupId" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutomationConditionGroup_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AutomationRule" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AutomationConditionGroup_parentGroupId_fkey" FOREIGN KEY ("parentGroupId") REFERENCES "AutomationConditionGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AutomationRuleTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "defaultConditionsJson" TEXT NOT NULL,
    "defaultActionJson" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'Zap',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AutomationDeliveryLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutomationDeliveryLog_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AutomationRule" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AutomationDeliveryLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DesktopAgentSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "collectWindowTitles" BOOLEAN NOT NULL DEFAULT true,
    "collectAppNames" BOOLEAN NOT NULL DEFAULT true,
    "excludedApplications" TEXT NOT NULL DEFAULT '[]',
    "excludedWindowPatterns" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DesktopAgentSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MobileDevicePermission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_REQUESTED',
    "lastCheckedAt" DATETIME,
    "source" TEXT NOT NULL DEFAULT 'USER_REPORTED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MobileDevicePermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShortFormSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT,
    "platform" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "endedAt" DATETIME,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "itemCount" INTEGER,
    "avgItemDurationSeconds" REAL,
    "dataQuality" TEXT NOT NULL,
    "sourceUnifiedEventId" TEXT,
    "date" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShortFormSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShortFormSession_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimeIntelligencePreferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "periodsJson" TEXT NOT NULL DEFAULT '[{"key":"MORNING","label":"Morning","start":"05:00","end":"12:00"},{"key":"AFTERNOON","label":"Afternoon","start":"12:00","end":"17:00"},{"key":"EVENING","label":"Evening","start":"17:00","end":"22:00"},{"key":"LATE_NIGHT","label":"Late Night","start":"22:00","end":"05:00"}]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TimeIntelligencePreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "AutomationRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AutomationRule" ("actionTarget", "actionType", "conditionLogic", "conditionOperator", "createdAt", "id", "isEnabled", "lastTriggeredAt", "name", "thresholdValue", "triggerType", "updatedAt", "userId") SELECT "actionTarget", "actionType", "conditionLogic", "conditionOperator", "createdAt", "id", "isEnabled", "lastTriggeredAt", "name", "thresholdValue", "triggerType", "updatedAt", "userId" FROM "AutomationRule";
DROP TABLE "AutomationRule";
ALTER TABLE "new_AutomationRule" RENAME TO "AutomationRule";
CREATE TABLE "new_AutomationCondition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleId" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "conditionOperator" TEXT NOT NULL,
    "thresholdValue" TEXT NOT NULL,
    "scopeValue" TEXT,
    "timeWindowStart" TEXT,
    "timeWindowEnd" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "groupId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutomationCondition_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AutomationRule" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AutomationCondition_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AutomationConditionGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AutomationCondition" ("conditionOperator", "createdAt", "id", "orderIndex", "ruleId", "scopeValue", "thresholdValue", "timeWindowEnd", "timeWindowStart", "triggerType") SELECT "conditionOperator", "createdAt", "id", "orderIndex", "ruleId", "scopeValue", "thresholdValue", "timeWindowEnd", "timeWindowStart", "triggerType" FROM "AutomationCondition";
DROP TABLE "AutomationCondition";
ALTER TABLE "new_AutomationCondition" RENAME TO "AutomationCondition";
CREATE TABLE "new_RawEvent" (
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
    "maxRetries" INTEGER NOT NULL DEFAULT 5,
    "nextRetryAt" DATETIME,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RawEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RawEvent_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RawEvent_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RawEvent" ("createdAt", "dataSourceId", "deviceId", "errorMessage", "eventHash", "id", "occurredAt", "payloadJson", "processingStatus", "receivedAt", "retryCount", "userId") SELECT "createdAt", "dataSourceId", "deviceId", "errorMessage", "eventHash", "id", "occurredAt", "payloadJson", "processingStatus", "receivedAt", "retryCount", "userId" FROM "RawEvent";
DROP TABLE "RawEvent";
ALTER TABLE "new_RawEvent" RENAME TO "RawEvent";
CREATE INDEX "RawEvent_userId_processingStatus_idx" ON "RawEvent"("userId", "processingStatus");
CREATE INDEX "RawEvent_dataSourceId_occurredAt_idx" ON "RawEvent"("dataSourceId", "occurredAt");
CREATE UNIQUE INDEX "RawEvent_userId_eventHash_key" ON "RawEvent"("userId", "eventHash");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "AutomationRuleTemplate_key_key" ON "AutomationRuleTemplate"("key");

-- CreateIndex
CREATE UNIQUE INDEX "DesktopAgentSettings_userId_key" ON "DesktopAgentSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MobileDevicePermission_userId_dataSourceId_permission_key" ON "MobileDevicePermission"("userId", "dataSourceId", "permission");

-- CreateIndex
CREATE INDEX "ShortFormSession_userId_platform_date_idx" ON "ShortFormSession"("userId", "platform", "date");

-- CreateIndex
CREATE INDEX "ShortFormSession_userId_dataQuality_date_idx" ON "ShortFormSession"("userId", "dataQuality", "date");

-- CreateIndex
CREATE UNIQUE INDEX "TimeIntelligencePreferences_userId_key" ON "TimeIntelligencePreferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DataSource_userId_sourceType_instanceKey_key" ON "DataSource"("userId", "sourceType", "instanceKey");

