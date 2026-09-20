import { SettingsService } from '../services/settings.service.js';
export class SettingsController {
    static async getSettings(req, res) {
        try {
            const settings = await SettingsService.getSettings(req.user.id);
            res.json(settings);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    static async updateSettings(req, res) {
        try {
            const updated = await SettingsService.updateSettings(req.user.id, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
}
