import sharp from 'sharp';
import { logger } from '../utils/logger';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { avatarService } from './avatarService';
import axios from 'axios';

class ImageProcessor {
  private readonly TEMP_DIR = path.join(__dirname, '../../temp');
  private readonly AVATAR_DIR = path.join(__dirname, '../../temp/avatars');
  private readonly MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB
  private readonly TARGET_SIZE = 512; // pixels

  constructor() {
    // Garantir que os diretórios existem
    Promise.all([
      fs.mkdir(this.TEMP_DIR, { recursive: true }),
      fs.mkdir(this.AVATAR_DIR, { recursive: true })
    ]).catch(err => {
      logger.error('Erro ao criar diretórios:', err);
    });
  }

  /**
   * Verifica assincronamente se o caminho existe dentre os possíveis diretórios base.
   */
  private async resolveLocalPath(avatarPath: string): Promise<string> {
    const basePaths = [
      path.join(process.cwd(), 'frontend/src/assets', avatarPath),
      path.join(process.cwd(), 'backend/public', avatarPath),
      path.join(process.cwd(), avatarPath),
      avatarPath
    ];

    for (const fullPath of basePaths) {
      try {
        await fs.access(fullPath);
        return fullPath;
      } catch (err) {
        continue;
      }
    }

    throw new Error(`Arquivo de avatar não encontrado: ${avatarPath}`);
  }

  private async downloadImage(url: string): Promise<string> {
    try {
      const tempFilePath = path.join(this.AVATAR_DIR, `${uuidv4()}.png`);
      
      logger.info('Processando imagem de avatar', { url });
      let buffer: Buffer;
      
      // Se for URL externa
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        buffer = Buffer.from(response.data);
      } else {
        // Tratar como caminho local
        const localPath = await this.resolveLocalPath(url);
        buffer = await fs.readFile(localPath);
      }

      // Processar e salvar imagem
      await sharp(buffer)
        .resize(this.TARGET_SIZE, this.TARGET_SIZE, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png({ quality: 90 })
        .toFile(tempFilePath);

      logger.info('Avatar processado com sucesso', { tempFilePath });
      return tempFilePath;
    } catch (error) {
      logger.error('Erro ao processar avatar:', error);
      throw new Error(`Falha ao processar avatar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Processa uma imagem para uso com o DALL-E:
   * - Redimensiona, converte e otimiza o arquivo.
   */
  async processImageForDalle(imageUrl: string): Promise<string> {
    try {
      logger.info('Iniciando processamento de imagem para DALL-E', {
        imageUrl: imageUrl.substring(0, 50) + '...'
      });

      const tempFilePath = path.join(this.TEMP_DIR, `${uuidv4()}.png`);
      logger.info('Arquivo temporário criado', { tempFilePath });
      
      logger.info('Baixando imagem...');
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);
      logger.info('Imagem baixada com sucesso', { 
        contentLength: response.headers['content-length'],
        contentType: response.headers['content-type']
      });

      logger.info('Processando imagem com sharp...');
      await sharp(buffer)
        .resize(this.TARGET_SIZE, this.TARGET_SIZE, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png({ quality: 90 })
        .toFile(tempFilePath);

      const stats = await fs.stat(tempFilePath);
      logger.info('Imagem processada', { 
        fileSize: stats.size,
        maxAllowed: this.MAX_IMAGE_SIZE
      });

      if (stats.size > this.MAX_IMAGE_SIZE) {
        throw new Error(`Imagem processada excede o tamanho máximo permitido (${this.MAX_IMAGE_SIZE} bytes)`);
      }

      const processedImage = await fs.readFile(tempFilePath);
      const base64Image = processedImage.toString('base64');

      // Limpar arquivo temporário
      await fs.unlink(tempFilePath).catch(err => {
        logger.warn('Erro ao deletar arquivo temporário:', err);
      });

      return base64Image;
    } catch (error) {
      logger.error('Erro ao processar imagem:', error);
      throw new Error('Falha ao processar imagem para uso com DALL-E');
    }
  }

  /**
   * Prepara a descrição do personagem para o DALL-E.
   * Inclui o avatar processado (em base64) e as instruções de preservação dos detalhes.
   */
  async prepareCharacterDescription(character: {
    name: string;
    avatarPath: string; // Pode ser URL, caminho local ou relativo
    type: 'main' | 'secondary';
  }): Promise<string> {
    try {
      logger.info('Preparando descrição do personagem para DALL-E', {
        name: character.name,
        type: character.type,
        avatarPath: character.avatarPath
      });

      let imagePath = character.avatarPath;

      // Se não for um caminho absoluto, processa (baixa ou resolve localmente)
      if (!path.isAbsolute(character.avatarPath)) {
        logger.info('Avatar é caminho relativo ou URL, processando...', { path: character.avatarPath });
        imagePath = await this.downloadImage(character.avatarPath);
      }

      logger.info('Processando avatar', { imagePath });

      // Verificar se o arquivo existe
      try {
        await fs.access(imagePath);
      } catch (error) {
        logger.error('Arquivo de avatar não encontrado', {
          avatarPath: character.avatarPath,
          imagePath,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
        throw new Error(`Arquivo de avatar não encontrado: ${imagePath}`);
      }

      const imageBuffer = await fs.readFile(imagePath);
      const imageMetadata = await sharp(imageBuffer).metadata();

      const processedImage = await sharp(imageBuffer)
        .resize(1024, 1024, { // Aumentado para melhor qualidade
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .normalize()
        .sharpen()
        .png({ 
          quality: 100,
          compressionLevel: 9,
          effort: 10
        })
        .toBuffer();

      const base64Image = processedImage.toString('base64');

      // Se foi um arquivo temporário baixado, tenta remover
      if (imagePath.startsWith(this.AVATAR_DIR)) {
        fs.unlink(imagePath).catch(err => {
          logger.warn('Erro ao deletar arquivo temporário de avatar:', err);
        });
      }

      const characterType = character.type === 'main' ? 'principal' : 'secundário';
      
      return `
<reference_image>data:image/png;base64,${base64Image}</reference_image>

PERSONAGEM ${characterType.toUpperCase()} "${character.name}":
* Usar imagem como referência exata
* Manter características físicas idênticas:
  - Rosto, cabelo, olhos, corpo
  - Cores e proporções
* Preservar roupas e acessórios:
  - Cores e estilos exatos
  - Todos os detalhes visíveis
* Manter consistência em todas as cenas
      `.trim();
    } catch (error) {
      logger.error('Erro ao preparar descrição do personagem:', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Erro desconhecido',
        character: {
          name: character.name,
          type: character.type,
          avatarPath: character.avatarPath
        }
      });
      throw new Error('Falha ao preparar descrição do personagem para DALL-E');
    }
  }

  /**
   * Limpa arquivos temporários antigos
   */
  async cleanupTempFiles(maxAge: number = 24 * 60 * 60 * 1000) {
    try {
      const now = Date.now();
      const files = await fs.readdir(this.TEMP_DIR);
      
      for (const file of files) {
        const filePath = path.join(this.TEMP_DIR, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath).catch(err => {
            logger.warn('Erro ao deletar arquivo temporário:', err);
          });
        }
      }
    } catch (error) {
      logger.error('Erro ao limpar arquivos temporários:', error);
    }
  }
}

export const imageProcessor = new ImageProcessor();