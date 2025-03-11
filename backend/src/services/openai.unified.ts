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
import { imageProcessor } from './imageProcessor'; // Importação direta

class OpenAIUnifiedService {
  private openai: OpenAI;
  private isServiceAvailable: boolean = true;
  private readonly CACHE_TTL = 24 * 3600;
  private readonly MAX_PROMPT_LENGTH = 1000;
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_RETRY_DELAY = 2000;

  // **NOVO**: Guia de estilo para consistência visual
  private styleGuide = {
    character: "menina de 8 anos, cabelos cacheados vermelhos, vestido amarelo com flores",
    environment: "floresta mágica com cogumelos coloridos e fadas pequenas",
    artisticStyle: "ilustração cartoon, cores vibrantes, traços suaves"
  };

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
      ESTILO VISUAL: ${this.styleGuide.character}, ${this.styleGuide.environment}.
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
    totalPages?: number,
    options?: { temperature?: number }
  ): Promise<string> {
    // Adiciona semente fixa para consistência visual
    const dalleParams = {
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      seed: 42, // Seed fixa para manter consistência
      response_format: "url"
    };

    try {
      const response = await this.openai.images.generate(dalleParams);
      if (!response?.data?.[0]?.url) {
        throw new Error('Resposta inválida do DALL-E');
      }
      return response.data[0].url;
    } catch (error: any) {
      logger.error('Erro na chamada do DALL-E:', {
        message: error.message,
        pageIndex
      });
      throw error;
    }
  }

  /**
   * Verifica se um caminho é uma URL externa
   */
  private isExternalUrl(path: string): boolean {
    return path.startsWith('http://') || path.startsWith('https://');
  }

  /**
   * Cria uma variação do avatar utilizando descrição textual detalhada
   * em vez de enviar a imagem diretamente.
   */
  async createAvatarVariation(avatarPath: string, prompt: string): Promise<string> {
    try {
      logger.info('Criando variação do avatar usando descrição textual detalhada', { 
        avatarPath,
        promptLength: prompt.length
      });

      const cacheKey = cacheService.generateKey('avatar_variation', {
        path: avatarPath,
        prompt: prompt.substring(0, 100)
      });
      const cachedImage = await cacheService.get<string>(cacheKey);
      if (cachedImage) {
        logger.info('Variação de avatar recuperada do cache');
        return cachedImage;
      }

      if (!this.isServiceAvailable) {
        logger.warn('Serviço OpenAI indisponível, usando fallback');
        return await storyFallbackService.generateFallbackImage();
      }

      // Extrai o nome do personagem do caminho do avatar (se possível)
      let characterName = '';
      if (!this.isExternalUrl(avatarPath)) {
        const baseName = path.basename(avatarPath, path.extname(avatarPath));
        characterName = baseName
          .replace(/dalle_\d+_/, '')
          .replace(/main_|secondary_/, '')
          .replace(/_/g, ' ');
      } else {
        // Para URLs externas, tenta extrair informações do caminho
        const urlParts = avatarPath.split('/');
        const fileName = urlParts[urlParts.length - 1];
        
        // Tenta extrair um nome do arquivo
        if (fileName) {
          characterName = fileName
            .replace(/\.\w+$/, '') // Remove extensão
            .replace(/[-_]/g, ' '); // Substitui traços e underscores por espaços
        }
      }

      // Determina o tipo de personagem com base no caminho
      const characterType = avatarPath.includes('main_') ? 'main' : 'secondary';

      try {
        // Analisa a imagem do avatar e gera uma descrição detalhada
        const avatarDescription = await imageProcessor.describeImage(
          avatarPath,
          characterName,
          characterType as 'main' | 'secondary'
        );
        
        logger.info('Descrição do avatar gerada com sucesso através da análise da imagem', {
          descriptionLength: avatarDescription.length
        });

        // Constrói um prompt detalhado para o DALL-E
        const detailedPrompt = `
Gere uma ilustração para livro infantil de alta qualidade. 

DESCRIÇÃO DETALHADA DO PERSONAGEM BASEADA NA ANÁLISE DO AVATAR:
${avatarDescription}

CENA SOLICITADA:
${prompt}

INSTRUÇÕES DE ESTILO:
- Mantenha EXATAMENTE as mesmas características físicas descritas acima
- Preserve as cores, roupas e estilo visual do personagem
- O personagem deve ser facilmente reconhecível e consistente
- Ilustração infantil com cores vibrantes e traços expressivos
- Foco no personagem interagindo com o ambiente da cena
- Visual adequado para crianças pequenas
        `.trim();

        logger.info('Gerando variação do avatar com descrição textual detalhada baseada na análise do avatar', {
          promptLength: detailedPrompt.length
        });

        // Gera a imagem usando o DALL-E com o prompt detalhado
        const imageUrl = await this.generateImageWithRetry(detailedPrompt, [], undefined);
        
        // Salva no cache
        await cacheService.set(cacheKey, imageUrl, this.CACHE_TTL);
        
        return imageUrl;
      } catch (error) {
        logger.error('Erro ao gerar variação do avatar com descrição detalhada', {
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
        
        // Fallback para descrição genérica
        return await this.createAvatarVariationFallback(avatarPath, prompt);
      }
    } catch (error: any) {
      logger.warn('Falha ao gerar variação do avatar, usando fallback', { 
        error: error.message 
      });
      return await this.createAvatarVariationFallback(avatarPath, prompt);
    }
  }

  /**
   * Fallback para criação de variação do avatar utilizando descrição textual genérica.
   */
  private async createAvatarVariationFallback(avatarPath: string, prompt: string): Promise<string> {
    try {
      // Verifica se é uma URL externa
      const isExternalUrl = this.isExternalUrl(avatarPath);
      
      let characterType = 'principal';
      let characterName = 'personagem';
      
      if (!isExternalUrl) {
        const baseName = path.basename(avatarPath, path.extname(avatarPath));
        characterType = baseName.includes('main_') ? 'principal' : 'secundário';
        characterName = baseName
          .replace(/dalle_\d+_/, '')
          .replace(/main_|secondary_/, '')
          .replace(/_/g, ' ');
      } else {
        // Para URLs externas, tenta extrair informações do caminho
        const urlParts = avatarPath.split('/');
        const fileName = urlParts[urlParts.length - 1];
        
        // Tenta extrair um nome do arquivo
        if (fileName) {
          characterName = fileName
            .replace(/\.\w+$/, '') // Remove extensão
            .replace(/[-_]/g, ' '); // Substitui traços e underscores por espaços
        }
      }
      
      // Descrição genérica para o personagem
      const avatarDescription = `
- Personagem ${characterType} chamado "${characterName}"
- Aparência amigável e expressiva adequada para livro infantil
- Cores vibrantes e harmoniosas
- Estilo cartoon com traços simples e limpos
- Expressão facial alegre e cativante
- Postura dinâmica e convidativa
- Visual consistente e reconhecível
      `.trim();
      
      const detailedPrompt = `
Gere uma ilustração para livro infantil de alta qualidade. 

DESCRIÇÃO DO PERSONAGEM ${characterType.toUpperCase()} "${characterName}":
${avatarDescription}

CENA SOLICITADA:
${prompt}

INSTRUÇÕES DE ESTILO:
- Mantenha o mesmo estilo visual do personagem descrito acima
- Cores vibrantes e harmoniosas
- Ilustração infantil com traços limpos e expressivos
- Foco no personagem interagindo com o ambiente da cena
- Iluminação adequada e sombras suaves
- Visual adequado para crianças pequenas
      `.trim();
      
      logger.info('Gerando variação de avatar com fallback textual', {
        characterName,
        characterType,
        promptLength: detailedPrompt.length
      });
      
      return await this.generateImageWithRetry(detailedPrompt, [], undefined);
    } catch (fallbackError: any) {
      logger.error('Erro no fallback textual para variação do avatar', { 
        error: fallbackError.message 
      });
      
      const genericPrompt = `
Ilustração infantil colorida com personagem de livro infantil.
Cena: ${prompt}
Estilo: desenho para crianças com cores vibrantes e traços simples.
      `.trim();
      
      return await this.generateImageWithRetry(genericPrompt, [], undefined);
    }
  }
  
  /**
   * Verifica se um caminho é uma URL externa
   */
  private isExternalUrl(path: string): boolean {
    return path.startsWith('http://') || path.startsWith('https://');
  }

  async generateImagesForStory(
    storyPages: string[],
    characters?: {
      main?: { name: string; avatarPath: string; },
      secondary?: { name: string; avatarPath: string; }
    },
    // **NOVO**: Parâmetro opcional para o guia de estilo personalizado
    customStyleGuide?: {
      character?: string;
      environment?: string;
      artisticStyle?: string;
    }
  ): Promise<string[]> {
    const imageUrls: string[] = [];
    
    // **NOVO**: Usa o estilo personalizado se fornecido, ou mantém o padrão
    const effectiveStyleGuide = {
      character: customStyleGuide?.character || this.styleGuide.character,
      environment: customStyleGuide?.environment || this.styleGuide.environment,
      artisticStyle: customStyleGuide?.artisticStyle || this.styleGuide.artisticStyle
    };

    for (let i = 0; i < storyPages.length; i++) {
      const pageText = storyPages[i];
      const previousContext = i > 0 ? storyPages[i - 1] : "";
      const sceneDescription = `${pageText}\nContexto anterior: ${previousContext}`;
      
      try {
        const imageUrl = await this.generateImage(
          sceneDescription,
          characters,
          undefined,
          i,
          storyPages.length,
          effectiveStyleGuide // **NOVO**: Passa o estilo efetivo
        );
        imageUrls.push(imageUrl);
      } catch (error) {
        imageUrls.push(await storyFallbackService.generateFallbackImage());
      }
    }

    return imageUrls;
  }

  async generateImage(
    scenePrompt: string,
    characters?: {
      main?: { name: string; avatarPath: string; },
      secondary?: { name: string; avatarPath: string; }
    },
    storyContext?: string,
    pageIndex?: number,
    totalPages?: number,
    // Parâmetro opcional para o guia de estilo personalizado
    customStyleGuide?: {
      character?: string;
      environment?: string;
      artisticStyle?: string;
    }
  ): Promise<string> {
    try {
      const cacheKey = cacheService.generateKey('image', {
        prompt: scenePrompt,
        mainCharacter: characters?.main?.name,
        secondaryCharacter: characters?.secondary?.name,
        pageIndex,
        // Inclui o estilo no cache key para diferenciar imagens com estilos diferentes
        styleCharacter: customStyleGuide?.character?.substring(0, 50),
        styleEnvironment: customStyleGuide?.environment?.substring(0, 50)
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
  
      let characterPrompt = '';
  
      if (characters) {
        if (characters.main) {
          try {
            logger.info('Analisando avatar e gerando descrição detalhada do personagem principal', { 
              name: characters.main.name,
              pageIndex
            });
            
            // Usa o imageProcessor para ANALISAR O AVATAR e gerar uma descrição detalhada do personagem
            const mainDesc = await imageProcessor.describeImage(
              characters.main.avatarPath,
              characters.main.name,
              'main'
            );
            
            // Formata a descrição para o DALL-E
            characterPrompt += `PERSONAGEM PRINCIPAL "${characters.main.name}":\n${mainDesc}\n\nIMPORTANTE: Mantenha EXATAMENTE as mesmas características físicas, roupas e cores em todas as ilustrações.`;
            
            logger.info('Descrição detalhada do personagem principal gerada com sucesso a partir da análise do avatar');
          } catch (error) {
            logger.error('Erro ao gerar descrição do personagem principal:', {
              error: error instanceof Error ? error.message : 'Erro desconhecido',
              name: characters.main.name
            });
            characterPrompt += `PERSONAGEM PRINCIPAL "${characters.main.name}": personagem de livro infantil\n\n`;
          }
        }
        
        if (characters.secondary) {
          try {
            logger.info('Analisando avatar e gerando descrição detalhada do personagem secundário', { 
              name: characters.secondary.name,
              pageIndex
            });
            
            // Usa o imageProcessor para ANALISAR O AVATAR e gerar uma descrição detalhada do personagem
            const secondaryDesc = await imageProcessor.describeImage(
              characters.secondary.avatarPath,
              characters.secondary.name,
              'secondary'
            );
            
            // Formata a descrição para o DALL-E
            characterPrompt += `\n\nPERSONAGEM SECUNDÁRIO "${characters.secondary.name}":\n${secondaryDesc}\n\nIMPORTANTE: Mantenha EXATAMENTE as mesmas características físicas, roupas e cores em todas as ilustrações.`;
            
            logger.info('Descrição detalhada do personagem secundário gerada com sucesso a partir da análise do avatar');
          } catch (error) {
            logger.error('Erro ao gerar descrição do personagem secundário:', {
              error: error instanceof Error ? error.message : 'Erro desconhecido',
              name: characters.secondary.name
            });
            characterPrompt += `\n\nPERSONAGEM SECUNDÁRIO "${characters.secondary.name}": personagem de livro infantil\n\n`;
          }
        }
      }
      
      // Usa o estilo personalizado se fornecido, ou mantém o padrão
      const effectiveStyleGuide = {
        character: customStyleGuide?.character || this.styleGuide.character,
        environment: customStyleGuide?.environment || this.styleGuide.environment,
        artisticStyle: customStyleGuide?.artisticStyle || this.styleGuide.artisticStyle
      };
      
      // Extrai elementos da cena a partir do texto para enriquecer o contexto visual
      const sceneElements = this.extractSceneElementsFromPage(
        scenePrompt, 
        characters?.main?.name || 'personagem principal',
        characters?.secondary?.name
      );
      
      // Monta o prompt final, usando as descrições geradas pela análise dos avatares
      const finalPrompt = `Ilustração para livro infantil.

CENA: ${scenePrompt}

ELEMENTOS DA CENA: ${sceneElements}

PERSONAGENS: 
${characterPrompt}

ESTILO VISUAL:
- Ambiente: ${effectiveStyleGuide.environment}
- Estilo artístico: ${effectiveStyleGuide.artisticStyle}

INSTRUÇÕES DE ILUSTRAÇÃO:
- A imagem deve apresentar um cenário completo, com fundo e elementos que reflitam a narrativa
- Os personagens devem ser EXATAMENTE como descritos acima, mantendo consistência visual total
- Integre os personagens de forma natural na cena, respeitando suas características físicas
- Use cores vibrantes e adequadas para público infantil
- Mantenha consistência com o estilo visual estabelecido`;
      
      logger.info('Prompt final preparado com descrições detalhadas dos personagens obtidas por análise dos avatares', { 
        promptLength: finalPrompt.length,
        pageIndex
      });
  
      const imageUrl = await this.generateImageWithRetry(
        finalPrompt, 
        [], // Removemos referências de imagens, pois agora usamos as descrições textuais
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
      
      // Verifica se é uma URL externa
      const isExternalUrl = avatarPath.startsWith('http://') || avatarPath.startsWith('https://');
      
      if (isExternalUrl) {
        logger.info('Avatar é uma URL externa, usando descrição genérica', { avatarPath });
        return `
- Personagem para livro infantil com aparência amigável
- Cores vibrantes e expressivas adequadas para crianças
- Estilo visual de ilustração infantil moderna
- Expressões faciais memoráveis e carismáticas
        `.trim();
      }
      
      // Para arquivos locais, tenta extrair informações
      try {
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
      } catch (fileError) {
        logger.warn('Erro ao acessar arquivo de avatar:', {
          error: fileError instanceof Error ? fileError.message : 'Erro desconhecido',
          avatarPath
        });
        
        return `
- Personagem para livro infantil com aparência amigável
- Cores vibrantes e expressivas adequadas para crianças
- Estilo visual de ilustração infantil moderna
- Expressões faciais memoráveis e carismáticas
        `.trim();
      }
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