import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { logger } from '../utils/logger';

class ImageCacheService {
  private memoryCache: Map<string, string> = new Map();
  private loadingPromises: Map<string, Promise<string>> = new Map();
  private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 dias em milissegundos
  private readonly CACHE_DIR = `${FileSystem.cacheDirectory}image-cache/`;

  constructor() {
    this.initializeCache();
  }

  private async initializeCache() {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.CACHE_DIR, { intermediates: true });
      }
    } catch (error) {
      logger.error('Erro ao inicializar cache de imagens:', error);
    }
  }

  public async getImageUrl(imageUrl: string): Promise<string> {
    // Se a imagem já estiver em cache na memória, retorna imediatamente
    if (this.memoryCache.has(imageUrl)) {
      return this.memoryCache.get(imageUrl)!;
    }

    // Se já existe uma promessa de carregamento para esta imagem, retorna ela
    if (this.loadingPromises.has(imageUrl)) {
      return this.loadingPromises.get(imageUrl)!;
    }

    // Cria uma nova promessa para carregar a imagem
    const loadPromise = this.loadImage(imageUrl);
    this.loadingPromises.set(imageUrl, loadPromise);

    try {
      const cachedUrl = await loadPromise;
      this.loadingPromises.delete(imageUrl);
      return cachedUrl;
    } catch (error) {
      this.loadingPromises.delete(imageUrl);
      throw error;
    }
  }

  private async loadImage(imageUrl: string): Promise<string> {
    try {
      // Gera um nome único para o arquivo baseado na URL
      const fileName = this.generateFileName(imageUrl);
      const filePath = `${this.CACHE_DIR}${fileName}`;

      // Verifica se o arquivo existe no cache
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists) {
        // Verifica se o arquivo não está expirado
        const stats = await FileSystem.getInfoAsync(filePath);
        if (stats.exists && stats.modificationTime) {
          const fileAge = Date.now() - stats.modificationTime * 1000;
          if (fileAge <= this.CACHE_DURATION) {
            this.memoryCache.set(imageUrl, filePath);
            return filePath;
          }
        }
      }

      // Se o arquivo não existe ou está expirado, faz o download
      const downloadResumable = FileSystem.createDownloadResumable(
        imageUrl,
        filePath,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          logger.info(`Progresso do download: ${Math.round(progress * 100)}%`);
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (!result) {
        throw new Error('Falha ao baixar imagem');
      }

      this.memoryCache.set(imageUrl, result.uri);
      return result.uri;
    } catch (error) {
      logger.error('Erro ao carregar imagem:', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        imageUrl
      });
      throw error;
    }
  }

  private generateFileName(url: string): string {
    // Remove caracteres especiais e cria um hash simples da URL
    const hash = url.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0) | 0;
    }, 0).toString(36);

    // Adiciona a extensão baseada na URL
    const extension = url.match(/\.(jpg|jpeg|png|gif)$/i)?.[1] || 'jpg';
    return `${hash}.${extension}`;
  }

  public async clearCache(): Promise<void> {
    try {
      this.memoryCache.clear();
      this.loadingPromises.clear();
      
      const dirInfo = await FileSystem.getInfoAsync(this.CACHE_DIR);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(this.CACHE_DIR, { idempotent: true });
      }
      await FileSystem.makeDirectoryAsync(this.CACHE_DIR, { intermediates: true });
      
      logger.info('Cache de imagens limpo com sucesso');
    } catch (error) {
      logger.error('Erro ao limpar cache de imagens:', error);
      throw error;
    }
  }
}

export const imageCacheService = new ImageCacheService(); 