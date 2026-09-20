import { BlockingService } from '../services/blocking.service.js';
export class BlockingController {
    static async getRules(req, res) {
        try {
            const rules = await BlockingService.getRules(req.user.id);
            res.json(rules);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    static async createRule(req, res) {
        try {
            const rule = await BlockingService.createRule(req.user.id, req.body);
            res.status(201).json(rule);
        }
        catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
    static async updateRule(req, res) {
        try {
            const result = await BlockingService.updateRule(req.user.id, req.params.id, req.body);
            res.json({ message: 'Rule updated', result });
        }
        catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
    static async deleteRule(req, res) {
        try {
            await BlockingService.deleteRule(req.user.id, req.params.id);
            res.json({ message: 'Rule deleted' });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    static async createOverride(req, res) {
        try {
            const { reason, overrideDurationMinutes } = req.body;
            const override = await BlockingService.createOverride(req.user.id, {
                ruleId: req.params.id,
                reason,
                overrideDurationMinutes,
            });
            res.status(201).json(override);
        }
        catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
    static async getOverrides(req, res) {
        try {
            const overrides = await BlockingService.getOverrides(req.user.id);
            res.json(overrides);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}
