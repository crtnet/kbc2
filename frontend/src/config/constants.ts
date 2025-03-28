export const STORAGE_KEYS = {
  TOKEN: '@KidsBookCreator:token',
  USER: '@KidsBookCreator:user',
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    VERIFY: '/auth/verify',
    REFRESH: '/auth/refresh',
  },
  BOOKS: {
    BASE: '/books',
    PDF: (bookId: string) => `/books/${bookId}/pdf`,
    PDF_URL: (bookId: string) => `/books/${bookId}/pdf-url`,
  },
} as const;

export const TOKEN_REFRESH_INTERVAL = 6 * 60 * 60 * 1000; // 6 horas

// Lista de URLs alternativas para tentar em caso de falha na URL principal
export const API_URL_ALTERNATIVES = [
  'http://3.93.247.189:3000/api',
  'http://3.93.247.189:3333/api',
  'http://3.93.247.189:3000/api',
  'http://3.93.247.189:3333/api'
];