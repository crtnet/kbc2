import { Configuration, OpenAIApi } from 'openai';
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
  private openai: OpenAIApi;

  constructor() {
    const configuration = new Configuration({
      apiKey: config.openai.apiKey,
    });
    this.openai = new OpenAIApi(configuration);
  }

  /**
   * Gera uma história baseada nos parâmetros fornecidos
   */
  public async generateStory(params: GenerateStoryParams): Promise<string> {
    try {
      const prompt = this.buildStoryPrompt(params);
      
      const completion = await this.openai.createChatCompletion({
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

      const story = completion.data.choices[0]?.message?.content;
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
        const prompt = this.buildImagePrompt(
          pageText,
          characters,
          styleGuide,
          index + 1,
          pages.length
        );

        const response = await this.openai.createImage({
          prompt,
          n: 1,
          size: "1024x1024",
          response_format: "url"
        });

        const imageUrl = response.data.data[0]?.url;
        if (!imageUrl) {
          throw new Error('URL da imagem não gerada');
        }

        imageUrls.push(imageUrl);
        
        logger.info('Imagem gerada com sucesso', {
          pageNumber: index + 1,
          promptLength: prompt.length
        });

        // Aguarda um pouco entre as requisições para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        logger.error('Erro ao gerar imagem', {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          pageNumber: index + 1
        });
        // Usa uma imagem de fallback em caso de erro
        imageUrls.push('/assets/images/fallback-page.jpg');
      }
    }

    return imageUrls;
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

    // Adiciona descrições dos personagens
    prompt += `Personagens na cena: ${characters.main.description}`;
    if (characters.secondary) {
      prompt += ` e ${characters.secondary.description}`;
    }

    // Adiciona descrição do ambiente
    prompt += `. Ambiente: ${styleGuide.environment}. `;

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