import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { config } from '../config';
import { AgeRange } from '../models/Book';

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
  private openai: OpenAI;

  // Configurações detalhadas por faixa etária
  private ageRangeConfigs: Record<AgeRange, StoryGenerationConfig> = {
    '1-2': {
      minWords: 50,
      maxWords: 100,
      complexity: 0.2,
      sentenceStructure: 'Muito simples e curto',
      vocabularyLevel: 'Palavras concretas e básicas',
      cognitiveDescription: 'Pensamento pré-operacional, foco em objetos concretos e ações simples',
      languageDevelopment: 'Vocabulário limitado, frases curtas de 2-3 palavras, muita repetição',
      comprehensionSkills: 'Compreende instruções simples, reconhece objetos familiares',
      emotionalUnderstanding: 'Reconhece emoções básicas, forte conexão com figuras de apego'
    },
    '3-4': {
      minWords: 100,
      maxWords: 200,
      complexity: 0.3,
      sentenceStructure: 'Curto, com algumas frases compostas',
      vocabularyLevel: 'Palavras familiares e descritivas simples',
      cognitiveDescription: 'Início do pensamento simbólico, curiosidade crescente',
      languageDevelopment: 'Frases mais complexas, usa pronomes, conta histórias simples',
      comprehensionSkills: 'Entende sequências simples, começa a compreender causa e efeito',
      emotionalUnderstanding: 'Identifica emoções básicas, desenvolve empatia inicial'
    },
    '5-6': {
      minWords: 200,
      maxWords: 300,
      complexity: 0.4,
      sentenceStructure: 'Frases mais elaboradas, com conectivos simples',
      vocabularyLevel: 'Palavras descritivas, início de abstração',
      cognitiveDescription: 'Pensamento intuitivo, classificação básica, compreensão de regras simples',
      languageDevelopment: 'Vocabulário expandindo, conta histórias com mais detalhes, usa tempos verbais',
      comprehensionSkills: 'Entende conceitos temporais básicos, sequência narrativa mais clara',
      emotionalUnderstanding: 'Reconhece emoções complexas, desenvolve empatia'
    },
    '7-8': {
      minWords: 300,
      maxWords: 500,
      complexity: 0.5,
      sentenceStructure: 'Frases com mais detalhes, parágrafos curtos',
      vocabularyLevel: 'Vocabulário rico, palavras descritivas',
      cognitiveDescription: 'Pensamento lógico concreto, compreensão de regras mais complexas',
      languageDevelopment: 'Linguagem fluente, usa metáforas simples, conta histórias elaboradas',
      comprehensionSkills: 'Entende conceitos mais abstratos, faz inferências simples',
      emotionalUnderstanding: 'Compreende motivações, diferencia perspectivas'
    },
    '9-10': {
      minWords: 500,
      maxWords: 700,
      complexity: 0.6,
      sentenceStructure: 'Frases complexas, parágrafos com mais detalhes',
      vocabularyLevel: 'Vocabulário variado, palavras mais abstratas',
      cognitiveDescription: 'Pensamento lógico mais desenvolvido, raciocínio hipotético inicial',
      languageDevelopment: 'Linguagem sofisticada, uso de figuras de linguagem',
      comprehensionSkills: 'Compreensão de nuances, interpretação de metáforas',
      emotionalUnderstanding: 'Empatia desenvolvida, compreensão de emoções complexas'
    },
    '11-12': {
      minWords: 700,
      maxWords: 1000,
      complexity: 0.7,
      sentenceStructure: 'Frases complexas, narrativa elaborada',
      vocabularyLevel: 'Vocabulário avançado, palavras abstratas e figurativas',
      cognitiveDescription: 'Pensamento abstrato emergente, raciocínio hipotético-dedutivo',
      languageDevelopment: 'Linguagem altamente sofisticada, uso elaborado de figuras de linguagem',
      comprehensionSkills: 'Interpretação profunda, compreensão de múltiplas perspectivas',
      emotionalUnderstanding: 'Compreensão complexa de emoções, empatia avançada'
    }
  };

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey
    });
  }

  async generateStory(
    prompt: string, 
    ageRange: AgeRange
  ): Promise<{ story: string; wordCount: number }> {
    try {
      const config = this.ageRangeConfigs[ageRange];
      logger.info(`Gerando história para faixa etária ${ageRange}`);

      const fullPrompt = `
        Gere uma história infantil com as seguintes características específicas para crianças de ${ageRange} anos:

        DESENVOLVIMENTO COGNITIVO:
        ${config.cognitiveDescription}

        DESENVOLVIMENTO DA LINGUAGEM:
        ${config.languageDevelopment}

        HABILIDADES DE COMPREENSÃO:
        ${config.comprehensionSkills}

        COMPREENSÃO EMOCIONAL:
        ${config.emotionalUnderstanding}

        REQUISITOS TÉCNICOS:
        - Número mínimo de palavras: ${config.minWords}
        - Número máximo de palavras: ${config.maxWords}
        - Estrutura de frases: ${config.sentenceStructure}
        - Nível de vocabulário: ${config.vocabularyLevel}

        INSTRUÇÕES ADICIONAIS:
        1. A história DEVE ser totalmente adequada para ${ageRange} anos
        2. Use linguagem e conceitos apropriados para esta idade
        3. Mantenha o número de palavras estritamente entre ${config.minWords} e ${config.maxWords}
        4. Considere o desenvolvimento cognitivo e emocional desta faixa etária
        5. Ao final da história, inclua um comentário com a contagem de palavras

        CONTEXTO ADICIONAL DO PROMPT:
        ${prompt}
      `;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Você é um escritor especializado em histórias infantis, com profundo conhecimento do desenvolvimento infantil e capacidade de adaptar narrativas para diferentes idades."
          },
          {
            role: "user",
            content: fullPrompt
          }
        ],
        temperature: config.complexity,
        max_tokens: config.maxWords * 1.2, // Margem extra para tokens
      });

      let story = completion.choices[0].message.content || '';
      
      // Extrair contagem de palavras se estiver no final da história
      const wordCountMatch = story.match(/\[Contagem de palavras: (\d+)\]/);
      let wordCount = wordCountMatch 
        ? parseInt(wordCountMatch[1]) 
        : this.countWords(story);

      // Remover a linha de contagem de palavras, se existir
      story = story.replace(/\[Contagem de palavras: \d+\]/, '').trim();

      // Se a contagem de palavras estiver fora do intervalo, ajustar
      if (wordCount < config.minWords || wordCount > config.maxWords) {
        logger.warn(`História gerada tem ${wordCount} palavras. Tentando ajustar.`);
        const adjustedResult = await this.adjustStoryLength(story, config);
        story = adjustedResult.story;
        wordCount = adjustedResult.wordCount;
      }

      return { story, wordCount };
    } catch (error) {
      logger.error(`Erro ao gerar história: ${error.message}`);
      throw error;
    }
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }

  private async adjustStoryLength(
    story: string, 
    config: StoryGenerationConfig
  ): Promise<{ story: string; wordCount: number }> {
    try {
      const fullPrompt = `
        Ajuste o texto abaixo para ter entre ${config.minWords} e ${config.maxWords} palavras:
        
        ${story}

        Instruções:
        1. Mantenha a essência da história
        2. Ajuste o texto para ${config.minWords}-${config.maxWords} palavras
        3. Use linguagem adequada para ${config.vocabularyLevel}
        4. Considere o desenvolvimento cognitivo de ${config.cognitiveDescription}
        5. Não altere o tom ou tema principal
        6. Ao final, inclua um comentário com a contagem de palavras
      `;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Você é um editor especializado em ajustar textos para diferentes faixas etárias, respeitando limites de palavras e desenvolvimento cognitivo."
          },
          {
            role: "user",
            content: fullPrompt
          }
        ],
        temperature: 0.5,
        max_tokens: config.maxWords * 1.2,
      });

      let adjustedStory = completion.choices[0].message.content || story;
      
      // Extrair contagem de palavras se estiver no final da história
      const wordCountMatch = adjustedStory.match(/\[Contagem de palavras: (\d+)\]/);
      let wordCount = wordCountMatch 
        ? parseInt(wordCountMatch[1]) 
        : this.countWords(adjustedStory);

      // Remover a linha de contagem de palavras, se existir
      adjustedStory = adjustedStory.replace(/\[Contagem de palavras: \d+\]/, '').trim();

      // Garantir que está dentro do intervalo
      if (wordCount < config.minWords || wordCount > config.maxWords) {
        logger.warn(`Texto ajustado ainda fora do intervalo: ${wordCount} palavras`);
        wordCount = Math.min(Math.max(wordCount, config.minWords), config.maxWords);
      }

      return { story: adjustedStory, wordCount };
    } catch (error) {
      logger.error(`Erro ao ajustar história: ${error.message}`);
      return { story, wordCount: this.countWords(story) };
    }
  }
}

export default new StoryGeneratorService();