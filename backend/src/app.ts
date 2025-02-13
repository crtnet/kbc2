import express from 'express';
import cors from 'cors';
import path from 'path';
import mongoose from 'mongoose';
import { config } from './config';
import bookRoutes from './routes/bookRoutes';
import authRoutes from './routes/auth.routes';

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
    
    // Servir arquivos estáticos da pasta public
    this.express.use('/public', express.static(path.join(__dirname, '../public')));
    // Alias específico para PDFs para manter compatibilidade
    this.express.use('/pdfs', express.static(path.join(__dirname, '../public/pdfs')));
  }

  private database(): void {
    mongoose.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as mongoose.ConnectOptions);
  }

  private routes(): void {
    this.express.use('/api/books', bookRoutes);
    this.express.use('/api/auth', authRoutes);
  }
}

export default new App().express;