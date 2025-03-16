// src/utils/ensureFallbackImages.ts
import fs from 'fs';
import path from 'path';
import { logger } from './logger';
import { imageOptimizer } from '../services/imageOptimizer';

/**
 * Garante que as imagens de fallback existam no sistema
 */
export async function ensureFallbackImages(): Promise<void> {
  try {
    // Diretório para imagens de fallback
    const fallbackDir = path.join(__dirname, '../../public/assets/images');
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true });
    }
    
    // Cria a imagem de fallback principal
    const fallbackImagePath = path.join(fallbackDir, 'fallback-page.jpg');
    if (!fs.existsSync(fallbackImagePath) || fs.statSync(fallbackImagePath).size === 0) {
      await imageOptimizer.createFallbackImage(fallbackImagePath);
      logger.info('Imagem de fallback principal criada com sucesso', { fallbackImagePath });
    }
    
    // Cria uma imagem de fallback para cada página (1-5)
    for (let i = 1; i <= 5; i++) {
      const pageFallbackPath = path.join(fallbackDir, `fallback-page-${i}.jpg`);
      if (!fs.existsSync(pageFallbackPath) || fs.statSync(pageFallbackPath).size === 0) {
        await imageOptimizer.createFallbackImage(pageFallbackPath, {
          text: `Página ${i} - Imagem não disponível`,
          width: 400,
          height: 400
        });
        logger.info(`Imagem de fallback para página ${i} criada com sucesso`, { pageFallbackPath });
      }
    }
    
    // Cria uma imagem de placeholder para carregamento
    const loadingPlaceholderPath = path.join(fallbackDir, 'loading-placeholder.jpg');
    if (!fs.existsSync(loadingPlaceholderPath) || fs.statSync(loadingPlaceholderPath).size === 0) {
      await imageOptimizer.createFallbackImage(loadingPlaceholderPath, {
        text: 'Carregando imagem...',
        width: 400,
        height: 400,
        backgroundColor: '#f0f8ff'
      });
      logger.info('Imagem de placeholder de carregamento criada com sucesso', { loadingPlaceholderPath });
    }
    
    logger.info('Todas as imagens de fallback foram verificadas e criadas com sucesso');
  } catch (error) {
    logger.error('Erro ao criar imagens de fallback', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}