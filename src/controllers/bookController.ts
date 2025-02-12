import { Request, Response } from 'express';
import { BookService } from '../services/bookService';
import logger from '../utils/logger';

export class BookController {
  private bookService: BookService;

  constructor() {
    this.bookService = new BookService();
  }

  async getBook(req: Request, res: Response) {
    try {
      const { id } = req.params;
      logger.info(`[INÍCIO] Recebida requisição para buscar livro ${id}`);

      const book = await this.bookService.getBookWithDetails(id);

      // Se o livro foi encontrado mas ainda não tem PDF
      if (book.status === 'completed' && !book.pdfUrl) {
        logger.info(`[PROCESSO] Iniciando processamento pós-criação para livro ${id}`);
        const processedBook = await this.bookService.processBookAfterCreation(book);
        logger.info(`[FIM] Processamento pós-criação concluído para livro ${id}`);
        return res.json(processedBook);
      }

      logger.info(`[FIM] Retornando livro ${id}`);
      return res.json(book);

    } catch (error) {
      logger.error('[ERRO] Erro ao buscar/processar livro:', error);
      return res.status(500).json({ 
        error: 'Erro ao processar livro',
        message: error.message
      });
    }
  }

  // ... outros métodos do controlador ...
}