import { Request, Response } from 'express';
import { Book } from '../models/book.model';
import { openaiService } from '../services/openai.service';
import { logger } from '../utils/logger';

export const bookController = {
  async create(req: Request, res: Response) {
    try {
      const { title, genre, theme, mainCharacter, setting, tone } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'Usuário não autenticado' });
      }

      logger.info('Criando livro:', { title, genre, theme, mainCharacter, setting, tone, userId });

      // Criar o livro primeiro
      const book = new Book({
        title,
        genre,
        theme,
        mainCharacter,
        setting,
        tone,
        userId,
        status: 'generating',
      });

      await book.save();

      logger.info('Livro criado:', book._id);

      // Gerar o conteúdo em background
      this.generateBookContent(book._id, {
        title,
        genre,
        theme,
        mainCharacter,
        setting,
        tone,
      }).catch(error => {
        logger.error('Erro ao gerar conteúdo em background:', error);
      });

      return res.status(201).json({
        message: 'Livro criado com sucesso! O conteúdo está sendo gerado.',
        bookId: book._id,
      });
    } catch (error) {
      logger.error('Erro ao criar livro:', error);
      return res.status(500).json({ message: 'Erro ao criar livro' });
    }
  },

  async generateBookContent(bookId: string, params: {
    title: string;
    genre: string;
    theme: string;
    mainCharacter: string;
    setting: string;
    tone: string;
  }) {
    try {
      logger.info('Iniciando geração de conteúdo para o livro:', bookId);

      const story = await openaiService.generateStory(params);

      // Atualizar o livro com o conteúdo gerado
      await Book.findByIdAndUpdate(bookId, {
        content: story,
        status: 'completed',
      });

      logger.info('Conteúdo do livro gerado com sucesso:', bookId);
    } catch (error) {
      logger.error('Erro ao gerar conteúdo:', error);

      // Atualizar o status do livro para erro
      await Book.findByIdAndUpdate(bookId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  },

  async get(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'Usuário não autenticado' });
      }

      const book = await Book.findOne({ _id: id, userId });

      if (!book) {
        return res.status(404).json({ message: 'Livro não encontrado' });
      }

      return res.json(book);
    } catch (error) {
      logger.error('Erro ao buscar livro:', error);
      return res.status(500).json({ message: 'Erro ao buscar livro' });
    }
  },

  async list(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'Usuário não autenticado' });
      }

      const books = await Book.find({ userId });
      return res.json(books);
    } catch (error) {
      logger.error('Erro ao listar livros:', error);
      return res.status(500).json({ message: 'Erro ao listar livros' });
    }
  },
};