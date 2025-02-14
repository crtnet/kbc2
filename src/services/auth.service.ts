import { TOKEN_KEY, USER_KEY } from '../constants/auth.constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsyncStorage } from '@react-native-async-storage/async-storage';

class AuthService {
  private token: string | null = null;
  private user: any = null;

  async init() {
    try {
      this.token = await AsyncStorage.getItem(TOKEN_KEY);
      this.user = JSON.parse(await AsyncStorage.getItem(USER_KEY) || 'null');
    } catch (error) {
      console.error('Error initializing auth service:', error);
    }
  }

  async setToken(token: string) {
    try {
      this.token = token;
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.error('Error setting token:', error);
    }
  }

  async setUser(user: any) {
    try {
      this.user = user;
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error setting user:', error);
    }
  }

  async getToken(): Promise<string | null> {
    if (!this.token) {
      try {
        this.token = await AsyncStorage.getItem(TOKEN_KEY);
      } catch (error) {
        console.error('Error getting token:', error);
      }
    }
    return this.token;
  }

  async getUser(): Promise<any> {
    if (!this.user) {
      try {
        const userStr = await AsyncStorage.getItem(USER_KEY);
        this.user = userStr ? JSON.parse(userStr) : null;
      } catch (error) {
        console.error('Error getting user:', error);
      }
    }
    return this.user;
  }

  async logout() {
    try {
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
      this.token = null;
      this.user = null;
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  async verifyToken(token: string): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      return response.ok;
    } catch (error) {
      console.error('Error verifying token:', error);
      return false;
    }
  }
}

export default new AuthService();