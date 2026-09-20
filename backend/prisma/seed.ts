import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Focus Intelligence V2 database...');

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

  const dailyData = [
    { date: dates[0], screenTime: 440, shorts: 180, focus: 190, score: 68, notifs: 480, unlocks: 68, reels: 520 },
    { date: dates[1], screenTime: 490, shorts: 210, focus: 160, score: 62, notifs: 512, unlocks: 72, reels: 590 },
    { date: dates[2], screenTime: 380, shorts: 120, focus: 240, score: 81, notifs: 410, unlocks: 54, reels: 340 },
    { date: dates[3], screenTime: 430, shorts: 160, focus: 210, score: 74, notifs: 460, unlocks: 65, reels: 480 },
    { date: dates[4], screenTime: 510, shorts: 240, focus: 140, score: 58, notifs: 590, unlocks: 84, reels: 710 },
    { date: dates[5], screenTime: 420, shorts: 150, focus: 220, score: 77, notifs: 440, unlocks: 60, reels: 430 },
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

    if (item.date === dates[6]) {
      // Clear today's records before re-inserting to prevent duplicate stacks on multiple seed runs
      await prisma.usageRecord.deleteMany({
        where: { userId: user.id, date: item.date },
      });

      const records = [
        { app: 'Instagram', cat: 'Social Media', active: 368, bg: 15, shorts: 205, reels: 698, dev: phone.id },
        { app: 'Claude', cat: 'Productivity', active: 21, bg: 0, shorts: 0, reels: 0, dev: phone.id },
        { app: 'Phone', cat: 'Communication', active: 12, bg: 0, shorts: 0, reels: 0, dev: phone.id },
        { app: 'WhatsApp', cat: 'Communication', active: 9, bg: 2, shorts: 0, reels: 0, dev: phone.id },
        { app: 'Uber', cat: 'Utilities', active: 9, bg: 0, shorts: 0, reels: 0, dev: phone.id },
        { app: 'YouTube', cat: 'Entertainment', active: 8, bg: 0, shorts: 8, reels: 14, dev: phone.id },
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

  // ==========================================
  // 6. VERSION 2 SEED DATA
  // ==========================================

  // Focus Profiles
  const profilesData = [
    {
      id: 'profile-deep-work',
      name: 'Deep Work Flow',
      durationMinutes: 50,
      breakMinutes: 10,
      allowedApps: JSON.stringify(['Visual Studio Code', 'Terminal', 'Brave Browser']),
      blockedApps: JSON.stringify(['Instagram', 'YouTube', 'WhatsApp', 'Twitter']),
      icon: 'Zap',
      color: '#f59e0b',
    },
    {
      id: 'profile-dsa-study',
      name: 'DSA & Study Session',
      durationMinutes: 45,
      breakMinutes: 5,
      allowedApps: JSON.stringify(['Visual Studio Code', 'Brave Browser']),
      blockedApps: JSON.stringify(['Instagram', 'YouTube', 'Snapchat', 'Netflix']),
      icon: 'BookOpen',
      color: '#6366f1',
    },
    {
      id: 'profile-code-sprint',
      name: 'High Intensity Sprint',
      durationMinutes: 90,
      breakMinutes: 15,
      allowedApps: JSON.stringify(['Visual Studio Code']),
      blockedApps: JSON.stringify(['Instagram', 'YouTube', 'WhatsApp', 'Phone']),
      icon: 'Code',
      color: '#10b981',
    },
    {
      id: 'profile-quick-flow',
      name: 'Pomodoro Standard',
      durationMinutes: 25,
      breakMinutes: 5,
      allowedApps: JSON.stringify(['All work apps']),
      blockedApps: JSON.stringify(['Instagram', 'Shorts']),
      icon: 'Flame',
      color: '#ec4899',
    },
  ];

  for (const p of profilesData) {
    await prisma.focusProfile.upsert({
      where: { id: p.id },
      update: { userId: user.id, ...p },
      create: { userId: user.id, ...p },
    });
  }

  // Focus Sessions
  await prisma.focusSession.deleteMany({ where: { userId: user.id } });
  await prisma.focusSession.createMany({
    data: [
      {
        userId: user.id,
        profileId: 'profile-deep-work',
        taskName: 'FocusOS V2 Architecture & Schema Design',
        durationMinutes: 50,
        completedMinutes: 50,
        breakMinutes: 10,
        distractionsCount: 1,
        status: 'COMPLETED',
        notes: 'Constructed relational models and automation builder specs.',
        startedAt: new Date(Date.now() - 3 * 3600 * 1000),
        endedAt: new Date(Date.now() - 2 * 3600 * 1000),
      },
      {
        userId: user.id,
        profileId: 'profile-dsa-study',
        taskName: 'LeetCode Graph Algorithms & Trees',
        durationMinutes: 45,
        completedMinutes: 45,
        breakMinutes: 5,
        distractionsCount: 0,
        status: 'COMPLETED',
        notes: 'Solved 2 medium tree traversal problems with 0 distractions.',
        startedAt: new Date(Date.now() - 6 * 3600 * 1000),
        endedAt: new Date(Date.now() - 5 * 3600 * 1000),
      },
    ],
  });

  // Gamification & Streaks
  await prisma.userGamification.upsert({
    where: { userId: user.id },
    update: {
      xp: 1450,
      level: 4,
      dailyStreak: 7,
      focusStreak: 5,
      longestStreak: 12,
      lastActiveDate: dates[6],
    },
    create: {
      userId: user.id,
      xp: 1450,
      level: 4,
      dailyStreak: 7,
      focusStreak: 5,
      longestStreak: 12,
      lastActiveDate: dates[6],
    },
  });

  // Achievements
  const achievements = [
    {
      code: 'FIRST_FOCUS',
      title: 'First Flow State',
      description: 'Completed your first uninterrupted focus session.',
      icon: 'Zap',
      xpReward: 100,
      isUnlocked: true,
      unlockedAt: new Date(Date.now() - 6 * 24 * 3600 * 1000),
    },
    {
      code: 'STREAK_7_DAYS',
      title: 'Consistency Master',
      description: 'Logged and verified screen telemetry for 7 consecutive days.',
      icon: 'Flame',
      xpReward: 250,
      isUnlocked: true,
      unlockedAt: new Date(),
    },
    {
      code: 'SHORTS_CURBED',
      title: 'Algorithm Resistance',
      description: 'Kept daily short-form content consumption below 45 minutes.',
      icon: 'Shield',
      xpReward: 150,
      isUnlocked: true,
      unlockedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000),
    },
    {
      code: 'DEEP_WORK_10H',
      title: 'Deep Work Champion',
      description: 'Accumulate 10 total hours of confirmed focus sessions.',
      icon: 'Award',
      xpReward: 300,
      isUnlocked: false,
    },
    {
      code: 'ZERO_OVERRIDES',
      title: 'Iron Will',
      description: 'Completed 5 blocked-app focus sessions without overriding rules.',
      icon: 'Lock',
      xpReward: 200,
      isUnlocked: true,
      unlockedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
    },
    {
      code: 'NIGHT_REST',
      title: 'Circadian Shield',
      description: 'No screen usage past 11:30 PM for 3 consecutive nights.',
      icon: 'Moon',
      xpReward: 150,
      isUnlocked: false,
    },
  ];

  for (const ach of achievements) {
    await prisma.achievement.upsert({
      where: { userId_code: { userId: user.id, code: ach.code } },
      update: ach,
      create: { userId: user.id, ...ach },
    });
  }

  // Automation Rules
  await prisma.automationRule.deleteMany({ where: { userId: user.id } });
  const createdRule1 = await prisma.automationRule.create({
    data: {
      userId: user.id,
      name: 'Shorts Guard (Alert when Reels > 45m)',
      triggerType: 'REELS_LIMIT',
      conditionOperator: 'GREATER_THAN',
      thresholdValue: '45',
      actionType: 'SHOW_NOTIFICATION',
      actionTarget: 'Instagram Reels',
      isEnabled: true,
      lastTriggeredAt: new Date(),
    },
  });

  await prisma.automationRule.create({
    data: {
      userId: user.id,
      name: 'Evening Restrictor (Block Social Apps 8-11 PM)',
      triggerType: 'TIME_WINDOW',
      conditionOperator: 'CONTAINS',
      thresholdValue: '20:00 - 23:00',
      actionType: 'BLOCK_APP',
      actionTarget: 'Social Media',
      isEnabled: true,
    },
  });

  await prisma.automationRule.create({
    data: {
      userId: user.id,
      name: 'Screen Limit Cap (Alert when Screen > 4h)',
      triggerType: 'SCREEN_TIME_LIMIT',
      conditionOperator: 'GREATER_THAN',
      thresholdValue: '240',
      actionType: 'SHOW_NOTIFICATION',
      actionTarget: 'All Devices',
      isEnabled: true,
    },
  });

  // Block Rules
  await prisma.blockRule.deleteMany({ where: { userId: user.id } });
  await prisma.blockRule.createMany({
    data: [
      {
        userId: user.id,
        targetType: 'APP',
        targetValue: 'Instagram',
        mode: 'SCHEDULED',
        startTime: '20:00',
        endTime: '23:00',
        isEnabled: true,
      },
      {
        userId: user.id,
        targetType: 'WEBSITE',
        targetValue: 'twitter.com',
        mode: 'INSTANT',
        isEnabled: true,
      },
      {
        userId: user.id,
        targetType: 'CATEGORY',
        targetValue: 'Short-form Content',
        mode: 'FOCUS_ONLY',
        isEnabled: true,
      },
    ],
  });

  // Routine Schedules
  await prisma.routineSchedule.deleteMany({ where: { userId: user.id } });
  await prisma.routineSchedule.createMany({
    data: [
      {
        userId: user.id,
        title: 'Morning Deep Work Block',
        category: 'Development',
        startTime: '10:00',
        endTime: '12:00',
        daysOfWeek: JSON.stringify(['MON', 'TUE', 'WED', 'THU', 'FRI']),
        isStrict: true,
        isEnabled: true,
        color: '#10b981',
      },
      {
        userId: user.id,
        title: 'Study & DSA Algorithms',
        category: 'Education',
        startTime: '17:30',
        endTime: '19:00',
        daysOfWeek: JSON.stringify(['MON', 'TUE', 'WED', 'THU', 'SAT']),
        isStrict: false,
        isEnabled: true,
        color: '#6366f1',
      },
      {
        userId: user.id,
        title: 'Evening Digital Sunset (Zero Reels)',
        category: 'Health',
        startTime: '20:00',
        endTime: '23:00',
        daysOfWeek: JSON.stringify(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']),
        isStrict: true,
        isEnabled: true,
        color: '#f43f5e',
      },
    ],
  });

  // Notifications
  await prisma.notification.deleteMany({ where: { userId: user.id } });
  await prisma.notification.createMany({
    data: [
      {
        userId: user.id,
        type: 'ACHIEVEMENT',
        title: '7-Day Streak Unlocked! 🎉',
        message: 'You have logged and confirmed your attention telemetry for 7 consecutive days. +250 XP awarded!',
        isRead: false,
        createdAt: new Date(),
      },
      {
        userId: user.id,
        type: 'WARNING',
        title: 'Peak Scrolling Hotspot Detected',
        message: 'Instagram reels scrolling usually spikes between 8:00 PM – 10:00 PM. Would you like to activate Evening Restrictor?',
        isRead: false,
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
      },
      {
        userId: user.id,
        type: 'INSIGHT',
        title: 'Productivity Trend',
        message: 'Focused coding time is up 18% compared to last week. Your highest flow window is 10 AM to 12 PM.',
        isRead: true,
        createdAt: new Date(Date.now() - 2 * 3600 * 1000),
      },
    ],
  });

  // User Settings
  await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      theme: 'DARK',
      defaultFocusMinutes: 25,
      defaultBreakMinutes: 5,
      weekStartDay: 'MONDAY',
    },
  });

  // ==========================================
  // VERSION 3 SEEDING
  // ==========================================

  // Coaching Profile
  await prisma.coachingProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      mode: 'CODING',
      targetDailyFocusHours: 4.0,
      tone: 'ENCOURAGING',
      lastAdvice: 'Your highest cognitive throughput happens between 10 AM – 12 PM. Shield that window with strict blocking.',
    },
  });

  // SMART Goals
  await prisma.smartGoal.deleteMany({ where: { userId: user.id } });
  await prisma.smartGoal.createMany({
    data: [
      {
        userId: user.id,
        title: 'Deep Work Flow Target',
        goalType: 'FOCUS_HOURS',
        targetValue: 240, // 4 hours in minutes
        period: 'DAILY',
        currentProgress: 195,
        status: 'ACTIVE',
        milestones: JSON.stringify([
          { label: 'Morning Sprint', completed: true },
          { label: 'Afternoon Architecture Block', completed: true },
          { label: 'Evening Review', completed: false },
        ]),
      },
      {
        userId: user.id,
        title: 'Curb Short-Form Feeds',
        goalType: 'REELS_MAX',
        targetValue: 45, // max 45 minutes
        period: 'DAILY',
        currentProgress: 68,
        status: 'ACTIVE',
        milestones: JSON.stringify([
          { label: 'Zero reels before 6 PM', completed: true },
          { label: 'Lock feeds past 9 PM', completed: false },
        ]),
      },
      {
        userId: user.id,
        title: 'Algorithms & Study Mastery',
        goalType: 'STUDY_HOURS',
        targetValue: 90, // 90 min daily
        period: 'DAILY',
        currentProgress: 60,
        status: 'ACTIVE',
        milestones: JSON.stringify([
          { label: '2 LeetCode Mediums', completed: true },
          { label: 'System Design reading', completed: false },
        ]),
      },
    ],
  });

  // AI Daily Plan
  const todayStr = new Date().toISOString().split('T')[0];
  await prisma.dailyPlan.deleteMany({ where: { userId: user.id } });
  const plan = await prisma.dailyPlan.create({
    data: {
      userId: user.id,
      date: todayStr,
      summary: 'High-leverage focus day prioritized for core engineering and short-form reduction.',
      blocks: {
        create: [
          {
            startTime: '09:00',
            endTime: '11:00',
            taskName: 'FocusOS V3 Architecture & Engine Design',
            category: 'Deep Work',
            isCompleted: true,
            isFixed: true,
          },
          {
            startTime: '11:30',
            endTime: '13:00',
            taskName: 'API Endpoint Synthesis & Typecheck',
            category: 'Deep Work',
            isCompleted: true,
            isFixed: false,
          },
          {
            startTime: '14:30',
            endTime: '16:00',
            taskName: 'Companion Browser Extension & UI Testing',
            category: 'Deep Work',
            isCompleted: false,
            isFixed: false,
          },
          {
            startTime: '17:30',
            endTime: '19:00',
            taskName: 'Algorithms & System Design Review',
            category: 'Study',
            isCompleted: false,
            isFixed: false,
          },
          {
            startTime: '21:00',
            endTime: '22:30',
            taskName: 'Digital Wind-Down & Evening Reflection',
            category: 'Wellbeing',
            isCompleted: false,
            isFixed: true,
          },
        ],
      },
    },
  });

  // Behavioral Risk Logs
  await prisma.behavioralRiskLog.deleteMany({ where: { userId: user.id } });
  await prisma.behavioralRiskLog.createMany({
    data: [
      {
        userId: user.id,
        riskType: 'LATE_NIGHT_SPIKE',
        severity: 'HIGH',
        title: 'Late Night Screen-Time Surge Detected',
        description: 'Screen usage extended past 11:30 PM on 3 of the last 4 days.',
        evidence: 'Average late-night screen time: 1h 14m, predominantly on Instagram and YouTube.',
        actionRecommendation: 'Activate the Evening Digital Sunset routine to automatically shield apps at 10 PM.',
        isDismissed: false,
      },
      {
        userId: user.id,
        riskType: 'CONTEXT_SWITCHING',
        severity: 'MEDIUM',
        title: 'Elevated App Context Switching',
        description: 'Frequent toggling between VS Code, WhatsApp, and Chrome during work sessions.',
        evidence: 'Average 18 application switches per hour during your 2 PM - 4 PM window.',
        actionRecommendation: 'Use Strict Mode Pomodoro sessions to minimize notification tabs.',
        isDismissed: false,
      },
    ],
  });

  // Accountability Circle
  const circle = await prisma.accountabilityCircle.upsert({
    where: { inviteCode: 'FOCUS-V3-ALPHA' },
    update: {},
    create: {
      name: 'Full-Stack Flow Circle',
      description: 'Engineers & builders committing to 4+ hours of deep-work daily with zero short-form leaks.',
      inviteCode: 'FOCUS-V3-ALPHA',
      creatorId: user.id,
      members: {
        create: [
          { userId: user.id },
        ],
      },
    },
  });

  // Developer API Key
  await prisma.apiKey.deleteMany({ where: { userId: user.id } });
  await prisma.apiKey.create({
    data: {
      userId: user.id,
      name: 'Personal CLI & Daemon',
      keyPrefix: 'fk_live_devang',
      hashedKey: 'fk_live_9f83a21b67e4198c8e1a7b6c5d4e3f2a1b0c9d8e',
      scopes: 'read:metrics,write:sessions,manage:blocking',
      lastUsedAt: new Date(),
    },
  });

  // AI Chat Session & Welcome Grounding
  await prisma.aiChatSession.deleteMany({ where: { userId: user.id } });
  const chatSession = await prisma.aiChatSession.create({
    data: {
      userId: user.id,
      title: 'Telemetry & Habit Inquiry',
      messages: {
        create: [
          {
            userId: user.id,
            role: 'ASSISTANT',
            content: `Hello ${user.name}! I am your FocusOS AI Productivity Assistant. I have verified access to your telemetry (7h 48m screen time logged today, 72/100 Attention Score, and 4 completed deep-work sessions). What would you like to analyze or plan today?`,
            metadata: JSON.stringify({ verified: true, date: todayStr }),
          },
        ],
      },
    },
  });

  console.log('Focus Intelligence Version 3 ecosystem seeded successfully! 🚀');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
