import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getBaseUrl = () => {
  // Para desenvolvimento local
  if (__DEV__) {
    // Para iOS
    if (Platform.OS === 'ios') {
      // Use o IP da sua máquina na rede local
      return 'http://192.168.1.5:3000';  // Substitua pelo seu IP local
    }
    
    // Para Android
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3000';
    }
    
    // Para web
    return 'http://localhost:3000';
  }
  
  // URL de produção (substitua quando tiver)
  return 'https://api.kidsbookcreator.com';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10000, // 10 segundos de timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Interceptador para log de requisições (útil para debug)
api.interceptors.request.use(
  (config) => {
    console.log('🚀 API Request:', {
      url: config.url,
      method: config.method,
      baseURL: config.baseURL,
      data: config.data
    });
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Interceptador para log de respostas
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', {
      message: error.message,
      code: error.code,
      response: error.response?.data
    });
    return Promise.reject(error);
  }
);

export default api;