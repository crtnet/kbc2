import { Request, Response } from 'express';
import { StoryGenerationService } from '../services/storyGenerationService';
import { Book } from '../models/Book';
import logger from '../utils/logger';

export class StoryController {
  private storyService: StoryGenerationService;

  constructor() {
    this.storyService = new StoryGenerationService();
  }

  async createStory(req: Request, res: Response) {
    try {
      logger.info('[INÍCIO] Recebida requisição para criar história');
      logger.info('Dados recebidos:', req.body);

      const book = await this.storyService.generateStory(req.body);
      
      logger.info(`[FIM] História criada com sucesso. ID: ${book._id}`);
      return res.json({
        message: 'História criada com sucesso',
        book: {
          _id: book._id,
          title: book.title,
          status: book.status,
          pdfUrl: book.pdfUrl,
          pages: book.pages.length
        }
      });
    } catch (error) {
      logger.error('[ERRO] Erro ao criar história:', error);
      return res.status(500).json({ error: 'Erro ao criar história' });
    }
  }

  async getStoryStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      logger.info(`[INÍCIO] Verificando status da história ${id}`);

      const book = await Book.findById(id);
      if (!book) {
        logger.error(`[ERRO] História não encontrada: ${id}`);
        return res.status(404).json({ error: 'História não encontrada' });
      }

      const status = {
        id: book._id,
        title: book.title,
        status: book.status,
        pdfUrl: book.pdfUrl,
        hasImages: book.pages.every(page => page.imageUrl),
        pagesCount: book.pages.length,
        lastUpdated: book.updatedAt,
        errorMessage: book.errorMessage
      };

      logger.info(`[FIM] Status recuperado para história ${id}:`, status);
      return res.json(status);
    } catch (error) {
      logger.error('[ERRO] Erro ao verificar status:', error);
      return res.status(500).json({ error: 'Erro ao verificar status' });
    }
  }

  async retryPdfGeneration(req: Request, res: Response) {
    try {
      const { id } = req.params;
      logger.info(`[INÍCIO] Iniciando nova tentativa de geração de PDF para história ${id}`);

      const book = await this.storyService.retryPdfGeneration(id);

      logger.info(`[FIM] Nova geração de PDF concluída para história ${id}`);
      return res.json({
        message: 'PDF gerado com sucesso',
        book: {
          _id: book._id,
          status: book.status,
          pdfUrl: book.pdfUrl
        }
      });
    } catch (error) {
      logger.error('[ERRO] Erro ao tentar gerar PDF novamente:', error);
      return res.status(500).json({ error: 'Erro ao gerar PDF' });
    }
  }
}