export const env = {
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://3.93.247.189:3000/api',
  API_TIMEOUT: 180000, // Aumentado para 3 minutos
  RETRY_ATTEMPTS: 5,    // Aumentado para 5 tentativas
  RETRY_DELAY: 3000,    // Aumentado para 3 segundos
  DEFAULT_LANGUAGE: 'pt-BR',
  TOKEN_REFRESH_INTERVAL: 6 * 60 * 60 * 1000, // 6 horas
  STORAGE_PREFIX: '@KidsBookCreator:',
};