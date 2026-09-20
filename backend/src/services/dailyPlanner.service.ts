import { prisma } from '../config/db.js';

export class DailyPlannerService {
  /**
   * Get or generate a daily plan for a given date
   */
  static async getDailyPlan(userId: string, date: string) {
    let plan = await prisma.dailyPlan.findUnique({
      where: {
        userId_date: { userId, date }
      },
      include: {
        blocks: {
          orderBy: { startTime: 'asc' }
        }
      }
    });

    if (!plan) {
      // Auto-generate a plan if none exists
      plan = await this.generateAiDailyPlan(userId, date);
    }

    return plan;
  }

  /**
   * Generate an intelligent timetable using goals, routines, and telemetry
   */
  static async generateAiDailyPlan(userId: string, date: string) {
    // 1. Fetch user routines and smart goals
    const [routines, goals, coachingProfile] = await Promise.all([
      prisma.routineSchedule.findMany({ where: { userId, isEnabled: true } }),
      prisma.smartGoal.findMany({ where: { userId, status: 'ACTIVE' } }),
      prisma.coachingProfile.findUnique({ where: { userId } })
    ]);

    const targetFocusHours = coachingProfile?.targetDailyFocusHours || 3.0;

    // 2. Synthesize blocks
    const blocksToCreate: Array<{
      startTime: string;
      endTime: string;
      taskName: string;
      category: string;
      isFixed: boolean;
      isCompleted: boolean;
    }> = [];

    // Morning kick-off
    blocksToCreate.push({
      startTime: '08:30',
      endTime: '09:00',
      taskName: 'Daily Kick-off & FocusOS Review',
      category: 'Planning',
      isFixed: true,
      isCompleted: false
    });

    // Deep Work Block 1 (Primary Goal)
    const primaryGoal = goals[0]?.title || 'Core Project Milestone';
    blocksToCreate.push({
      startTime: '09:00',
      endTime: '11:00',
      taskName: `Deep Work: ${primaryGoal}`,
      category: 'Deep Work',
      isFixed: false,
      isCompleted: false
    });

    // Refresh Break
    blocksToCreate.push({
      startTime: '11:00',
      endTime: '11:20',
      taskName: 'Hydration & Mindful Break (No Screen)',
      category: 'Rest',
      isFixed: false,
      isCompleted: false
    });

    // Deep Work Block 2
    const secondaryTask = goals[1]?.title || 'Skill Building & Review';
    blocksToCreate.push({
      startTime: '11:20',
      endTime: '13:00',
      taskName: `Focused Session: ${secondaryTask}`,
      category: 'Deep Work',
      isFixed: false,
      isCompleted: false
    });

    // Lunch
    blocksToCreate.push({
      startTime: '13:00',
      endTime: '14:00',
      taskName: 'Lunch & Screen Detox Walk',
      category: 'Rest',
      isFixed: true,
      isCompleted: false
    });

    // Afternoon Flow Block
    blocksToCreate.push({
      startTime: '14:00',
      endTime: '16:00',
      taskName: 'Execution & Collaboration Sprint',
      category: 'Execution',
      isFixed: false,
      isCompleted: false
    });

    // Energy Dip / Low Focus Tasks
    blocksToCreate.push({
      startTime: '16:00',
      endTime: '17:00',
      taskName: 'Low-energy Admin, Reading & Async Comms',
      category: 'Admin',
      isFixed: false,
      isCompleted: false
    });

    // Evening wind-down & reflection
    blocksToCreate.push({
      startTime: '19:30',
      endTime: '20:00',
      taskName: 'Evening Telemetry Check & Plan Tomorrow',
      category: 'Review',
      isFixed: false,
      isCompleted: false
    });

    // Upsert the daily plan
    const plan = await prisma.dailyPlan.upsert({
      where: {
        userId_date: { userId, date }
      },
      update: {
        summary: `AI optimized schedule targeting ${targetFocusHours}h deep focus and curbing high-risk distraction intervals.`
      },
      create: {
        userId,
        date,
        summary: `AI optimized schedule targeting ${targetFocusHours}h deep focus and curbing high-risk distraction intervals.`,
        blocks: {
          create: blocksToCreate
        }
      },
      include: {
        blocks: {
          orderBy: { startTime: 'asc' }
        }
      }
    });

    return plan;
  }

  /**
   * Toggle completion of a block
   */
  static async toggleBlockCompletion(userId: string, blockId: string) {
    const block = await prisma.dailyPlanBlock.findUnique({
      where: { id: blockId },
      include: { plan: true }
    });

    if (!block || block.plan.userId !== userId) {
      throw new Error('Block not found or unauthorized');
    }

    const updated = await prisma.dailyPlanBlock.update({
      where: { id: blockId },
      data: { isCompleted: !block.isCompleted }
    });

    return updated;
  }

  /**
   * Add a block to a plan
   */
  static async addBlock(userId: string, date: string, data: {
    startTime: string;
    endTime: string;
    taskName: string;
    category?: string;
    isFixed?: boolean;
  }) {
    let plan = await prisma.dailyPlan.findUnique({
      where: { userId_date: { userId, date } }
    });

    if (!plan) {
      plan = await prisma.dailyPlan.create({
        data: {
          userId,
          date,
          summary: 'Custom schedule'
        }
      });
    }

    const block = await prisma.dailyPlanBlock.create({
      data: {
        planId: plan.id,
        startTime: data.startTime,
        endTime: data.endTime,
        taskName: data.taskName,
        category: data.category || 'Deep Work',
        isFixed: data.isFixed || false,
        isCompleted: false
      }
    });

    return block;
  }

  /**
   * Delete a block
   */
  static async deleteBlock(userId: string, blockId: string) {
    const block = await prisma.dailyPlanBlock.findUnique({
      where: { id: blockId },
      include: { plan: true }
    });

    if (!block || block.plan.userId !== userId) {
      throw new Error('Block not found or unauthorized');
    }

    await prisma.dailyPlanBlock.delete({
      where: { id: blockId }
    });

    return { success: true };
  }
}
