import { Book } from '../models/Book';
import { PdfService } from './pdfService';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs';

export class BookService {
  private pdfService: PdfService;

  constructor() {
    this.pdfService = new PdfService();
  }

  async processBookAfterCreation(book: any) {
    try {
      logger.info(`[INÍCIO] Iniciando processamento pós-criação do livro ${book._id}`);

      // 1. Verificar integridade das páginas
      logger.info(`[INÍCIO] Verificando integridade das páginas do livro ${book._id}`);
      const pagesValid = book.pages.every((page: any) => page.text && page.imageUrl);
      logger.info(`[FIM] Verificação de integridade das páginas: ${pagesValid ? 'OK' : 'Falha'}`);

      if (!pagesValid) {
        throw new Error('Páginas do livro incompletas');
      }

      // 2. Preparar diretório para PDF
      logger.info(`[INÍCIO] Preparando diretório para PDF do livro ${book._id}`);
      const pdfDir = path.join(process.cwd(), 'pdfs');
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }
      logger.info(`[FIM] Diretório para PDF preparado: ${pdfDir}`);

      // 3. Atualizar status do livro para geração de PDF
      logger.info(`[INÍCIO] Atualizando status do livro ${book._id} para generating_pdf`);
      book.status = 'generating_pdf';
      await book.save();
      logger.info(`[FIM] Status do livro atualizado para generating_pdf`);

      // 4. Iniciar geração do PDF
      logger.info(`[INÍCIO] Iniciando geração do PDF para livro ${book._id}`);
      const pdfPath = path.join('pdfs', `${book._id}.pdf`);
      await this.pdfService.generateBookPdf(book, pdfPath);
      logger.info(`[FIM] PDF gerado com sucesso em: ${pdfPath}`);

      // 5. Atualizar livro com URL do PDF
      logger.info(`[INÍCIO] Atualizando livro ${book._id} com URL do PDF`);
      book.pdfUrl = `/pdfs/${book._id}.pdf`;
      book.status = 'completed';
      await book.save();
      logger.info(`[FIM] Livro atualizado com URL do PDF e status completed`);

      // 6. Verificar se PDF foi gerado corretamente
      logger.info(`[INÍCIO] Verificando arquivo PDF gerado para livro ${book._id}`);
      const pdfExists = fs.existsSync(path.join(process.cwd(), pdfPath));
      if (!pdfExists) {
        throw new Error('PDF não encontrado após geração');
      }
      logger.info(`[FIM] Verificação do arquivo PDF: OK`);

      // 7. Preparar resposta para o cliente
      logger.info(`[INÍCIO] Preparando resposta final para livro ${book._id}`);
      const response = {
        _id: book._id,
        title: book.title,
        status: book.status,
        pdfUrl: book.pdfUrl,
        pagesCount: book.pages.length
      };
      logger.info(`[FIM] Resposta final preparada`);

      logger.info(`[FIM] Processamento pós-criação do livro ${book._id} concluído com sucesso`);
      return response;

    } catch (error) {
      logger.error(`[ERRO] Erro no processamento pós-criação do livro ${book._id}:`, error);
      
      // Atualizar status do livro para erro
      logger.info(`[INÍCIO] Atualizando status do livro ${book._id} para error`);
      book.status = 'error';
      book.errorMessage = error.message;
      await book.save();
      logger.info(`[FIM] Status do livro atualizado para error`);
      
      throw error;
    }
  }

  async getBookWithDetails(id: string) {
    try {
      logger.info(`[INÍCIO] Buscando livro com detalhes - ID: ${id}`);
      
      const book = await Book.findById(id);
      if (!book) {
        logger.error(`[ERRO] Livro não encontrado: ${id}`);
        throw new Error('Livro não encontrado');
      }
      
      logger.info(`[PROCESSO] Livro encontrado: ${book.title}`);
      
      // Se o livro estiver pronto mas sem PDF, iniciar processamento
      if (book.status === 'completed' && !book.pdfUrl) {
        logger.info(`[PROCESSO] Livro sem PDF, iniciando processamento`);
        return await this.processBookAfterCreation(book);
      }
      
      // Se o livro estiver em generating_pdf, verificar estado atual
      if (book.status === 'generating_pdf') {
        logger.info(`[PROCESSO] Verificando estado atual da geração do PDF`);
        const pdfPath = path.join('pdfs', `${book._id}.pdf`);
        const pdfExists = fs.existsSync(path.join(process.cwd(), pdfPath));
        
        if (pdfExists) {
          logger.info(`[PROCESSO] PDF encontrado, atualizando status`);
          book.pdfUrl = `/pdfs/${book._id}.pdf`;
          book.status = 'completed';
          await book.save();
        }
      }
      
      logger.info(`[FIM] Retornando livro com detalhes - ID: ${id}`);
      return book;
    } catch (error) {
      logger.error(`[ERRO] Erro ao buscar livro com detalhes:`, error);
      throw error;
    }
  }
}