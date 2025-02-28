// src/controllers/bookController.ts

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { logger } from '../utils/logger';
import { Book } from '../models/Book';
import { generateBookPDF } from '../services/pdfGenerator';
import { openaiService } from '../services/openai.service';
import { avatarService } from '../services/avatarService';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    type: string;
    name?: string;
  };
}

class BookController {
  /**
   * GET /books
   * Lista livros do usuário autenticado
   */
  public listBooks = async (req: Request, res: Response) => {
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
      logger.error('Erro ao listar livros', { error: error.message });
      return res.status(500).json({
        error: 'Erro ao listar livros',
        details: error.message,
      });
    }
  };

  /**
   * GET /books/:bookId
   * Retorna dados de um livro específico do usuário
   */
  public getBook = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { bookId } = req.params;
      logger.info('getBook - Recebido bookId:', bookId);

      if (!mongoose.Types.ObjectId.isValid(bookId)) {
        logger.warn('ID inválido detectado:', bookId);
        return res.status(400).json({ error: 'ID de livro inválido' });
      }

      const userId = new mongoose.Types.ObjectId(authReq.user.id);

      // Garante que o livro pertença ao usuário
      const book = await Book.findOne({ _id: bookId, userId }).exec();
      if (!book) {
        logger.warn('Livro não encontrado ou não pertence ao usuário', { bookId });
        return res.status(404).json({ error: 'Livro não encontrado' });
      }

      logger.info('Livro obtido com sucesso', { bookId });
      return res.json({ data: book });
    } catch (error: any) {
      logger.error(`Erro ao obter livro ${req.params.bookId}`, { error: error.message });
      return res.status(500).json({ error: 'Erro ao obter livro' });
    }
  };

  /**
   * POST /books
   * Cria um novo livro para o usuário autenticado
   */
  public createBook = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const {
        title,
        genre,
        theme,
        mainCharacter,
        mainCharacterAvatar,
        secondaryCharacter = '',
        secondaryCharacterAvatar = '',
        setting,
        tone,
        ageRange,
        authorName,
        language = 'pt-BR'
      } = req.body;

      // Validação básica
      if (!title || !genre || !theme || !mainCharacter || !setting || !tone || !mainCharacterAvatar) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: 'Campos obrigatórios ausentes'
        });
      }

      // Validação específica para avatares
      if (!mainCharacterAvatar) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: 'Avatar do personagem principal é obrigatório'
        });
      }

      // Se tem personagem secundário, deve ter avatar
      if (secondaryCharacter && !secondaryCharacterAvatar) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: 'Avatar do personagem secundário é obrigatório quando há personagem secundário'
        });
      }

      // Monta prompt (opcional) - ou receba do frontend
      logger.info('Iniciando criação de novo livro', { title });

      // Gera a história usando openAIService
      const story = await openaiService.generateStory({
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
      });

      const wordCount = story.split(/\s+/).length;

      // Divide a história em páginas
      const pages = this.splitStoryIntoPages(story);

      // Monta objeto
      const userId = new mongoose.Types.ObjectId(authReq.user.id);
      const newBook = new Book({
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
        authorName,
        language,
        userId,
        prompt: req.body.prompt, // Usa o prompt fornecido pelo frontend
        pages: pages.map((text: string, index: number) => ({
          pageNumber: index + 1,
          text,
          imageUrl: ''
        })),
        metadata: {
          wordCount,
          pageCount: pages.length,
        },
        status: 'processing'
      });

      await newBook.save();
      logger.info('Livro salvo no banco de dados', { bookId: newBook._id });

      // Inicia geração de imagens e PDF em background
      this.generateImagesForBook(newBook._id.toString(), pages).catch(err => {
        logger.error('Erro ao gerar imagens para o livro', { bookId: newBook._id, error: err.message });
      });

      return res.status(201).json({
        message: 'Livro criado com sucesso, gerando imagens...',
        bookId: newBook._id,
        pages: newBook.pages.length
      });
    } catch (error: any) {
      logger.error('Erro ao criar livro', { error: error.message });
      return res.status(500).json({
        error: 'Erro no servidor ao criar o livro.',
        details: error.message
      });
    }
  };

  /**
   * GET /books/:bookId/pdf
   * Retorna o PDF do livro (verifica se pertence ao usuário)
   */
  public getPDF = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { bookId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(bookId)) {
        return res.status(400).json({ error: 'ID de livro inválido' });
      }

      const userId = new mongoose.Types.ObjectId(authReq.user.id);
      const book = await Book.findOne({ _id: bookId, userId }).exec();
      if (!book) {
        return res.status(404).json({ error: 'Livro não encontrado ou não pertence ao usuário' });
      }

      if (!book.pdfUrl) {
        return res.status(404).json({ error: 'PDF não gerado para este livro' });
      }

      const absolutePath = path.join(__dirname, '../../public', book.pdfUrl);
      return res.sendFile(absolutePath);
    } catch (error: any) {
      logger.error(`Erro ao obter PDF do livro ${req.params.bookId}`, { error: error.message });
      return res.status(500).json({ error: 'Erro ao obter PDF' });
    }
  };

  /**
   * Divide a história em páginas. Exemplo simples: ~100 palavras por página
   */
  private splitStoryIntoPages(story: string): string[] {
    // Remove espaços extras e normaliza quebras de linha
    const normalizedStory = story
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Divide em parágrafos, removendo linhas vazias
    const paragraphs = normalizedStory
      .split('\n\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    const pages: string[] = [];
    let currentPage = '';
    let currentWordCount = 0;
    const TARGET_WORDS_PER_PAGE = 100;

    for (const paragraph of paragraphs) {
      const paragraphWordCount = paragraph.split(/\s+/).length;

      // Se é uma página numerada explicitamente (ex: "Página 1:" ou "1.")
      if (paragraph.match(/^(página|page|\d+)[.:]/i)) {
        if (currentPage) {
          pages.push(currentPage.trim());
        }
        currentPage = paragraph;
        currentWordCount = paragraphWordCount;
        continue;
      }

      // Se adicionar este parágrafo excederia o limite de palavras
      if (currentWordCount + paragraphWordCount > TARGET_WORDS_PER_PAGE && currentPage) {
        pages.push(currentPage.trim());
        currentPage = paragraph;
        currentWordCount = paragraphWordCount;
      } else {
        currentPage = currentPage 
          ? currentPage + '\n\n' + paragraph 
          : paragraph;
        currentWordCount += paragraphWordCount;
      }
    }

    // Adiciona a última página se houver conteúdo
    if (currentPage) {
      pages.push(currentPage.trim());
    }

    // Garante que temos exatamente 5 páginas
    while (pages.length < 5) {
      // Divide a página mais longa
      const longestPageIndex = pages
        .map((page, index) => ({ index, length: page.split(/\s+/).length }))
        .reduce((max, curr) => curr.length > max.length ? curr : max)
        .index;

      const pageToSplit = pages[longestPageIndex];
      const paragraphsToSplit = pageToSplit.split('\n\n');
      
      if (paragraphsToSplit.length < 2) continue;

      const midPoint = Math.ceil(paragraphsToSplit.length / 2);
      const firstHalf = paragraphsToSplit.slice(0, midPoint).join('\n\n');
      const secondHalf = paragraphsToSplit.slice(midPoint).join('\n\n');

      pages.splice(longestPageIndex, 1, firstHalf, secondHalf);
    }

    // Se temos mais de 5 páginas, combina as menores
    while (pages.length > 5) {
      let shortestCombinedLength = Infinity;
      let shortestPair = [0, 1];

      // Encontra as duas páginas consecutivas que, juntas, têm o menor número de palavras
      for (let i = 0; i < pages.length - 1; i++) {
        const combinedLength = pages[i].split(/\s+/).length + pages[i + 1].split(/\s+/).length;
        if (combinedLength < shortestCombinedLength) {
          shortestCombinedLength = combinedLength;
          shortestPair = [i, i + 1];
        }
      }

      // Combina as duas páginas mais curtas
      const combinedPage = pages[shortestPair[0]] + '\n\n' + pages[shortestPair[1]];
      pages.splice(shortestPair[0], 2, combinedPage);
    }

    // Formata cada página para garantir consistência
    return pages.map((page, index) => {
      const pageNumber = index + 1;
      const formattedPage = page
        .split('\n\n')
        .map(p => p.trim())
        .filter(p => p.length > 0)
        .join('\n\n');

      // Remove qualquer numeração existente no início
      const cleanPage = formattedPage.replace(/^(página|page|\d+)[.:]\s*/i, '');

      return cleanPage;
    });
  }

  /**
   * Gera imagens para cada página e, em seguida, gera o PDF
   */
  private async generateImagesForBook(bookId: string, pages: string[]) {
    const book = await Book.findById(bookId);
    if (!book) throw new Error('Livro não encontrado');

    try {
      // Preparar os personagens com seus avatares usando avatarService
      logger.info('Iniciando processamento dos avatares para geração de imagens', { bookId });
      
      // Processando personagem principal
      const mainAvatarPath = await avatarService.processAvatar(book.mainCharacterAvatar, `main_${bookId}`);
      
      const characters = {
        main: {
          name: book.mainCharacter,
          avatarPath: mainAvatarPath
        }
      };

      if (book.secondaryCharacter && book.secondaryCharacterAvatar) {
        // Processando personagem secundário
        const secondaryAvatarPath = await avatarService.processAvatar(book.secondaryCharacterAvatar, `secondary_${bookId}`);
        
        characters.secondary = {
          name: book.secondaryCharacter,
          avatarPath: secondaryAvatarPath
        }
      }

      logger.info('Avatares processados com sucesso, iniciando geração de imagens', { bookId });
      
      // Usar o método aprimorado para gerar todas as imagens com base nos avatares
      const imageUrls = await openaiService.generateImagesForStory(pages, characters);
      
      // Atualizar as URLs das imagens no modelo
      for (let i = 0; i < imageUrls.length && i < book.pages.length; i++) {
        book.pages[i].imageUrl = imageUrls[i];
      }
      
      await book.save();
      logger.info('Todas as imagens do livro foram geradas com sucesso', {
        bookId,
        totalImages: imageUrls.length
      });
    } catch (error) {
      logger.error('Erro ao gerar imagens para o livro', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        bookId
      });
    } finally {
      // Gera PDF independentemente de erro nas imagens
      try {
        logger.info('Iniciando geração do PDF', { bookId });
        const pdfPath = await generateBookPDF(book);
        book.pdfUrl = pdfPath;
        book.status = 'completed';
        await book.save();
      } catch (pdfError) {
        logger.error('Erro ao gerar PDF', {
          error: pdfError instanceof Error ? pdfError.message : 'Erro desconhecido',
          bookId
        });
        book.status = 'error';
        await book.save();
      }
    }
  }
}

export default new BookController();