import { Router } from 'express';
import { asyncHandler } from '@/middleware/error.middleware';

const router = Router();

router.post('/upload', asyncHandler(async (req: any, res: any) => {
  res.json({ message: 'File upload endpoint' });
}));

export { router as fileRoutes };