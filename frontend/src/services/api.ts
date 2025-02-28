// /frontend/src/services/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

// Variável local para manter o token em memória
let inMemoryToken: string | null = null;

// Função local de logout (poderá ser injetada pelo AuthContext)
let logoutHandler: (() => Promise<void>) | null = null;

/**
 * Atualiza o token em memória e no header Authorization.
 * Chamado pelo AuthContext quando o token muda.
 */
export function setAuthToken(token: string | null) {
  inMemoryToken = token;
}

/**
 * Injeta a função de logout. Chamado pelo AuthContext
 * para que, ao receber 401, possamos deslogar o usuário.
 */
export function setLogoutHandler(fn: () => Promise<void>) {
  logoutHandler = fn;
}

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3333',
  timeout: 60000, // Aumentando o timeout para 60 segundos
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Interceptor de request
api.interceptors.request.use(
  async (config) => {
    try {
      // Prioriza o token em memória
      let token = inMemoryToken;
      if (token) {
        logger.info('Token recuperado de inMemoryToken no interceptor:', token);
      } else {
        // Caso não tenha em memória, busca do AsyncStorage
        token = await AsyncStorage.getItem('token');
        logger.info('Token recuperado do AsyncStorage no interceptor:', token);
      }

      if (token) {
        token = token.replace(/^"|"$/g, '');
        config.headers.Authorization = `Bearer ${token}`;
      }

      logger.info('API Request', {
        method: config.method,
        url: config.url,
        token: token ? 'Present' : 'Missing',
      });
      return config;
    } catch (error) {
      logger.error('Erro ao obter token no interceptor', error);
      return config;
    }
  },
  (error) => {
    logger.error('Erro na requisição da API', error);
    return Promise.reject(error);
  }
);

// Interceptor de response
api.interceptors.response.use(
  (response) => {
    logger.info('API Response', {
      status: response.status,
      url: response.config.url,
    });
    return response;
  },
  async (error) => {
    logger.error('Erro na resposta da API', {
      status: error.response?.status,
      message: error.message,
      url: error.config?.url,
    });

    if (error.response?.status === 401) {
      // Se tivermos uma função de logout injetada, chamamos
      if (logoutHandler) {
        await AsyncStorage.removeItem('token');
        await logoutHandler();
      }
    }

    return Promise.reject(error);
  }
);

export { api };