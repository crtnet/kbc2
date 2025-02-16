import { Configuration, OpenAIApi } from 'openai';
import { openaiConfig } from '../config/openai';
import { logger } from '../utils/logger';

class OpenAIService {
  private openai: OpenAIApi;

  constructor() {
    const configuration = new Configuration({
      apiKey: openaiConfig.apiKey,
    });
    this.openai = new OpenAIApi(configuration);
  }

  async generateStory(params: {
    title: string;
    genre: string;
    theme: string;
    mainCharacter: string;
    setting: string;
    tone: string;
  }): Promise<string> {
    try {
      const prompt = `
        Crie uma história infantil em português com as seguintes características:
        - Título: ${params.title}
        - Gênero: ${params.genre}
        - Tema: ${params.theme}
        - Personagem Principal: ${params.mainCharacter}
        - Cenário: ${params.setting}
        - Tom: ${params.tone}
        
        A história deve:
        - Ter aproximadamente 500 palavras
        - Ser dividida em 5 páginas
        - Cada página deve ter um parágrafo curto
        - Ser adequada para crianças
        - Ter uma moral relacionada ao tema
        - Ser envolvente e criativa
        - Incluir diálogos
        - Ter um final feliz
      `;

      logger.info('Gerando história com OpenAI...');
      
      const completion = await this.openai.createChatCompletion({
        model: openaiConfig.model,
        messages: [
          { role: 'system', content: 'Você é um escritor de histórias infantis experiente.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: openaiConfig.maxTokens,
        temperature: openaiConfig.temperature,
      });

      logger.info('História gerada com sucesso!');
      
      const story = completion.data.choices[0]?.message?.content;
      if (!story) {
        throw new Error('Não foi possível gerar a história');
      }

      return story;
    } catch (error: any) {
      logger.error('Erro ao gerar história:', error);
      throw error;
    }
  }

  async generateImage(prompt: string): Promise<string> {
    try {
      logger.info('Gerando imagem com OpenAI DALL-E...');
      
      const response = await this.openai.createImage({
        prompt,
        n: 1,
        size: '512x512',
      });
      
      // Supondo que a resposta venha no formato:
      // { data: { data: [ { url: "https://..." } ] } }
      const imageUrl = response.data.data[0].url;
      if (!imageUrl) {
        throw new Error('Imagem não gerada');
      }
      
      logger.info('Imagem gerada com sucesso:', imageUrl);
      return imageUrl;
    } catch (error: any) {
      logger.error('Erro ao gerar imagem:', error);
      throw error;
    }
  }
}

export const openaiService = new OpenAIService();