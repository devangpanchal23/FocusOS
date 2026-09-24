/**
 * Performance-benchmark seeder.
 *
 * Seeds the THROWAWAY perf-test.db (backend/prisma/perf-test.db) with
 * synthetic UnifiedEvent rows (plus the minimal User/Device/Application/
 * Category rows they reference) so perfBenchmark.ts can measure real query
 * timings at scale.
 *
 * This script NEVER touches backend/prisma/dev.db. The PrismaClient below is
 * constructed with an explicit datasource url pointing at perf-test.db, so it
 * ignores whatever DATABASE_URL is set in the environment / .env.
 *
 * Usage:
 *   tsx prisma/scripts/perfSeed.ts <targetTotalUnifiedEventCount>
 *   e.g. tsx prisma/scripts/perfSeed.ts 100000
 *        tsx prisma/scripts/perfSeed.ts 500000
 *
 * Seeding is ADDITIVE: each run tops up UnifiedEvent rows up to the given
 * target total (it counts existing rows first and only inserts the
 * difference). So `perfSeed 100000` then `perfSeed 500000` seeds 100k, then
 * tops up with 400k more to reach 500k total, rather than reseeding from
 * scratch. Re-running with a target <= current count is a no-op.
 */

import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PERF_DB_PATH = path.resolve(__dirname, '../perf-test.db');

const prisma = new PrismaClient({
  datasources: { db: { url: `file:${PERF_DB_PATH}` } },
});

const BATCH_SIZE = 8000;

const SOURCE_TYPES = ['SCREENSHOT_UPLOAD', 'BROWSER_EXTENSION', 'DESKTOP_AGENT', 'MOBILE_APP', 'MANUAL'];
const EVENT_TYPES = ['APP_SESSION', 'DOMAIN_SESSION', 'SCREENSHOT_SUMMARY', 'IDLE', 'FOCUS_SESSION'];
const DEVICE_TYPES = ['PHONE', 'LAPTOP', 'DESKTOP', 'TABLET'];
const OS_LIST = ['ANDROID', 'WINDOWS', 'MACOS', 'IOS', 'LINUX'];

const DOMAINS = [
  'youtube.com', 'github.com', 'stackoverflow.com', 'gmail.com', 'notion.so',
  'twitter.com', 'reddit.com', 'linkedin.com', 'figma.com', 'docs.google.com',
  'amazon.com', 'netflix.com', 'slack.com', 'chatgpt.com', 'localhost:3000',
  'news.ycombinator.com', 'instagram.com', 'whatsapp.com', 'zoom.us', 'medium.com',
];

const APP_NAMES = [
  'Visual Studio Code', 'Chrome', 'Slack', 'Terminal', 'Figma', 'Notion',
  'Spotify', 'Mail', 'Zoom', 'IntelliJ IDEA', 'Docker Desktop', 'Postman',
  'Discord', 'Photoshop', 'Excel', 'WhatsApp', 'Finder', 'System Settings',
];

const CATEGORY_DEFS = [
  { name: 'Development', isProductive: true, isShortForm: false, color: '#6366f1' },
  { name: 'Communication', isProductive: true, isShortForm: false, color: '#22c55e' },
  { name: 'Design', isProductive: true, isShortForm: false, color: '#f59e0b' },
  { name: 'Entertainment', isProductive: false, isShortForm: false, color: '#ef4444' },
  { name: 'Social Media', isProductive: false, isShortForm: true, color: '#ec4899' },
  { name: 'Short-Form Video', isProductive: false, isShortForm: true, color: '#a855f7' },
  { name: 'Research', isProductive: true, isShortForm: false, color: '#14b8a6' },
  { name: 'Other', isProductive: false, isShortForm: false, color: '#64748b' },
];

const NUM_USERS = 5;
const DEVICES_PER_USER = 3;
const DAY_SPREAD = 400; // spread events across ~400 distinct days (> 1 year) for realistic range scans

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function ensureReferenceData() {
  // Users
  const existingUsers = await prisma.user.findMany({ where: { email: { startsWith: 'perf-user-' } } });
  const users = [...existingUsers];
  for (let i = existingUsers.length; i < NUM_USERS; i++) {
    const user = await prisma.user.create({
      data: {
        email: `perf-user-${i}@perf.local`,
        passwordHash: 'x',
        name: `Perf User ${i}`,
      },
    });
    users.push(user);
  }

  // Devices per user
  const devices: { id: string; userId: string }[] = [];
  for (const user of users) {
    const existingDevices = await prisma.device.findMany({ where: { userId: user.id } });
    devices.push(...existingDevices.map((d) => ({ id: d.id, userId: d.userId })));
    for (let i = existingDevices.length; i < DEVICES_PER_USER; i++) {
      const device = await prisma.device.create({
        data: {
          userId: user.id,
          name: `Perf Device ${i}`,
          deviceType: pick(DEVICE_TYPES),
          os: pick(OS_LIST),
        },
      });
      devices.push({ id: device.id, userId: device.userId });
    }
  }

  // Categories
  const categories: { id: string; name: string }[] = [];
  for (const def of CATEGORY_DEFS) {
    const category = await prisma.category.upsert({
      where: { name: def.name },
      update: {},
      create: def,
    });
    categories.push({ id: category.id, name: category.name });
  }

  // Applications
  const applications: { id: string; canonicalName: string }[] = [];
  for (const name of APP_NAMES) {
    const app = await prisma.application.upsert({
      where: { canonicalName: name },
      update: {},
      create: {
        canonicalName: name,
        defaultCategoryId: pick(categories).id,
      },
    });
    applications.push({ id: app.id, canonicalName: app.canonicalName });
  }

  return { users, devices, categories, applications };
}

function buildEventRow(
  users: { id: string }[],
  devices: { id: string; userId: string }[],
  categories: { id: string; name: string }[],
  applications: { id: string; canonicalName: string }[]
) {
  const device = pick(devices);
  const userId = device.userId;
  const sourceType = pick(SOURCE_TYPES);
  const eventType = pick(EVENT_TYPES);
  const isBrowserish = sourceType === 'BROWSER_EXTENSION' || eventType === 'DOMAIN_SESSION';

  const dayOffset = randInt(0, DAY_SPREAD);
  const startedAt = new Date();
  startedAt.setDate(startedAt.getDate() - dayOffset);
  startedAt.setHours(randInt(0, 23), randInt(0, 59), randInt(0, 59), 0);

  const durationSeconds = randInt(5, 3600);
  const endedAt = new Date(startedAt.getTime() + durationSeconds * 1000);
  const category = pick(categories);
  const application = isBrowserish ? null : pick(applications);
  const domain = isBrowserish ? pick(DOMAINS) : null;
  const title = isBrowserish
    ? `${pick(DOMAINS)} - session ${randInt(1, 99999)}`
    : `${pick(APP_NAMES)} - window ${randInt(1, 99999)}`;

  return {
    userId,
    deviceId: device.id,
    sourceType,
    eventType,
    applicationId: application?.id ?? null,
    categoryId: category.id,
    domain,
    title,
    startedAt,
    endedAt,
    durationSeconds,
    isDistraction: !category.name || ['Entertainment', 'Social Media', 'Short-Form Video'].includes(category.name),
    isIdle: eventType === 'IDLE',
    date: toDateStr(startedAt),
    confidence: 1.0,
  };
}

async function main() {
  const targetArg = process.argv[2];
  const target = targetArg ? parseInt(targetArg, 10) : 100000;
  if (!target || target <= 0) {
    console.error('Usage: tsx prisma/scripts/perfSeed.ts <targetTotalUnifiedEventCount>');
    process.exit(1);
  }

  console.log(`Perf seed target: ${target} total UnifiedEvent rows against ${PERF_DB_PATH}`);

  const { users, devices, categories, applications } = await ensureReferenceData();
  console.log(`Reference data ready: ${users.length} users, ${devices.length} devices, ${categories.length} categories, ${applications.length} applications.`);

  const currentCount = await prisma.unifiedEvent.count();
  console.log(`Current UnifiedEvent count in perf-test.db: ${currentCount}`);

  const toInsert = target - currentCount;
  if (toInsert <= 0) {
    console.log(`Already at or above target (${currentCount} >= ${target}). Nothing to do.`);
    await prisma.$disconnect();
    return;
  }

  console.log(`Inserting ${toInsert} new UnifiedEvent rows in batches of ${BATCH_SIZE}...`);

  let inserted = 0;
  const startTime = Date.now();
  while (inserted < toInsert) {
    const batchSize = Math.min(BATCH_SIZE, toInsert - inserted);
    const rows = Array.from({ length: batchSize }, () =>
      buildEventRow(users, devices, categories, applications)
    );
    await prisma.unifiedEvent.createMany({ data: rows });
    inserted += batchSize;
    if (inserted % (BATCH_SIZE * 5) === 0 || inserted === toInsert) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  ...${inserted}/${toInsert} inserted (${elapsed}s elapsed)`);
    }
  }

  const finalCount = await prisma.unifiedEvent.count();
  console.log(`Done. Final UnifiedEvent count: ${finalCount}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
