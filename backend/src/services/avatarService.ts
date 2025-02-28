import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import sharp from 'sharp';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/config';

class AvatarService {
  private readonly AVATARS_DIR = path.join(__dirname, '../../assets/avatars');
  private readonly BUILTIN_DIR = path.join(__dirname, '../../assets/builtin');
  private readonly MAX_FILE_SIZE = 2 * 1024 * 1024; // Reduzido para 2MB
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  private readonly AVATAR_SIZE = 384; // Tamanho otimizado

  constructor() {
    // Garantir que os diretórios existem
    Promise.all([
      fs.mkdir(this.AVATARS_DIR, { recursive: true }),
      fs.mkdir(this.BUILTIN_DIR, { recursive: true })
    ]).catch(err => {
      logger.error('Erro ao criar diretórios de avatares:', err);
    });

    // Log das configurações no startup
    logger.info('AvatarService inicializado com configurações:', {
      avatarServer: config.avatarServer,
      avatarsDir: this.AVATARS_DIR,
      builtinDir: this.BUILTIN_DIR
    });
  }

  /**
   * Tenta encontrar um avatar embutido pelo nome
   */
  async getBuiltinAvatarPath(filename: string): Promise<string> {
    const possiblePaths = [
      path.join(this.BUILTIN_DIR, filename),
      path.join(this.AVATARS_DIR, filename),
      path.join(__dirname, '../../public/assets/avatars', filename),
      path.join(__dirname, '../../public/assets/builtin', filename),
      path.join(process.cwd(), 'frontend/src/assets/avatars', filename),
      path.join(process.cwd(), 'frontend/src/assets/builtin', filename),
      path.join(process.cwd(), 'public/assets/avatars', filename),
      path.join(process.cwd(), 'public/assets/builtin', filename)
    ];

    for (const avatarPath of possiblePaths) {
      try {
        await fs.access(avatarPath);
        return avatarPath;
      } catch (err) {
        continue;
      }
    }

    throw new Error(`Avatar embutido não encontrado: ${filename}`);
  }

  /**
   * Normaliza a URL/caminho do avatar usando a configuração do servidor
   */
  private normalizeAvatarSource(source: string): string {
    try {
      // Verificar se é uma URL completa
      if (source.startsWith('http://') || source.startsWith('https://')) {
        return source;
      }
      
      // Extrair o caminho relativo
      let relativePath = source
        .replace(/^\/+/, '') // Remove barras iniciais
        .replace(/\/+/g, '/'); // Remove barras duplicadas

      // Se o caminho inclui "assets", extraia tudo após isso
      const assetsMatch = source.match(/assets\/(.+)$/);
      if (assetsMatch) {
        relativePath = assetsMatch[1];
      }

      // Combina com a URL do servidor configurada
      const serverUrl = config.avatarServer.replace(/\/+$/, '');
      return `${serverUrl}/assets/${relativePath}`;
    } catch (error) {
      logger.error('Erro ao normalizar URL do avatar:', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        source
      });
      return source; // Retorna o original em caso de erro
    }
  }

  /**
   * Processa um avatar a partir de uma URL ou caminho local
   */
  async processAvatar(avatarSource: string, characterId: string): Promise<string> {
    try {
      // Verificar se é caminho local primeiro
      try {
        // Tenta encontrar localmente primeiro (mais rápido e evita downloads)
        const filename = path.basename(avatarSource);
        const localPath = await this.getBuiltinAvatarPath(filename);
        
        logger.info('Avatar encontrado localmente:', { localPath });
        
        // Processar o avatar local
        const imageBuffer = await fs.readFile(localPath);
        const processedImage = await sharp(imageBuffer)
          .resize(this.AVATAR_SIZE, this.AVATAR_SIZE, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 0 }
          })
          .webp({ quality: 85, effort: 6 })
          .toBuffer();
        
        // Salvar versão processada
        const fileName = `${characterId}_${uuidv4()}.webp`;
        const filePath = path.join(this.AVATARS_DIR, fileName);
        await fs.writeFile(filePath, processedImage);
        
        logger.info('Avatar local processado com sucesso', {
          originalPath: localPath,
          processedPath: filePath
        });
        
        return filePath;
      } catch (localError) {
        logger.info('Avatar não encontrado localmente, tentando download', { 
          error: localError instanceof Error ? localError.message : 'Erro desconhecido',
          source: avatarSource 
        });
      }

      // Normaliza a URL usando a configuração do servidor
      const normalizedUrl = this.normalizeAvatarSource(avatarSource);
      
      logger.info('Iniciando download de avatar', {
        original: avatarSource,
        normalized: normalizedUrl,
        characterId
      });

      let imageBuffer: Buffer | null = null;
      const maxRetries = 5; // Aumentado para 5 tentativas
      let lastError: any;

      // Tenta baixar a imagem com retentativas
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const response = await axios.get(normalizedUrl, {
            responseType: 'arraybuffer',
            timeout: 15000 * attempt, // Timeout aumenta progressivamente
            maxContentLength: this.MAX_FILE_SIZE,
            headers: {
              'Accept': 'image/webp,image/jpeg,image/png,*/*',
              'User-Agent': 'Mozilla/5.0 (Node.js) Custom Avatar Service'
            }
          });

          imageBuffer = Buffer.from(response.data);
          logger.info('Avatar baixado com sucesso', {
            size: imageBuffer.length,
            contentType: response.headers['content-type'],
            attempt
          });
          break;
        } catch (error: any) {
          lastError = error;
          const errorDetails = {
            message: error.message,
            code: error.code,
            response: error.response?.status,
            url: normalizedUrl,
            attempt
          };

          logger.warn(`Tentativa ${attempt} de download falhou`, errorDetails);

          // Se for 404, tenta URLs alternativas
          if (error.response?.status === 404) {
            try {
              // Tenta construir URLs alternativas
              const filename = path.basename(normalizedUrl);
              const alternativeUrls = [
                `${config.avatarServer}/assets/builtin/${filename}`,
                `${config.avatarServer}/assets/avatars/${filename}`,
                `${config.avatarServer}/public/assets/builtin/${filename}`,
                `${config.avatarServer}/public/assets/avatars/${filename}`
              ];
              
              logger.info('Tentando URLs alternativas', { urls: alternativeUrls });
              
              // Tenta cada URL alternativa
              for (const altUrl of alternativeUrls) {
                try {
                  const altResponse = await axios.get(altUrl, {
                    responseType: 'arraybuffer',
                    timeout: 15000,
                    maxContentLength: this.MAX_FILE_SIZE,
                    headers: {
                      'Accept': 'image/webp,image/jpeg,image/png,*/*',
                      'User-Agent': 'Mozilla/5.0 (Node.js) Custom Avatar Service'
                    }
                  });
                  
                  imageBuffer = Buffer.from(altResponse.data);
                  logger.info('Avatar baixado com sucesso de URL alternativa', {
                    url: altUrl,
                    size: imageBuffer.length
                  });
                  break;
                } catch (altError) {
                  continue;
                }
              }
              
              if (imageBuffer) {
                break;
              }
            } catch (urlError) {
              logger.warn('Falha ao tentar URLs alternativas', urlError);
            }
          }

          if (attempt < maxRetries && !imageBuffer) {
            const delay = attempt * 3000;
            logger.info(`Aguardando ${delay}ms antes da próxima tentativa`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      if (!imageBuffer) {
        throw new Error('Não foi possível obter o avatar após todas as tentativas');
      }

      // Processa a imagem com sharp - usando WebP para melhor compressão
      const processedImage = await sharp(imageBuffer)
        .resize(this.AVATAR_SIZE, this.AVATAR_SIZE, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .webp({ quality: 85, effort: 6 })
        .toBuffer();

      // Salvar versão processada
      const fileName = `${characterId}_${uuidv4()}.webp`;
      const filePath = path.join(this.AVATARS_DIR, fileName);
      await fs.writeFile(filePath, processedImage);

      logger.info('Avatar processado e salvo com sucesso', {
        path: filePath,
        size: processedImage.length
      });

      return filePath;
    } catch (error) {
      logger.error('Erro fatal no processamento do avatar:', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Erro desconhecido',
        source: avatarSource,
        characterId
      });
      throw error;
    }
  }

  /**
   * Lê um avatar do disco e retorna como base64
   */
  async getAvatarAsBase64(filePath: string): Promise<string> {
    try {
      const imageBuffer = await fs.readFile(filePath);
      const extension = path.extname(filePath).toLowerCase();
      const mimeType = extension === '.webp' ? 'image/webp' : 
                       extension === '.png' ? 'image/png' : 'image/jpeg';
                       
      return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
    } catch (error) {
      logger.error('Erro ao ler avatar:', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        filePath
      });
      throw error;
    }
  }

  /**
   * Prepara um avatar para uso com DALL-E
   * Otimiza o arquivo para melhor qualidade preservando características visuais importantes
   */
  async prepareAvatarForDalle(filePath: string): Promise<Buffer> {
    try {
      logger.info('Preparando avatar para DALL-E', { filePath });

      const imageBuffer = await fs.readFile(filePath);
      
      // Verificar formato da imagem original
      const metadata = await sharp(imageBuffer).metadata();
      logger.info('Metadados do avatar original:', {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        channels: metadata.channels,
        size: imageBuffer.length
      });
      
      // Processar para formato otimizado para DALL-E
      // DALL-E-3 não aceita reference_images, mas podemos criar uma versão de alta qualidade
      // para usar na geração de descrições detalhadas do personagem

      // Tamanho quadrado para reconhecimento de características
      const squareSize = 512;
      
      // Processar imagem com configurações para preservar detalhes importantes
      let processedImage = await sharp(imageBuffer)
        .resize({
          width: squareSize,
          height: squareSize,
          fit: 'contain', 
          background: { r: 255, g: 255, b: 255, alpha: 1 } // Usar fundo branco sólido
        })
        .jpeg({ 
          quality: 85, // Alta qualidade para preservar detalhes
          progressive: true,
          optimiseScans: true
        })
        .toBuffer();
      
      logger.info('Avatar processado com sucesso para DALL-E', {
        filePath,
        originalSize: imageBuffer.length,
        finalSize: processedImage.length,
        reductionPercent: Math.round((1 - processedImage.length / imageBuffer.length) * 100)
      });

      return processedImage;
    } catch (error) {
      logger.error('Erro ao preparar avatar para DALL-E:', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        filePath
      });
      throw error;
    }
  }
  
  /**
   * Prepara um arquivo temporário de avatar compatível com a API DALL-E
   * para uso com geração de imagens
   */
  async prepareAvatarFileForDalle(filePath: string): Promise<string> {
    try {
      logger.info('Preparando arquivo de avatar para DALL-E', { filePath });
      
      // Processar imagem para buffer compatível com DALL-E
      const processedBuffer = await this.prepareAvatarForDalle(filePath);
      
      // Verificar o tamanho do buffer processado
      if (processedBuffer.length > 1 * 1024 * 1024) { // 1MB é um limite conservador
        logger.warn('Buffer processado ainda grande, aplicando compressão adicional', {
          size: processedBuffer.length
        });
        
        // Aplicar compressão adicional - reduzir mais o tamanho e usar JPEG com menor qualidade
        const reprocessedBuffer = await sharp(processedBuffer)
          .resize(256, 256) // Tamanho menor
          .jpeg({ 
            quality: 60,  // Qualidade menor 
            progressive: true, 
            optimiseScans: true 
          })
          .toBuffer();
        
        logger.info('Buffer reprocessado com compressão adicional', {
          originalSize: processedBuffer.length,
          newSize: reprocessedBuffer.length
        });
        
        // Criar arquivo temporário com o buffer reprocessado
        const tempPath = path.join(this.AVATARS_DIR, `dalle_${Date.now()}_${path.basename(filePath, path.extname(filePath))}.jpg`);
        await fs.writeFile(tempPath, reprocessedBuffer);
        
        // Verificar o arquivo criado
        const stats = await fs.stat(tempPath);
        
        logger.info('Arquivo de avatar temporário criado para DALL-E com compressão extra', { 
          tempPath,
          size: stats.size,
          format: 'jpeg'
        });
        
        return tempPath;
      }
      
      // Determinar a extensão com base no formato detectado
      const format = await sharp(processedBuffer).metadata().then(metadata => metadata.format);
      const extension = format === 'jpeg' || format === 'jpg' ? '.jpg' : '.png';
      
      // Criar arquivo temporário com a extensão correta
      const tempPath = path.join(this.AVATARS_DIR, `dalle_${Date.now()}_${path.basename(filePath, path.extname(filePath))}${extension}`);
      await fs.writeFile(tempPath, processedBuffer);

      // Verificar o arquivo criado
      const stats = await fs.stat(tempPath);
      
      logger.info('Arquivo de avatar temporário criado para DALL-E', { 
        tempPath,
        size: stats.size,
        format
      });
      
      return tempPath;
    } catch (error) {
      logger.error('Erro ao preparar arquivo de avatar para DALL-E:', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        filePath
      });
      
      // Em caso de erro, tenta criar um arquivo mínimo para uso
      try {
        // Ler o arquivo original
        const originalBuffer = await fs.readFile(filePath);
        
        // Processar com configurações mínimas e máxima compressão
        const emergencyBuffer = await sharp(originalBuffer)
          .resize(192, 192) // Tamanho muito pequeno
          .jpeg({ quality: 50 }) // Máxima compressão
          .toBuffer();
        
        // Salvar arquivo de emergência
        const emergencyPath = path.join(this.AVATARS_DIR, `dalle_emergency_${Date.now()}_${path.basename(filePath, path.extname(filePath))}.jpg`);
        await fs.writeFile(emergencyPath, emergencyBuffer);
        
        logger.info('Arquivo de emergência criado após erro', {
          path: emergencyPath,
          size: emergencyBuffer.length
        });
        
        return emergencyPath;
      } catch (emergencyError) {
        logger.error('Falha também ao criar arquivo de emergência', {
          error: emergencyError instanceof Error ? emergencyError.message : 'Erro desconhecido'
        });
        throw error; // Propaga o erro original
      }
    }
  }
}

export const avatarService = new AvatarService();