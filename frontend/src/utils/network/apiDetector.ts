// src/utils/network/apiDetector.ts

import axios from 'axios';
import { logger } from '../logger';

/**
 * Detecta a estrutura da API e ajusta a URL base conforme necessário
 * @param baseUrl URL base que está funcionando
 * @returns URL ajustada para uso com a API
 */
export async function detectApiStructure(baseUrl: string): Promise<string> {
  try {
    logger.info(`Detectando estrutura da API em: ${baseUrl}`);
    
    const testApi = axios.create({
      baseURL: baseUrl,
      timeout: 5000,
    });
    
    // Verifica se a URL já termina com /api
    if (baseUrl.endsWith('/api')) {
      logger.info(`URL já contém /api: ${baseUrl}`);
      return baseUrl;
    }
    
    // Tenta acessar /api/auth para ver se precisamos adicionar /api
    try {
      const withApiResponse = await testApi.get('/api/auth');
      // Se não der erro, significa que a rota /api/auth existe
      logger.info(`Rota /api/auth acessível em: ${baseUrl}`);
      
      // Verifica se precisamos adicionar /api à URL base
      if (!baseUrl.endsWith('/api')) {
        const newUrl = `${baseUrl}/api`;
        logger.info(`Ajustando URL para: ${newUrl}`);
        return newUrl;
      }
      
      return baseUrl;
    } catch (apiError) {
      // Se der erro 404, pode ser que a rota auth não exista
      // Se for outro erro como 401, significa que a rota existe mas requer autenticação
      const status = (apiError as any)?.response?.status;
      
      if (status === 401 || status === 403) {
        // A rota existe mas requer autenticação
        logger.info(`Rota /api/auth requer autenticação em: ${baseUrl}`);
        
        // Verifica se precisamos adicionar /api à URL base
        if (!baseUrl.endsWith('/api')) {
          const newUrl = `${baseUrl}/api`;
          logger.info(`Ajustando URL para: ${newUrl}`);
          return newUrl;
        }
        
        return baseUrl;
      }
      
      // Tenta acessar /auth diretamente (sem /api)
      try {
        const directAuthResponse = await testApi.get('/auth');
        // Se não der erro, significa que a API não usa o prefixo /api
        logger.info(`Rota /auth acessível diretamente em: ${baseUrl}`);
        return baseUrl;
      } catch (directError) {
        const directStatus = (directError as any)?.response?.status;
        
        if (directStatus === 401 || directStatus === 403) {
          // A rota existe mas requer autenticação
          logger.info(`Rota /auth requer autenticação em: ${baseUrl}`);
          return baseUrl;
        }
      }
    }
    
    // Se chegamos aqui, não conseguimos determinar com certeza
    // Vamos assumir que a URL base está correta
    logger.info(`Não foi possível determinar a estrutura da API, usando URL original: ${baseUrl}`);
    return baseUrl;
  } catch (error) {
    logger.error('Erro ao detectar estrutura da API', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      baseUrl
    });
    return baseUrl;
  }
}

/**
 * Tenta detectar a porta correta para o Socket.IO
 * @param baseUrl URL base da API
 * @returns URL base para o Socket.IO
 */
export async function detectSocketUrl(baseUrl: string): Promise<string> {
  try {
    logger.info(`Detectando URL para Socket.IO a partir de: ${baseUrl}`);
    
    // Remove /api do final se existir
    let socketUrl = baseUrl.replace(/\/api$/, '');
    
    // Tenta conectar diretamente
    try {
      const response = await fetch(`${socketUrl}/socket.io/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (response.ok || response.status === 400) {
        // Status 400 também é aceitável, pois indica que o Socket.IO está respondendo
        // mas esperava uma requisição diferente
        logger.info(`Socket.IO disponível em: ${socketUrl}`);
        return socketUrl;
      }
    } catch (error) {
      logger.warn(`Socket.IO não disponível em: ${socketUrl}`, {
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
    
    // Se não funcionou, tenta outras portas comuns
    // Prioriza a porta 3000 que é a que está funcionando segundo os logs
    const ports = ['3000', '3333', '8080', '80'];
    const baseWithoutPort = socketUrl.replace(/:\d+/, '');
    
    for (const port of ports) {
      const urlWithPort = `${baseWithoutPort}:${port}`;
      
      try {
        logger.info(`Tentando Socket.IO em: ${urlWithPort}`);
        const response = await fetch(`${urlWithPort}/socket.io/`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          // Adiciona um timeout para não ficar esperando muito tempo
          signal: AbortSignal.timeout(3000)
        });
        
        if (response.ok || response.status === 400) {
          logger.info(`Socket.IO disponível em: ${urlWithPort}`);
          return urlWithPort;
        }
      } catch (error) {
        logger.warn(`Socket.IO não disponível em: ${urlWithPort}`, {
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }
    
    // Se nenhuma tentativa funcionou, retorna a URL com porta 3000 (que é a que está funcionando segundo os logs)
    const defaultSocketUrl = `${baseWithoutPort}:3000`;
    logger.warn(`Não foi possível detectar URL para Socket.IO, usando: ${defaultSocketUrl}`);
    return defaultSocketUrl;
  } catch (error) {
    logger.error('Erro ao detectar URL para Socket.IO', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      baseUrl
    });
    // Retorna a URL sem /api e com porta 3000
    const baseWithoutPort = baseUrl.replace(/\/api$/, '').replace(/:\d+/, '');
    return `${baseWithoutPort}:3000`;
  }
}