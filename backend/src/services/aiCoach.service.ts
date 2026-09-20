import { prisma } from '../config/db.js';
import { formatMinutes } from '../utils/durationParser.js';

export interface CoachAssessment {
  mode: string;
  targetDailyFocusHours: number;
  tone: string;
  greeting: string;
  currentAssessment: string;
  priorityDirective: string;
  keyStats: {
    todayFocusCompleted: string;
    targetFocusHours: string;
    shortFormCurbed: boolean;
    streakStatus: string;
  };
  recommendedNextStep: {
    title: string;
    description: string;
    actionLabel: string;
    route: string;
  };
}

export class AiCoachService {
  /**
   * Get or initialize coaching profile
   */
  static async getProfile(userId: string) {
    let profile = await prisma.coachingProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      profile = await prisma.coachingProfile.create({
        data: {
          userId,
          mode: 'CODING',
          targetDailyFocusHours: 4.0,
          tone: 'ENCOURAGING',
          lastAdvice: 'Protect your morning focus window from early notification checks.',
        },
      });
    }

    return profile;
  }

  /**
   * Update coaching mode and preferences
   */
  static async updateProfile(userId: string, data: {
    mode?: string;
    targetDailyFocusHours?: number;
    tone?: string;
  }) {
    return prisma.coachingProfile.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        mode: data.mode || 'CODING',
        targetDailyFocusHours: data.targetDailyFocusHours || 4.0,
        tone: data.tone || 'ENCOURAGING',
      },
    });
  }

  /**
   * Generates dynamic coaching assessment tailored to selected persona and real metrics
   */
  static async getCoachAssessment(userId: string): Promise<CoachAssessment> {
    const todayStr = new Date().toISOString().split('T')[0];
    const [profile, todayMetric, focusSessions, gamification, goals] = await Promise.all([
      this.getProfile(userId),
      prisma.dailyMetric.findUnique({ where: { userId_date: { userId, date: todayStr } } }),
      prisma.focusSession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.userGamification.findUnique({ where: { userId } }),
      prisma.smartGoal.findMany({ where: { userId, status: 'ACTIVE' } }),
    ]);

    const completedTodayFocusMins = focusSessions
      .filter((s) => s.status === 'COMPLETED' && s.createdAt.toISOString().startsWith(todayStr))
      .reduce((acc, s) => acc + s.completedMinutes, 0);

    const targetMinutes = Math.round(profile.targetDailyFocusHours * 60);
    const shortFormMins = todayMetric?.shortFormMinutes || 0;
    const isShortsControlled = shortFormMins <= 45;

    let greeting = '';
    let currentAssessment = '';
    let priorityDirective = '';
    let recommendedNextStep = {
      title: 'Launch Focus Session',
      description: 'Kickstart an uninterrupted 25-minute Pomodoro block.',
      actionLabel: 'Enter Focus Studio',
      route: '/focus',
    };

    switch (profile.mode) {
      case 'STUDY':
      case 'EXAM_PREP':
        greeting = `Welcome to Study Command, Scholar. Let's make every revision interval count.`;
        if (completedTodayFocusMins >= targetMinutes) {
          currentAssessment = `Phenomenal discipline! You have hit your target of ${profile.targetDailyFocusHours}h of verified study today.`;
          priorityDirective = 'Switch to light evening review and allow cognitive consolidation.';
          recommendedNextStep = {
            title: 'Reflect & Log Progress',
            description: 'Mark daily study milestones as achieved.',
            actionLabel: 'Review Goals',
            route: '/planner',
          };
        } else {
          const remaining = targetMinutes - completedTodayFocusMins;
          currentAssessment = `You are ${formatMinutes(completedTodayFocusMins)} into your ${profile.targetDailyFocusHours}h target (${formatMinutes(remaining)} remaining).`;
          priorityDirective = 'Initiate a 45-minute active recall interval with distractor apps restricted.';
          recommendedNextStep = {
            title: '45-Minute DSA / Study Sprint',
            description: 'Begin a high-focus interval with Zero Distraction Bonus.',
            actionLabel: 'Start Study Block',
            route: '/focus',
          };
        }
        break;

      case 'CODING':
        greeting = `Greetings, Engineer. Let's maximize flow state and minimize context fragmentation.`;
        if (shortFormMins > 60) {
          currentAssessment = `Alert: High short-form video consumption (${formatMinutes(shortFormMins)}) is draining your working memory reserve.`;
          priorityDirective = 'Activate strict app blocker to protect your afternoon programming blocks.';
          recommendedNextStep = {
            title: 'Lock Social Distractors',
            description: 'Block Instagram and YouTube feeds to reclaim flow.',
            actionLabel: 'Open App Blocker',
            route: '/blocking',
          };
        } else {
          currentAssessment = `Telemetry shows strong code concentration today with ${formatMinutes(completedTodayFocusMins)} of logged deep work.`;
          priorityDirective = 'Target 90 minutes of continuous IDE flow state before checking emails.';
          recommendedNextStep = {
            title: 'Launch 50m Coding Sprint',
            description: 'Deep engineering sprint with ambient Gamma wave soundscape.',
            actionLabel: 'Launch Coding Timer',
            route: '/focus',
          };
        }
        break;

      case 'DEEP_WORK':
        greeting = `Deep Work Mode: Quality of attention dictates the caliber of your output.`;
        currentAssessment = `Attention Score is currently ${todayMetric?.attentionScore || 70}/100 with ${focusSessions.filter((s) => s.distractionsCount === 0).length} clean sessions recorded.`;
        priorityDirective = 'Preserve radical single-tasking. Treat interruptions as cognitive tax.';
        recommendedNextStep = {
          title: 'Schedule Tomorrow\'s Flow Window',
          description: 'Lock your 10 AM morning window to ensure deep work.',
          actionLabel: 'Plan Schedule',
          route: '/routines',
        };
        break;

      case 'WELLNESS':
        greeting = `Digital Wellness Guide: Reconnecting attention with mindful balance.`;
        currentAssessment = `Logged screen time is ${formatMinutes(todayMetric?.totalScreenTimeMinutes || 0)}. Scrolling feeds consumed ${formatMinutes(shortFormMins)}.`;
        priorityDirective = 'Ensure a clear boundary between work completion and digital sunset.';
        recommendedNextStep = {
          title: 'Activate Evening Restrictor',
          description: 'Automatically mute non-essential alerts past 9:00 PM.',
          actionLabel: 'Configure Restrictor',
          route: '/blocking',
        };
        break;

      default:
        greeting = `Focus Coach ready. Let's optimize your productivity trajectory today.`;
        currentAssessment = `You have completed ${formatMinutes(completedTodayFocusMins)} of focused work out of your ${profile.targetDailyFocusHours}h goal.`;
        priorityDirective = 'Consistency compounds. Maintain your 7-day logging streak!';
        recommendedNextStep = {
          title: 'Begin Next Focus Block',
          description: 'Step into your next 25-minute Pomodoro sprint.',
          actionLabel: 'Open Focus Studio',
          route: '/focus',
        };
        break;
    }

    return {
      mode: profile.mode,
      targetDailyFocusHours: profile.targetDailyFocusHours,
      tone: profile.tone,
      greeting,
      currentAssessment,
      priorityDirective,
      keyStats: {
        todayFocusCompleted: formatMinutes(completedTodayFocusMins),
        targetFocusHours: `${profile.targetDailyFocusHours}h`,
        shortFormCurbed: isShortsControlled,
        streakStatus: `${gamification?.dailyStreak || 7}-Day Consistency Streak`,
      },
      recommendedNextStep,
    };
  }
}
