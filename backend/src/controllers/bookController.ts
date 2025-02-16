// src/controllers/bookController.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import storyGenerator from '../services/storyGenerator';
import openAIService from '../services/openai';
import { generateBookPDF } from '../services/pdfGenerator';
import { Book, IBook, AgeRange } from '../models/Book'; // Importa o modelo "Book"

// Define uma interface para requisição autenticada (com user)
interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    type: string;
    name?: string;
  };
}

class BookController {
  // Método para listar livros do usuário autenticado
  listBooks = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const userId = new mongoose.Types.ObjectId(authReq.user.id);
      const books = await Book.find({ userId }).sort({ createdAt: -1 }).exec();
      logger.info('Books fetched successfully', { count: books.length });
      return res.json(books);
    } catch (error: any) {
      logger.error('Erro ao listar livros', { error: error.message, stack: error.stack });
      return res.status(500).json({
        error: 'Erro ao listar livros',
        details: error.message,
      });
    }
  };

  // Método para obter um livro pelo ID (rota GET /books/:id)
  getBook = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID de livro inválido' });
      }
      const book = await Book.findById(id).exec();
      if (!book) {
        return res.status(404).json({ error: 'Livro não encontrado' });
      }
      logger.info('Livro obtido com sucesso', { bookId: id });
      return res.json({ data: book });
    } catch (error: any) {
      logger.error(`Erro ao obter livro ${req.params.id}`, { error: error.message, stack: error.stack });
      return res.status(500).json({ error: 'Erro ao obter livro' });
    }
  };

  // Método para criar um novo livro
  createBook = async (req: Request, res: Response) => {
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
        genre,
        mainCharacter,
        setting,
        tone,
        theme = 'default',
        language = 'pt-BR'
      } = req.body;

      // Validação dos campos obrigatórios
      if (!title || !prompt || !ageRange || !authorName || !genre || !mainCharacter || !setting || !tone) {
        logger.error('Erro de validação: campos obrigatórios ausentes', { 
          title, prompt, ageRange, authorName, genre, mainCharacter, setting, tone 
        });
        return res.status(400).json({
          error: 'Dados inválidos',
          details: 'Os campos title, prompt, ageRange, authorName, genre, mainCharacter, setting e tone são obrigatórios.'
        });
      }

      logger.info('Iniciando criação de novo livro', { title, ageRange });
      logger.info('Iniciando geração de história com prompt', { prompt });

      // 1. Gerar história
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
      logger.debug('Páginas geradas:', { pages });
      
      // 3. Preparar os dados do livro
      const bookData: Partial<IBook> = {
        title,
        prompt,
        authorName,
        genre,
        mainCharacter,
        setting,
        tone,
        userId: new mongoose.Types.ObjectId(authReq.user.id),
        ageRange,
        theme,
        language,
        pages: pages.map((text, index) => ({
          pageNumber: index + 1,
          text,
          imageUrl: ''
        })),
        status: 'processing',
        metadata: {
          wordCount,
          pageCount: pages.length
        }
      };

      logger.info('Dados do livro a ser salvo:', { bookData: JSON.stringify(bookData, null, 2) });
      
      const book = new Book(bookData);
      try {
        await book.save();
        logger.info('Livro salvo no banco de dados', { bookId: book._id });
      } catch (saveError: any) {
        logger.error('Erro ao salvar livro', { 
          error: saveError.message, 
          stack: saveError.stack,
          errors: saveError.errors ? JSON.stringify(saveError.errors, null, 2) : undefined
        });
        console.error('Erro completo ao salvar livro:', saveError);
        throw saveError;
      }
      
      // 4. Iniciar a geração de imagens e PDF em background (processo não aguardado)
      this.generateImagesForBook(book._id.toString(), pages).catch(error => {
        logger.error('Erro ao gerar imagens para o livro', { 
          bookId: book._id, 
          error: error.message,
          stack: error.stack
        });
      });

      return res.status(201).json({ 
        message: 'Livro criado com sucesso, gerando imagens...',
        bookId: book._id,
        pages: book.pages.length
      });
    } catch (error: any) {
      logger.error('Erro ao criar livro', { 
        error: error.message, 
        stack: error.stack,
        errors: error.errors ? JSON.stringify(error.errors, null, 2) : undefined,
        requestBody: req.body
      });
      console.error('Erro completo no createBook:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ error: 'Erro de validação', details: error.message });
      }
      return res.status(500).json({ 
        error: 'Erro no servidor ao criar o livro. Tente novamente mais tarde.',
        details: error.message 
      });
    }
  };

  // Método privado para dividir a história em páginas (arrow function para preservar o this)
  splitStoryIntoPages = (story: string): string[] => {
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
  };

  // Método privado para gerar imagens para cada página e, em seguida, gerar o PDF
  generateImagesForBook = async (bookId: string, pages: string[]) => {
    try {
      const book = await Book.findById(bookId);
      if (!book) throw new Error('Livro não encontrado');

      for (let i = 0; i < pages.length; i++) {
        try {
          const pageText = pages[i];
          const imagePrompt = `Ilustração para livro infantil: ${pageText.substring(0, 200)}`;
          logger.info(`Gerando imagem para página ${i + 1}`, { bookId, prompt: imagePrompt });
          const imageUrl = await openAIService.generateImage(imagePrompt);
          if (book.pages[i]) {
            book.pages[i].imageUrl = imageUrl;
            await book.save();
            logger.info(`Imagem gerada com sucesso para página ${i + 1}`, { bookId, imageUrl });
          } else {
            logger.warn(`Página ${i + 1} não encontrada no livro ${bookId}`);
          }
        } catch (imgError: any) {
          logger.error(`Erro ao gerar imagem para página ${i + 1}`, { 
            bookId, 
            error: imgError.message,
            stack: imgError.stack
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
        status: 'completed'
      });
    } catch (error: any) {
      logger.error('Erro no processo de geração de imagens e PDF', { 
        bookId, 
        error: error.message,
        stack: error.stack
      });
      const book = await Book.findById(bookId);
      if (book) {
        book.status = 'error';
        book.metadata.error = error.message;
        await book.save();
      }
    }
  };
}

export default new BookController();