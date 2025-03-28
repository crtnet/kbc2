// /frontend/src/contexts/AuthContext.ts
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setAuthToken, setLogoutHandler } from '../services/api';
import { useAsyncStorage } from '../hooks/useAsyncStorage';
import { logger } from '../utils/logger';
import { socketService } from '../services/socketService';

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

// Exporta referência global para signOut se quiser
export let signOutGlobal: () => Promise<void> = async () => {
  console.warn('signOutGlobal ainda não foi inicializado.');
};

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

  // Injeta a função de logout no api
  useEffect(() => {
    setLogoutHandler(signOutGlobal);
  }, []);

  // Autentica o socket quando o usuário estiver logado
  useEffect(() => {
    if (userData?.id) {
      logger.info('Autenticando socket com ID do usuário', { userId: userData.id });
      socketService.authenticate(userData.id);
    }
  }, [userData?.id]);

  useEffect(() => {
    logger.info('AuthContext - userData:', userData);
    logger.info('AuthContext - token:', token);
    logger.info('AuthContext - isLoading:', isLoading);

    // Sempre que o token mudar, setamos no axios via setAuthToken
    if (token) {
      globalToken = token;
      setAuthToken(token);
    } else {
      globalToken = null;
      setAuthToken(null);
    }

    const validateToken = async () => {
      if (token) {
        try {
          logger.info('Validando token no useEffect:', token);
          const response = await api.get('/auth/verify');
          logger.info('Resposta da validação do token:', response.data);

          if (response.data.valid) {
            logger.info('Token validado com sucesso');
            // Se um novo token for recebido, atualiza-o
            if (response.data.token) {
              const newToken = response.data.token.trim().replace(/^"|"$/g, '');
              await setToken(newToken);
              await AsyncStorage.setItem('token', newToken);
              globalToken = newToken;
              setAuthToken(newToken);
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
      // Depois de tentar validar, marcamos isLoading como false
      setIsLoading(false);
    };

    validateToken();
  }, [token]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      logger.info('Tentando fazer login com:', { email, apiUrl: api.defaults.baseURL });
      
      // Tenta fazer login com a URL principal
      try {
        const response = await api.post('/auth/login', { email, password });
        const { token, user } = response.data;
        logger.info('SignIn - token recebido:', token);
        logger.info('SignIn - user:', user);

        const tokenStr =
          typeof token === 'string' ? token.trim().replace(/^"|"$/g, '') : '';

        if (!tokenStr) {
          throw new Error('Token inválido retornado pelo servidor');
        }
        // Armazena o token e atualiza
        await setToken(tokenStr);
        await AsyncStorage.setItem('token', tokenStr);
        globalToken = tokenStr;
        setAuthToken(tokenStr);

        await setUserData(user);

        // Autentica o socket com o ID do usuário
        if (user?.id) {
          socketService.authenticate(user.id);
        }

        logger.info('Usuário logado com sucesso', { userId: user.id });
      } catch (error: any) {
        // Se for um erro de rede, tenta URLs alternativas
        if (error.message === 'Network Error' && config.apiUrlAlternatives && config.apiUrlAlternatives.length > 0) {
          logger.warn('Erro de rede na URL principal, tentando URLs alternativas');
          
          // Tenta cada URL alternativa
          for (const alternativeUrl of config.apiUrlAlternatives) {
            if (alternativeUrl === api.defaults.baseURL) continue; // Pula a URL atual
            
            try {
              logger.info(`Tentando URL alternativa: ${alternativeUrl}`);
              
              // Cria uma instância temporária do axios com a URL alternativa
              const tempApi = axios.create({
                baseURL: alternativeUrl,
                timeout: 10000, // Timeout menor para falhar mais rápido
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                }
              });
              
              const response = await tempApi.post('/auth/login', { email, password });
              
              if (response.data && response.data.token) {
                logger.info(`Login bem-sucedido com URL alternativa: ${alternativeUrl}`);
                
                // Atualiza a URL padrão da API para a que funcionou
                api.defaults.baseURL = alternativeUrl;
                
                // Processa o login normalmente
                const { token, user } = response.data;
                const tokenStr = typeof token === 'string' ? token.trim().replace(/^"|"$/g, '') : '';
                
                if (!tokenStr) {
                  throw new Error('Token inválido retornado pelo servidor');
                }
                
                await setToken(tokenStr);
                await AsyncStorage.setItem('token', tokenStr);
                globalToken = tokenStr;
                setAuthToken(tokenStr);
                await setUserData(user);
                
                if (user?.id) {
                  socketService.authenticate(user.id);
                }
                
                logger.info('Usuário logado com sucesso (URL alternativa)', { userId: user.id });
                return; // Sai da função se o login for bem-sucedido
              }
            } catch (altError) {
              logger.error(`Falha ao tentar URL alternativa: ${alternativeUrl}`, altError);
              // Continua para a próxima URL
            }
          }
          
          // Se chegou aqui, nenhuma URL alternativa funcionou
          throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão com a internet.');
        } else if (error.response?.status === 401) {
          // Erro de credenciais inválidas - usar a mensagem específica do backend se disponível
          const errorMessage = error.response?.data?.message || 'Email ou senha incorretos. Verifique suas credenciais e tente novamente.';
          throw new Error(errorMessage);
        } else {
          // Se não for um erro de rede ou não houver URLs alternativas, repassa o erro
          throw error;
        }
      }
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
      setAuthToken(null);
      
      // Desconecta o socket ao fazer logout
      socketService.disconnect();
      
      logger.info('Usuário deslogado');
    } catch (error) {
      logger.error('Falha ao deslogar', error);
    }
  }, []);

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
          typeof token === 'string' ? token.trim().replace(/^"|"$/g, '') : '';

        await setToken(tokenStr);
        await AsyncStorage.setItem('token', tokenStr);
        globalToken = tokenStr;
        setAuthToken(tokenStr);

        await setUserData(user);
        
        // Autentica o socket com o ID do usuário
        if (user?.id) {
          socketService.authenticate(user.id);
        }
        
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