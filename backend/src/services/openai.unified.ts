import OpenAI from 'openai';
import { openaiConfig } from '../config/openai';
import { logger } from '../utils/logger';
import { imageProcessor } from './imageProcessor';
import { withRetry } from '../utils/retryHandler';
import { cacheService } from './cache.service';
import { storyFallbackService } from './storyFallback.service';

class OpenAIUnifiedService {
  private openai: OpenAI;
  private isServiceAvailable: boolean = true;
  private readonly CACHE_TTL = 24 * 3600;
  private readonly MAX_PROMPT_LENGTH = 1000;
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_RETRY_DELAY = 2000;

  constructor() {
    if (!openaiConfig.apiKey) {
      logger.error('openaiConfig.apiKey não foi definido');
      throw new Error('Chave de API da OpenAI não configurada');
    }

    this.openai = new OpenAI({
      apiKey: openaiConfig.apiKey,
    });

    setInterval(this.checkServiceAvailability.bind(this), 5 * 60 * 1000);
  }

  private async checkServiceAvailability(): Promise<void> {
    try {
      await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5,
      });
      this.isServiceAvailable = true;
    } catch (error) {
      this.isServiceAvailable = false;
      logger.error('Serviço OpenAI indisponível:', error);
    }
  }

  /**
   * Remove prefixo de Data URL caso presente
   */
  private cleanBase64(dataUrl: string): string {
    return dataUrl.replace(/^data:image\/\w+;base64,/, '');
  }

  private optimizePrompt(prompt: string): string {
    // Remover linhas desnecessárias
    const lines = prompt
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .filter(line => !line.toLowerCase().includes('dall-e'))
      .filter(line => line.length < 100);

    // Manter apenas informações essenciais
    const essentialLines = lines.filter(line =>
      line.includes('cena') ||
      line.includes('ação') ||
      line.includes('personagem') ||
      line.includes('ambiente')
    );

    return essentialLines
      .slice(0, 5) // Limitar a 5 linhas
      .join('\n');
  }

  private async generateImageWithRetry(
    prompt: string,
    referenceImages: string[] = []
  ): Promise<string> {
    return withRetry(
      async () => {
        try {
          // Configuração base do DALL-E
          const dalleParams: any = {
            model: "dall-e-3",
            prompt: prompt.substring(0, this.MAX_PROMPT_LENGTH),
            n: 1,
            size: "1024x1024",
            quality: "standard",
            style: "natural",
            response_format: "url",
          };

          // Adicionar no máximo 2 imagens de referência
          if (referenceImages.length > 0) {
            dalleParams.reference_images = referenceImages.slice(0, 2);
          }

          const response = await this.openai.images.generate(dalleParams);

          if (!response?.data?.[0]?.url) {
            throw new Error('Resposta inválida do DALL-E');
          }

          return response.data[0].url;
        } catch (error: any) {
          logger.error('Erro na chamada do DALL-E:', {
            error: error.response?.data || error.message,
            promptLength: prompt.length
          });

          // Se falhar com referências, tentar sem elas
          if (referenceImages.length > 0) {
            logger.warn('Tentando gerar sem imagens de referência');
            return this.generateImageWithRetry(prompt, []);
          }

          throw error;
        }
      },
      {
        maxAttempts: this.MAX_RETRIES,
        delayMs: this.INITIAL_RETRY_DELAY,
        backoffMultiplier: 2,
        shouldRetry: (error) => {
          return !error.message.includes('safety system') &&
                 !error.message.includes('content policy') &&
                 !error.message.includes('invalid_request_error');
        }
      }
    );
  }

  async generateImage(
    scenePrompt: string,
    characters?: {
      main?: { name: string; avatarPath: string; },
      secondary?: { name: string; avatarPath: string; }
    }
  ): Promise<string> {
    try {
      // Verificar cache
      const cacheKey = cacheService.generateKey('image', {
        prompt: scenePrompt,
        mainCharacter: characters?.main?.name,
        secondaryCharacter: characters?.secondary?.name
      });

      const cachedImage = await cacheService.get<string>(cacheKey);
      if (cachedImage) {
        return cachedImage;
      }

      // Se serviço indisponível, usar fallback
      if (!this.isServiceAvailable) {
        return await storyFallbackService.generateFallbackImage();
      }

      // Processar personagens
      let characterPrompt = '';
      let referenceImages: string[] = [];

      if (characters) {
        // Processar personagem principal
        if (characters.main) {
          const mainDesc = await imageProcessor.prepareCharacterDescription({
            name: characters.main.name,
            avatarPath: characters.main.avatarPath,
            type: 'main'
          });

          const mainImageMatch = mainDesc.match(/<reference_image>(.*?)<\/reference_image>/);
          if (mainImageMatch) {
            // Remover prefixo se necessário
            const cleanedImage = this.cleanBase64(mainImageMatch[1]);
            referenceImages.push(cleanedImage);
            characterPrompt += mainDesc.replace(/<reference_image>.*?<\/reference_image>\n\n/, '');
          }
        }

        // Processar personagem secundário
        if (characters.secondary) {
          const secondaryDesc = await imageProcessor.prepareCharacterDescription({
            name: characters.secondary.name,
            avatarPath: characters.secondary.avatarPath,
            type: 'secondary'
          });

          const secondaryImageMatch = secondaryDesc.match(/<reference_image>(.*?)<\/reference_image>/);
          if (secondaryImageMatch) {
            const cleanedImage = this.cleanBase64(secondaryImageMatch[1]);
            referenceImages.push(cleanedImage);
            characterPrompt += '\n' + secondaryDesc.replace(/<reference_image>.*?<\/reference_image>\n\n/, '');
          }
        }
      }

      // Otimizar prompt da cena
      const optimizedScene = this.optimizePrompt(scenePrompt);
      const finalPrompt = characterPrompt 
        ? `${characterPrompt}\n\nCENA:\n${optimizedScene}`
        : optimizedScene;

      // Gerar imagem
      const imageUrl = await this.generateImageWithRetry(finalPrompt, referenceImages);

      // Salvar no cache
      await cacheService.set(cacheKey, imageUrl, this.CACHE_TTL);

      return imageUrl;
    } catch (error) {
      logger.error('Erro na geração de imagem:', error);
      return await storyFallbackService.generateFallbackImage();
    }
  }
}

export const openaiUnifiedService = new OpenAIUnifiedService();