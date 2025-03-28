// src/services/pdfGeneratorIntegration.ts
import { IBook } from '../models/Book';
import { logger } from '../utils/logger';
import { generatePDF } from './pdfGenerator';

/**
 * Função de integração que gera o PDF usando a versão corrigida
 */
export async function generateBookPDFWithFallback(book: IBook): Promise<string> {
  try {
    logger.info(`Iniciando geração de PDF para o livro "${book.title}"`, {
      bookId: book._id,
      title: book.title
    });
    
    // Gera o PDF
    const pdfUrl = await generatePDF(book);
    
    logger.info(`PDF gerado com sucesso: ${pdfUrl}`, {
      bookId: book._id,
      title: book.title
    });
    
    return pdfUrl;
  } catch (error) {
    logger.error(`Erro ao gerar PDF`, {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      bookId: book._id,
      title: book.title,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    throw error;
  }
}