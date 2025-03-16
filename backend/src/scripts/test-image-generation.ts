/**
 * Script para testar a otimização de imagens
 * 
 * Uso: npm run test:image
 */

import { imageOptimizer } from '../services/imageOptimizer';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import axios from 'axios';

// URLs de teste para imagens de diferentes tamanhos
const TEST_IMAGES = [
  'https://images.unsplash.com/photo-1682687982501-1e58ab814714', // Imagem grande
  'https://images.unsplash.com/photo-1682687982501-1e58ab814714?w=800&q=80', // Imagem média
  'https://images.unsplash.com/photo-1682687982501-1e58ab814714?w=400&q=70', // Imagem pequena
];

async function downloadTestImage(url: string, outputPath: string): Promise<string> {
  try {
    logger.info(`Baixando imagem de teste: ${url.substring(0, 50)}...`);
    
    const response = await axios.get(url, { 
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    // Verifica se o diretório existe
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Salva a imagem
    fs.writeFileSync(outputPath, response.data);
    
    const fileSize = fs.statSync(outputPath).size;
    logger.info(`Imagem baixada: ${Math.round(fileSize / 1024)}KB`, {
      url: url.substring(0, 50) + '...',
      outputPath,
      size: Math.round(fileSize / 1024) + 'KB'
    });
    
    return outputPath;
  } catch (error) {
    logger.error(`Erro ao baixar imagem de teste: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    throw error;
  }
}

async function testImageOptimization() {
  try {
    logger.info('Iniciando teste de otimização de imagens');
    
    // Cria diretório de teste
    const testDir = path.join(__dirname, '../../temp/test-images');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Baixa e otimiza cada imagem de teste
    for (let i = 0; i < TEST_IMAGES.length; i++) {
      const url = TEST_IMAGES[i];
      const originalPath = path.join(testDir, `original_${i}.jpg`);
      
      try {
        // Baixa a imagem
        await downloadTestImage(url, originalPath);
        
        // Verifica se a imagem é válida
        const isValid = await imageOptimizer.isValidImage(originalPath);
        logger.info(`Imagem ${i} é válida: ${isValid}`);
        
        if (isValid) {
          // Testa diferentes níveis de otimização
          const optimizationLevels = [
            { name: 'leve', options: { width: 500, height: 500, quality: 70 } },
            { name: 'média', options: { width: 400, height: 400, quality: 65 } },
            { name: 'agressiva', options: { width: 350, height: 350, quality: 55 } }
          ];
          
          for (const level of optimizationLevels) {
            const optimizedPath = path.join(testDir, `optimized_${i}_${level.name}.jpg`);
            
            try {
              // Otimiza a imagem
              await imageOptimizer.optimizeImage(
                originalPath,
                optimizedPath,
                level.options
              );
              
              // Verifica o tamanho da imagem otimizada
              const originalSize = fs.statSync(originalPath).size;
              const optimizedSize = fs.statSync(optimizedPath).size;
              const reduction = Math.round((1 - optimizedSize / originalSize) * 100);
              
              logger.info(`Otimização ${level.name} para imagem ${i}: ${Math.round(originalSize / 1024)}KB → ${Math.round(optimizedSize / 1024)}KB (${reduction}% redução)`, {
                level: level.name,
                originalSize: Math.round(originalSize / 1024) + 'KB',
                optimizedSize: Math.round(optimizedSize / 1024) + 'KB',
                reduction: reduction + '%'
              });
            } catch (optimizeError) {
              logger.error(`Erro na otimização ${level.name} para imagem ${i}: ${optimizeError instanceof Error ? optimizeError.message : 'Erro desconhecido'}`);
            }
          }
        }
      } catch (imageError) {
        logger.error(`Erro ao processar imagem ${i}: ${imageError instanceof Error ? imageError.message : 'Erro desconhecido'}`);
      }
    }
    
    // Testa a criação de imagem de fallback
    try {
      const fallbackPath = path.join(testDir, 'fallback.jpg');
      await imageOptimizer.createFallbackImage(fallbackPath);
      
      const fallbackSize = fs.statSync(fallbackPath).size;
      logger.info(`Imagem de fallback criada: ${Math.round(fallbackSize / 1024)}KB`, {
        path: fallbackPath,
        size: Math.round(fallbackSize / 1024) + 'KB'
      });
    } catch (fallbackError) {
      logger.error(`Erro ao criar imagem de fallback: ${fallbackError instanceof Error ? fallbackError.message : 'Erro desconhecido'}`);
    }
    
    // Testa a limpeza de arquivos temporários
    try {
      await imageOptimizer.cleanupTempFiles(testDir, 0); // Limpa todos os arquivos (0 horas)
      logger.info('Teste de limpeza de arquivos temporários concluído');
    } catch (cleanupError) {
      logger.error(`Erro ao limpar arquivos temporários: ${cleanupError instanceof Error ? cleanupError.message : 'Erro desconhecido'}`);
    }
    
    logger.info('Teste de otimização de imagens concluído com sucesso');
  } catch (error) {
    logger.error(`Erro no teste de otimização de imagens: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

// Executa o teste
testImageOptimization().catch(error => {
  logger.error(`Erro fatal no teste: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  process.exit(1);
});