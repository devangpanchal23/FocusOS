import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Focus Intelligence database...');

  // 1. Categories
  const categoriesData = [
    { name: 'Short-form Content', color: '#f43f5e', isProductive: false, isShortForm: true, icon: 'Flame' },
    { name: 'Social Media', color: '#ec4899', isProductive: false, isShortForm: true, icon: 'Share2' },
    { name: 'Development', color: '#10b981', isProductive: true, isShortForm: false, icon: 'Code' },
    { name: 'Productivity', color: '#3b82f6', isProductive: true, isShortForm: false, icon: 'Briefcase' },
    { name: 'Entertainment', color: '#8b5cf6', isProductive: false, isShortForm: false, icon: 'Film' },
    { name: 'Communication', color: '#06b6d4', isProductive: false, isShortForm: false, icon: 'MessageSquare' },
    { name: 'Browser', color: '#64748b', isProductive: false, isShortForm: false, icon: 'Compass' },
    { name: 'Education', color: '#f59e0b', isProductive: true, isShortForm: false, icon: 'BookOpen' },
    { name: 'Utilities', color: '#94a3b8', isProductive: false, isShortForm: false, icon: 'Wrench' },
  ];

  const categoryMap: Record<string, string> = {};
  for (const cat of categoriesData) {
    const created = await prisma.category.upsert({
      where: { name: cat.name },
      update: cat,
      create: cat,
    });
    categoryMap[cat.name] = created.id;
  }

  // 2. Applications & Aliases
  const appsData = [
    {
      canonicalName: 'Instagram',
      defaultCategory: 'Social Media',
      aliases: ['instagram', 'instagram.com', 'instagram web', 'com.instagram.android'],
    },
    {
      canonicalName: 'YouTube',
      defaultCategory: 'Entertainment',
      aliases: ['youtube', 'youtube shorts', 'yt shorts', 'com.google.android.youtube'],
    },
    {
      canonicalName: 'WhatsApp',
      defaultCategory: 'Communication',
      aliases: ['whatsapp', 'whatsapp web', 'com.whatsapp'],
    },
    {
      canonicalName: 'Claude',
      defaultCategory: 'Productivity',
      aliases: ['claude', 'claude.ai', 'com.anthropic.claude'],
    },
    {
      canonicalName: 'Visual Studio Code',
      defaultCategory: 'Development',
      aliases: ['vscode', 'code', 'visual studio code'],
    },
    {
      canonicalName: 'Brave Browser',
      defaultCategory: 'Browser',
      aliases: ['brave', 'brave-browser', 'brave browser'],
    },
    {
      canonicalName: 'Google Chrome',
      defaultCategory: 'Browser',
      aliases: ['chrome', 'google-chrome'],
    },
    {
      canonicalName: 'Uber',
      defaultCategory: 'Utilities',
      aliases: ['uber', 'com.ubercab'],
    },
    {
      canonicalName: 'Phone',
      defaultCategory: 'Communication',
      aliases: ['phone', 'dialer', 'com.google.android.dialer'],
    },
    {
      canonicalName: 'Snapchat',
      defaultCategory: 'Social Media',
      aliases: ['snapchat', 'snapchat spotlight', 'com.snapchat.android'],
    },
  ];

  const appMap: Record<string, string> = {};
  for (const app of appsData) {
    const createdApp = await prisma.application.upsert({
      where: { canonicalName: app.canonicalName },
      update: { defaultCategoryId: categoryMap[app.defaultCategory] },
      create: {
        canonicalName: app.canonicalName,
        defaultCategoryId: categoryMap[app.defaultCategory],
      },
    });
    appMap[app.canonicalName] = createdApp.id;

    for (const alias of app.aliases) {
      await prisma.applicationAlias.upsert({
        where: { alias },
        update: { applicationId: createdApp.id },
        create: { alias, applicationId: createdApp.id },
      });
    }
  }

  // 3. Demo User
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const user = await prisma.user.upsert({
    where: { email: 'devang@focusintelligence.io' },
    update: { passwordHash, name: 'Devang Patel' },
    create: {
      email: 'devang@focusintelligence.io',
      passwordHash,
      name: 'Devang Patel',
      timezone: 'Asia/Kolkata',
      dailyTargetMinutes: 240, // 4 hours goal
    },
  });

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      sleepSchedule: '23:30 - 07:00',
      workHours: '09:00 - 18:00',
      bio: 'Software engineer focusing on building deep work habits and curbing short-form screen time.',
    },
  });

  // 4. User Devices
  const phone = await prisma.device.upsert({
    where: { id: 'device-pixel-phone' },
    update: { userId: user.id },
    create: {
      id: 'device-pixel-phone',
      userId: user.id,
      name: 'Pixel 9 Pro',
      deviceType: 'PHONE',
      os: 'ANDROID',
      timezone: 'Asia/Kolkata',
      lastSyncAt: new Date(),
      status: 'HEALTHY',
    },
  });

  const laptop = await prisma.device.upsert({
    where: { id: 'device-thinkpad-laptop' },
    update: { userId: user.id },
    create: {
      id: 'device-thinkpad-laptop',
      userId: user.id,
      name: 'ThinkPad Windows 11',
      deviceType: 'LAPTOP',
      os: 'WINDOWS',
      timezone: 'Asia/Kolkata',
      lastSyncAt: new Date(),
      status: 'HEALTHY',
    },
  });

  // 5. Seed Historical 7 Days
  const today = new Date();
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  // Realistic historical pattern
  const dailyData = [
    { date: dates[0], screenTime: 440, shorts: 180, focus: 190, score: 68, notifs: 480, unlocks: 68, reels: 520 },
    { date: dates[1], screenTime: 490, shorts: 210, focus: 160, score: 62, notifs: 512, unlocks: 72, reels: 590 },
    { date: dates[2], screenTime: 380, shorts: 120, focus: 240, score: 81, notifs: 410, unlocks: 54, reels: 340 },
    { date: dates[3], screenTime: 430, shorts: 160, focus: 210, score: 74, notifs: 460, unlocks: 65, reels: 480 },
    { date: dates[4], screenTime: 510, shorts: 240, focus: 140, score: 58, notifs: 590, unlocks: 84, reels: 710 },
    { date: dates[5], screenTime: 420, shorts: 150, focus: 220, score: 77, notifs: 440, unlocks: 60, reels: 430 },
    // Today: Matches the user's exact screenshot metrics
    { date: dates[6], screenTime: 468, shorts: 205, focus: 192, score: 72, notifs: 532, unlocks: 75, reels: 698 },
  ];

  for (const item of dailyData) {
    await prisma.dailyMetric.upsert({
      where: { userId_date: { userId: user.id, date: item.date } },
      update: {
        totalScreenTimeMinutes: item.screenTime,
        activeMinutes: item.screenTime - 40,
        backgroundMinutes: 40,
        shortFormMinutes: item.shorts,
        productiveMinutes: item.focus,
        entertainmentMinutes: 45,
        socialMinutes: item.screenTime - item.focus - 45,
        communicationMinutes: 21,
        reelCount: item.reels,
        notificationCount: item.notifs,
        unlockCount: item.unlocks,
        attentionScore: item.score,
        dataConfidence: 0.98,
        coverageStatus: 'CONFIRMED',
      },
      create: {
        userId: user.id,
        date: item.date,
        totalScreenTimeMinutes: item.screenTime,
        activeMinutes: item.screenTime - 40,
        backgroundMinutes: 40,
        shortFormMinutes: item.shorts,
        productiveMinutes: item.focus,
        entertainmentMinutes: 45,
        socialMinutes: item.screenTime - item.focus - 45,
        communicationMinutes: 21,
        reelCount: item.reels,
        notificationCount: item.notifs,
        unlockCount: item.unlocks,
        attentionScore: item.score,
        dataConfidence: 0.98,
        coverageStatus: 'CONFIRMED',
      },
    });

    // Add usage records for today (dates[6])
    if (item.date === dates[6]) {
      const records = [
        // Phone records (matching Android wellbeing screenshot)
        { app: 'Instagram', cat: 'Social Media', active: 368, bg: 15, shorts: 205, reels: 698, dev: phone.id },
        { app: 'Claude', cat: 'Productivity', active: 21, bg: 0, shorts: 0, reels: 0, dev: phone.id },
        { app: 'Phone', cat: 'Communication', active: 12, bg: 0, shorts: 0, reels: 0, dev: phone.id },
        { app: 'WhatsApp', cat: 'Communication', active: 9, bg: 2, shorts: 0, reels: 0, dev: phone.id },
        { app: 'Uber', cat: 'Utilities', active: 9, bg: 0, shorts: 0, reels: 0, dev: phone.id },
        { app: 'YouTube', cat: 'Entertainment', active: 8, bg: 0, shorts: 8, reels: 14, dev: phone.id },
        // Laptop records (matching Windows battery/app usage screenshot)
        { app: 'Brave Browser', cat: 'Browser', active: 61, bg: 91, shorts: 0, reels: 0, dev: laptop.id },
        { app: 'Visual Studio Code', cat: 'Development', active: 171, bg: 30, shorts: 0, reels: 0, dev: laptop.id },
      ];

      for (const rec of records) {
        await prisma.usageRecord.create({
          data: {
            userId: user.id,
            deviceId: rec.dev,
            applicationId: appMap[rec.app],
            categoryId: categoryMap[rec.cat],
            date: item.date,
            activeMinutes: rec.active,
            backgroundMinutes: rec.bg,
            shortsMinutes: rec.shorts,
            reelCount: rec.reels,
            source: 'AI_EXTRACTED',
            confidence: 0.98,
            status: 'CONFIRMED',
          },
        });
      }
    }
  }

  console.log('Focus Intelligence seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
