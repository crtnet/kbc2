// src/config/api.ts
import { env } from './env';

// URL base da API
export const API_URL = env.API_URL;

// Timeout padrão para requisições
export const API_TIMEOUT = env.API_TIMEOUT;

// Número de tentativas para requisições que falham
export const RETRY_ATTEMPTS = env.RETRY_ATTEMPTS;

// Tempo de espera entre tentativas (em ms)
export const RETRY_DELAY = env.RETRY_DELAY;

// Headers padrão para requisições
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// Endpoints da API
export const API_ENDPOINTS = {
  // Autenticação
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH_TOKEN: '/auth/refresh-token',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  
  // Livros
  BOOKS: {
    LIST: '/books',
    CREATE: '/books',
    GET: (id: string) => `/books/${id}`,
    UPDATE: (id: string) => `/books/${id}`,
    DELETE: (id: string) => `/books/${id}`,
    GET_PDF: (id: string) => `/books/${id}/pdf`,
    UPDATE_COVER_STYLE: (id: string) => `/books/${id}/cover-style`,
    REGENERATE_IMAGE: (id: string) => `/books/${id}/regenerate-image`,
  },
  
  // Avatares
  AVATARS: {
    LIST: '/avatars',
    CATEGORIES: '/avatars/categories',
    STYLES: '/avatars/styles',
    UPLOAD: '/avatars/upload',
  },
};

// Função para construir URLs completas
export const buildUrl = (endpoint: string): string => {
  return `${API_URL}${endpoint}`;
};