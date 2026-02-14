import App from './app';
import { logger } from '@/utils/logger';

const app = new App();

const port = parseInt(process.env['PORT'] || '3001', 10);

app.listen();

logger.info(`🚀 Eldoria AI Backend started on port ${port}`);
logger.info(`📊 Health check: http://localhost:${port}/health`);
logger.info(`🔗 API base: http://localhost:${port}/api/v1`);
logger.info(`🤝 WebSocket ready at ws://localhost:${port}`);

// Graceful shutdown handling
const shutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`);
  
  try {
    // Close HTTP server
    await new Promise<void>((resolve, reject) => {
      app.getServer().close((error) => {
        if (error) {
          logger.error('HTTP server shutdown error:', error);
          reject(error);
        } else {
          logger.info('HTTP server closed');
          resolve();
        }
      });
    });
    
    // Additional cleanup if needed
    logger.info('All services shut down gracefully');
    process.exit(0);
    
  } catch (error) {
    logger.error('Shutdown error:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Attempt graceful shutdown
  shutdown('UNCAUGHT_EXCEPTION').catch(() => {
    process.exit(1);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});