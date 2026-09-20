import { GamificationService } from '../services/gamification.service.js';
export class GamificationController {
    static async getGamification(req, res) {
        try {
            const data = await GamificationService.getGamification(req.user.id);
            res.json(data);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    static async checkAchievements(req, res) {
        try {
            await GamificationService.checkAchievements(req.user.id);
            const data = await GamificationService.getGamification(req.user.id);
            res.json(data);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}
