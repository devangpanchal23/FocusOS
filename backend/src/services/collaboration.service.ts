import { prisma } from '../config/db.js';

export class CollaborationService {
  /**
   * Get all accountability circles for a user
   */
  static async getUserCircles(userId: string) {
    const memberships = await prisma.circleMember.findMany({
      where: { userId },
      include: {
        circle: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true }
                }
              }
            }
          }
        }
      }
    });

    return memberships.map(m => ({
      id: m.circle.id,
      name: m.circle.name,
      description: m.circle.description,
      inviteCode: m.circle.inviteCode,
      creatorId: m.circle.creatorId,
      isCreator: m.circle.creatorId === userId,
      memberCount: m.circle.members.length,
      members: m.circle.members.map(member => ({
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        joinedAt: member.joinedAt
      }))
    }));
  }

  /**
   * Create a new circle
   */
  static async createCircle(userId: string, data: { name: string; description?: string }) {
    const codeSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const inviteCode = `CIRCLE-${codeSuffix}`;

    const circle = await prisma.accountabilityCircle.create({
      data: {
        name: data.name,
        description: data.description || 'Focus & Accountability Circle',
        inviteCode,
        creatorId: userId,
        members: {
          create: {
            userId
          }
        }
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    return circle;
  }

  /**
   * Join a circle with invite code
   */
  static async joinCircle(userId: string, inviteCode: string) {
    const circle = await prisma.accountabilityCircle.findUnique({
      where: { inviteCode: inviteCode.trim().toUpperCase() }
    });

    if (!circle) {
      throw new Error('Invalid invite code. No circle found.');
    }

    const existing = await prisma.circleMember.findUnique({
      where: {
        circleId_userId: {
          circleId: circle.id,
          userId
        }
      }
    });

    if (existing) {
      throw new Error('You are already a member of this circle.');
    }

    await prisma.circleMember.create({
      data: {
        circleId: circle.id,
        userId
      }
    });

    return circle;
  }

  /**
   * Leave a circle
   */
  static async leaveCircle(userId: string, circleId: string) {
    await prisma.circleMember.delete({
      where: {
        circleId_userId: {
          circleId,
          userId
        }
      }
    });

    return { success: true };
  }

  /**
   * Get privacy-preserving leaderboard for a circle
   * Only exposes attention score, weekly focus minutes, streak, and tier.
   * Never exposes raw apps, browsing or personal data.
   */
  static async getCircleLeaderboard(userId: string, circleId: string) {
    const circle = await prisma.accountabilityCircle.findUnique({
      where: { id: circleId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                gamification: true
              }
            }
          }
        }
      }
    });

    if (!circle) {
      throw new Error('Circle not found');
    }

    // Verify user is member
    const isMember = circle.members.some(m => m.userId === userId);
    if (!isMember) {
      throw new Error('Unauthorized to view circle leaderboard');
    }

    // Compute weekly focus time and latest attention score for each member
    const memberIds = circle.members.map(m => m.userId);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateLimitStr = sevenDaysAgo.toISOString().split('T')[0];

    const metrics = await prisma.dailyMetric.findMany({
      where: {
        userId: { in: memberIds },
        date: { gte: dateLimitStr }
      }
    });

    const leaderboard = circle.members.map(member => {
      const userMetrics = metrics.filter(m => m.userId === member.userId);
      const totalProductiveMinutes = userMetrics.reduce((acc, m) => acc + m.productiveMinutes, 0);
      const avgAttentionScore = userMetrics.length > 0
        ? Math.round(userMetrics.reduce((acc, m) => acc + m.attentionScore, 0) / userMetrics.length)
        : 75;

      const streak = member.user.gamification?.dailyStreak || 0;
      const level = member.user.gamification?.level || 1;
      const xp = member.user.gamification?.xp || 0;

      return {
        userId: member.user.id,
        name: member.user.name,
        isCurrentUser: member.userId === userId,
        weeklyProductiveHours: Math.round((totalProductiveMinutes / 60) * 10) / 10,
        attentionScore: avgAttentionScore,
        streak,
        level,
        xp
      };
    });

    // Sort by attention score * 0.6 + productiveHours * 0.4
    leaderboard.sort((a, b) => {
      const scoreA = a.attentionScore * 0.6 + a.weeklyProductiveHours * 10 * 0.4;
      const scoreB = b.attentionScore * 0.6 + b.weeklyProductiveHours * 10 * 0.4;
      return scoreB - scoreA;
    });

    return {
      circleId: circle.id,
      circleName: circle.name,
      leaderboard: leaderboard.map((item, idx) => ({
        ...item,
        rank: idx + 1
      }))
    };
  }
}
