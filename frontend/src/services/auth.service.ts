// /frontend/src/services/auth.services.ts

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, API_ENDPOINTS } from '../config/api';
import { STORAGE_KEYS } from '../config';
import { TOKEN_REFRESH_INTERVAL } from '../config/constants';
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

  /**
   * Faz login do usuário, armazena token e dados do usuário,
   * configura interceptors e agenda renovação do token.
   */
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    try {
      logger.info('Iniciando login', { email });

      // POST /auth/login
      const response = await axios.post(`${API_URL}${API_ENDPOINTS.AUTH.LOGIN}`, {
        email,
        password,
      });

      const { token, user } = response.data;

      // Salva token e usuário
      await this.setToken(token);
      await this.setUser(user);

      // Configura interceptors
      this.setupAxiosInterceptors();

      // Agenda renovação do token
      this.scheduleTokenRefresh();

      logger.info('Login realizado com sucesso', { userId: user.id });
      return { user, token };
    } catch (error) {
      logger.error('Erro no login', error);
      throw error;
    }
  }

  /**
   * Faz logout do usuário, remove token e dados do usuário do storage,
   * limpa interceptors e timeouts.
   */
  async logout(): Promise<void> {
    try {
      logger.info('Iniciando logout');

      // Remove token e dados do usuário
      await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER]);

      if (this.tokenRefreshTimeout) {
        clearTimeout(this.tokenRefreshTimeout);
      }

      // Remove Authorization do axios
      delete axios.defaults.headers.common['Authorization'];

      logger.info('Logout realizado com sucesso');
    } catch (error) {
      logger.error('Erro no logout', error);
      throw error;
    }
  }

  /**
   * Verifica se o token atual ainda é válido.
   * Se o backend retornar um novo token, atualizamos.
   */
  async verifyToken(): Promise<boolean> {
    try {
      const token = await this.getToken();
      if (!token) {
        return false;
      }

      // GET /auth/verify
      const response = await axios.get(`${API_URL}${API_ENDPOINTS.AUTH.VERIFY}`);

      // Se a resposta contiver um novo token, atualizamos
      if (response.data.token) {
        await this.setToken(response.data.token);
        this.scheduleTokenRefresh();
      }

      return response.data.valid;
    } catch (error) {
      logger.error('Erro ao verificar token', error);
      return false;
    }
  }

  /**
   * Define o token no AsyncStorage e configura o axios com Bearer Token.
   */
  private async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Armazena os dados do usuário em JSON no AsyncStorage.
   */
  private async setUser(user: User): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }

  /**
   * Retorna o token do AsyncStorage.
   */
  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
  }

  /**
   * Retorna o usuário (parse JSON) do AsyncStorage.
   */
  async getUser(): Promise<User | null> {
    const userStr = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * Configura interceptors do axios para interceptar erros 401
   * e efetuar logout automático.
   */
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

  /**
   * Agenda a renovação do token usando o valor definido em TOKEN_REFRESH_INTERVAL.
   */
  private scheduleTokenRefresh(): void {
    if (this.tokenRefreshTimeout) {
      clearTimeout(this.tokenRefreshTimeout);
    }

    this.tokenRefreshTimeout = setTimeout(async () => {
      try {
        await this.verifyToken();
      } catch (error) {
        logger.error('Erro ao renovar token', error);
      }
    }, TOKEN_REFRESH_INTERVAL);
  }
}

export default AuthService.getInstance();