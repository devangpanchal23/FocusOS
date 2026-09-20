import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { RoutineController } from '../controllers/routine.controller.js';

export const routineRouter = Router();

routineRouter.use(requireAuth);

routineRouter.get('/', RoutineController.getRoutines);
routineRouter.post('/', RoutineController.createRoutine);
routineRouter.put('/:id', RoutineController.updateRoutine);
routineRouter.delete('/:id', RoutineController.deleteRoutine);
