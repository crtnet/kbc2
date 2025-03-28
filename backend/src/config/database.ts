import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';
import { config } from './config';

dotenv.config();

// Configuração do mongoose
mongoose.set('strictQuery', true);

// Função para validar a URI do MongoDB
const validateMongoUri = (uri: string): boolean => {
  const mongoUrlPattern = /^mongodb(\+srv)?:\/\/.+/;
  return mongoUrlPattern.test(uri);
};

const mongooseOptions = {
  autoIndex: true,
  serverSelectionTimeoutMS: 60000,  // Aumentado para 60 segundos
  socketTimeoutMS: 60000,           // Aumentado para 60 segundos
  connectTimeoutMS: 60000,          // Aumentado para 60 segundos
  heartbeatFrequencyMS: 30000,      // Frequência de heartbeat
  family: 4,
  maxPoolSize: 10,
  minPoolSize: 1,                   // Garante pelo menos uma conexão
  retryWrites: true,
  retryReads: true,
  w: 'majority',
  useNewUrlParser: true,
  useUnifiedTopology: true,
  keepAlive: true,                  // Mantém a conexão viva
  keepAliveInitialDelay: 300000,    // 5 minutos
};

let connectionRetries = 0;
const MAX_RETRIES = 5;
const RETRY_DELAY = 10000; // 10 segundos

export const connectDatabase = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/kbc2';
    
    await mongoose.connect(uri);
    console.log('Conectado ao MongoDB');
  } catch (error) {
    console.error('Erro ao conectar ao MongoDB:', error);
    process.exit(1);
  }
};

mongoose.connection.on('error', (error) => {
  console.error('Erro na conexão com o MongoDB:', error);
});

mongoose.connection.on('disconnected', () => {
  console.log('Desconectado do MongoDB');
});

process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('Conexão com o MongoDB fechada');
    process.exit(0);
  } catch (error) {
    console.error('Erro ao fechar conexão com o MongoDB:', error);
    process.exit(1);
  }
});

// Função para verificar o estado da conexão
export const checkDatabaseConnection = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      logger.warn('Estado da conexão não é conectado', { 
        readyState: mongoose.connection.readyState 
      });
      return false;
    }
    
    // Verifica a conexão com timeout
    await Promise.race([
      mongoose.connection.db.admin().ping(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout na verificação do banco')), 3000)
      )
    ]);

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error('Erro na verificação da conexão:', { 
      error: errorMessage,
      name: error instanceof Error ? error.name : 'Erro sem nome'
    });
    return false;
  }
};