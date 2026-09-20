import { prisma } from '../../config/db.js';

export class ContextKnowledgeService {
  /**
   * Get all personal context entries
   */
  static async getContext(userId: string) {
    const items = await prisma.personalContext.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      totalContexts: items.length,
      observedCount: items.filter((c) => c.sourceType === 'OBSERVED_DATA').length,
      preferencesCount: items.filter((c) => c.sourceType === 'USER_PREFERENCE').length,
      assumptionsCount: items.filter((c) => c.sourceType === 'AI_ASSUMPTION').length,
      items,
    };
  }

  /**
   * Upsert context entry
   */
  static async upsertContext(userId: string, data: {
    contextType: string;
    sourceType: string;
    key: string;
    value: string;
    confidence?: number;
    evidence?: string;
  }) {
    return prisma.personalContext.upsert({
      where: { userId_key: { userId, key: data.key } },
      update: {
        contextType: data.contextType,
        sourceType: data.sourceType,
        value: data.value,
        confidence: data.confidence ?? 1.0,
        evidence: data.evidence,
      },
      create: {
        userId,
        contextType: data.contextType,
        sourceType: data.sourceType,
        key: data.key,
        value: data.value,
        confidence: data.confidence ?? 1.0,
        evidence: data.evidence,
      },
    });
  }

  /**
   * Delete context entry
   */
  static async deleteContext(userId: string, key: string) {
    return prisma.personalContext.deleteMany({
      where: { userId, key },
    });
  }

  /**
   * Get knowledge vault items with optional category/tag filter
   */
  static async getKnowledgeItems(userId: string, category?: string, query?: string) {
    const where: any = { userId };
    if (category && category !== 'ALL') {
      where.category = category;
    }

    let items = await prisma.knowledgeItem.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
    });

    if (query) {
      const q = query.toLowerCase();
      items = items.filter(
        (it) => it.title.toLowerCase().includes(q) || it.content.toLowerCase().includes(q) || it.tags.toLowerCase().includes(q)
      );
    }

    return items;
  }

  /**
   * Create knowledge item
   */
  static async createKnowledgeItem(userId: string, data: {
    category: string;
    title: string;
    content: string;
    tags?: string[];
    isPinned?: boolean;
  }) {
    return prisma.knowledgeItem.create({
      data: {
        userId,
        category: data.category,
        title: data.title,
        content: data.content,
        tags: JSON.stringify(data.tags || []),
        isPinned: data.isPinned ?? false,
      },
    });
  }

  /**
   * Update knowledge item
   */
  static async updateKnowledgeItem(userId: string, itemId: string, data: Partial<{
    category: string;
    title: string;
    content: string;
    tags: string[];
    isPinned: boolean;
  }>) {
    const updateData: any = { ...data };
    if (data.tags) {
      updateData.tags = JSON.stringify(data.tags);
    }

    return prisma.knowledgeItem.update({
      where: { id: itemId },
      data: updateData,
    });
  }

  /**
   * Delete knowledge item
   */
  static async deleteKnowledgeItem(userId: string, itemId: string) {
    return prisma.knowledgeItem.deleteMany({
      where: { id: itemId, userId },
    });
  }

  /**
   * Universal Productivity Search across the entire platform
   */
  static async universalSearch(userId: string, query: string) {
    const q = query.toLowerCase().trim();
    if (!q) {
      return { results: [], totalFound: 0 };
    }

    const [apps, focusSessions, goals, knowledge, workflows, chatMessages] = await Promise.all([
      prisma.application.findMany({
        where: {
          canonicalName: { contains: q },
        },
        take: 5,
      }),
      prisma.focusSession.findMany({
        where: {
          userId,
          taskName: { contains: q },
        },
        take: 5,
      }),
      prisma.smartGoal.findMany({
        where: {
          userId,
          title: { contains: q },
        },
        take: 5,
      }),
      prisma.knowledgeItem.findMany({
        where: {
          userId,
          OR: [{ title: { contains: q } }, { content: { contains: q } }],
        },
        take: 5,
      }),
      prisma.aiWorkflow.findMany({
        where: {
          userId,
          OR: [{ name: { contains: q } }, { description: { contains: q } }],
        },
        take: 5,
      }),
      prisma.aiChatMessage.findMany({
        where: {
          userId,
          content: { contains: q },
        },
        take: 5,
      }),
    ]);

    const results: Array<{
      category: 'APPLICATIONS' | 'FOCUS_SESSIONS' | 'GOALS' | 'KNOWLEDGE' | 'WORKFLOWS' | 'AI_MESSAGES';
      title: string;
      subtitle: string;
      route: string;
      icon: string;
    }> = [];

    apps.forEach((app) => {
      results.push({
        category: 'APPLICATIONS',
        title: app.canonicalName,
        subtitle: `Tracked Application`,
        route: `/analytics?app=${encodeURIComponent(app.canonicalName)}`,
        icon: 'Smartphone',
      });
    });

    focusSessions.forEach((s) => {
      results.push({
        category: 'FOCUS_SESSIONS',
        title: s.taskName,
        subtitle: `${s.completedMinutes}m completed (${s.status})`,
        route: '/focus',
        icon: 'Zap',
      });
    });

    goals.forEach((g) => {
      results.push({
        category: 'GOALS',
        title: g.title,
        subtitle: `Goal Target: ${g.targetValue} (${g.period})`,
        route: '/planner',
        icon: 'Target',
      });
    });

    knowledge.forEach((k) => {
      results.push({
        category: 'KNOWLEDGE',
        title: k.title,
        subtitle: `${k.category} — ${k.content.substring(0, 60)}...`,
        route: '/knowledge',
        icon: 'BookOpen',
      });
    });

    workflows.forEach((w) => {
      results.push({
        category: 'WORKFLOWS',
        title: w.name,
        subtitle: w.description,
        route: '/workflows',
        icon: 'Cpu',
      });
    });

    chatMessages.forEach((m) => {
      results.push({
        category: 'AI_MESSAGES',
        title: m.role === 'USER' ? 'User Inquiry' : 'AI Assistant Insight',
        subtitle: m.content.substring(0, 75) + '...',
        route: '/ai-assistant',
        icon: 'Bot',
      });
    });

    return {
      query,
      totalFound: results.length,
      results,
    };
  }
}
