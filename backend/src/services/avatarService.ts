import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import sharp from 'sharp';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

class AvatarService {
  private readonly AVATARS_DIR = path.join(__dirname, '../../assets/avatars');
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  constructor() {
    // Garantir que o diretório de avatares existe
    fs.mkdir(this.AVATARS_DIR, { recursive: true }).catch(err => {
      logger.error('Erro ao criar diretório de avatares:', err);
    });
  }

  /**
   * Processa um avatar a partir de uma URL ou caminho local
   * Retorna o caminho local do avatar processado
   */
  async processAvatar(avatarSource: string, characterId: string): Promise<string> {
    try {
      logger.info('Iniciando processamento de avatar', {
        source: avatarSource,
        characterId
      });

      let imageBuffer: Buffer;

      // Verificar se é uma URL
      if (avatarSource.startsWith('http://') || avatarSource.startsWith('https://')) {
        logger.info('Detectada URL do avatar, iniciando download', { url: avatarSource });

        const maxRetries = 3;
        let retryCount = 0;
        let lastError: any;

        while (retryCount < maxRetries) {
          try {
            const response = await axios.get(avatarSource, {
              responseType: 'arraybuffer',
              timeout: 10000,
              maxContentLength: this.MAX_FILE_SIZE,
              headers: {
                'Accept': 'image/jpeg,image/png,image/webp,*/*'
              }
            });

            imageBuffer = Buffer.from(response.data);
            logger.info('Avatar baixado com sucesso', {
              size: imageBuffer.length,
              contentType: response.headers['content-type'],
              attempt: retryCount + 1
            });
            break;
          } catch (error) {
            lastError = error;
            retryCount++;
            if (retryCount < maxRetries) {
              const delay = retryCount * 1000; // 1s, 2s, 3s
              logger.warn(`Tentativa ${retryCount} falhou, tentando novamente em ${delay}ms`, {
                error: error instanceof Error ? error.message : 'Erro desconhecido'
              });
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }

        if (!imageBuffer) {
          throw lastError || new Error('Falha ao baixar avatar após todas as tentativas');
        }
      } else {
        // Ler arquivo local
        try {
          imageBuffer = await fs.readFile(avatarSource);
          logger.info('Avatar lido do arquivo local', {
            path: avatarSource,
            size: imageBuffer.length
          });
        } catch (error) {
          logger.error('Erro ao ler arquivo local:', {
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            path: avatarSource
          });
          throw new Error(`Falha ao ler arquivo local: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }

      // Validar tamanho
      if (imageBuffer.length > this.MAX_FILE_SIZE) {
        throw new Error(`Arquivo muito grande. Tamanho máximo: ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
      }

      // Processar imagem com sharp
      let processedImage: Buffer;
      try {
        processedImage = await sharp(imageBuffer)
          .resize(512, 512, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 0 }
          })
          .png({ quality: 90, compressionLevel: 9 })
          .toBuffer();

        logger.info('Imagem processada com sharp', {
          originalSize: imageBuffer.length,
          processedSize: processedImage.length
        });
      } catch (error) {
        logger.error('Erro ao processar imagem com sharp:', {
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
        throw new Error(`Falha ao processar imagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }

      // Gerar nome único para o arquivo
      const fileName = `${characterId}_${uuidv4()}.png`;
      const filePath = path.join(this.AVATARS_DIR, fileName);

      // Salvar arquivo processado
      try {
        await fs.writeFile(filePath, processedImage);
        logger.info('Avatar salvo com sucesso', {
          path: filePath,
          size: processedImage.length
        });
      } catch (error) {
        logger.error('Erro ao salvar arquivo processado:', {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          path: filePath
        });
        throw new Error(`Falha ao salvar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }

      // Verificar se o arquivo foi salvo corretamente
      try {
        await fs.access(filePath);
        const stats = await fs.stat(filePath);
        logger.info('Arquivo verificado após salvamento', {
          path: filePath,
          size: stats.size
        });
      } catch (error) {
        logger.error('Erro ao verificar arquivo salvo:', {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          path: filePath
        });
        throw new Error(`Falha ao verificar arquivo salvo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }

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
      return `data:image/png;base64,${imageBuffer.toString('base64')}`;
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
   */
  async prepareAvatarForDalle(filePath: string): Promise<string> {
    try {
      logger.info('Preparando avatar para DALL-E', { filePath });

      // Verificar se o arquivo existe
      try {
        await fs.access(filePath);
      } catch (error) {
        logger.error('Arquivo não encontrado:', {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          filePath
        });
        throw new Error(`Arquivo não encontrado: ${filePath}`);
      }

      // Ler arquivo
      const imageBuffer = await fs.readFile(filePath);

      // Processar com sharp
      const processedImage = await sharp(imageBuffer)
        .resize(1024, 1024, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png({ quality: 90, compressionLevel: 9 })
        .toBuffer();

      // Converter para base64
      const base64Image = processedImage.toString('base64');

      logger.info('Avatar processado com sucesso para DALL-E', {
        filePath,
        originalSize: imageBuffer.length,
        processedSize: processedImage.length
      });

      return base64Image;
    } catch (error) {
      logger.error('Erro ao preparar avatar para DALL-E:', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        filePath
      });
      throw new Error(`Falha ao preparar avatar para DALL-E: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }
}

export const avatarService = new AvatarService();