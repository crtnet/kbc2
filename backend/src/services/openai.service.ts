// src/services/openai.service.ts

import OpenAI from 'openai';
import { openaiConfig } from '../config/openai';
import { logger } from '../utils/logger';

/**
 * Parâmetros para gerar a história.
 * Se 'secondaryCharacter' e 'ageRange' forem fornecidos, são incluídos no prompt.
 */
export interface GenerateStoryParams {
  title: string;
  genre: string;
  theme: string;
  mainCharacter: string;
  secondaryCharacter?: string;
  setting: string;
  tone: string;
  ageRange?: string;
}

import { withRetry } from '../utils/retryHandler';
import { cacheService } from './cache.service';
import { storyFallbackService } from './storyFallback.service';

class OpenAIService {
  private openai: OpenAI;
  private isServiceAvailable: boolean = true;
  private readonly CACHE_TTL = 24 * 3600; // 24 horas em segundos

  constructor() {
    // Verifica se existe apiKey
    if (!openaiConfig.apiKey) {
      logger.error('openaiConfig.apiKey não foi definido. Verifique suas variáveis de ambiente.');
      throw new Error('Chave de API da OpenAI não configurada.');
    }

    // Configura OpenAI
    this.openai = new OpenAI({
      apiKey: openaiConfig.apiKey,
    });

    // Verifica disponibilidade do serviço a cada 5 minutos
    setInterval(this.checkServiceAvailability.bind(this), 5 * 60 * 1000);
  }

  private async checkServiceAvailability(): Promise<void> {
    try {
      await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5
      });
      
      if (!this.isServiceAvailable) {
        logger.info('Serviço OpenAI está disponível novamente');
        this.isServiceAvailable = true;
      }
    } catch (error) {
      if (this.isServiceAvailable) {
        logger.error('Serviço OpenAI está indisponível:', error);
        this.isServiceAvailable = false;
      }
    }
  }

  /**
   * Gera uma história infantil em português com base nos parâmetros fornecidos.
   * - ~500 palavras, 5 páginas, moral, final feliz, diálogos, etc.
   * - Adiciona personagem secundário e faixa etária se presentes.
   */
  async generateStory(params: GenerateStoryParams): Promise<string> {
    try {
      // Verifica cache primeiro
      const cacheKey = cacheService.generateKey('story', params);
      const cachedStory = await cacheService.get<string>(cacheKey);
      
      if (cachedStory) {
        logger.info('História encontrada no cache');
        return cachedStory;
      }

      // Se o serviço estiver indisponível, usa fallback
      if (!this.isServiceAvailable) {
        logger.warn('Usando serviço de fallback para gerar história');
        const fallbackStory = await storyFallbackService.generateFallbackStory(params);
        await cacheService.set(cacheKey, fallbackStory);
        return fallbackStory;
      }

      // Monta partes opcionais
      const secondaryPart = params.secondaryCharacter
        ? `\n- Personagem Secundário: ${params.secondaryCharacter}`
        : '';

      const agePart = params.ageRange
        ? `\n- Faixa etária: ${params.ageRange}`
        : '';

      // Monta prompt
      const prompt = `
        Crie uma história infantil em português com as seguintes características:
        - Título: ${params.title}
        - Gênero: ${params.genre}
        - Tema: ${params.theme}
        - Personagem Principal: ${params.mainCharacter}${secondaryPart}
        - Cenário: ${params.setting}
        - Tom: ${params.tone}${agePart}

        Requisitos específicos:
        1. A história deve ser dividida em EXATAMENTE 5 páginas
        2. Cada página deve ser um bloco de texto separado por duas linhas em branco
        3. Cada página deve ter entre 80-100 palavras
        4. Cada página deve ser uma cena completa que faz sentido por si só
        5. A história deve ter:
           - Introdução clara na primeira página
           - Desenvolvimento do conflito nas páginas 2 e 3
           - Clímax na página 4
           - Resolução e moral na página 5
        6. Incluir diálogos naturais e apropriados para a idade
        7. Usar linguagem simples e clara
        8. Ter um final feliz e uma moral relacionada ao tema
        9. NÃO numerar as páginas no texto
        10. NÃO usar "Página 1:", "Página 2:" etc.

        Formato esperado:
        [Primeira página/cena]

        [Segunda página/cena]

        [Terceira página/cena]

        [Quarta página/cena]

        [Quinta página/cena]
      `;

      logger.info('Gerando história com OpenAI...', {
        title: params.title,
        genre: params.genre,
        theme: params.theme
      });

      // Verifica se existem configs de fallback
      const model = openaiConfig.model || 'gpt-3.5-turbo';
      const maxTokens = openaiConfig.maxTokens || 1000;
      const temperature = openaiConfig.temperature ?? 0.7;

      // Faz a requisição ao ChatCompletion com retry
      const story = await withRetry(
        async () => {
          const completion = await this.openai.chat.completions.create({
            model,
            messages: [
              {
                role: 'system',
                content: 'Você é um escritor de histórias infantis experiente.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: maxTokens,
            temperature
          });

          const generatedStory = completion.choices[0]?.message?.content;
          if (!generatedStory) {
            throw new Error('Não foi possível gerar a história (conteúdo vazio).');
          }
          return generatedStory;
        },
        {
          maxAttempts: 3,
          delayMs: 1000,
          backoffMultiplier: 2
        }
      );

      logger.info('História gerada com sucesso!', {
        title: params.title,
        wordCount: story.split(/\s+/).length
      });

      // Salva no cache
      await cacheService.set(cacheKey, story, this.CACHE_TTL);

      return story;
    } catch (error: any) {
      logger.error('Erro ao gerar história:', {
        error: error.message,
        params: {
          title: params.title,
          genre: params.genre,
          theme: params.theme
        }
      });

      // Se falhar, tenta usar o fallback
      logger.warn('Tentando usar serviço de fallback após erro');
      return await storyFallbackService.generateFallbackStory(params);
    }
  }

  /**
   * Gera uma imagem usando DALL-E (tamanho 512x512) com base em um prompt.
   */
  async generateImage(prompt: string): Promise<string> {
    try {
      // Verifica cache primeiro
      const cacheKey = cacheService.generateKey('image', { prompt });
      const cachedImageUrl = await cacheService.get<string>(cacheKey);
      logger.warn('Prompo para gerar imagem: '+prompt);
      if (cachedImageUrl) {
        logger.info('Imagem encontrada no cache');
        return cachedImageUrl;
      }

      // Se o serviço estiver indisponível, usa fallback
      if (!this.isServiceAvailable) {
        logger.warn('Usando serviço de fallback para gerar imagem');
        const fallbackImage = await storyFallbackService.generateFallbackImage();
        await cacheService.set(cacheKey, fallbackImage);
        return fallbackImage;
      }

      logger.info('Gerando imagem com OpenAI DALL-E...', {
        promptLength: prompt.length
      });
      
      // Gera imagem com retry
      const imageUrl = await withRetry(
        async () => {
          const response = await this.openai.images.generate({
            prompt,
            n: 1,
            size: '512x512',
          });

          const url = response.data[0]?.url;
          if (!url) {
            throw new Error('Imagem não gerada ou URL ausente na resposta.');
          }
          return url;
        },
        {
          maxAttempts: 3,
          delayMs: 1000,
          backoffMultiplier: 2
        }
      );

      logger.info('Imagem gerada com sucesso:', {
        url: imageUrl
      });

      // Salva no cache
      await cacheService.set(cacheKey, imageUrl, this.CACHE_TTL);

      return imageUrl;
    } catch (error: any) {
      logger.error('Erro ao gerar imagem:', {
        error: error.message,
        promptLength: prompt.length
      });

      // Se falhar, usa o fallback
      logger.warn('Tentando usar serviço de fallback após erro');
      return await storyFallbackService.generateFallbackImage();
    }
  }
}

export const openaiService = new OpenAIService();