import { Configuration, OpenAIApi } from 'openai';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import axios from 'axios';

class ImageAnalysisService {
  private openai: OpenAIApi;

  constructor() {
    const configuration = new Configuration({
      apiKey: config.openai.apiKey,
    });
    this.openai = new OpenAIApi(configuration);
  }

  /**
   * Analisa uma imagem e gera uma descrição detalhada
   * @param imageUrl URL da imagem a ser analisada
   * @param context Contexto adicional sobre a imagem (ex: "personagem principal", "personagem secundário")
   * @returns Descrição detalhada da imagem
   */
  public async analyzeImage(imageUrl: string, context: string): Promise<string> {
    try {
      logger.info('Iniciando análise de imagem', { imageUrl, context });

      // Baixa a imagem como base64
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const base64Image = Buffer.from(response.data, 'binary').toString('base64');

      // Envia para o GPT-4 Vision para análise
      const completion = await this.openai.createChatCompletion({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em análise de imagens para livros infantis. 
                     Descreva a imagem em detalhes, focando em:
                     1. Características físicas (altura, corpo, postura)
                     2. Rosto e expressões (formato do rosto, olhos, nariz, boca, expressão)
                     3. Cabelo (cor, estilo, comprimento)
                     4. Roupas e acessórios (cores, estilos, detalhes)
                     5. Personalidade aparente (baseado na expressão e postura)
                     
                     Formate a descrição de forma clara e detalhada, adequada para ser usada 
                     como prompt para o DALL-E gerar ilustrações consistentes.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Por favor, analise esta imagem de ${context} e forneça uma descrição detalhada 
                       que possa ser usada para manter a consistência visual nas ilustrações do livro.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 500
      });

      const description = completion.data.choices[0]?.message?.content;
      if (!description) {
        throw new Error('Não foi possível gerar uma descrição para a imagem');
      }

      logger.info('Descrição da imagem gerada com sucesso', {
        imageUrl,
        descriptionLength: description.length
      });

      return description;
    } catch (error) {
      logger.error('Erro ao analisar imagem', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        imageUrl
      });
      throw error;
    }
  }

  /**
   * Analisa um avatar customizado e extrai informações relevantes
   * @param avatarData Dados do avatar customizado
   * @returns Descrição detalhada do avatar
   */
  public async analyzeCustomAvatar(avatarData: string): Promise<string> {
    try {
      // Verifica se é um avatar customizado
      if (!avatarData.startsWith('CUSTOM||')) {
        return this.analyzeImage(avatarData, 'avatar');
      }

      // Extrai a URL da face e os dados de customização
      const parts = avatarData.split('||CUSTOM_AVATAR_DATA||');
      if (parts.length !== 2) {
        throw new Error('Formato de avatar customizado inválido');
      }

      const faceUrl = parts[0].replace('CUSTOM||', '');
      const customizationData = JSON.parse(parts[1]);

      // Gera uma descrição baseada nos dados de customização
      let description = 'Personagem com ';
      
      // Adiciona características físicas
      if (customizationData.physicalTraits) {
        description += `${customizationData.physicalTraits.height || 'altura média'}, `;
        description += `${customizationData.physicalTraits.build || 'estrutura normal'}, `;
      }

      // Adiciona características faciais
      if (customizationData.facialFeatures) {
        description += `rosto ${customizationData.facialFeatures.shape || 'oval'}, `;
        description += `olhos ${customizationData.facialFeatures.eyes || 'expressivos'}, `;
        description += `nariz ${customizationData.facialFeatures.nose || 'proporcional'}, `;
      }

      // Adiciona cabelo
      if (customizationData.hair) {
        description += `cabelo ${customizationData.hair.color} ${customizationData.hair.style}, `;
      }

      // Adiciona roupas
      if (customizationData.clothing) {
        description += `vestindo ${customizationData.clothing.description}, `;
      }

      // Adiciona acessórios
      if (customizationData.accessories && customizationData.accessories.length > 0) {
        description += `usando ${customizationData.accessories.join(', ')}, `;
      }

      // Remove a última vírgula e espaço
      description = description.replace(/, $/, '');

      // Analisa também a imagem da face para complementar a descrição
      const faceDescription = await this.analyzeImage(faceUrl, 'rosto do avatar');
      
      // Combina as descrições
      const finalDescription = `${description}. ${faceDescription}`;

      logger.info('Descrição do avatar customizado gerada com sucesso', {
        descriptionLength: finalDescription.length
      });

      return finalDescription;
    } catch (error) {
      logger.error('Erro ao analisar avatar customizado', {
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      throw error;
    }
  }
}

export const imageAnalysisService = new ImageAnalysisService();