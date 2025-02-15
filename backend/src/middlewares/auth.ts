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
    // Verifica se o JWT_SECRET está configurado
    if (!config.jwtSecret) {
      logger.error('JWT_SECRET não configurado no ambiente');
      return res.status(500).json({ 
        error: 'Erro de configuração do servidor',
        details: 'Configuração de autenticação ausente'
      });
    }

    const authHeader = req.headers.authorization;

    // Log dos headers apenas em desenvolvimento
    if (config.nodeEnv === 'development') {
      logger.info('Middleware de autenticação - Headers recebidos:', {
        method: req.method,
        path: req.path,
        hasAuth: !!authHeader
      });
    }

    if (!authHeader) {
      logger.error('Token não fornecido');
      return res.status(401).json({ 
        error: 'Não autorizado',
        details: 'Token não fornecido'
      });
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2) {
      logger.error('Token mal formatado - número incorreto de partes');
      return res.status(401).json({ 
        error: 'Não autorizado',
        details: 'Token mal formatado'
      });
    }

    const [scheme, token] = parts;

    if (!/^Bearer$/i.test(scheme)) {
      logger.error('Token mal formatado - scheme inválido', { scheme });
      return res.status(401).json({ 
        error: 'Não autorizado',
        details: 'Token mal formatado'
      });
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as {
        id: string;
        email: string;
        type: string;
        iat?: number;
        exp?: number;
      };

      // Validações do payload do token
      if (!decoded.id || !decoded.email || !decoded.type) {
        logger.error('Token com payload inválido', { 
          hasId: !!decoded.id,
          hasEmail: !!decoded.email,
          hasType: !!decoded.type
        });
        return res.status(401).json({ 
          error: 'Não autorizado',
          details: 'Token inválido'
        });
      }

      // Verifica se o token expirou
      if (decoded.exp && decoded.exp < Date.now() / 1000) {
        logger.error('Token expirado', { 
          exp: decoded.exp,
          now: Date.now() / 1000
        });
        return res.status(401).json({ 
          error: 'Não autorizado',
          details: 'Token expirado'
        });
      }

      // Log apenas em desenvolvimento
      if (config.nodeEnv === 'development') {
        logger.info('Token validado com sucesso:', { 
          userId: decoded.id,
          email: decoded.email,
          type: decoded.type
        });
      }

      // Atribui os dados do usuário à requisição
      req.user = {
        id: decoded.id,
        email: decoded.email,
        type: decoded.type
      };
      
      return next();
    } catch (error: any) {
      logger.error('Erro na verificação do token:', {
        message: error.message,
        name: error.name
      });

      // Mensagens de erro específicas baseadas no tipo de erro
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          error: 'Não autorizado',
          details: 'Token inválido'
        });
      }

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'Não autorizado',
          details: 'Token expirado'
        });
      }

      return res.status(401).json({ 
        error: 'Não autorizado',
        details: 'Erro na validação do token'
      });
    }
  } catch (error: any) {
    logger.error('Erro no middleware de autenticação:', {
      message: error.message,
      stack: config.nodeEnv === 'development' ? error.stack : undefined
    });
    
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: config.nodeEnv === 'development' ? error.message : undefined
    });
  }
};