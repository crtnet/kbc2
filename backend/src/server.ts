// src/server.ts

import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { connectDatabase } from './config/database';
import { ensureFallbackImages } from './utils/ensureFallbackImages';

const PORT = config.port || 3000;

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