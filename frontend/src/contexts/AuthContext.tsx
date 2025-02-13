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
  signed: boolean;
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
    console.log('AuthContext - userData:', userData);
    console.log('AuthContext - token:', token);
    console.log('AuthContext - isLoading:', isLoading);

    // Verificar se o token é válido ao iniciar o app
    const validateToken = async () => {
      if (token) {
        try {
          console.log('Validating token:', token);
          const response = await api.get('/auth/verify', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          console.log('Token validation response:', response.data);
          
          if (response.data.valid) {
            logger.info('Token validated successfully');
            
            // Se recebeu um novo token, atualiza
            if (response.data.token) {
              await setToken(response.data.token);
            }
            
            // Atualiza os dados do usuário
            if (response.data.user) {
              await setUserData(response.data.user);
            }
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
      
      console.log('SignIn - token:', token);
      console.log('SignIn - user:', user);
      
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
      signed: !!userData && !!token,
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