// src/controllers/bookController.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { logger } from '../utils/logger';
import { Book } from '../models/Book';
import { generateBookPDFWithFallback } from '../services/pdfGeneratorIntegration';
import { OpenAIUnifiedFixService } from '../services/openai.unified.fix';
import { avatarService } from '../services/avatarService';
import { avatarFixService } from '../services/avatarFixService';
import { imageProcessor } from '../services/imageProcessor';
import { imageAnalysisService } from '../services/imageAnalysisService';
import { Character, GenerateStoryParams, StyleGuide } from '../types/book.types';
import { io } from '../server'; // Importando o socket.io do servidor
import { ageRangeConfigs } from '../config/ageRangeConfig';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    type: string;
    name?: string;
  };
}

const openaiUnifiedFixService = new OpenAIUnifiedFixService();

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

      // Extrai parâmetros obrigatórios
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
        language = 'pt-BR',
        // **NOVO**: Características do personagem e ambiente
        characterDescription, // Ex: "menina de 8 anos, cabelos cacheados vermelhos..."
        secondaryCharacterDescription = '',
        environmentDescription // Ex: "floresta mágica com cogumelos coloridos..."
      } = req.body;

      // Validação de campos críticos
      if (!title || !genre || !theme || !mainCharacter || !setting || !tone) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: 'Campos obrigatórios ausentes'
        });
      }
      
      // Usa as descrições fornecidas pelo frontend diretamente
      // Não tentamos mais analisar os avatares com o serviço de análise de imagens
      const finalCharacterDescription = characterDescription || 
        `${mainCharacter} é um personagem de livro infantil`;
      
      const finalSecondaryCharacterDescription = secondaryCharacterDescription || 
        (secondaryCharacter ? `${secondaryCharacter} é um personagem de livro infantil` : '');
      
      // Usa a descrição do ambiente fornecida ou gera uma básica
      const finalEnvironmentDescription = environmentDescription || 
        `${setting} é um ambiente colorido e acolhedor para crianças`;

      // Validação mais branda para avatar - se não tiver, usaremos um padrão
      let normalizedMainAvatar = mainCharacterAvatar;
      let normalizedSecondaryAvatar = secondaryCharacterAvatar;

      logger.info('Iniciando criação de novo livro', { title });

      // Validar e normalizar URLs dos avatares
      try {
        // Normaliza a URL do avatar principal (ou usa padrão)
        if (!mainCharacterAvatar) {
          logger.warn('Avatar principal não fornecido, usando padrão', { title });
          normalizedMainAvatar = avatarFixService.getDefaultAvatarUrl(true);
        } else {
          try {
            normalizedMainAvatar = avatarFixService.processAvatarUrl(mainCharacterAvatar, true);
            logger.info('URL do avatar principal normalizada com sucesso', { 
              original: mainCharacterAvatar,
              normalized: normalizedMainAvatar
            });
          } catch (e) {
            logger.error('Erro ao normalizar URL do avatar principal, usando padrão', { 
              error: e instanceof Error ? e.message : 'Erro desconhecido',
              url: mainCharacterAvatar
            });
            normalizedMainAvatar = avatarFixService.getDefaultAvatarUrl(true);
          }
        }

        // Normaliza a URL do avatar secundário (se existir)
        if (secondaryCharacter && secondaryCharacterAvatar) {
          try {
            normalizedSecondaryAvatar = avatarFixService.processAvatarUrl(secondaryCharacterAvatar, false);
            logger.info('URL do avatar secundário normalizada com sucesso', { 
              original: secondaryCharacterAvatar,
              normalized: normalizedSecondaryAvatar
            });
          } catch (e) {
            logger.error('Erro ao normalizar URL do avatar secundário, usando padrão', { 
              error: e instanceof Error ? e.message : 'Erro desconhecido',
              url: secondaryCharacterAvatar
            });
            normalizedSecondaryAvatar = avatarFixService.getDefaultAvatarUrl(false);
          }
        } else if (secondaryCharacter) {
          // Se tem personagem secundário mas não tem avatar, usa padrão
          normalizedSecondaryAvatar = avatarFixService.getDefaultAvatarUrl(false);
        }
        
        logger.info('URLs dos avatares processadas com sucesso', { 
          mainCharacterAvatar: normalizedMainAvatar,
          secondaryCharacterAvatar: normalizedSecondaryAvatar
        });
      } catch (avatarError) {
        logger.error('Erro ao normalizar URLs dos avatares, usando avatares padrão', { 
          error: avatarError instanceof Error ? avatarError.message : 'Erro desconhecido'
        });
        normalizedMainAvatar = avatarFixService.getDefaultAvatarUrl(true);
        if (secondaryCharacter) {
          normalizedSecondaryAvatar = avatarFixService.getDefaultAvatarUrl(false);
        }
      }

      // Monta parâmetros para geração da história com estilo fixo
      const storyParams: GenerateStoryParams = {
        title,
        genre,
        theme,
        mainCharacter,
        mainCharacterDescription: finalCharacterDescription,
        secondaryCharacter,
        secondaryCharacterDescription: finalSecondaryCharacterDescription,
        setting,
        tone,
        ageRange,
        // Parâmetros de estilo com descrições detalhadas
        styleGuide: {
          character: finalCharacterDescription + 
            (finalSecondaryCharacterDescription ? `\n\n${finalSecondaryCharacterDescription}` : ''),
          environment: finalEnvironmentDescription,
          artisticStyle: "ilustração cartoon, cores vibrantes, traços suaves, estilo livro infantil"
        }
      };

      // Gera a história usando o serviço revisado
      const story = await openaiUnifiedFixService.generateStory(storyParams);
      const wordCount = story.split(/\s+/).length;
      const pages = this.splitStoryIntoPages(story, ageRange);

      // Salva o livro no banco de dados
      const userId = new mongoose.Types.ObjectId(authReq.user.id);
      const newBook = new Book({
        title,
        genre,
        theme,
        mainCharacter,
        mainCharacterDescription: finalCharacterDescription,
        secondaryCharacter,
        secondaryCharacterDescription: finalSecondaryCharacterDescription,
        setting,
        tone,
        ageRange,
        authorName,
        language,
        userId,
        prompt: req.body.prompt, // Usa o prompt fornecido pelo frontend
        pages: pages.map((text, index) => ({
          pageNumber: index + 1,
          text,
          imageUrl: '',
          imageType: 'inlineImage',
          imagePosition: { x: 10, y: 10, width: 80, height: 60 }
        })),
        metadata: {
          wordCount,
          pageCount: pages.length,
          ageRange,
          complexity: ageRangeConfigs[ageRange].complexity
        },
        status: 'processing',
        // **NOVO**: Armazena o estilo no modelo
        styleGuide: storyParams.styleGuide,
        // Armazena as descrições para uso futuro
        environmentDescription: finalEnvironmentDescription
      });

      await newBook.save();
      logger.info('Livro salvo no banco de dados', { bookId: newBook._id });

      // Gera as imagens para o livro
      await this.generateImagesForBook(newBook._id, pages, ageRange);

      return res.status(201).json({
        message: 'Livro criado com sucesso, gerando imagens...',
        bookId: newBook._id,
        pageCount: pages.length
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
   * POST /books/:bookId/generate-pdf
   * Gera o PDF do livro (se o usuário for dono)
   */
  public generatePDF = async (req: Request, res: Response) => {
    try {
      const { bookId } = req.params;
      logger.info(`Recebida requisição para gerar PDF do livro: ${bookId}`);

      // Verifica se o usuário está autenticado
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Busca o livro no banco de dados
      const book = await Book.findOne({ _id: bookId, userId: authReq.user.id });
      if (!book) {
        return res.status(404).json({ error: 'Livro não encontrado ou não pertence ao usuário' });
      }

      // Gera o PDF
      const pdfPath = await generateBookPDFWithFallback(book);
      
      // Atualiza o livro com a URL do PDF
      await Book.findByIdAndUpdate(bookId, {
        pdfUrl: pdfPath,
        status: 'completed'
      });

      logger.info(`PDF gerado com sucesso: ${pdfPath}`);

      res.status(200).json({
        message: 'PDF gerado com sucesso',
        pdfUrl: pdfPath,
      });
    } catch (error: any) {
      logger.error(`Erro ao gerar PDF: ${error.message}`);
      res.status(500).json({
        error: 'Erro ao gerar PDF',
        details: error.message,
      });
    }
  };

  /**
   * Divide a história em páginas. Exemplo simples: ~100 palavras por página
   */
  private splitStoryIntoPages(story: string, ageRange: string): string[] {
    const config = ageRangeConfigs[ageRange];
    if (!config) {
      throw new Error('Faixa etária inválida');
    }

    const words = story.split(/\s+/);
    const pages: string[] = [];
    let currentPage: string[] = [];
    let currentWordCount = 0;
    let totalWordCount = 0;

    for (const word of words) {
      if (currentWordCount >= config.maxWordsPerPage) {
        pages.push(currentPage.join(' '));
        currentPage = [];
        currentWordCount = 0;
      }
      currentPage.push(word);
      currentWordCount++;
      totalWordCount++;
    }

    if (currentPage.length > 0) {
      pages.push(currentPage.join(' '));
    }

    // Verifica se o total de palavras está dentro dos limites
    if (totalWordCount < config.minWordsPerBook) {
      // Adiciona mais conteúdo para atingir o mínimo
      while (totalWordCount < config.minWordsPerBook) {
        const additionalContent = this.generateAdditionalContent(config.complexity);
        const additionalWords = additionalContent.split(/\s+/);
        currentPage = [];
        currentWordCount = 0;

        for (const word of additionalWords) {
          if (currentWordCount >= config.maxWordsPerPage) {
            pages.push(currentPage.join(' '));
            currentPage = [];
            currentWordCount = 0;
          }
          currentPage.push(word);
          currentWordCount++;
          totalWordCount++;
        }
      }

      if (currentPage.length > 0) {
        pages.push(currentPage.join(' '));
      }
    } else if (totalWordCount > config.maxWordsPerBook) {
      // Remove conteúdo para atingir o máximo
      while (totalWordCount > config.maxWordsPerBook && pages.length > 0) {
        const removedPage = pages.pop();
        if (removedPage) {
          totalWordCount -= removedPage.split(/\s+/).length;
        }
      }
    }

    // Garante que o número de páginas está dentro dos limites
    if (pages.length < config.minPages) {
      while (pages.length < config.minPages) {
        pages.push(this.generateAdditionalContent(config.complexity));
      }
    } else if (pages.length > config.maxPages) {
      pages.splice(config.maxPages);
    }

    return pages;
  }

  private generateAdditionalContent(complexity: string): string {
    const simpleContent = "O personagem continuou sua aventura.";
    const moderateContent = "O personagem encontrou novos amigos e juntos continuaram sua jornada.";
    const complexContent = "O personagem descobriu um novo mistério e precisou usar sua inteligência para resolvê-lo.";

    switch (complexity) {
      case 'very_simple':
      case 'simple':
        return simpleContent;
      case 'moderate':
        return moderateContent;
      case 'complex':
        return complexContent;
      default:
        return moderateContent;
    }
  }

  /**
   * Gera imagens para cada página e, em seguida, gera o PDF
   */
  private async generateImagesForBook(bookId: string, pages: string[], ageRange: string) {
    const config = ageRangeConfigs[ageRange];
    if (!config) {
      throw new Error('Faixa etária inválida');
    }

    const book = await Book.findById(bookId);
    if (!book) {
      throw new Error('Livro não encontrado');
    }

    // Gera a capa primeiro
    const coverPrompt = await openaiUnifiedFixService.generateImagePrompt({
      pageText: `Capa do livro "${book.title}" com ${book.mainCharacter} como personagem principal`,
      styleGuide: {
        character: book.mainCharacterDescription,
        environment: book.environmentDescription,
        artisticStyle: config.illustrationStyle
      },
      complexity: config.complexity,
      imageType: 'cover'
    });

    const coverImage = await openaiUnifiedFixService.generateImage(coverPrompt, 'cover');
    book.pages[0].imageUrl = coverImage;
    book.pages[0].imageType = 'cover';
    book.pages[0].imagePosition = { x: 0, y: 0, width: 100, height: 100 };

    // Distribui os tipos de imagem de acordo com a configuração
    const imageDistribution = [...Array(pages.length)].map((_, index) => {
      if (index === 0) return 'cover'; // Primeira página é sempre a capa
      
      // Calcula a distribuição de imagens
      const remainingImages = {
        fullPage: config.imageDistribution.fullPage,
        spreadPage: config.imageDistribution.spreadPage,
        inlineImage: config.imageDistribution.inlineImage
      };

      // Distribui as imagens de página inteira
      if (remainingImages.fullPage > 0 && index % 3 === 0) {
        remainingImages.fullPage--;
        return 'fullPage';
      }

      // Distribui as imagens de duas páginas
      if (remainingImages.spreadPage > 0 && index % 4 === 0 && index + 1 < pages.length) {
        remainingImages.spreadPage--;
        return 'spreadPage';
      }

      // Distribui as imagens inline
      if (remainingImages.inlineImage > 0) {
        remainingImages.inlineImage--;
        return 'inlineImage';
      }

      return 'inlineImage'; // Padrão para páginas restantes
    });

    // Gera prompts para cada página
    const imagePrompts = await Promise.all(
      pages.map(async (pageText, index) => {
        const imageType = imageDistribution[index];
        const prompt = await openaiUnifiedFixService.generateImagePrompt({
          pageText,
          styleGuide: {
            character: book.mainCharacterDescription,
            environment: book.environmentDescription,
            artisticStyle: config.illustrationStyle
          },
          complexity: config.complexity,
          imageType
        });

        return { prompt, imageType };
      })
    );

    // Gera imagens para cada página
    const images = await Promise.all(
      imagePrompts.map(async ({ prompt, imageType }) => {
        const imageUrl = await openaiUnifiedFixService.generateImage(prompt, imageType);
        return { imageUrl, imageType };
      })
    );

    // Atualiza o livro com as imagens
    book.pages = book.pages.map((page, index) => ({
      ...page,
      imageUrl: images[index].imageUrl,
      imageType: images[index].imageType,
      imagePosition: this.calculateImagePosition(images[index].imageType)
    }));

    await book.save();
  }

  private calculateImagePosition(imageType: string) {
    switch (imageType) {
      case 'cover':
        return { x: 0, y: 0, width: 100, height: 100 };
      case 'fullPage':
        return { x: 0, y: 0, width: 100, height: 100 };
      case 'spreadPage':
        return { x: 0, y: 0, width: 200, height: 100 };
      case 'inlineImage':
        return { x: 10, y: 10, width: 80, height: 60 };
      default:
        return { x: 10, y: 10, width: 80, height: 60 };
    }
  }

  /**
   * DELETE /books/:bookId
   * Exclui um livro específico do usuário
   */
  public deleteBook = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { bookId } = req.params;
      logger.info('deleteBook - Recebido bookId:', bookId);

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

      // Exclui o livro
      await Book.deleteOne({ _id: bookId, userId }).exec();

      logger.info('Livro excluído com sucesso', { bookId });
      return res.json({ message: 'Livro excluído com sucesso' });
    } catch (error: any) {
      logger.error(`Erro ao excluir livro ${req.params.bookId}`, { error: error.message });
      return res.status(500).json({ 
        error: 'Erro ao excluir livro',
        details: error.message
      });
    }
  };
}

export default new BookController();