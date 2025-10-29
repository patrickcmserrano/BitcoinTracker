import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectRedis, disconnectRedis } from './config/redis';
import { prisma, disconnectDatabase } from './config/database';

// Create Express app
const app: Application = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Health check endpoint
app.get('/api/v1/health', async (_req: Request, res: Response) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: env.API_VERSION,
      environment: env.NODE_ENV,
      services: {
        database: 'connected',
        redis: 'connected',
      },
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Service unavailable',
    });
  }
});

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Trading Backend API',
    version: env.API_VERSION,
    documentation: '/api-docs',
    health: '/api/v1/health',
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error:', err);

  res.status(500).json({
    error: 'Internal Server Error',
    message: env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Initialize services and start server
const startServer = async () => {
  try {
    // Connect to Redis
    await connectRedis();
    logger.info('✅ Redis connected');

    // Test database connection
    await prisma.$connect();
    logger.info('✅ Database connected');

    // Start Express server
    const PORT = env.PORT;
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${env.NODE_ENV}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/api/v1/health`);
      logger.info(`📖 API Documentation: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, starting graceful shutdown...`);

  try {
    await disconnectRedis();
    await disconnectDatabase();
    logger.info('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start the server
startServer();

export default app;
