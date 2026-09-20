import { Router } from 'express';
import { DeviceController } from '../controllers/device.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
export const deviceRouter = Router();
deviceRouter.use(authMiddleware);
deviceRouter.get('/', DeviceController.getDevices);
deviceRouter.post('/', DeviceController.createDevice);
deviceRouter.patch('/:id', DeviceController.updateDevice);
deviceRouter.delete('/:id', DeviceController.deleteDevice);
