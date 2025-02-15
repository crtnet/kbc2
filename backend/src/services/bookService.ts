import { Book, IBook, AgeRange } from '../models/Book';
import { logger } from '../utils/logger';
import { openAIUnifiedService } from './openai.unified';
import { generateBookPDF } from './pdfGenerator';
import mongoose from 'mongoose';

interface CreateBookParams {
  title: string;
  prompt: string;
  ageRange: AgeRange;
  authorName: string;
  userId: string;
  theme?: string;
  language?: string;
}

class BookService {
  async createBook(params: CreateBookParams): Promise<IBook> {
    try {
      logger.info('Iniciando criação de livro:', { 
        title: params.title,
        ageRange: params.ageRange,
        userId: params.userId
      });

      // Validar conexão com o banco
      if (mongoose.connection.readyState !== 1) {
        throw new Error('Sem conexão com o banco de dados');
      }

      // Gerar história
      logger.info('Gerando história...');
      const { story, wordCount } = await openAIUnifiedService.generateStory(params.prompt, params.ageRange);
      logger.info('História gerada com sucesso', { wordCount });

      // Dividir em páginas
      const pages = this.splitStoryIntoPages(story);
      logger.info('História dividida em páginas', { pageCount: pages.length });

      // Criar livro
      const book = new Book({
        title: params.title,
        authorName: params.authorName,
        userId: params.userId,
        ageRange: params.ageRange,
        theme: params.theme || 'default',
        language: params.language || 'pt-BR',
        pages: pages.map((text, index) => ({
          pageNumber: index + 1,
          text,
          imageUrl: ''
        })),
        status: 'processing',
        metadata: {
          wordCount,
          pageCount: pages.length,
          createdAt: new Date(),
          lastModified: new Date()
        }
      });

      // Salvar livro
      logger.info('Salvando livro no banco de dados...');
      await book.save();
      logger.info('Livro salvo com sucesso', { bookId: book._id });

      // Iniciar geração de imagens em background
      this.generateImagesForBook(book._id.toString(), pages).catch(error => {
        logger.error('Erro ao gerar imagens:', error);
      });

      return book;
    } catch (error) {
      logger.error('Erro ao criar livro:', error);
      throw error;
    }
  }

  private splitStoryIntoPages(story: string): string[] {
    const paragraphs = story.split('\n\n').filter(p => p.trim());
    const pages: string[] = [];
    let currentPage = '';

    for (const paragraph of paragraphs) {
      if (currentPage && (currentPage + '\n\n' + paragraph).split(' ').length > 100) {
        pages.push(currentPage);
        currentPage = paragraph;
      } else {
        currentPage = currentPage ? currentPage + '\n\n' + paragraph : paragraph;
      }
    }

    if (currentPage) {
      pages.push(currentPage);
    }

    return pages;
  }

  private async generateImagesForBook(bookId: string, pages: string[]) {
    try {
      const book = await Book.findById(bookId);
      if (!book) throw new Error('Livro não encontrado');

      for (let i = 0; i < pages.length; i++) {
        try {
          const pageText = pages[i];
          const prompt = `Ilustração para livro infantil: ${pageText.substring(0, 200)}`;
          
          logger.info(`Gerando imagem para página ${i + 1}`, { bookId });
          const imageUrl = await openAIUnifiedService.generateImage(prompt);
          
          book.pages[i].imageUrl = imageUrl;
          await book.save();
          
          logger.info(`Imagem gerada com sucesso para página ${i + 1}`, { bookId });
        } catch (error) {
          logger.error(`Erro ao gerar imagem para página ${i + 1}:`, error);
        }
      }

      // Gerar PDF
      logger.info('Iniciando geração do PDF', { bookId });
      const pdfPath = await generateBookPDF(book);
      
      book.pdfUrl = pdfPath;
      book.status = 'completed';
      await book.save();
      
      logger.info('Livro finalizado com sucesso', { bookId, status: 'completed' });
    } catch (error) {
      logger.error('Erro no processo de geração de imagens e PDF:', error);
      
      const book = await Book.findById(bookId);
      if (book) {
        book.status = 'error';
        book.metadata.error = error instanceof Error ? error.message : 'Erro desconhecido';
        await book.save();
      }
    }
  }
}

export default new BookService();