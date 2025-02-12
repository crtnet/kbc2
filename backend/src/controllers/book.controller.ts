import { Request, Response } from 'express';
import { Book } from '../models/book.model';
import { openAIUnifiedService } from '../services/openai.unified';
import { logger } from '../utils/logger';

export const bookController = {
  async create(req: Request, res: Response) {
    try {
      const { title, genre, theme, mainCharacter, setting, tone, ageRange } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'Usuário não autenticado' });
      }

      logger.info('Dados recebidos para criação do livro:', {
        title, genre, theme, mainCharacter, setting, tone, ageRange, userId
      });

      // Criar o livro primeiro
      const book = new Book({
        title,
        genre,
        theme,
        mainCharacter,
        setting,
        tone,
        ageRange,
        userId,
        status: 'generating',
      });

      await book.save();
      logger.info(`Livro criado com ID: ${book._id}`);

      // Gerar o conteúdo em background
      this.generateBookContent(book._id, {
        title,
        genre,
        theme,
        mainCharacter,
        setting,
        tone,
        ageRange,
      }).catch(error => {
        logger.error(`Erro ao gerar conteúdo em background para livro ${book._id}:`, error);
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
    ageRange: string;
  }) {
    try {
      logger.info(`Iniciando geração de conteúdo para o livro ${bookId}`);
      const startTime = Date.now();

      // Construir o prompt de forma estruturada
      const prompt = `
        Crie uma história infantil divertida e envolvente com:
        - Título: ${params.title}
        - Gênero: ${params.genre}
        - Tema: ${params.theme}
        - Personagem Principal: ${params.mainCharacter}
        - Cenário: ${params.setting}
        - Tom: ${params.tone}

        A história deve ser adequada para crianças de ${params.ageRange} anos.
      `;

      const { story, wordCount } = await openAIUnifiedService.generateStory(prompt, params.ageRange);

      // Dividir a história em páginas (aproximadamente 30-50 palavras por página)
      const words = story.split(/\s+/);
      const wordsPerPage = Math.ceil(wordCount / 5); // 5 páginas no total
      const pages = [];
      
      for (let i = 0; i < words.length; i += wordsPerPage) {
        const pageText = words.slice(i, i + wordsPerPage).join(' ');
        pages.push({
          text: pageText,
          pageNumber: pages.length + 1,
          imageUrl: 'placeholder_image_url' // Será substituído pela imagem gerada
        });
      }

      // Atualizar o livro com o conteúdo gerado
      const updatedBook = await Book.findByIdAndUpdate(
        bookId,
        {
          content: story,
          wordCount,
          pages,
          status: 'completed',
          generationTime: Date.now() - startTime
        },
        { new: true } // Retorna o documento atualizado
      );

      if (!updatedBook) {
        throw new Error('Livro não encontrado após atualização');
      }

      logger.info(`Conteúdo do livro ${bookId} gerado com sucesso em ${(Date.now() - startTime) / 1000}s`);
      logger.info(`Estatísticas do livro ${bookId}: ${wordCount} palavras, ${pages.length} páginas`);

      return updatedBook;
    } catch (error) {
      logger.error(`Erro ao gerar conteúdo para livro ${bookId}:`, error);

      // Atualizar o status do livro para erro
      await Book.findByIdAndUpdate(bookId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });

      throw error; // Propagar o erro para tratamento adequado
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

      // Se o livro ainda estiver gerando, verificar o status
      if (book.status === 'generating') {
        return res.json({
          ...book.toObject(),
          message: 'O livro ainda está sendo gerado'
        });
      }

      // Se houve erro na geração
      if (book.status === 'error') {
        return res.status(500).json({
          ...book.toObject(),
          message: 'Erro ao gerar o livro',
          error: book.error || 'Erro desconhecido'
        });
      }

      // Se está completo, retornar o livro
      return res.json(book);
    } catch (error) {
      logger.error('Erro ao buscar livro:', error);
      return res.status(500).json({ 
        message: 'Erro ao buscar livro',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  },

  async checkStatus(req: Request, res: Response) {
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

      return res.json({
        status: book.status,
        progress: book.status === 'completed' ? 100 : book.status === 'error' ? 0 : 50,
        error: book.error,
        generationTime: book.generationTime
      });
    } catch (error) {
      logger.error('Erro ao verificar status do livro:', error);
      return res.status(500).json({ message: 'Erro ao verificar status do livro' });
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