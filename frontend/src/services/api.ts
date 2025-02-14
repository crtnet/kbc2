import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';
import { signOut } from '../contexts/AuthContext';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('@KidsBookCreator:token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      logger.info('API Request', {
        method: config.method,
        url: config.url,
      });
      
      return config;
    } catch (error) {
      logger.error('Error getting token from AsyncStorage', error);
      return config;
    }
  },
  (error) => {
    logger.error('API Request Error', error);
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
    logger.error('API Response Error', {
      status: error.response?.status,
      message: error.message,
      url: error.config?.url,
    });
    
    if (error.response?.status === 401) {
      // Token expirado ou inválido
      await AsyncStorage.removeItem('@KidsBookCreator:token');
      
      // Deslogar o usuário
      signOut();
    }
    
    return Promise.reject(error);
  }
);

export { api };