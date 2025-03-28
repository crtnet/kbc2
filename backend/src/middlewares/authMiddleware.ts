import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types/auth.types';
import { config } from '../config/config';

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, config.jwt.secret) as { id: string; email: string; type: string };
    req.user = {
      id: decoded.id,
      email: decoded.email,
      type: decoded.type
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}; 