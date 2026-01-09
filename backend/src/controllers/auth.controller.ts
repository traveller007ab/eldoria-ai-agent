import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '@/db/client';
import { config } from '@/config';
import { AppError } from '@/middleware/error.middleware';
import { logger } from '@/utils/logger';

export const authController = {
  async register(req: Request, res: Response) {
    const { email, password, name } = req.body;

    if (!email || !password) {
      throw new AppError(400, 'Email and password are required', 'VALIDATION_ERROR');
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError(409, 'User already exists', 'USER_EXISTS');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        authProvider: 'local',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    const token = jwt.sign({ userId: user.id }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    const refreshToken = jwt.sign({ userId: user.id }, config.jwt.secret, {
      expiresIn: config.jwt.refreshExpiresIn,
    });

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
      },
    });

    logger.info(`User registered: ${user.id}`);

    res.status(201).json({
      user,
      token,
      refreshToken,
    });
  },

  async login(req: Request, res: Response) {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError(400, 'Email and password are required', 'VALIDATION_ERROR');
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    const token = jwt.sign({ userId: user.id }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    const refreshToken = jwt.sign({ userId: user.id }, config.jwt.secret, {
      expiresIn: config.jwt.refreshExpiresIn,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
      },
    });

    logger.info(`User logged in: ${user.id}`);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
      refreshToken,
    });
  },

  async refreshToken(req: Request, res: Response) {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError(401, 'Refresh token required', 'REFRESH_TOKEN_REQUIRED');
    }

    try {
      const decoded = jwt.verify(refreshToken, config.jwt.secret) as { userId: string };
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        throw new AppError(401, 'Invalid refresh token', 'INVALID_REFRESH_TOKEN');
      }

      const newToken = jwt.sign({ userId: user.id }, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
      });

      const newRefreshToken = jwt.sign({ userId: user.id }, config.jwt.secret, {
        expiresIn: config.jwt.refreshExpiresIn,
      });

      res.json({
        token: newToken,
        refreshToken: newRefreshToken,
      });
    } catch (error) {
      throw new AppError(401, 'Invalid refresh token', 'INVALID_REFRESH_TOKEN');
    }
  },

  async logout(req: Request, res: Response) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    
    if (token) {
      await prisma.session.deleteMany({
        where: { token },
      });
    }

    res.json({ message: 'Logged out successfully' });
  },
};