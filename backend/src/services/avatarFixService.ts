// src/services/avatarFixService.ts
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';
import { config } from '../config/config';

/**
 * Serviço de emergência para resolver problemas com avatares
 * Este serviço fornece um conjunto de funções mais simples e robustas
 * para lidar com avatares, evitando as complexidades do serviço original
 */
class AvatarFixService {
  /**
   * Retorna um avatar padrão garantido
   */
  getDefaultAvatarUrl(isMainCharacter: boolean = true): string {
    try {
      // Caminhos para os avatares padrão
      const mainAvatarPath = path.join(__dirname, '../../public/assets/avatars/children/default_main.png');
      const secondaryAvatarPath = path.join(__dirname, '../../public/assets/avatars/children/default_secondary.png');
      const genericAvatarPath = path.join(__dirname, '../../public/assets/avatars/children/default.png');
      
      // Verifica se os arquivos existem
      if (isMainCharacter && fsSync.existsSync(mainAvatarPath)) {
        return `${config.avatarServer}/assets/avatars/children/default_main.png`;
      } else if (!isMainCharacter && fsSync.existsSync(secondaryAvatarPath)) {
        return `${config.avatarServer}/assets/avatars/children/default_secondary.png`;
      } else if (fsSync.existsSync(genericAvatarPath)) {
        return `${config.avatarServer}/assets/avatars/children/default.png`;
      }
      
      // Se nenhum arquivo existir, use URLs públicas de CDNs
      return isMainCharacter
        ? "https://cdn-icons-png.flaticon.com/512/4128/4128176.png" // Ícone de criança
        : "https://cdn-icons-png.flaticon.com/512/3048/3048122.png"; // Ícone de adulto
    } catch (error) {
      logger.error('Erro no getDefaultAvatarUrl', {
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      
      // Em caso de erro, use URLs públicas de CDNs
      return isMainCharacter
        ? "https://cdn-icons-png.flaticon.com/512/4128/4128176.png" // Ícone de criança
        : "https://cdn-icons-png.flaticon.com/512/3048/3048122.png"; // Ícone de adulto
    }
  }
  
  /**
   * Processa um avatar de forma simplificada
   * @param avatarUrl URL ou caminho do avatar
   * @param isMainCharacter Indica se é o personagem principal
   * @returns URL normalizada para o avatar
   */
  processAvatarUrl(avatarUrl: string, isMainCharacter: boolean = true): string {
    try {
      // Se não houver URL, retorna o avatar padrão
      if (!avatarUrl) {
        logger.info('URL de avatar vazia, usando padrão');
        return this.getDefaultAvatarUrl(isMainCharacter);
      }
      
      // Se for URL de CDN confiável, retorna diretamente
      if (this.isTrustedCDN(avatarUrl)) {
        logger.info('URL de CDN confiável, retornando como está', { avatarUrl });
        return avatarUrl;
      }
      
      // Se for URL externa, retorna diretamente
      if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
        logger.info('URL externa, retornando como está', { avatarUrl });
        return avatarUrl;
      }
      
      // Se for caminho relativo, normaliza
      if (avatarUrl.startsWith('/')) {
        return `${config.avatarServer}${avatarUrl}`;
      }
      
      if (avatarUrl.startsWith('assets/')) {
        return `${config.avatarServer}/${avatarUrl}`;
      }
      
      // Caso padrão, assume caminho para avatars
      return `${config.avatarServer}/assets/avatars/${avatarUrl}`;
    } catch (error) {
      logger.error('Erro ao processar URL do avatar', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        avatarUrl
      });
      
      // Em caso de erro, retorna o avatar padrão
      return this.getDefaultAvatarUrl(isMainCharacter);
    }
  }
  
  /**
   * Verifica se uma URL é de um CDN confiável
   * @param url URL a ser verificada
   * @returns Verdadeiro se for CDN confiável
   */
  isTrustedCDN(url: string): boolean {
    if (!url) return false;
    
    return url.includes('cdn-icons-png.flaticon.com') ||
           url.includes('cdn.pixabay.com') ||
           url.includes('images.unsplash.com') ||
           url.includes('cloudinary.com');
  }
  
  /**
   * Prepara descrição simples do personagem para prompts de DALL-E
   * @param name Nome do personagem
   * @param isMainCharacter Se é o personagem principal
   * @returns String com a descrição do personagem
   */
  prepareCharacterDescription(name: string, isMainCharacter: boolean = true): string {
    try {
      const characterType = isMainCharacter ? 'PRINCIPAL' : 'SECUNDÁRIO';
      
      // Determina o tipo de personagem com base no nome
      const isAnimal = /gato|cachorro|urso|leão|tigre|raposa|coelho|lobo|macaco|elefante|girafa|pássaro|pato|galinha/i.test(name);
      
      let appearance = '';
      if (isAnimal) {
        appearance = 'animal antropomórfico com expressão amigável e características humanas';
      } else if (isMainCharacter) {
        appearance = 'criança com expressão alegre e postura confiante';
      } else {
        appearance = Math.random() > 0.5 
          ? 'adulto com expressão gentil e postura protetora'
          : 'criança com expressão curiosa e postura animada';
      }
      
      const expressions = [
        'sorriso amigável e olhar curioso',
        'expressão alegre e postura confiante',
        'olhar atento e sorriso sutil',
        'expressão calorosa e acolhedora',
        'olhar brilhante e expressão entusiasmada'
      ];
      
      const expression = expressions[Math.floor(Math.random() * expressions.length)];
      
      return `PERSONAGEM ${characterType} "${name}":
- Aparência: ${appearance}
- Cores predominantes: cores vibrantes e harmoniosas
- Estilo visual: ilustração infantil com traços simples e expressivos
- Expressão: ${expression}

IMPORTANTE: Mantenha consistência visual em todas as ilustrações.`;
    } catch (error) {
      logger.error('Erro ao preparar descrição de personagem', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        name,
        isMainCharacter
      });
      
      // Descrição genérica em caso de erro
      return `PERSONAGEM "${name}": personagem de livro infantil com aparência amigável`;
    }
  }
}

export const avatarFixService = new AvatarFixService();