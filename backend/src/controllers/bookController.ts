// src/controllers/bookController.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { logger } from '../utils/logger';
import { Book } from '../models/Book';
import { generateBookPDFWithFallback } from '../services/pdfGeneratorIntegration';
import { openaiUnifiedFixService } from '../services/openai.unified.fix'; // <--- Usando a versão corrigida
import { avatarService } from '../services/avatarService';
import { avatarFixService } from '../services/avatarFixService';
import { imageProcessor } from '../services/imageProcessor';
import { imageAnalysisService } from '../services/imageAnalysisService';
import { Character, GenerateStoryParams, StyleGuide } from '../types/book.types';

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
      const pages = this.splitStoryIntoPages(story);

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
        environmentDescription: finalEnvironmentDescription
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
      // Prepara personagens usando as descrições fornecidas pelo usuário
      logger.info(`Iniciando processamento das descrições dos personagens para geração de imagens do livro "${book.title}"`, { 
        bookId,
        title: book.title
      });
      
      let characters = {
        main: {
          name: book.mainCharacter,
          description: book.mainCharacterDescription,
          type: 'main' as 'main' | 'secondary'
        }
      };

      if (book.secondaryCharacter && book.secondaryCharacterDescription) {
        characters.secondary = {
          name: book.secondaryCharacter,
          description: book.secondaryCharacterDescription,
          type: 'secondary' as 'main' | 'secondary'
        };
      }

      // Prepara o guia de estilo para a geração de imagens
      if (!book.styleGuide) {
        book.styleGuide = {
          character: characters.main.description + 
            (characters.secondary ? `\n\n${characters.secondary.description}` : ''),
          environment: book.environmentDescription || `cenário de ${book.setting}`,
          artisticStyle: "ilustração cartoon, cores vibrantes, traços suaves, estilo livro infantil"
        };
      }

      logger.info(`Iniciando geração de imagens para o livro "${book.title}" (${pages.length} páginas)`, { 
        bookId,
        title: book.title,
        hasSecondaryCharacter: !!characters.secondary,
        hasStyleGuide: !!book.styleGuide,
        characterDescriptionLength: book.styleGuide?.character?.length || 0,
        environmentDescriptionLength: book.styleGuide?.environment?.length || 0,
        totalPages: pages.length
      });
      
      // Atualiza o status do livro para indicar que está gerando imagens
      book.status = 'generating_images';
      book.metadata = {
        ...book.metadata,
        currentPage: 0,
        totalPages: pages.length,
        lastUpdated: new Date()
      };
      await book.save();
      
      // Passa o styleGuide do livro para o serviço de geração de imagens
      const imageUrls = await openaiUnifiedFixService.generateImagesForStory(pages, characters, book.styleGuide);
      
      // Atualiza as URLs das imagens no modelo
      for (let i = 0; i < imageUrls.length && i < book.pages.length; i++) {
        book.pages[i].imageUrl = imageUrls[i];
        
        // Atualiza o progresso após cada imagem
        book.metadata = {
          ...book.metadata,
          currentPage: i + 1,
          lastUpdated: new Date()
        };
        await book.save();
        
        // Adiciona um pequeno atraso para garantir que o frontend possa receber as atualizações
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        logger.info(`Imagem ${i + 1}/${pages.length} salva para o livro "${book.title}"`, {
          bookId,
          pageNumber: i + 1,
          totalPages: pages.length,
          imageUrl: imageUrls[i].substring(0, 50) + '...'
        });
      }
      
      // Atualiza o status para indicar que todas as imagens foram geradas
      book.status = 'images_completed';
      book.metadata = {
        ...book.metadata,
        imagesCompleted: true,
        lastUpdated: new Date()
      };
      await book.save();
      
      // Adiciona um atraso antes de iniciar a geração do PDF para garantir que o frontend atualize o status
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      logger.info(`Todas as ${imageUrls.length} imagens do livro "${book.title}" foram geradas com sucesso`, {
        bookId,
        title: book.title,
        totalImages: imageUrls.length
      });
    } catch (error) {
      logger.error(`Erro ao gerar imagens para o livro "${book.title}"`, {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        bookId,
        title: book.title,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Marca as páginas sem imagens
      for (let i = 0; i < book.pages.length; i++) {
        if (!book.pages[i].imageUrl) {
          book.pages[i].imageUrl = '/assets/images/fallback-page.jpg';
        }
      }
      
      // Atualiza o status para indicar erro na geração de imagens
      book.status = 'images_error';
      book.metadata = {
        ...book.metadata,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        lastUpdated: new Date()
      };
      await book.save();
    } finally {
      // Gera PDF independentemente de erro nas imagens
      try {
        logger.info(`Iniciando geração do PDF para o livro "${book.title}"`, { 
          bookId,
          title: book.title
        });
        
        // Atualiza o status para indicar que está gerando o PDF
        book.status = 'generating_pdf';
        book.metadata = {
          ...book.metadata,
          pdfGenerationStarted: true,
          lastUpdated: new Date()
        };
        await book.save();
        
        // Verifica se todas as páginas têm imagens antes de gerar o PDF
        let allPagesHaveImages = true;
        for (const page of book.pages) {
          if (!page.imageUrl || page.imageUrl === '') {
            allPagesHaveImages = false;
            logger.warn(`Página ${page.pageNumber} do livro "${book.title}" não tem imagem`, {
              bookId,
              pageNumber: page.pageNumber
            });
          }
        }
        
        if (!allPagesHaveImages) {
          logger.warn(`Algumas páginas do livro "${book.title}" não têm imagens, usando fallback`, {
            bookId,
            title: book.title
          });
          
          // Adiciona imagens de fallback para páginas sem imagens
          for (let i = 0; i < book.pages.length; i++) {
            if (!book.pages[i].imageUrl || book.pages[i].imageUrl === '') {
              book.pages[i].imageUrl = '/assets/images/fallback-page.jpg';
              logger.info(`Imagem de fallback adicionada para página ${i + 1}`, {
                bookId,
                pageNumber: i + 1
              });
            }
          }
          await book.save();
        }
        
        // Implementa retry para geração do PDF
        let pdfPath = null;
        let pdfAttempts = 0;
        const MAX_PDF_ATTEMPTS = 3;
        
        // Importa a função de geração de PDF com fallback
        while (pdfAttempts < MAX_PDF_ATTEMPTS && !pdfPath) {
          try {
            logger.info(`Tentativa ${pdfAttempts + 1} de geração do PDF para o livro "${book.title}"`, {
              bookId,
              title: book.title,
              attempt: pdfAttempts + 1
            });
            
            // Usa a nova função de geração de PDF com fallback
            pdfPath = await generateBookPDFWithFallback(book);
            
            if (!pdfPath) {
              throw new Error('Caminho do PDF não retornado pelo gerador');
            }
            
            logger.info(`PDF gerado com sucesso na tentativa ${pdfAttempts + 1}`, {
              bookId,
              title: book.title,
              pdfPath
            });
          } catch (pdfGenError) {
            pdfAttempts++;
            logger.error(`Erro na tentativa ${pdfAttempts} de gerar PDF para o livro "${book.title}"`, {
              error: pdfGenError instanceof Error ? pdfGenError.message : 'Erro desconhecido',
              bookId,
              title: book.title,
              attempt: pdfAttempts,
              stack: pdfGenError instanceof Error ? pdfGenError.stack : undefined
            });
            
            if (pdfAttempts >= MAX_PDF_ATTEMPTS) {
              throw pdfGenError;
            }
            
            // Aguarda antes de tentar novamente
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
        
        // Verifica se o PDF foi gerado corretamente
        if (!pdfPath) {
          throw new Error('Falha em todas as tentativas de geração do PDF');
        }
        
        book.pdfUrl = pdfPath;
        book.status = 'completed';
        book.metadata = {
          ...book.metadata,
          pdfCompleted: true,
          lastUpdated: new Date()
        };
        await book.save();
        
        logger.info(`PDF gerado com sucesso para o livro "${book.title}"`, {
          bookId,
          title: book.title,
          pdfPath
        });
      } catch (pdfError) {
        logger.error(`Erro ao gerar PDF para o livro "${book.title}"`, {
          error: pdfError instanceof Error ? pdfError.message : 'Erro desconhecido',
          bookId,
          title: book.title,
          stack: pdfError instanceof Error ? pdfError.stack : undefined
        });
        
        // Log detalhado do erro
        logger.error('Erro completo ao gerar PDF', {
          error: pdfError,
          bookId,
          title: book.title,
          bookData: {
            pages: book.pages.map(p => ({
              pageNumber: p.pageNumber,
              hasText: !!p.text,
              textLength: p.text?.length || 0,
              hasImage: !!p.imageUrl,
              imageUrl: p.imageUrl
            }))
          }
        });
        
        book.status = 'error';
        book.metadata = {
          ...book.metadata,
          pdfError: pdfError instanceof Error ? pdfError.message : 'Erro desconhecido',
          lastUpdated: new Date()
        };
        await book.save();
      }
    }
  }
}

export default new BookController();