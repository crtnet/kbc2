// Configurações de ambiente
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

// Chaves de armazenamento
export const STORAGE_KEYS = {
  TOKEN: '@KidsBookCreator:token',
  USER: '@KidsBookCreator:user'
};

// Configurações de segurança
export const SECURITY_CONFIG = {
  TOKEN_EXPIRATION_BUFFER: 5 * 60 * 1000, // 5 minutos antes da expiração
};

// Configurações de API
export const API_CONFIG = {
  TIMEOUT: 10000, // 10 segundos
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 segundo
};