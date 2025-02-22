import { logger } from './logger';

interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoffMultiplier = 2
  } = options;

  let lastError: Error | null = null;
  let currentDelay = delayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      if (attempt === maxAttempts) {
        logger.error(`Todas as ${maxAttempts} tentativas falharam`, {
          error: error.message,
          attempt
        });
        break;
      }

      logger.warn(`Tentativa ${attempt} falhou, tentando novamente em ${currentDelay}ms`, {
        error: error.message,
        attempt,
        nextAttemptDelay: currentDelay
      });

      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay *= backoffMultiplier;
    }
  }

  throw lastError || new Error('Operação falhou após todas as tentativas');
}