import { Request, Response } from 'express';
import Book, { IBook } from '../models/Book';
import OpenAIService from '../services/openai';
import StoryGeneratorService from '../services/storyGenerator';
import { logger } from '../utils/logger';

export class BookController {
  public static async createBook(req: Request, res: Response): Promise<Response> {
    try {
      const { 
        title, 
        genre, 
        theme, 
        mainCharacter, 
        setting, 
        tone,
        ageRange,
        language = 'pt-BR'
      } = req.body;

      console.log('Dados recebidos para criação do livro:', req.body);

      // Validar dados de entrada
      const validationErrors: string[] = [];
      
      if (!title) validationErrors.push('Título é obrigatório');
      if (!genre) validationErrors.push('Gênero é obrigatório');
      if (!theme) validationErrors.push('Tema é obrigatório');
      if (!mainCharacter) validationErrors.push('Personagem principal é obrigatório');
      if (!setting) validationErrors.push('Cenário é obrigatório');
      if (!tone) validationErrors.push('Tom é obrigatório');
      if (!ageRange) validationErrors.push('Faixa etária é obrigatória');

      // Validar faixa etária
      const validAgeRanges: string[] = ['1-2', '3-4', '5-6', '7-8', '9-10', '11-12'];
      if (ageRange && !validAgeRanges.includes(ageRange)) {
        validationErrors.push(`Faixa etária inválida. Valores válidos: ${validAgeRanges.join(', ')}`);
      }

      if (validationErrors.length > 0) {
        return res.status(400).json({ 
          error: 'Dados inválidos', 
          details: validationErrors 
        });
      }

      // Gerar história usando o novo serviço
      const storyPrompt = `Crie uma história infantil com os seguintes elementos:
        - Título: ${title}
        - Gênero: ${genre}
        - Tema: ${theme}
        - Personagem Principal: ${mainCharacter}
        - Cenário: ${setting}
        - Tom: ${tone}
        - Idioma: ${language}
      `;

      let { story: storyText, wordCount } = await StoryGeneratorService.generateStory(
        storyPrompt, 
        ageRange
      );

      // Criar livro
      const book = new Book({
        title,
        userId: req.user?.id,
        genre,
        theme,
        mainCharacter,
        setting,
        tone,
        ageRange,
        pages: [],
        language
      });

      // Dividir história em páginas
      const paragraphs = storyText.split('\n\n').filter(p => p.trim() !== '');
      const pagesCount = Math.max(Math.ceil(paragraphs.length / 2), 3); // Mínimo 3 páginas

      for (let i = 0; i < pagesCount; i++) {
        const startIndex = i * 2;
        const endIndex = startIndex + 2;
        const pageText = paragraphs.slice(startIndex, endIndex).join('\n\n');

        try {
          const imagePrompt = `Ilustração para uma história infantil para ${ageRange} anos: ${pageText}`;
          const imageUrl = await OpenAIService.generateImage(imagePrompt);
          
          book.pages.push({
            text: pageText,
            pageNumber: i + 1,
            imageUrl
          });
        } catch (imageError) {
          logger.error(`Erro ao gerar imagem para página ${i + 1}: ${imageError.message}`);
          book.pages.push({
            text: pageText,
            pageNumber: i + 1,
            imageUrl: '/default-book-image.png'
          });
        }
      }

      // Salvar livro
      const savedBook = await book.save();

      if (!savedBook._id) {
        throw new Error('Erro ao salvar livro: ID não gerado');
      }

      logger.info(`Livro criado: ${savedBook.title} por usuário ${req.user?.id}`);

      // Buscar o livro recém-criado para garantir que todos os dados estão corretos
      const createdBook = await Book.findById(savedBook._id);

      if (!createdBook) {
        throw new Error('Erro ao recuperar livro após criação');
      }

      return res.status(201).json({
        message: 'Livro criado com sucesso',
        book: {
          _id: createdBook._id,
          title: createdBook.title,
          pages: createdBook.pages,
          userId: createdBook.userId,
          genre: createdBook.genre,
          theme: createdBook.theme,
          mainCharacter: createdBook.mainCharacter,
          setting: createdBook.setting,
          tone: createdBook.tone,
          ageRange: createdBook.ageRange,
          language: createdBook.language,
          wordCount,
          createdAt: createdBook.createdAt
        }
      });
    } catch (error) {
      logger.error(`Erro ao criar livro: ${error.message}`);
      return res.status(500).json({ 
        error: 'Erro ao criar livro', 
        details: error.message 
      });
    }
  }

  public static async getBooks(req: Request, res: Response): Promise<Response> {
    try {
      const books = await Book.find({ userId: req.user?.id })
        .select('title genre theme mainCharacter createdAt');

      return res.status(200).json(books);
    } catch (error) {
      logger.error(`Erro ao buscar livros: ${error.message}`);
      return res.status(500).json({ 
        error: 'Erro ao buscar livros', 
        details: error.message 
      });
    }
  }

  public static async getBook(req: Request, res: Response): Promise<Response> {
    try {
      const book = await Book.findOne({ 
        _id: req.params.id, 
        userId: req.user?.id 
      });

      if (!book) {
        return res.status(404).json({ error: 'Livro não encontrado' });
      }

      return res.status(200).json(book);
    } catch (error) {
      logger.error(`Erro ao buscar livro: ${error.message}`);
      return res.status(500).json({ 
        error: 'Erro ao buscar livro', 
        details: error.message 
      });
    }
  }

  public static async updateBook(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const book = await Book.findOneAndUpdate(
        { _id: id, userId: req.user?.id },
        updateData,
        { new: true }
      );

      if (!book) {
        return res.status(404).json({ error: 'Livro não encontrado' });
      }

      logger.info(`Livro atualizado: ${book.title}`);

      return res.status(200).json(book);
    } catch (error) {
      logger.error(`Erro ao atualizar livro: ${error.message}`);
      return res.status(500).json({ 
        error: 'Erro ao atualizar livro', 
        details: error.message 
      });
    }
  }

  public static async deleteBook(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      const book = await Book.findOneAndDelete({ 
        _id: id, 
        userId: req.user?.id 
      });

      if (!book) {
        return res.status(404).json({ error: 'Livro não encontrado' });
      }

      logger.info(`Livro deletado: ${book.title}`);

      return res.status(200).json({ 
        message: 'Livro deletado com sucesso',
        book: {
          id: book._id,
          title: book.title
        }
      });
    } catch (error) {
      logger.error(`Erro ao deletar livro: ${error.message}`);
      return res.status(500).json({ 
        error: 'Erro ao deletar livro', 
        details: error.message 
      });
    }
  }
}

export default BookController;