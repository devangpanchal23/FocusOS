import { prisma } from '../config/db.js';
import { GamificationService } from './gamification.service.js';
export class FocusService {
    /**
     * List user focus profiles
     */
    static async getProfiles(userId) {
        return prisma.focusProfile.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' },
            include: {
                _count: { select: { sessions: true } },
            },
        });
    }
    /**
     * Create custom focus profile
     */
    static async createProfile(userId, data) {
        return prisma.focusProfile.create({
            data: {
                userId,
                name: data.name,
                durationMinutes: data.durationMinutes || 25,
                breakMinutes: data.breakMinutes || 5,
                allowedApps: JSON.stringify(data.allowedApps || []),
                blockedApps: JSON.stringify(data.blockedApps || ['Instagram', 'YouTube', 'TikTok']),
                icon: data.icon || 'Zap',
                color: data.color || '#f59e0b',
            },
        });
    }
    /**
     * Update focus profile
     */
    static async updateProfile(userId, profileId, data) {
        const updateData = {};
        if (data.name !== undefined)
            updateData.name = data.name;
        if (data.durationMinutes !== undefined)
            updateData.durationMinutes = data.durationMinutes;
        if (data.breakMinutes !== undefined)
            updateData.breakMinutes = data.breakMinutes;
        if (data.allowedApps !== undefined)
            updateData.allowedApps = JSON.stringify(data.allowedApps);
        if (data.blockedApps !== undefined)
            updateData.blockedApps = JSON.stringify(data.blockedApps);
        if (data.icon !== undefined)
            updateData.icon = data.icon;
        if (data.color !== undefined)
            updateData.color = data.color;
        return prisma.focusProfile.updateMany({
            where: { id: profileId, userId },
            data: updateData,
        });
    }
    /**
     * Delete focus profile
     */
    static async deleteProfile(userId, profileId) {
        return prisma.focusProfile.deleteMany({
            where: { id: profileId, userId },
        });
    }
    /**
     * Start a new focus session
     */
    static async startSession(userId, data) {
        let profile = null;
        if (data.profileId) {
            profile = await prisma.focusProfile.findFirst({
                where: { id: data.profileId, userId },
            });
        }
        const duration = data.durationMinutes || profile?.durationMinutes || 25;
        const breakMin = data.breakMinutes || profile?.breakMinutes || 5;
        const task = data.taskName || profile?.name || 'Focused Session';
        const session = await prisma.focusSession.create({
            data: {
                userId,
                profileId: data.profileId || null,
                taskName: task,
                durationMinutes: duration,
                breakMinutes: breakMin,
                completedMinutes: 0,
                distractionsCount: 0,
                status: 'IN_PROGRESS',
                startedAt: new Date(),
                endedAt: new Date(Date.now() + duration * 60 * 1000),
            },
            include: { profile: true },
        });
        return session;
    }
    /**
     * Increment distraction counter during active session
     */
    static async recordDistraction(userId, sessionId) {
        const session = await prisma.focusSession.findFirst({
            where: { id: sessionId, userId },
        });
        if (!session)
            throw new Error('Session not found');
        return prisma.focusSession.update({
            where: { id: sessionId },
            data: {
                distractionsCount: { increment: 1 },
            },
        });
    }
    /**
     * Complete focus session successfully
     */
    static async completeSession(userId, sessionId, data) {
        const session = await prisma.focusSession.findFirst({
            where: { id: sessionId, userId },
        });
        if (!session)
            throw new Error('Session not found');
        const completedMins = data?.completedMinutes ?? session.durationMinutes;
        const updated = await prisma.focusSession.update({
            where: { id: sessionId },
            data: {
                status: 'COMPLETED',
                completedMinutes: completedMins,
                notes: data?.notes || session.notes,
                endedAt: new Date(),
            },
        });
        // Calculate XP: 2 XP per completed minute + 50 XP bonus if 0 distractions
        const baseXP = completedMins * 2;
        const distractionBonus = session.distractionsCount === 0 ? 50 : 0;
        const totalXP = baseXP + distractionBonus;
        const gamificationResult = await GamificationService.awardXP(userId, totalXP, `Completed ${completedMins}m session (${taskNameSnippet(session.taskName)})`);
        // Evaluate potential unlocks
        await GamificationService.checkAchievements(userId);
        // Create session notification
        await prisma.notification.create({
            data: {
                userId,
                type: 'FOCUS',
                title: `⚡ Focus Session Completed! (+${totalXP} XP)`,
                message: `Great job! You wrapped up "${session.taskName}" (${completedMins} min) with ${session.distractionsCount} recorded distractions.`,
            },
        });
        return {
            session: updated,
            xpEarned: totalXP,
            distractionBonus,
            gamification: gamificationResult,
        };
    }
    /**
     * Abort or interrupt focus session
     */
    static async abortSession(userId, sessionId, data) {
        const session = await prisma.focusSession.findFirst({
            where: { id: sessionId, userId },
        });
        if (!session)
            throw new Error('Session not found');
        const completedMins = data?.completedMinutes || 0;
        return prisma.focusSession.update({
            where: { id: sessionId },
            data: {
                status: 'INTERRUPTED',
                completedMinutes: completedMins,
                notes: data?.notes || 'Session stopped early',
                endedAt: new Date(),
            },
        });
    }
    /**
     * Get past sessions list
     */
    static async getSessions(userId, limit = 20) {
        return prisma.focusSession.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: { profile: true },
        });
    }
    /**
     * Get overall focus statistics
     */
    static async getStats(userId) {
        const sessions = await prisma.focusSession.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        const completed = sessions.filter((s) => s.status === 'COMPLETED');
        const totalMinutes = completed.reduce((acc, s) => acc + s.completedMinutes, 0);
        const zeroDistractionCount = completed.filter((s) => s.distractionsCount === 0).length;
        const cleanRate = completed.length > 0 ? Math.round((zeroDistractionCount / completed.length) * 100) : 100;
        const avgMinutes = completed.length > 0 ? Math.round(totalMinutes / completed.length) : 0;
        return {
            totalFocusMinutes: totalMinutes,
            completedSessionsCount: completed.length,
            totalSessionsAttempted: sessions.length,
            cleanRatePercent: cleanRate,
            averageMinutesPerSession: avgMinutes,
            distractionsLogged: sessions.reduce((acc, s) => acc + s.distractionsCount, 0),
        };
    }
}
function taskNameSnippet(str) {
    return str.length > 24 ? str.substring(0, 24) + '...' : str;
}
