import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import bookRoutes from './routes/books.routes';
import authRoutes from './routes/auth.routes';
import avatarRoutes from './routes/avatarRoutes';
import { logger } from './utils/logger';
import { databaseMiddleware } from './middleware/databaseMiddleware';
import { connectDatabase } from './config/database';

class App {
  public express: express.Application;

  constructor() {
    this.express = express();
    this.middlewares();
    this.database();
    this.routes();
    this.errorHandling();
  }

  private middlewares(): void {
    this.express.use(express.json());
    this.express.use(cors());
    
    // Middleware para adicionar conexão do banco de dados ao request
    this.express.use(databaseMiddleware);

    // Servir arquivos estáticos da pasta public
    this.express.use('/public', express.static(path.join(__dirname, '../public')));
    
    // Alias específico para PDFs para manter compatibilidade
    this.express.use('/pdfs', express.static(path.join(__dirname, '../public/pdfs'), {
      setHeaders: (res, filePath) => {
        // Adiciona headers de segurança para PDFs
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Type', 'application/pdf');
      }
    }));
  }

  private async database(): Promise<void> {
    try {
      // Tenta conectar ao banco de dados
      await connectDatabase();
      logger.info('Conexão com o banco de dados estabelecida');
    } catch (error) {
      logger.error('Erro ao conectar com o banco de dados:', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });
      // Não finaliza o processo, permite que o servidor continue tentando reconectar
    }
  }

  private routes(): void {
    this.express.use('/api/books', bookRoutes);
    this.express.use('/api/auth', authRoutes);
    this.express.use('/api/avatars', avatarRoutes);
  }

  private errorHandling(): void {
    // Tratamento para rotas não encontradas
    this.express.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.status(404).json({
        error: 'Rota não encontrada',
        path: req.path
      });
    });

    // Tratamento de erros global
    this.express.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Erro não tratado', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        body: req.body,
        method: req.method
      });

      const errorResponse = {
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'production' ? 'Ocorreu um erro' : err.message,
        stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
      };

      res.status(500).json(errorResponse);
    });
  }
}

export default new App().express;