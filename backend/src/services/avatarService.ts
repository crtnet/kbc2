// src/services/avatarService.ts
import { logger } from '../utils/logger';

class AvatarService {
  /**
   * Gera uma descrição detalhada do personagem para uso no DALL-E
   * @param params Parâmetros contendo nome e tipo do personagem
   * @returns Descrição detalhada do personagem
   */
  async getAvatarDescription(params: {
    name: string;
    type: 'main' | 'secondary';
  }): Promise<string> {
    try {
      const { name, type } = params;
      
      // Determina se é um animal pelo nome
      const isAnimal = /gato|cachorro|urso|leão|tigre|raposa|coelho|lobo|macaco|elefante|girafa|pássaro|pato|galinha/i.test(name);
      
      if (isAnimal) {
        return `
- Animal antropomórfico com características humanas
- Postura bípede e expressão amigável
- Cores vibrantes e adequadas para público infantil
- Estilo de ilustração cartoon com traços limpos
- Expressão facial alegre e acolhedora
- Visual memorável e consistente para todas as ilustrações
        `.trim();
      }
      
      if (type === 'main') {
        return `
- Criança com expressão alegre e postura confiante
- Cores vibrantes e harmoniosas
- Estilo de ilustração infantil com traços expressivos
- Olhos grandes e expressivos
- Sorriso carismático e acolhedor
- Visual distintivo e memorável para o protagonista
        `.trim();
      }
      
      return `
- Personagem coadjuvante com características complementares
- Cores que harmonizam com o personagem principal
- Estilo visual consistente com a ilustração infantil
- Expressão que reflete seu papel na história
- Postura natural e bem definida
- Visual que mantém consistência em todas as cenas
        `.trim();
    } catch (error) {
      logger.error('Erro ao gerar descrição do personagem', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        params
      });
      
      // Em caso de erro, retorna uma descrição genérica
      return `
- Personagem de livro infantil com aparência amigável
- Cores vibrantes e expressivas adequadas para crianças
- Estilo visual de ilustração infantil moderna
- Expressões faciais memoráveis e carismáticas
      `.trim();
    }
  }
}

export const avatarService = new AvatarService();