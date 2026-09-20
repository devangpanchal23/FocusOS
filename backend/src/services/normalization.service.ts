import { prisma } from '../config/db.js';

export class NormalizationService {
  /**
   * Resolves an app name string to a canonical Application record.
   * If it doesn't exist, creates it with a suggested category.
   */
  static async resolveApplication(rawName: string, suggestedCategoryName?: string) {
    const cleanName = rawName.trim();
    const lower = cleanName.toLowerCase();

    // 1. Look up by alias
    const aliasRecord = await prisma.applicationAlias.findUnique({
      where: { alias: lower },
      include: { application: { include: { defaultCategory: true } } },
    });

    if (aliasRecord?.application) {
      return aliasRecord.application;
    }

    // 2. Look up by canonical name directly (case-insensitive search)
    const existing = await prisma.application.findFirst({
      where: {
        canonicalName: {
          equals: cleanName,
        },
      },
      include: { defaultCategory: true },
    });

    if (existing) {
      // Record the alias for future fast lookups
      await prisma.applicationAlias.create({
        data: { alias: lower, applicationId: existing.id },
      }).catch(() => {});
      return existing;
    }

    // 3. Fallback: Determine category and create new application
    let categoryId: string | null = null;
    const catName = suggestedCategoryName || this.guessCategory(cleanName);
    const category = await prisma.category.findUnique({
      where: { name: catName },
    });
    if (category) {
      categoryId = category.id;
    }

    const created = await prisma.application.create({
      data: {
        canonicalName: cleanName,
        defaultCategoryId: categoryId,
      },
      include: { defaultCategory: true },
    });

    await prisma.applicationAlias.create({
      data: { alias: lower, applicationId: created.id },
    }).catch(() => {});

    return created;
  }

  /**
   * Heuristic category guesser for unmapped apps
   */
  static guessCategory(appName: string): string {
    const lower = appName.toLowerCase();
    if (/instagram|facebook|twitter|x|snapchat|threads|reddit|tiktok/i.test(lower)) {
      return 'Social Media';
    }
    if (/youtube|netflix|spotify|disney|prime|twitch|vlc/i.test(lower)) {
      return 'Entertainment';
    }
    if (/code|studio|terminal|git|bash|powershell|sublime|intellij|cursor/i.test(lower)) {
      return 'Development';
    }
    if (/whatsapp|telegram|slack|teams|discord|zoom|phone|message|signal/i.test(lower)) {
      return 'Communication';
    }
    if (/chrome|brave|firefox|edge|safari|opera|browser/i.test(lower)) {
      return 'Browser';
    }
    if (/claude|chatgpt|notion|obsidian|excel|word|trello|linear/i.test(lower)) {
      return 'Productivity';
    }
    if (/uber|maps|settings|calculator|files|finder/i.test(lower)) {
      return 'Utilities';
    }
    return 'Other';
  }
}
