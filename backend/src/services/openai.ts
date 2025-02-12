import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { config } from '../config';
import { performance } from 'perf_hooks';

class OpenAIService {
  private openai: OpenAI;
  private imageQueue: Array<{
    prompt: string;
    resolve: (value: string) => void;
    reject: (reason: any) => void;
  }> = [];
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
      const startTime = performance.now();
      
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

      const endTime = performance.now();
      logger.info(`História gerada em ${((endTime - startTime) / 1000).toFixed(2)} segundos`);

      return completion.choices[0].message.content || '';
    } catch (error) {
      logger.error(`Erro ao gerar história: ${error.message}`);
      throw error;
    }
  }

  async generateImage(prompt: string): Promise<string> {
    logger.info(`Adicionando requisição de imagem à fila: "${prompt.substring(0, 50)}..."`);
    
    return new Promise((resolve, reject) => {
      this.imageQueue.push({ prompt, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.imageQueue.length === 0) return;
    
    this.isProcessingQueue = true;
    logger.info(`Iniciando processamento da fila de imagens. Total na fila: ${this.imageQueue.length}`);

    while (this.imageQueue.length > 0) {
      const { prompt, resolve, reject } = this.imageQueue[0];
      let retries = 0;

      while (retries < OpenAIService.MAX_RETRIES) {
        try {
          const now = Date.now();
          const timeSinceLastGeneration = now - this.lastImageGenerationTime;
          
          if (timeSinceLastGeneration < OpenAIService.RATE_LIMIT_DELAY) {
            const waitTime = OpenAIService.RATE_LIMIT_DELAY - timeSinceLastGeneration;
            logger.info(`Aguardando ${waitTime}ms antes da próxima geração de imagem`);
            await new Promise(r => setTimeout(r, waitTime));
          }

          const startTime = performance.now();
          logger.info(`Gerando imagem ${this.imageQueue.length} de ${this.imageQueue.length}: "${prompt.substring(0, 50)}..."`);
          
          const response = await this.openai.images.generate({
            model: "dall-e-3",
            prompt: `${prompt}. Estilo: ilustração infantil, cores vibrantes, seguro para crianças.`,
            n: 1,
            size: "1024x1024",
            quality: "standard",
            style: "vivid"
          });

          const endTime = performance.now();
          this.lastImageGenerationTime = Date.now();
          
          const imageUrl = response.data[0].url || '';
          logger.info(`Imagem gerada com sucesso em ${((endTime - startTime) / 1000).toFixed(2)} segundos`);
          
          resolve(imageUrl);
          this.imageQueue.shift();
          break;
        } catch (error: any) {
          if (error.status === 429 && retries < OpenAIService.MAX_RETRIES - 1) {
            retries++;
            logger.warn(`Rate limit atingido, tentativa ${retries} de ${OpenAIService.MAX_RETRIES}`);
            await new Promise(r => setTimeout(r, OpenAIService.RATE_LIMIT_DELAY));
            continue;
          }
          
          logger.error(`Erro ao gerar imagem após ${retries + 1} tentativas: ${error.message}`);
          reject(error);
          this.imageQueue.shift();
          break;
        }
      }
    }

    logger.info('Fila de imagens processada completamente');
    this.isProcessingQueue = false;
  }
}

export default new OpenAIService();