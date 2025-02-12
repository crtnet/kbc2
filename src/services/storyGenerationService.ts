import { Book } from '../models/Book';
import { PdfService } from './pdfService';
import logger from '../utils/logger';
import path from 'path';

export class StoryGenerationService {
  private pdfService: PdfService;

  constructor() {
    this.pdfService = new PdfService();
  }

  async generateStory(bookData: any) {
    try {
      logger.info('[INÍCIO] Iniciando processo completo de geração do livro');
      
      // Criar livro inicial
      const book = new Book(bookData);
      book.status = 'generating';
      await book.save();
      
      logger.info(`[PROCESSO] Livro inicial criado com ID: ${book._id}`);

      // ... seu código existente de geração de história e imagens ...

      // Após gerar todas as imagens
      logger.info('[PROCESSO] Todas as imagens foram geradas');
      
      // Atualizar status para generating_pdf
      book.status = 'generating_pdf';
      await book.save();
      logger.info('[PROCESSO] Status atualizado para generating_pdf');

      try {
        // Gerar PDF
        logger.info('[PROCESSO] Iniciando geração do PDF');
        const pdfFileName = `${book._id}.pdf`;
        const pdfPath = path.join(process.cwd(), 'pdfs', pdfFileName);
        
        await this.pdfService.generateBookPdf(book, pdfPath);
        logger.info(`[PROCESSO] PDF gerado com sucesso em: ${pdfPath}`);

        // Atualizar livro com URL do PDF
        book.pdfUrl = `/pdfs/${pdfFileName}`;
        book.status = 'completed';
        await book.save();
        logger.info('[PROCESSO] Livro atualizado com URL do PDF e status completed');

      } catch (pdfError) {
        logger.error('[ERRO] Erro na geração do PDF:', pdfError);
        book.status = 'error';
        book.errorMessage = 'Erro na geração do PDF';
        await book.save();
        throw pdfError;
      }

      logger.info(`[FIM] Processo completo finalizado com sucesso para livro ${book._id}`);
      return book;

    } catch (error) {
      logger.error('[ERRO] Erro no processo de geração:', error);
      throw error;
    }
  }

  async retryPdfGeneration(bookId: string) {
    try {
      logger.info(`[INÍCIO] Tentando gerar PDF novamente para livro ${bookId}`);
      
      const book = await Book.findById(bookId);
      if (!book) {
        throw new Error('Livro não encontrado');
      }

      book.status = 'generating_pdf';
      await book.save();
      
      const pdfFileName = `${book._id}.pdf`;
      const pdfPath = path.join(process.cwd(), 'pdfs', pdfFileName);
      
      await this.pdfService.generateBookPdf(book, pdfPath);
      
      book.pdfUrl = `/pdfs/${pdfFileName}`;
      book.status = 'completed';
      await book.save();
      
      logger.info(`[FIM] PDF gerado com sucesso em nova tentativa para livro ${bookId}`);
      return book;
    } catch (error) {
      logger.error('[ERRO] Erro ao tentar gerar PDF novamente:', error);
      throw error;
    }
  }
}