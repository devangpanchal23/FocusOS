import { InsightService } from '../services/insight.service.js';
export class InsightController {
    static async getInsights(req, res) {
        try {
            const insights = await InsightService.generateInsights(req.user.id);
            res.json(insights);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}
