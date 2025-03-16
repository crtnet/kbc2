// src/services/imageOptimizer.ts
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { performance } from 'perf_hooks';
import sizeOf from 'image-size';

/**
 * Serviço para otimização de imagens usando Sharp
 */
class ImageOptimizer {
  /**
   * Cria uma imagem de fallback simples para usar quando uma imagem não puder ser processada
   * @param outputPath Caminho para salvar a imagem de fallback
   * @param options Opções para personalizar a imagem de fallback
   * @returns Caminho da imagem de fallback
   */
  public async createFallbackImage(
    outputPath: string, 
    options?: {
      text?: string;
      width?: number;
      height?: number;
      backgroundColor?: string;
    }
  ): Promise<string> {
    try {
      // Verifica se o diretório de saída existe
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Configura as opções com valores padrão
      const width = options?.width || 500;
      const height = options?.height || 400;
      const text = options?.text || 'Imagem não disponível';
      const backgroundColor = options?.backgroundColor || '#f0f0f0';
      
      // Cria um SVG simples com texto
      const svgBuffer = Buffer.from(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="${backgroundColor}"/>
          <rect x="10" y="10" width="${width-20}" height="${height-20}" fill="none" stroke="#cccccc" stroke-width="2"/>
          <text x="50%" y="45%" font-family="Arial" font-size="24" fill="#666666" text-anchor="middle">${text}</text>
          <text x="50%" y="55%" font-family="Arial" font-size="16" fill="#999999" text-anchor="middle">Erro ao processar imagem</text>
        </svg>
      `);
      
      // Converte o SVG para JPEG
      const buffer = await sharp(svgBuffer)
        .jpeg({ quality: 90 })
        .toBuffer();
      
      // Salva a imagem
      fs.writeFileSync(outputPath, buffer);
      
      logger.info(`Imagem de fallback criada com sucesso: ${outputPath}`);
      return outputPath;
    } catch (error) {
      logger.error(`Erro ao criar imagem de fallback: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      throw error;
    }
  }

  /**
   * Otimiza uma imagem para uso no PDF
   * @param inputPath Caminho da imagem de entrada
   * @param outputPath Caminho para salvar a imagem otimizada
   * @param options Opções de otimização
   * @returns Caminho da imagem otimizada
   */
  public async optimizeImage(
    inputPath: string,
    outputPath?: string,
    options?: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'jpeg' | 'png' | 'webp';
    }
  ): Promise<string> {
    const startTime = performance.now();
    let memoryBefore: NodeJS.MemoryUsage | null = null;
    
    try {
      // Registra uso de memória antes do processamento
      memoryBefore = process.memoryUsage();
      logger.info(`Iniciando otimização de imagem: ${path.basename(inputPath)}`, {
        memoryUsage: {
          rss: Math.round(memoryBefore.rss / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memoryBefore.heapTotal / 1024 / 1024) + 'MB',
          heapUsed: Math.round(memoryBefore.heapUsed / 1024 / 1024) + 'MB'
        }
      });
      
      // Se não for fornecido um caminho de saída, usa o mesmo da entrada
      const finalOutputPath = outputPath || inputPath;
      
      // Garante que o caminho de saída termine com .jpg para consistência
      const outputPathWithExt = finalOutputPath.endsWith('.jpg') 
        ? finalOutputPath 
        : finalOutputPath.replace(/\.[^/.]+$/, '') + '.jpg';
      
      // Verifica se o diretório de saída existe
      const outputDir = path.dirname(outputPathWithExt);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Configura as opções padrão com valores mais conservadores
      // Reduzindo as dimensões máximas para 400x400 para melhor compatibilidade
      const width = options?.width || 400;
      const height = options?.height || 400;
      // Reduzindo a qualidade padrão para 70% para arquivos menores
      const quality = options?.quality || 70;
      // Sempre usar JPEG para maior compatibilidade com PDFKit
      const format = 'jpeg';
      
      // Lê a imagem de entrada
      const inputBuffer = fs.readFileSync(inputPath);
      
      // Verifica se a imagem é muito grande antes de processar
      if (inputBuffer.length > 5 * 1024 * 1024) { // Mais de 5MB
        logger.warn(`Imagem extremamente grande (${Math.round(inputBuffer.length / 1024 / 1024)}MB), aplicando otimização muito agressiva`, {
          path: path.basename(inputPath)
        });
        
        // Para imagens muito grandes, usa uma abordagem mais direta e agressiva
        try {
          const veryReducedBuffer = await sharp(inputBuffer, { 
            failOnError: false,
            limitInputPixels: 100000000 // Aumenta limite para imagens muito grandes
          })
            .resize(250, 250, { fit: 'inside' })
            .jpeg({ 
              quality: 50, 
              progressive: true,
              mozjpeg: true
            })
            .toBuffer();
          
          fs.writeFileSync(finalOutputPath, veryReducedBuffer);
          
          const reduction = Math.round((1 - veryReducedBuffer.length / inputBuffer.length) * 100);
          logger.info(`Imagem muito grande otimizada com abordagem agressiva: ${path.basename(inputPath)}`, {
            originalSize: Math.round(inputBuffer.length / 1024 / 1024) + 'MB',
            optimizedSize: Math.round(veryReducedBuffer.length / 1024) + 'KB',
            reduction: `${reduction}%`
          });
          
          return finalOutputPath;
        } catch (largeImageError) {
          logger.error(`Erro ao processar imagem muito grande, tentando abordagem alternativa: ${path.basename(inputPath)}`, {
            error: largeImageError instanceof Error ? largeImageError.message : 'Erro desconhecido'
          });
          // Continua com a abordagem padrão em caso de erro
        }
      }
      
      try {
        // Obtém informações da imagem original
        const metadata = await sharp(inputBuffer, { failOnError: false }).metadata();
        
        logger.info(`Metadados da imagem original: ${path.basename(inputPath)}`, {
          format: metadata.format,
          width: metadata.width,
          height: metadata.height,
          size: `${Math.round(inputBuffer.length / 1024)}KB`
        });
        
        // Ajusta as dimensões com base no tamanho original da imagem
        let targetWidth = width;
        let targetHeight = height;
        
        // Para imagens muito grandes, reduz ainda mais as dimensões
        if (metadata.width && metadata.height) {
          const pixelCount = metadata.width * metadata.height;
          if (pixelCount > 4000000) { // Mais de 4 megapixels
            targetWidth = Math.min(width, 250);
            targetHeight = Math.min(height, 250);
            logger.info(`Imagem com muitos pixels (${pixelCount}), reduzindo dimensões para ${targetWidth}x${targetHeight}`);
          }
        }
        
        // Configura o pipeline de processamento com tratamento de erros aprimorado
        let pipeline = sharp(inputBuffer, { 
          failOnError: false,
          limitInputPixels: 100000000 // Aumenta o limite de pixels para imagens grandes
        });
        
        // Primeiro redimensiona a imagem
        pipeline = pipeline.resize({
          width: targetWidth,
          height: targetHeight,
          fit: 'inside',
          withoutEnlargement: true
        });
        
        // Converte para JPEG com qualidade reduzida
        // Garante que a imagem seja convertida para JPEG independentemente do formato de entrada
        pipeline = pipeline.toFormat('jpeg', { 
          quality, 
          progressive: true,
          // Otimizações adicionais para JPEG
          trellisQuantisation: true,
          overshootDeringing: true,
          optimizeScans: true,
          mozjpeg: true // Usar mozjpeg para melhor compressão
        });
        
        // Processa e salva a imagem
        const outputBuffer = await pipeline.toBuffer();
        fs.writeFileSync(finalOutputPath, outputBuffer);
        
        // Calcula a redução de tamanho
        const originalSize = inputBuffer.length;
        const optimizedSize = outputBuffer.length;
        const reduction = Math.round((1 - optimizedSize / originalSize) * 100);
        
        // Registra uso de memória após o processamento
        const memoryAfter = process.memoryUsage();
        const duration = performance.now() - startTime;
        
        logger.info(`Imagem otimizada com sucesso: ${path.basename(inputPath)}`, {
          originalSize: Math.round(originalSize / 1024) + 'KB',
          optimizedSize: Math.round(optimizedSize / 1024) + 'KB',
          reduction: `${reduction}%`,
          duration: Math.round(duration) + 'ms',
          dimensions: `${targetWidth}x${targetHeight}`,
          memoryUsage: {
            rss: Math.round(memoryAfter.rss / 1024 / 1024) + 'MB',
            heapTotal: Math.round(memoryAfter.heapTotal / 1024 / 1024) + 'MB',
            heapUsed: Math.round(memoryAfter.heapUsed / 1024 / 1024) + 'MB',
            change: {
              rss: Math.round((memoryAfter.rss - memoryBefore.rss) / 1024 / 1024) + 'MB',
              heapUsed: Math.round((memoryAfter.heapUsed - memoryBefore.heapUsed) / 1024 / 1024) + 'MB'
            }
          }
        });
        
        // Verifica se a imagem otimizada é muito grande (mais de 300KB)
        // Reduzimos o limite de 500KB para 300KB para garantir que as imagens sejam menores
        if (outputBuffer.length > 300 * 1024) {
          logger.warn(`Imagem otimizada ainda é grande (${Math.round(outputBuffer.length / 1024)}KB), tentando reduzir mais`, {
            path: finalOutputPath
          });
          
          // Tenta reduzir ainda mais
          const extraReducedBuffer = await sharp(outputBuffer, { failOnError: false })
            .resize({
              width: Math.round(targetWidth * 0.7), // 70% do tamanho anterior
              height: Math.round(targetHeight * 0.7),
              fit: 'inside'
            })
            .jpeg({ 
              quality: Math.max(quality - 15, 45), // Reduz qualidade, mas não abaixo de 45
              progressive: true,
              trellisQuantisation: true,
              overshootDeringing: true,
              optimizeScans: true,
              mozjpeg: true
            })
            .toBuffer();
          
          fs.writeFileSync(finalOutputPath, extraReducedBuffer);
          
          logger.info(`Imagem reduzida adicionalmente: ${path.basename(finalOutputPath)}`, {
            originalSize: Math.round(outputBuffer.length / 1024) + 'KB',
            reducedSize: Math.round(extraReducedBuffer.length / 1024) + 'KB',
            additionalReduction: `${Math.round((1 - extraReducedBuffer.length / outputBuffer.length) * 100)}%`,
            dimensions: `${Math.round(targetWidth * 0.7)}x${Math.round(targetHeight * 0.7)}`
          });
          
          // Se ainda estiver acima de 150KB, tenta uma redução final mais agressiva
          // Reduzimos o limite de 200KB para 150KB
          if (extraReducedBuffer.length > 150 * 1024) {
            logger.warn(`Imagem ainda grande após segunda otimização (${Math.round(extraReducedBuffer.length / 1024)}KB), aplicando redução final`, {
              path: finalOutputPath
            });
            
            const finalReducedBuffer = await sharp(extraReducedBuffer, { failOnError: false })
              .resize({
                width: Math.round(targetWidth * 0.5), // 50% do tamanho original
                height: Math.round(targetHeight * 0.5),
                fit: 'inside'
              })
              .grayscale(false) // Remover se não quiser converter para escala de cinza
              .jpeg({ 
                quality: 40, // Qualidade muito reduzida
                progressive: true,
                trellisQuantisation: true,
                overshootDeringing: true,
                optimizeScans: true,
                mozjpeg: true
              })
              .toBuffer();
            
            fs.writeFileSync(finalOutputPath, finalReducedBuffer);
            
            logger.info(`Imagem reduzida com otimização final: ${path.basename(finalOutputPath)}`, {
              originalSize: Math.round(extraReducedBuffer.length / 1024) + 'KB',
              finalSize: Math.round(finalReducedBuffer.length / 1024) + 'KB',
              totalReduction: `${Math.round((1 - finalReducedBuffer.length / originalSize) * 100)}%`,
              dimensions: `${Math.round(targetWidth * 0.5)}x${Math.round(targetHeight * 0.5)}`
            });
          }
        }
        
        // Verifica se a imagem final é válida
        try {
          const finalStats = fs.statSync(finalOutputPath);
          const finalMetadata = await sharp(finalOutputPath, { failOnError: false }).metadata();
          
          logger.info(`Verificação final da imagem otimizada: ${path.basename(finalOutputPath)}`, {
            size: Math.round(finalStats.size / 1024) + 'KB',
            dimensions: finalMetadata.width && finalMetadata.height ? 
              `${finalMetadata.width}x${finalMetadata.height}` : 'Desconhecido',
            format: finalMetadata.format || 'Desconhecido'
          });
        } catch (verifyError) {
          logger.warn(`Não foi possível verificar a imagem final: ${path.basename(finalOutputPath)}`, {
            error: verifyError instanceof Error ? verifyError.message : 'Erro desconhecido'
          });
        }
      } catch (metadataError) {
        logger.warn(`Não foi possível obter metadados da imagem: ${path.basename(inputPath)}`, {
          error: metadataError instanceof Error ? metadataError.message : 'Erro desconhecido'
        });
        
        // Tenta processar mesmo sem metadados
        try {
          const simpleBuffer = await sharp(inputBuffer, { 
            failOnError: false,
            limitInputPixels: 100000000
          })
            .resize(width, height, { fit: 'inside' })
            .jpeg({ quality, progressive: true, mozjpeg: true })
            .toBuffer();
          
          fs.writeFileSync(finalOutputPath, simpleBuffer);
          
          logger.info(`Imagem otimizada sem metadados: ${path.basename(finalOutputPath)}`, {
            originalSize: Math.round(inputBuffer.length / 1024) + 'KB',
            optimizedSize: Math.round(simpleBuffer.length / 1024) + 'KB'
          });
        } catch (processError) {
          throw processError; // Propaga o erro para ser tratado no bloco catch externo
        }
      }
      
      // Libera memória explicitamente
      global.gc && global.gc();
      
      return finalOutputPath;
    } catch (error) {
      logger.error(`Erro ao otimizar imagem: ${path.basename(inputPath || 'unknown')}`, {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined,
        duration: Math.round(performance.now() - startTime) + 'ms'
      });
      
      // Tenta uma abordagem mais simples em caso de erro
      try {
        logger.info(`Tentando abordagem alternativa para otimizar: ${path.basename(inputPath)}`);
        
        const finalOutputPath = outputPath || inputPath;
        const inputBuffer = fs.readFileSync(inputPath);
        
        // Usa configurações mais simples e robustas
        const simpleBuffer = await sharp(inputBuffer, { 
          failOnError: false,
          limitInputPixels: 100000000
        })
          .resize(250, 250, { fit: 'inside' }) // Dimensões ainda menores
          .jpeg({ quality: 50 }) // Qualidade mais baixa
          .toBuffer();
        
        fs.writeFileSync(finalOutputPath, simpleBuffer);
        logger.info(`Otimização alternativa bem-sucedida: ${path.basename(finalOutputPath)}`, {
          originalSize: Math.round(inputBuffer.length / 1024) + 'KB',
          optimizedSize: Math.round(simpleBuffer.length / 1024) + 'KB'
        });
        
        return finalOutputPath;
      } catch (fallbackError) {
        logger.error(`Falha também na abordagem alternativa: ${fallbackError instanceof Error ? fallbackError.message : 'Erro desconhecido'}`);
        
        // Tenta uma abordagem ainda mais simples
        try {
          logger.info(`Tentando abordagem de último recurso para: ${path.basename(inputPath)}`);
          
          const finalOutputPath = outputPath || inputPath;
          const inputBuffer = fs.readFileSync(inputPath);
          
          // Configurações mínimas
          const lastResortBuffer = await sharp(inputBuffer, { 
            failOnError: false,
            limitInputPixels: 100000000
          })
            .resize(200, 200, { fit: 'inside' }) // Dimensões muito pequenas
            .jpeg({ quality: 40 }) // Qualidade muito baixa
            .toBuffer();
          
          fs.writeFileSync(finalOutputPath, lastResortBuffer);
          logger.info(`Otimização de último recurso bem-sucedida: ${path.basename(finalOutputPath)}`, {
            originalSize: Math.round(inputBuffer.length / 1024) + 'KB',
            optimizedSize: Math.round(lastResortBuffer.length / 1024) + 'KB'
          });
          
          return finalOutputPath;
        } catch (lastResortError) {
          logger.error(`Falha em todas as abordagens de otimização: ${lastResortError instanceof Error ? lastResortError.message : 'Erro desconhecido'}`);
          
          // Tenta criar uma imagem de fallback
          try {
            const fallbackPath = outputPath || (inputPath + '.fallback.jpg');
            await this.createFallbackImage(fallbackPath);
            return fallbackPath;
          } catch (fallbackImageError) {
            logger.error(`Não foi possível criar imagem de fallback: ${fallbackImageError instanceof Error ? fallbackImageError.message : 'Erro desconhecido'}`);
            // Em caso de erro em todas as abordagens, retorna o caminho original
            return inputPath;
          }
        }
      }
    }
  }
  
  /**
   * Otimiza todas as imagens para o PDF de um livro
   * @param bookId ID do livro
   * @param imagePaths Lista de caminhos de imagens
   * @returns Lista de caminhos de imagens otimizadas
   */
  public async optimizeImagesForBook(bookId: string, imagePaths: string[]): Promise<string[]> {
    const optimizedPaths: string[] = [];
    const tempDir = path.join(__dirname, '../../temp', bookId);
    const startTime = performance.now();
    
    // Cria o diretório temporário se não existir
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Registra uso de memória antes do processamento
    const memoryBefore = process.memoryUsage();
    logger.info(`Iniciando otimização de ${imagePaths.length} imagens para o livro ${bookId}`, {
      bookId,
      imageCount: imagePaths.length,
      memoryUsage: {
        rss: Math.round(memoryBefore.rss / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memoryBefore.heapTotal / 1024 / 1024) + 'MB',
        heapUsed: Math.round(memoryBefore.heapUsed / 1024 / 1024) + 'MB'
      }
    });
    
    // Processa as imagens em lotes menores para evitar consumo excessivo de memória
    const BATCH_SIZE = 2; // Processa apenas 2 imagens por vez para reduzir uso de memória
    const batches = [];
    
    // Divide as imagens em lotes
    for (let i = 0; i < imagePaths.length; i += BATCH_SIZE) {
      batches.push(imagePaths.slice(i, i + BATCH_SIZE));
    }
    
    logger.info(`Dividindo processamento em ${batches.length} lotes de até ${BATCH_SIZE} imagens`, {
      bookId,
      totalImages: imagePaths.length,
      batches: batches.length
    });
    
    // Processa cada lote sequencialmente
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      logger.info(`Processando lote ${batchIndex + 1}/${batches.length} (${batch.length} imagens)`, {
        bookId,
        batchIndex: batchIndex + 1,
        batchSize: batch.length
      });
      
      // Processa cada imagem no lote atual
      for (let i = 0; i < batch.length; i++) {
        const imageIndex = batchIndex * BATCH_SIZE + i;
        const imagePath = batch[i];
        
        try {
          // Verifica se a imagem existe e é válida antes de processar
          if (!fs.existsSync(imagePath) || fs.statSync(imagePath).size === 0) {
            logger.warn(`Imagem ${imageIndex + 1} não existe ou está vazia, criando fallback`, {
              bookId,
              imagePath
            });
            
            // Cria uma imagem de fallback
            const fallbackPath = path.join(tempDir, `page_${imageIndex + 1}_fallback.jpg`);
            await this.createFallbackImage(fallbackPath);
            optimizedPaths.push(fallbackPath);
            continue;
          }
          
          // Pré-valida a imagem antes de otimizar
          const isValid = await this.isValidImage(imagePath);
          if (!isValid) {
            logger.warn(`Imagem ${imageIndex + 1} inválida, criando fallback`, {
              bookId,
              imagePath
            });
            
            // Cria uma imagem de fallback
            const fallbackPath = path.join(tempDir, `page_${imageIndex + 1}_fallback.jpg`);
            await this.createFallbackImage(fallbackPath);
            optimizedPaths.push(fallbackPath);
            continue;
          }
          
          const outputPath = path.join(tempDir, `page_${imageIndex + 1}_optimized.jpg`);
          
          // Obtém o tamanho do arquivo original
          const originalSize = fs.statSync(imagePath).size;
          logger.info(`Tamanho original da imagem ${imageIndex + 1}: ${Math.round(originalSize / 1024)}KB`, {
            bookId,
            pageNumber: imageIndex + 1,
            imagePath
          });
          
          // Ajusta as configurações de otimização com base no tamanho original
          let optimizationConfig = {
            width: 400,
            height: 400,
            quality: 65,
            format: 'jpeg'
          };
          
          // Para imagens muito grandes, usa configurações mais agressivas
          if (originalSize > 2 * 1024 * 1024) { // Mais de 2MB
            optimizationConfig = {
              width: 350,
              height: 350,
              quality: 55,
              format: 'jpeg'
            };
            logger.info(`Imagem ${imageIndex + 1} muito grande (${Math.round(originalSize / 1024 / 1024 * 10) / 10}MB), usando otimização agressiva`, {
              bookId,
              pageNumber: imageIndex + 1
            });
          }
          
          // Otimiza a imagem com configurações ajustadas
          const optimizedPath = await this.optimizeImage(
            imagePath,
            outputPath,
            optimizationConfig
          );
          
          // Verifica se a imagem otimizada existe e é válida
          if (fs.existsSync(optimizedPath) && fs.statSync(optimizedPath).size > 0) {
            const newSize = fs.statSync(optimizedPath).size;
            const reduction = Math.round((1 - newSize / originalSize) * 100);
            
            optimizedPaths.push(optimizedPath);
            
            logger.info(`Imagem ${imageIndex + 1}/${imagePaths.length} otimizada com sucesso: ${Math.round(originalSize / 1024)}KB → ${Math.round(newSize / 1024)}KB (${reduction}% redução)`, {
              bookId,
              pageNumber: imageIndex + 1,
              originalPath: imagePath,
              optimizedPath,
              originalSize: Math.round(originalSize / 1024) + 'KB',
              newSize: Math.round(newSize / 1024) + 'KB',
              reduction: reduction + '%'
            });
          } else {
            logger.warn(`Imagem otimizada ${imageIndex + 1} inválida ou vazia, criando fallback`, {
              bookId,
              imagePath,
              optimizedPath
            });
            
            // Cria uma imagem de fallback
            const fallbackPath = path.join(tempDir, `page_${imageIndex + 1}_fallback.jpg`);
            await this.createFallbackImage(fallbackPath);
            optimizedPaths.push(fallbackPath);
          }
        } catch (error) {
          logger.error(`Erro ao otimizar imagem ${imageIndex + 1}/${imagePaths.length}`, {
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            bookId,
            pageNumber: imageIndex + 1,
            imagePath: imagePath,
            stack: error instanceof Error ? error.stack : undefined
          });
          
          try {
            // Cria uma imagem de fallback em caso de erro
            const fallbackPath = path.join(tempDir, `page_${imageIndex + 1}_fallback.jpg`);
            await this.createFallbackImage(fallbackPath);
            optimizedPaths.push(fallbackPath);
            
            logger.info(`Imagem de fallback criada para página ${imageIndex + 1}`, {
              bookId,
              pageNumber: imageIndex + 1,
              fallbackPath
            });
          } catch (fallbackError) {
            logger.error(`Erro ao criar imagem de fallback para página ${imageIndex + 1}`, {
              error: fallbackError instanceof Error ? fallbackError.message : 'Erro desconhecido',
              bookId,
              pageNumber: imageIndex + 1
            });
            
            // Em caso de erro na criação do fallback, adiciona o caminho original
            optimizedPaths.push(imagePath);
          }
        }
      }
      
      // Limpa a memória após cada lote
      global.gc && global.gc();
      
      // Registra uso de memória após o lote
      const memoryAfterBatch = process.memoryUsage();
      logger.info(`Lote ${batchIndex + 1}/${batches.length} concluído`, {
        bookId,
        batchIndex: batchIndex + 1,
        memoryUsage: {
          rss: Math.round(memoryAfterBatch.rss / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memoryAfterBatch.heapTotal / 1024 / 1024) + 'MB',
          heapUsed: Math.round(memoryAfterBatch.heapUsed / 1024 / 1024) + 'MB'
        }
      });
      
      // Adiciona um pequeno atraso entre os lotes para permitir que o GC funcione
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Registra uso de memória após o processamento
    const memoryAfter = process.memoryUsage();
    const duration = performance.now() - startTime;
    
    // Calcula o tamanho total das imagens otimizadas
    let totalOptimizedSize = 0;
    for (const imgPath of optimizedPaths) {
      if (fs.existsSync(imgPath)) {
        totalOptimizedSize += fs.statSync(imgPath).size;
      }
    }
    
    logger.info(`Otimização de imagens concluída para o livro ${bookId}`, {
      bookId,
      totalImages: imagePaths.length,
      optimizedImages: optimizedPaths.length,
      totalOptimizedSize: Math.round(totalOptimizedSize / 1024) + 'KB',
      averageImageSize: Math.round(totalOptimizedSize / optimizedPaths.length / 1024) + 'KB',
      duration: Math.round(duration) + 'ms',
      memoryUsage: {
        rss: Math.round(memoryAfter.rss / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memoryAfter.heapTotal / 1024 / 1024) + 'MB',
        heapUsed: Math.round(memoryAfter.heapUsed / 1024 / 1024) + 'MB',
        change: {
          rss: Math.round((memoryAfter.rss - memoryBefore.rss) / 1024 / 1024) + 'MB',
          heapUsed: Math.round((memoryAfter.heapUsed - memoryBefore.heapUsed) / 1024 / 1024) + 'MB'
        }
      }
    });
    
    return optimizedPaths;
  }
  
  /**
   * Verifica se uma imagem é válida e tem conteúdo
   * @param imagePath Caminho da imagem
   * @returns true se a imagem for válida
   */
  public async isValidImage(imagePath: string): Promise<boolean> {
    try {
      // Verifica se o arquivo existe
      if (!fs.existsSync(imagePath)) {
        logger.warn(`Arquivo de imagem não existe: ${imagePath}`);
        return false;
      }
      
      // Verifica se o arquivo tem conteúdo
      const stats = fs.statSync(imagePath);
      if (stats.size === 0) {
        logger.warn(`Arquivo de imagem vazio: ${imagePath}`);
        return false;
      }
      
      // Verifica se o arquivo é muito pequeno para ser uma imagem válida
      if (stats.size < 100) { // Menos de 100 bytes provavelmente não é uma imagem válida
        logger.warn(`Arquivo de imagem muito pequeno (${stats.size} bytes): ${imagePath}`);
        return false;
      }
      
      // Tenta ler os metadados da imagem
      try {
        const metadata = await sharp(imagePath, { failOnError: false }).metadata();
        
        // Verifica se tem dimensões válidas
        if (!metadata.width || !metadata.height) {
          logger.warn(`Imagem sem dimensões válidas: ${imagePath}`);
          return false;
        }
        
        // Verifica se as dimensões são razoáveis
        if (metadata.width < 10 || metadata.height < 10) {
          logger.warn(`Imagem com dimensões muito pequenas (${metadata.width}x${metadata.height}): ${imagePath}`);
          return false;
        }
        
        // Verifica se o formato é suportado
        if (!['jpeg', 'png', 'webp', 'gif', 'svg'].includes(metadata.format || '')) {
          logger.warn(`Formato de imagem não suportado (${metadata.format}): ${imagePath}`);
          return false;
        }
        
        // Verifica se a imagem não é muito grande para processamento
        if (metadata.width && metadata.height && metadata.width * metadata.height > 100000000) {
          logger.warn(`Imagem muito grande para processamento seguro (${metadata.width}x${metadata.height}): ${imagePath}`);
          return false;
        }
        
        logger.info(`Imagem válida: ${path.basename(imagePath)}`, {
          format: metadata.format,
          dimensions: `${metadata.width}x${metadata.height}`,
          size: Math.round(stats.size / 1024) + 'KB'
        });
        
        return true;
      } catch (metadataError) {
        logger.error(`Erro ao ler metadados da imagem: ${path.basename(imagePath)}`, {
          error: metadataError instanceof Error ? metadataError.message : 'Erro desconhecido'
        });
        
        // Tenta uma abordagem alternativa para verificar se é uma imagem válida
        try {
          // Tenta usar image-size como alternativa
          try {
            const dimensions = sizeOf(imagePath);
            if (dimensions && dimensions.width && dimensions.height) {
              logger.info(`Imagem válida (via image-size): ${path.basename(imagePath)}`, {
                dimensions: `${dimensions.width}x${dimensions.height}`,
                size: Math.round(stats.size / 1024) + 'KB'
              });
              return true;
            }
          } catch (sizeError) {
            logger.warn(`Não foi possível obter dimensões via image-size: ${path.basename(imagePath)}`, {
              error: sizeError instanceof Error ? sizeError.message : 'Erro desconhecido'
            });
          }
          
          // Tenta redimensionar a imagem como teste final
          await sharp(imagePath, { failOnError: false })
            .resize(10, 10)
            .toBuffer();
          
          // Se chegou aqui, a imagem pode ser processada
          logger.info(`Imagem processável mesmo sem metadados válidos: ${path.basename(imagePath)}`);
          return true;
        } catch (resizeError) {
          logger.error(`Imagem não pode ser processada: ${path.basename(imagePath)}`, {
            error: resizeError instanceof Error ? resizeError.message : 'Erro desconhecido'
          });
          return false;
        }
      }
    } catch (error) {
      logger.error(`Erro ao verificar imagem: ${path.basename(imagePath)}`, {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return false;
    }
  }
  
  /**
   * Verifica e repara uma imagem, retornando uma imagem válida ou um fallback
   * @param imagePath Caminho da imagem a ser verificada
   * @param fallbackDir Diretório para salvar a imagem de fallback se necessário
   * @returns Caminho para uma imagem válida (original ou fallback)
   */
  public async verifyAndRepairImage(imagePath: string, fallbackDir?: string): Promise<string> {
    try {
      // Verifica se a imagem é válida
      const isValid = await this.isValidImage(imagePath);
      
      if (isValid) {
        logger.info(`Imagem verificada e válida: ${path.basename(imagePath)}`);
        return imagePath;
      }
      
      logger.warn(`Imagem inválida, tentando reparar: ${path.basename(imagePath)}`);
      
      // Tenta reparar a imagem
      try {
        // Determina o diretório para salvar a imagem reparada
        const repairDir = fallbackDir || path.dirname(imagePath);
        const repairedPath = path.join(repairDir, `repaired_${path.basename(imagePath)}`);
        
        // Verifica se o diretório existe
        if (!fs.existsSync(repairDir)) {
          fs.mkdirSync(repairDir, { recursive: true });
        }
        
        // Tenta ler a imagem e convertê-la para um formato válido
        if (fs.existsSync(imagePath) && fs.statSync(imagePath).size > 0) {
          try {
            // Tenta reparar usando sharp com configurações seguras
            await sharp(imagePath, { 
              failOnError: false,
              limitInputPixels: 100000000
            })
              .resize(300, 300, { fit: 'inside' })
              .jpeg({ quality: 80 })
              .toFile(repairedPath);
            
            // Verifica se a imagem reparada é válida
            if (fs.existsSync(repairedPath) && fs.statSync(repairedPath).size > 0) {
              const repairedValid = await this.isValidImage(repairedPath);
              
              if (repairedValid) {
                logger.info(`Imagem reparada com sucesso: ${path.basename(repairedPath)}`);
                return repairedPath;
              }
            }
            
            // Se chegou aqui, a reparação falhou
            throw new Error('Imagem reparada não é válida');
          } catch (repairError) {
            logger.error(`Falha ao reparar imagem: ${path.basename(imagePath)}`, {
              error: repairError instanceof Error ? repairError.message : 'Erro desconhecido'
            });
            
            // Tenta uma abordagem mais simples
            try {
              const simpleRepairedPath = path.join(repairDir, `simple_repaired_${path.basename(imagePath)}`);
              
              // Tenta criar uma imagem muito simples a partir da original
              await sharp(imagePath, { 
                failOnError: false,
                limitInputPixels: 100000000
              })
                .resize(200, 200, { fit: 'inside' })
                .jpeg({ quality: 60 })
                .toFile(simpleRepairedPath);
              
              // Verifica se a imagem simples é válida
              if (fs.existsSync(simpleRepairedPath) && fs.statSync(simpleRepairedPath).size > 0) {
                const simpleValid = await this.isValidImage(simpleRepairedPath);
                
                if (simpleValid) {
                  logger.info(`Imagem reparada com abordagem simples: ${path.basename(simpleRepairedPath)}`);
                  return simpleRepairedPath;
                }
              }
              
              // Se chegou aqui, a reparação simples também falhou
              throw new Error('Reparação simples também falhou');
            } catch (simpleRepairError) {
              logger.error(`Falha na reparação simples: ${path.basename(imagePath)}`, {
                error: simpleRepairError instanceof Error ? simpleRepairError.message : 'Erro desconhecido'
              });
            }
          }
        }
        
        // Se chegou aqui, todas as tentativas de reparo falharam
        throw new Error('Todas as tentativas de reparo falharam');
      } catch (repairProcessError) {
        logger.error(`Processo de reparo falhou completamente: ${path.basename(imagePath)}`, {
          error: repairProcessError instanceof Error ? repairProcessError.message : 'Erro desconhecido'
        });
      }
      
      // Cria uma imagem de fallback como último recurso
      try {
        const fallbackDir = fallbackDir || path.dirname(imagePath);
        const fallbackPath = path.join(fallbackDir, `fallback_${path.basename(imagePath)}`);
        
        await this.createFallbackImage(fallbackPath);
        
        logger.info(`Criada imagem de fallback após falhas de reparo: ${path.basename(fallbackPath)}`);
        return fallbackPath;
      } catch (fallbackError) {
        logger.error(`Falha ao criar imagem de fallback: ${path.basename(imagePath)}`, {
          error: fallbackError instanceof Error ? fallbackError.message : 'Erro desconhecido'
        });
        
        // Como último recurso, retorna o caminho original mesmo sendo inválido
        return imagePath;
      }
    } catch (error) {
      logger.error(`Erro no processo de verificação e reparo: ${path.basename(imagePath)}`, {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Tenta criar uma imagem de fallback como último recurso
      try {
        const fallbackDir = fallbackDir || path.dirname(imagePath);
        const fallbackPath = path.join(fallbackDir, `emergency_fallback_${path.basename(imagePath)}`);
        
        await this.createFallbackImage(fallbackPath);
        
        logger.info(`Criada imagem de fallback de emergência: ${path.basename(fallbackPath)}`);
        return fallbackPath;
      } catch (emergencyError) {
        logger.error(`Falha completa no processo de verificação e reparo: ${path.basename(imagePath)}`, {
          error: emergencyError instanceof Error ? emergencyError.message : 'Erro desconhecido'
        });
        
        // Retorna o caminho original como último recurso
        return imagePath;
      }
    }
  }
  
  /**
   * Limpa arquivos temporários de um diretório específico
   * @param tempDir Diretório temporário a ser limpo
   * @param olderThanHours Limpa apenas arquivos mais antigos que X horas (padrão: 24)
   */
  public async cleanupTempFiles(tempDir: string, olderThanHours: number = 24): Promise<void> {
    try {
      if (!fs.existsSync(tempDir)) {
        logger.info(`Diretório temporário não existe: ${tempDir}`);
        return;
      }
      
      logger.info(`Iniciando limpeza de arquivos temporários em: ${tempDir}`);
      
      const files = fs.readdirSync(tempDir);
      const now = Date.now();
      const olderThanMs = olderThanHours * 60 * 60 * 1000;
      let deletedCount = 0;
      let deletedSize = 0;
      
      for (const file of files) {
        try {
          const filePath = path.join(tempDir, file);
          
          // Pula diretórios
          if (fs.statSync(filePath).isDirectory()) {
            continue;
          }
          
          const stats = fs.statSync(filePath);
          const fileAge = now - stats.mtimeMs;
          
          // Deleta apenas arquivos mais antigos que o limite especificado
          if (fileAge > olderThanMs) {
            const fileSize = stats.size;
            fs.unlinkSync(filePath);
            deletedCount++;
            deletedSize += fileSize;
            
            logger.debug(`Arquivo temporário removido: ${file}`, {
              age: Math.round(fileAge / (60 * 60 * 1000) * 10) / 10 + ' horas',
              size: Math.round(fileSize / 1024) + 'KB'
            });
          }
        } catch (fileError) {
          logger.warn(`Erro ao processar arquivo temporário: ${file}`, {
            error: fileError instanceof Error ? fileError.message : 'Erro desconhecido'
          });
        }
      }
      
      logger.info(`Limpeza de arquivos temporários concluída`, {
        directory: tempDir,
        deletedFiles: deletedCount,
        totalSize: Math.round(deletedSize / 1024) + 'KB',
        olderThan: olderThanHours + ' horas'
      });
    } catch (error) {
      logger.error(`Erro ao limpar arquivos temporários`, {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        directory: tempDir,
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }
}

export const imageOptimizer = new ImageOptimizer();