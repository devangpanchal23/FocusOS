import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { RoutineService } from '../services/routine.service.js';

export class RoutineController {
  static async getRoutines(req: AuthRequest, res: Response): Promise<void> {
    try {
      const routines = await RoutineService.getRoutines(req.user!.id);
      res.json(routines);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async createRoutine(req: AuthRequest, res: Response): Promise<void> {
    try {
      const routine = await RoutineService.createRoutine(req.user!.id, req.body);
      res.status(201).json(routine);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async updateRoutine(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await RoutineService.updateRoutine(req.user!.id, req.params.id, req.body);
      res.json({ message: 'Routine updated', result });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async deleteRoutine(req: AuthRequest, res: Response): Promise<void> {
    try {
      await RoutineService.deleteRoutine(req.user!.id, req.params.id);
      res.json({ message: 'Routine deleted' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
