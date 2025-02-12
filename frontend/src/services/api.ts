import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000, // 10 segundos de timeout
});

// Interceptor para adicionar o token em todas as requisições
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('@KidsBook:token');
    console.log('Token recuperado:', token ? 'Token presente' : 'Sem token');
    
    if (token) {
      // Adiciona o token no header de autorização
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
    } else {
      // Se não houver token e a rota não for de autenticação, redireciona para login
      const isAuthRoute = config.url?.includes('/auth/');
      if (!isAuthRoute) {
        // Redirecionar para a tela de login
        window.location.href = '/login';
        return Promise.reject(new Error('Não autorizado'));
      }
    }
    
    return config;
  } catch (error) {
    console.error('Erro ao recuperar token:', error);
    return Promise.reject(error);
  }
}, (error) => {
  console.error('Erro no interceptor de requisição:', error);
  return Promise.reject(error);
});

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => {
    // Log de sucesso da requisição
    console.log('Resposta da API:', response.config.url, response.status);
    return response;
  },
  async (error) => {
    console.error('Erro na resposta da API:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      headers: error.config?.headers
    });
    
    if (error.response?.status === 401) {
      console.log('Token inválido ou expirado');
      // Limpar o token e redirecionar para login
      await AsyncStorage.removeItem('@KidsBook:token');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default api;