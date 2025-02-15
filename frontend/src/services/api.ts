import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';
import { signOutGlobal } from '../contexts/AuthContext';

const api = axios.create({
  // Utilize a variável de ambiente EXPO_PUBLIC_API_URL ou o valor padrão
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    try {
      // Recupera o token do AsyncStorage e remove aspas extras, se houver
      let token = await AsyncStorage.getItem('token');
      if (token) {
        token = token.replace(/^"|"$/g, '');
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      logger.info('API Request', {
        method: config.method,
        url: config.url,
        token, // para debug (remova em produção)
      });
      
      return config;
    } catch (error) {
      logger.error('Erro ao obter token do AsyncStorage', error);
      return config;
    }
  },
  (error) => {
    logger.error('Erro na requisição da API', error);
    return Promise.reject(error);
  }
);

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
      // Token expirado ou inválido: remove o token e desloga o usuário
      await AsyncStorage.removeItem('token');
      await signOutGlobal();
    }
    
    return Promise.reject(error);
  }
);

export { api };