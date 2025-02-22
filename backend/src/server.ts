// src/server.ts

import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { connectDatabase } from './config/database';

const PORT = config.port || 3000;

async function startServer() {
  try {
    // Conecta ao banco de dados antes de iniciar o servidor
    await connectDatabase();

    app.listen(PORT, () => {
      logger.info(`Servidor rodando na porta ${PORT}`);
    });
  } catch (error) {
    logger.error('Falha ao iniciar o servidor:', {
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
    process.exit(1); // Encerra o processo com código de erro
  }
}

startServer();