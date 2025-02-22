import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { config } from '../config';
import { AgeRange } from '../models/Book';

interface StoryGenerationConfig {
  minWords: number;
  maxWords: number;
  complexity: number;
  promptTemplate: string;
}

class OpenAIUnifiedService {
  private openai: OpenAI;
  private static instance: OpenAIUnifiedService;

  // Configurações otimizadas por faixa etária
  private ageRangeConfigs: Record<AgeRange, StoryGenerationConfig> = {
    '1-2': {
      minWords: 50,
      maxWords: 100,
      complexity: 0.2,
      promptTemplate: 'história muito simples para bebês (1-2 anos). Use frases curtas de 2-3 palavras, repetição e palavras básicas.'
    },
    '3-4': {
      minWords: 100,
      maxWords: 200,
      complexity: 0.3,
      promptTemplate: 'história simples para crianças pequenas (3-4 anos). Use frases curtas, vocabulário familiar e sequência clara.'
    },
    '5-6': {
      minWords: 200,
      maxWords: 300,
      complexity: 0.4,
      promptTemplate: 'história para pré-escolares (5-6 anos). Use frases simples conectadas, vocabulário descritivo e sequência lógica.'
    },
    '7-8': {
      minWords: 300,
      maxWords: 500,
      complexity: 0.5,
      promptTemplate: 'história para crianças (7-8 anos). Use parágrafos curtos, vocabulário rico e desenvolvimento de personagens.'
    },
    '9-10': {
      minWords: 500,
      maxWords: 700,
      complexity: 0.6,
      promptTemplate: 'história para crianças mais velhas (9-10 anos). Use narrativa elaborada, vocabulário variado e temas mais complexos.'
    },
    '11-12': {
      minWords: 700,
      maxWords: 1000,
      complexity: 0.7,
      promptTemplate: 'história para pré-adolescentes (11-12 anos). Use narrativa sofisticada, temas abstratos e desenvolvimento complexo.'
    }
  };

  private constructor() {
    if (!config.openaiApiKey) {
      throw new Error('OpenAI API Key não configurada');
    }
    
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey
    });
    
    // Validação da instância
    if (!this.openai) {
      throw new Error('Falha ao inicializar cliente OpenAI');
    }
  }

  public static getInstance(): OpenAIUnifiedService {
    if (!OpenAIUnifiedService.instance) {
      logger.info('Criando nova instância do OpenAIUnifiedService');
      try {
        OpenAIUnifiedService.instance = new OpenAIUnifiedService();
        logger.info('Instância do OpenAIUnifiedService criada com sucesso');
      } catch (error) {
        logger.error('Erro ao criar instância do OpenAIUnifiedService:', error);
        throw error;
      }
    }
    return OpenAIUnifiedService.instance;
  }

  private estimateTokens(words: number): number {
    // Em média, 1 palavra = 1.3 tokens em português
    return Math.ceil(words * 1.3);
  }

  async generateStory(
    prompt: string,
    ageRange: AgeRange
  ): Promise<{ story: string; wordCount: number }> {
    try {
      const config = this.ageRangeConfigs[ageRange];
      const startTime = Date.now();
      
      logger.info(`Iniciando geração de história para faixa etária ${ageRange}`);
      logger.info(`Parâmetros recebidos: ${JSON.stringify({ ageRange, wordRange: `${config.minWords}-${config.maxWords}` })}`);

      // Prompt otimizado com instruções mais específicas
      const optimizedPrompt = `Crie uma história infantil em português com exatamente estas características:

1. FORMATO:
- Mínimo ${config.minWords} palavras
- Máximo ${config.maxWords} palavras
- Parágrafos curtos
- Linguagem ${config.promptTemplate}

2. HISTÓRIA:
${prompt}

IMPORTANTE: Mantenha-se ESTRITAMENTE entre ${config.minWords} e ${config.maxWords} palavras.`;

      const maxTokens = this.estimateTokens(config.maxWords * 1.1); // 10% de margem

      logger.info('Enviando requisição para OpenAI...');
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Você é um escritor especializado em histórias infantis curtas e precisas, focado em manter o texto dentro do limite de palavras especificado."
          },
          {
            role: "user",
            content: optimizedPrompt
          }
        ],
        temperature: config.complexity,
        max_tokens: maxTokens,
        presence_penalty: 0.2,
        frequency_penalty: 0.3,
        top_p: 0.8, // Aumenta a precisão das respostas
      });

      const story = completion.choices[0].message.content?.trim() || '';
      const wordCount = this.countWords(story);
      const timeSpent = Date.now() - startTime;

      logger.info(`História gerada em ${timeSpent}ms`);
      logger.info(`Estatísticas: ${JSON.stringify({
        wordCount,
        tokensUsed: completion.usage?.total_tokens,
        timeSpentSeconds: timeSpent / 1000
      })}`);

      // Verifica se está dentro dos limites
      if (wordCount < config.minWords || wordCount > config.maxWords) {
        logger.warn(`História fora do intervalo desejado. Tentando ajuste rápido...`);
        
        // Tenta um ajuste rápido sem nova chamada à API
        const adjustedStory = await this.quickAdjustStory(story, config.minWords, config.maxWords);
        const adjustedWordCount = this.countWords(adjustedStory);
        
        logger.info(`Ajuste concluído. Nova contagem: ${adjustedWordCount} palavras`);
        return { story: adjustedStory, wordCount: adjustedWordCount };
      }

      return { story, wordCount };
    } catch (error) {
      logger.error(`Erro ao gerar história: ${error.message}`);
      throw error;
    }
  }

  private async quickAdjustStory(story: string, minWords: number, maxWords: number): Promise<string> {
    const words = story.split(/\s+/);
    const currentCount = words.length;
    
    if (currentCount < minWords) {
      // Adiciona detalhes simples para atingir o mínimo
      const missingWords = minWords - currentCount;
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Adicione detalhes naturais à história mantendo o estilo e contexto."
          },
          {
            role: "user",
            content: `Adicione aproximadamente ${missingWords} palavras a esta história mantendo o mesmo estilo:\n\n${story}`
          }
        ],
        temperature: 0.3,
        max_tokens: this.estimateTokens(missingWords * 2),
      });
      return completion.choices[0].message.content?.trim() || story;
    } else if (currentCount > maxWords) {
      // Remove palavras mantendo a coerência
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Resuma a história mantendo os elementos principais e o estilo."
          },
          {
            role: "user",
            content: `Resuma esta história em no máximo ${maxWords} palavras mantendo a essência:\n\n${story}`
          }
        ],
        temperature: 0.3,
        max_tokens: this.estimateTokens(maxWords),
      });
      return completion.choices[0].message.content?.trim() || story;
    }
    
    return story;
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }
}

export const openAIUnifiedService = OpenAIUnifiedService.getInstance();