import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        type: string;
      };
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info('Middleware de autenticação - Headers recebidos:', {
      authorization: req.headers.authorization ? 'Present' : 'Missing',
      headers: Object.keys(req.headers)
    });

    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      logger.error('Token não fornecido');
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      logger.info('Token decodificado com sucesso:', { decoded });

      if (typeof decoded === 'string') {
        throw new Error('Token inválido');
      }

      req.user = {
        id: decoded.id,
        email: decoded.email,
        type: decoded.type
      };

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.error('Token expirado');
        return res.status(401).json({ error: 'Token expirado' });
      }
      
      if (error instanceof jwt.JsonWebTokenError) {
        logger.error('Token inválido:', error.message);
        return res.status(401).json({ error: 'Token inválido' });
      }

      logger.error('Erro na verificação do token:', error);
      return res.status(401).json({ error: 'Token inválido' });
    }
  } catch (error) {
    logger.error('Erro no middleware de autenticação:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
};