import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Função para limpar dados de autenticação
const clearAuthData = async () => {
  try {
    await AsyncStorage.multiRemove(['@KidsBook:token', '@KidsBook:user']);
    delete api.defaults.headers.common['Authorization'];
  } catch (error) {
    console.error('Erro ao limpar dados de autenticação:', error);
  }
};

// Interceptor para adicionar o token em todas as requisições
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('@KidsBook:token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  } catch (error) {
    console.error('Erro ao recuperar token:', error);
    return config;
  }
});

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Se for um erro de autenticação (401) e não for uma tentativa de refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Limpa os dados de autenticação
        await clearAuthData();

        // Redireciona para a tela de login
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      } catch (clearError) {
        console.error('Erro ao tratar token inválido:', clearError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;