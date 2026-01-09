import { Router } from 'express';
import { asyncHandler } from '@/middleware/error.middleware';

const router = Router();

router.post('/chat', asyncHandler(async (req: any, res: any) => {
  res.json({ message: 'AI chat endpoint' });
}));

export { router as aiRoutes };