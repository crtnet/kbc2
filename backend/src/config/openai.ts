import dotenv from 'dotenv';

dotenv.config();

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY não está definida no arquivo .env');
}

export const openaiConfig = {
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-3.5-turbo',
  maxTokens: 1000,
  temperature: 0.7,
  timeoutMs: 60000, // 60 segundos de timeout
  maxRetries: 3,
  retryDelay: 2000, // 2 segundos
};