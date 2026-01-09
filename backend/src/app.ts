import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/error.middleware';
import { authMiddleware } from './middleware/auth.middleware';
import { metricsMiddleware } from './monitoring';
import { WebSocketServer } from './websocket/server';

// Controllers
import { authController } from './controllers/auth.controller';
import { projectController } from './controllers/project.controller';
import { aiController } from './controllers/ai.controller';
import { chatController } from './controllers/chat.controller';
import { userController } from './controllers/user.controller';

class App {
  public app: express.Application;
  public server: any;
  public io: SocketIOServer;
  public wsServer: WebSocketServer;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: config.cors.origin,
        credentials: true,
      },
      path: '/ws',
    });

    this.wsServer = new WebSocketServer(this.io);
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    this.app.use(helmet());
    this.app.use(cors(config.cors));
    
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
    });
    this.app.use(limiter);

    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    this.app.use(metricsMiddleware);

    this.app.use((req: Request, res: Response, next: NextFunction) => {
      logger.info(`${req.method} ${req.path}`);
      next();
    });
  }

  private initializeRoutes(): void {
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.env,
      });
    });

    this.app.get('/health/ready', (req: Request, res: Response) => {
      res.status(200).json({ status: 'ready' });
    });

    // Public routes
    this.app.post('/api/v1/auth/register', (req: Request, res: Response, next: NextFunction) => {
      authController.register(req, res).catch(next);
    });

    this.app.post('/api/v1/auth/login', (req: Request, res: Response, next: NextFunction) => {
      authController.login(req, res).catch(next);
    });

    this.app.post('/api/v1/auth/refresh', (req: Request, res: Response, next: NextFunction) => {
      authController.refreshToken(req, res).catch(next);
    });

    // Protected routes
    this.app.use('/api/v1/users', authMiddleware);
    this.app.use('/api/v1/projects', authMiddleware);
    this.app.use('/api/v1/ai', authMiddleware);
    this.app.use('/api/v1/chat', authMiddleware);

    this.app.get('/api/v1/users/profile', (req: Request, res: Response) => {
      userController.getProfile(req, res);
    });

    this.app.get('/api/v1/projects', (req: Request, res: Response, next: NextFunction) => {
      projectController.list(req, res).catch(next);
    });

    this.app.post('/api/v1/projects', (req: Request, res: Response, next: NextFunction) => {
      projectController.create(req, res).catch(next);
    });

    this.app.get('/api/v1/projects/:id', (req: Request, res: Response, next: NextFunction) => {
      projectController.get(req, res).catch(next);
    });

    this.app.put('/api/v1/projects/:id', (req: Request, res: Response, next: NextFunction) => {
      projectController.update(req, res).catch(next);
    });

    this.app.delete('/api/v1/projects/:id', (req: Request, res: Response, next: NextFunction) => {
      projectController.delete(req, res).catch(next);
    });

    this.app.post('/api/v1/ai/chat', (req: Request, res: Response, next: NextFunction) => {
      aiController.chat(req, res).catch(next);
    });

    this.app.post('/api/v1/ai/stream', (req: Request, res: Response, next: NextFunction) => {
      aiController.stream(req, res).catch(next);
    });

    this.app.get('/api/v1/chat', (req: Request, res: Response, next: NextFunction) => {
      chatController.list(req, res).catch(next);
    });

    this.app.post('/api/v1/chat', (req: Request, res: Response, next: NextFunction) => {
      chatController.create(req, res).catch(next);
    });

    this.app.get('/api/v1/chat/:id', (req: Request, res: Response, next: NextFunction) => {
      chatController.get(req, res).catch(next);
    });

    this.app.get('/metrics', async (req: Request, res: Response) => {
      const { getMetrics } = await import('./monitoring');
      const metrics = await getMetrics();
      res.set('Content-Type', 'text/plain');
      res.end(metrics);
    });

    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public listen(): void {
    const port = parseInt(process.env.PORT || String(config.port), 10);
    this.server.listen(port, () => {
      logger.info(`🚀 Server running on port ${port}`);
      logger.info(`📊 Environment: ${config.env}`);
      logger.info(`🔗 Health: http://localhost:${port}/health`);
    });
  }

  public getServer() {
    return this.server;
  }
}

export default App;