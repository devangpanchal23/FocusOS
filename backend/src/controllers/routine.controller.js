import { RoutineService } from '../services/routine.service.js';
export class RoutineController {
    static async getRoutines(req, res) {
        try {
            const routines = await RoutineService.getRoutines(req.user.id);
            res.json(routines);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    static async createRoutine(req, res) {
        try {
            const routine = await RoutineService.createRoutine(req.user.id, req.body);
            res.status(201).json(routine);
        }
        catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
    static async updateRoutine(req, res) {
        try {
            const result = await RoutineService.updateRoutine(req.user.id, req.params.id, req.body);
            res.json({ message: 'Routine updated', result });
        }
        catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
    static async deleteRoutine(req, res) {
        try {
            await RoutineService.deleteRoutine(req.user.id, req.params.id);
            res.json({ message: 'Routine deleted' });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}
