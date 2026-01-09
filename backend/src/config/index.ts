import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env file first
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Get config at runtime instead of module load time
export function getConfig() {
  const env = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3001', 10),
    DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
    JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-key',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    GROQ_API_KEY: process.env.GROQ_API_KEY || '',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  };

  return {
    env: env.NODE_ENV,
    port: env.PORT,
    database: {
      url: env.DATABASE_URL,
    },
    jwt: {
      secret: env.JWT_SECRET,
      expiresIn: '7d',
      refreshExpiresIn: '30d',
    },
    ai: {
      gemini: { apiKey: env.GEMINI_API_KEY },
      groq: { apiKey: env.GROQ_API_KEY },
    },
    monitoring: {
      logLevel: env.LOG_LEVEL,
    },
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
    },
    rateLimit: {
      windowMs: 900000,
      maxRequests: 100,
    },
  } as const;
}

export const config = getConfig();