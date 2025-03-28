import dotenv from 'dotenv';

dotenv.config();

// Configuração básica do Redis para o Bull
export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined
};