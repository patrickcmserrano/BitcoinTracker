import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  API_VERSION: z.string().default('v1'),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),
  REDIS_PASSWORD: z.string().optional(),

  // External APIs
  TAAPI_SECRET_KEY: z.string().optional(),
  BINANCE_API_KEY: z.string().optional(),
  BINANCE_SECRET_KEY: z.string().optional(),

  // Cache
  CACHE_DEFAULT_TTL: z.string().transform(Number).default('60000'),
  CACHE_MAX_SIZE: z.string().transform(Number).default('10000'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

  // Background Jobs
  JOB_CONCURRENCY: z.string().transform(Number).default('5'),
  JOB_DATA_COLLECTOR_INTERVAL: z.string().transform(Number).default('15000'),
  JOB_INDICATOR_CALCULATOR_INTERVAL: z.string().transform(Number).default('60000'),
  JOB_FUTURES_UPDATER_INTERVAL: z.string().transform(Number).default('60000'),
  JOB_MARKET_INDICATORS_INTERVAL: z.string().transform(Number).default('300000'),
  JOB_CLEANUP_INTERVAL: z.string().transform(Number).default('3600000'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // CCXT/Freqtrade (Future)
  CCXT_ENABLED: z.string().transform((val) => val === 'true').default('false'),
  FREQTRADE_API_URL: z.string().optional(),
  FREQTRADE_API_TOKEN: z.string().optional(),
});

// Parse and validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:', error.errors);
      throw new Error('Environment validation failed');
    }
    throw error;
  }
};

export const env = parseEnv();

// Export type for TypeScript
export type Env = z.infer<typeof envSchema>;
