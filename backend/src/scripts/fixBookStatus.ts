/**
 * Script para corrigir o status dos livros existentes no banco de dados
 * Executa com: npx ts-node src/scripts/fixBookStatus.ts
 */

import mongoose from 'mongoose';
import { Book } from '../models/Book';
import { config } from '../config';
import { logger } from '../utils/logger';

async function fixBookStatus() {
  try {
    // Conecta ao banco de dados
    await mongoose.connect(config.database.url);
    logger.info('Conectado ao banco de dados');

    // Busca todos os livros
    const books = await Book.find({});
    logger.info(`Encontrados ${books.length} livros para verificação`);

    let updatedCount = 0;

    for (const book of books) {
      let needsUpdate = false;

      // Verifica se o status é um dos antigos
      if (['processing', 'generating', 'error'].includes(book.status)) {
        // Determina o novo status com base nas condições do livro
        let newStatus = book.status;

        if (book.status === 'processing') {
          if (book.pdfUrl) {
            newStatus = 'completed';
          } else if (book.pages.some(p => p.imageUrl)) {
            newStatus = 'images_completed';
          } else {
            newStatus = 'processing';
          }
        } else if (book.status === 'generating') {
          newStatus = 'generating_images';
        } else if (book.status === 'error') {
          // Mantém como erro, mas adiciona metadados
          book.metadata.error = 'Erro desconhecido durante o processamento';
        }

        if (newStatus !== book.status) {
          book.status = newStatus;
          needsUpdate = true;
        }
      }

      // Verifica se os metadados estão completos
      if (!book.metadata.totalPages) {
        book.metadata.totalPages = book.pages.length;
        needsUpdate = true;
      }

      if (!book.metadata.currentPage) {
        // Conta quantas páginas têm imagens
        const pagesWithImages = book.pages.filter(p => p.imageUrl).length;
        book.metadata.currentPage = pagesWithImages;
        needsUpdate = true;
      }

      if (book.metadata.currentPage === book.metadata.totalPages && !book.metadata.imagesCompleted) {
        book.metadata.imagesCompleted = true;
        needsUpdate = true;
      }

      if (book.pdfUrl && !book.metadata.pdfCompleted) {
        book.metadata.pdfCompleted = true;
        book.metadata.pdfGenerationStarted = true;
        needsUpdate = true;
      }

      if (!book.metadata.lastUpdated) {
        book.metadata.lastUpdated = book.updatedAt;
        needsUpdate = true;
      }

      // Salva as alterações se necessário
      if (needsUpdate) {
        await book.save();
        updatedCount++;
        logger.info(`Livro "${book.title}" (${book._id}) atualizado para status: ${book.status}`);
      }
    }

    logger.info(`Processo concluído. ${updatedCount} livros foram atualizados.`);
  } catch (error) {
    logger.error('Erro ao corrigir status dos livros:', error);
  } finally {
    // Desconecta do banco de dados
    await mongoose.disconnect();
    logger.info('Desconectado do banco de dados');
  }
}

// Executa a função principal
fixBookStatus();