import { Router } from 'express';
import { asyncHandler } from '@/middleware/error.middleware';

const router = Router();

router.post('/search', asyncHandler(async (req: any, res: any) => {
  res.json({ message: 'Research endpoint' });
}));

export { router as researchRoutes };