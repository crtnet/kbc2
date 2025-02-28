import { logger } from './logger';

interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: any) => boolean;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    shouldRetry = (_: any) => true
  } = options;

  let lastError: Error | null = null;
  let currentDelay = delayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Verificar se devemos tentar novamente com base no tipo de erro
      if (!shouldRetry(error)) {
        logger.warn(`Erro não recuperável, parando tentativas`, {
          error: error.message,
          attempt
        });
        throw error;
      }
      
      if (attempt === maxAttempts) {
        logger.error(`Todas as ${maxAttempts} tentativas falharam`, {
          error: error.message,
          attempt
        });
        break;
      }

      // Incluir mensagem mais detalhada no log para depuração
      if (error.response) {
        logger.warn(`Tentativa ${attempt} falhou com código ${error.response.status}`, {
          error: error.message,
          statusCode: error.response.status,
          statusText: error.response.statusText,
          method: error.response.config?.method,
          url: error.response.config?.url,
          attempt,
          nextAttemptDelay: currentDelay
        });
      } else if (error.code === 'ECONNABORTED') {
        logger.warn(`Tentativa ${attempt} falhou: timeout excedido`, {
          error: error.message,
          attempt,
          nextAttemptDelay: currentDelay
        });
      } else {
        logger.warn(`Tentativa ${attempt} falhou, tentando novamente em ${currentDelay}ms`, {
          error: error.message,
          attempt,
          nextAttemptDelay: currentDelay
        });
      }

      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay *= backoffMultiplier;
    }
  }

  throw lastError || new Error('Operação falhou após todas as tentativas');
}