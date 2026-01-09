import { Router } from 'express';
import { asyncHandler } from '@/middleware/error.middleware';

const router = Router();

// All user routes will be protected
router.get('/profile', asyncHandler(async (req: any, res: any) => {
  res.json({ message: 'User profile endpoint' });
}));

export { router as userRoutes };