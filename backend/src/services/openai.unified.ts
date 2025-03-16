import OpenAI from 'openai';
import { config } from '../config/config';
import { logger } from '../utils/logger';

interface Character {
  name: string;
  description: string;
  type: 'main' | 'secondary';
}

interface StyleGuide {
  character: string;
  environment: string;
  artisticStyle: string;
}

interface GenerateStoryParams {
  title: string;
  genre: string;
  theme: string;
  mainCharacter: string;
  mainCharacterDescription: string;
  secondaryCharacter?: string;
  secondaryCharacterDescription?: string;
  setting: string;
  tone: string;
  ageRange: string;
  styleGuide: StyleGuide;
}

class OpenAIUnifiedService {
  private openai: OpenAI;

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

    for (const [index, pageText] of pages.entries()) {
      try {
        const pageNumber = index + 1;
        logger.info(`Iniciando geração da imagem para a página ${pageNumber}/${pages.length}`, {
          pageNumber,
          totalPages: pages.length,
          textPreview: pageText.substring(0, 100) + '...'
        });

        const prompt = this.buildImagePrompt(
          pageText,
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

        const response = await this.openai.images.generate({
          prompt: cleanPrompt,
          n: 1,
          size: config.openai.imageSize as "1024x1024" | "512x512" | "256x256",
          quality: config.openai.imageQuality as "standard" | "hd",
          style: config.openai.imageStyle as "natural" | "vivid"
        });

        const imageUrl = response.data[0]?.url;
        if (!imageUrl) {
          throw new Error('URL da imagem não gerada');
        }

        imageUrls.push(imageUrl);
        
        logger.info(`Imagem para página ${pageNumber}/${pages.length} gerada com sucesso`, {
          pageNumber,
          totalPages: pages.length,
          imageUrl: imageUrl.substring(0, 50) + '...',
          promptLength: cleanPrompt.length
        });

        // Aguarda um pouco entre as requisições para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        logger.error(`Erro ao gerar imagem para página ${index + 1}/${pages.length}`, {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          pageNumber: index + 1,
          totalPages: pages.length,
          stack: error instanceof Error ? error.stack : undefined
        });
        // Usa uma imagem de fallback em caso de erro
        imageUrls.push('/assets/images/fallback-page.jpg');
      }
    }

    return imageUrls;
  }
  
  /**
   * Remove URLs e referências a imagens do prompt
   */
  private removeUrlsFromPrompt(prompt: string): string {
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

  private buildImagePrompt(
    pageText: string,
    characters: { [key: string]: Character },
    styleGuide: StyleGuide,
    pageNumber: number,
    totalPages: number
  ): string {
    // Extrai a cena principal do texto da página
    const mainScene = this.extractMainScene(pageText);

    // Constrói o prompt base com o estilo artístico
    let prompt = `${styleGuide.artisticStyle}. `;

    // Adiciona descrições dos personagens usando as descrições detalhadas do styleGuide
    if (styleGuide.character) {
      prompt += `Personagens: ${styleGuide.character}. `;
    } else {
      // Fallback para o caso de não ter descrição no styleGuide
      prompt += `Personagem principal: ${characters.main.description}`;
      if (characters.secondary) {
        prompt += `. Personagem secundário: ${characters.secondary.description}`;
      }
      prompt += `. `;
    }

    // Adiciona descrição do ambiente
    prompt += `Ambiente: ${styleGuide.environment}. `;

    // Adiciona a cena específica
    prompt += `Cena: ${mainScene}`;

    // Adiciona diretrizes específicas para livros infantis
    prompt += `. Estilo de ilustração infantil, cores vibrantes e alegres, traços suaves e expressões claras.`;

    return prompt;
  }

  private extractMainScene(pageText: string): string {
    // Remove pontuação e quebras de linha
    const cleanText = pageText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
                             .replace(/\s{2,}/g, " ")
                             .trim();

    // Divide em sentenças
    const sentences = cleanText.split(/[.!?]+/);

    // Pega as primeiras 2-3 sentenças que descrevem ação
    const actionSentences = sentences
      .filter(sentence => 
        sentence.toLowerCase().includes(' está ') ||
        sentence.toLowerCase().includes(' estão ') ||
        sentence.toLowerCase().includes(' fazendo ') ||
        sentence.toLowerCase().includes(' faz ') ||
        sentence.toLowerCase().includes(' vai ') ||
        sentence.toLowerCase().includes(' vão ')
      )
      .slice(0, 3);

    return actionSentences.join('. ') || sentences[0];
  }
}

export const openaiUnifiedService = new OpenAIUnifiedService();