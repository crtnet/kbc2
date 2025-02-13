import React, { createContext, useContext, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import api from '../services/api';

interface AuthContextData {
  signed: boolean;
  user: User | null;
  loading: boolean;
  signIn(email: string, password: string): Promise<void>;
  signOut(): void;
}

interface User {
  id: string;
  name: string;
  email: string;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const response = await api.post('/api/auth/login', {
        email,
        password,
      });

      const { token, user: userData } = response.data;

      if (!token || !userData) {
        throw new Error('Dados de autenticação inválidos');
      }

      // Configurar token nos headers padrão primeiro
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Salvar dados localmente
      await Promise.all([
        AsyncStorage.setItem('@KidsBookCreator:token', token),
        AsyncStorage.setItem('@KidsBookCreator:user', JSON.stringify(userData))
      ]);
      
      // Atualizar o estado do usuário por último
      setUser(userData);
    } catch (error) {
      console.error('🔒 Login Error:', error);
      
      if (error.response) {
        // O servidor respondeu com um status de erro
        const errorMessage = error.response.data.message || 'Erro ao fazer login';
        Alert.alert('Erro de Autenticação', errorMessage);
      } else if (error.request) {
        // A requisição foi feita, mas não houve resposta
        Alert.alert(
          'Erro de Conexão', 
          'Não foi possível conectar ao servidor. Verifique sua conexão de internet.'
        );
      } else {
        // Algo aconteceu ao configurar a requisição
        Alert.alert(
          'Erro Inesperado', 
          'Ocorreu um erro ao processar o login. Tente novamente.'
        );
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      // Remover token e usuário do AsyncStorage
      await AsyncStorage.removeItem('@KidsBookCreator:token');
      await AsyncStorage.removeItem('@KidsBookCreator:user');

      // Limpar headers de autorização
      delete api.defaults.headers.common['Authorization'];
      
      setUser(null);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      Alert.alert('Erro', 'Não foi possível fazer logout');
    }
  }, []);

  // Carregar usuário salvo ao iniciar o app
  React.useEffect(() => {
    const loadStoredUser = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('@KidsBookCreator:token');
        const storedUserJson = await AsyncStorage.getItem('@KidsBookCreator:user');

        if (storedToken && storedUserJson) {
          const storedUser = JSON.parse(storedUserJson);
          
          // Configurar token nos headers
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          
          setUser(storedUser);
        }
      } catch (error) {
        console.error('Erro ao carregar usuário salvo:', error);
      }
    };

    loadStoredUser();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        signed: !!user,
        user,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextData {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}