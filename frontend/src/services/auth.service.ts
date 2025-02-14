import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';
import { STORAGE_KEYS, API_ENDPOINTS, TOKEN_REFRESH_INTERVAL } from '../config/constants';
import { logger } from '../utils/logger';

export interface User {
  id: string;
  name: string;
  email: string;
  type: string;
}

class AuthService {
  private static instance: AuthService;
  private tokenRefreshTimeout?: NodeJS.Timeout;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    try {
      logger.info('Iniciando login', { email });
      
      const response = await axios.post(`${API_URL}${API_ENDPOINTS.AUTH.LOGIN}`, {
        email,
        password,
      });

      const { token, user } = response.data;

      await this.setToken(token);
      await this.setUser(user);
      this.setupAxiosInterceptors();
      this.scheduleTokenRefresh();

      logger.info('Login realizado com sucesso', { userId: user.id });
      return { user, token };
    } catch (error) {
      logger.error('Erro no login', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      logger.info('Iniciando logout');
      await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER]);
      if (this.tokenRefreshTimeout) {
        clearTimeout(this.tokenRefreshTimeout);
      }
      delete axios.defaults.headers.common['Authorization'];
      logger.info('Logout realizado com sucesso');
    } catch (error) {
      logger.error('Erro no logout', error);
      throw error;
    }
  }

  async verifyToken(): Promise<boolean> {
    try {
      const token = await this.getToken();
      
      if (!token) {
        return false;
      }

      const response = await axios.get(`${API_URL}/auth/verify`);
      
      if (response.data.token) {
        // Se recebemos um novo token, atualizamos
        await this.setToken(response.data.token);
        this.scheduleTokenRefresh();
      }

      return response.data.valid;
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      return false;
    }
  }

  private async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  private async setUser(user: User): Promise<void> {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem(TOKEN_KEY);
  }

  async getUser(): Promise<User | null> {
    const userStr = await AsyncStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  private setupAxiosInterceptors(): void {
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          await this.logout();
        }
        return Promise.reject(error);
      }
    );
  }

  private scheduleTokenRefresh(): void {
    if (this.tokenRefreshTimeout) {
      clearTimeout(this.tokenRefreshTimeout);
    }

    // Programa renovação para cada 6 horas
    this.tokenRefreshTimeout = setTimeout(async () => {
      try {
        await this.verifyToken();
      } catch (error) {
        console.error('Erro ao renovar token:', error);
      }
    }, 6 * 60 * 60 * 1000); // 6 horas
  }
}

export default AuthService.getInstance();