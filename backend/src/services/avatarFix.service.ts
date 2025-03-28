import { logger } from '../utils/logger';
import path from 'path';
import { config } from '../config';

/**
 * Serviço para processamento e correção de URLs de avatares
 * Garante que os avatares sejam acessíveis e válidos
 */
class AvatarFixService {
  /**
   * Processa uma URL de avatar para garantir que seja válida
   * @param avatarUrl URL original do avatar
   * @param isMainCharacter Se é o personagem principal (para fallbacks diferentes)
   * @returns URL processada e normalizada
   */
  processAvatarUrl(avatarUrl: string, isMainCharacter: boolean): string {
    try {
      if (!avatarUrl || avatarUrl.trim() === '') {
        logger.warn('URL de avatar vazia, usando avatar padrão');
        return this.getDefaultAvatarUrl(isMainCharacter);
      }

      // Verifica se a URL já é absoluta
      if (this.isAbsoluteUrl(avatarUrl)) {
        logger.info('URL de avatar já é absoluta, mantendo como está');
        return avatarUrl;
      }

      // Verifica se a URL começa com /public ou /uploads
      if (avatarUrl.startsWith('/public/') || avatarUrl.startsWith('/uploads/')) {
        const baseUrl = config.avatarServer || 'http://localhost:3000';
        const normalizedUrl = `${baseUrl}${avatarUrl}`;
        logger.info(`URL de avatar normalizada: ${normalizedUrl}`);
        return normalizedUrl;
      }

      // Verifica se a URL é relativa sem barra inicial
      if (!avatarUrl.startsWith('/') && !avatarUrl.startsWith('http')) {
        const baseUrl = config.avatarServer || 'http://localhost:3000';
        const normalizedUrl = `${baseUrl}/public/uploads/${avatarUrl}`;
        logger.info(`URL de avatar normalizada para caminho relativo: ${normalizedUrl}`);
        return normalizedUrl;
      }

      // Se chegou aqui, tenta normalizar adicionando o servidor base
      const baseUrl = config.avatarServer || 'http://localhost:3000';
      const normalizedUrl = `${baseUrl}${avatarUrl.startsWith('/') ? '' : '/'}${avatarUrl}`;
      logger.info(`URL de avatar normalizada com base: ${normalizedUrl}`);
      return normalizedUrl;
    } catch (error) {
      logger.error('Erro ao processar URL do avatar', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        avatarUrl
      });
      return this.getDefaultAvatarUrl(isMainCharacter);
    }
  }

  /**
   * Verifica se uma URL é absoluta (começa com http:// ou https://)
   * @param url URL a ser verificada
   * @returns true se for absoluta, false caso contrário
   */
  private isAbsoluteUrl(url: string): boolean {
    return /^https?:\/\//i.test(url);
  }

  /**
   * Retorna uma URL de avatar padrão baseada no tipo de personagem
   * @param isMainCharacter Se é o personagem principal
   * @returns URL do avatar padrão
   */
  getDefaultAvatarUrl(isMainCharacter: boolean): string {
    const baseUrl = config.avatarServer || 'http://localhost:3000';
    
    if (isMainCharacter) {
      return `${baseUrl}/public/uploads/default-main-avatar.png`;
    } else {
      return `${baseUrl}/public/uploads/default-secondary-avatar.png`;
    }
  }

  /**
   * Verifica se um avatar existe no sistema de arquivos
   * @param avatarUrl URL do avatar
   * @returns true se existir, false caso contrário
   */
  async checkAvatarExists(avatarUrl: string): Promise<boolean> {
    try {
      // Implementação simplificada - em produção, verificaria o arquivo no sistema
      // ou faria uma requisição HEAD para verificar se a URL é acessível
      return true;
    } catch (error) {
      logger.error('Erro ao verificar existência do avatar', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        avatarUrl
      });
      return false;
    }
  }
}

export const avatarFixService = new AvatarFixService();