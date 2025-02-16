import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import storyGenerator from '../services/storyGenerator';
import openAIService from '../services/openai';
import { generateBookPDF } from '../services/pdfGenerator';
import { BookModel, IBook, AgeRange } from '../models/Book';

// Define uma interface para requisição autenticada (com user)
interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    type: string;
  };
}

class BookController {
  // Método para listar livros do usuário autenticado
  async listBooks(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      // Converte o id do usuário para ObjectId
      const userId = new mongoose.Types.ObjectId(authReq.user.id);
      const books = await BookModel.find({ userId }).sort({ 'metadata.createdAt': -1 }).exec();
      logger.info('Books fetched successfully', { count: books.length });
      return res.json(books);
    } catch (error: any) {
      logger.error('Erro ao listar livros', { error: error.message });
      return res.status(500).json({
        error: 'Erro ao listar livros',
        details: error.message,
      });
    }
  }

  async createBook(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        throw new Error('Usuário não autenticado');
      }
      
      const { 
        title, 
        prompt, 
        ageRange, 
        authorName,
        theme = 'default',
        language = 'pt-BR'
      } = req.body;

      logger.info('Iniciando criação de novo livro', { title, ageRange });

      // 1. Gerar história (note que se a API key não estiver correta, essa chamada retornará erro 401)
      const { story, wordCount } = await storyGenerator.generateStory(prompt, ageRange as AgeRange);
      logger.info('História gerada com sucesso', { wordCount, storySnippet: story.substring(0, 100) });

      if (!story || story.trim().length === 0 || wordCount < 10) {
        throw new Error('História gerada está vazia ou muito curta');
      }

      // 2. Dividir história em páginas
      const pages = this.splitStoryIntoPages(story);
      logger.info(`História dividida em ${pages.length} páginas`);

      if (pages.length === 0) {
        throw new Error('Falha ao dividir a história em páginas');
      }

      logger.info('Páginas geradas:', { pages });

      // 3. Criar livro no banco de dados (incluindo o userId convertido)
      const bookData: Partial<IBook> = {
        title,
        authorName,
        userId: new mongoose.Types.ObjectId(authReq.user.id),
        ageRange,
        theme,
        language,
        pages: pages.map((text, index) => ({
          pageNumber: index + 1,
          text,
          imageUrl: '' // Será preenchido posteriormente
        })),
        status: 'processing',
        metadata: {
          wordCount,
          pageCount: pages.length,
          createdAt: new Date(),
          lastModified: new Date()
        }
      };

      logger.info('Dados do livro a ser salvo:', { bookData });
      
      const book = new BookModel(bookData);
      await book.save();
      logger.info('Livro salvo no banco de dados', { bookId: book._id });

      // 4. Iniciar geração de imagens em background
      this.generateImagesForBook(book._id.toString(), pages).catch(error => {
        logger.error('Erro ao gerar imagens para o livro', { 
          bookId: book._id, 
          error: error.message 
        });
      });

      return res.status(201).json({ 
        message: 'Livro criado com sucesso, gerando imagens...',
        bookId: book._id,
        pages: book.pages.length
      });
    } catch (error: any) {
      logger.error('Erro ao criar livro', { error: error.message, stack: error.stack });
      return res.status(500).json({ 
        error: 'Erro no servidor ao criar o livro. Tente novamente mais tarde.',
        details: error.message 
      });
    }
  }

  private splitStoryIntoPages(story: string): string[] {
    const paragraphs = story.split('\n\n').filter(p => p.trim());
    const pages: string[] = [];
    let currentPage = '';

    for (const paragraph of paragraphs) {
      const tentativePage = currentPage ? currentPage + '\n\n' + paragraph : paragraph;
      if (tentativePage.split(' ').length > 100 && currentPage) {
        pages.push(currentPage);
        currentPage = paragraph;
      } else {
        currentPage = tentativePage;
      }
    }

    if (currentPage) {
      pages.push(currentPage);
    }

    return pages;
  }

  private async generateImagesForBook(bookId: string, pages: string[]) {
    try {
      const book = await BookModel.findById(bookId);
      if (!book) throw new Error('Livro não encontrado');

      for (let i = 0; i < pages.length; i++) {
        try {
          const pageText = pages[i];
          const prompt = `Ilustração para livro infantil: ${pageText.substring(0, 200)}`;
          
          logger.info(`Gerando imagem para página ${i + 1}`, { bookId });
          const imageUrl = await openAIService.generateImage(prompt);
          
          if (book.pages[i]) {
            book.pages[i].imageUrl = imageUrl;
            await book.save();
            logger.info(`Imagem gerada com sucesso para página ${i + 1}`, { bookId });
          } else {
            logger.warn(`Página ${i + 1} não encontrada no livro ${bookId}`);
          }
        } catch (error: any) {
          logger.error(`Erro ao gerar imagem para página ${i + 1}`, {
            bookId,
            error: error.message,
          });
        }
      }

      logger.info('Iniciando geração do PDF', { bookId });
      const pdfPath = await generateBookPDF(book);
      
      book.pdfUrl = pdfPath;
      book.status = 'completed';
      await book.save();
      
      logger.info('Livro finalizado com sucesso', { 
        bookId,
        pdfPath,
        status: 'completed',
      });
    } catch (error: any) {
      logger.error('Erro no processo de geração de imagens e PDF', {
        bookId,
        error: error.message,
      });
      
      const book = await BookModel.findById(bookId);
      if (book) {
        book.status = 'error';
        book.metadata.error = error.message;
        await book.save();
      }
    }
  }
}

export default new BookController();