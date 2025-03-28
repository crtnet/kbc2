// src/utils/network/apiInitializer.ts

import { Platform } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../logger';
import { config } from '../../config';
import { socketService } from '../../services/socketService';
import { testApiUrls } from '../../services/api';
import { detectApiStructure, detectSocketUrl } from './apiDetector';

/**
 * Inicializa as conexões de rede do aplicativo
 * - Testa várias URLs de API para encontrar uma que funcione
 * - Inicializa a conexão Socket.IO
 * - Configura o token de autenticação
 */
export async function initializeNetworkConnections(): Promise<boolean> {
  try {
    logger.info('Inicializando conexões de rede');
    
    // Verifica a conectividade com o backend
    const isConnected = await checkBackendConnectivity();
    
    if (!isConnected) {
      // Se não conseguiu conectar usando a abordagem normal, tenta uma abordagem mais direta
      logger.warn('Tentando abordagem alternativa para conectar ao backend');
      
      // Tenta conectar diretamente ao IP na porta 3000
      try {
        const directUrl = 'http://3.93.247.189:3000';
        logger.info(`Tentando conexão direta com: ${directUrl}`);
        
        const response = await fetch(directUrl, { 
          method: 'GET',
          headers: { 'Accept': 'text/html,application/json' },
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.status < 500) {
          logger.info(`Conexão direta bem-sucedida com: ${directUrl}`);
          await AsyncStorage.setItem('working_api_url', `${directUrl}/api`);
        } else {
          logger.warn(`Conexão direta falhou com status: ${response.status}`);
          return false;
        }
      } catch (directError) {
        logger.error('Falha na conexão direta', {
          error: directError instanceof Error ? directError.message : 'Erro desconhecido'
        });
        return false;
      }
    }
    
    // Obtém a URL que funcionou
    const workingApiUrl = await AsyncStorage.getItem('working_api_url');
    
    if (workingApiUrl) {
      // Detecta a estrutura da API e ajusta a URL se necessário
      const adjustedUrl = await detectApiStructure(workingApiUrl);
      
      logger.info(`Usando URL de API ajustada: ${adjustedUrl}`);
      
      // Armazena a URL ajustada
      await AsyncStorage.setItem('working_api_url', adjustedUrl);
      
      // Atualiza a URL base da API
      axios.defaults.baseURL = adjustedUrl;
      
      // Configura o axios para usar a URL que funcionou
      logger.info(`Configurando axios para usar: ${adjustedUrl}`);
      axios.defaults.baseURL = adjustedUrl;
    } else {
      // Se não temos uma URL que funcionou, usa a URL padrão
      const defaultUrl = 'http://3.93.247.189:3000/api';
      logger.info(`Nenhuma URL funcionando encontrada, usando padrão: ${defaultUrl}`);
      axios.defaults.baseURL = defaultUrl;
      await AsyncStorage.setItem('working_api_url', defaultUrl);
    }
    
    // Inicializa a conexão Socket.IO
    const socketInitialized = await socketService.initialize();
    logger.info(`Socket.IO inicializado: ${socketInitialized}`);
    
    return true;
  } catch (error) {
    logger.error('Erro ao inicializar conexões de rede', { 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    });
    return false;
  }
}

/**
 * Verifica a conectividade com o backend
 * @returns true se conseguir conectar, false caso contrário
 */
export async function checkBackendConnectivity(): Promise<boolean> {
  try {
    // Lista de URLs para testar, priorizando o IP correto do backend
    const urlsToTest = [
      'http://3.93.247.189:3000/api',
      'http://3.93.247.189:3000',
      'http://3.93.247.189:3333/api',
      'http://3.93.247.189:3333',
      'http://3.93.247.189:8080/api',
      'http://3.93.247.189:8080',
      'http://3.93.247.189/api',
      'http://3.93.247.189',
      'http://3.93.247.189:80/api',
      'http://3.93.247.189:80'
    ];
    
    // Tenta obter a URL de API que está funcionando
    const workingApiUrl = await AsyncStorage.getItem('working_api_url');
    if (workingApiUrl) {
      urlsToTest.unshift(workingApiUrl); // Adiciona no início para testar primeiro
    }
    
    // Remove duplicatas
    const uniqueUrls = [...new Set(urlsToTest)];
    
    // Testa cada URL
    for (const url of uniqueUrls) {
      try {
        logger.info(`Verificando conectividade com: ${url}`);
        
        // Primeiro, verifica se o servidor está respondendo de alguma forma
        try {
          const serverResponse = await fetch(url, { 
            method: 'GET',
            headers: { 'Accept': 'text/html,application/json' },
            signal: AbortSignal.timeout(3000) // 3 segundos de timeout
          });
          
          // Se o servidor responder de qualquer forma, é um bom sinal
          logger.info(`Servidor respondendo em: ${url} com status ${serverResponse.status}`);
          
          // Se for um status 2xx ou 3xx, podemos considerar que o servidor está funcionando
          if (serverResponse.status >= 200 && serverResponse.status < 400) {
            logger.info(`Servidor respondendo bem em: ${url}`);
            await AsyncStorage.setItem('working_api_url', url);
            return true;
          }
        } catch (serverError) {
          logger.warn(`Servidor não está respondendo em: ${url}`, {
            error: serverError instanceof Error ? serverError.message : 'Erro desconhecido'
          });
        }
        
        // Cria uma instância do axios com timeout curto
        const testApi = axios.create({
          baseURL: url,
          timeout: 5000, // 5 segundos
        });
        
        // Tenta fazer uma requisição para a raiz da API ou qualquer rota que sabemos que existe
        // Primeiro tenta a rota /health
        try {
          const healthResponse = await testApi.get('/health');
          if (healthResponse.status >= 200 && healthResponse.status < 300) {
            logger.info(`Conectividade OK com: ${url} (rota /health)`);
            await AsyncStorage.setItem('working_api_url', url);
            return true;
          }
        } catch (healthError) {
          logger.info(`Rota /health não disponível em: ${url}, tentando raiz`);
          
          // Se /health falhar, tenta a raiz
          try {
            const rootResponse = await testApi.get('/');
            if (rootResponse.status >= 200 && rootResponse.status < 500) {
              // Aceitamos qualquer resposta que não seja erro do servidor
              logger.info(`Conectividade OK com: ${url} (rota /)`);
              await AsyncStorage.setItem('working_api_url', url);
              return true;
            }
          } catch (rootError) {
            // Se a raiz também falhar, tenta a rota /api/auth/login
          try {
            const loginResponse = await testApi.post('/api/auth/login', {
              email: 'test@example.com',
              password: 'password123'
            });
            // Mesmo um 401 indica que o servidor está respondendo
            if (loginResponse.status < 500) {
              logger.info(`Conectividade OK com: ${url} (rota /api/auth/login)`);
              await AsyncStorage.setItem('working_api_url', url);
              return true;
            }
          } catch (loginError) {
            const loginStatus = (loginError as any)?.response?.status;
            if (loginStatus && loginStatus < 500) {
              logger.info(`Conectividade OK com: ${url} (rota /api/auth/login retornou ${loginStatus})`);
              await AsyncStorage.setItem('working_api_url', url);
              return true;
            }
            
            // Ignora erro específico da rota login
            logger.info(`Rota /api/auth/login não disponível em: ${url}`);
            
            // Tenta a rota /auth/login diretamente (sem /api)
            try {
              const directLoginResponse = await testApi.post('/auth/login', {
                email: 'test@example.com',
                password: 'password123'
              });
              if (directLoginResponse.status < 500) {
                logger.info(`Conectividade OK com: ${url} (rota /auth/login)`);
                await AsyncStorage.setItem('working_api_url', url);
                return true;
              }
            } catch (directLoginError) {
              const directLoginStatus = (directLoginError as any)?.response?.status;
              if (directLoginStatus && directLoginStatus < 500) {
                logger.info(`Conectividade OK com: ${url} (rota /auth/login retornou ${directLoginStatus})`);
                await AsyncStorage.setItem('working_api_url', url);
                return true;
              }
              logger.info(`Rota /auth/login não disponível em: ${url}`);
            }
          }
          }
        }
      } catch (error) {
        logger.warn(`Falha ao conectar com: ${url}`, { 
          error: error instanceof Error ? error.message : 'Erro desconhecido' 
        });
      }
    }
    
    logger.error('Não foi possível conectar a nenhuma URL do backend');
    return false;
  } catch (error) {
    logger.error('Erro ao verificar conectividade com o backend', { 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    });
    return false;
  }
}

/**
 * Tenta reconectar com o backend após falha
 * - Testa várias URLs de API
 * - Reinicia a conexão Socket.IO
 */
export async function reconnectToBackend(): Promise<boolean> {
  try {
    logger.info('Tentando reconectar com o backend');
    
    // Remove a URL armazenada para forçar um novo teste
    await AsyncStorage.removeItem('working_api_url');
    
    // Verifica a conectividade com o backend
    const isConnected = await checkBackendConnectivity();
    
    if (!isConnected) {
      logger.error('Não foi possível reconectar ao backend');
      return false;
    }
    
    // Reinicia a conexão Socket.IO
    socketService.reconnect();
    
    return true;
  } catch (error) {
    logger.error('Erro ao reconectar com o backend', { 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    });
    return false;
  }
}