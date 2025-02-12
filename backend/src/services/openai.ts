import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { config } from '../config';

class OpenAIService {
  private openai: OpenAI;
  private imageQueue: Array<() => Promise<string>> = [];
  private isProcessingQueue = false;
  private lastImageGenerationTime = 0;
  private static readonly RATE_LIMIT_DELAY = 12000; // 12 segundos entre imagens
  private static readonly MAX_RETRIES = 3;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey
    });
  }

  async generateStory(prompt: string): Promise<string> {
    try {
      logger.info('Gerando história com OpenAI');
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Você é um escritor de histórias infantis. Crie uma história envolvente e apropriada para crianças."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      return completion.choices[0].message.content || '';
    } catch (error) {
      logger.error(`Erro ao gerar história: ${error.message}`);
      throw error;
    }
  }

  async generateImage(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.imageQueue.push(async () => {
        let retries = 0;
        while (retries < OpenAIService.MAX_RETRIES) {
          try {
            const now = Date.now();
            const timeSinceLastGeneration = now - this.lastImageGenerationTime;
            
            if (timeSinceLastGeneration < OpenAIService.RATE_LIMIT_DELAY) {
              const waitTime = OpenAIService.RATE_LIMIT_DELAY - timeSinceLastGeneration;
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }

            logger.info('Gerando imagem com DALL-E');
            
            const response = await this.openai.images.generate({
              model: "dall-e-3",
              prompt: `${prompt}. Estilo: ilustração infantil, cores vibrantes, seguro para crianças.`,
              n: 1,
              size: "1024x1024",
              quality: "standard",
              style: "vivid"
            });

            this.lastImageGenerationTime = Date.now();
            return response.data[0].url || '';
          } catch (error: any) {
            if (error.status === 429 && retries < OpenAIService.MAX_RETRIES - 1) {
              logger.warn(`Rate limit atingido, tentativa ${retries + 1} de ${OpenAIService.MAX_RETRIES}`);
              retries++;
              await new Promise(resolve => setTimeout(resolve, OpenAIService.RATE_LIMIT_DELAY));
              continue;
            }
            logger.error(`Erro ao gerar imagem: ${error.message}`);
            throw error;
          }
        }
        throw new Error('Número máximo de tentativas excedido');
      });

      this.processQueue().then(() => {
        const task = this.imageQueue[0];
        task().then(resolve).catch(reject).finally(() => {
          this.imageQueue.shift();
        });
      });
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.imageQueue.length === 0) return;
    
    this.isProcessingQueue = true;
    
    while (this.imageQueue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, OpenAIService.RATE_LIMIT_DELAY));
      this.isProcessingQueue = false;
    }
  }
}

export default new OpenAIService();