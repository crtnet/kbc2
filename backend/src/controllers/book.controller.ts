// src/controllers/book.controller.ts

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Book } from '../models/book.model';
import { openAIUnifiedService } from '../services/openai.unified';
import { logger } from '../utils/logger';

/**
 * Gera conteúdo (história) para o livro em background.
 * Atualiza o documento do livro com páginas, status etc.
 */
async function generateBookContent(bookId: string, params: {
  title: string;
  genre: string;
  theme: string;
  mainCharacter: string;
  mainCharacterAvatar: string;
  secondaryCharacter?: string;
  secondaryCharacterAvatar?: string;
  setting: string;
  tone: string;
  ageRange: string;
}) {
  try {
    logger.info(`Iniciando geração de conteúdo para o livro ${bookId}`);
    const startTime = Date.now();

    // Construir o prompt
    const prompt = `
      Crie uma história infantil divertida e envolvente com:
      - Título: ${params.title}
      - Gênero: ${params.genre}
      - Tema: ${params.theme}
      - Personagem Principal: ${params.mainCharacter}
      ${params.secondaryCharacter ? `- Personagem Secundário: ${params.secondaryCharacter}` : ''}
      - Cenário: ${params.setting}
      - Tom: ${params.tone}
      A história deve ser adequada para crianças de ${params.ageRange} anos.
    `;

    logger.info('Chamando openAIUnifiedService.generateStory com:', { prompt, ageRange: params.ageRange });
    const { story, wordCount } = await openAIUnifiedService.generateStory(prompt, params.ageRange as AgeRange);

    // Divide a história em ~5 páginas
    const words = story.split(/\s+/);
    const totalWords = words.length;
    const pages = [];
    const pagesCount = 5;
    const wordsPerPage = Math.ceil(totalWords / pagesCount);

    // Preparar informações dos personagens para geração de imagens
    const characters = {
      main: {
        name: params.mainCharacter,
        avatarPath: params.mainCharacterAvatar
      }
    };

    if (params.secondaryCharacter && params.secondaryCharacterAvatar) {
      characters.secondary = {
        name: params.secondaryCharacter,
        avatarPath: params.secondaryCharacterAvatar
      };
    }

    // Gerar páginas com imagens
    for (let i = 0; i < totalWords; i += wordsPerPage) {
      const pageText = words.slice(i, i + wordsPerPage).join(' ');
      const pageNumber = pages.length + 1;

      try {
        // Gerar prompt específico para a imagem da página
        const imagePrompt = `
          Crie uma ilustração para um livro infantil que represente a seguinte cena:
          ${pageText}
          
          Estilo da ilustração:
          - Colorida e vibrante
          - Estilo cartoon amigável
          - Adequada para crianças de ${params.ageRange} anos
          - Cenário: ${params.setting}
          - Tom: ${params.tone}
        `;

        // Gerar imagem com referências dos avatares
        const imageUrl = await openAIUnifiedService.generateImage(imagePrompt, characters);

        pages.push({
          text: pageText,
          pageNumber,
          imageUrl
        });

        logger.info(`Imagem gerada com sucesso para página ${pageNumber}`);
      } catch (error) {
        logger.error(`Erro ao gerar imagem para página ${pageNumber}:`, error);
        // Continua com a próxima página mesmo se houver erro
        pages.push({
          text: pageText,
          pageNumber,
          imageUrl: 'placeholder_image_url'
        });
      }
    }

    // Atualiza o livro no banco
    const updatedBook = await Book.findByIdAndUpdate(
      bookId,
      {
        content: story,
        wordCount,
        pages,
        status: 'completed',
        generationTime: Date.now() - startTime
      },
      { new: true }
    );

    if (!updatedBook) {
      throw new Error('Livro não encontrado após atualização');
    }

    logger.info(`Conteúdo do livro ${bookId} gerado com sucesso em ${(Date.now() - startTime) / 1000}s`);
    logger.info(`Estatísticas do livro ${bookId}: ${wordCount} palavras, ${pages.length} páginas`);

    return updatedBook;
  } catch (error) {
    logger.error(`Erro ao gerar conteúdo para livro ${bookId}:`, error);

    // Marca o livro como erro
    await Book.findByIdAndUpdate(bookId, {
      status: 'error',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });

    throw error;
  }
}

export const bookController = {
  /**
   * Cria um novo livro (POST /books)
   */
  async create(req: Request, res: Response) {
    try {
      // Pega dados do corpo
      const { 
        title, 
        genre, 
        theme, 
        mainCharacter, 
        mainCharacterAvatar,
        secondaryCharacter,
        secondaryCharacterAvatar,
        setting, 
        tone, 
        ageRange 
      } = req.body;
      
      // Usuário autenticado
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'Usuário não autenticado' });
      }

      logger.info('Dados recebidos para criação do livro:', {
        title,
        genre,
        theme,
        mainCharacter,
        hasMainAvatar: !!mainCharacterAvatar,
        secondaryCharacter,
        hasSecondaryAvatar: !!secondaryCharacterAvatar,
        setting,
        tone,
        ageRange,
        userId
      });

      // Validação de campos obrigatórios
      if (!title || !genre || !theme || !mainCharacter || !mainCharacterAvatar || !setting || !tone || !ageRange) {
        logger.warn('Campos obrigatórios ausentes na criação do livro');
        return res.status(400).json({
          message: 'Dados inválidos. Verifique se todos os campos obrigatórios estão preenchidos.'
        });
      }

      // Cria o documento inicial do livro
      const book = new Book({
        title,
        genre,
        theme,
        mainCharacter,
        mainCharacterAvatar,
        secondaryCharacter,
        secondaryCharacterAvatar,
        setting,
        tone,
        ageRange,
        userId,
        authorName: req.body.authorName || mainCharacter,
        status: 'processing',
        metadata: {
          wordCount: 0,
          pageCount: 0
        },
        pages: [{
          pageNumber: 1,
          text: 'Gerando história...',
          imageUrl: ''
        }]
      });

      await book.save();
      logger.info(`Livro criado com ID: ${book._id}`);

      // Gera o conteúdo em background
      generateBookContent(book._id.toString(), {
        title,
        genre,
        theme,
        mainCharacter,
        mainCharacterAvatar,
        secondaryCharacter,
        secondaryCharacterAvatar,
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

  /**
   * Gera conteúdo (história) para o livro em background.
   * Atualiza o documento do livro com páginas, status etc.
   */
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

      // Construir o prompt
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

      // Divide a história em ~5 páginas
      const words = story.split(/\s+/);
      const totalWords = words.length;
      const pages = [];
      const pagesCount = 5; // quantas páginas fixas você quer
      const wordsPerPage = Math.ceil(totalWords / pagesCount);

      for (let i = 0; i < totalWords; i += wordsPerPage) {
        const pageText = words.slice(i, i + wordsPerPage).join(' ');
        pages.push({
          text: pageText,
          pageNumber: pages.length + 1,
          imageUrl: 'placeholder_image_url'
        });
      }

      // Atualiza o livro no banco
      const updatedBook = await Book.findByIdAndUpdate(
        bookId,
        {
          content: story,
          wordCount,
          pages,
          status: 'completed', // finaliza
          generationTime: Date.now() - startTime
        },
        { new: true }
      );

      if (!updatedBook) {
        throw new Error('Livro não encontrado após atualização');
      }

      logger.info(`Conteúdo do livro ${bookId} gerado com sucesso em ${(Date.now() - startTime) / 1000}s`);
      logger.info(`Estatísticas do livro ${bookId}: ${wordCount} palavras, ${pages.length} páginas`);

      return updatedBook;
    } catch (error) {
      logger.error(`Erro ao gerar conteúdo para livro ${bookId}:`, error);

      // Marca o livro como erro
      await Book.findByIdAndUpdate(bookId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });

      throw error;
    }
  },

  /**
   * Obtém um livro (GET /books/:id)
   */
  async get(req: Request, res: Response) {
    try {
      const { id } = req.params;
      logger.info('bookController.get - Recebido id:', id);

      // Verifica se user está autenticado
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Usuário não autenticado' });
      }

      // Verifica se ID é válido
      if (!mongoose.Types.ObjectId.isValid(id)) {
        logger.warn('ID de livro inválido:', id);
        return res.status(400).json({ message: 'ID de livro inválido' });
      }

      // Busca o livro pertencente ao user
      const book = await Book.findOne({ _id: id, userId });

      if (!book) {
        return res.status(404).json({ message: 'Livro não encontrado' });
      }

      // Se estiver gerando
      if (book.status === 'generating') {
        return res.json({
          ...book.toObject(),
          message: 'O livro ainda está sendo gerado'
        });
      }

      // Se deu erro
      if (book.status === 'error') {
        return res.status(500).json({
          ...book.toObject(),
          message: 'Erro ao gerar o livro',
          error: book.error || 'Erro desconhecido'
        });
      }

      // Se está completo
      return res.json(book);
    } catch (error) {
      logger.error('Erro ao buscar livro:', error);
      return res.status(500).json({ 
        message: 'Erro ao buscar livro',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  },

  /**
   * Verifica status do livro (GET /books/:id/status)
   */
  async checkStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      logger.info('bookController.checkStatus - Recebido id:', id);

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Usuário não autenticado' });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        logger.warn('ID de livro inválido:', id);
        return res.status(400).json({ message: 'ID de livro inválido' });
      }

      const book = await Book.findOne({ _id: id, userId });
      if (!book) {
        return res.status(404).json({ message: 'Livro não encontrado' });
      }

      return res.json({
        status: book.status,
        progress: book.status === 'completed'
          ? 100
          : book.status === 'error'
          ? 0
          : 50,
        error: book.error,
        generationTime: book.generationTime
      });
    } catch (error) {
      logger.error('Erro ao verificar status do livro:', error);
      return res.status(500).json({ message: 'Erro ao verificar status do livro' });
    }
  },

  /**
   * Lista livros do usuário (GET /books)
   */
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