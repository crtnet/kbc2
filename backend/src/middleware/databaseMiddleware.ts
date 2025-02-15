import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { checkDatabaseConnection, connectDatabase } from '../config/database';

export const databaseMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info('Middleware de banco de dados - Verificando conexão');

    // Tenta reconectar se a conexão estiver perdida
    if (!(await checkDatabaseConnection())) {
      logger.warn('Conexão com o banco de dados perdida. Tentando reconectar...');
      
      try {
        await connectDatabase();
      } catch (reconnectError) {
        logger.error('Falha ao reconectar com o banco de dados', {
          error: reconnectError instanceof Error ? reconnectError.message : 'Erro desconhecido'
        });
        
        return res.status(503).json({ 
          error: 'Serviço temporariamente indisponível',
          details: 'Problemas de conexão com o banco de dados. Por favor, tente novamente em alguns instantes.'
        });
      }
    }

    logger.info('Conexão com o banco de dados verificada com sucesso');
    next();
  } catch (error) {
    logger.error('Erro no middleware do banco de dados:', {
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
    
    res.status(503).json({ 
      error: 'Serviço temporariamente indisponível',
      details: 'Ocorreu um problema com o serviço de banco de dados. Por favor, tente novamente em alguns instantes.'
    });
  }
};