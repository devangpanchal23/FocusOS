import { prisma } from '../config/db.js';

export class RoutineService {
  /**
   * List all routines for user
   */
  static async getRoutines(userId: string) {
    const routines = await prisma.routineSchedule.findMany({
      where: { userId },
      orderBy: { startTime: 'asc' },
    });

    const now = new Date();
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const currentDay = dayNames[now.getDay()];
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    return routines.map((r) => {
      let days: string[] = [];
      try {
        days = JSON.parse(r.daysOfWeek);
      } catch {
        days = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
      }

      const isToday = days.includes(currentDay);
      let isCurrentlyActive = false;
      if (r.isEnabled && isToday) {
        if (r.startTime <= r.endTime) {
          isCurrentlyActive = currentTimeStr >= r.startTime && currentTimeStr <= r.endTime;
        } else {
          isCurrentlyActive = currentTimeStr >= r.startTime || currentTimeStr <= r.endTime;
        }
      }

      return {
        ...r,
        parsedDays: days,
        isCurrentlyActive,
      };
    });
  }

  /**
   * Create a routine
   */
  static async createRoutine(userId: string, data: {
    title: string;
    category?: string;
    startTime: string;
    endTime: string;
    daysOfWeek?: string[];
    isStrict?: boolean;
    isEnabled?: boolean;
    color?: string;
  }) {
    return prisma.routineSchedule.create({
      data: {
        userId,
        title: data.title,
        category: data.category || 'Productivity',
        startTime: data.startTime,
        endTime: data.endTime,
        daysOfWeek: JSON.stringify(data.daysOfWeek || ['MON', 'TUE', 'WED', 'THU', 'FRI']),
        isStrict: data.isStrict ?? false,
        isEnabled: data.isEnabled ?? true,
        color: data.color || '#10b981',
      },
    });
  }

  /**
   * Update routine
   */
  static async updateRoutine(userId: string, routineId: string, data: Partial<{
    title: string;
    category: string;
    startTime: string;
    endTime: string;
    daysOfWeek: string[];
    isStrict: boolean;
    isEnabled: boolean;
    color: string;
  }>) {
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.startTime !== undefined) updateData.startTime = data.startTime;
    if (data.endTime !== undefined) updateData.endTime = data.endTime;
    if (data.daysOfWeek !== undefined) updateData.daysOfWeek = JSON.stringify(data.daysOfWeek);
    if (data.isStrict !== undefined) updateData.isStrict = data.isStrict;
    if (data.isEnabled !== undefined) updateData.isEnabled = data.isEnabled;
    if (data.color !== undefined) updateData.color = data.color;

    return prisma.routineSchedule.updateMany({
      where: { id: routineId, userId },
      data: updateData,
    });
  }

  /**
   * Delete routine
   */
  static async deleteRoutine(userId: string, routineId: string) {
    return prisma.routineSchedule.deleteMany({
      where: { id: routineId, userId },
    });
  }
}
