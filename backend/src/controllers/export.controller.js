import { ExportService } from '../services/export.service.js';
export class ExportController {
    static async exportCSV(req, res) {
        try {
            const csv = await ExportService.exportCSV(req.user.id);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="focus-intelligence-telemetry.csv"');
            res.send(csv);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    static async exportJSON(req, res) {
        try {
            const data = await ExportService.exportJSON(req.user.id);
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', 'attachment; filename="focus-intelligence-backup.json"');
            res.send(JSON.stringify(data, null, 2));
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    static async exportDigest(req, res) {
        try {
            const html = await ExportService.exportHTMLDigest(req.user.id);
            res.setHeader('Content-Type', 'text/html');
            res.send(html);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}
