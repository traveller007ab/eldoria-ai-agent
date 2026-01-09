import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '@/utils/logger';

export class WebSocketServer {
  private io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupHandlers();
  }

  private setupHandlers() {
    this.io.on('connection', (socket: Socket) => {
      const userId = socket.data.user?.id || socket.id;
      logger.info(`User connected: ${userId}`);

      socket.join(`user:${userId}`);

      socket.on('project:join', async (projectId: string) => {
        socket.join(`project:${projectId}`);
        socket.to(`project:${projectId}`).emit('user:joined', {
          userId,
          username: socket.data.user?.name || 'Anonymous',
        });
      });

      socket.on('project:leave', (projectId: string) => {
        socket.leave(`project:${projectId}`);
        socket.to(`project:${projectId}`).emit('user:left', { userId });
      });

      socket.on('ai:stream', async (data: { message: string; sessionId: string }) => {
        try {
          socket.emit('ai:chunk', { chunk: 'Processing...' });
          socket.emit('ai:complete');
        } catch (error) {
          socket.emit('ai:error', { error: (error as Error).message });
        }
      });

      socket.on('simulation:subscribe', (simulationId: string) => {
        socket.join(`simulation:${simulationId}`);
      });

      socket.on('cursor:move', (data: { projectId: string; position: any }) => {
        socket.to(`project:${data.projectId}`).emit('cursor:update', {
          userId,
          position: data.position,
        });
      });

      socket.on('file:edit', (data: { projectId: string; fileId: string; changes: any }) => {
        socket.to(`project:${data.projectId}`).emit('file:changed', {
          userId,
          fileId: data.fileId,
          changes: data.changes,
        });
      });

      socket.on('disconnect', () => {
        logger.info(`User disconnected: ${userId}`);
      });
    });
  }

  async broadcastSimulationUpdate(simulationId: string, data: any) {
    this.io.to(`simulation:${simulationId}`).emit('simulation:progress', data);
  }

  async sendNotification(userId: string, notification: any) {
    this.io.to(`user:${userId}`).emit('notification', notification);
  }
}