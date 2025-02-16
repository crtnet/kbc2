export const env = {
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api',
  API_TIMEOUT: 60000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  DEFAULT_LANGUAGE: 'pt-BR',
  TOKEN_REFRESH_INTERVAL: 6 * 60 * 60 * 1000, // 6 horas
  STORAGE_PREFIX: '@KidsBookCreator:',
};