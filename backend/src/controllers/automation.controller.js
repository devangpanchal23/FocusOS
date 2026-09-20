import { AutomationService } from '../services/automation.service.js';
export class AutomationController {
    static async getRules(req, res) {
        try {
            const rules = await AutomationService.getRules(req.user.id);
            res.json(rules);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    static async createRule(req, res) {
        try {
            const rule = await AutomationService.createRule(req.user.id, req.body);
            res.status(201).json(rule);
        }
        catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
    static async updateRule(req, res) {
        try {
            const result = await AutomationService.updateRule(req.user.id, req.params.id, req.body);
            res.json({ message: 'Automation rule updated', result });
        }
        catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
    static async deleteRule(req, res) {
        try {
            await AutomationService.deleteRule(req.user.id, req.params.id);
            res.json({ message: 'Automation rule deleted' });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    static async getLogs(req, res) {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
            const logs = await AutomationService.getLogs(req.user.id, limit);
            res.json(logs);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    static async evaluateRules(req, res) {
        try {
            const result = await AutomationService.evaluateRules(req.user.id);
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}
