// src/controllers/bookController.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { logger } from '../utils/logger';
import { Book } from '../models/Book';
import { generateBookPDF } from '../services/pdfGenerator';
import { openaiUnifiedService } from '../services/openai.unified'; // <--- Usei a versão revisada
import { avatarService } from '../services/avatarService';
import { avatarFixService } from '../services/avatarFixService';
import { GenerateStoryParams } from '../services/storyFallback.service';
import { config } from '../config/config';
import { imageProcessor } from '../services/imageProcessor';

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
        environmentDescription // Ex: "floresta mágica com cogumelos coloridos..."
      } = req.body;

      // Validação de campos críticos
      if (!title || !genre || !theme || !mainCharacter || !setting || !tone) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: 'Campos obrigatórios ausentes'
        });
      }

      // Validação mais branda para avatar - se não tiver, usaremos um padrão
      let normalizedMainAvatar = mainCharacterAvatar;
      let normalizedSecondaryAvatar = secondaryCharacterAvatar;

      logger.info('Iniciando criação de novo livro', { title });

      // Validar e normalizar URLs dos avatares
      try {
        // Normaliza a URL do avatar principal (ou usa padrão)
        if (!mainCharacterAvatar) {
          logger.warn('Avatar principal não fornecido, usando padrão', { title });
          normalizedMainAvatar = avatarService.getDefaultAvatar(true);
        } else {
          try {
            normalizedMainAvatar = avatarService.normalizeAvatarUrl(mainCharacterAvatar, true);
            logger.info('URL do avatar principal normalizada com sucesso', { 
              original: mainCharacterAvatar,
              normalized: normalizedMainAvatar
            });
          } catch (e) {
            logger.error('Erro ao normalizar URL do avatar principal, usando padrão', { 
              error: e instanceof Error ? e.message : 'Erro desconhecido',
              url: mainCharacterAvatar
            });
            normalizedMainAvatar = avatarService.getDefaultAvatar(true);
          }
        }

        // Normaliza a URL do avatar secundário (se existir)
        if (secondaryCharacter && secondaryCharacterAvatar) {
          try {
            normalizedSecondaryAvatar = avatarService.normalizeAvatarUrl(secondaryCharacterAvatar, false);
            logger.info('URL do avatar secundário normalizada com sucesso', { 
              original: secondaryCharacterAvatar,
              normalized: normalizedSecondaryAvatar
            });
          } catch (e) {
            logger.error('Erro ao normalizar URL do avatar secundário, usando padrão', { 
              error: e instanceof Error ? e.message : 'Erro desconhecido',
              url: secondaryCharacterAvatar
            });
            normalizedSecondaryAvatar = avatarService.getDefaultAvatar(false);
          }
        } else if (secondaryCharacter) {
          // Se tem personagem secundário mas não tem avatar, usa padrão
          normalizedSecondaryAvatar = avatarService.getDefaultAvatar(false);
        }
        
        logger.info('URLs dos avatares processadas com sucesso', { 
          mainCharacterAvatar: normalizedMainAvatar,
          secondaryCharacterAvatar: normalizedSecondaryAvatar
        });
      } catch (avatarError) {
        logger.error('Erro ao normalizar URLs dos avatares, usando avatares padrão', { 
          error: avatarError instanceof Error ? avatarError.message : 'Erro desconhecido'
        });
        normalizedMainAvatar = avatarService.getDefaultAvatar(true);
        if (secondaryCharacter) {
          normalizedSecondaryAvatar = avatarService.getDefaultAvatar(false);
        }
      }

      // Monta parâmetros para geração da história com estilo fixo
      const storyParams: GenerateStoryParams = {
        title,
        genre,
        theme,
        mainCharacter,
        mainCharacterAvatar: normalizedMainAvatar,
        secondaryCharacter,
        secondaryCharacterAvatar: normalizedSecondaryAvatar,
        setting,
        tone,
        ageRange,
        // Parâmetros de estilo com descrições detalhadas
        styleGuide: {
          character: characterDescription || `${mainCharacter} é um personagem de livro infantil`,
          environment: environmentDescription || `${setting} é um ambiente colorido e acolhedor para crianças`,
          artisticStyle: "ilustração cartoon, cores vibrantes, traços suaves, estilo livro infantil"
        }
      };

      // Gera a história usando o serviço revisado
      const story = await openaiUnifiedService.generateStory(storyParams);
      const wordCount = story.split(/\s+/).length;
      const pages = this.splitStoryIntoPages(story);

      // Salva o livro no banco de dados
      const userId = new mongoose.Types.ObjectId(authReq.user.id);
      const newBook = new Book({
        title,
        genre,
        theme,
        mainCharacter,
        mainCharacterAvatar: normalizedMainAvatar,
        secondaryCharacter,
        secondaryCharacterAvatar: normalizedSecondaryAvatar,
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
          imageUrl: ''
        })),
        metadata: {
          wordCount,
          pageCount: pages.length,
        },
        status: 'processing',
        // **NOVO**: Armazena o estilo no modelo
        styleGuide: storyParams.styleGuide,
        // Armazena as descrições para uso futuro
        characterDescription: characterDescription || `${mainCharacter} é um personagem de livro infantil`,
        environmentDescription: environmentDescription || `${setting} é um ambiente colorido e acolhedor para crianças`
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
      // Processa avatares e prepara personagens
      logger.info('Iniciando processamento dos avatares para geração de imagens', { bookId });
      
      let characters = {
        main: {
          name: book.mainCharacter,
          avatarPath: book.mainCharacterAvatar, // Usa a URL original como fallback
          type: 'main' as 'main' | 'secondary'
        }
      };

      if (book.secondaryCharacter && book.secondaryCharacterAvatar) {
        characters.secondary = {
          name: book.secondaryCharacter,
          avatarPath: book.secondaryCharacterAvatar, // Usa a URL original como fallback
          type: 'secondary' as 'main' | 'secondary'
        };
      }

      try {
        // Verifica se os avatares são de CDNs confiáveis
        const isMainAvatarTrustedCDN = avatarService.isTrustedCDN(book.mainCharacterAvatar);
        const isSecondaryAvatarTrustedCDN = book.secondaryCharacterAvatar ? 
          avatarService.isTrustedCDN(book.secondaryCharacterAvatar) : false;
        
        logger.info('Verificação de CDNs confiáveis', { 
          mainIsTrustedCDN: isMainAvatarTrustedCDN,
          secondaryIsTrustedCDN: isSecondaryAvatarTrustedCDN
        });
        
        // Para o avatar principal
        if (isMainAvatarTrustedCDN) {
          logger.info('Avatar principal é de CDN confiável, usando diretamente', { 
            url: book.mainCharacterAvatar 
          });
          characters.main.avatarPath = book.mainCharacterAvatar;
        } else {
          try {
            // Tenta processar o avatar
            const mainAvatarPath = await avatarService.processAvatar(book.mainCharacterAvatar, `main_${bookId}`);
            characters.main.avatarPath = mainAvatarPath;
            logger.info('Avatar do personagem principal processado com sucesso', { 
              originalPath: book.mainCharacterAvatar,
              processedPath: mainAvatarPath
            });
          } catch (mainAvatarError) {
            logger.error('Erro ao processar avatar principal, usando padrão', {
              error: mainAvatarError instanceof Error ? mainAvatarError.message : 'Erro desconhecido'
            });
            // Usa um avatar padrão em caso de erro
            characters.main.avatarPath = `${config.avatarServer}/assets/avatars/default.png`;
          }
        }
        
        // Para o avatar secundário (se existir)
        if (book.secondaryCharacter && book.secondaryCharacterAvatar) {
          if (isSecondaryAvatarTrustedCDN) {
            logger.info('Avatar secundário é de CDN confiável, usando diretamente', { 
              url: book.secondaryCharacterAvatar 
            });
            characters.secondary.avatarPath = book.secondaryCharacterAvatar;
          } else {
            try {
              // Tenta processar o avatar
              const secondaryAvatarPath = await avatarService.processAvatar(book.secondaryCharacterAvatar, `secondary_${bookId}`);
              characters.secondary.avatarPath = secondaryAvatarPath;
              logger.info('Avatar do personagem secundário processado com sucesso', { 
                originalPath: book.secondaryCharacterAvatar,
                processedPath: secondaryAvatarPath
              });
            } catch (secondaryAvatarError) {
              logger.error('Erro ao processar avatar secundário, usando padrão', {
                error: secondaryAvatarError instanceof Error ? secondaryAvatarError.message : 'Erro desconhecido'
              });
              // Usa um avatar padrão em caso de erro
              characters.secondary.avatarPath = `${config.avatarServer}/assets/avatars/default_secondary.png`;
            }
          }
        }
        
        // Prepara descrições de personagens para uso na geração de imagens
        logger.info('Preparando descrições detalhadas dos personagens', { 
          mainCharacter: book.mainCharacter,
          hasSecondaryCharacter: !!book.secondaryCharacter
        });
        
        try {
          const mainCharacterDescription = await imageProcessor.prepareCharacterDescription({
            name: book.mainCharacter,
            avatarPath: characters.main.avatarPath,
            type: 'main'
          });
          
          let secondaryCharacterDescription = '';
          if (characters.secondary) {
            secondaryCharacterDescription = await imageProcessor.prepareCharacterDescription({
              name: book.secondaryCharacter,
              avatarPath: characters.secondary.avatarPath,
              type: 'secondary'
            });
          }
          
          // Adiciona as descrições ao styleGuide para uso na geração de imagens
          if (!book.styleGuide) {
            book.styleGuide = {
              character: book.characterDescription || mainCharacterDescription,
              environment: book.environmentDescription || `cenário de ${book.setting}`,
              artisticStyle: "ilustração cartoon, cores vibrantes, traços suaves, estilo livro infantil"
            };
          } else {
            // Aprimora a descrição existente com as informações processadas
            book.styleGuide.character = book.styleGuide.character || mainCharacterDescription;
            if (secondaryCharacterDescription) {
              book.styleGuide.character += '\n\n' + secondaryCharacterDescription;
            }
            // Garante que o estilo artístico está definido
            book.styleGuide.artisticStyle = book.styleGuide.artisticStyle || 
              "ilustração cartoon, cores vibrantes, traços suaves, estilo livro infantil";
          }
          
          logger.info('Descrições de personagens preparadas com sucesso', {
            mainDescriptionLength: mainCharacterDescription.length,
            hasSecondaryDescription: !!secondaryCharacterDescription
          });
        } catch (descriptionError) {
          logger.error('Erro ao preparar descrições dos personagens', {
            error: descriptionError instanceof Error ? descriptionError.message : 'Erro desconhecido',
            bookId
          });
          // Continua com as descrições básicas fornecidas pelo usuário
        }
      } catch (avatarError) {
        logger.error('Erro ao processar avatares, usando avatares padrão', {
          error: avatarError instanceof Error ? avatarError.message : 'Erro desconhecido',
          bookId
        });
        // Usa avatares padrão em caso de erro geral
        characters.main.avatarPath = `${config.avatarServer}/assets/avatars/default.png`;
        if (characters.secondary) {
          characters.secondary.avatarPath = `${config.avatarServer}/assets/avatars/default_secondary.png`;
        }
      }

      logger.info('Iniciando geração de imagens', { 
        bookId,
        mainAvatarPath: characters.main.avatarPath,
        hasSecondaryAvatar: !!characters.secondary
      });
      
      // Passa o styleGuide do livro para o serviço
      const imageUrls = await openaiUnifiedService.generateImagesForStory(pages, characters, book.styleGuide);
      
      // Atualiza as URLs das imagens no modelo
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
      
      // Marca as páginas sem imagens
      for (let i = 0; i < book.pages.length; i++) {
        if (!book.pages[i].imageUrl) {
          book.pages[i].imageUrl = '/assets/images/fallback-page.jpg';
        }
      }
      await book.save();
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