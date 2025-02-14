import { Request, Response, NextFunction } from 'express';
import { MongoClient } from 'mongodb';
import { config } from '../config';
import { logger } from '../utils/logger';

let client: MongoClient;

export const connectToDatabase = async () => {
  try {
    client = new MongoClient(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 50
    });
    await client.connect();
    logger.info('Conectado ao MongoDB com sucesso');
    return client.db();
  } catch (error) {
    logger.error('Erro ao conectar ao MongoDB', error);
    throw error;
  }
};

export const databaseMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!client?.topology?.isConnected()) {
      await connectToDatabase();
    }
    req.db = client.db();
    next();
  } catch (error) {
    logger.error('Erro no middleware do banco de dados', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};