import { logger } from '../utils/logger';
import { AgeRange } from '../models/Book';
import { openAIUnifiedService } from './openai.unified';

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
      return await openAIUnifiedService.generateStory(prompt, ageRange);
    } catch (error) {
      logger.error(`Erro ao gerar história: ${error.message}`);
      throw error;
    }
  }
}

export default new StoryGeneratorService();