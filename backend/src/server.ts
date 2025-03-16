// src/server.ts

import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { connectDatabase } from './config/database';
import { ensureFallbackImages } from './utils/ensureFallbackImages';
import { createServer } from 'http';
import { Server } from 'socket.io';

const PORT = config.port || 3000;

// Cria o servidor HTTP
const httpServer = createServer(app);

// Inicializa o Socket.IO
export const io = new Server(httpServer, {
  cors: {
    origin: '*', // Em produção, restrinja para origens específicas
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'], // Suporta websocket e polling como fallback
  pingTimeout: 30000, // 30 segundos
  pingInterval: 10000, // 10 segundos
  connectTimeout: 30000, // 30 segundos
  allowEIO3: true, // Compatibilidade com clientes mais antigos
});

// Middleware para logging de conexões
io.use((socket, next) => {
  logger.info('Tentativa de conexão Socket.IO', { 
    socketId: socket.id,
    transport: socket.conn.transport.name,
    address: socket.handshake.address,
    userAgent: socket.handshake.headers['user-agent']
  });
  next();
});

// Configuração do Socket.IO
io.on('connection', (socket) => {
  logger.info('Novo cliente conectado', { 
    socketId: socket.id,
    transport: socket.conn.transport.name
  });
  
  // Quando o cliente se identifica com seu userId
  socket.on('authenticate', (userId) => {
    if (userId) {
      // Adiciona o socket à sala específica do usuário
      socket.join(userId);
      logger.info('Cliente autenticado', { socketId: socket.id, userId });
      
      // Envia confirmação de autenticação para o cliente
      socket.emit('authenticated', { success: true, userId });
    } else {
      logger.warn('Tentativa de autenticação sem userId', { socketId: socket.id });
      socket.emit('authenticated', { success: false, error: 'ID de usuário inválido' });
    }
  });
  
  // Evento de ping para manter a conexão ativa
  socket.on('ping', (callback) => {
    if (typeof callback === 'function') {
      callback({ time: new Date().toISOString() });
    }
  });
  
  socket.on('disconnect', (reason) => {
    logger.info('Cliente desconectado', { socketId: socket.id, reason });
  });
  
  socket.on('error', (error) => {
    logger.error('Erro no socket', { socketId: socket.id, error });
  });
});

async function startServer() {
  try {
    // Conecta ao banco de dados antes de iniciar o servidor
    await connectDatabase();

    // Garante que as imagens de fallback existam
    try {
      await ensureFallbackImages();
      logger.info('Imagens de fallback verificadas e criadas com sucesso');
    } catch (fallbackError) {
      logger.warn('Erro ao criar imagens de fallback, continuando inicialização', {
        error: fallbackError instanceof Error ? fallbackError.message : 'Erro desconhecido'
      });
    }

    // Inicia o servidor HTTP com Socket.IO
    httpServer.listen(PORT, () => {
      logger.info(`Servidor rodando na porta ${PORT} com suporte a WebSocket`);
    });
  } catch (error) {
    logger.error('Falha ao iniciar o servidor:', {
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
    process.exit(1); // Encerra o processo com código de erro
  }
}

// Tratamento de erros no Socket.IO
io.engine.on('connection_error', (err) => {
  logger.error('Erro de conexão no Socket.IO Engine', {
    code: err.code,
    message: err.message,
    context: err.context
  });
});

startServer();