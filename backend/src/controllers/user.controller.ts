import { Request, Response } from 'express';
import { prisma } from '@/db/client';
import { AppError } from '@/middleware/error.middleware';

export const userController = {
  async getProfile(req: Request, res: Response) {
    const userId = (req as any).user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        bio: true,
        organization: true,
        role: true,
        preferences: true,
        apiQuota: true,
        storageQuota: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found', 'NOT_FOUND');
    }

    res.json(user);
  },

  async updateProfile(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { name, avatar, bio, organization, preferences } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(avatar !== undefined && { avatar }),
        ...(bio !== undefined && { bio }),
        ...(organization !== undefined && { organization }),
        ...(preferences !== undefined && { preferences }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        bio: true,
        organization: true,
        role: true,
        preferences: true,
        updatedAt: true,
      },
    });

    res.json(user);
  },

  async getUsage(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { startDate, endDate } = req.query;

    const where: any = { userId };
    
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate as string);
      if (endDate) where.timestamp.lte = new Date(endDate as string);
    }

    const usage = await prisma.usage.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    const stats = await prisma.usage.groupBy({
      by: ['action'],
      where: { userId },
      _sum: {
        quantity: true,
        cost: true,
      },
    });

    res.json({
      recent: usage,
      summary: stats,
    });
  },

  async getApiKeys(req: Request, res: Response) {
    const userId = (req as any).user.id;

    const keys = await prisma.apiKey.findMany({
      where: { userId, revokedAt: null },
      select: {
        id: true,
        name: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    res.json(keys);
  },

  async createApiKey(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { name } = req.body;

    if (!name) {
      throw new AppError(400, 'Name is required', 'VALIDATION_ERROR');
    }

    const key = `eldoria_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const keyHash = await require('crypto').createHash('sha256').update(key).digest('hex');

    const apiKey = await prisma.apiKey.create({
      data: {
        userId,
        name,
        keyHash,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    res.status(201).json({
      ...apiKey,
      key, // Only returned once
    });
  },

  async revokeApiKey(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { id } = req.params;

    await prisma.apiKey.update({
      where: { id, userId },
      data: { revokedAt: new Date() },
    });

    res.json({ message: 'API key revoked successfully' });
  },
};