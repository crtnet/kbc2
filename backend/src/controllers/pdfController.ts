import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import PDFService from '../services/pdfService';
import Book from '../models/Book';

export class PDFController {
  public async generatePDF(req: Request, res: Response): Promise<void> {
    try {
      const bookId = req.params.bookId;
      logger.info(`Recebida requisição para gerar PDF do livro: ${bookId}`);

      // Buscar o livro no banco de dados
      const book = await Book.findById(bookId);
      if (!book) {
        logger.error(`Livro não encontrado: ${bookId}`);
        res.status(404).json({ error: 'Livro não encontrado' });
        return;
      }

      // Verificar se o usuário tem permissão para acessar o livro.
      // Supondo que req.user esteja definido (por exemplo, via middleware de autenticação).
      if (!req.user || book.userId.toString() !== req.user.id) {
        logger.error(`Usuário ${req.user?.id} não tem permissão para acessar o livro ${bookId}`);
        res.status(403).json({ error: 'Acesso não autorizado' });
        return;
      }

      // Gerar o PDF
      const { filepath } = await PDFService.generateBookPDF(book);

      // Atualizar o livro com a URL do PDF
      book.pdfUrl = filepath;
      await book.save();

      logger.info(`PDF gerado com sucesso: ${filepath}`);

      res.status(200).json({
        message: 'PDF gerado com sucesso',
        pdfUrl: filepath,
      });
    } catch (error: any) {
      logger.error(`Erro ao gerar PDF: ${error.message}`);
      res.status(500).json({
        error: 'Erro ao gerar PDF',
        details: error.message,
      });
    }
  }
}

export default new PDFController();