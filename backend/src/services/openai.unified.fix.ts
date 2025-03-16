import OpenAI from 'openai';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';
import { Character, GenerateStoryParams, StyleGuide } from '../types/book.types';

class OpenAIUnifiedFixService {
  private openai: OpenAI;
  private MAX_PROMPT_LENGTH = 4000;
  private MAX_RETRIES = 3;
  private RETRY_DELAY = 2000;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
      organization: config.openai.organization
    });
  }

  /**
   * Gera uma história baseada nos parâmetros fornecidos
   */
  public async generateStory(params: GenerateStoryParams): Promise<string> {
    try {
      const prompt = this.buildStoryPrompt(params);
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `Você é um autor especializado em livros infantis para crianças de ${params.ageRange} anos.
                     Crie uma história envolvente e apropriada para a idade, mantendo um tom ${params.tone}.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const story = completion.choices[0]?.message?.content;
      if (!story) {
        throw new Error('Não foi possível gerar a história');
      }

      return story;
    } catch (error) {
      logger.error('Erro ao gerar história', {
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      throw error;
    }
  }

  /**
   * Gera imagens para cada página da história
   */
  public async generateImagesForStory(
    pages: string[],
    characters: { [key: string]: Character },
    styleGuide: StyleGuide
  ): Promise<string[]> {
    const imageUrls: string[] = [];
    const pendingPages: { index: number; text: string }[] = [];
    
    // Prepara todas as páginas para processamento
    pages.forEach((pageText, index) => {
      pendingPages.push({ index, text: pageText });
    });
    
    // Função para processar uma única página
    const processPage = async (page: { index: number; text: string }): Promise<{ index: number; url: string }> => {
      const pageNumber = page.index + 1;
      try {
        logger.info(`Iniciando geração da imagem para a página ${pageNumber}/${pages.length}`, {
          pageNumber,
          totalPages: pages.length,
          textPreview: page.text.substring(0, 100) + '...'
        });

        const prompt = this.buildImagePrompt(
          page.text,
          characters,
          styleGuide,
          pageNumber,
          pages.length
        );

        // Removendo qualquer parâmetro de URL ou imagem de referência que possa estar no prompt
        const cleanPrompt = this.removeUrlsFromPrompt(prompt);

        logger.info(`Enviando prompt para geração da imagem da página ${pageNumber}`, {
          pageNumber,
          promptLength: cleanPrompt.length
        });

        // Implementação robusta com retry
        let imageUrl = '';
        let attempts = 0;
        let lastError: Error | null = null;
        
        while (attempts < this.MAX_RETRIES) {
          try {
            // Log detalhado do prompt para depuração
            logger.info(`Prompt para página ${pageNumber} (tentativa ${attempts + 1}):`, {
              prompt: cleanPrompt.substring(0, 200) + '...',
              pageNumber,
              attempt: attempts + 1
            });
            
            // Adicionando um pequeno atraso aleatório para evitar rate limiting
            const delay = Math.floor(Math.random() * 2000) + 1000; // 1-3 segundos
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Usando modelo mais simples e rápido para melhorar a confiabilidade
            const response = await this.openai.images.generate({
              model: "dall-e-2", // Usando o modelo mais estável
              prompt: cleanPrompt.substring(0, this.MAX_PROMPT_LENGTH),
              n: 1,
              size: "1024x1024", // Mantendo tamanho grande para qualidade
              quality: "standard",
              style: "vivid" // Melhor para livros infantis
            });

            imageUrl = response.data[0]?.url;
            if (!imageUrl) {
              throw new Error('URL da imagem não gerada');
            }
            
            // Verifica se a URL é acessível
            try {
              const axios = require('axios');
              const imageResponse = await axios.head(imageUrl, { 
                timeout: 5000,
                validateStatus: (status: number) => status >= 200 && status < 300
              });
              
              if (imageResponse.status !== 200) {
                throw new Error(`Imagem inacessível, status: ${imageResponse.status}`);
              }
              
              // Verifica o content-type
              const contentType = imageResponse.headers['content-type'];
              if (!contentType || !contentType.startsWith('image/')) {
                throw new Error(`Tipo de conteúdo inválido: ${contentType}`);
              }
            } catch (imageCheckError) {
              logger.warn(`Erro ao verificar acesso à imagem: ${imageCheckError.message}`, {
                pageNumber,
                attempt: attempts + 1
              });
              
              // Se não conseguir verificar a imagem, tenta baixá-la para confirmar
              try {
                const axios = require('axios');
                const imageDataResponse = await axios.get(imageUrl, { 
                  timeout: 10000,
                  responseType: 'arraybuffer'
                });
                
                if (!imageDataResponse.data || imageDataResponse.data.length === 0) {
                  throw new Error('Resposta vazia ao baixar imagem');
                }
                
                // Se chegou aqui, a imagem foi baixada com sucesso
                logger.info(`Imagem verificada por download para página ${pageNumber}`, {
                  pageNumber,
                  size: imageDataResponse.data.length
                });
              } catch (downloadError) {
                // Se falhar no download, considera a URL inválida
                throw new Error(`Falha ao baixar imagem: ${downloadError.message}`);
              }
            }
            
            // Se chegou aqui, a imagem foi gerada com sucesso
            break;
          } catch (retryError) {
            attempts++;
            lastError = retryError instanceof Error ? retryError : new Error(String(retryError));
            
            logger.warn(`Tentativa ${attempts}/${this.MAX_RETRIES} falhou para página ${pageNumber}`, {
              error: lastError.message,
              stack: lastError.stack
            });
            
            // Se atingiu o número máximo de tentativas, lança o erro
            if (attempts >= this.MAX_RETRIES) {
              throw lastError;
            }
            
            // Aguarda antes de tentar novamente, com backoff exponencial
            const backoffDelay = this.RETRY_DELAY * Math.pow(2, attempts - 1);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
          }
        }

        logger.info(`Imagem para página ${pageNumber}/${pages.length} gerada com sucesso`, {
          pageNumber,
          totalPages: pages.length,
          imageUrl: imageUrl.substring(0, 50) + '...',
          promptLength: cleanPrompt.length
        });

        return { index: page.index, url: imageUrl };
      } catch (error) {
        logger.error(`Erro ao gerar imagem para página ${pageNumber}/${pages.length}`, {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          pageNumber,
          totalPages: pages.length,
          stack: error instanceof Error ? error.stack : undefined
        });
        
        // Tenta gerar uma imagem de fallback com um prompt mais simples
        try {
          logger.info(`Tentando gerar imagem de fallback para página ${pageNumber}`, {
            pageNumber
          });
          
          // Cria um prompt simplificado
          const simplifiedPrompt = `Ilustração simples para livro infantil. Cena com personagens interagindo. Estilo cartoon colorido.`;
          
          // Tenta gerar com o modelo mais simples
          const fallbackResponse = await this.openai.images.generate({
            model: "dall-e-2",
            prompt: simplifiedPrompt,
            n: 1,
            size: "512x512", // Tamanho menor para maior chance de sucesso
            quality: "standard"
          });
          
          const fallbackUrl = fallbackResponse.data[0]?.url;
          if (fallbackUrl) {
            logger.info(`Imagem de fallback gerada com sucesso para página ${pageNumber}`, {
              pageNumber
            });
            return { index: page.index, url: fallbackUrl };
          }
        } catch (fallbackError) {
          logger.error(`Erro ao gerar imagem de fallback para página ${pageNumber}`, {
            error: fallbackError instanceof Error ? fallbackError.message : 'Erro desconhecido',
            pageNumber
          });
        }
        
        // Usa uma imagem de fallback em caso de erro
        const fallbackImagePath = this.getFallbackImagePath();
        logger.info(`Usando imagem de fallback estática para página ${pageNumber}`, {
          pageNumber,
          fallbackImagePath
        });
        return { index: page.index, url: fallbackImagePath };
      }
    };
    
    // Processa as páginas com limite de concorrência
    const MAX_CONCURRENT = 1; // Limita a 1 requisição por vez para evitar sobrecarga e timeout
    
    // Inicializa o array de resultados com o tamanho correto
    const results = new Array(pages.length).fill(null);
    
    // Adiciona um atraso entre as páginas para evitar rate limiting
    const PAGE_DELAY = 8000; // 8 segundos entre páginas para evitar rate limiting
    
    while (pendingPages.length > 0) {
      // Pega até MAX_CONCURRENT páginas para processar
      const batch = pendingPages.splice(0, MAX_CONCURRENT);
      
      // Processa o lote atual em paralelo
      const batchPromises = batch.map(page => processPage(page));
      const batchResults = await Promise.all(batchPromises);
      
      // Adiciona os resultados ao array final na posição correta
      for (const result of batchResults) {
        results[result.index] = result.url;
      }
      
      // Aguarda um pouco entre os lotes para evitar rate limiting
      if (pendingPages.length > 0) {
        await new Promise(resolve => setTimeout(resolve, PAGE_DELAY));
      }
    }
    
    // Verifica se há algum resultado nulo e substitui por fallback
    for (let i = 0; i < results.length; i++) {
      if (!results[i]) {
        logger.warn(`Resultado nulo para página ${i + 1}, usando fallback`, { pageNumber: i + 1 });
        results[i] = this.getFallbackImagePath();
      }
    }
    
    return results;
  }
  
  /**
   * Obtém o caminho para uma imagem de fallback
   * @public para testes
   */
  public getFallbackImagePath(): string {
    try {
      // Verifica se o diretório de fallback existe
      const fallbackDir = path.join(__dirname, '../../public/assets/images');
      const fallbackImagePath = path.join(fallbackDir, 'fallback-page.jpg');
      
      // Verifica se a imagem de fallback existe
      if (fs.existsSync(fallbackImagePath)) {
        logger.info('Imagem de fallback encontrada', { fallbackImagePath });
        
        // Verifica se a imagem tem conteúdo
        const stats = fs.statSync(fallbackImagePath);
        if (stats.size === 0) {
          logger.warn('Imagem de fallback existe mas está vazia', { fallbackImagePath });
          // Tenta criar uma imagem de fallback mais robusta
          this.createRobustFallbackImage(fallbackImagePath);
        } else if (stats.size < 1024) { // Se for muito pequena (menos de 1KB)
          logger.warn('Imagem de fallback é muito pequena, criando uma nova', { 
            fallbackImagePath,
            size: stats.size
          });
          this.createRobustFallbackImage(fallbackImagePath);
        }
        
        return '/assets/images/fallback-page.jpg';
      }
      
      // Se não existir, cria o diretório e uma imagem robusta
      if (!fs.existsSync(fallbackDir)) {
        logger.info('Criando diretório para imagens de fallback', { fallbackDir });
        fs.mkdirSync(fallbackDir, { recursive: true });
      }
      
      // Tenta criar uma imagem de fallback robusta
      this.createRobustFallbackImage(fallbackImagePath);
      
      return '/assets/images/fallback-page.jpg';
    } catch (error) {
      logger.error('Erro ao obter imagem de fallback', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Retorna um caminho padrão em caso de erro
      return '/assets/images/fallback-page.jpg';
    }
  }
  
  /**
   * Cria uma imagem de fallback mais robusta
   * @private
   */
  private createRobustFallbackImage(imagePath: string): void {
    try {
      // Tenta usar o sharp para criar uma imagem colorida mais robusta
      try {
        const sharp = require('sharp');
        
        // Cria uma imagem colorida de 600x600 com texto
        const width = 600;
        const height = 600;
        const svgImage = `
          <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f0f0f0"/>
            <rect x="50" y="50" width="${width-100}" height="${height-100}" fill="#ffffff" stroke="#cccccc" stroke-width="2"/>
            <text x="50%" y="45%" font-family="Arial" font-size="24" fill="#666666" text-anchor="middle">Imagem não disponível</text>
            <text x="50%" y="55%" font-family="Arial" font-size="18" fill="#999999" text-anchor="middle">Fallback para livro infantil</text>
          </svg>
        `;
        
        // Converte o SVG para JPEG
        sharp(Buffer.from(svgImage))
          .jpeg({ quality: 90 })
          .toFile(imagePath)
          .then(() => {
            logger.info('Imagem de fallback robusta criada com sucesso usando sharp', { imagePath });
          })
          .catch((sharpError: Error) => {
            logger.error('Erro ao criar imagem de fallback com sharp', {
              error: sharpError.message,
              stack: sharpError.stack
            });
            // Tenta o método básico como fallback
            this.createBasicFallbackImage(imagePath);
          });
      } catch (sharpError) {
        logger.error('Erro ao carregar sharp para criar imagem de fallback', {
          error: sharpError instanceof Error ? sharpError.message : 'Erro desconhecido',
          stack: sharpError instanceof Error ? sharpError.stack : undefined
        });
        
        // Se falhar com sharp, tenta o método básico
        this.createBasicFallbackImage(imagePath);
      }
    } catch (error) {
      logger.error('Erro ao criar imagem de fallback robusta', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Tenta o método básico como último recurso
      this.createBasicFallbackImage(imagePath);
    }
  }
  
  /**
   * Cria uma imagem de fallback básica
   * @private
   */
  private createBasicFallbackImage(imagePath: string): void {
    try {
      // Tenta criar uma imagem JPEG básica válida
      // Este é um JPEG mínimo válido (1x1 pixel branco)
      const jpegHeader = Buffer.from([
        0xFF, 0xD8,                     // SOI marker
        0xFF, 0xE0, 0x00, 0x10,         // APP0 marker
        0x4A, 0x46, 0x49, 0x46, 0x00,   // JFIF identifier
        0x01, 0x01,                     // JFIF version
        0x00,                           // units
        0x00, 0x01, 0x00, 0x01,         // density
        0x00, 0x00,                     // thumbnail
        
        0xFF, 0xDB, 0x00, 0x43, 0x00,   // DQT marker
        0x10, 0x0B, 0x0C, 0x0E, 0x0C, 0x0A, 0x10, 0x0E,
        0x0D, 0x0E, 0x12, 0x11, 0x10, 0x13, 0x18, 0x28,
        0x1A, 0x18, 0x16, 0x16, 0x18, 0x31, 0x23, 0x25,
        0x1D, 0x28, 0x3A, 0x33, 0x3D, 0x3C, 0x39, 0x33,
        0x38, 0x37, 0x40, 0x48, 0x5C, 0x4E, 0x40, 0x44,
        0x57, 0x45, 0x37, 0x38, 0x50, 0x6D, 0x51, 0x57,
        0x5F, 0x62, 0x67, 0x68, 0x67, 0x3E, 0x4D, 0x71,
        0x79, 0x70, 0x64, 0x78, 0x5C, 0x65, 0x67, 0x63,
        
        0xFF, 0xC0, 0x00, 0x0B,         // SOF marker
        0x08,                           // precision
        0x00, 0x01, 0x00, 0x01,         // dimensions
        0x01,                           // components
        0x01, 0x11, 0x00,               // component info
        
        0xFF, 0xC4, 0x00, 0x14,         // DHT marker
        0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00,
        
        0xFF, 0xDA, 0x00, 0x08,         // SOS marker
        0x01, 0x01, 0x00, 0x00, 0x3F, 0x00,
        
        0x00,                           // image data
        
        0xFF, 0xD9                      // EOI marker
      ]);
      
      // Escreve o buffer no arquivo
      fs.writeFileSync(imagePath, jpegHeader);
      
      // Verifica se o arquivo foi criado corretamente
      if (fs.existsSync(imagePath)) {
        const stats = fs.statSync(imagePath);
        if (stats.size > 0) {
          logger.info('Imagem de fallback básica criada com sucesso', { 
            imagePath,
            size: stats.size
          });
          return;
        }
      }
      
      // Se chegou aqui, algo deu errado com o JPEG
      throw new Error('Falha ao verificar a imagem JPEG criada');
    } catch (jpegError) {
      logger.error('Erro ao criar imagem JPEG de fallback', {
        error: jpegError instanceof Error ? jpegError.message : 'Erro desconhecido'
      });
      
      try {
        // Tenta criar um PNG como alternativa
        // Cabeçalho PNG mínimo válido (1x1 pixel transparente)
        const pngHeader = Buffer.from([
          0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
          0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
          0x49, 0x48, 0x44, 0x52, // "IHDR"
          0x00, 0x00, 0x00, 0x01, // width: 1
          0x00, 0x00, 0x00, 0x01, // height: 1
          0x08, // bit depth
          0x06, // color type: RGBA
          0x00, // compression method
          0x00, // filter method
          0x00, // interlace method
          0x1F, 0x15, 0xC4, 0x89, // IHDR CRC
          0x00, 0x00, 0x00, 0x0A, // IDAT chunk length
          0x49, 0x44, 0x41, 0x54, // "IDAT"
          0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, // IDAT data
          0x0D, 0x0A, 0x2D, 0xB4, // IDAT CRC
          0x00, 0x00, 0x00, 0x00, // IEND chunk length
          0x49, 0x45, 0x4E, 0x44, // "IEND"
          0xAE, 0x42, 0x60, 0x82  // IEND CRC
        ]);
        
        // Escreve o buffer PNG no arquivo
        fs.writeFileSync(imagePath, pngHeader);
        
        // Verifica se o arquivo foi criado corretamente
        if (fs.existsSync(imagePath)) {
          const stats = fs.statSync(imagePath);
          if (stats.size > 0) {
            logger.info('Imagem PNG de fallback criada com sucesso', { 
              imagePath,
              size: stats.size
            });
            return;
          }
        }
        
        throw new Error('Falha ao verificar a imagem PNG criada');
      } catch (pngError) {
        logger.error('Erro ao criar imagem PNG de fallback', {
          error: pngError instanceof Error ? pngError.message : 'Erro desconhecido'
        });
        
        // Último recurso: cria um arquivo de texto com extensão .jpg
        try {
          fs.writeFileSync(imagePath, 'FALLBACK_IMAGE');
          logger.warn('Criado arquivo de texto como fallback de último recurso', { imagePath });
        } catch (finalError) {
          logger.error('Falha completa ao criar qualquer tipo de arquivo de fallback', {
            error: finalError instanceof Error ? finalError.message : 'Erro desconhecido'
          });
        }
      }
    }
  }
  
  /**
   * Remove URLs e referências a imagens do prompt
   * @public para testes
   */
  public removeUrlsFromPrompt(prompt: string): string {
    // Remove URLs HTTP/HTTPS
    let cleanPrompt = prompt.replace(/https?:\/\/[^\s]+/g, '');
    
    // Remove menções a "imagem de referência", "baseado na imagem", etc.
    cleanPrompt = cleanPrompt.replace(/(?:baseado|com base|referência|similar|como|igual)(?:\s+a|\s+na|\s+ao|\s+no)?\s+(?:a\s+)?(?:imagem|foto|ilustração|avatar|referência)(?:\s+(?:anexada|fornecida|acima|abaixo|anterior))?/gi, '');
    
    // Remove instruções para usar imagens como referência
    cleanPrompt = cleanPrompt.replace(/use(?:\s+a|\s+esta)?\s+(?:imagem|foto|ilustração|avatar)(?:\s+(?:como|de|para))?\s+(?:referência|base|inspiração|guia)/gi, '');
    
    // Remove qualquer menção a "URL" ou "link"
    cleanPrompt = cleanPrompt.replace(/\b(?:url|link|endereço|caminho)\b(?:\s+da|\s+de|\s+do)?\s+(?:imagem|foto|ilustração|avatar)/gi, '');
    
    // Limpa espaços extras e pontuação duplicada que possa ter ficado
    cleanPrompt = cleanPrompt.replace(/\s{2,}/g, ' ');
    cleanPrompt = cleanPrompt.replace(/([.,;:!?])\1+/g, '$1');
    
    return cleanPrompt.trim();
  }

  private buildStoryPrompt(params: GenerateStoryParams): string {
    return `Crie uma história infantil com as seguintes características:

Título: "${params.title}"
Gênero: ${params.genre}
Tema Principal: ${params.theme}
Tom da Narrativa: ${params.tone}

Personagem Principal: ${params.mainCharacter}
${params.mainCharacterDescription}

${params.secondaryCharacter ? `Personagem Secundário: ${params.secondaryCharacter}
${params.secondaryCharacterDescription}` : ''}

Cenário: ${params.setting}
${params.styleGuide.environment}

A história deve:
1. Ser apropriada para crianças de ${params.ageRange} anos
2. Ter uma estrutura clara com início, meio e fim
3. Incluir diálogos envolventes e descrições vívidas
4. Transmitir uma mensagem positiva sobre ${params.theme}
5. Manter um ritmo adequado para a faixa etária
6. Ter aproximadamente 5 páginas de conteúdo

Por favor, crie uma história envolvente que mantenha a consistência com as descrições fornecidas dos personagens e do ambiente.`;
  }

  /**
   * Constrói o prompt para geração de imagem
   * @public para testes
   */
  public buildImagePrompt(
    pageText: string,
    characters: { [key: string]: Character },
    styleGuide: StyleGuide,
    pageNumber: number,
    totalPages: number
  ): string {
    // Extrai a cena principal do texto da página
    const mainScene = this.extractMainScene(pageText);

    // Constrói o prompt base com o estilo artístico
    let prompt = `Ilustração de livro infantil, estilo cartoon, cores vibrantes e alegres. `;

    // Prioriza a cena completa da página
    prompt += `Cena completa: ${mainScene}. `;

    // Adiciona descrições dos personagens de forma mais concisa
    if (styleGuide.character) {
      // Limita o tamanho da descrição do personagem para não sobrecarregar o prompt
      const characterDescription = styleGuide.character.length > 400 
        ? styleGuide.character.substring(0, 400) + '...' 
        : styleGuide.character;
      
      prompt += `Personagens na cena: ${characterDescription}. `;
    } else {
      // Fallback para o caso de não ter descrição no styleGuide
      prompt += `Personagem principal na cena: ${characters.main.description.substring(0, 150)}`;
      if (characters.secondary) {
        prompt += `. Personagem secundário na cena: ${characters.secondary.description.substring(0, 150)}`;
      }
      prompt += `. `;
    }

    // Adiciona descrição do ambiente
    const environmentDescription = styleGuide.environment.length > 300 
      ? styleGuide.environment.substring(0, 300) + '...' 
      : styleGuide.environment;
    
    prompt += `Ambiente da cena: ${environmentDescription}. `;

    // Adiciona diretrizes específicas para livros infantis
    prompt += `Estilo: ilustração de livro infantil profissional, cena completa com todos os personagens interagindo, cores vivas, traços limpos, alta qualidade, imagem horizontal em formato de página de livro.`;

    // Verifica o tamanho total do prompt e reduz se necessário
    if (prompt.length > this.MAX_PROMPT_LENGTH) {
      prompt = prompt.substring(0, this.MAX_PROMPT_LENGTH - 3) + '...';
      logger.warn(`Prompt para imagem da página ${pageNumber} foi truncado por exceder o limite`, {
        pageNumber,
        originalLength: prompt.length,
        truncatedLength: this.MAX_PROMPT_LENGTH
      });
    }

    return prompt;
  }

  /**
   * Extrai a cena principal do texto da página
   * @public para testes
   */
  public extractMainScene(pageText: string): string {
    try {
      // Remove pontuação e quebras de linha
      const cleanText = pageText.replace(/\n+/g, " ").trim();
      
      // Divide em sentenças
      const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      if (sentences.length === 0) {
        return "Cena de livro infantil com personagens em interação";
      }
      
      // Pega até 4 sentenças para capturar melhor o contexto da cena
      const maxSentences = Math.min(4, sentences.length);
      const mainSceneSentences = sentences.slice(0, maxSentences);
      
      // Prioriza sentenças que descrevem ação
      const actionWords = [
        ' está ', ' estão ', ' fazendo ', ' faz ', ' vai ', ' vão ',
        ' corre', ' pula', ' brinca', ' sorri', ' olha', ' vê ',
        ' caminha', ' encontra', ' descobre', ' mostra', ' segura',
        ' conversa', ' fala', ' diz ', ' pergunta', ' responde'
      ];
      
      // Verifica se há sentenças com ação
      const hasActionSentences = mainSceneSentences.some(sentence => {
        const lowerSentence = sentence.toLowerCase();
        return actionWords.some(word => lowerSentence.includes(word));
      });
      
      // Se não encontrou sentenças com ação, tenta pegar mais sentenças
      if (!hasActionSentences && sentences.length > maxSentences) {
        const additionalSentences = sentences.slice(maxSentences, maxSentences + 2);
        for (const sentence of additionalSentences) {
          const lowerSentence = sentence.toLowerCase();
          if (actionWords.some(word => lowerSentence.includes(word))) {
            mainSceneSentences.push(sentence);
            break;
          }
        }
      }
      
      // Junta as sentenças em um texto coeso
      return mainSceneSentences.join('. ') + '.';
    } catch (error) {
      logger.error('Erro ao extrair cena principal', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        pageText: pageText.substring(0, 100) + '...'
      });
      
      // Em caso de erro, retorna uma descrição genérica
      return "Cena de livro infantil com personagens em interação";
    }
  }
}

export const openaiUnifiedFixService = new OpenAIUnifiedFixService();