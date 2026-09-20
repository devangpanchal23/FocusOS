import { prisma } from '../config/db.js';
export class GamificationService {
    /**
     * Retrieves or initializes gamification profile for user
     */
    static async getGamification(userId) {
        let profile = await prisma.userGamification.findUnique({
            where: { userId },
        });
        if (!profile) {
            profile = await prisma.userGamification.create({
                data: {
                    userId,
                    xp: 200,
                    level: 1,
                    dailyStreak: 1,
                    focusStreak: 0,
                    longestStreak: 1,
                    lastActiveDate: new Date().toISOString().split('T')[0],
                },
            });
        }
        const achievements = await prisma.achievement.findMany({
            where: { userId },
            orderBy: [{ isUnlocked: 'desc' }, { createdAt: 'asc' }],
        });
        // If achievements don't exist yet for user, seed standard templates
        if (achievements.length === 0) {
            await this.seedUserAchievements(userId);
            return this.getGamification(userId);
        }
        // Calculate level progression percentage
        const currentLevelXpFloor = (profile.level - 1) * 400;
        const nextLevelXpCeil = profile.level * 400;
        const xpIntoLevel = Math.max(0, profile.xp - currentLevelXpFloor);
        const xpNeeded = nextLevelXpCeil - currentLevelXpFloor;
        const progressPercent = Math.min(100, Math.round((xpIntoLevel / xpNeeded) * 100));
        return {
            ...profile,
            nextLevelXpCeil,
            progressPercent,
            achievements,
        };
    }
    /**
     * Awards XP, checks for level ups and notifications
     */
    static async awardXP(userId, xpAmount, reason) {
        let profile = await prisma.userGamification.findUnique({ where: { userId } });
        if (!profile) {
            await this.getGamification(userId);
            profile = await prisma.userGamification.findUnique({ where: { userId } });
        }
        const newXp = (profile?.xp || 0) + xpAmount;
        const calculatedLevel = Math.max(1, Math.floor(newXp / 400) + 1);
        const leveledUp = profile ? calculatedLevel > profile.level : false;
        const updated = await prisma.userGamification.update({
            where: { userId },
            data: {
                xp: newXp,
                level: calculatedLevel,
                lastActiveDate: new Date().toISOString().split('T')[0],
            },
        });
        if (leveledUp) {
            await prisma.notification.create({
                data: {
                    userId,
                    type: 'ACHIEVEMENT',
                    title: `🎉 Level Up! You reached Level ${calculatedLevel}!`,
                    message: `Congratulations! Your dedication earned you Level ${calculatedLevel} (${newXp} total XP). Keep the momentum going!`,
                },
            });
        }
        return { ...updated, leveledUp, xpAwarded: xpAmount, reason };
    }
    /**
     * Initializes default achievements for a user
     */
    static async seedUserAchievements(userId) {
        const templates = [
            {
                code: 'FIRST_FOCUS',
                title: 'Deep Diver',
                description: 'Complete your first focused deep-work Pomodoro session.',
                icon: 'Zap',
                xpReward: 150,
                isUnlocked: false,
            },
            {
                code: 'STREAK_7_DAYS',
                title: 'Consistency Master',
                description: 'Maintain a 7-day streak of logging digital usage and focus.',
                icon: 'Flame',
                xpReward: 350,
                isUnlocked: false,
            },
            {
                code: 'SHORTS_CURBED',
                title: 'Mindful Scroller',
                description: 'Limit daily short-form video consumption below 30 minutes.',
                icon: 'ShieldCheck',
                xpReward: 200,
                isUnlocked: false,
            },
            {
                code: 'DEEP_WORK_10H',
                title: 'Flow State Prodigy',
                description: 'Accumulate over 10 hours of verified deep-work focus sessions.',
                icon: 'Award',
                xpReward: 500,
                isUnlocked: false,
            },
            {
                code: 'ZERO_DISTRACTIONS',
                title: 'Iron Will',
                description: 'Complete 3 consecutive focus sessions with zero recorded distractions.',
                icon: 'Crosshair',
                xpReward: 300,
                isUnlocked: false,
            },
            {
                code: 'AUTOMATION_PRO',
                title: 'Rule Architect',
                description: 'Create and activate custom behavioral automation rules.',
                icon: 'Cpu',
                xpReward: 250,
                isUnlocked: false,
            },
        ];
        for (const t of templates) {
            await prisma.achievement.upsert({
                where: { userId_code: { userId, code: t.code } },
                update: {},
                create: {
                    userId,
                    code: t.code,
                    title: t.title,
                    description: t.description,
                    icon: t.icon,
                    xpReward: t.xpReward,
                    isUnlocked: t.isUnlocked,
                },
            });
        }
    }
    /**
     * Evaluates and unlocks eligible achievements for user
     */
    static async checkAchievements(userId) {
        const [focusSessions, dailyMetrics, userRules] = await Promise.all([
            prisma.focusSession.findMany({ where: { userId, status: 'COMPLETED' } }),
            prisma.dailyMetric.findMany({ where: { userId } }),
            prisma.automationRule.findMany({ where: { userId, isEnabled: true } }),
        ]);
        const totalFocusMinutes = focusSessions.reduce((acc, s) => acc + s.completedMinutes, 0);
        const zeroDistractionSessions = focusSessions.filter((s) => s.distractionsCount === 0);
        const toUnlock = [];
        if (focusSessions.length >= 1)
            toUnlock.push('FIRST_FOCUS');
        if (totalFocusMinutes >= 600)
            toUnlock.push('DEEP_WORK_10H');
        if (zeroDistractionSessions.length >= 3)
            toUnlock.push('ZERO_DISTRACTIONS');
        if (userRules.length >= 1)
            toUnlock.push('AUTOMATION_PRO');
        const lowShortsDay = dailyMetrics.some((m) => m.shortFormMinutes > 0 && m.shortFormMinutes < 30);
        if (lowShortsDay)
            toUnlock.push('SHORTS_CURBED');
        for (const code of toUnlock) {
            const ach = await prisma.achievement.findUnique({
                where: { userId_code: { userId, code } },
            });
            if (ach && !ach.isUnlocked) {
                await prisma.achievement.update({
                    where: { userId_code: { userId, code } },
                    data: {
                        isUnlocked: true,
                        unlockedAt: new Date(),
                    },
                });
                await this.awardXP(userId, ach.xpReward, `Unlocked achievement: ${ach.title}`);
                await prisma.notification.create({
                    data: {
                        userId,
                        type: 'ACHIEVEMENT',
                        title: `🏆 Achievement Unlocked: ${ach.title}!`,
                        message: `${ach.description} (+${ach.xpReward} XP)`,
                    },
                });
            }
        }
    }
}
