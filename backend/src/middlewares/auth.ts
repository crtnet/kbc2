import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    type: string;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const [, token] = authHeader.split(' ');

    if (!token) {
      return res.status(401).json({ error: 'Token mal formatado' });
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as {
        id: string;
        email: string;
        type: string;
      };

      req.user = decoded;
      
      return next();
    } catch (error) {
      logger.error(`Erro na verificação do token: ${error.message}`);
      return res.status(401).json({ error: 'Token inválido' });
    }
  } catch (error) {
    logger.error(`Erro no middleware de autenticação: ${error.message}`);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};