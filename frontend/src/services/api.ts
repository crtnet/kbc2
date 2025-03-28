// /frontend/src/services/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';
import { config } from '../config';
import { Alert, Platform } from 'react-native';

// Variável local para manter o token em memória
let inMemoryToken: string | null = null;

// Função local de logout (poderá ser injetada pelo AuthContext)
let logoutHandler: (() => Promise<void>) | null = null;

// Log da configuração atual
logger.info('API Configuration', {
  baseURL: config.apiUrl,
  environment: process.env.NODE_ENV,
  platform: Platform.OS
});

/**
 * Atualiza o token em memória e no header Authorization.
 * Chamado pelo AuthContext quando o token muda.
 */
export function setAuthToken(token: string | null) {
  inMemoryToken = token;
}

/**
 * Injeta a função de logout. Chamado pelo AuthContext
 * para que, ao receber 401, possamos deslogar o usuário.
 */
export function setLogoutHandler(fn: () => Promise<void>) {
  logoutHandler = fn;
}

/**
 * Testa várias URLs de API e armazena a primeira que funcionar
 * Esta função deve ser chamada durante a inicialização do app
 */
export async function testApiUrls() {
  // Se já temos uma URL armazenada que funcionou, não precisamos testar novamente
  const storedUrl = await AsyncStorage.getItem('working_api_url');
  if (storedUrl) {
    try {
      // Verifica se a URL armazenada ainda funciona
      const testApi = axios.create({
        baseURL: storedUrl,
        timeout: 3000, // Timeout curto para o teste
      });
      
      const response = await testApi.get('/health');
      
      if (response.status === 200) {
        logger.info(`URL de API armazenada ainda está funcionando: ${storedUrl}`);
        return storedUrl;
      }
    } catch (error) {
      logger.warn(`URL de API armazenada não está mais funcionando: ${storedUrl}`, { 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      });
      // Continua para testar outras URLs
    }
  }

  // Lista de URLs para testar, priorizando o IP correto do backend
  const urlsToTest = [
    'http://52.201.233.44:3000/api',
    'http://52.201.233.44:3333/api',
    'http://3.93.247.189:3000/api',
    'http://3.93.247.189:3333/api',
    config.apiUrl,
    ...config.apiUrlAlternatives,
    // Adiciona URLs para desenvolvimento local
    'http://localhost:3000/api',
    Platform.OS === 'android' ? 'http://10.0.2.2:3000/api' : null
  ].filter(Boolean) as string[];

  // Remove duplicatas
  const uniqueUrls = [...new Set(urlsToTest)];
  
  logger.info(`Testando ${uniqueUrls.length} URLs de API`, { urls: uniqueUrls });

  // Testa cada URL com um timeout curto
  for (const url of uniqueUrls) {
    try {
      logger.info(`Testando URL de API: ${url}`);
      const testApi = axios.create({
        baseURL: url,
        timeout: 3000, // Timeout curto para o teste
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      // Tenta fazer uma requisição simples para o health check
      const response = await testApi.get('/health');
      
      if (response.status === 200) {
        logger.info(`URL de API funcionando: ${url}`);
        // Armazena a URL que funcionou
        await AsyncStorage.setItem('working_api_url', url);
        return url;
      }
    } catch (error) {
      // Tenta o endpoint /ping se /health falhar
      try {
        const testApi = axios.create({
          baseURL: url,
          timeout: 3000,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        const response = await testApi.get('/ping');
        
        if (response.status === 200) {
          logger.info(`URL de API funcionando com endpoint /ping: ${url}`);
          await AsyncStorage.setItem('working_api_url', url);
          return url;
        }
      } catch (pingError) {
        logger.warn(`Falha ao testar URL de API: ${url}`, { 
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          pingError: pingError instanceof Error ? pingError.message : 'Erro desconhecido'
        });
      }
    }
  }

  // Se nenhuma URL funcionou, retorna a URL padrão
  const defaultUrl = config.apiUrl;
  logger.warn(`Nenhuma URL de API funcionou, usando a padrão: ${defaultUrl}`);
  return defaultUrl;
}

// Tenta usar uma URL alternativa se estiver em desenvolvimento
const getBaseURL = async () => {
  // Verifica se temos uma URL armazenada que funcionou anteriormente
  try {
    const storedUrl = await AsyncStorage.getItem('working_api_url');
    if (storedUrl) {
      logger.info(`Usando URL armazenada que funcionou anteriormente: ${storedUrl}`);
      return storedUrl;
    }
  } catch (error) {
    logger.warn('Erro ao recuperar URL armazenada', error);
  }
  
  // Se estamos em desenvolvimento e em um dispositivo Android, podemos precisar de um IP diferente
  if (process.env.NODE_ENV === 'development' && Platform.OS === 'android') {
    // Tenta usar 10.0.2.2 para emulador Android (que aponta para o localhost da máquina host)
    const androidUrl = config.apiUrl.replace('localhost', '10.0.2.2');
    logger.info(`Usando URL para Android: ${androidUrl}`);
    return androidUrl;
  }
  
  logger.info(`Usando URL da API: ${config.apiUrl}`);
  return config.apiUrl;
};

// Inicializa com a URL padrão e depois atualiza
const api = axios.create({
  baseURL: config.apiUrl,
  timeout: 180000, // Aumentando para 180 segundos (3 minutos)
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Atualiza a URL base após verificar qual funciona
getBaseURL().then(url => {
  api.defaults.baseURL = url;
  logger.info(`URL base da API atualizada para: ${url}`);
}).catch(error => {
  logger.error('Erro ao atualizar URL base da API', error);
});

// Interceptor de request
api.interceptors.request.use(
  async (config) => {
    try {
      // Prioriza o token em memória
      let token = inMemoryToken;
      
      if (!token) {
        // Caso não tenha em memória, busca do AsyncStorage
        token = await AsyncStorage.getItem('token');
        logger.info('Token recuperado do AsyncStorage no interceptor:', token);
      }

      if (token) {
        token = token.replace(/^"|"$/g, '');
        config.headers.Authorization = `Bearer ${token}`;
      }

      logger.info('API Request', {
        method: config.method,
        token: token ? 'Present' : 'Missing',
        url: config.url,
      });
      return config;
    } catch (error) {
      logger.error('Erro ao obter token no interceptor', error);
      return config;
    }
  },
  (error) => {
    logger.error('Erro na requisição da API', error);
    return Promise.reject(error);
  }
);

// Interceptor de response
api.interceptors.response.use(
  (response) => {
    logger.info('API Response', {
      status: response.status,
      url: response.config.url,
    });
    return response;
  },
  async (error) => {
    logger.error('Erro na resposta da API', {
      status: error.response?.status,
      message: error.message,
      url: error.config?.url,
      code: error.code,
      isTimeout: error.code === 'ECONNABORTED' || error.message.includes('timeout'),
      isNetworkError: error.code === 'ERR_NETWORK' || error.message.includes('Network Error')
    });

    // Se for um erro de timeout ou conexão, tenta URLs alternativas
    if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || 
        error.message.includes('timeout') || error.message.includes('Network Error')) {
      const originalRequest = error.config;
      
      // Evita loop infinito
      if (!originalRequest._retry && !originalRequest._retryCount) {
        originalRequest._retry = true;
        originalRequest._retryCount = 1;
        
        // Aumenta o timeout para a próxima tentativa
        originalRequest.timeout = Math.min((originalRequest.timeout || 180000) * 1.5, 300000); // Máximo de 5 minutos
        logger.info(`Aumentando timeout para ${originalRequest.timeout/1000}s na próxima tentativa`);
        
        // Testa todas as URLs para encontrar uma que funcione
        const workingUrl = await testApiUrls();
        
        if (workingUrl) {
          try {
            logger.info(`Tentando URL que funcionou no teste: ${workingUrl} com timeout de ${originalRequest.timeout/1000}s`);
            
            // Cria uma instância temporária do axios com a URL que funcionou
            const tempApi = axios.create({
              baseURL: workingUrl,
              timeout: originalRequest.timeout,
              headers: {
                ...originalRequest.headers,
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            });
            
            // Ajusta a URL da requisição original para usar a base URL que funcionou
            const urlPath = originalRequest.url?.replace(originalRequest.baseURL || '', '');
            originalRequest.baseURL = workingUrl;
            originalRequest.url = urlPath;
            
            // Faz a mesma requisição com a URL que funcionou
            const response = await tempApi(originalRequest);
            
            if (response.status >= 200 && response.status < 300) {
              logger.info(`Requisição bem-sucedida com URL alternativa: ${workingUrl}`);
              
              // Atualiza a URL padrão da API para a que funcionou
              api.defaults.baseURL = workingUrl;
              await AsyncStorage.setItem('working_api_url', workingUrl);
              
              return response;
            }
          } catch (altError) {
            logger.error(`Falha ao tentar URL alternativa: ${workingUrl}`, {
              error: altError instanceof Error ? altError.message : 'Erro desconhecido',
              code: altError.code,
              status: altError.response?.status
            });
          }
        }
        
        // Se chegamos aqui, a URL do teste também falhou
        // Vamos tentar cada URL alternativa individualmente
        const alternativeUrls = [
          'http://52.201.233.44:3000/api',
          'http://52.201.233.44:3333/api',
          'http://3.93.247.189:3000/api',
          'http://3.93.247.189:3333/api',
          config.apiUrl,
          ...config.apiUrlAlternatives,
          'http://localhost:3000/api',
          Platform.OS === 'android' ? 'http://10.0.2.2:3000/api' : null
        ].filter(Boolean) as string[];
        
        // Remove duplicatas e a URL que já falhou
        const uniqueUrls = [...new Set(alternativeUrls)].filter(url => url !== originalRequest.baseURL);
        
        // Tenta cada URL alternativa
        for (const alternativeUrl of uniqueUrls) {
          try {
            logger.info(`Tentando URL alternativa: ${alternativeUrl} com timeout de ${originalRequest.timeout/1000}s`);
            
            // Cria uma instância temporária do axios com a URL alternativa
            const tempApi = axios.create({
              baseURL: alternativeUrl,
              timeout: originalRequest.timeout,
              headers: {
                ...originalRequest.headers,
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            });
            
            // Ajusta a URL da requisição original
            const urlPath = originalRequest.url?.replace(originalRequest.baseURL || '', '');
            
            // Faz a mesma requisição com a URL alternativa
            const response = await tempApi({
              ...originalRequest,
              baseURL: alternativeUrl,
              url: urlPath
            });
            
            if (response.status >= 200 && response.status < 300) {
              logger.info(`Requisição bem-sucedida com URL alternativa: ${alternativeUrl}`);
              
              // Atualiza a URL padrão da API para a que funcionou
              api.defaults.baseURL = alternativeUrl;
              await AsyncStorage.setItem('working_api_url', alternativeUrl);
              
              return response;
            }
          } catch (altError) {
            logger.error(`Falha ao tentar URL alternativa: ${alternativeUrl}`, {
              error: altError instanceof Error ? altError.message : 'Erro desconhecido',
              code: altError.code,
              status: altError.response?.status
            });
            // Continua para a próxima URL
          }
        }
      } else if (originalRequest._retryCount && originalRequest._retryCount < 3) {
        // Incrementa o contador de tentativas
        originalRequest._retryCount++;
        
        // Aumenta o timeout progressivamente
        originalRequest.timeout = Math.min(originalRequest.timeout * 1.5, 300000);
        
        // Espera um tempo antes de tentar novamente
        const retryDelay = 2000 * originalRequest._retryCount;
        logger.info(`Tentativa ${originalRequest._retryCount} para a mesma URL após ${retryDelay}ms`);
        
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        
        try {
          // Tenta a mesma requisição novamente
          return await axios(originalRequest);
        } catch (retryError) {
          logger.error(`Falha na tentativa ${originalRequest._retryCount}`, {
            error: retryError instanceof Error ? retryError.message : 'Erro desconhecido'
          });
        }
      }
    }

    if (error.response?.status === 401) {
      // Se tivermos uma função de logout injetada, chamamos
      if (logoutHandler) {
        await AsyncStorage.removeItem('token');
        await logoutHandler();
      }
    }

    return Promise.reject(error);
  }
);

export { api };