import { Router } from 'express';
import { asyncHandler } from '@/middleware/error.middleware';

const router = Router();

router.get('/', asyncHandler(async (req: any, res: any) => {
  res.json({ message: 'Projects endpoint' });
}));

export { router as projectRoutes };