import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

export const secureStaticMiddleware = (baseDir: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Verifica se o usuário está autenticado
      if (!req.user) {
        logger.warn('Tentativa de acesso não autorizado a arquivo estático', {
          path: req.path,
          ip: req.ip
        });
        return res.status(401).json({ error: 'Não autorizado' });
      }

      // Normaliza e valida o caminho do arquivo
      const filePath = path.normalize(path.join(baseDir, req.params.filename));
      
      // Verifica se o caminho está dentro do diretório base
      if (!filePath.startsWith(baseDir)) {
        logger.warn('Tentativa de path traversal detectada', {
          path: req.path,
          normalizedPath: filePath,
          ip: req.ip
        });
        return res.status(403).json({ error: 'Acesso negado' });
      }

      // Verifica se o arquivo existe
      if (!fs.existsSync(filePath)) {
        logger.warn('Tentativa de acesso a arquivo inexistente', {
          path: req.path,
          normalizedPath: filePath,
          ip: req.ip
        });
        return res.status(404).json({ error: 'Arquivo não encontrado' });
      }

      // Verifica se o arquivo pertence ao usuário correto
      const bookId = path.basename(filePath, '.pdf');
      const book = await req.db.collection('books').findOne({
        _id: bookId,
        userId: req.user.id
      });

      if (!book) {
        logger.warn('Tentativa de acesso a arquivo de outro usuário', {
          path: req.path,
          userId: req.user.id,
          bookId,
          ip: req.ip
        });
        return res.status(403).json({ error: 'Acesso negado' });
      }

      // Serve o arquivo
      logger.info('Servindo arquivo estático', {
        path: req.path,
        userId: req.user.id,
        bookId
      });
      
      res.sendFile(filePath);
    } catch (error) {
      logger.error('Erro ao servir arquivo estático', {
        path: req.path,
        error: error.message
      });
      next(error);
    }
  };
};