import { logger } from '../utils/logger';
import { AgeRange } from '../models/Book';
import { openAIUnifiedService } from './openai.unified';

// Interface opcional para configuração de geração de história, 
// atualmente não utilizada mas disponível para futuras customizações
interface StoryGenerationConfig {
  minWords: number;
  maxWords: number;
  complexity: number;
  sentenceStructure: string;
  vocabularyLevel: string;
  cognitiveDescription: string;
  languageDevelopment: string;
  comprehensionSkills: string;
  emotionalUnderstanding: string;
}

class StoryGeneratorService {
  async generateStory(
    prompt: string, 
    ageRange: AgeRange
  ): Promise<{ story: string; wordCount: number }> {
    try {
      logger.info(`Gerando história para faixa etária ${ageRange}`);
      // Chama o serviço unificado da OpenAI para gerar a história
      return await openAIUnifiedService.generateStory(prompt, ageRange);
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Erro ao gerar história: ${error.message}`);
      } else {
        logger.error('Erro ao gerar história:', error);
      }
      throw error;
    }
  }
}

export default new StoryGeneratorService();