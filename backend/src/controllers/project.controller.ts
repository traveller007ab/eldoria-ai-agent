import { Request, Response } from 'express';
import { prisma } from '@/db/client';
import { AppError } from '@/middleware/error.middleware';

export const projectController = {
  async list(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { page = 1, limit = 20, status, type } = req.query;

    const where: any = {
      ownerId: userId,
      deletedAt: null,
    };

    if (status) where.status = status;
    if (type) where.type = type;

    const [data, total] = await Promise.all([
      prisma.project.findMany({
        where,
        take: Number(limit),
        skip: (Number(page) - 1) * Number(limit),
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          status: true,
          visibility: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.project.count({ where }),
    ]);

    res.json({
      data,
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
    const { name, description, type = 'code', workspaceId } = req.body;

    if (!name) {
      throw new AppError(400, 'Project name is required', 'VALIDATION_ERROR');
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        type,
        ownerId: userId,
        workspaceId,
        status: 'active',
        visibility: 'private',
      },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        status: true,
        visibility: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json(project);
  },

  async get(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const project = await prisma.project.findFirst({
      where: {
        id,
        ownerId: userId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        status: true,
        visibility: true,
        files: true,
        settings: true,
        metadata: true,
        ownerId: true,
        workspaceId: true,
        createdAt: true,
        updatedAt: true,
        blueprints: {
          select: {
            id: true,
            name: true,
            domain: true,
            isTemplate: true,
            createdAt: true,
          },
        },
        simulations: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!project) {
      throw new AppError(404, 'Project not found', 'NOT_FOUND');
    }

    res.json(project);
  },

  async update(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { name, description, type, status, visibility, files, settings, metadata } = req.body;

    const project = await prisma.project.findFirst({
      where: { id, ownerId: userId, deletedAt: null },
    });

    if (!project) {
      throw new AppError(404, 'Project not found', 'NOT_FOUND');
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(type && { type }),
        ...(status && { status }),
        ...(visibility && { visibility }),
        ...(files !== undefined && { files }),
        ...(settings !== undefined && { settings }),
        ...(metadata !== undefined && { metadata }),
      },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        status: true,
        visibility: true,
        updatedAt: true,
      },
    });

    res.json(updated);
  },

  async delete(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const project = await prisma.project.findFirst({
      where: { id, ownerId: userId, deletedAt: null },
    });

    if (!project) {
      throw new AppError(404, 'Project not found', 'NOT_FOUND');
    }

    await prisma.project.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'deleted',
      },
    });

    res.json({ message: 'Project deleted successfully' });
  },
};