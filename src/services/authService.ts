import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

const TOKEN_KEY = '@KidsBookCreator:token';

export const authService = {
  async login(email: string, password: string) {
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password
      });
      
      const { token } = response.data;
      await this.setToken(token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      return response.data;
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  },

  async verifyToken() {
    try {
      const token = await this.getToken();
      if (!token) return false;

      const response = await axios.get(`${API_URL}/api/auth/verify`);
      return response.data.valid;
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      return false;
    }
  },

  async setToken(token: string) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  },

  async getToken() {
    return await AsyncStorage.getItem(TOKEN_KEY);
  },

  async logout() {
    await AsyncStorage.removeItem(TOKEN_KEY);
    delete axios.defaults.headers.common['Authorization'];
  }
};