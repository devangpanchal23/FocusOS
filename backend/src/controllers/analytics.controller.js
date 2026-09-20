import { prisma } from '../config/db.js';
import { AnalyticsService } from '../services/analytics.service.js';
export class AnalyticsController {
    static async getOverview(req, res) {
        try {
            const date = req.query.date || undefined;
            const overview = await AnalyticsService.getDailyOverview(req.userId, date);
            return res.json(overview);
        }
        catch (error) {
            console.error('Overview error:', error);
            return res.status(500).json({ error: 'Failed to generate overview analytics.' });
        }
    }
    static async getTrends(req, res) {
        try {
            const days = parseInt(req.query.days || '7', 10);
            const trends = await AnalyticsService.getTrends(req.userId, days);
            return res.json(trends);
        }
        catch (error) {
            console.error('Trends error:', error);
            return res.status(500).json({ error: 'Failed to generate trends.' });
        }
    }
    static async getCategories(_req, res) {
        try {
            const categories = await prisma.category.findMany({
                orderBy: { name: 'asc' },
            });
            return res.json({ categories });
        }
        catch (error) {
            return res.status(500).json({ error: 'Failed to fetch categories.' });
        }
    }
    static async getApplications(_req, res) {
        try {
            const applications = await prisma.application.findMany({
                include: { defaultCategory: true },
                orderBy: { canonicalName: 'asc' },
            });
            return res.json({ applications });
        }
        catch (error) {
            return res.status(500).json({ error: 'Failed to fetch applications.' });
        }
    }
}
