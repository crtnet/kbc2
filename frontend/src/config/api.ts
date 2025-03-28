// src/config/api.ts
import { env } from './env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// URL base da API
export const API_URL = env.API_URL;

// Lista de URLs alternativas para tentar em caso de falha
export const ALTERNATIVE_API_URLS = [
  'http://52.201.233.44:3000/api',
  'http://52.201.233.44:3333/api',
  'http://3.93.247.189:3000/api',
  'http://3.93.247.189:3333/api',
  'http://localhost:3000/api',
  Platform.OS === 'android' ? 'http://10.0.2.2:3000/api' : null // Para emuladores Android
].filter(Boolean) as string[];

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
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache'
};

// Endpoints da API
export const API_ENDPOINTS = {
  // Health check
  HEALTH: '/health',
  PING: '/ping',
  
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
    CREATE_ASYNC: '/books/async',
    GET: (id: string) => `/books/${id}`,
    GET_STATUS: (id: string) => `/books/${id}/status`,
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
export const buildUrl = (endpoint: string, baseUrl?: string): string => {
  return `${baseUrl || API_URL}${endpoint}`;
};

// Função para obter a URL de trabalho armazenada ou a padrão
export const getWorkingUrl = async (): Promise<string> => {
  try {
    const storedUrl = await AsyncStorage.getItem('working_api_url');
    return storedUrl || API_URL;
  } catch (error) {
    console.error('Erro ao obter URL de trabalho:', error);
    return API_URL;
  }
};

// Função para salvar a URL de trabalho
export const saveWorkingUrl = async (url: string): Promise<void> => {
  try {
    await AsyncStorage.setItem('working_api_url', url);
  } catch (error) {
    console.error('Erro ao salvar URL de trabalho:', error);
  }
};