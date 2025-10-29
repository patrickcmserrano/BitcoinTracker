import { createClient, RedisClientType } from 'redis';
import { env } from './env';

let redisClient: RedisClientType | null = null;

export const connectRedis = async (): Promise<RedisClientType> => {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  try {
    redisClient = createClient({
      url: env.REDIS_URL,
      password: env.REDIS_PASSWORD,
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('📦 Redis connecting...');
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis connected and ready');
    });

    await redisClient.connect();

    return redisClient;
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error);
    throw error;
  }
};

export const getRedisClient = (): RedisClientType => {
  if (!redisClient || !redisClient.isOpen) {
    throw new Error('Redis client not connected. Call connectRedis() first.');
  }
  return redisClient;
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    console.log('📦 Redis disconnected');
  }
};

// Cache helpers
export const cacheGet = async <T>(key: string): Promise<T | null> => {
  try {
    const client = getRedisClient();
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error(`Error getting cache key ${key}:`, error);
    return null;
  }
};

export const cacheSet = async (
  key: string,
  value: any,
  ttlSeconds?: number
): Promise<void> => {
  try {
    const client = getRedisClient();
    const serialized = JSON.stringify(value);

    if (ttlSeconds) {
      await client.setEx(key, ttlSeconds, serialized);
    } else {
      await client.set(key, serialized);
    }
  } catch (error) {
    console.error(`Error setting cache key ${key}:`, error);
  }
};

export const cacheDel = async (key: string): Promise<void> => {
  try {
    const client = getRedisClient();
    await client.del(key);
  } catch (error) {
    console.error(`Error deleting cache key ${key}:`, error);
  }
};

export const cacheDelPattern = async (pattern: string): Promise<void> => {
  try {
    const client = getRedisClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch (error) {
    console.error(`Error deleting cache pattern ${pattern}:`, error);
  }
};
