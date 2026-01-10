import App from './app';
import { logger } from '@/utils/logger';

const app = new App();

const port = parseInt(process.env['PORT'] || '3001', 10);

app.listen();

logger.info(`🚀 Eldoria AI Backend started on port ${port}`);
logger.info(`📊 Health check: http://localhost:${port}/health`);
logger.info(`🔗 API base: http://localhost:${port}/api/v1`);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  app.getServer().close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  app.getServer().close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});