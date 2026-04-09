import Redis from 'ioredis';
import { config } from '@/config/env';

const redis = new Redis(config.REDIS_URL);

redis.on('connect', () => {
  console.log('✅ Connected to Redis');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

export const RedisService = {
  /** Socket ID ni stol ID si bilan bog'lash */
  async setSocketTable(socketId: string, tableId: string) {
    await redis.set(`socket:${socketId}:table`, tableId, 'EX', 86400); // 1 kun
  },

  /** Socket ID orqali stol ID sini olish */
  async getSocketTable(socketId: string): Promise<string | null> {
    return await redis.get(`socket:${socketId}:table`);
  },

  /** Socket ID ma'lumotlarini o'chirish */
  async removeSocket(socketId: string) {
    await redis.del(`socket:${socketId}:table`);
  },

  /** Stol dagi barcha socketlarni olish (ixtiyoriy, agar kerak bo'lsa) */
  async addSocketToTableSet(tableId: string, socketId: string) {
    await redis.sadd(`table:${tableId}:sockets`, socketId);
  },

  async removeSocketFromTableSet(tableId: string, socketId: string) {
    await redis.srem(`table:${tableId}:sockets`, socketId);
  },

  async getTableSockets(tableId: string): Promise<string[]> {
    return await redis.smembers(`table:${tableId}:sockets`);
  }
};

export default redis;
