import { Request, Response } from 'express';
import { prisma } from '@/db/client';
import { AppError } from '@/middleware/error.middleware';

export const chatController = {
  async list(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { page = 1, limit = 20 } = req.query;

    const [data, total] = await Promise.all([
      prisma.chatSession.findMany({
        where: { userId },
        take: Number(limit),
        skip: (Number(page) - 1) * Number(limit),
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          model: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { messages: true },
          },
        },
      }),
      prisma.chatSession.count({ where: { userId } }),
    ]);

    res.json({
      data: data.map((s: any) => ({
        ...s,
        messageCount: s._count.messages,
      })),
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  },

  async create(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { title, model = 'gemini-pro', projectId, systemPrompt } = req.body;

    const session = await prisma.chatSession.create({
      data: {
        userId,
        title: title || 'New Chat',
        model,
        projectId,
        systemPrompt,
      },
      select: {
        id: true,
        title: true,
        model: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json(session);
  },

  async get(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const session = await prisma.chatSession.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            content: true,
            metadata: true,
            tokensInput: true,
            tokensOutput: true,
            createdAt: true,
          },
        },
      },
    });

    if (!session) {
      throw new AppError(404, 'Chat session not found', 'NOT_FOUND');
    }

    res.json(session);
  },

  async delete(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const session = await prisma.chatSession.findFirst({
      where: { id, userId },
    });

    if (!session) {
      throw new AppError(404, 'Chat session not found', 'NOT_FOUND');
    }

    await prisma.chatSession.delete({
      where: { id },
    });

    res.json({ message: 'Chat session deleted successfully' });
  },

  async update(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { title, systemPrompt } = req.body;

    const session = await prisma.chatSession.findFirst({
      where: { id, userId },
    });

    if (!session) {
      throw new AppError(404, 'Chat session not found', 'NOT_FOUND');
    }

    const updated = await prisma.chatSession.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(systemPrompt !== undefined && { systemPrompt }),
      },
      select: {
        id: true,
        title: true,
        model: true,
        systemPrompt: true,
        updatedAt: true,
      },
    });

    res.json(updated);
  },
};