import sharp from 'sharp';
import { logger } from '../utils/logger';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { avatarService } from './avatarService';
import axios from 'axios';
import { config } from '../config/config';

class ImageProcessor {
  private readonly TEMP_DIR = path.join(__dirname, '../../temp');
  private readonly AVATAR_DIR = path.join(__dirname, '../../temp/avatars');
  private readonly MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB (reduzido de 4MB)
  // Formato A5 otimizado para livro
  private readonly TARGET_WIDTH = 420;  // Proporção A5 otimizada para livro
  private readonly TARGET_HEIGHT = 595; // Proporção A5 otimizada para livro
  // Tamanho para avatares (menor para ser mais eficiente)
  private readonly AVATAR_SIZE = 384; 

  constructor() {
    // Garantir que os diretórios existem
    Promise.all([
      fs.mkdir(this.TEMP_DIR, { recursive: true }),
      fs.mkdir(this.AVATAR_DIR, { recursive: true })
    ]).catch(err => {
      logger.error('Erro ao criar diretórios:', err);
    });
    
    // Iniciar limpeza periódica de arquivos temporários
    setInterval(() => this.cleanupTempFiles(), 3600000); // A cada hora
  }

  /**
   * Verifica assincronamente se o caminho existe dentre os possíveis diretórios base.
   */
  private async resolveLocalPath(avatarPath: string): Promise<string> {
    // Lista expandida de possíveis localizações do arquivo
    const basePaths = [
      path.join(process.cwd(), 'frontend/src/assets', avatarPath),
      path.join(process.cwd(), 'backend/public', avatarPath),
      path.join(process.cwd(), 'backend/assets', avatarPath),
      path.join(process.cwd(), 'backend/assets/builtin', path.basename(avatarPath)),
      path.join(process.cwd(), 'backend/assets/avatars', path.basename(avatarPath)),
      path.join(process.cwd(), 'public', avatarPath),
      path.join(process.cwd(), avatarPath),
      avatarPath
    ];

    for (const fullPath of basePaths) {
      try {
        await fs.access(fullPath);
        logger.info('Avatar encontrado localmente:', { path: fullPath });
        return fullPath;
      } catch (err) {
        continue;
      }
    }

    throw new Error(`Arquivo de avatar não encontrado: ${avatarPath}`);
  }

  private async downloadImage(url: string): Promise<string> {
    try {
      const tempFilePath = path.join(this.AVATAR_DIR, `${uuidv4()}.webp`);
      
      logger.info('Processando imagem de avatar', { url });
      let buffer: Buffer;
      
      // Se for URL externa
      if (url.startsWith('http://') || url.startsWith('https://')) {
        // Tentar várias vezes com timeout incremental
        const maxRetries = 5;
        let lastError: any;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const response = await axios.get(url, { 
              responseType: 'arraybuffer',
              timeout: 30000 * attempt, // Aumentar o timeout a cada tentativa
              maxContentLength: this.MAX_IMAGE_SIZE,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'image/png,image/jpeg,image/webp,*/*'
              }
            });
            
            buffer = Buffer.from(response.data);
            logger.info(`Download bem sucedido na tentativa ${attempt}`, {
              size: buffer.length,
              url: url
            });
            break;
          } catch (error: any) {
            lastError = error;
            const status = error.response?.status;
            logger.warn(`Tentativa ${attempt} de download falhou`, {
              status,
              message: error.message
            });
            
            // Se for 404, não tenta mais
            if (status === 404) {
              throw new Error(`Imagem não encontrada (404): ${url}`);
            }
            
            if (attempt < maxRetries) {
              const delay = attempt * 3000;
              logger.info(`Aguardando ${delay}ms antes da tentativa ${attempt + 1}`);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              throw lastError;
            }
          }
        }
      } else {
        // Tratar como caminho local
        const localPath = await this.resolveLocalPath(url);
        buffer = await fs.readFile(localPath);
      }

      // Verificar se o buffer foi definido
      if (!buffer) {
        throw new Error('Falha ao obter dados da imagem após todas as tentativas');
      }

      // Processar e salvar imagem usando webp para melhor compressão
      await sharp(buffer)
        .resize(this.AVATAR_SIZE, this.AVATAR_SIZE, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .webp({ 
          quality: 85, 
          effort: 6,
          lossless: false 
        })
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

      const tempFilePath = path.join(this.TEMP_DIR, `${uuidv4()}.webp`);
      logger.info('Arquivo temporário criado', { tempFilePath });
      
      // Verificar se a URL é de um avatar gerenciado pelo AvatarService
      if (imageUrl.includes('/assets/avatars/') || 
          imageUrl.includes('/assets/builtin/') ||
          imageUrl.includes('boy') || 
          imageUrl.includes('girl')) {
        
        try {
          // Tentar encontrar localmente primeiro
          const filename = path.basename(imageUrl);
          const avatarPath = await this.resolveLocalPath(filename);
          
          logger.info('Usando avatar local ao invés de baixar:', { avatarPath });
          const localBuffer = await fs.readFile(avatarPath);
          
          const processedImage = await sharp(localBuffer)
            .resize(this.AVATAR_SIZE, this.AVATAR_SIZE, {
              fit: 'contain',
              background: { r: 255, g: 255, b: 255, alpha: 0 }
            })
            .webp({ 
              quality: 85,
              effort: 6
            })
            .toBuffer();
            
          return processedImage.toString('base64');
        } catch (localError) {
          logger.warn('Não foi possível usar avatar local, tentando download:', localError);
        }
      }
      
      logger.info('Baixando imagem...');
      try {
        // Tentar várias vezes com timeout incremental
        const maxRetries = 5;
        let buffer: Buffer | null = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const response = await axios.get(imageUrl, { 
              responseType: 'arraybuffer',
              timeout: 30000 * attempt, // Aumentar o timeout a cada tentativa
              maxContentLength: this.MAX_IMAGE_SIZE,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'image/webp,image/png,image/jpeg,*/*'
              }
            });
            
            buffer = Buffer.from(response.data);
            logger.info(`Download bem sucedido na tentativa ${attempt}`, {
              size: buffer.length,
              contentType: response.headers['content-type']
            });
            break;
          } catch (error: any) {
            const status = error.response?.status;
            logger.warn(`Tentativa ${attempt} de download falhou`, {
              status,
              message: error.message
            });
            
            // Se for 404, não tenta mais
            if (status === 404) {
              throw new Error(`Imagem não encontrada (404): ${imageUrl}`);
            }
            
            if (attempt < maxRetries) {
              const delay = attempt * 3000;
              logger.info(`Aguardando ${delay}ms antes da tentativa ${attempt + 1}`);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              throw error;
            }
          }
        }

        if (!buffer) {
          throw new Error('Falha ao obter dados da imagem após todas as tentativas');
        }

        logger.info('Processando imagem com sharp...');
        // Usar WebP para obter melhor compressão
        await sharp(buffer)
          .resize(this.AVATAR_SIZE, this.AVATAR_SIZE, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 0 }
          })
          .webp({ 
            quality: 85, // Qualidade boa, mas com tamanho reduzido
            effort: 6 // Esforço médio de compressão
          })
          .toFile(tempFilePath);

        const stats = await fs.stat(tempFilePath);
        logger.info('Imagem processada', { 
          fileSize: stats.size,
          maxAllowed: this.MAX_IMAGE_SIZE
        });

        if (stats.size > this.MAX_IMAGE_SIZE) {
          // Se ainda estiver muito grande, comprimir mais
          await sharp(tempFilePath)
            .resize(this.AVATAR_SIZE / 1.5, this.AVATAR_SIZE / 1.5) // Reduzir tamanho
            .webp({ quality: 75, effort: 6 })
            .toFile(tempFilePath + '.reduced.webp');
            
          await fs.unlink(tempFilePath);
          await fs.rename(tempFilePath + '.reduced.webp', tempFilePath);
          
          const newStats = await fs.stat(tempFilePath);
          logger.info('Imagem redimensionada para tamanho menor', { newFileSize: newStats.size });
          
          if (newStats.size > this.MAX_IMAGE_SIZE) {
            throw new Error(`Imagem ainda excede o tamanho máximo após compressão (${this.MAX_IMAGE_SIZE} bytes)`);
          }
        }

        const processedImage = await fs.readFile(tempFilePath);
        const base64Image = processedImage.toString('base64');

        // Limpar arquivo temporário
        await fs.unlink(tempFilePath).catch(err => {
          logger.warn('Erro ao deletar arquivo temporário:', err);
        });

        return base64Image;
      } catch (downloadError) {
        logger.error('Erro ao baixar ou processar imagem:', downloadError);
        throw new Error('Falha ao processar imagem para DALL-E');
      }
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

      // Como não podemos usar imagens de referência com a API atual,
      // vamos focar em criar uma descrição textual detalhada do personagem
      
      // Tentar extrair informações do nome do personagem para enriquecer a descrição
      const nameHints = this.extractCharacterHintsFromName(character.name);
      
      const characterType = character.type === 'main' ? 'principal' : 'secundário';
      
      // Construir uma descrição textual rica
      return `
PERSONAGEM ${characterType.toUpperCase()} "${character.name}":
* Personagem infantil com aparência amigável e expressiva
* ${nameHints}
* Ilustração estilo livro infantil, cores vibrantes
* Expressões faciais adequadas à cena
* Manter consistência visual em todas as páginas
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
      
      // Retornar uma descrição básica em caso de erro
      const characterType = character.type === 'main' ? 'principal' : 'secundário';
      return `
PERSONAGEM ${characterType.toUpperCase()} "${character.name}":
* Personagem infantil com aparência amigável
* Ilustração estilo livro infantil
`.trim();
    }
  }
  
  /**
   * Extrai dicas sobre o personagem a partir do nome
   */
  private extractCharacterHintsFromName(name: string): string {
    try {
      // Palavras-chave que podem indicar características
      const genderWords = {
        masculine: ['menino', 'garoto', 'príncipe', 'rei', 'senhor', 'homem', 'rapaz', 'avô', 'pai', 'tio'],
        feminine: ['menina', 'garota', 'princesa', 'rainha', 'senhora', 'mulher', 'moça', 'avó', 'mãe', 'tia']
      };
      
      const animalWords = ['gato', 'cachorro', 'leão', 'tigre', 'urso', 'coelho', 'elefante', 'macaco', 
                          'pássaro', 'peixe', 'sapo', 'rato', 'lobo', 'raposa', 'girafa', 'zebra'];
      
      const fantasyWords = ['fada', 'bruxa', 'mago', 'dragão', 'elfo', 'duende', 'gigante', 'anão', 
                           'sereia', 'unicórnio', 'robô', 'alienígena', 'super-herói'];
      
      const nameLower = name.toLowerCase();
      
      // Verificar gênero
      let gender = '';
      for (const word of genderWords.masculine) {
        if (nameLower.includes(word)) {
          gender = 'Personagem masculino';
          break;
        }
      }
      
      if (!gender) {
        for (const word of genderWords.feminine) {
          if (nameLower.includes(word)) {
            gender = 'Personagem feminino';
            break;
          }
        }
      }
      
      // Verificar se é um animal
      let animalType = '';
      for (const animal of animalWords) {
        if (nameLower.includes(animal)) {
          animalType = `Animal: ${animal}`;
          break;
        }
      }
      
      // Verificar se é um ser fantástico
      let fantasyType = '';
      for (const fantasy of fantasyWords) {
        if (nameLower.includes(fantasy)) {
          fantasyType = `Ser fantástico: ${fantasy}`;
          break;
        }
      }
      
      // Combinar as informações encontradas
      const hints = [gender, animalType, fantasyType].filter(Boolean);
      
      if (hints.length > 0) {
        return hints.join(', ');
      }
      
      // Se não encontrou nada específico
      return 'Personagem com características visuais distintas e memoráveis';
    } catch (error) {
      logger.warn('Erro ao extrair dicas do nome do personagem:', error);
      return 'Personagem com aparência amigável e expressiva';
    }
  }

  /**
   * Processa uma imagem DALL-E para formato de livro A5
   */
  async processBookImage(imageUrl: string): Promise<{ buffer: Buffer, path: string }> {
    try {
      logger.info('Processando imagem para formato de livro A5', { imageUrl });
      const tempFilePath = path.join(this.TEMP_DIR, `book_${uuidv4()}.webp`);
      
      const response = await axios({
        method: 'get',
        url: imageUrl,
        responseType: 'arraybuffer',
        timeout: 30000,
        maxContentLength: 10 * 1024 * 1024,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      const buffer = Buffer.from(response.data);
      
      // Processar para tamanho A5 otimizado para livro
      const processedImageBuffer = await sharp(buffer)
        .resize({
          width: this.TARGET_WIDTH,
          height: this.TARGET_HEIGHT,
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .webp({ 
          quality: 90,
          effort: 6
        })
        .toBuffer();
      
      // Salvar arquivo
      await fs.writeFile(tempFilePath, processedImageBuffer);
      
      return {
        buffer: processedImageBuffer,
        path: tempFilePath
      };
    } catch (error) {
      logger.error('Erro ao processar imagem para livro:', error);
      throw new Error('Falha ao processar imagem para formato de livro');
    }
  }

  /**
   * Limpa arquivos temporários antigos
   */
  async cleanupTempFiles(maxAge: number = 24 * 60 * 60 * 1000) {
    try {
      const now = Date.now();
      const directories = [this.TEMP_DIR, this.AVATAR_DIR];
      
      for (const dir of directories) {
        try {
          const files = await fs.readdir(dir);
          
          for (const file of files) {
            const filePath = path.join(dir, file);
            const stats = await fs.stat(filePath);
            
            if (now - stats.mtime.getTime() > maxAge) {
              await fs.unlink(filePath).catch(err => {
                logger.warn('Erro ao deletar arquivo temporário:', err);
              });
            }
          }
        } catch (err) {
          logger.warn(`Erro ao processar diretório ${dir}:`, err);
        }
      }
      
      logger.info('Limpeza de arquivos temporários concluída');
    } catch (error) {
      logger.error('Erro ao limpar arquivos temporários:', error);
    }
  }
}

export const imageProcessor = new ImageProcessor();