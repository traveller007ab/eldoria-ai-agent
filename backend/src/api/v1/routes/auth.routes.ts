import { Router } from 'express';
import { body } from 'express-validator';
import { authController } from '@/controllers/auth.controller';
import { asyncHandler } from '@/middleware/error.middleware';

const router = Router();

// Register
router.post('/register', 
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').optional().isLength({ min: 2, max: 50 }),
  ],
  asyncHandler(authController.register)
);

// Login
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  asyncHandler(authController.login)
);

// Refresh token
router.post('/refresh',
  asyncHandler(authController.refreshToken)
);

// Logout
router.post('/logout',
  asyncHandler(authController.logout)
);

// Google OAuth
router.get('/google',
  asyncHandler(authController.googleAuth)
);

router.get('/google/callback',
  asyncHandler(authController.googleCallback)
);

export { router as authRoutes };