import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { IBook } from '../models/Book';
import { logger } from '../utils/logger';
import axios from 'axios';
import { imageOptimizer } from './imageOptimizer';
import sizeOf from 'image-size';

interface PDFOptions {
  format?: 'A3' | 'A4' | 'A5' | 'landscape';
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  fonts?: {
    regular: string;
    bold: string;
    italic: string;
  };
  layout?: 'standard' | 'picture-book' | 'comic';
  theme?: 'light' | 'dark' | 'colorful';
}

const defaultOptions: PDFOptions = {
  format: 'A4',
  margins: {
    top: 72,
    bottom: 72,
    left: 72,
    right: 72,
  },
  layout: 'picture-book',
  theme: 'light'
};

// Temas de cores para o PDF
const themes = {
  light: {
    background: '#FFFFFF',
    text: '#333333',
    title: '#1A237E',
    accent: '#3F51B5',
    border: '#DDDDDD'
  },
  dark: {
    background: '#263238',
    text: '#ECEFF1',
    title: '#82B1FF',
    accent: '#448AFF',
    border: '#455A64'
  },
  colorful: {
    background: '#FFFDE7',
    text: '#37474F',
    title: '#FF5722',
    accent: '#FFC107',
    border: '#FFCC80'
  }
};

async function downloadImage(url: string, localPath: string): Promise<string> {
  try {
    // Se a URL for um caminho local (começa com '/'), converte para caminho absoluto
    if (url.startsWith('/')) {
      const absolutePath = path.join(__dirname, '../../public', url);
      if (fs.existsSync(absolutePath)) {
        logger.info(`URL é um caminho local, usando diretamente: ${url}`, {
          url,
          absolutePath,
          fileSize: fs.statSync(absolutePath).size
        });
        
        // Verifica se a imagem local é válida antes de usar
        const isValid = await imageOptimizer.isValidImage(absolutePath);
        if (!isValid) {
          logger.warn(`Imagem local inválida: ${url}, tentando reparar`, {
            url,
            absolutePath
          });
          
          // Tenta reparar a imagem
          const repairedPath = await imageOptimizer.verifyAndRepairImage(
            absolutePath, 
            path.dirname(localPath)
          );
          
          // Se o caminho reparado for diferente do original, usa o reparado
          if (repairedPath !== absolutePath) {
            logger.info(`Usando imagem local reparada: ${repairedPath}`, {
              originalPath: absolutePath,
              repairedPath
            });
            return repairedPath;
          }
        }
        
        // Otimiza a imagem local antes de usar
        try {
          const optimizedPath = await imageOptimizer.optimizeImage(
            absolutePath,
            localPath,
            { width: 400, height: 400, quality: 65 } // Configurações mais agressivas
          );
          
          logger.info(`Imagem local otimizada com sucesso: ${url}`, {
            url,
            originalPath: absolutePath,
            optimizedPath,
            originalSize: Math.round(fs.statSync(absolutePath).size / 1024) + 'KB',
            optimizedSize: Math.round(fs.statSync(optimizedPath).size / 1024) + 'KB'
          });
          
          return optimizedPath;
        } catch (optimizeError) {
          logger.warn(`Falha ao otimizar imagem local, usando original: ${optimizeError.message}`, {
            url,
            error: optimizeError instanceof Error ? optimizeError.stack : 'Erro desconhecido'
          });
          return absolutePath;
        }
      } else {
        logger.warn(`Caminho local não encontrado: ${absolutePath}`, {
          url,
          absolutePath
        });
        throw new Error(`Arquivo local não encontrado: ${absolutePath}`);
      }
    }
    
    logger.info(`Iniciando download da imagem: ${url.substring(0, 50)}...`, {
      url: url.substring(0, 50) + '...',
      localPath
    });
    
    // Configuração melhorada para o download de imagens
    const response = await axios.get(url, { 
      responseType: 'arraybuffer',
      timeout: 120000, // 2 minutos (reduzido para evitar travamentos)
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      // Adicionando retry e configurações de timeout
      maxRedirects: 5,
      maxContentLength: 15 * 1024 * 1024, // 15MB max (reduzido)
      validateStatus: function (status) {
        return status >= 200 && status < 300; // Aceita apenas status 2xx
      }
    });
    
    if (!response.data || response.data.length === 0) {
      throw new Error('Resposta vazia ao baixar imagem');
    }
    
    // Verifica se o diretório existe antes de salvar
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Salva a imagem original temporariamente
    const tempPath = `${localPath}.temp`;
    fs.writeFileSync(tempPath, response.data);
    
    // Verifica se a imagem baixada é válida
    const isValid = await imageOptimizer.isValidImage(tempPath);
    if (!isValid) {
      logger.warn(`Imagem baixada inválida: ${url.substring(0, 50)}..., tentando reparar`, {
        url: url.substring(0, 50) + '...',
        tempPath
      });
      
      // Tenta reparar a imagem
      const repairedPath = await imageOptimizer.verifyAndRepairImage(
        tempPath, 
        path.dirname(localPath)
      );
      
      // Se o caminho reparado for diferente do original, usa o reparado
      if (repairedPath !== tempPath) {
        logger.info(`Usando imagem reparada: ${repairedPath}`, {
          originalUrl: url.substring(0, 50) + '...',
          repairedPath
        });
        
        // Remove o arquivo temporário
        try {
          fs.unlinkSync(tempPath);
        } catch (unlinkError) {
          logger.warn(`Não foi possível remover arquivo temporário: ${unlinkError.message}`);
        }
        
        return repairedPath;
      }
    }
    
    // Verifica o tamanho da imagem original
    const originalSize = response.data.length;
    logger.info(`Imagem baixada: ${Math.round(originalSize / 1024)}KB`, {
      url: url.substring(0, 50) + '...',
      size: originalSize
    });
    
    // Configurações de otimização baseadas no tamanho da imagem
    let optimizationOptions;
    
    if (originalSize > 5 * 1024 * 1024) {
      // Imagens muito grandes (>5MB): otimização muito agressiva
      optimizationOptions = { width: 350, height: 350, quality: 55 };
      logger.info(`Imagem muito grande (${Math.round(originalSize / 1024 / 1024 * 10) / 10}MB), usando otimização muito agressiva`, {
        url: url.substring(0, 50) + '...'
      });
    } else if (originalSize > 2 * 1024 * 1024) {
      // Imagens grandes (2-5MB): otimização agressiva
      optimizationOptions = { width: 400, height: 400, quality: 60 };
      logger.info(`Imagem grande (${Math.round(originalSize / 1024 / 1024 * 10) / 10}MB), usando otimização agressiva`, {
        url: url.substring(0, 50) + '...'
      });
    } else if (originalSize > 1 * 1024 * 1024) {
      // Imagens médias (1-2MB): otimização moderada
      optimizationOptions = { width: 450, height: 450, quality: 65 };
      logger.info(`Imagem média (${Math.round(originalSize / 1024)}KB), usando otimização moderada`, {
        url: url.substring(0, 50) + '...'
      });
    } else {
      // Imagens pequenas (<1MB): otimização leve
      optimizationOptions = { width: 500, height: 500, quality: 70 };
      logger.info(`Imagem pequena (${Math.round(originalSize / 1024)}KB), usando otimização leve`, {
        url: url.substring(0, 50) + '...'
      });
    }
    
    // Otimiza a imagem
    try {
      const optimizedPath = await imageOptimizer.optimizeImage(
        tempPath,
        localPath,
        optimizationOptions
      );
      
      // Remove o arquivo temporário
      try {
        fs.unlinkSync(tempPath);
      } catch (unlinkError) {
        logger.warn(`Não foi possível remover arquivo temporário: ${unlinkError.message}`);
      }
      
      // Verifica o tamanho da imagem otimizada
      const optimizedSize = fs.statSync(optimizedPath).size;
      const reduction = Math.round((1 - optimizedSize / originalSize) * 100);
      
      logger.info(`Imagem otimizada e salva com sucesso: ${url.substring(0, 50)}... | ${Math.round(originalSize / 1024)}KB → ${Math.round(optimizedSize / 1024)}KB (${reduction}% redução)`, {
        url: url.substring(0, 50) + '...',
        localPath: optimizedPath,
        originalSize: `${Math.round(originalSize / 1024)}KB`,
        optimizedSize: `${Math.round(optimizedSize / 1024)}KB`,
        reduction: `${reduction}%`
      });
      
      // Verifica se a imagem ainda está muito grande para o PDF
      if (optimizedSize > 500 * 1024) {
        logger.warn(`Imagem otimizada ainda é grande (${Math.round(optimizedSize / 1024)}KB), aplicando otimização adicional`, {
          url: url.substring(0, 50) + '...',
          optimizedPath
        });
        
        // Aplica uma otimização mais agressiva
        const finalPath = `${optimizedPath}.final.jpg`;
        const finalOptimizedPath = await imageOptimizer.optimizeImage(
          optimizedPath,
          finalPath,
          { width: 300, height: 300, quality: 50 }
        );
        
        const finalSize = fs.statSync(finalOptimizedPath).size;
        const finalReduction = Math.round((1 - finalSize / originalSize) * 100);
        
        logger.info(`Otimização adicional aplicada: ${Math.round(optimizedSize / 1024)}KB → ${Math.round(finalSize / 1024)}KB (redução total: ${finalReduction}%)`, {
          url: url.substring(0, 50) + '...',
          finalPath: finalOptimizedPath
        });
        
        return finalOptimizedPath;
      }
      
      return optimizedPath;
    } catch (optimizeError) {
      // Se falhar na otimização, tenta uma abordagem mais simples
      logger.warn(`Falha na otimização padrão, tentando abordagem alternativa: ${optimizeError.message}`, {
        url: url.substring(0, 50) + '...',
        error: optimizeError instanceof Error ? optimizeError.stack : 'Erro desconhecido'
      });
      
      try {
        // Usa o sharp diretamente com configurações mais simples
        const sharp = require('sharp');
        const simpleBuffer = await sharp(tempPath, { failOnError: false })
          .resize(350, 350, { fit: 'inside' })
          .jpeg({ quality: 60, mozjpeg: true })
          .toBuffer();
        
        fs.writeFileSync(localPath, simpleBuffer);
        
        // Remove o arquivo temporário
        try {
          fs.unlinkSync(tempPath);
        } catch (unlinkError) {
          logger.warn(`Não foi possível remover arquivo temporário: ${unlinkError.message}`);
        }
        
        const newSize = fs.statSync(localPath).size;
        const reduction = Math.round((1 - newSize / originalSize) * 100);
        
        logger.info(`Otimização alternativa bem-sucedida: ${url.substring(0, 50)}... | ${Math.round(originalSize / 1024)}KB → ${Math.round(newSize / 1024)}KB (${reduction}% redução)`, {
          url: url.substring(0, 50) + '...',
          localPath
        });
        
        return localPath;
      } catch (simpleError) {
        // Se também falhar na abordagem simples, usa a imagem original
        logger.warn(`Falha também na abordagem alternativa, usando original: ${simpleError.message}`, {
          url: url.substring(0, 50) + '...',
          error: simpleError instanceof Error ? simpleError.stack : 'Erro desconhecido'
        });
        
        // Move o arquivo temporário para o destino final
        fs.renameSync(tempPath, localPath);
        return localPath;
      }
    }
  } catch (error) {
    logger.error(`Erro ao baixar imagem: ${url.substring(0, 50)}...`, {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      url: url.substring(0, 50) + '...',
      localPath,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Em caso de erro, tenta criar uma imagem de fallback
    try {
      const fallbackPath = await imageOptimizer.createFallbackImage(localPath);
      logger.info(`Imagem de fallback criada para substituir download com erro: ${url.substring(0, 50)}...`, {
        url: url.substring(0, 50) + '...',
        fallbackPath
      });
      return fallbackPath;
    } catch (fallbackError) {
      logger.error(`Erro ao criar fallback: ${fallbackError instanceof Error ? fallbackError.message : 'Erro desconhecido'}`);
      
      // Se falhar na criação do fallback, cria um arquivo vazio com cabeçalho JPEG mínimo
      try {
        fs.writeFileSync(localPath, Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]));
        return localPath;
      } catch (finalError) {
        // Se tudo falhar, propaga o erro original
        throw error;
      }
    }
  }
}

async function prepareImages(book: IBook): Promise<Map<number, string>> {
  const imageMap = new Map<number, string>();
  const tempDir = path.join(__dirname, '../../temp');
  const bookTempDir = path.join(tempDir, book._id.toString());
  
  // Cria diretórios temporários específicos para o livro
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  if (!fs.existsSync(bookTempDir)) {
    fs.mkdirSync(bookTempDir, { recursive: true });
  }

  // Verifica se o diretório de fallback existe e cria se necessário
  const fallbackDir = path.join(__dirname, '../../public/assets/images');
  const fallbackImagePath = path.join(fallbackDir, 'fallback-page.jpg');
  
  if (!fs.existsSync(fallbackDir)) {
    fs.mkdirSync(fallbackDir, { recursive: true });
  }
  
  // Cria uma imagem de fallback se não existir
  if (!fs.existsSync(fallbackImagePath) || fs.statSync(fallbackImagePath).size === 0) {
    try {
      await imageOptimizer.createFallbackImage(fallbackImagePath);
      logger.info('Imagem de fallback criada com sucesso', { fallbackImagePath });
    } catch (error) {
      logger.error('Erro ao criar imagem de fallback', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }

  logger.info(`Preparando imagens para o livro "${book.title}" (${book.pages.length} páginas)`, {
    bookId: book._id,
    totalPages: book.pages.length
  });

  // Array para armazenar os caminhos das imagens baixadas
  const downloadedImages: string[] = [];
  const pageToPathMap: Record<number, string> = {};

  // Processamento sequencial para evitar problemas de memória
  // Reduzimos o processamento paralelo para 1 imagem por vez
  for (let i = 0; i < book.pages.length; i++) {
    const page = book.pages[i];
    
    try {
      if (!page.imageUrl || page.imageUrl === '') {
        throw new Error(`Página ${page.pageNumber} não tem URL de imagem`);
      }
      
      logger.info(`Processando imagem para página ${page.pageNumber} (${i+1}/${book.pages.length})`, {
        bookId: book._id,
        pageNumber: page.pageNumber,
        imageUrl: page.imageUrl.substring(0, 50) + '...'
      });
      
      if (page.imageUrl.startsWith('http')) {
        const localPath = path.join(bookTempDir, `page_${page.pageNumber}_raw.jpg`);
        try {
          logger.info(`Baixando imagem para página ${page.pageNumber}`, {
            bookId: book._id,
            pageNumber: page.pageNumber,
            imageUrl: page.imageUrl.substring(0, 50) + '...'
          });
          
          const downloadedPath = await downloadImage(page.imageUrl, localPath);
          
          // Verifica se o arquivo foi realmente baixado e tem conteúdo
          if (fs.existsSync(downloadedPath) && fs.statSync(downloadedPath).size > 0) {
            // Verifica se a imagem é válida
            try {
              // Usa sharp para validar a imagem
              const sharp = require('sharp');
              const metadata = await sharp(downloadedPath, { failOnError: false }).metadata();
              
              if (!metadata || !metadata.width || !metadata.height) {
                throw new Error('Metadados da imagem inválidos ou incompletos');
              }
              
              // Verifica o tamanho do arquivo baixado
              const fileSize = fs.statSync(downloadedPath).size;
              logger.info(`Imagem para página ${page.pageNumber} baixada e validada com sucesso: ${Math.round(fileSize / 1024)}KB, ${metadata.width}x${metadata.height}`, {
                bookId: book._id,
                pageNumber: page.pageNumber,
                localPath: downloadedPath,
                fileSize: Math.round(fileSize / 1024) + 'KB',
                dimensions: `${metadata.width}x${metadata.height}`,
                format: metadata.format
              });
              
              // Otimiza a imagem para o PDF - configurações mais agressivas
              try {
                const optimizedPath = path.join(bookTempDir, `page_${page.pageNumber}_optimized.jpg`);
                const finalPath = await imageOptimizer.optimizeImage(
                  downloadedPath,
                  optimizedPath,
                  { width: 300, height: 300, quality: 60 } // Configurações mais agressivas
                );
                
                // Verifica se a imagem otimizada é válida
                const optimizedMetadata = await sharp(finalPath, { failOnError: false }).metadata();
                if (!optimizedMetadata || !optimizedMetadata.width || !optimizedMetadata.height) {
                  throw new Error('Metadados da imagem otimizada inválidos ou incompletos');
                }
                
                const newSize = fs.statSync(finalPath).size;
                logger.info(`Imagem otimizada para página ${page.pageNumber}: ${Math.round(fileSize / 1024)}KB → ${Math.round(newSize / 1024)}KB`, {
                  bookId: book._id,
                  pageNumber: page.pageNumber,
                  reduction: Math.round((1 - newSize / fileSize) * 100) + '%',
                  dimensions: `${optimizedMetadata.width}x${optimizedMetadata.height}`
                });
                
                downloadedImages.push(finalPath);
                pageToPathMap[page.pageNumber] = finalPath;
              } catch (optimizeError) {
                logger.error(`Erro na otimização para página ${page.pageNumber}, usando versão não otimizada`, {
                  error: optimizeError instanceof Error ? optimizeError.message : 'Erro desconhecido',
                  bookId: book._id,
                  pageNumber: page.pageNumber,
                  stack: optimizeError instanceof Error ? optimizeError.stack : undefined
                });
                
                // Tenta uma otimização mais simples
                try {
                  const simpleOptimizedPath = path.join(bookTempDir, `page_${page.pageNumber}_simple_optimized.jpg`);
                  const sharp = require('sharp');
                  await sharp(downloadedPath, { failOnError: false })
                    .resize(250, 250, { fit: 'inside' })
                    .jpeg({ quality: 50 })
                    .toFile(simpleOptimizedPath);
                  
                  if (fs.existsSync(simpleOptimizedPath) && fs.statSync(simpleOptimizedPath).size > 0) {
                    downloadedImages.push(simpleOptimizedPath);
                    pageToPathMap[page.pageNumber] = simpleOptimizedPath;
                    
                    logger.info(`Otimização simples aplicada para página ${page.pageNumber}`, {
                      bookId: book._id,
                      pageNumber: page.pageNumber,
                      originalSize: Math.round(fileSize / 1024) + 'KB',
                      newSize: Math.round(fs.statSync(simpleOptimizedPath).size / 1024) + 'KB'
                    });
                  } else {
                    // Se falhar, usa a imagem original
                    downloadedImages.push(downloadedPath);
                    pageToPathMap[page.pageNumber] = downloadedPath;
                  }
                } catch (simpleOptimizeError) {
                  // Se falhar, usa a imagem original
                  downloadedImages.push(downloadedPath);
                  pageToPathMap[page.pageNumber] = downloadedPath;
                  
                  logger.warn(`Falha na otimização simples para página ${page.pageNumber}, usando original`, {
                    error: simpleOptimizeError instanceof Error ? simpleOptimizeError.message : 'Erro desconhecido',
                    bookId: book._id,
                    pageNumber: page.pageNumber
                  });
                }
              }
            } catch (validationError) {
              logger.error(`Erro ao validar imagem para página ${page.pageNumber}`, {
                error: validationError instanceof Error ? validationError.message : 'Erro desconhecido',
                bookId: book._id,
                pageNumber: page.pageNumber,
                imagePath: downloadedPath,
                stack: validationError instanceof Error ? validationError.stack : undefined
              });
              
              // Tenta criar uma imagem de fallback
              try {
                const fallbackPath = await imageOptimizer.createFallbackImage(
                  path.join(bookTempDir, `page_${page.pageNumber}_fallback.jpg`)
                );
                
                logger.info(`Imagem de fallback criada para página ${page.pageNumber} após falha na validação`, {
                  bookId: book._id,
                  pageNumber: page.pageNumber,
                  fallbackPath
                });
                
                downloadedImages.push(fallbackPath);
                pageToPathMap[page.pageNumber] = fallbackPath;
              } catch (fallbackError) {
                logger.error(`Erro ao criar fallback para página ${page.pageNumber}`, {
                  error: fallbackError instanceof Error ? fallbackError.message : 'Erro desconhecido',
                  bookId: book._id,
                  pageNumber: page.pageNumber
                });
                
                // Usa a imagem de fallback global
                if (fs.existsSync(fallbackImagePath)) {
                  downloadedImages.push(fallbackImagePath);
                  pageToPathMap[page.pageNumber] = fallbackImagePath;
                }
              }
            }
          } else {
            throw new Error('Arquivo de imagem vazio ou não criado');
          }
        } catch (error: any) {
          logger.error(`Erro ao baixar imagem para página ${page.pageNumber}`, {
            error: error.message,
            bookId: book._id,
            pageNumber: page.pageNumber,
            imageUrl: page.imageUrl.substring(0, 50) + '...',
            stack: error.stack
          });
          
          // Usa uma imagem de fallback em caso de erro
          if (fs.existsSync(fallbackImagePath)) {
            downloadedImages.push(fallbackImagePath);
            pageToPathMap[page.pageNumber] = fallbackImagePath;
            
            logger.info(`Usando imagem de fallback para página ${page.pageNumber}`, {
              bookId: book._id,
              pageNumber: page.pageNumber,
              fallbackPath: fallbackImagePath
            });
          } else {
            logger.error(`Imagem de fallback não encontrada para página ${page.pageNumber}`, {
              bookId: book._id,
              pageNumber: page.pageNumber,
              fallbackPath: fallbackImagePath
            });
          }
        }
      } else if (page.imageUrl.startsWith('/')) {
        // Se for um caminho local, usa diretamente
        const localPath = path.join(__dirname, '../../public', page.imageUrl);
        if (fs.existsSync(localPath) && fs.statSync(localPath).size > 0) {
          // Verifica se a imagem local é válida
          try {
            // Usa sharp para validar a imagem
            const sharp = require('sharp');
            const metadata = await sharp(localPath, { failOnError: false }).metadata();
            
            if (!metadata || !metadata.width || !metadata.height) {
              throw new Error('Metadados da imagem local inválidos ou incompletos');
            }
            
            // Otimiza a imagem local
            try {
              const optimizedPath = path.join(bookTempDir, `page_${page.pageNumber}_local_optimized.jpg`);
              const finalPath = await imageOptimizer.optimizeImage(
                localPath,
                optimizedPath,
                { width: 300, height: 300, quality: 60 } // Configurações mais agressivas
              );
              
              // Verifica se a imagem otimizada é válida
              const optimizedMetadata = await sharp(finalPath, { failOnError: false }).metadata();
              if (!optimizedMetadata || !optimizedMetadata.width || !optimizedMetadata.height) {
                throw new Error('Metadados da imagem local otimizada inválidos ou incompletos');
              }
              
              const originalSize = fs.statSync(localPath).size;
              const newSize = fs.statSync(finalPath).size;
              
              logger.info(`Imagem local otimizada para página ${page.pageNumber}: ${Math.round(originalSize / 1024)}KB → ${Math.round(newSize / 1024)}KB`, {
                bookId: book._id,
                pageNumber: page.pageNumber,
                reduction: Math.round((1 - newSize / originalSize) * 100) + '%',
                dimensions: `${optimizedMetadata.width}x${optimizedMetadata.height}`
              });
              
              downloadedImages.push(finalPath);
              pageToPathMap[page.pageNumber] = finalPath;
            } catch (optimizeError) {
              logger.warn(`Erro ao otimizar imagem local para página ${page.pageNumber}, usando original`, {
                error: optimizeError instanceof Error ? optimizeError.message : 'Erro desconhecido',
                bookId: book._id,
                pageNumber: page.pageNumber,
                stack: optimizeError instanceof Error ? optimizeError.stack : undefined
              });
              
              // Tenta uma otimização mais simples
              try {
                const simpleOptimizedPath = path.join(bookTempDir, `page_${page.pageNumber}_simple_local_optimized.jpg`);
                const sharp = require('sharp');
                await sharp(localPath, { failOnError: false })
                  .resize(250, 250, { fit: 'inside' })
                  .jpeg({ quality: 50 })
                  .toFile(simpleOptimizedPath);
                
                if (fs.existsSync(simpleOptimizedPath) && fs.statSync(simpleOptimizedPath).size > 0) {
                  downloadedImages.push(simpleOptimizedPath);
                  pageToPathMap[page.pageNumber] = simpleOptimizedPath;
                  
                  const originalSize = fs.statSync(localPath).size;
                  const newSize = fs.statSync(simpleOptimizedPath).size;
                  
                  logger.info(`Otimização simples aplicada para imagem local da página ${page.pageNumber}`, {
                    bookId: book._id,
                    pageNumber: page.pageNumber,
                    originalSize: Math.round(originalSize / 1024) + 'KB',
                    newSize: Math.round(newSize / 1024) + 'KB',
                    reduction: Math.round((1 - newSize / originalSize) * 100) + '%'
                  });
                } else {
                  // Se falhar, usa a imagem original
                  downloadedImages.push(localPath);
                  pageToPathMap[page.pageNumber] = localPath;
                }
              } catch (simpleOptimizeError) {
                // Se falhar, usa a imagem original
                downloadedImages.push(localPath);
                pageToPathMap[page.pageNumber] = localPath;
                
                logger.warn(`Falha na otimização simples para imagem local da página ${page.pageNumber}, usando original`, {
                  error: simpleOptimizeError instanceof Error ? simpleOptimizeError.message : 'Erro desconhecido',
                  bookId: book._id,
                  pageNumber: page.pageNumber
                });
              }
            }
          } catch (validationError) {
            logger.error(`Erro ao validar imagem local para página ${page.pageNumber}`, {
              error: validationError instanceof Error ? validationError.message : 'Erro desconhecido',
              bookId: book._id,
              pageNumber: page.pageNumber,
              imagePath: localPath,
              stack: validationError instanceof Error ? validationError.stack : undefined
            });
            
            // Usa uma imagem de fallback se a validação falhar
            if (fs.existsSync(fallbackImagePath)) {
              downloadedImages.push(fallbackImagePath);
              pageToPathMap[page.pageNumber] = fallbackImagePath;
              
              logger.info(`Usando imagem de fallback para página ${page.pageNumber} (validação falhou)`, {
                bookId: book._id,
                pageNumber: page.pageNumber,
                fallbackPath: fallbackImagePath
              });
            }
          }
        } else {
          logger.warn(`Imagem local não encontrada ou vazia para página ${page.pageNumber}`, {
            bookId: book._id,
            pageNumber: page.pageNumber,
            localPath
          });
          
          // Usa uma imagem de fallback se o arquivo local não existir
          if (fs.existsSync(fallbackImagePath)) {
            downloadedImages.push(fallbackImagePath);
            pageToPathMap[page.pageNumber] = fallbackImagePath;
            
            logger.info(`Usando imagem de fallback para página ${page.pageNumber}`, {
              bookId: book._id,
              pageNumber: page.pageNumber,
              fallbackPath: fallbackImagePath
            });
          } else {
            logger.error(`Imagem de fallback não encontrada para página ${page.pageNumber}`, {
              bookId: book._id,
              pageNumber: page.pageNumber,
              fallbackPath: fallbackImagePath
            });
          }
        }
      } else {
        logger.warn(`URL de imagem inválida para página ${page.pageNumber}: ${page.imageUrl}`, {
          bookId: book._id,
          pageNumber: page.pageNumber,
          imageUrl: page.imageUrl
        });
        
        // Usa uma imagem de fallback para URLs inválidas
        if (fs.existsSync(fallbackImagePath)) {
          downloadedImages.push(fallbackImagePath);
          pageToPathMap[page.pageNumber] = fallbackImagePath;
          
          logger.info(`Usando imagem de fallback para página ${page.pageNumber} (URL inválida)`, {
            bookId: book._id,
            pageNumber: page.pageNumber,
            fallbackPath: fallbackImagePath
          });
        }
      }
      
      // Libera memória após processar cada imagem
      global.gc && global.gc();
      
      // Pequeno atraso entre o processamento de cada imagem para evitar sobrecarga
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (pageError) {
      logger.error(`Erro ao processar página ${page.pageNumber}`, {
        error: pageError instanceof Error ? pageError.message : 'Erro desconhecido',
        bookId: book._id,
        pageNumber: page.pageNumber,
        stack: pageError instanceof Error ? pageError.stack : undefined
      });
      
      // Usa uma imagem de fallback em caso de erro
      if (fs.existsSync(fallbackImagePath)) {
        downloadedImages.push(fallbackImagePath);
        pageToPathMap[page.pageNumber] = fallbackImagePath;
        
        logger.info(`Usando imagem de fallback para página ${page.pageNumber} (erro de processamento)`, {
          bookId: book._id,
          pageNumber: page.pageNumber,
          fallbackPath: fallbackImagePath
        });
      }
    }
  }

  // Verifica se todas as páginas têm imagens
  for (let i = 1; i <= book.pages.length; i++) {
    if (!pageToPathMap[i]) {
      logger.warn(`Página ${i} não tem imagem após processamento, usando fallback`, {
        bookId: book._id,
        pageNumber: i
      });
      
      // Usa uma imagem de fallback para páginas sem imagem
      if (fs.existsSync(fallbackImagePath)) {
        pageToPathMap[i] = fallbackImagePath;
        if (!downloadedImages.includes(fallbackImagePath)) {
          downloadedImages.push(fallbackImagePath);
        }
        
        logger.info(`Adicionando imagem de fallback para página ${i} (faltante)`, {
          bookId: book._id,
          pageNumber: i,
          fallbackPath: fallbackImagePath
        });
      }
    }
  }

  // Atualiza o mapa de imagens com os caminhos processados
  for (let i = 1; i <= book.pages.length; i++) {
    if (pageToPathMap[i]) {
      // Verifica se a imagem existe e é válida antes de adicioná-la ao mapa final
      const imagePath = pageToPathMap[i];
      
      if (fs.existsSync(imagePath) && fs.statSync(imagePath).size > 0) {
        try {
          // Verifica se a imagem é válida usando sharp
          const sharp = require('sharp');
          const metadata = await sharp(imagePath, { failOnError: false }).metadata();
          
          if (metadata && metadata.width && metadata.height) {
            // Imagem válida, adiciona ao mapa
            imageMap.set(i, imagePath);
            
            logger.info(`Imagem validada para página ${i}: ${metadata.width}x${metadata.height}, formato: ${metadata.format}`, {
              bookId: book._id,
              pageNumber: i,
              dimensions: `${metadata.width}x${metadata.height}`,
              format: metadata.format,
              fileSize: Math.round(fs.statSync(imagePath).size / 1024) + 'KB'
            });
          } else {
            throw new Error('Metadados da imagem inválidos ou incompletos');
          }
        } catch (validationError) {
          logger.error(`Falha na validação final da imagem para página ${i}`, {
            error: validationError instanceof Error ? validationError.message : 'Erro desconhecido',
            bookId: book._id,
            pageNumber: i,
            imagePath,
            stack: validationError instanceof Error ? validationError.stack : undefined
          });
          
          // Tenta usar o fallback como último recurso
          if (fs.existsSync(fallbackImagePath)) {
            try {
              // Verifica se o fallback é válido
              const sharp = require('sharp');
              const fallbackMetadata = await sharp(fallbackImagePath, { failOnError: false }).metadata();
              
              if (fallbackMetadata && fallbackMetadata.width && fallbackMetadata.height) {
                imageMap.set(i, fallbackImagePath);
                
                logger.info(`Usando fallback após falha na validação para página ${i}`, {
                  bookId: book._id,
                  pageNumber: i,
                  fallbackPath: fallbackImagePath
                });
              } else {
                // Se nem o fallback for válido, cria um novo
                const newFallbackPath = path.join(bookTempDir, `emergency_fallback_${i}.jpg`);
                await imageOptimizer.createFallbackImage(newFallbackPath);
                
                imageMap.set(i, newFallbackPath);
                
                logger.info(`Criado fallback de emergência para página ${i}`, {
                  bookId: book._id,
                  pageNumber: i,
                  fallbackPath: newFallbackPath
                });
              }
            } catch (fallbackError) {
              logger.error(`Falha completa ao processar imagem para página ${i}, página será omitida`, {
                error: fallbackError instanceof Error ? fallbackError.message : 'Erro desconhecido',
                bookId: book._id,
                pageNumber: i
              });
              
              // Não adiciona a página ao mapa se todas as tentativas falharem
            }
          }
        }
      } else {
        logger.error(`Imagem para página ${i} não existe ou está vazia: ${imagePath}`, {
          bookId: book._id,
          pageNumber: i,
          imagePath,
          exists: fs.existsSync(imagePath),
          size: fs.existsSync(imagePath) ? fs.statSync(imagePath).size : 0
        });
        
        // Tenta usar o fallback
        if (fs.existsSync(fallbackImagePath)) {
          imageMap.set(i, fallbackImagePath);
          
          logger.info(`Usando fallback para página ${i} (imagem original inválida)`, {
            bookId: book._id,
            pageNumber: i,
            fallbackPath: fallbackImagePath
          });
        }
      }
    }
  }

  // Calcula o tamanho total das imagens
  let totalSize = 0;
  let validImageCount = 0;
  
  for (const [pageNumber, imagePath] of imageMap.entries()) {
    if (fs.existsSync(imagePath)) {
      try {
        const size = fs.statSync(imagePath).size;
        totalSize += size;
        validImageCount++;
        
        // Obtém dimensões para logging detalhado
        try {
          const sharp = require('sharp');
          const metadata = await sharp(imagePath, { failOnError: false }).metadata();
          
          logger.info(`Imagem final para página ${pageNumber}: ${Math.round(size / 1024)}KB, ${metadata?.width || 'N/A'}x${metadata?.height || 'N/A'}, formato: ${metadata?.format || 'N/A'}`, {
            bookId: book._id,
            pageNumber,
            imagePath,
            size: Math.round(size / 1024) + 'KB',
            dimensions: metadata ? `${metadata.width}x${metadata.height}` : 'N/A',
            format: metadata?.format || 'N/A'
          });
        } catch (metadataError) {
          logger.warn(`Não foi possível obter metadados da imagem final para página ${pageNumber}`, {
            error: metadataError instanceof Error ? metadataError.message : 'Erro desconhecido',
            bookId: book._id,
            pageNumber,
            imagePath
          });
          
          logger.info(`Imagem final para página ${pageNumber}: ${Math.round(size / 1024)}KB (sem metadados)`, {
            bookId: book._id,
            pageNumber,
            imagePath,
            size: Math.round(size / 1024) + 'KB'
          });
        }
      } catch (statError) {
        logger.error(`Erro ao obter tamanho da imagem para página ${pageNumber}`, {
          error: statError instanceof Error ? statError.message : 'Erro desconhecido',
          bookId: book._id,
          pageNumber,
          imagePath
        });
      }
    } else {
      logger.error(`Imagem final para página ${pageNumber} não existe: ${imagePath}`, {
        bookId: book._id,
        pageNumber,
        imagePath
      });
    }
  }

  // Verifica se temos imagens para todas as páginas
  const missingPages = [];
  for (let i = 1; i <= book.pages.length; i++) {
    if (!imageMap.has(i)) {
      missingPages.push(i);
    }
  }
  
  if (missingPages.length > 0) {
    logger.warn(`Algumas páginas não têm imagens após processamento completo: ${missingPages.join(', ')}`, {
      bookId: book._id,
      missingPages
    });
  }

  logger.info(`Preparação de imagens concluída para o livro "${book.title}"`, {
    bookId: book._id,
    totalImagesProcessed: imageMap.size,
    totalPages: book.pages.length,
    missingPages: missingPages.length > 0 ? missingPages.join(', ') : 'Nenhuma',
    totalImageSize: Math.round(totalSize / 1024) + 'KB',
    averageImageSize: validImageCount > 0 ? Math.round(totalSize / validImageCount / 1024) + 'KB' : 'N/A'
  });

  return imageMap;
}

/**
 * Determina a fonte apropriada com base na faixa etária
 */
function getFontForAgeRange(ageRange: string): { regular: string, bold: string, size: number } {
  // Fontes mais arredondadas e grandes para crianças menores
  if (ageRange === '1-2' || ageRange === '3-4') {
    return {
      regular: 'Helvetica',
      bold: 'Helvetica-Bold',
      size: 16
    };
  }
  // Fontes intermediárias para 5-8 anos
  else if (ageRange === '5-6' || ageRange === '7-8') {
    return {
      regular: 'Helvetica',
      bold: 'Helvetica-Bold',
      size: 14
    };
  }
  // Fontes menores para crianças mais velhas
  else {
    return {
      regular: 'Helvetica',
      bold: 'Helvetica-Bold',
      size: 12
    };
  }
}

/**
 * Adiciona elementos decorativos ao PDF com base no tema e gênero
 */
function addDecorativeElements(doc: PDFKit.PDFDocument, book: IBook, theme: any, pageWidth: number, pageHeight: number) {
  const { genre, ageRange } = book;
  
  // Adiciona elementos decorativos com base no gênero
  if (genre === 'fantasy') {
    // Elementos mágicos para fantasia
    doc.save()
      .translate(pageWidth - 100, 50)
      .scale(0.5)
      .path('M50,0 C60,10 70,0 80,10 C90,20 100,10 110,20 C120,30 130,20 140,30')
      .lineWidth(3)
      .stroke(theme.accent)
      .restore();
      
    doc.save()
      .translate(50, pageHeight - 70)
      .scale(0.5)
      .path('M0,50 C10,40 20,50 30,40 C40,30 50,40 60,30 C70,20 80,30 90,20')
      .lineWidth(3)
      .stroke(theme.accent)
      .restore();
  } 
  else if (genre === 'adventure') {
    // Elementos de aventura
    doc.save()
      .translate(pageWidth - 80, 40)
      .scale(0.4)
      .path('M0,0 L20,40 L40,0 L60,40 L80,0 L100,40')
      .lineWidth(3)
      .stroke(theme.accent)
      .restore();
      
    doc.save()
      .translate(40, pageHeight - 60)
      .scale(0.4)
      .path('M0,40 L20,0 L40,40 L60,0 L80,40 L100,0')
      .lineWidth(3)
      .stroke(theme.accent)
      .restore();
  }
  else if (genre === 'mystery') {
    // Elementos de mistério
    doc.save()
      .translate(pageWidth - 100, 50)
      .scale(0.5)
      .circle(50, 25, 20)
      .lineWidth(2)
      .stroke(theme.accent)
      .restore();
      
    doc.save()
      .translate(50, pageHeight - 70)
      .scale(0.5)
      .circle(50, 25, 20)
      .lineWidth(2)
      .stroke(theme.accent)
      .restore();
  }
  
  // Adiciona elementos com base na faixa etária
  if (ageRange === '1-2' || ageRange === '3-4') {
    // Elementos mais simples e grandes para crianças pequenas
    doc.save()
      .translate(pageWidth / 2 - 100, 30)
      .scale(0.6)
      .path('M0,0 C50,-20 100,20 150,0 C200,-20 250,20 300,0')
      .lineWidth(4)
      .stroke(theme.accent)
      .restore();
  }
}

export async function generateBookPDF(book: IBook, options: PDFOptions = defaultOptions): Promise<string> {
  return new Promise(async (resolve, reject) => {
    let doc: PDFKit.PDFDocument | null = null;
    let stream: fs.WriteStream | null = null;
    
    try {
      // Pasta onde realmente salvamos o PDF
      const pdfDir = path.join(__dirname, '../../public/pdfs');
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }

      // Nome do arquivo PDF
      const pdfFilename = `${book._id}.pdf`;
      // Caminho absoluto onde criaremos o PDF
      const absolutePdfPath = path.join(pdfDir, pdfFilename);
      // Caminho relativo que vamos guardar no banco
      const relativePdfPath = `/pdfs/${pdfFilename}`;
      
      // Verifica se todas as páginas têm URLs de imagem válidas antes de começar
      const fallbackImagePath = '/assets/images/fallback-page.jpg';
      let needsSave = false;
      
      for (const page of book.pages) {
        if (!page.imageUrl || page.imageUrl === '') {
          page.imageUrl = fallbackImagePath;
          needsSave = true;
          logger.warn(`Página ${page.pageNumber} não tem URL de imagem, usando fallback`, {
            bookId: book._id,
            pageNumber: page.pageNumber
          });
        }
      }
      
      // Salva o livro se alguma página foi atualizada com imagem de fallback
      if (needsSave) {
        await book.save();
        logger.info('Livro atualizado com imagens de fallback para páginas sem imagem', {
          bookId: book._id,
          title: book.title
        });
      }

      // Prepara as imagens para o PDF
      let imageMap: Map<number, string>;
      try {
        imageMap = await prepareImages(book);
        
        // Verifica se todas as páginas têm imagens
        let allPagesHaveImages = true;
        for (let i = 1; i <= book.pages.length; i++) {
          if (!imageMap.has(i)) {
            allPagesHaveImages = false;
            logger.warn(`Página ${i} não tem imagem após preparação`, {
              bookId: book._id,
              pageNumber: i
            });
          }
        }
        
        if (!allPagesHaveImages) {
          logger.warn(`Algumas páginas não têm imagens, o PDF pode ficar incompleto`, {
            bookId: book._id,
            title: book.title
          });
        }
      } catch (imageError) {
        logger.error(`Erro ao preparar imagens para o PDF`, {
          error: imageError instanceof Error ? imageError.message : 'Erro desconhecido',
          bookId: book._id,
          title: book.title,
          stack: imageError instanceof Error ? imageError.stack : undefined
        });
        
        // Cria um mapa vazio para continuar mesmo com erro
        imageMap = new Map<number, string>();
      }

      // Determina o tema de cores com base nas preferências ou usa o padrão
      const themeKey = book.coverStyle?.theme || options.theme || 'light';
      const theme = themes[themeKey as keyof typeof themes];
      
      // Determina a fonte com base na faixa etária
      const fontSettings = getFontForAgeRange(book.ageRange);

      // Cria o stream para o PDF com tratamento de erros
      try {
        stream = fs.createWriteStream(absolutePdfPath);
        
        // Configura eventos para o stream
        stream.on('error', (streamError) => {
          logger.error(`Erro no stream do PDF`, {
            error: streamError instanceof Error ? streamError.message : 'Erro desconhecido',
            bookId: book._id,
            pdfPath: absolutePdfPath,
            stack: streamError instanceof Error ? streamError.stack : undefined
          });
        });
      } catch (streamError) {
        logger.error(`Erro ao criar stream para o PDF`, {
          error: streamError instanceof Error ? streamError.message : 'Erro desconhecido',
          bookId: book._id,
          pdfPath: absolutePdfPath,
          stack: streamError instanceof Error ? streamError.stack : undefined
        });
        return reject(streamError);
      }
      
      // Cria o documento PDF com tratamento de erros
      try {
        doc = new PDFDocument({
          size: options.format,
          margins: options.margins,
          autoFirstPage: false,
          bufferPages: true, // Permite modificar páginas após criação
          info: {
            Title: book.title,
            Author: book.authorName || 'Anônimo',
            Subject: `Livro infantil - ${book.genre} - ${book.theme}`,
            Keywords: `livro infantil, ${book.genre}, ${book.theme}, ${book.ageRange} anos`,
            Creator: 'Sistema de Geração de Histórias em Quadrinhos',
            Producer: 'PDFKit',
            CreationDate: new Date()
          }
        });
        
        // Pipe para o stream
        doc.pipe(stream);
        
        // Adiciona listeners de erro ao documento
        doc.on('error', (docError) => {
          logger.error(`Erro no documento PDF durante geração`, {
            error: docError instanceof Error ? docError.message : 'Erro desconhecido',
            bookId: book._id,
            stack: docError instanceof Error ? docError.stack : undefined
          });
        });
      } catch (pdfError) {
        logger.error(`Erro ao criar documento PDF`, {
          error: pdfError instanceof Error ? pdfError.message : 'Erro desconhecido',
          bookId: book._id,
          title: book.title,
          stack: pdfError instanceof Error ? pdfError.stack : undefined
        });
        
        // Fecha o stream se já foi criado
        if (stream) {
          try {
            stream.end();
          } catch (closeError) {
            logger.error(`Erro ao fechar stream após falha na criação do PDF`, {
              error: closeError instanceof Error ? closeError.message : 'Erro desconhecido'
            });
          }
        }
        
        // Rejeita a promessa com o erro
        return reject(pdfError);
      }

      // Configura dimensões da página
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      try {
        // ===== CAPA DO LIVRO =====
        doc.addPage();
        
        // Estilos de capa
        const coverStyle = book.coverStyle || {};
        const backgroundColor = coverStyle.backgroundColor || theme.background;
        const titleColor = coverStyle.titleColor || theme.title;
        const authorColor = coverStyle.authorColor || theme.text;
        const titleFontSize = coverStyle.titleFontSize || 32;
        const authorFontSize = coverStyle.authorFontSize || 16;
        const coverImageStyle = coverStyle.coverImageStyle || {};

        // Adiciona cor de fundo
        doc
          .rect(0, 0, pageWidth, pageHeight)
          .fill(backgroundColor);

        // Adiciona borda decorativa
        doc
          .rect(20, 20, pageWidth - 40, pageHeight - 40)
          .lineWidth(3)
          .stroke(theme.border);

        // Adiciona elementos decorativos com base no tema e gênero
        addDecorativeElements(doc, book, theme, pageWidth, pageHeight);

        // Adiciona imagem de capa
        if (imageMap.has(1)) {
          try {
            const coverImagePath = imageMap.get(1);
            if (coverImagePath) {
              const imageWidth = pageWidth * (coverImageStyle.width || 0.7);
              const imageHeight = pageHeight * (coverImageStyle.height || 0.5);
              const opacity = coverImageStyle.opacity || 1;

              doc.opacity(opacity);
              doc.image(coverImagePath, {
                width: imageWidth,
                height: imageHeight,
                align: 'center',
                valign: 'center',
                x: (pageWidth - imageWidth) / 2,
                y: pageHeight * 0.25
              });
              doc.opacity(1); // Restaura opacidade
            }
          } catch (imgErr) {
            logger.warn('Erro ao adicionar imagem de capa', { 
              error: imgErr instanceof Error ? imgErr.message : 'Erro desconhecido',
              bookId: book._id,
              pageNumber: 1
            });
          }
        } else {
          logger.warn('Imagem de capa não disponível', { 
            bookId: book._id,
            title: book.title
          });
        }

        // Título do livro
        doc
          .fontSize(titleFontSize)
          .font('Helvetica-Bold')
          .fillColor(titleColor)
          .text(book.title, {
            align: 'center',
            y: 100
          });

        // Autor
        doc
          .fontSize(authorFontSize)
          .font('Helvetica')
          .fillColor(authorColor)
          .text(`por ${book.authorName || 'Anônimo'}`, {
            align: 'center',
            y: pageHeight - 120
          });

        // Adiciona informações adicionais
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor(authorColor)
          .text(`Gênero: ${book.genre} | Tema: ${book.theme} | Faixa etária: ${book.ageRange} anos`, {
            align: 'center',
            y: pageHeight - 80
          });

        // ===== PÁGINAS DO LIVRO =====
        const layout = options.layout || 'picture-book';
        
        for (const page of book.pages) {
          try {
            doc.addPage();
            
            // Adiciona cor de fundo
            doc
              .rect(0, 0, pageWidth, pageHeight)
              .fill(backgroundColor);
              
            // Adiciona número da página
            doc
              .fontSize(10)
              .font('Helvetica')
              .fillColor(theme.text)
              .text(`${page.pageNumber}`, {
                align: 'center',
                y: pageHeight - 40
              });
              
            // Adiciona elementos decorativos sutis
            doc
              .rect(30, 30, pageWidth - 60, pageHeight - 60)
              .lineWidth(1)
              .stroke(theme.border);
              
            // Adiciona conteúdo com base no layout escolhido
            if (layout === 'picture-book') {
              // Layout de livro ilustrado: imagem grande no topo, texto abaixo
              if (imageMap.has(page.pageNumber)) {
                try {
                  const imagePath = imageMap.get(page.pageNumber);
                  if (imagePath && fs.existsSync(imagePath) && fs.statSync(imagePath).size > 0) {
                    // Calcula dimensões ideais para a imagem no PDF
                    const maxWidth = pageWidth - 100;
                    const maxHeight = pageHeight * 0.5;
                    
                    // Obtém as dimensões reais da imagem
                    let imageWidth, imageHeight;
                    try {
                      const sharp = require('sharp');
                      const metadata = await sharp(imagePath).metadata();
                      imageWidth = metadata.width;
                      imageHeight = metadata.height;
                    } catch (metadataError) {
                      // Se não conseguir obter as dimensões, usa valores padrão
                      logger.warn(`Não foi possível obter dimensões da imagem: ${metadataError.message}`, {
                        imagePath
                      });
                      imageWidth = maxWidth;
                      imageHeight = maxHeight;
                    }
                    
                    // Calcula as dimensões proporcionais para caber no espaço disponível
                    let finalWidth, finalHeight;
                    if (imageWidth && imageHeight) {
                      const imageRatio = imageWidth / imageHeight;
                      const maxRatio = maxWidth / maxHeight;
                      
                      if (imageRatio > maxRatio) {
                        // Imagem mais larga que alta
                        finalWidth = maxWidth;
                        finalHeight = maxWidth / imageRatio;
                      } else {
                        // Imagem mais alta que larga
                        finalHeight = maxHeight;
                        finalWidth = maxHeight * imageRatio;
                      }
                    } else {
                      // Usa valores padrão se não tiver dimensões
                      finalWidth = maxWidth;
                      finalHeight = maxHeight;
                    }
                    
                    // Centraliza a imagem horizontalmente
                    const xPosition = (pageWidth - finalWidth) / 2;
                    
                    // Adiciona a imagem com as dimensões calculadas
                    try {
                      // Verifica se a imagem existe e tem conteúdo
                      if (fs.existsSync(imagePath) && fs.statSync(imagePath).size > 0) {
                        // Verifica se a imagem é válida antes de adicioná-la
                        try {
                          // Tenta ler a imagem com sharp para validar
                          const sharp = require('sharp');
                          const buffer = await sharp(imagePath).toBuffer();
                          
                          if (buffer && buffer.length > 0) {
                            // Tenta adicionar a imagem com tratamento de erros
                            doc.image(imagePath, {
                              width: finalWidth,
                              height: finalHeight,
                              x: xPosition,
                              y: 50,
                              fit: [finalWidth, finalHeight]
                            });
                            
                            logger.info(`Imagem adicionada ao PDF com dimensões otimizadas: ${finalWidth}x${finalHeight}`, {
                              pageNumber: page.pageNumber,
                              imagePath
                            });
                          } else {
                            throw new Error('Imagem inválida após verificação com sharp');
                          }
                        } catch (validationError) {
                          logger.error(`Erro ao validar imagem antes de adicionar ao PDF: ${validationError instanceof Error ? validationError.message : 'Erro desconhecido'}`, {
                            pageNumber: page.pageNumber,
                            imagePath
                          });
                          
                          // Adiciona um retângulo colorido como fallback visual
                          doc.save()
                            .rect(xPosition, 50, finalWidth, finalHeight)
                            .fillAndStroke('#f0f0f0', '#cccccc')
                            .fontSize(12)
                            .fillColor('#666666')
                            .text('Imagem não disponível', xPosition + finalWidth/2 - 60, 50 + finalHeight/2 - 10)
                            .restore();
                        }
                      } else {
                        throw new Error(`Arquivo de imagem vazio ou inexistente: ${imagePath}`);
                      }
                    } catch (imageError) {
                      logger.error(`Erro ao adicionar imagem ao PDF: ${imageError instanceof Error ? imageError.message : 'Erro desconhecido'}`, {
                        pageNumber: page.pageNumber,
                        imagePath,
                        stack: imageError instanceof Error ? imageError.stack : undefined
                      });
                      
                      // Adiciona um retângulo colorido como fallback visual
                      doc.save()
                        .rect(xPosition, 50, finalWidth, finalHeight)
                        .fillAndStroke('#f0f0f0', '#cccccc')
                        .fontSize(12)
                        .fillColor('#666666')
                        .text('Imagem não disponível', xPosition + finalWidth/2 - 60, 50 + finalHeight/2 - 10)
                        .restore();
                    }
                  } else {
                    logger.warn(`Imagem para página ${page.pageNumber} não existe, está vazia ou corrompida`, {
                      bookId: book._id,
                      pageNumber: page.pageNumber,
                      imagePath: imagePath || 'undefined'
                    });
                  }
                } catch (imgErr: any) {
                  logger.error(`Erro ao adicionar imagem na página ${page.pageNumber}: ${imgErr.message}`, {
                    error: imgErr.message,
                    stack: imgErr.stack,
                    bookId: book._id,
                    pageNumber: page.pageNumber
                  });
                }
              } else {
                logger.warn(`Nenhuma imagem disponível para página ${page.pageNumber}`, {
                  bookId: book._id,
                  pageNumber: page.pageNumber
                });
              }
              
              // Texto abaixo da imagem
              doc
                .fontSize(fontSettings.size)
                .font(fontSettings.regular)
                .fillColor(theme.text)
                .text(page.text || '', {
                  align: 'justify',
                  width: pageWidth - 100,
                  x: 50,
                  y: pageHeight * 0.6,
                  paragraphGap: 10,
                  lineGap: 5
                });
            } 
            else if (layout === 'comic') {
              // Layout de quadrinhos: imagem e texto intercalados
              const paragraphs = (page.text || '').split('\n\n');
              let yPosition = 50;
              
              if (paragraphs.length > 0 && imageMap.has(page.pageNumber)) {
                // Divide o texto e a imagem
                const firstPart = paragraphs.slice(0, Math.ceil(paragraphs.length / 2)).join('\n\n');
                const secondPart = paragraphs.slice(Math.ceil(paragraphs.length / 2)).join('\n\n');
                
                // Primeira parte do texto
                doc
                  .fontSize(fontSettings.size)
                  .font(fontSettings.regular)
                  .fillColor(theme.text)
                  .text(firstPart, {
                    align: 'justify',
                    width: pageWidth - 100,
                    x: 50,
                    y: yPosition,
                    paragraphGap: 10,
                    lineGap: 5
                  });
                  
                yPosition += doc.heightOfString(firstPart, {
                  width: pageWidth - 100,
                  paragraphGap: 10,
                  lineGap: 5
                }) + 20;
                
                // Adiciona imagem no meio
                try {
                  const imagePath = imageMap.get(page.pageNumber);
                  if (imagePath && fs.existsSync(imagePath) && fs.statSync(imagePath).size > 0) {
                    // Calcula o espaço disponível para a imagem
                    const maxWidth = pageWidth - 100;
                    const maxHeight = pageHeight * 0.3;
                    
                    // Obtém as dimensões reais da imagem
                    let imageWidth, imageHeight;
                    try {
                      const sharp = require('sharp');
                      const metadata = await sharp(imagePath).metadata();
                      imageWidth = metadata.width;
                      imageHeight = metadata.height;
                    } catch (metadataError) {
                      // Se não conseguir obter as dimensões, usa valores padrão
                      logger.warn(`Não foi possível obter dimensões da imagem: ${metadataError.message}`, {
                        imagePath
                      });
                      imageWidth = maxWidth;
                      imageHeight = maxHeight;
                    }
                    
                    // Calcula as dimensões proporcionais para caber no espaço disponível
                    let finalWidth, finalHeight;
                    if (imageWidth && imageHeight) {
                      const imageRatio = imageWidth / imageHeight;
                      const maxRatio = maxWidth / maxHeight;
                      
                      if (imageRatio > maxRatio) {
                        // Imagem mais larga que alta
                        finalWidth = maxWidth;
                        finalHeight = maxWidth / imageRatio;
                      } else {
                        // Imagem mais alta que larga
                        finalHeight = maxHeight;
                        finalWidth = maxHeight * imageRatio;
                      }
                    } else {
                      // Usa valores padrão se não tiver dimensões
                      finalWidth = maxWidth;
                      finalHeight = maxHeight;
                    }
                    
                    // Centraliza a imagem horizontalmente
                    const xPosition = (pageWidth - finalWidth) / 2;
                    
                    // Adiciona a imagem com as dimensões calculadas
                    try {
                      // Verifica se a imagem existe e tem conteúdo
                      if (fs.existsSync(imagePath) && fs.statSync(imagePath).size > 0) {
                        // Verifica se a imagem é válida antes de adicioná-la
                        try {
                          // Tenta ler a imagem com sharp para validar
                          const sharp = require('sharp');
                          const buffer = await sharp(imagePath, { failOnError: false }).toBuffer();
                          
                          if (buffer && buffer.length > 0) {
                            // Tenta adicionar a imagem com tratamento de erros
                            try {
                              doc.image(imagePath, {
                                width: finalWidth,
                                height: finalHeight,
                                x: xPosition,
                                y: yPosition
                              });
                              
                              logger.info(`Imagem adicionada ao PDF com dimensões otimizadas: ${finalWidth}x${finalHeight}`, {
                                pageNumber: page.pageNumber,
                                imagePath
                              });
                            } catch (pdfkitError) {
                              logger.error(`Erro do PDFKit ao adicionar imagem: ${pdfkitError instanceof Error ? pdfkitError.message : 'Erro desconhecido'}`, {
                                pageNumber: page.pageNumber,
                                imagePath,
                                stack: pdfkitError instanceof Error ? pdfkitError.stack : undefined
                              });
                              
                              // Tenta converter a imagem para um formato mais simples e tentar novamente
                              try {
                                const simplifiedPath = path.join(path.dirname(imagePath), `simplified_${path.basename(imagePath)}`);
                                await sharp(buffer)
                                  .jpeg({ quality: 80 })
                                  .toFile(simplifiedPath);
                                
                                doc.image(simplifiedPath, {
                                  width: finalWidth,
                                  height: finalHeight,
                                  x: xPosition,
                                  y: yPosition
                                });
                                
                                logger.info(`Imagem simplificada adicionada ao PDF com sucesso: ${finalWidth}x${finalHeight}`, {
                                  pageNumber: page.pageNumber,
                                  imagePath: simplifiedPath
                                });
                              } catch (retryError) {
                                logger.error(`Falha também na tentativa com imagem simplificada: ${retryError instanceof Error ? retryError.message : 'Erro desconhecido'}`, {
                                  pageNumber: page.pageNumber,
                                  stack: retryError instanceof Error ? retryError.stack : undefined
                                });
                                
                                // Adiciona um retângulo colorido como fallback visual
                                doc.save()
                                  .rect(xPosition, yPosition, finalWidth, finalHeight)
                                  .fillAndStroke('#f0f0f0', '#cccccc')
                                  .fontSize(12)
                                  .fillColor('#666666')
                                  .text('Imagem não disponível', xPosition + finalWidth/2 - 60, yPosition + finalHeight/2 - 10)
                                  .restore();
                              }
                            }
                          } else {
                            throw new Error('Imagem inválida após verificação com sharp');
                          }
                        } catch (validationError) {
                          logger.error(`Erro ao validar imagem antes de adicionar ao PDF: ${validationError instanceof Error ? validationError.message : 'Erro desconhecido'}`, {
                            pageNumber: page.pageNumber,
                            imagePath,
                            stack: validationError instanceof Error ? validationError.stack : undefined
                          });
                          
                          // Adiciona um retângulo colorido como fallback visual
                          doc.save()
                            .rect(xPosition, yPosition, finalWidth, finalHeight)
                            .fillAndStroke('#f0f0f0', '#cccccc')
                            .fontSize(12)
                            .fillColor('#666666')
                            .text('Imagem não disponível', xPosition + finalWidth/2 - 60, yPosition + finalHeight/2 - 10)
                            .restore();
                        }
                      } else {
                        throw new Error(`Arquivo de imagem vazio ou inexistente: ${imagePath}`);
                      }
                    } catch (imageError) {
                      logger.error(`Erro ao adicionar imagem ao PDF: ${imageError instanceof Error ? imageError.message : 'Erro desconhecido'}`, {
                        pageNumber: page.pageNumber,
                        imagePath,
                        stack: imageError instanceof Error ? imageError.stack : undefined
                      });
                      
                      // Adiciona um retângulo colorido como fallback visual
                      doc.save()
                        .rect(xPosition, yPosition, finalWidth, finalHeight)
                        .fillAndStroke('#f0f0f0', '#cccccc')
                        .fontSize(12)
                        .fillColor('#666666')
                        .text('Imagem não disponível', xPosition + finalWidth/2 - 60, yPosition + finalHeight/2 - 10)
                        .restore();
                    }
                    
                    yPosition += finalHeight + 20;
                  } else {
                    logger.warn(`Imagem para página ${page.pageNumber} não existe, está vazia ou corrompida`, {
                      bookId: book._id,
                      pageNumber: page.pageNumber,
                      imagePath: imagePath || 'undefined'
                    });
                    yPosition += 20; // Adiciona um espaço mesmo sem imagem
                  }
                } catch (imgErr: any) {
                  logger.error(`Erro ao adicionar imagem na página ${page.pageNumber}: ${imgErr.message}`, {
                    error: imgErr.message,
                    stack: imgErr.stack,
                    bookId: book._id,
                    pageNumber: page.pageNumber
                  });
                  yPosition += 20; // Adiciona um espaço mesmo sem imagem
                }
                
                // Segunda parte do texto
                doc
                  .fontSize(fontSettings.size)
                  .font(fontSettings.regular)
                  .fillColor(theme.text)
                  .text(secondPart, {
                    align: 'justify',
                    width: pageWidth - 100,
                    x: 50,
                    y: yPosition,
                    paragraphGap: 10,
                    lineGap: 5
                  });
              } else {
                // Fallback para layout padrão se não houver parágrafos suficientes
                if (imageMap.has(page.pageNumber)) {
                  try {
                    const imagePath = imageMap.get(page.pageNumber)!;
                    if (fs.existsSync(imagePath) && fs.statSync(imagePath).size > 0) {
                      // Calcula o espaço disponível para a imagem
                      const maxWidth = pageWidth - 100;
                      const maxHeight = pageHeight * 0.4;
                      
                      // Obtém as dimensões reais da imagem
                      let imageWidth, imageHeight;
                      try {
                        const sharp = require('sharp');
                        const metadata = await sharp(imagePath).metadata();
                        imageWidth = metadata.width;
                        imageHeight = metadata.height;
                      } catch (metadataError) {
                        // Se não conseguir obter as dimensões, usa valores padrão
                        logger.warn(`Não foi possível obter dimensões da imagem: ${metadataError.message}`, {
                          imagePath
                        });
                        imageWidth = maxWidth;
                        imageHeight = maxHeight;
                      }
                      
                      // Calcula as dimensões proporcionais para caber no espaço disponível
                      let finalWidth, finalHeight;
                      if (imageWidth && imageHeight) {
                        const imageRatio = imageWidth / imageHeight;
                        const maxRatio = maxWidth / maxHeight;
                        
                        if (imageRatio > maxRatio) {
                          // Imagem mais larga que alta
                          finalWidth = maxWidth;
                          finalHeight = maxWidth / imageRatio;
                        } else {
                          // Imagem mais alta que larga
                          finalHeight = maxHeight;
                          finalWidth = maxHeight * imageRatio;
                        }
                      } else {
                        // Usa valores padrão se não tiver dimensões
                        finalWidth = maxWidth;
                        finalHeight = maxHeight;
                      }
                      
                      // Centraliza a imagem horizontalmente
                      const xPosition = (pageWidth - finalWidth) / 2;
                      
                      // Adiciona a imagem com as dimensões calculadas
                      doc.image(imagePath, {
                        width: finalWidth,
                        height: finalHeight,
                        x: xPosition,
                        y: 50
                      });
                      
                      logger.info(`Imagem adicionada ao PDF com dimensões otimizadas: ${finalWidth}x${finalHeight}`, {
                        pageNumber: page.pageNumber,
                        imagePath
                      });
                      
                      yPosition = 50 + finalHeight + 20;
                    } else {
                      logger.warn(`Imagem para página ${page.pageNumber} existe mas está vazia ou corrompida`, {
                        bookId: book._id,
                        pageNumber: page.pageNumber,
                        imagePath
                      });
                    }
                  } catch (imgErr: any) {
                    logger.error(`Erro ao adicionar imagem na página ${page.pageNumber}: ${imgErr.message}`, {
                      error: imgErr.message,
                      stack: imgErr.stack,
                      bookId: book._id,
                      pageNumber: page.pageNumber
                    });
                  }
                } else {
                  logger.warn(`Nenhuma imagem disponível para página ${page.pageNumber}`, {
                    bookId: book._id,
                    pageNumber: page.pageNumber
                  });
                }
                
                doc
                  .fontSize(fontSettings.size)
                  .font(fontSettings.regular)
                  .fillColor(theme.text)
                  .text(page.text || '', {
                    align: 'justify',
                    width: pageWidth - 100,
                    x: 50,
                    y: yPosition,
                    paragraphGap: 10,
                    lineGap: 5
                  });
              }
            }
            else {
              // Layout padrão: texto no topo, imagem abaixo
              doc
                .fontSize(fontSettings.size)
                .font(fontSettings.regular)
                .fillColor(theme.text)
                .text(page.text || '', {
                  align: 'justify',
                  width: pageWidth - 100,
                  x: 50,
                  y: 50,
                  paragraphGap: 10,
                  lineGap: 5
                });
                
              if (imageMap.has(page.pageNumber)) {
                try {
                  const textHeight = doc.y - 50;
                  const imagePath = imageMap.get(page.pageNumber);
                  if (imagePath && fs.existsSync(imagePath) && fs.statSync(imagePath).size > 0) {
                    // Calcula o espaço disponível para a imagem
                    const availableHeight = pageHeight - textHeight - 100;
                    const maxWidth = pageWidth - 100;
                    
                    // Obtém as dimensões reais da imagem
                    let imageWidth, imageHeight;
                    try {
                      const sharp = require('sharp');
                      const metadata = await sharp(imagePath).metadata();
                      imageWidth = metadata.width;
                      imageHeight = metadata.height;
                    } catch (metadataError) {
                      // Se não conseguir obter as dimensões, usa valores padrão
                      logger.warn(`Não foi possível obter dimensões da imagem: ${metadataError.message}`, {
                        imagePath
                      });
                      imageWidth = maxWidth;
                      imageHeight = availableHeight;
                    }
                    
                    // Calcula as dimensões proporcionais para caber no espaço disponível
                    let finalWidth, finalHeight;
                    if (imageWidth && imageHeight) {
                      const imageRatio = imageWidth / imageHeight;
                      const maxRatio = maxWidth / availableHeight;
                      
                      if (imageRatio > maxRatio) {
                        // Imagem mais larga que alta
                        finalWidth = maxWidth;
                        finalHeight = maxWidth / imageRatio;
                      } else {
                        // Imagem mais alta que larga
                        finalHeight = Math.min(availableHeight, imageHeight);
                        finalWidth = finalHeight * imageRatio;
                      }
                    } else {
                      // Usa valores padrão se não tiver dimensões
                      finalWidth = maxWidth;
                      finalHeight = Math.min(availableHeight, maxWidth * 0.75);
                    }
                    
                    // Centraliza a imagem horizontalmente
                    const xPosition = (pageWidth - finalWidth) / 2;
                    
                    // Adiciona a imagem com as dimensões calculadas
                    try {
                      // Verifica se a imagem existe e tem conteúdo
                      if (fs.existsSync(imagePath) && fs.statSync(imagePath).size > 0) {
                        // Verifica se a imagem é válida antes de adicioná-la
                        try {
                          // Tenta ler a imagem com sharp para validar
                          const sharp = require('sharp');
                          const buffer = await sharp(imagePath, { failOnError: false }).toBuffer();
                          
                          if (buffer && buffer.length > 0) {
                            // Tenta adicionar a imagem com tratamento de erros
                            try {
                              doc.image(imagePath, {
                                width: finalWidth,
                                height: finalHeight,
                                x: xPosition,
                                y: textHeight + 70
                              });
                              
                              logger.info(`Imagem adicionada ao PDF com dimensões otimizadas: ${finalWidth}x${finalHeight}`, {
                                pageNumber: page.pageNumber,
                                imagePath
                              });
                            } catch (pdfkitError) {
                              logger.error(`Erro do PDFKit ao adicionar imagem: ${pdfkitError instanceof Error ? pdfkitError.message : 'Erro desconhecido'}`, {
                                pageNumber: page.pageNumber,
                                imagePath,
                                stack: pdfkitError instanceof Error ? pdfkitError.stack : undefined
                              });
                              
                              // Tenta converter a imagem para um formato mais simples e tentar novamente
                              try {
                                const simplifiedPath = path.join(path.dirname(imagePath), `simplified_${path.basename(imagePath)}`);
                                await sharp(buffer)
                                  .jpeg({ quality: 80 })
                                  .toFile(simplifiedPath);
                                
                                doc.image(simplifiedPath, {
                                  width: finalWidth,
                                  height: finalHeight,
                                  x: xPosition,
                                  y: textHeight + 70
                                });
                                
                                logger.info(`Imagem simplificada adicionada ao PDF com sucesso: ${finalWidth}x${finalHeight}`, {
                                  pageNumber: page.pageNumber,
                                  imagePath: simplifiedPath
                                });
                              } catch (retryError) {
                                logger.error(`Falha também na tentativa com imagem simplificada: ${retryError instanceof Error ? retryError.message : 'Erro desconhecido'}`, {
                                  pageNumber: page.pageNumber,
                                  stack: retryError instanceof Error ? retryError.stack : undefined
                                });
                                
                                // Adiciona um retângulo colorido como fallback visual
                                doc.save()
                                  .rect(xPosition, textHeight + 70, finalWidth, finalHeight)
                                  .fillAndStroke('#f0f0f0', '#cccccc')
                                  .fontSize(12)
                                  .fillColor('#666666')
                                  .text('Imagem não disponível', xPosition + finalWidth/2 - 60, textHeight + 70 + finalHeight/2 - 10)
                                  .restore();
                              }
                            }
                          } else {
                            throw new Error('Imagem inválida após verificação com sharp');
                          }
                        } catch (validationError) {
                          logger.error(`Erro ao validar imagem antes de adicionar ao PDF: ${validationError instanceof Error ? validationError.message : 'Erro desconhecido'}`, {
                            pageNumber: page.pageNumber,
                            imagePath,
                            stack: validationError instanceof Error ? validationError.stack : undefined
                          });
                          
                          // Adiciona um retângulo colorido como fallback visual
                          doc.save()
                            .rect(xPosition, textHeight + 70, finalWidth, finalHeight)
                            .fillAndStroke('#f0f0f0', '#cccccc')
                            .fontSize(12)
                            .fillColor('#666666')
                            .text('Imagem não disponível', xPosition + finalWidth/2 - 60, textHeight + 70 + finalHeight/2 - 10)
                            .restore();
                        }
                      } else {
                        throw new Error(`Arquivo de imagem vazio ou inexistente: ${imagePath}`);
                      }
                    } catch (imageError) {
                      logger.error(`Erro ao adicionar imagem ao PDF: ${imageError instanceof Error ? imageError.message : 'Erro desconhecido'}`, {
                        pageNumber: page.pageNumber,
                        imagePath,
                        stack: imageError instanceof Error ? imageError.stack : undefined
                      });
                      
                      // Adiciona um retângulo colorido como fallback visual
                      doc.save()
                        .rect(xPosition, textHeight + 70, finalWidth, finalHeight)
                        .fillAndStroke('#f0f0f0', '#cccccc')
                        .fontSize(12)
                        .fillColor('#666666')
                        .text('Imagem não disponível', xPosition + finalWidth/2 - 60, textHeight + 70 + finalHeight/2 - 10)
                        .restore();
                    }
                  } else {
                    logger.warn(`Imagem para página ${page.pageNumber} não existe, está vazia ou corrompida`, {
                      bookId: book._id,
                      pageNumber: page.pageNumber,
                      imagePath: imagePath || 'undefined'
                    });
                  }
                } catch (imgErr: any) {
                  logger.error(`Erro ao adicionar imagem na página ${page.pageNumber}: ${imgErr.message}`, {
                    error: imgErr.message,
                    stack: imgErr.stack,
                    bookId: book._id,
                    pageNumber: page.pageNumber
                  });
                }
              } else {
                logger.warn(`Nenhuma imagem disponível para página ${page.pageNumber}`, {
                  bookId: book._id,
                  pageNumber: page.pageNumber
                });
              }
            }
          } catch (pageError) {
            logger.error(`Erro ao gerar página ${page.pageNumber} do PDF`, {
              error: pageError instanceof Error ? pageError.message : 'Erro desconhecido',
              bookId: book._id,
              pageNumber: page.pageNumber,
              stack: pageError instanceof Error ? pageError.stack : undefined
            });
            
            // Continua para a próxima página mesmo com erro
            continue;
          }
        }
        
        // Adiciona página final com informações do livro
        doc.addPage();
        
        // Adiciona cor de fundo
        doc
          .rect(0, 0, pageWidth, pageHeight)
          .fill(backgroundColor);
          
        // Adiciona borda decorativa
        doc
          .rect(30, 30, pageWidth - 60, pageHeight - 60)
          .lineWidth(2)
          .stroke(theme.border);
          
        // Título
        doc
          .fontSize(24)
          .font('Helvetica-Bold')
          .fillColor(theme.title)
          .text('Sobre este livro', {
            align: 'center',
            y: 100
          });
          
        // Informações do livro
        doc
          .fontSize(12)
          .font('Helvetica')
          .fillColor(theme.text)
          .moveDown(2)
          .text(`Título: ${book.title}`, {
            align: 'left',
            width: pageWidth - 100,
            x: 50
          })
          .moveDown()
          .text(`Autor: ${book.authorName || 'Anônimo'}`, {
            align: 'left',
            width: pageWidth - 100,
            x: 50
          })
          .moveDown()
          .text(`Gênero: ${book.genre}`, {
            align: 'left',
            width: pageWidth - 100,
            x: 50
          })
          .moveDown()
          .text(`Tema: ${book.theme}`, {
            align: 'left',
            width: pageWidth - 100,
            x: 50
          })
          .moveDown()
          .text(`Personagem principal: ${book.mainCharacter}`, {
            align: 'left',
            width: pageWidth - 100,
            x: 50
          });
          
        if (book.secondaryCharacter) {
          doc
            .moveDown()
            .text(`Personagem secundário: ${book.secondaryCharacter}`, {
              align: 'left',
              width: pageWidth - 100,
              x: 50
            });
        }
        
        doc
          .moveDown()
          .text(`Cenário: ${book.setting}`, {
            align: 'left',
            width: pageWidth - 100,
            x: 50
          })
          .moveDown()
          .text(`Faixa etária: ${book.ageRange} anos`, {
            align: 'left',
            width: pageWidth - 100,
            x: 50
          })
          .moveDown(2)
          .text(`Criado em: ${new Date(book.createdAt || Date.now()).toLocaleDateString('pt-BR')}`, {
            align: 'left',
            width: pageWidth - 100,
            x: 50
          });
          
        // Rodapé
        doc
          .fontSize(10)
          .font('Helvetica-Oblique')
          .fillColor(theme.text)
          .text('Este livro foi gerado automaticamente com tecnologia de inteligência artificial.', {
            align: 'center',
            y: pageHeight - 100
          });

        // Finaliza o documento
        doc.end();
      } catch (docError) {
        logger.error(`Erro ao gerar conteúdo do PDF`, {
          error: docError instanceof Error ? docError.message : 'Erro desconhecido',
          bookId: book._id,
          title: book.title,
          stack: docError instanceof Error ? docError.stack : undefined
        });
        
        // Tenta finalizar o documento mesmo com erro
        try {
          if (doc) doc.end();
        } catch (endError) {
          logger.error(`Erro ao finalizar documento PDF após erro`, {
            error: endError instanceof Error ? endError.message : 'Erro desconhecido',
            bookId: book._id,
            title: book.title
          });
        }
        
        // Rejeita a promessa com o erro
        return reject(docError);
      }

      // Eventos do stream
      stream.on('finish', async () => {
        try {
          // Verifica se o PDF foi gerado corretamente
          if (fs.existsSync(absolutePdfPath) && fs.statSync(absolutePdfPath).size > 0) {
            // Tenta abrir o PDF para verificar se está corrompido
            try {
              const pdfBuffer = fs.readFileSync(absolutePdfPath);
              // Verifica se o PDF tem pelo menos os bytes de cabeçalho corretos
              if (pdfBuffer.length > 5 && 
                  pdfBuffer[0] === 0x25 && // %
                  pdfBuffer[1] === 0x50 && // P
                  pdfBuffer[2] === 0x44 && // D
                  pdfBuffer[3] === 0x46 && // F
                  pdfBuffer[4] === 0x2D) { // -
                
                logger.info('PDF validado com sucesso', { 
                  bookId: book._id, 
                  pdfPath: relativePdfPath,
                  fileSize: Math.round(fs.statSync(absolutePdfPath).size / 1024) + 'KB'
                });
              } else {
                logger.error('PDF gerado mas parece estar corrompido (cabeçalho inválido)', {
                  bookId: book._id,
                  pdfPath: absolutePdfPath,
                  fileSize: Math.round(fs.statSync(absolutePdfPath).size / 1024) + 'KB'
                });
                
                // Mesmo com erro, vamos retornar o caminho para que o usuário possa tentar visualizar
                resolve(relativePdfPath);
                return;
              }
            } catch (validationError) {
              logger.error('Erro ao validar PDF gerado', {
                error: validationError instanceof Error ? validationError.message : 'Erro desconhecido',
                bookId: book._id,
                pdfPath: absolutePdfPath,
                stack: validationError instanceof Error ? validationError.stack : undefined
              });
              
              // Mesmo com erro, vamos retornar o caminho para que o usuário possa tentar visualizar
              resolve(relativePdfPath);
              return;
            }
            
            // Limpa as imagens temporárias
            try {
              const bookTempDir = path.join(__dirname, '../../temp', book._id.toString());
              if (fs.existsSync(bookTempDir)) {
                // Limpa apenas os arquivos deste livro específico
                await imageOptimizer.cleanupTempFiles(bookTempDir, 1); // Limpa arquivos com mais de 1 hora
              }
              
              // Também limpa arquivos antigos do diretório temp geral
              const tempDir = path.join(__dirname, '../../temp');
              if (fs.existsSync(tempDir)) {
                await imageOptimizer.cleanupTempFiles(tempDir, 24); // Limpa arquivos com mais de 24 horas
              }
            } catch (cleanupError) {
              logger.warn(`Erro ao limpar arquivos temporários: ${cleanupError instanceof Error ? cleanupError.message : 'Erro desconhecido'}`, {
                error: cleanupError instanceof Error ? cleanupError.stack : undefined
              });
            }

            logger.info('PDF gerado com sucesso', { 
              bookId: book._id, 
              pdfPath: relativePdfPath,
              absolutePdfPath,
              fileSize: Math.round(fs.statSync(absolutePdfPath).size / 1024) + 'KB'
            });
            
            // Retorna apenas o caminho relativo
            resolve(relativePdfPath);
          } else {
            logger.error('PDF gerado mas arquivo está vazio ou não existe', {
              bookId: book._id,
              pdfPath: absolutePdfPath,
              exists: fs.existsSync(absolutePdfPath),
              size: fs.existsSync(absolutePdfPath) ? fs.statSync(absolutePdfPath).size : 0
            });
            
            reject(new Error('PDF gerado mas arquivo está vazio ou não existe'));
          }
        } catch (finishError) {
          logger.error('Erro ao finalizar geração do PDF', {
            error: finishError instanceof Error ? finishError.message : 'Erro desconhecido',
            bookId: book._id,
            stack: finishError instanceof Error ? finishError.stack : undefined
          });
          
          reject(finishError);
        }
      });

      stream.on('error', (err) => {
        logger.error('Erro no stream do PDF', { 
          error: err instanceof Error ? err.message : 'Erro desconhecido',
          stack: err instanceof Error ? err.stack : undefined,
          bookId: book._id
        });
        
        // Tenta fechar recursos em caso de erro
        if (doc) {
          try {
            doc.end();
          } catch (docError) {
            logger.error('Erro ao fechar documento PDF após erro no stream', {
              error: docError instanceof Error ? docError.message : 'Erro desconhecido'
            });
          }
        }
        
        reject(err);
      });
    } catch (error: any) {
      // Tenta fechar recursos abertos em caso de erro
      try {
        if (doc) doc.end();
      } catch (e) {
        logger.error('Erro ao fechar documento PDF após erro geral', {
          error: e instanceof Error ? e.message : 'Erro desconhecido',
          stack: e instanceof Error ? e.stack : undefined
        });
      }
      
      try {
        if (stream && !stream.closed) stream.end();
      } catch (e) {
        logger.error('Erro ao fechar stream após erro geral', {
          error: e instanceof Error ? e.message : 'Erro desconhecido',
          stack: e instanceof Error ? e.stack : undefined
        });
      }
      
      logger.error('Erro completo ao gerar PDF', { 
        bookId: book._id, 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      reject(error);
    }
  });
}