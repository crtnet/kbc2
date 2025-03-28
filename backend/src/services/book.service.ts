import { Book, IBook } from '../models/Book';
import { logger } from '../utils/logger';
import { config } from '../config';
import mongoose from 'mongoose';
import { openaiUnifiedFixService } from './openai.unified.fix';
import { storyFallbackService } from './storyFallback.service';
import { GenerateStoryParams, Character, StyleGuide } from '../types/book.types';

/**
 * Serviço para operações relacionadas a livros
 */
class BookService {
  /**
   * Gera o conteúdo textual de um livro
   * @param bookData Dados do livro
   * @returns Conteúdo gerado para o livro
   */
  async generateBookContent(bookData: any): Promise<any> {
    try {
      logger.info('Iniciando geração de conteúdo para livro', {
        title: bookData.title,
        genre: bookData.genre
      });

      // Monta parâmetros para geração da história
      const storyParams: GenerateStoryParams = {
        title: bookData.title,
        genre: bookData.genre,
        theme: bookData.theme,
        mainCharacter: bookData.mainCharacter,
        mainCharacterDescription: bookData.characterDescription || '',
        environmentDescription: bookData.environmentDescription || '',
        ageRange: bookData.ageRange
      };

      // Gera a história usando o serviço de IA
      let story;
      try {
        story = await openaiUnifiedFixService.generateStory(storyParams);
      } catch (error) {
        logger.error('Erro ao gerar história com IA, usando fallback', {
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
        // Converte para o formato esperado pelo serviço de fallback
        const fallbackParams = {
          ...storyParams,
          secondaryCharacter: bookData.secondaryCharacter,
          secondaryCharacterDescription: bookData.secondaryCharacterDescription,
          setting: bookData.setting,
          tone: bookData.tone,
          authorName: bookData.authorName,
          styleGuide: {
            character: bookData.characterDescription || '',
            environment: bookData.environmentDescription || '',
            artisticStyle: "ilustração cartoon, cores vibrantes, traços suaves, estilo livro infantil"
          }
        };
        story = await storyFallbackService.generateFallbackStory(fallbackParams);
      }

      // Divide a história em páginas
      const storyPages = story.split('\n\n').filter(page => page.trim().length > 0);
      const pages = storyPages.map((text, index) => ({
        pageNumber: index,
        text,
        imageUrl: '', // Será preenchido na próxima etapa
        imageType: index === 0 ? 'cover' : 'fullPage'
      }));
      
      logger.info(`Conteúdo gerado com ${pages.length} páginas`);
      
      return {
        pages,
        metadata: {
          wordCount: story.split(/\s+/).length,
          pageCount: pages.length
        }
      };
    } catch (error) {
      logger.error('Erro ao gerar conteúdo do livro', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  /**
   * Gera ilustrações para um livro
   * @param bookId ID do livro
   * @param bookContent Conteúdo do livro
   * @returns Livro com ilustrações
   */
  async generateBookIllustrations(bookId: string, bookContent: any): Promise<any> {
    try {
      logger.info(`Iniciando geração de ilustrações para livro ${bookId}`);
      
      // Busca o livro no banco de dados
      const book = await Book.findById(bookId);
      if (!book) {
        throw new Error(`Livro com ID ${bookId} não encontrado`);
      }
      
      // Atualiza o status do livro
      book.status = 'generating_images';
      await book.save();
      
      // Prepara os personagens para geração de imagens
      const characters: { [key: string]: Character } = {
        main: {
          name: book.mainCharacter,
          description: book.mainCharacterDescription || '',
          role: 'protagonist'
        }
      };

      if (book.secondaryCharacter) {
        characters.secondary = {
          name: book.secondaryCharacter,
          description: book.secondaryCharacterDescription || '',
          role: 'supporting'
        };
      }

      // Prepara o guia de estilo
      const styleGuide: StyleGuide = {
        character: book.mainCharacterDescription || '',
        environment: book.environmentDescription || '',
        artisticStyle: "ilustração cartoon, cores vibrantes, traços suaves, estilo livro infantil",
        complexity: book.ageRange
      };

      // Gera as imagens usando o serviço de IA
      const imageUrls = await openaiUnifiedFixService.generateImagesForStory(
        bookContent.pages.map((page: any) => page.text),
        characters,
        styleGuide
      );
      
      // Atualiza as páginas com as URLs das imagens
      const pagesWithImages = bookContent.pages.map((page: any, index: number) => ({
        ...page,
        imageUrl: imageUrls[index] || ''
      }));
      
      // Atualiza o livro com as páginas e imagens
      await Book.findByIdAndUpdate(bookId, {
        pages: pagesWithImages,
        status: 'images_completed',
        'metadata.imagesCompleted': true
      });
      
      logger.info(`Ilustrações geradas para livro ${bookId}`);
      
      return {
        ...bookContent,
        pages: pagesWithImages
      };
    } catch (error) {
      logger.error(`Erro ao gerar ilustrações para livro ${bookId}`, {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Atualiza o status do livro para indicar erro
      try {
        await Book.findByIdAndUpdate(bookId, {
          status: 'images_error',
          'metadata.error': error instanceof Error ? error.message : 'Erro desconhecido'
        });
      } catch (updateError) {
        logger.error(`Erro adicional ao atualizar status do livro ${bookId}`, {
          error: updateError instanceof Error ? updateError.message : 'Erro desconhecido'
        });
      }
      
      throw error;
    }
  }

  /**
   * Finaliza a criação de um livro
   * @param bookId ID do livro
   * @param bookWithIllustrations Livro com ilustrações
   * @returns Livro finalizado
   */
  async finalizeBook(bookId: string, bookWithIllustrations: any): Promise<IBook> {
    try {
      logger.info(`Finalizando livro ${bookId}`);
      
      // Busca o livro no banco de dados
      const book = await Book.findById(bookId);
      if (!book) {
        throw new Error(`Livro com ID ${bookId} não encontrado`);
      }
      
      // Atualiza o status do livro
      book.status = 'generating_pdf';
      await book.save();
      
      // Simula a geração de PDF - em produção, usaria um serviço real
      const pdfUrl = `/public/pdfs/book-${bookId}.pdf`;
      
      // Atualiza o livro com o PDF e marca como concluído
      const updatedBook = await Book.findByIdAndUpdate(
        bookId,
        {
          pdfUrl,
          status: 'completed',
          'metadata.pdfCompleted': true,
          'metadata.pdfGenerationStarted': true
        },
        { new: true }
      );
      
      if (!updatedBook) {
        throw new Error(`Livro com ID ${bookId} não encontrado após atualização`);
      }
      
      logger.info(`Livro ${bookId} finalizado com sucesso`);
      
      return updatedBook;
    } catch (error) {
      logger.error(`Erro ao finalizar livro ${bookId}`, {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Atualiza o status do livro para indicar erro
      try {
        await Book.findByIdAndUpdate(bookId, {
          status: 'error',
          'metadata.pdfError': error instanceof Error ? error.message : 'Erro desconhecido'
        });
      } catch (updateError) {
        logger.error(`Erro adicional ao atualizar status do livro ${bookId}`, {
          error: updateError instanceof Error ? updateError.message : 'Erro desconhecido'
        });
      }
      
      throw error;
    }
  }

  /**
   * Busca um livro pelo ID
   * @param bookId ID do livro
   * @returns Livro encontrado ou null
   */
  async getBookById(bookId: string): Promise<IBook | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(bookId)) {
        throw new Error('ID de livro inválido');
      }
      
      return await Book.findById(bookId);
    } catch (error) {
      logger.error(`Erro ao buscar livro ${bookId}`, {
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      throw error;
    }
  }

  /**
   * Lista todos os livros de um usuário
   * @param userId ID do usuário
   * @returns Lista de livros
   */
  async getBooksByUserId(userId: string): Promise<IBook[]> {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('ID de usuário inválido');
      }
      
      return await Book.find({ userId: new mongoose.Types.ObjectId(userId) })
        .sort({ createdAt: -1 });
    } catch (error) {
      logger.error(`Erro ao listar livros do usuário ${userId}`, {
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      throw error;
    }
  }

  /**
   * Exclui um livro
   * @param bookId ID do livro
   * @param userId ID do usuário (para verificação de propriedade)
   * @returns true se excluído com sucesso
   */
  async deleteBook(bookId: string, userId: string): Promise<boolean> {
    try {
      if (!mongoose.Types.ObjectId.isValid(bookId)) {
        throw new Error('ID de livro inválido');
      }
      
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('ID de usuário inválido');
      }
      
      // Verifica se o livro pertence ao usuário
      const book = await Book.findOne({
        _id: new mongoose.Types.ObjectId(bookId),
        userId: new mongoose.Types.ObjectId(userId)
      });
      
      if (!book) {
        throw new Error('Livro não encontrado ou não pertence ao usuário');
      }
      
      // Exclui o livro
      await Book.deleteOne({ _id: new mongoose.Types.ObjectId(bookId) });
      
      logger.info(`Livro ${bookId} excluído com sucesso`);
      
      return true;
    } catch (error) {
      logger.error(`Erro ao excluir livro ${bookId}`, {
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      throw error;
    }
  }
}

export const bookService = new BookService();