// src/services/pdfGeneratorIntegration.ts
import { IBook } from '../models/Book';
import { logger } from '../utils/logger';
import { generateBookPDF } from './pdfGenerator';
import { generateBookPDFFixed } from './pdfGeneratorFix';

/**
 * Função de integração que tenta gerar o PDF usando a versão corrigida
 * e, em caso de falha, tenta a versão original como fallback
 */
export async function generateBookPDFWithFallback(book: IBook): Promise<string> {
  try {
    logger.info(`Iniciando geração de PDF com versão corrigida para o livro "${book.title}"`, {
      bookId: book._id,
      title: book.title
    });
    
    // Tenta gerar o PDF com a versão corrigida
    const pdfPath = await generateBookPDFFixed(book);
    
    logger.info(`PDF gerado com sucesso usando versão corrigida: ${pdfPath}`, {
      bookId: book._id,
      title: book.title
    });
    
    return pdfPath;
  } catch (error) {
    logger.error(`Erro ao gerar PDF com versão corrigida, tentando versão original`, {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      bookId: book._id,
      title: book.title,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    try {
      // Tenta gerar o PDF com a versão original como fallback
      const pdfPath = await generateBookPDF(book);
      
      logger.info(`PDF gerado com sucesso usando versão original: ${pdfPath}`, {
        bookId: book._id,
        title: book.title
      });
      
      return pdfPath;
    } catch (fallbackError) {
      logger.error(`Falha completa na geração do PDF`, {
        error: fallbackError instanceof Error ? fallbackError.message : 'Erro desconhecido',
        bookId: book._id,
        title: book.title,
        stack: fallbackError instanceof Error ? fallbackError.stack : undefined
      });
      
      throw fallbackError;
    }
  }
}