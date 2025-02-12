import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

const TOKEN_KEY = '@KidsBookCreator:token';
const USER_KEY = '@KidsBookCreator:user';

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
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password,
      });

      const { token, user } = response.data;

      await this.setToken(token);
      await this.setUser(user);
      this.setupAxiosInterceptors();
      this.scheduleTokenRefresh();

      return { user, token };
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
      if (this.tokenRefreshTimeout) {
        clearTimeout(this.tokenRefreshTimeout);
      }
      delete axios.defaults.headers.common['Authorization'];
    } catch (error) {
      console.error('Erro no logout:', error);
      throw error;
    }
  }

  async verifyToken(): Promise<boolean> {
    try {
      const token = await this.getToken();
      
      if (!token) {
        return false;
      }

      const response = await axios.get(`${API_URL}/api/auth/verify`);
      
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