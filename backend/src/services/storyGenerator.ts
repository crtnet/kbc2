import { logger } from '../utils/logger';
import { AgeRange } from '../models/Book';
import { openAIUnifiedService } from './openai.unified';

class StoryGeneratorService {
  async generateStory(
    prompt: string, 
    ageRange: AgeRange
  ): Promise<{ story: string; wordCount: number }> {
    try {
      logger.info(`Gerando história para faixa etária ${ageRange}`);
      // Chama o serviço unificado da OpenAI para gerar a história
      const result = await openAIUnifiedService.generateStory(prompt, ageRange);
      
      // Se o resultado for um objeto com a propriedade "story", extraímos; caso contrário, assumimos que é uma string
      const storyText = typeof result === 'string' ? result : result.story;
      
      // Verifica se storyText é realmente uma string
      if (typeof storyText !== 'string') {
        throw new Error('Formato da história retornado é inválido');
      }
      
      // Remove espaços extras e calcula a contagem de palavras
      const story = storyText.trim();
      const wordCount = story.split(/\s+/).length;
      
      return { story, wordCount };
    } catch (error: any) {
      logger.error(`Erro ao gerar história: ${error.message}`);
      throw error;
    }
  }
}

export default new StoryGeneratorService();