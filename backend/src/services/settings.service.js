import { prisma } from '../config/db.js';
export class SettingsService {
    /**
     * Get user settings or create defaults
     */
    static async getSettings(userId) {
        let settings = await prisma.userSettings.findUnique({
            where: { userId },
        });
        if (!settings) {
            settings = await prisma.userSettings.create({
                data: {
                    userId,
                    theme: 'DARK',
                    dashboardLayout: JSON.stringify([
                        'screenTime',
                        'shortForm',
                        'attentionScore',
                        'focusTime',
                        'hotspots',
                        'topApps',
                        'categories',
                        'devices',
                    ]),
                    defaultFocusMinutes: 25,
                    defaultBreakMinutes: 5,
                    weekStartDay: 'MONDAY',
                    notificationPreferences: JSON.stringify({
                        reelsWarning: true,
                        goalReached: true,
                        focusReminder: true,
                    }),
                },
            });
        }
        let parsedLayout = [];
        let parsedNotifPrefs = {};
        try {
            parsedLayout = JSON.parse(settings.dashboardLayout);
        }
        catch {
            parsedLayout = ['screenTime', 'shortForm', 'attentionScore', 'focusTime'];
        }
        try {
            parsedNotifPrefs = JSON.parse(settings.notificationPreferences);
        }
        catch {
            parsedNotifPrefs = { reelsWarning: true, goalReached: true, focusReminder: true };
        }
        return {
            ...settings,
            parsedLayout,
            parsedNotifPrefs,
        };
    }
    /**
     * Update user settings
     */
    static async updateSettings(userId, data) {
        const updateData = {};
        if (data.theme !== undefined)
            updateData.theme = data.theme;
        if (data.dashboardLayout !== undefined) {
            updateData.dashboardLayout = JSON.stringify(data.dashboardLayout);
        }
        if (data.defaultFocusMinutes !== undefined) {
            updateData.defaultFocusMinutes = data.defaultFocusMinutes;
        }
        if (data.defaultBreakMinutes !== undefined) {
            updateData.defaultBreakMinutes = data.defaultBreakMinutes;
        }
        if (data.weekStartDay !== undefined) {
            updateData.weekStartDay = data.weekStartDay;
        }
        if (data.notificationPreferences !== undefined) {
            updateData.notificationPreferences = JSON.stringify(data.notificationPreferences);
        }
        return prisma.userSettings.upsert({
            where: { userId },
            create: {
                userId,
                ...updateData,
            },
            update: updateData,
        });
    }
}
