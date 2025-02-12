import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import path from 'path';
import routes from './routes';
import logger from './config/logger';

const app = express();

// Middlewares
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos
app.use('/public', express.static(path.join(__dirname, '..', 'public')));

// Rotas
app.use('/api', routes);

// Conexão com MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kids-book-creator')
  .then(() => {
    logger.info('Conectado ao MongoDB');
  })
  .catch((error) => {
    logger.error('Erro ao conectar ao MongoDB:', error);
    process.exit(1);
  });

// Tratamento de erros
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(err.stack);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Servidor rodando na porta ${PORT}`);
});