  async generateStory(params: GenerateStoryParams): Promise<string> {
    try {
      // Verificar cache primeiro
      const cacheKey = cacheService.generateKey('story', params);
      const cachedStory = await cacheService.get<string>(cacheKey);
      if (cachedStory) {
        logger.info('História recuperada do cache');
        return cachedStory;
      }

      // Se o serviço estiver indisponível, usar fallback
      if (!this.isServiceAvailable) {
        logger.warn('Serviço OpenAI indisponível, usando fallback');
        return await storyFallbackService.generateFallbackStory(params);
      }

      // Construir o prompt para a história - OTIMIZADO
      const prompt = `Crie uma história infantil com 5 páginas para crianças de ${params.ageRange} anos.

Elementos: "${params.title}" (${params.genre}); Tema: ${params.theme}; Personagem: ${params.mainCharacter}${params.secondaryCharacter ? `, ${params.secondaryCharacter}` : ''}; Ambiente: ${params.setting}; Tom: ${params.tone}.

Estrutura: 5 páginas de ~100 palavras cada, linguagem para ${params.ageRange} anos, tom ${params.tone}, narrativa envolvente, diálogos naturais, mensagem positiva no final.

Formate com linha em branco entre páginas.`;

      // Fazer a chamada para a API
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

      // Salvar no cache
      await cacheService.set(cacheKey, response, this.CACHE_TTL);

      return response;
    } catch (error: any) {
      logger.error('Erro ao gerar história:', {
        error: error.message,
        params
      });

      // Em caso de erro, usar o serviço de fallback
      return await storyFallbackService.generateFallbackStory(params);
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
          // Prompt otimizado para DALL-E com contexto da história
          const optimizedPrompt = this.optimizePrompt(prompt, storyContext, pageIndex, totalPages);
          logger.info('DALL-E PROMPT COMPLETO:', { 
            prompt: optimizedPrompt,
            originalLength: prompt.length,
            optimizedLength: optimizedPrompt.length,
            pageIndex
          });
          
          // Configuração base do DALL-E - ajustada para formato A5 (proporção 1:√2)
          const dalleParams: any = {
            model: "dall-e-3",
            prompt: optimizedPrompt.substring(0, this.MAX_PROMPT_LENGTH),
            n: 1,
            size: "1024x1792", // Proporção A5 para livro (1:√2 aproximadamente)
            quality: "standard", // Usar standard para economizar custos
            style: "vivid", // Alterado para "vivid" para cores mais vibrantes para livro infantil
            response_format: "url",
          };

          // Adicionar no máximo 1 imagem de referência para simplificar
          if (referenceImages.length > 0) {
            dalleParams.reference_images = [referenceImages[0]];
          }

          const response = await this.openai.images.generate(dalleParams);

          // Log da resposta do DALL-E
          logger.info('DALL-E RESPOSTA:', {
            responseData: JSON.stringify(response),
            pageIndex
          });

          if (!response?.data?.[0]?.url) {
            throw new Error('Resposta inválida do DALL-E');
          }

          return response.data[0].url;
        } catch (error: any) {
          logger.error('Erro na chamada do DALL-E:', {
            error: error.response?.data || error.message,
            promptLength: prompt.length,
            pageIndex
          });

          // Se falhar com a proporção A5, tentar com o tamanho padrão
          if (error.message?.includes('dimensions') || error.message?.includes('size')) {
            logger.warn('Tentando gerar com dimensões padrão 1024x1024', { pageIndex });
            try {
              const optimizedPrompt = this.optimizePrompt(prompt, storyContext, pageIndex, totalPages);
              
              // Log do prompt para a segunda tentativa
              logger.info('DALL-E PROMPT SEGUNDA TENTATIVA:', {
                prompt: optimizedPrompt,
                pageIndex
              });
              
              const response = await this.openai.images.generate({
                model: "dall-e-3",
                prompt: optimizedPrompt.substring(0, this.MAX_PROMPT_LENGTH),
                n: 1,
                size: "1024x1024",
                quality: "standard",
                style: "vivid", // Consistente com o anterior
                response_format: "url",
                reference_images: referenceImages.length > 0 ? [referenceImages[0]] : undefined
              });
              
              // Log da resposta da segunda tentativa
              logger.info('DALL-E RESPOSTA SEGUNDA TENTATIVA:', {
                responseData: JSON.stringify(response),
                pageIndex
              });
              
              if (!response?.data?.[0]?.url) {
                throw new Error('Resposta inválida do DALL-E');
              }
              
              return response.data[0].url;
            } catch (err) {
              logger.error('Erro também com dimensões padrão:', err);
              throw err;
            }
          }

          // Se falhar com referências, tentar sem elas
          if (referenceImages.length > 0) {
            logger.warn('Tentando gerar sem imagens de referência', { pageIndex });
            return this.generateImageWithRetry(prompt, [], storyContext, pageIndex, totalPages);
          }

          throw error;
        }
      },
      {
        maxAttempts: this.MAX_RETRIES,
        delayMs: this.INITIAL_RETRY_DELAY,
        backoffMultiplier: 2,
        shouldRetry: (error) => {
          // Não tentar novamente para erros de política de conteúdo
          return !error.message?.includes('safety system') &&
                 !error.message?.includes('content policy') &&
                 !error.message?.includes('invalid_request_error');
        }
      }
    );
  }

  /**
   * Gera imagens para um conjunto de páginas/texto de uma história
   */
  async generateImagesForStory(
    storyPages: string[],
    characters?: {
      main?: { name: string; avatarPath: string; },
      secondary?: { name: string; avatarPath: string; }
    }
  ): Promise<string[]> {
    try {
      // Array para armazenar as URLs das imagens
      const imageUrls: string[] = [];
      
      // Para cada página, gerar uma imagem relacionada
      for (let i = 0; i < storyPages.length; i++) {
        const pageText = storyPages[i];
        if (!pageText?.trim()) continue;
        
        // Extrair elementos da cena desta página
        const sceneElements = this.extractSceneElementsFromPage(
          pageText,
          characters?.main?.name || "personagem principal",
          characters?.secondary?.name
        );
        
        // Gerar imagem para esta página, com contexto da história
        try {
          const imageUrl = await this.generateImage(
            sceneElements,
            characters,
            pageText, // contexto da história/página
            i,        // índice da página
            storyPages.length // total de páginas
          );
          
          imageUrls.push(imageUrl);
          logger.info(`Imagem gerada para página ${i+1}`, { 
            pageLength: pageText.length,
            sceneElements: sceneElements.substring(0, 100) + '...'
          });
        } catch (error) {
          logger.error(`Erro ao gerar imagem para página ${i+1}`, error);
          // Usar uma URL de fallback em caso de erro
          imageUrls.push(await storyFallbackService.generateFallbackImage());
        }
      }
      
      return imageUrls;
    } catch (error) {
      logger.error('Erro ao gerar imagens para a história:', error);
      // Retornar array de URLs de fallback
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
      // Verificar cache
      const cacheKey = cacheService.generateKey('image', {
        prompt: scenePrompt,
        mainCharacter: characters?.main?.name,
        secondaryCharacter: characters?.secondary?.name,
        pageIndex
      });

      const cachedImage = await cacheService.get<string>(cacheKey);
      if (cachedImage) {
        return cachedImage;
      }

      // Se serviço indisponível, usar fallback
      if (!this.isServiceAvailable) {
        return await storyFallbackService.generateFallbackImage();
      }

      // Carregar o módulo imageProcessor de forma dinâmica para evitar ciclos
      // Importamos somente quando necessário
      const { imageProcessor } = await import('./imageProcessor');

      // Processar personagens
      let characterPrompt = '';
      let referenceImages: string[] = [];

      if (characters) {
        // Processar personagem principal
        if (characters.main) {
          try {
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
          } catch (error) {
            logger.error('Erro ao processar avatar principal:', error);
          }
        }

        // Processar personagem secundário
        if (characters.secondary) {
          try {
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
          } catch (error) {
            logger.error('Erro ao processar avatar secundário:', error);
          }
        }
      }

      // Otimizar prompt da cena (já inclui o contexto da história se fornecido)
      const optimizedScene = this.optimizePrompt(scenePrompt, storyContext, pageIndex, totalPages);
      const finalPrompt = characterPrompt 
        ? `${characterPrompt}\n\nCENA:\n${optimizedScene}`
        : optimizedScene;
        
      // Log do prompt final
      logger.info('DALL-E PROMPT FINAL:', {
        prompt: finalPrompt,
        pageIndex,
        hasCharacterPrompt: !!characterPrompt,
        hasReferenceImages: referenceImages.length > 0
      });

      // Gerar imagem
      const imageUrl = await this.generateImageWithRetry(
        finalPrompt, 
        referenceImages,
        storyContext,
        pageIndex,
        totalPages
      );

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