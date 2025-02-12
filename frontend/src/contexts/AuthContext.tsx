import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  type: string;
}

interface AuthContextData {
  signed: boolean;
  user: User | null;
  loading: boolean;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkToken = async () => {
    try {
      const token = await AsyncStorage.getItem('@KidsBook:token');
      if (!token) {
        return false;
      }

      await api.get('/auth/verify');
      return true;
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      return false;
    }
  };

  useEffect(() => {
    async function loadStorageData() {
      try {
        console.log('Carregando dados do storage...');
        const storedUser = await AsyncStorage.getItem('@KidsBook:user');
        const storedToken = await AsyncStorage.getItem('@KidsBook:token');

        if (storedUser && storedToken) {
          console.log('Dados encontrados no storage');
          const isTokenValid = await checkToken();
          
          if (isTokenValid) {
            setUser(JSON.parse(storedUser));
            api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
            console.log('Token válido, usuário restaurado');
          } else {
            console.log('Token inválido, fazendo logout');
            await signOut();
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStorageData();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Iniciando login...');
      const response = await api.post('/auth/login', { email, password });
      console.log('Resposta do login:', response.data);

      const { user: userData, token } = response.data;

      await AsyncStorage.setItem('@KidsBook:user', JSON.stringify(userData));
      await AsyncStorage.setItem('@KidsBook:token', token);

      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(userData);

      console.log('Login concluído com sucesso!');
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await AsyncStorage.removeItem('@KidsBook:user');
      await AsyncStorage.removeItem('@KidsBook:token');
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        signed: !!user, 
        user, 
        loading, 
        signIn, 
        signOut 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}