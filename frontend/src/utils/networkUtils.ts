// src/utils/networkUtils.ts
import axios from 'axios';
import { logger } from './logger';

/**
 * Verifica se um servidor está acessível
 * @param url URL do servidor para verificar
 * @param timeout Tempo limite em milissegundos
 * @returns Promise<boolean> true se o servidor estiver acessível
 */
export const isServerReachable = async (url: string, timeout = 5000): Promise<boolean> => {
  try {
    logger.info(`Verificando se o servidor está acessível: ${url}`);
    
    // Tenta fazer uma requisição HEAD para verificar se o servidor está acessível
    await axios({
      method: 'HEAD',
      url,
      timeout,
    });
    
    logger.info(`Servidor acessível: ${url}`);
    return true;
  } catch (error) {
    logger.warn(`Servidor não acessível: ${url}`, { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    return false;
  }
};

/**
 * Tenta encontrar uma URL de servidor acessível entre várias opções
 * @param urls Lista de URLs para verificar
 * @param timeout Tempo limite em milissegundos para cada verificação
 * @returns Promise<string | null> URL acessível ou null se nenhuma estiver acessível
 */
export const findReachableServer = async (urls: string[], timeout = 5000): Promise<string | null> => {
  logger.info(`Procurando servidor acessível entre ${urls.length} opções`);
  
  // Verifica cada URL em paralelo
  const results = await Promise.all(
    urls.map(async (url) => {
      const isReachable = await isServerReachable(url, timeout);
      return { url, isReachable };
    })
  );
  
  // Encontra a primeira URL acessível
  const reachableServer = results.find((result) => result.isReachable);
  
  if (reachableServer) {
    logger.info(`Servidor acessível encontrado: ${reachableServer.url}`);
    return reachableServer.url;
  }
  
  logger.warn('Nenhum servidor acessível encontrado');
  return null;
};

/**
 * Verifica se há conexão com a internet
 * @returns Promise<boolean> true se houver conexão com a internet
 */
export const hasInternetConnection = async (): Promise<boolean> => {
  try {
    // Tenta acessar um serviço confiável para verificar a conexão
    await axios.get('https://www.google.com', { timeout: 5000 });
    return true;
  } catch (error) {
    return false;
  }
};