import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { api } from '../services/api';
import { useAsyncStorage } from '../hooks/useAsyncStorage';
import { logger } from '../utils/logger';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextData {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { storedValue: token, setValue: setToken, removeValue: removeToken } = useAsyncStorage<string>('token');
  const { storedValue: userData, setValue: setUserData, removeValue: removeUserData } = useAsyncStorage<User>('user');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar se o token é válido ao iniciar o app
    const validateToken = async () => {
      if (token) {
        try {
          const response = await api.get('/auth/validate', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.data.valid) {
            logger.info('Token validated successfully');
          } else {
            logger.warn('Token is invalid');
            await signOut();
          }
        } catch (error) {
          logger.error('Token validation failed', error);
          await signOut();
        }
      }
      setIsLoading(false);
    };

    validateToken();
  }, [token]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await api.post('/auth/login', { email, password });
      
      const { token, user } = response.data;
      
      await setToken(token);
      await setUserData(user);
      
      logger.info('User signed in successfully', { userId: user.id });
    } catch (error) {
      logger.error('Sign in failed', error);
      Alert.alert('Erro', 'Não foi possível fazer login');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await removeToken();
      await removeUserData();
      logger.info('User signed out');
    } catch (error) {
      logger.error('Sign out failed', error);
    }
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await api.post('/auth/register', { name, email, password });
      
      const { token, user } = response.data;
      
      await setToken(token);
      await setUserData(user);
      
      logger.info('User registered successfully', { userId: user.id });
    } catch (error) {
      logger.error('Sign up failed', error);
      Alert.alert('Erro', 'Não foi possível criar a conta');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user: userData,
      token,
      isLoading,
      signIn,
      signOut,
      signUp
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};