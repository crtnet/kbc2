import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import bookRoutes from './routes/bookRoutes';
import authRoutes from './routes/auth.routes';
import { logger } from './utils/logger';
import { databaseMiddleware, connectToDatabase } from './middleware/databaseMiddleware';

class App {
  public express: express.Application;

  constructor() {
    this.express = express();
    this.middlewares();
    this.database();
    this.routes();
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

    // Tratamento de erros global
    this.express.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Erro não tratado', {
        message: err.message,
        stack: err.stack,
        path: req.path
      });

      res.status(500).json({
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'production' ? 'Ocorreu um erro' : err.message
      });
    });
  }

  private async database(): Promise<void> {
    try {
      await connectToDatabase();
      logger.info('Conexão com o banco de dados estabelecida');
    } catch (error) {
      logger.error('Erro ao conectar com o banco de dados', error);
      process.exit(1);
    }
  }

  private routes(): void {
    this.express.use('/api/books', bookRoutes);
    this.express.use('/api/auth', authRoutes);
  }
}

export default new App().express;