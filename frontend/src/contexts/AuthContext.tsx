import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

// Exporta uma referência global para a função signOut para uso fora de componentes
export let signOutGlobal: () => Promise<void> = async () => {
  console.warn('signOutGlobal ainda não foi inicializado.');
};

// Variável global para manter o token em memória
export let globalToken: string | null = null;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const {
    storedValue: token,
    setValue: setToken,
    removeValue: removeToken,
  } = useAsyncStorage<string>('token');
  const {
    storedValue: userData,
    setValue: setUserData,
    removeValue: removeUserData,
  } = useAsyncStorage<User>('user');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    logger.info('AuthContext - userData:', userData);
    logger.info('AuthContext - token:', token);
    logger.info('AuthContext - isLoading:', isLoading);

    // Se o token do hook for atualizado, atualiza também o globalToken
    if (token) {
      globalToken = token;
    }

    const validateToken = async () => {
      if (token) {
        try {
          logger.info('Validando token no useEffect:', token);
          const response = await api.get('/auth/verify', {
            headers: { Authorization: `Bearer ${token}` },
          });
          logger.info('Resposta da validação do token:', response.data);
          if (response.data.valid) {
            logger.info('Token validado com sucesso');
            // Se um novo token for recebido, atualiza-o
            if (response.data.token) {
              const newToken = response.data.token.trim().replace(/^"|"$/g, '');
              await setToken(newToken);
              await AsyncStorage.setItem('token', newToken);
              globalToken = newToken;
            }
            if (response.data.user) {
              await setUserData(response.data.user);
            }
          } else {
            logger.warn('Token é inválido');
            await signOut();
          }
        } catch (error) {
          logger.error('Falha na validação do token', error);
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
      logger.info('SignIn - token recebido:', token);
      logger.info('SignIn - user:', user);
      const tokenStr =
        typeof token === 'string'
          ? token.trim().replace(/^"|"$/g, '')
          : '';
      if (!tokenStr) {
        throw new Error('Token inválido retornado pelo servidor');
      }
      // Armazena o token e atualiza o globalToken
      await setToken(tokenStr);
      await AsyncStorage.setItem('token', tokenStr);
      globalToken = tokenStr;
      await setUserData(user);
      logger.info('Usuário logado com sucesso', { userId: user.id });
    } catch (error) {
      logger.error('Falha no login', error);
      Alert.alert(
        'Erro no login',
        error instanceof Error ? error.message : 'Ocorreu um erro ao fazer login'
      );
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await removeToken();
      await removeUserData();
      await AsyncStorage.removeItem('token');
      globalToken = null;
      logger.info('Usuário deslogado');
    } catch (error) {
      logger.error('Falha ao deslogar', error);
    }
  }, []);

  // Atualiza a referência global para signOut
  signOutGlobal = signOut;

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      try {
        setIsLoading(true);
        const response = await api.post('/auth/register', {
          name,
          email,
          password,
        });
        const { token, user } = response.data;
        const tokenStr =
          typeof token === 'string'
            ? token.trim().replace(/^"|"$/g, '')
            : '';
        await setToken(tokenStr);
        await AsyncStorage.setItem('token', tokenStr);
        globalToken = tokenStr;
        await setUserData(user);
        logger.info('Usuário registrado com sucesso', { userId: user.id });
      } catch (error) {
        logger.error('Falha ao registrar', error);
        Alert.alert('Erro', 'Não foi possível criar a conta');
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        user: userData,
        token,
        isLoading,
        signed: !!userData && !!token,
        signIn,
        signOut,
        signUp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};