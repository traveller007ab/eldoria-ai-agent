import { Router } from 'express';
import { asyncHandler } from '@/middleware/error.middleware';

const router = Router();

router.post('/run', asyncHandler(async (req: any, res: any) => {
  res.json({ message: 'Simulation endpoint' });
}));

export { router as simulationRoutes };