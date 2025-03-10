// src/services/avatarService.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/config';
import axios from 'axios';

class AvatarService {
  /**
   * Processa um avatar (redimensiona, otimiza, etc.)
   * @param avatarUrl URL ou caminho do avatar original
   * @param prefix Prefixo para o nome do arquivo processado
   * @returns Caminho do avatar processado ou URL original se for externa
   */
  async processAvatar(avatarUrl: string, prefix: string = 'avatar'): Promise<string> {
    try {
      logger.info('Processando avatar', { avatarUrl, prefix });
      
      // Determina se é uma URL externa ou um caminho de arquivo local
      const isExternalUrl = avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://');
      
      // Para URLs externas, verificamos se é de um CDN confiável
      if (isExternalUrl) {
        const isTrustedCDN = 
          avatarUrl.includes('cdn-icons-png.flaticon.com') || 
          avatarUrl.includes('cdn.pixabay.com') || 
          avatarUrl.includes('images.unsplash.com') ||
          avatarUrl.includes('cloudinary.com');
          
        if (isTrustedCDN) {
          logger.info('Avatar é uma URL de CDN confiável, retornando sem processamento', { avatarUrl });
          return avatarUrl;
        }
        
        // Para outras URLs externas, também retornamos sem processamento
        logger.info('Avatar é uma URL externa, retornando sem processamento', { avatarUrl });
        return avatarUrl;
      }
      
      // A partir daqui, sabemos que é um arquivo local
      
      // Diretório de saída para avatares processados
      const outputDir = path.join(__dirname, '../../public/assets/avatars/processed');
      
      // Cria o diretório se não existir
      await fs.mkdir(outputDir, { recursive: true });
      
      // Nome do arquivo processado
      const outputFilename = `${prefix}_${uuidv4()}.png`;
      const outputPath = path.join(outputDir, outputFilename);
      
      try {
        // Verifica se o arquivo existe
        await fs.access(avatarUrl);
        
        // Processa a imagem com sharp
        await sharp(avatarUrl)
          .resize(512, 512, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 0 }
          })
          .png()
          .toFile(outputPath);
          
        logger.info('Avatar local processado com sucesso', { 
          originalPath: avatarUrl,
          processedPath: outputPath
        });
        
        // Retorna o caminho relativo para uso em URLs
        const relativePath = `/assets/avatars/processed/${outputFilename}`;
        return relativePath;
      } catch (fileError) {
        logger.error('Erro ao acessar arquivo de avatar local', {
          error: fileError instanceof Error ? fileError.message : 'Erro desconhecido',
          avatarUrl
        });
        
        // Em caso de erro, retorna a URL original
        return avatarUrl;
      }
    } catch (error) {
      logger.error('Erro ao processar avatar', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        avatarUrl
      });
      
      // Em caso de erro geral, retorna a URL original
      return avatarUrl;
    }
  }
  
  /**
   * Verifica se uma URL de avatar do Flaticon é válida
   * @param url URL do avatar do Flaticon
   * @returns Booleano indicando se a URL é válida
   */
  isFlaticonsUrl(url: string): boolean {
    return url.includes('cdn-icons-png.flaticon.com');
  }
  
  /**
   * Verifica se uma URL de avatar é de um CDN confiável
   * @param url URL do avatar
   * @returns Booleano indicando se a URL é de um CDN confiável
   */
  isTrustedCDN(url: string): boolean {
    return url.includes('cdn-icons-png.flaticon.com') || 
           url.includes('cdn.pixabay.com') || 
           url.includes('images.unsplash.com') ||
           url.includes('cloudinary.com');
  }

  /**
   * Verifica se uma URL de avatar é válida
   * @param url URL do avatar
   * @returns Booleano indicando se a URL é válida
   */
  isValidAvatarUrl(url: string): boolean {
    try {
      // Verifica se a URL é válida
      if (!url) return false;
      
      // Verifica se a URL é do servidor de avatares configurado
      if (url.startsWith(config.avatarServer)) {
        return true;
      }
      
      // Verifica se é uma URL relativa válida
      if (url.startsWith('/assets/avatars/')) {
        return true;
      }
      
      // Aceita URLs de CDNs confiáveis como válidas
      const isTrustedCDN = 
        url.includes('cdn-icons-png.flaticon.com') || 
        url.includes('cdn.pixabay.com') || 
        url.includes('images.unsplash.com') ||
        url.includes('cloudinary.com');
        
      if (isTrustedCDN) {
        logger.info('URL de CDN confiável detectada e aceita', { url });
        return true;
      }
      
      // Verifica se é uma URL absoluta válida
      const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w.-]*)*\/?$/;
      return urlPattern.test(url);
    } catch (error) {
      logger.error('Erro ao validar URL do avatar', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        url
      });
      return false;
    }
  }
  
  /**
   * Retorna um avatar padrão adequado ao tipo de personagem
   * @param isMain Indica se é o personagem principal (true) ou secundário (false)
   * @returns URL do avatar padrão
   */
  getDefaultAvatar(isMain: boolean = true): string {
    try {
      if (isMain) {
        return `${config.avatarServer}/assets/avatars/children/cartoon/child1.png`;
      } else {
        return `${config.avatarServer}/assets/avatars/children/cartoon/child2.png`;
      }
    } catch (error) {
      logger.error('Erro ao obter avatar padrão', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        isMain
      });
      // Fallback absoluto em caso de qualquer erro
      return `${config.avatarServer}/assets/avatars/children/default.png`;
    }
  }

  /**
   * Normaliza uma URL de avatar para o formato padrão
   * @param url URL do avatar
   * @param isMain Indica se é o personagem principal ou secundário (para fallback)
   * @returns URL normalizada
   */
  normalizeAvatarUrl(url: string, isMain: boolean = true): string {
    try {
      // Se a URL está vazia, retorna uma URL padrão
      if (!url) {
        logger.warn('URL de avatar vazia, usando avatar padrão');
        return this.getDefaultAvatar(isMain);
      }
      
      // Tratar Flaticon e outros CDNs confiáveis
      if (url.includes('cdn-icons-png.flaticon.com') || 
          url.includes('cdn.pixabay.com') || 
          url.includes('images.unsplash.com') ||
          url.includes('cloudinary.com')) {
        logger.info('URL de CDN detectada e aceita', { url });
        return url;
      }
      
      // Se já é uma URL completa (externa ou interna), retorna como está
      if (url.startsWith('http://') || url.startsWith('https://')) {
        logger.info('URL externa detectada', { url });
        return url;
      }
      
      // Se é uma URL relativa com barra inicial, combina com a URL do servidor
      if (url.startsWith('/')) {
        return `${config.avatarServer}${url}`;
      }
      
      // Se é uma URL relativa sem barra inicial, adiciona a barra
      if (url.startsWith('assets/')) {
        return `${config.avatarServer}/${url}`;
      }
      
      // Caso padrão: assume que é um caminho relativo para assets/avatars
      return `${config.avatarServer}/assets/avatars/${url}`;
    } catch (error) {
      logger.error('Erro ao normalizar URL do avatar', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        url
      });
      // Em caso de erro, retorna um avatar padrão
      return this.getDefaultAvatar(isMain);
    }
  }
}

export const avatarService = new AvatarService();