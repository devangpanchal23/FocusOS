import { prisma } from '../config/db.js';
import { formatMinutes } from '../utils/durationParser.js';

export class GoalService {
  /**
   * List all SMART goals with dynamic real-time progress calculations
   */
  static async getGoals(userId: string) {
    const todayStr = new Date().toISOString().split('T')[0];
    const [goals, todayMetric, focusSessions, usageRecords] = await Promise.all([
      prisma.smartGoal.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      prisma.dailyMetric.findUnique({ where: { userId_date: { userId, date: todayStr } } }),
      prisma.focusSession.findMany({
        where: { userId, status: 'COMPLETED' },
      }),
      prisma.usageRecord.findMany({
        where: { userId, date: todayStr },
        include: { category: true },
      }),
    ]);

    const completedTodayFocus = focusSessions
      .filter((s) => s.createdAt.toISOString().startsWith(todayStr))
      .reduce((acc, s) => acc + s.completedMinutes, 0);

    const studyDevMinutes = usageRecords
      .filter((r) => r.category?.name === 'Development' || r.category?.name === 'Productivity' || r.category?.name === 'Education')
      .reduce((acc, r) => acc + r.activeMinutes, 0);

    const reelsMinutes = todayMetric?.shortFormMinutes || 0;

    return goals.map((goal) => {
      let progress = goal.currentProgress;

      if (goal.goalType === 'FOCUS_HOURS') {
        progress = completedTodayFocus;
      } else if (goal.goalType === 'REELS_MAX') {
        progress = reelsMinutes;
      } else if (goal.goalType === 'STUDY_HOURS') {
        progress = studyDevMinutes;
      }

      const percent = goal.goalType === 'REELS_MAX'
        ? Math.max(0, Math.min(100, Math.round(((goal.targetValue - progress) / (goal.targetValue || 1)) * 100)))
        : Math.min(100, Math.round((progress / (goal.targetValue || 1)) * 100));

      let parsedMilestones = [];
      try {
        parsedMilestones = JSON.parse(goal.milestones);
      } catch {
        parsedMilestones = [];
      }

      return {
        ...goal,
        currentProgress: progress,
        progressPercent: percent,
        isAchieved: percent >= 100,
        parsedMilestones,
      };
    });
  }

  /**
   * Create a new SMART goal
   */
  static async createGoal(userId: string, data: {
    title: string;
    goalType: string;
    targetValue: number;
    period?: string;
    milestones?: { label: string; completed: boolean }[];
  }) {
    return prisma.smartGoal.create({
      data: {
        userId,
        title: data.title,
        goalType: data.goalType,
        targetValue: data.targetValue,
        period: data.period || 'DAILY',
        milestones: JSON.stringify(data.milestones || []),
      },
    });
  }

  /**
   * Update goal
   */
  static async updateGoal(userId: string, goalId: string, data: Partial<{
    title: string;
    targetValue: number;
    status: string;
    currentProgress: number;
    milestones: any[];
  }>) {
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.targetValue !== undefined) updateData.targetValue = data.targetValue;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.currentProgress !== undefined) updateData.currentProgress = data.currentProgress;
    if (data.milestones !== undefined) updateData.milestones = JSON.stringify(data.milestones);

    return prisma.smartGoal.updateMany({
      where: { id: goalId, userId },
      data: updateData,
    });
  }

  /**
   * Delete goal
   */
  static async deleteGoal(userId: string, goalId: string) {
    return prisma.smartGoal.deleteMany({
      where: { id: goalId, userId },
    });
  }

  /**
   * Generative AI Goal Planner
   * Interprets natural language statements and produces structured target plan
   */
  static async generateAiPlan(prompt: string) {
    const lower = prompt.toLowerCase();
    let targetHours = 2;
    if (lower.includes('1 hour') || lower.includes('1h')) targetHours = 1;
    if (lower.includes('3 hour') || lower.includes('3h')) targetHours = 3;
    if (lower.includes('4 hour') || lower.includes('4h')) targetHours = 4;
    if (lower.includes('5 hour') || lower.includes('5h')) targetHours = 5;

    const targetMinutes = targetHours * 60;
    const isCoding = lower.includes('cod') || lower.includes('program') || lower.includes('dev');
    const isShorts = lower.includes('reel') || lower.includes('short') || lower.includes('scroll');

    if (isShorts) {
      return {
        suggestedTitle: 'Strict Short-Form Restriction',
        goalType: 'REELS_MAX',
        targetValue: 30, // max 30 mins
        period: 'DAILY',
        milestones: [
          { label: 'Zero reels during morning hours', completed: true },
          { label: 'Evening app lock at 9:00 PM', completed: false },
          { label: 'Replace scrolling with 15m book reading', completed: false },
        ],
        aiRationale: 'Curtailing short-form feeds below 30m recovers ~2.5 hours of fragmented attention each week.',
      };
    }

    return {
      suggestedTitle: isCoding ? `Deep Code Sprint: ${targetHours}h Daily` : `Focused Study Mastery: ${targetHours}h Daily`,
      goalType: isCoding ? 'CODING_HOURS' : 'FOCUS_HOURS',
      targetValue: targetMinutes,
      period: 'DAILY',
      milestones: [
        { label: `Morning Session 1 (${Math.round(targetMinutes / 2)}m)`, completed: true },
        { label: `Afternoon Session 2 (${Math.round(targetMinutes / 2)}m)`, completed: false },
        { label: 'Evening milestone review & commit', completed: false },
      ],
      aiRationale: `Breaking ${targetHours} hours into two structured intervals avoids cognitive fatigue while ensuring high flow state.`,
    };
  }
}
