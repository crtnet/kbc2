import OpenAI from 'openai';
import { openaiConfig } from '../config/openai';
import { logger } from '../utils/logger';
import { withRetry } from '../utils/retryHandler';
import { cacheService } from './cache.service';
import { storyFallbackService, GenerateStoryParams } from './storyFallback.service';
import * as path from 'path';
import * as fs from 'fs/promises';
import axios from 'axios';
import FormData from 'form-data';
import fsSync from 'fs';

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

  async generateStory(params: GenerateStoryParams): Promise<string> {
    try {
      const cacheKey = cacheService.generateKey('story', params);
      const cachedStory = await cacheService.get<string>(cacheKey);
      if (cachedStory) {
        logger.info('História recuperada do cache');
        return cachedStory;
      }

      if (!this.isServiceAvailable) {
        logger.warn('Serviço OpenAI indisponível, usando fallback');
        return await storyFallbackService.generateFallbackStory(params);
      }

      const prompt = `Crie uma história infantil com 5 páginas para crianças de ${params.ageRange} anos.

Elementos: "${params.title}" (${params.genre}); Tema: ${params.theme}; Personagem: ${params.mainCharacter}${params.secondaryCharacter ? `, ${params.secondaryCharacter}` : ''}; Ambiente: ${params.setting}; Tom: ${params.tone}.

Estrutura: 5 páginas de ~100 palavras cada, linguagem para ${params.ageRange} anos, tom ${params.tone}, narrativa envolvente, diálogos naturais, mensagem positiva no final.

Formate com linha em branco entre páginas.`;

      const response = await withRetry(
        async () => {
          const completion = await this.openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: "Você é um autor especializado em literatura infantil, criando histórias educativas e envolventes."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 1500,
            top_p: 1,
            frequency_penalty: 0.5,
            presence_penalty: 0.5
          });

          return completion.choices[0]?.message?.content;
        },
        {
          maxAttempts: this.MAX_RETRIES,
          delayMs: this.INITIAL_RETRY_DELAY,
          backoffMultiplier: 2
        }
      );

      if (!response) {
        throw new Error('Resposta vazia do GPT');
      }

      await cacheService.set(cacheKey, response, this.CACHE_TTL);
      return response;
    } catch (error: any) {
      logger.error('Erro ao gerar história:', {
        error: error.message,
        params
      });
      return await storyFallbackService.generateFallbackStory(params);
    }
  }

  private cleanBase64(dataUrl: string): string {
    return dataUrl.replace(/^data:image\/\w+;base64,/, '');
  }

  private extractSceneElementsFromPage(pageText: string, mainCharacter: string, secondaryCharacter?: string): string {
    try {
      if (!pageText || pageText.length < 10) {
        return "cena do livro infantil";
      }
      
      let sceneElements = "";
      const actionWords = /corr(e|ia|endo)|pul(a|ou|ando)|brinc(a|ou|ando)|jog(a|ou|ando)|danç(a|ou|ando)|cant(a|ou|ando)|salt(a|ou|ando)|ri(u|ndo)|chora(va|ndo)|grit(a|ou|ando)/i;
      const hasAction = actionWords.test(pageText);
      const dialoguePattern = /"([^"]+)"|'([^']+)'/g;
      const dialogueMatches = pageText.match(dialoguePattern);
      const hasDialogue = !!dialogueMatches && dialogueMatches.length > 0;
      const settingWords = /(floresta|casa|quarto|escola|praia|mar|céu|monte|castelo|jardim|parque|cidade|vila)/i;
      const settingMatches = pageText.match(settingWords);
      const emotionWords = /(feliz|triste|assustado|surpreso|animado|preocupado|zangado|bravo|curioso|alegre|empolgado)/i;
      const emotionMatches = pageText.match(emotionWords);
      const weatherWords = /(sol|chuva|nublado|vento|neve|tempestade|noite|dia|manhã|tarde)/i;
      const weatherMatches = pageText.match(weatherWords);
      
      sceneElements += hasAction ? "cena dinâmica com movimento, " : "cena tranquila, ";
      if (hasDialogue) {
        sceneElements += "momento de interação entre personagens, ";
      }
      if (settingMatches) {
        sceneElements += `ambiente: ${settingMatches[0]}, `;
      }
      if (emotionMatches) {
        sceneElements += `emoção: ${emotionMatches[0]}, `;
      }
      if (weatherMatches) {
        sceneElements += `clima: ${weatherMatches[0]}, `;
      }
      sceneElements += `mostrando ${mainCharacter}`;
      if (secondaryCharacter) {
        sceneElements += ` e ${secondaryCharacter}`;
      }
      const words = pageText.split(/\s+/);
      const keywords = words.filter(word => 
        word.length > 4 && 
        !word.match(/^(com|para|pelo|pela|sobre|entre|desde|quando|porque|como|mais|menos|muito|pouco|todos)$/i)
      ).slice(0, 5);
      if (keywords.length > 0) {
        sceneElements += ", elementos importantes: " + keywords.join(", ");
      }
      
      return sceneElements;
    } catch (error) {
      logger.error('Erro ao extrair elementos da cena:', error);
      return pageText.substring(0, 100);
    }
  }

  // Inclui parte do texto da página (truncado) para dar contexto à imagem.
  private optimizePrompt(prompt: string, storyContext?: string, pageIndex?: number, totalPages?: number): string {
    try {
      const cleanedPrompt = prompt
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .filter(line => !line.toLowerCase().includes('dall-e'))
        .filter(line => !line.toLowerCase().includes('instruções'))
        .filter(line => !line.toLowerCase().includes('diretrizes'))
        .join(' ')
        .replace(/\s{2,}/g, ' ');
      
      let optimizedPrompt = cleanedPrompt
        .replace(/por favor|gentilmente|crie|gere|desenhe|ilustre/gi, '')
        .replace(/com alta qualidade|com detalhes|com precisão/gi, '')
        .replace(/estou solicitando|eu quero|eu gostaria/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
      
      const artStyle = "Ilustração para livro infantil, cartoon colorido com traços suaves, poucos detalhes e cores vibrantes";
      
      if (storyContext && pageIndex !== undefined) {
        let narrativePhase = "";
        if (pageIndex === 0) {
          narrativePhase = "introdução da história";
        } else if (pageIndex === totalPages - 1) {
          narrativePhase = "conclusão da história";
        } else {
          narrativePhase = "desenvolvimento da história";
        }
        const truncatedContext = storyContext.length > 300 ? storyContext.substring(0, 300) + "..." : storyContext;
        optimizedPrompt = `${artStyle}. Cena: ${optimizedPrompt}. Contexto da página: ${truncatedContext}. ${narrativePhase}.`;
      } else {
        optimizedPrompt = `${artStyle}: ${optimizedPrompt}.`;
      }
      
      return optimizedPrompt.substring(0, 800);
    } catch (error) {
      logger.error('Erro ao otimizar prompt:', error);
      return `Ilustração de livro infantil colorida. ${prompt.substring(0, 100)}`;
    }
  }

  private async generateImageWithRetry(
    prompt: string,
    referenceImages: string[] = [],
    storyContext?: string,
    pageIndex?: number,
    totalPages?: number
  ): Promise<string> {
    return withRetry(
      async () => {
        try {
          const optimizedPrompt = this.optimizePrompt(prompt, storyContext, pageIndex, totalPages);
          const finalPrompt = optimizedPrompt.substring(0, this.MAX_PROMPT_LENGTH);
          
          logger.info('Tamanho do prompt otimizado:', { 
            originalLength: prompt.length,
            optimizedLength: optimizedPrompt.length,
            finalLength: finalPrompt.length,
            pageIndex
          });
          
          const dalleParams = {
            model: "dall-e-3",
            prompt: finalPrompt,
            n: 1,
            size: "1024x1024",
            quality: "standard",
            style: "vivid",
            response_format: "url"
          };

          logger.info('Enviando requisição para DALL-E', {
            promptLength: finalPrompt.length,
            model: dalleParams.model
          });

          const response = await this.openai.images.generate(dalleParams);

          if (!response?.data?.[0]?.url) {
            throw new Error('Resposta inválida do DALL-E');
          }

          logger.info('Imagem gerada com sucesso pelo DALL-E', {
            url: response.data[0].url.substring(0, 50) + '...'
          });

          return response.data[0].url;
        } catch (error: any) {
          const errorDetails = {
            message: error.message,
            type: error.type,
            code: error.code,
            param: error.param,
            statusCode: error.status || error.statusCode,
            response: error.response?.data,
            promptLength: prompt.length,
            pageIndex
          };
          
          logger.error('Erro na chamada do DALL-E:', errorDetails);

          if (error.message?.includes('prompt') || 
              error.message?.includes('content policy') || 
              error.message?.includes('safety')) {
            
            logger.warn('Erro relacionado ao prompt, tentando simplificar', { pageIndex });
            const simplifiedPrompt = `Ilustração de livro infantil colorida e alegre para a página ${pageIndex !== undefined ? pageIndex + 1 : 1}`;
            return this.generateImageWithRetry(simplifiedPrompt, [], undefined, pageIndex, totalPages);
          }

          if (error.message?.includes('unexpected') || 
              error.message?.includes('not allowed') ||
              error.message?.includes('invalid')) {
            
            logger.warn('Erro relacionado a parâmetros, tentando com configuração mínima absoluta', { pageIndex });
            
            try {
              const response = await this.openai.images.generate({
                model: "dall-e-3",
                prompt: finalPrompt,
                n: 1,
                size: "1024x1024",
                response_format: "url"
              });
              
              if (!response?.data?.[0]?.url) {
                throw new Error('Resposta inválida do DALL-E');
              }
              
              return response.data[0].url;
            } catch (minimalError) {
              logger.error('Erro também com configuração mínima:', {
                error: minimalError instanceof Error ? minimalError.message : 'Erro desconhecido'
              });
              throw minimalError;
            }
          }

          throw error;
        }
      },
      {
        maxAttempts: this.MAX_RETRIES,
        delayMs: this.INITIAL_RETRY_DELAY,
        backoffMultiplier: 2,
        shouldRetry: (error) => {
          return !error.message?.includes('safety system') &&
                 !error.message?.includes('content policy') &&
                 !error.message?.includes('invalid_request_error');
        }
      }
    );
  }

  /**
   * Cria uma "edição" do avatar utilizando o endpoint de edições do DALL-E.
   * Essa abordagem envia a imagem base (convertida para PNG com fundo transparente e dimensões 1024x1024),
   * uma máscara (totalmente branca) e o prompt de edição (com contexto da página) para gerar uma imagem que mantenha
   * as características do personagem e adicione elementos do cenário narrativo.
   */
  async createAvatarVariation(avatarPath: string, prompt: string): Promise<string> {
    try {
      logger.info('Criando edição do avatar (usando endpoint de edições)', { 
        avatarPath,
        promptLength: prompt.length
      });

      const cacheKey = cacheService.generateKey('avatar_edit', {
        path: avatarPath,
        prompt: prompt.substring(0, 100)
      });
      const cachedImage = await cacheService.get<string>(cacheKey);
      if (cachedImage) {
        logger.info('Edição de avatar recuperada do cache');
        return cachedImage;
      }

      if (!this.isServiceAvailable) {
        logger.warn('Serviço OpenAI indisponível, usando fallback');
        return await storyFallbackService.generateFallbackImage();
      }

      // Converter a imagem para PNG com fundo transparente e dimensões 1024x1024
      const sharpModule = await import('sharp');
      const avatarBuffer = await fs.readFile(avatarPath);
      const pngBuffer = await sharpModule.default(avatarBuffer)
        .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();

      // Criar uma máscara totalmente branca (1024x1024)
      const maskBuffer = await sharpModule.default({
        create: { width: 1024, height: 1024, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
      })
        .png()
        .toBuffer();

      const formData = new FormData();
      formData.append('image', pngBuffer, { filename: 'avatar.png', contentType: 'image/png' });
      formData.append('mask', maskBuffer, { filename: 'mask.png', contentType: 'image/png' });
      // Para o endpoint de edições, enviamos o prompt que reflete o contexto
      formData.append('prompt', prompt);
      formData.append('n', '1');
      formData.append('size', '1024x1024');

      const response = await axios.post('https://api.openai.com/v1/images/edits', formData, {
        headers: {
          'Authorization': `Bearer ${openaiConfig.apiKey}`,
          ...formData.getHeaders()
        },
        timeout: 30000,
      });

      if (response.data && response.data.data && response.data.data[0]?.url) {
        const url = response.data.data[0].url;
        logger.info('Edição de avatar gerada com sucesso pelo endpoint de edições', { url });
        await cacheService.set(cacheKey, url, this.CACHE_TTL);
        return url;
      }
      throw new Error('Resposta inválida do endpoint de edições.');
    } catch (error: any) {
      logger.warn('Falha ao gerar edição do avatar pelo endpoint de edições, usando fallback textual.', { error: error.message });
      return await this.createAvatarVariationFallback(avatarPath, prompt);
    }
  }

  /**
   * Fallback para criação de variação do avatar utilizando descrição textual.
   */
  private async createAvatarVariationFallback(avatarPath: string, prompt: string): Promise<string> {
    try {
      const baseName = path.basename(avatarPath, path.extname(avatarPath));
      const characterType = baseName.includes('main_') ? 'principal' : 'secundário';
      const characterName = baseName
        .replace(/dalle_\d+_/, '')
        .replace(/main_|secondary_/, '')
        .replace(/_/g, ' ');
      const avatarDescription = await this.generateAvatarDescription(avatarPath);
      const detailedPrompt = `
Gere uma ilustração para livro infantil de alta qualidade. 

DESCRIÇÃO DO PERSONAGEM ${characterType.toUpperCase()} "${characterName}":
${avatarDescription}

CENA SOLICITADA:
${prompt}

INSTRUÇÕES DE ESTILO:
- Mantenha o mesmo estilo visual do personagem descrito acima
- Cores vibrantes e harmoniosas como na imagem de referência
- Ilustração infantil com traços limpos e expressivos
- Foco no personagem interagindo com o ambiente da cena
- Iluminação adequada e sombras suaves
- Visual adequado para crianças pequenas
      `.trim();
      logger.info('Gerando edição de avatar com fallback textual', {
        characterName,
        characterType,
        promptLength: detailedPrompt.length
      });
      return await this.generateImageWithRetry(detailedPrompt, [], undefined);
    } catch (fallbackError: any) {
      logger.error('Erro no fallback textual para edição do avatar', { error: fallbackError.message });
      const genericPrompt = `
Ilustração infantil colorida com personagem de livro infantil.
Cena: ${prompt}
Estilo: desenho para crianças com cores vibrantes e traços simples.
      `.trim();
      return await this.generateImageWithRetry(genericPrompt, [], undefined);
    }
  }

  async generateImagesForStory(
    storyPages: string[],
    characters?: {
      main?: { name: string; avatarPath: string; },
      secondary?: { name: string; avatarPath: string; }
    }
  ): Promise<string[]> {
    try {
      const imageUrls: string[] = [];
      
      if (!storyPages || storyPages.length === 0) {
        logger.warn('Nenhuma página para gerar imagens');
        return [];
      }
      
      let processedCharacters = undefined;
      let mainAvatarPreprocessed = false;
      let secondaryAvatarPreprocessed = false;
      
      if (characters) {
        processedCharacters = {};
        
        if (characters.main) {
          try {
            await fs.access(characters.main.avatarPath);
            mainAvatarPreprocessed = true;
            processedCharacters.main = {
              name: characters.main.name,
              avatarPath: characters.main.avatarPath
            };
            logger.info('Personagem principal configurado', { 
              name: characters.main.name,
              avatarPath: characters.main.avatarPath
            });
          } catch (error) {
            logger.error('Erro ao configurar personagem principal:', error);
          }
        }
        
        if (characters.secondary) {
          try {
            await fs.access(characters.secondary.avatarPath);
            secondaryAvatarPreprocessed = true;
            processedCharacters.secondary = {
              name: characters.secondary.name,
              avatarPath: characters.secondary.avatarPath
            };
            logger.info('Personagem secundário configurado', { 
              name: characters.secondary.name,
              avatarPath: characters.secondary.avatarPath
            });
          } catch (error) {
            logger.error('Erro ao configurar personagem secundário:', error);
          }
        }
      }
      
      for (let i = 0; i < storyPages.length; i++) {
        const pageText = storyPages[i];
        if (!pageText?.trim()) {
          logger.warn(`Página ${i+1} vazia, pulando`);
          imageUrls.push(await storyFallbackService.generateFallbackImage());
          continue;
        }
        
        try {
          // Extraímos os elementos da cena (ambiente, ação, etc)
          const sceneElements = this.extractSceneElementsFromPage(
            pageText,
            processedCharacters?.main?.name || "personagem principal",
            processedCharacters?.secondary?.name
          );
          
          // Combina o texto completo da página com os detalhes extraídos
          const sceneDescription = `${pageText}\n\nDetalhes da cena: ${sceneElements}`;
          
          let imageUrl: string;
          if (mainAvatarPreprocessed || secondaryAvatarPreprocessed) {
            try {
              logger.info(`Gerando edição do avatar para página ${i+1}/${storyPages.length}`, {
                pageLength: pageText.length,
                sceneElements: sceneElements.substring(0, 50) + '...'
              });
              
              // Usa o texto completo como contexto para a edição
              const truncatedPageText = pageText.length > 300 ? pageText.substring(0, 300) + "..." : pageText;
              const avatarPrompt = `${sceneDescription}\n\nDetalhes adicionais: ${truncatedPageText}`;
              const avatarToVary = mainAvatarPreprocessed 
                ? processedCharacters.main.avatarPath
                : processedCharacters.secondary.avatarPath;
              
              imageUrl = await this.createAvatarVariation(avatarToVary, avatarPrompt);
              logger.info(`Edição do avatar gerada com sucesso para página ${i+1}`);
            } catch (variationError) {
              logger.error(`Erro ao gerar edição do avatar para página ${i+1}`, {
                error: variationError instanceof Error ? variationError.message : 'Erro desconhecido'
              });
              imageUrl = await this.generateImage(
                sceneDescription,
                processedCharacters,
                pageText,
                i,
                storyPages.length
              );
            }
          } else {
            logger.info(`Gerando imagem para página ${i+1}/${storyPages.length}`, {
              pageLength: pageText.length,
              sceneElements: sceneElements.substring(0, 100) + (sceneElements.length > 100 ? '...' : '')
            });
            
            imageUrl = await this.generateImage(
              sceneDescription,
              processedCharacters,
              pageText,
              i,
              storyPages.length
            );
          }
          
          imageUrls.push(imageUrl);
          logger.info(`Imagem gerada com sucesso para página ${i+1}/${storyPages.length}`);
        } catch (imageError) {
          logger.error(`Erro ao gerar imagem para página ${i+1}/${storyPages.length}`, {
            error: imageError instanceof Error ? imageError.message : 'Erro desconhecido'
          });
          imageUrls.push(await storyFallbackService.generateFallbackImage());
        }
        
        if (i < storyPages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      return imageUrls;
    } catch (error) {
      logger.error('Erro ao gerar imagens para a história:', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });
      return Array(storyPages.length).fill(await storyFallbackService.generateFallbackImage());
    }
  }

  async generateImage(
    scenePrompt: string,
    characters?: {
      main?: { name: string; avatarPath: string; },
      secondary?: { name: string; avatarPath: string; }
    },
    storyContext?: string,
    pageIndex?: number,
    totalPages?: number
  ): Promise<string> {
    try {
      const cacheKey = cacheService.generateKey('image', {
        prompt: scenePrompt,
        mainCharacter: characters?.main?.name,
        secondaryCharacter: characters?.secondary?.name,
        pageIndex
      });
  
      const cachedImage = await cacheService.get<string>(cacheKey);
      if (cachedImage) {
        logger.info('Imagem recuperada do cache', { pageIndex });
        return cachedImage;
      }
  
      if (!this.isServiceAvailable) {
        logger.warn('Serviço OpenAI indisponível, usando fallback', { pageIndex });
        return await storyFallbackService.generateFallbackImage();
      }
  
      const { imageProcessor } = await import('./imageProcessor');
      let characterPrompt = '';
  
      if (characters) {
        if (characters.main) {
          try {
            logger.info('Preparando descrição do personagem principal para DALL-E', { 
              name: characters.main.name,
              pageIndex
            });
            const mainDesc = await imageProcessor.prepareCharacterDescription({
              name: characters.main.name,
              avatarPath: characters.main.avatarPath,
              type: 'main'
            });
            characterPrompt += mainDesc;
            logger.info('Descrição do personagem principal adicionada');
          } catch (error) {
            logger.error('Erro ao processar descrição do personagem principal:', {
              error: error instanceof Error ? error.message : 'Erro desconhecido',
              name: characters.main.name
            });
            characterPrompt += `PERSONAGEM PRINCIPAL "${characters.main.name}": personagem de livro infantil\n\n`;
          }
        }
        if (characters.secondary) {
          try {
            logger.info('Preparando descrição do personagem secundário para DALL-E', { 
              name: characters.secondary.name,
              pageIndex
            });
            const secondaryDesc = await imageProcessor.prepareCharacterDescription({
              name: characters.secondary.name,
              avatarPath: characters.secondary.avatarPath,
              type: 'secondary'
            });
            characterPrompt += '\n' + secondaryDesc;
            logger.info('Descrição do personagem secundário adicionada');
          } catch (error) {
            logger.error('Erro ao processar descrição do personagem secundário:', {
              error: error instanceof Error ? error.message : 'Erro desconhecido',
              name: characters.secondary.name
            });
            characterPrompt += `PERSONAGEM SECUNDÁRIO "${characters.secondary.name}": personagem de livro infantil\n\n`;
          }
        }
      }
      // Adiciona referências visuais para reforçar a consistência dos personagens
      if (characters?.main) {
        try {
          const mainReferenceDesc = await imageProcessor.prepareReferenceDescription(characters.main.avatarPath, 'main');
          characterPrompt += `\n[Referência Principal: ${mainReferenceDesc}]`;
          logger.info('Descrição de referência do personagem principal adicionada');
        } catch (error) {
          logger.warn('Falha ao adicionar descrição de referência para personagem principal', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
        }
      }
      if (characters?.secondary) {
        try {
          const secondaryReferenceDesc = await imageProcessor.prepareReferenceDescription(characters.secondary.avatarPath, 'secondary');
          characterPrompt += `\n[Referência Secundária: ${secondaryReferenceDesc}]`;
          logger.info('Descrição de referência do personagem secundário adicionada');
        } catch (error) {
          logger.warn('Falha ao adicionar descrição de referência para personagem secundário', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
        }
      }
  
      // Monta o prompt final combinando a descrição completa da cena (texto da página + detalhes extraídos) e os personagens
      const finalPrompt = `CENA: ${scenePrompt}\n\nPERSONAGENS: ${characterPrompt}\n\nInstruções: A imagem deve representar fielmente o cenário narrativo descrito (fundo, ambiente e ação), sem repetir de forma fixa os personagens, garantindo variedade entre as páginas. Estilo: Ilustração para livro infantil, cartoon colorido com traços suaves, poucos detalhes e cores vibrantes.`;
      
      logger.info('Prompt final preparado', { 
        promptLength: finalPrompt.length,
        pageIndex
      });
  
      const imageUrl = await this.generateImageWithRetry(
        finalPrompt, 
        [],
        storyContext,
        pageIndex,
        totalPages
      );
  
      await cacheService.set(cacheKey, imageUrl, this.CACHE_TTL);
      logger.info('Imagem salva no cache', { pageIndex });
  
      return imageUrl;
    } catch (error) {
      logger.error('Erro na geração de imagem:', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        pageIndex,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      try {
        logger.warn('Tentando gerar imagem com prompt simplificado', { pageIndex });
        const simplePrompt = `Ilustração colorida para livro infantil, página ${pageIndex !== undefined ? pageIndex + 1 : 1}`;
        const imageUrl = await this.generateImageWithRetry(
          simplePrompt, 
          [],
          undefined,
          pageIndex,
          totalPages
        );
        return imageUrl;
      } catch (fallbackError) {
        logger.error('Erro também na abordagem simplificada, usando fallback', {
          error: fallbackError instanceof Error ? fallbackError.message : 'Erro desconhecido'
        });
        return await storyFallbackService.generateFallbackImage();
      }
    }
  }

  /**
   * Gera uma descrição textual detalhada de um avatar usando GPT.
   */
  private async generateAvatarDescription(avatarPath: string): Promise<string> {
    try {
      logger.info('Gerando descrição detalhada do avatar', { avatarPath });
      const baseName = path.basename(avatarPath, path.extname(avatarPath));
      const fileSize = (await fs.stat(avatarPath)).size;
      const sharpModule = await import('sharp');
      const imageBuffer = await fs.readFile(avatarPath);
      const metadata = await sharpModule.default(imageBuffer).metadata();
      
      const format = metadata.format || path.extname(avatarPath).replace('.', '');
      const width = metadata.width || 'desconhecido';
      const height = metadata.height || 'desconhecido';
      const isColorful = metadata.channels === 3 || metadata.channels === 4;
      const isTransparent = metadata.hasAlpha;
      
      const basicDescription = `
- Personagem com estilo de ilustração infantil
- Cores ${isColorful ? 'vibrantes e expressivas' : 'suaves e harmoniosas'}
- Traços ${metadata.width && metadata.width > 500 ? 'detalhados' : 'simples'} e expressivos
- Visual amigável e atraente para crianças
- Expressões faciais marcantes e memoráveis
      `.trim();
      
      const prompt = `
Descreva em detalhes as características visuais deste personagem para um livro infantil:
- Aparência física (idade aproximada, tipo de personagem)
- Cores predominantes e estilo artístico
- Expressão facial e postura
- Características distintas (roupas, acessórios)
- Estilo geral da ilustração

IMPORTANTE: Sua descrição será usada para gerar novas imagens deste personagem em diferentes cenas, 
então foque nas características que devem ser mantidas consistentes.
      `.trim();
      
      try {
        const completion = await this.openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "Você é um especialista em análise visual e descrição de personagens para ilustração infantil."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 300
        });
        
        const description = completion.choices[0]?.message?.content?.trim();
        
        if (description) {
          logger.info('Descrição detalhada gerada com sucesso', { 
            avatarPath,
            descriptionLength: description.length
          });
          return description;
        }
      } catch (aiError) {
        logger.warn('Erro ao gerar descrição com IA:', {
          error: aiError instanceof Error ? aiError.message : 'Erro desconhecido'
        });
      }
      
      return basicDescription;
    } catch (error) {
      logger.error('Erro ao gerar descrição do avatar:', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        avatarPath
      });
      return `
- Personagem para livro infantil com aparência amigável
- Cores vibrantes e expressivas adequadas para crianças
- Estilo visual de ilustração infantil moderna
- Expressões faciais memoráveis e carismáticas
      `.trim();
    }
  }
}

export const openaiUnifiedService = new OpenAIUnifiedService();