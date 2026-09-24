import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { EventStoreService } from '../../src/services/v5/eventStore.service.js';

const prisma = new PrismaClient();

/**
 * Idempotent, additive-only backfill: populates DataSource/RawEvent/UnifiedEvent
 * from historical UsageRecord rows. Safe to re-run — dedup relies on the
 * `eventHash` unique constraint on RawEvent, so a second run reports 0 new
 * ingested events. Never deletes or modifies UsageRecord/Screenshot/DailyMetric.
 */
async function main() {
  console.log('Starting V5 UnifiedEvent backfill from UsageRecord history...');

  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  console.log(`Found ${users.length} users.`);

  let totalIngested = 0;
  let totalDuplicates = 0;
  let totalFailed = 0;

  for (const user of users) {
    const dataSource = await EventStoreService.getOrCreateDataSource(user.id, 'SCREENSHOT_UPLOAD', null);

    const usageRecords = await prisma.usageRecord.findMany({
      where: { userId: user.id },
      include: { application: true, category: true },
      orderBy: { createdAt: 'asc' },
    });

    if (usageRecords.length === 0) continue;

    console.log(`User ${user.email}: backfilling ${usageRecords.length} usage records...`);

    // Group by deviceId so each ingest batch targets a consistent DataSource
    const byDevice = new Map<string, typeof usageRecords>();
    for (const record of usageRecords) {
      const key = record.deviceId || '__no_device__';
      if (!byDevice.has(key)) byDevice.set(key, [] as any);
      (byDevice.get(key) as any).push(record);
    }

    for (const [deviceKey, records] of byDevice) {
      const deviceId = deviceKey === '__no_device__' ? null : deviceKey;
      const effectiveDataSource =
        deviceId === (dataSource.deviceId ?? null)
          ? dataSource
          : await EventStoreService.getOrCreateDataSource(user.id, 'SCREENSHOT_UPLOAD', deviceId);

      const events = records.map((r) => ({
        eventType: 'SCREENSHOT_SUMMARY',
        occurredAt: new Date(`${r.date}T12:00:00.000Z`),
        durationSeconds: (r.activeMinutes || 0) * 60,
        applicationId: r.applicationId,
        categoryId: r.categoryId ?? undefined,
        confidence: r.confidence,
        metadata: { usageRecordId: r.id, backfilled: true },
      }));

      const result = await EventStoreService.ingest(user.id, effectiveDataSource.id, deviceId, events);
      totalIngested += result.ingested;
      totalDuplicates += result.duplicates;
      totalFailed += result.failed;
    }
  }

  console.log('Backfill complete.');
  console.log(`  Ingested (new):  ${totalIngested}`);
  console.log(`  Duplicates (skipped, already backfilled): ${totalDuplicates}`);
  console.log(`  Failed: ${totalFailed}`);
}

main()
  .catch((err) => {
    console.error('Backfill script failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
