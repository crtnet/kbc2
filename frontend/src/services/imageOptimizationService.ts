// src/services/imageOptimizationService.ts

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Constantes para configuração
const CACHE_EXPIRY_TIME = 7 * 24 * 60 * 60 * 1000; // 7 dias em milissegundos
const IMAGE_CACHE_PREFIX = 'image_cache_';
const IMAGE_CACHE_INDEX = 'image_cache_index';
const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB

// Interface para metadados da imagem em cache
interface CachedImageMetadata {
  url: string;
  localUri: string;
  size: number;
  timestamp: number;
  width?: number;
  height?: number;
}

/**
 * Serviço para otimização e cache de imagens
 */
class ImageOptimizationService {
  private cacheIndex: Record<string, CachedImageMetadata> = {};
  private initialized = false;
  private cacheSize = 0;

  /**
   * Inicializa o serviço de cache de imagens
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Carrega o índice de cache
      const cacheIndexJson = await AsyncStorage.getItem(IMAGE_CACHE_INDEX);
      if (cacheIndexJson) {
        this.cacheIndex = JSON.parse(cacheIndexJson);
        
        // Calcula o tamanho total do cache
        this.cacheSize = Object.values(this.cacheIndex).reduce((total, item) => total + (item.size || 0), 0);
        
        console.log(`Cache de imagens inicializado: ${Object.keys(this.cacheIndex).length} imagens, ${Math.round(this.cacheSize / 1024 / 1024)}MB`);
        
        // Limpa entradas expiradas
        await this.cleanExpiredCache();
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Erro ao inicializar cache de imagens:', error);
      // Reseta o cache em caso de erro
      this.cacheIndex = {};
      this.cacheSize = 0;
      await AsyncStorage.setItem(IMAGE_CACHE_INDEX, JSON.stringify(this.cacheIndex));
      this.initialized = true;
    }
  }

  /**
   * Limpa entradas expiradas do cache
   */
  private async cleanExpiredCache(): Promise<void> {
    const now = Date.now();
    const expiredKeys = Object.keys(this.cacheIndex).filter(
      key => now - this.cacheIndex[key].timestamp > CACHE_EXPIRY_TIME
    );

    if (expiredKeys.length === 0) return;

    console.log(`Limpando ${expiredKeys.length} imagens expiradas do cache`);

    // Remove arquivos expirados
    for (const key of expiredKeys) {
      try {
        const metadata = this.cacheIndex[key];
        await FileSystem.deleteAsync(metadata.localUri, { idempotent: true });
        this.cacheSize -= metadata.size || 0;
        delete this.cacheIndex[key];
      } catch (error) {
        console.warn(`Erro ao remover imagem expirada do cache: ${key}`, error);
      }
    }

    // Atualiza o índice de cache
    await AsyncStorage.setItem(IMAGE_CACHE_INDEX, JSON.stringify(this.cacheIndex));
  }

  /**
   * Limpa o cache se estiver muito grande
   */
  private async enforceMaxCacheSize(): Promise<void> {
    if (this.cacheSize <= MAX_CACHE_SIZE) return;

    console.log(`Cache de imagens muito grande (${Math.round(this.cacheSize / 1024 / 1024)}MB), limpando...`);

    // Ordena as entradas por timestamp (mais antigas primeiro)
    const entries = Object.entries(this.cacheIndex)
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => a.timestamp - b.timestamp);

    // Remove entradas até que o cache esteja abaixo do limite
    while (this.cacheSize > MAX_CACHE_SIZE * 0.8 && entries.length > 0) {
      const entry = entries.shift();
      if (!entry) break;

      try {
        await FileSystem.deleteAsync(entry.localUri, { idempotent: true });
        this.cacheSize -= entry.size || 0;
        delete this.cacheIndex[entry.key];
      } catch (error) {
        console.warn(`Erro ao remover imagem do cache durante limpeza: ${entry.key}`, error);
      }
    }

    // Atualiza o índice de cache
    await AsyncStorage.setItem(IMAGE_CACHE_INDEX, JSON.stringify(this.cacheIndex));
    console.log(`Cache de imagens reduzido para ${Math.round(this.cacheSize / 1024 / 1024)}MB`);
  }

  /**
   * Gera uma chave de cache para uma URL
   */
  private getCacheKey(url: string): string {
    // Remove parâmetros de query para melhorar o cache hit
    const baseUrl = url.split('?')[0];
    return IMAGE_CACHE_PREFIX + baseUrl.replace(/[^a-zA-Z0-9]/g, '_');
  }

  /**
   * Obtém uma imagem otimizada, usando cache quando possível
   */
  async getOptimizedImage(
    url: string, 
    options: { width?: number; height?: number; quality?: number } = {}
  ): Promise<string> {
    if (!url) return url;
    
    // Inicializa o serviço se necessário
    if (!this.initialized) {
      await this.initialize();
    }

    // Configura opções padrão
    const width = options.width || 300;
    const quality = options.quality || 80;
    
    // Gera a chave de cache
    const cacheKey = this.getCacheKey(url);
    
    // Verifica se a imagem já está em cache
    if (this.cacheIndex[cacheKey]) {
      const cachedImage = this.cacheIndex[cacheKey];
      
      // Verifica se o arquivo existe
      try {
        const fileInfo = await FileSystem.getInfoAsync(cachedImage.localUri);
        if (fileInfo.exists) {
          // Atualiza o timestamp para manter a imagem no cache
          cachedImage.timestamp = Date.now();
          await AsyncStorage.setItem(IMAGE_CACHE_INDEX, JSON.stringify(this.cacheIndex));
          
          console.log(`Usando imagem em cache: ${url.substring(0, 50)}...`);
          return cachedImage.localUri;
        }
      } catch (error) {
        console.warn(`Erro ao verificar imagem em cache: ${url.substring(0, 50)}...`, error);
      }
    }
    
    // Se chegou aqui, precisa baixar e otimizar a imagem
    try {
      console.log(`Baixando e otimizando imagem: ${url.substring(0, 50)}...`);
      
      // Cria o diretório de cache se não existir
      const cacheDir = `${FileSystem.cacheDirectory}optimized_images/`;
      const dirInfo = await FileSystem.getInfoAsync(cacheDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
      }
      
      // Baixa a imagem para um arquivo temporário
      const tempFilePath = `${FileSystem.cacheDirectory}temp_${Date.now()}.jpg`;
      const downloadResult = await FileSystem.downloadAsync(url, tempFilePath);
      
      if (downloadResult.status !== 200) {
        throw new Error(`Falha ao baixar imagem: ${downloadResult.status}`);
      }
      
      // Otimiza a imagem
      const optimizedImage = await manipulateAsync(
        tempFilePath,
        [{ resize: { width } }],
        { compress: quality / 100, format: SaveFormat.JPEG }
      );
      
      // Move para o local final
      const finalPath = `${cacheDir}${cacheKey}.jpg`;
      await FileSystem.moveAsync({
        from: optimizedImage.uri,
        to: finalPath
      });
      
      // Remove o arquivo temporário
      await FileSystem.deleteAsync(tempFilePath, { idempotent: true });
      
      // Obtém informações do arquivo
      const fileInfo = await FileSystem.getInfoAsync(finalPath);
      
      // Atualiza o índice de cache
      this.cacheIndex[cacheKey] = {
        url,
        localUri: finalPath,
        size: fileInfo.size || 0,
        timestamp: Date.now(),
        width,
        height: options.height
      };
      
      this.cacheSize += fileInfo.size || 0;
      await AsyncStorage.setItem(IMAGE_CACHE_INDEX, JSON.stringify(this.cacheIndex));
      
      // Verifica se o cache está muito grande
      await this.enforceMaxCacheSize();
      
      console.log(`Imagem otimizada e salva em cache: ${url.substring(0, 50)}...`);
      return finalPath;
    } catch (error) {
      console.error(`Erro ao otimizar imagem: ${url.substring(0, 50)}...`, error);
      // Em caso de erro, retorna a URL original
      return url;
    }
  }

  /**
   * Limpa todo o cache de imagens
   */
  async clearCache(): Promise<void> {
    try {
      // Inicializa o serviço se necessário
      if (!this.initialized) {
        await this.initialize();
      }
      
      console.log('Limpando todo o cache de imagens...');
      
      // Remove todos os arquivos
      for (const key of Object.keys(this.cacheIndex)) {
        try {
          const metadata = this.cacheIndex[key];
          await FileSystem.deleteAsync(metadata.localUri, { idempotent: true });
        } catch (error) {
          console.warn(`Erro ao remover imagem do cache: ${key}`, error);
        }
      }
      
      // Reseta o índice
      this.cacheIndex = {};
      this.cacheSize = 0;
      await AsyncStorage.setItem(IMAGE_CACHE_INDEX, JSON.stringify(this.cacheIndex));
      
      console.log('Cache de imagens limpo com sucesso');
    } catch (error) {
      console.error('Erro ao limpar cache de imagens:', error);
    }
  }
}

export const imageOptimizationService = new ImageOptimizationService();