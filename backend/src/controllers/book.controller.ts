// src/controllers/book.controller.ts

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Book } from '../models/book.model';
import { openaiUnifiedService } from '../services/openai.unified';
import { logger } from '../utils/logger';
import { storyFallbackService } from '../services/storyFallback.service';

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
  prompt?: string;
  authorName?: string;
  characterDescription?: string;
  environmentDescription?: string;
}) {
  try {
    logger.info(`Iniciando geração de conteúdo para o livro ${bookId}`);
    const startTime = Date.now();

    // Atualiza o status do livro para processamento
    await Book.findByIdAndUpdate(bookId, { status: 'processing' });

    // Construir o prompt se não foi fornecido
    const prompt = params.prompt || `
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

    logger.info('Gerando história com prompt:', { 
      promptLength: prompt.length, 
      ageRange: params.ageRange 
    });

    // Gera a história
    let story = '';
    let wordCount = 0;
    
    try {
      const result = await openaiUnifiedService.generateStory({
        title: params.title,
        genre: params.genre,
        theme: params.theme,
        mainCharacter: params.mainCharacter,
        secondaryCharacter: params.secondaryCharacter,
        setting: params.setting,
        tone: params.tone,
        ageRange: params.ageRange,
        authorName: params.authorName || params.mainCharacter
      });
      
      story = result;
      wordCount = story.split(/\s+/).length;
      
      logger.info('História gerada com sucesso', { wordCount });
    } catch (storyError) {
      logger.error('Erro ao gerar história, usando fallback', {
        error: storyError instanceof Error ? storyError.message : 'Erro desconhecido'
      });
      
      // Usa o serviço de fallback para gerar uma história básica
      story = await storyFallbackService.generateFallbackStory({
        title: params.title,
        genre: params.genre,
        theme: params.theme,
        mainCharacter: params.mainCharacter,
        secondaryCharacter: params.secondaryCharacter,
        setting: params.setting,
        tone: params.tone,
        ageRange: params.ageRange
      });
      
      wordCount = story.split(/\s+/).length;
    }

    // Divide a história em ~5 páginas
    const storyPages = story.split('\n\n').filter(page => page.trim().length > 0);
    const pages = [];
    
    // Se não houver quebras de parágrafo claras, divide por palavras
    if (storyPages.length < 3) {
      const words = story.split(/\s+/);
      const totalWords = words.length;
      const pagesCount = 5;
      const wordsPerPage = Math.ceil(totalWords / pagesCount);
      
      for (let i = 0; i < totalWords; i += wordsPerPage) {
        const pageText = words.slice(i, i + wordsPerPage).join(' ');
        pages.push({
          text: pageText,
          pageNumber: pages.length + 1,
          imageUrl: ''
        });
      }
    } else {
      // Usa as quebras de parágrafo naturais
      for (let i = 0; i < storyPages.length; i++) {
        pages.push({
          text: storyPages[i],
          pageNumber: i + 1,
          imageUrl: ''
        });
      }
    }

    // Preparar informações dos personagens para geração de imagens
    const characters: any = {};
    
    // Verifica se o avatar principal é uma URL externa
    const isMainAvatarExternal = params.mainCharacterAvatar.startsWith('http://') || 
                                params.mainCharacterAvatar.startsWith('https://');
    
    if (isMainAvatarExternal) {
      logger.info('Avatar principal é uma URL externa', { 
        avatarUrl: params.mainCharacterAvatar 
      });
    }
    
    characters.main = {
      name: params.mainCharacter,
      avatarPath: params.mainCharacterAvatar
    };

    // Verifica se o avatar secundário é uma URL externa
    if (params.secondaryCharacter && params.secondaryCharacterAvatar) {
      const isSecondaryAvatarExternal = params.secondaryCharacterAvatar.startsWith('http://') || 
                                      params.secondaryCharacterAvatar.startsWith('https://');
      
      if (isSecondaryAvatarExternal) {
        logger.info('Avatar secundário é uma URL externa', { 
          avatarUrl: params.secondaryCharacterAvatar 
        });
      }
      
      characters.secondary = {
        name: params.secondaryCharacter,
        avatarPath: params.secondaryCharacterAvatar
      };
    }

    // Gerar imagens para cada página
    const updatedPages = [...pages];
    
    for (let i = 0; i < updatedPages.length; i++) {
      const page = updatedPages[i];
      
      try {
        // Atualiza o status do livro para mostrar progresso
        await Book.findByIdAndUpdate(bookId, { 
          status: 'processing',
          'metadata.progress': Math.floor((i / updatedPages.length) * 100)
        });
        
        // Construir prompt para geração de imagem com base nas descrições detalhadas
        const characterDescription = params.characterDescription || '';
        const environmentDescription = params.environmentDescription || '';
        
        // Cria um guia de estilo personalizado com as descrições fornecidas
        const customStyleGuide = {
          character: characterDescription,
          environment: environmentDescription,
          artisticStyle: "ilustração infantil vibrante com traços definidos e cores harmoniosas"
        };
        
        // Gerar prompt específico para a imagem da página
        const imagePrompt = `
          Crie uma ilustração para um livro infantil que represente a seguinte cena:
          ${page.text}
          
          Estilo da ilustração:
          - Colorida e vibrante
          - Estilo cartoon amigável
          - Adequada para crianças de ${params.ageRange} anos
          - Cenário: ${params.setting}
          - Ambiente: ${environmentDescription || params.setting}
          - Tom: ${params.tone}
        `;

        // Tenta gerar imagem com descrições textuais detalhadas dos avatares analisados
        try {
          logger.info('Gerando imagem com descrições textuais baseadas na análise dos avatares', {
            page: i + 1,
            hasCharacterDescription: !!characterDescription,
            hasEnvironmentDescription: !!environmentDescription,
          });
          
          const imageUrl = await openaiUnifiedService.generateImage(
            imagePrompt, 
            characters,
            page.text,
            i,
            updatedPages.length,
            customStyleGuide // Passa o guia de estilo personalizado
          );
          
          updatedPages[i].imageUrl = imageUrl;
          logger.info(`Imagem gerada com sucesso para página ${i + 1} usando descrições textuais dos avatares`);
          
          // Atualiza o livro com a página atual
          await Book.findByIdAndUpdate(bookId, {
            [`pages.${i}`]: updatedPages[i]
          });
        } catch (imageError) {
          logger.error(`Erro ao gerar imagem para página ${i + 1}:`, {
            error: imageError instanceof Error ? imageError.message : 'Erro desconhecido'
          });
          
          // Usa uma imagem de fallback
          updatedPages[i].imageUrl = await storyFallbackService.generateFallbackImage();
          
          // Atualiza o livro com a página atual usando imagem de fallback
          await Book.findByIdAndUpdate(bookId, {
            [`pages.${i}`]: updatedPages[i]
          });
        }
      } catch (pageError) {
        logger.error(`Erro ao processar página ${i + 1}:`, {
          error: pageError instanceof Error ? pageError.message : 'Erro desconhecido'
        });
        
        // Continua com a próxima página mesmo se houver erro
        updatedPages[i].imageUrl = 'https://placehold.co/600x400/orange/white?text=Imagem+Indisponível';
      }
    }

    // Atualiza o livro no banco com todas as informações
    const updatedBook = await Book.findByIdAndUpdate(
      bookId,
      {
        content: story,
        wordCount,
        pages: updatedPages,
        status: 'completed',
        generationTime: Date.now() - startTime,
        'metadata.wordCount': wordCount,
        'metadata.pageCount': updatedPages.length,
        'metadata.progress': 100
      },
      { new: true }
    );

    if (!updatedBook) {
      throw new Error('Livro não encontrado após atualização');
    }

    logger.info(`Conteúdo do livro ${bookId} gerado com sucesso em ${(Date.now() - startTime) / 1000}s`);
    logger.info(`Estatísticas do livro ${bookId}: ${wordCount} palavras, ${updatedPages.length} páginas`);

    return updatedBook;
  } catch (error) {
    logger.error(`Erro ao gerar conteúdo para livro ${bookId}:`, {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined
    });

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
        ageRange,
        prompt,
        authorName,
        language
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
        userId,
        promptLength: prompt?.length
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
        authorName: authorName || mainCharacter,
        language: language || 'pt-BR',
        prompt: prompt || '',
        // Adicionamos os campos de descrição dos personagens e ambiente
        characterDescription: req.body.characterDescription || '',
        environmentDescription: req.body.environmentDescription || '',
        status: 'processing',
        metadata: {
          wordCount: 0,
          pageCount: 0,
          progress: 0
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
        prompt,
        authorName,
        // Passar também as descrições detalhadas dos personagens e ambiente
        characterDescription: req.body.characterDescription,
        environmentDescription: req.body.environmentDescription
      }).catch(error => {
        logger.error(`Erro ao gerar conteúdo em background para livro ${book._id}:`, {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          stack: error instanceof Error ? error.stack : undefined
        });
      });

      return res.status(201).json({
        message: 'Livro criado com sucesso! O conteúdo está sendo gerado.',
        bookId: book._id,
      });
    } catch (error) {
      logger.error('Erro ao criar livro:', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });
      return res.status(500).json({ message: 'Erro ao criar livro' });
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
      if (book.status === 'processing') {
        return res.json({
          ...book.toObject(),
          message: 'O livro ainda está sendo gerado',
          progress: book.metadata?.progress || 0
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
          : book.metadata?.progress || 50,
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

      const books = await Book.find({ userId }).sort({ createdAt: -1 });
      return res.json(books);
    } catch (error) {
      logger.error('Erro ao listar livros:', error);
      return res.status(500).json({ message: 'Erro ao listar livros' });
    }
  },
};