import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import { config } from './config';

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
    if (!config.mongoUri) {
      throw new Error('MONGODB_URI não está configurada');
    }

    // Valida a URI do MongoDB
    if (!validateMongoUri(config.mongoUri)) {
      throw new Error('MONGODB_URI inválida. Formato esperado: mongodb(+srv)://...');
    }

    logger.info('Iniciando conexão com MongoDB');
    
    // Limpa listeners anteriores para evitar duplicação
    mongoose.connection.removeAllListeners();
    
    // Configura listeners de eventos
    mongoose.connection.on('error', (error) => {
      logger.error('Erro na conexão com MongoDB:', { 
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Desconectado do MongoDB');
    });

    mongoose.connection.on('connected', () => {
      logger.info('Conectado ao MongoDB');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('Reconectado ao MongoDB');
    });

    // Desconecta se já houver uma conexão
    if (mongoose.connection.readyState !== 0) {
      try {
        await mongoose.disconnect();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Espera 1 segundo após desconexão
      } catch (disconnectError) {
        logger.warn('Erro ao desconectar banco de dados anterior', { 
          error: disconnectError instanceof Error ? disconnectError.message : 'Erro desconhecido' 
        });
      }
    }
    
    // Adiciona listeners de eventos antes de conectar
    mongoose.connection.on('error', (error) => {
      logger.error('Erro na conexão com MongoDB:', { 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        name: error instanceof Error ? error.name : 'Erro sem nome'
      });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Desconectado do MongoDB');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('Reconectado ao MongoDB');
    });

    // Conecta com tratamento de erros detalhado e retentativas
    while (connectionRetries < MAX_RETRIES) {
      try {
        // Tenta estabelecer a conexão
        await mongoose.connect(config.mongoUri, mongooseOptions);
        
        // Verifica se a conexão está realmente estabelecida
        if (mongoose.connection.readyState !== 1) {
          throw new Error('Conexão não estabelecida completamente');
        }
        
        // Verifica a conexão com ping
        await Promise.race([
          mongoose.connection.db.admin().ping(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout na verificação do banco')), 20000)
          )
        ]);

        // Se chegou aqui, a conexão foi bem sucedida
        logger.info('Conexão com MongoDB estabelecida e verificada com sucesso');
        connectionRetries = 0; // Reset do contador de tentativas
        return mongoose.connection;
      } catch (error) {
        connectionRetries++;
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        
        // Tenta desconectar em caso de erro para limpar o estado
        try {
          await mongoose.disconnect();
        } catch (disconnectError) {
          logger.warn('Erro ao limpar conexão após falha', {
            error: disconnectError instanceof Error ? disconnectError.message : 'Erro desconhecido'
          });
        }

        if (connectionRetries < MAX_RETRIES) {
          logger.warn(`Tentativa ${connectionRetries} de ${MAX_RETRIES} falhou. Tentando novamente em ${RETRY_DELAY/1000} segundos...`, {
            error: errorMessage
          });
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        } else {
          logger.error('Todas as tentativas de conexão falharam', {
            error: errorMessage,
            attempts: MAX_RETRIES
          });
          throw new Error(`Falha na conexão com o MongoDB após ${MAX_RETRIES} tentativas: ${errorMessage}`);
        }
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    const errorName = error instanceof Error ? error.name : 'Erro sem nome';
    
    logger.error('Erro ao conectar com MongoDB:', { 
      error: errorMessage,
      name: errorName,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    throw new Error(`Falha na conexão com o MongoDB: ${errorMessage}`);
  }
};

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