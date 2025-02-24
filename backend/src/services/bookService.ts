import { Book, IBook } from '../models/Book';
import { logger } from '../utils/logger';
import { openAIUnifiedService } from './openai.unified';
import { generateBookPDF } from './pdfGenerator';
import mongoose from 'mongoose';
import { AgeRange } from '../types/book';
import { imageProcessor } from './imageProcessor';
import { avatarService } from './avatarService';
import { promises as fs } from 'fs';
import path from 'path';

interface CreateBookParams {
  title: string;
  prompt: string;
  ageRange: AgeRange;
  authorName: string;
  userId: string;
  theme?: string;
  language?: string;
  mainCharacter?: string;
  mainCharacterAvatar: string;
  secondaryCharacter?: string;
  secondaryCharacterAvatar?: string;
  setting?: string;
  tone?: string;
}

class BookService {
  async createBook(params: CreateBookParams): Promise<IBook> {
    const startTime = Date.now();
    const logContext = {
      title: params.title,
      ageRange: params.ageRange,
      mainCharacter: params.mainCharacter,
      secondaryCharacter: params.secondaryCharacter,
      requestId: `book_${Date.now()}`
    };

    logger.info('Iniciando criação de livro', logContext);

    try {
      // Validar parâmetros obrigatórios
      logger.info('Validando parâmetros', logContext);
      const requiredFields = [
        { name: 'title', value: params.title },
        { name: 'prompt', value: params.prompt },
        { name: 'ageRange', value: params.ageRange },
        { name: 'authorName', value: params.authorName },
        { name: 'userId', value: params.userId },
        { name: 'mainCharacterAvatar', value: params.mainCharacterAvatar }
      ];

      const missingFields = requiredFields
        .filter(field => !field.value)
        .map(field => field.name);

      if (missingFields.length > 0) {
        logger.error('Campos obrigatórios ausentes', {
          ...logContext,
          missingFields
        });
        throw new Error(`Campos obrigatórios ausentes: ${missingFields.join(', ')}`);
      }

      // Log detalhado dos parâmetros recebidos
      logger.info('Parâmetros recebidos:', {
        ...logContext,
        params: {
          title: params.title,
          prompt: params.prompt?.substring(0, 100) + '...',
          ageRange: params.ageRange,
          authorName: params.authorName,
          userId: params.userId,
          mainCharacter: params.mainCharacter,
          mainCharacterAvatar: params.mainCharacterAvatar,
          secondaryCharacter: params.secondaryCharacter,
          secondaryCharacterAvatar: params.secondaryCharacterAvatar,
          theme: params.theme,
          setting: params.setting,
          tone: params.tone,
          language: params.language
        }
      });

      // Processar avatares
      logger.info('Iniciando processamento de avatares', {
        ...logContext,
        mainAvatarSource: params.mainCharacterAvatar,
        secondaryAvatarSource: params.secondaryCharacterAvatar
      });

      try {
        // Processar avatar principal
        if (!params.mainCharacterAvatar) {
          throw new Error('Avatar do personagem principal é obrigatório');
        }

        logger.info('Processando avatar principal', {
          ...logContext,
          source: params.mainCharacterAvatar
        });

        const mainAvatarPath = await avatarService.processAvatar(
          params.mainCharacterAvatar,
          `main_${params.userId}`
        );

        if (!mainAvatarPath) {
          throw new Error('Falha ao processar avatar principal - caminho não retornado');
        }

        // Verificar se o arquivo foi criado
        try {
          await fs.access(mainAvatarPath);
          const stats = await fs.stat(mainAvatarPath);
          if (stats.size === 0) {
            throw new Error('Arquivo do avatar principal está vazio');
          }
          logger.info('Avatar principal processado e verificado', {
            ...logContext,
            path: mainAvatarPath,
            size: stats.size
          });
        } catch (error) {
          throw new Error(`Falha na verificação do avatar principal: ${error.message}`);
        }

        params.mainCharacterAvatar = mainAvatarPath;

        // Processar avatar secundário se existir
        if (params.secondaryCharacterAvatar) {
          logger.info('Processando avatar secundário', {
            ...logContext,
            source: params.secondaryCharacterAvatar
          });

          const secondaryAvatarPath = await avatarService.processAvatar(
            params.secondaryCharacterAvatar,
            `secondary_${params.userId}`
          );

          if (!secondaryAvatarPath) {
            logger.warn('Falha ao processar avatar secundário - continuando sem ele', logContext);
            params.secondaryCharacterAvatar = undefined;
          } else {
            // Verificar arquivo secundário
            try {
              await fs.access(secondaryAvatarPath);
              const stats = await fs.stat(secondaryAvatarPath);
              if (stats.size === 0) {
                throw new Error('Arquivo do avatar secundário está vazio');
              }
              logger.info('Avatar secundário processado e verificado', {
                ...logContext,
                path: secondaryAvatarPath,
                size: stats.size
              });
              params.secondaryCharacterAvatar = secondaryAvatarPath;
            } catch (error) {
              logger.warn('Falha na verificação do avatar secundário - continuando sem ele', {
                ...logContext,
                error: error.message
              });
              params.secondaryCharacterAvatar = undefined;
            }
          }
        }

        logger.info('Processamento de avatares concluído com sucesso', {
          ...logContext,
          mainAvatarPath: params.mainCharacterAvatar,
          secondaryAvatarPath: params.secondaryCharacterAvatar
        });
      } catch (error) {
        logger.error('Erro fatal no processamento de avatares', {
          ...logContext,
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          } : 'Erro desconhecido'
        });
        throw new Error(`Erro no processamento de avatares: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }

      // Gerar história
      logger.info('Iniciando geração de história via OpenAI...', logContext);
      const { story, wordCount } = await openAIUnifiedService.generateStory(params.prompt, params.ageRange);
      logger.info('História gerada com sucesso', { 
        ...logContext,
        wordCount,
        storyLength: story.length,
        storyPreview: story.substring(0, 100) + '...'
      });

      // Dividir em páginas
      logger.info('Dividindo história em páginas', logContext);
      const pages = this.splitStoryIntoPages(story);
      logger.info('História dividida com sucesso', {
        ...logContext,
        pageCount: pages.length,
        pagesPreview: pages.map(p => p.substring(0, 50) + '...')
      });

      // Criar livro
      logger.info('Criando documento do livro no MongoDB', logContext);
      const book = new Book({
        title: params.title,
        genre: params.theme || 'default',
        theme: params.theme || 'default',
        mainCharacter: params.mainCharacter || params.title,
        mainCharacterAvatar: params.mainCharacterAvatar,
        secondaryCharacter: params.secondaryCharacter || '',
        secondaryCharacterAvatar: params.secondaryCharacterAvatar || '',
        setting: params.setting || 'Mundo mágico',
        tone: params.tone || 'Alegre',
        prompt: params.prompt,
        pages: pages.map((text, index) => ({
          pageNumber: index + 1,
          text,
          imageUrl: ''
        })),
        ageRange: params.ageRange,
        authorName: params.authorName,
        userId: new mongoose.Types.ObjectId(params.userId), // Converter para ObjectId
        language: params.language || 'pt-BR',
        status: 'processing',
        metadata: {
          wordCount,
          pageCount: pages.length,
          createdAt: new Date(),
          lastModified: new Date()
        }
      });

      // Validar documento
      logger.info('Validando documento do livro', logContext);
      const validationError = book.validateSync();
      if (validationError) {
        const validationErrors = Object.values(validationError.errors).map(e => ({
          path: e.path,
          message: e.message
        }));
        
        logger.error('Erro de validação do documento', {
          ...logContext,
          validationErrors
        });
        throw validationError;
      }

      // Salvar livro
      logger.info('Salvando livro no MongoDB', logContext);
      try {
        await book.save();
        logger.info('Livro salvo com sucesso', { 
          ...logContext,
          bookId: book._id,
          timeTaken: Date.now() - startTime + 'ms'
        });
      } catch (error) {
        logger.error('Erro ao salvar livro no MongoDB', {
          ...logContext,
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack
          } : 'Erro desconhecido'
        });
        throw new Error(`Erro ao salvar livro no banco de dados: ${error.message}`);
      }

      // Iniciar geração de imagens em background
      logger.info('Iniciando processo de geração de imagens em background', {
        ...logContext,
        bookId: book._id
      });
      
      this.generateImagesForBook(book._id.toString(), pages).catch(error => {
        logger.error('Erro ao iniciar geração de imagens:', {
          ...logContext,
          bookId: book._id,
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          } : 'Erro desconhecido'
        });
      });

      return book;
    } catch (error: any) {
      const timeTaken = Date.now() - startTime;
      
      // Log detalhado do erro
      logger.error('Erro detalhado ao criar livro:', {
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: error.code, // Código de erro MongoDB
          validationErrors: error.errors, // Erros de validação Mongoose
          originalError: error.originalError // Erro original se houver
        },
        timeTaken: timeTaken + 'ms',
        params: {
          title: params.title,
          ageRange: params.ageRange,
          authorName: params.authorName,
          hasMainCharacterAvatar: !!params.mainCharacterAvatar,
          hasSecondaryCharacterAvatar: !!params.secondaryCharacterAvatar,
          mainCharacterAvatarPath: params.mainCharacterAvatar,
          secondaryCharacterAvatarPath: params.secondaryCharacterAvatar
        }
      });

      // Classificar e retornar erro apropriado
      if (error.name === 'ValidationError') {
        throw new Error(`Erro de validação: ${Object.values(error.errors).map(e => e.message).join(', ')}`);
      } else if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new Error(`Erro no banco de dados: ${error.message}`);
      } else if (error.message.includes('avatar')) {
        throw new Error(`Erro com os avatares: ${error.message}`);
      } else if (error.message.includes('apiKey')) {
        throw new Error('Erro de configuração do serviço OpenAI');
      } else {
        throw new Error(`Erro ao criar o livro: ${error.message}`);
      }
    }
  }

  private splitStoryIntoPages(story: string): string[] {
    const paragraphs = story.split('\n\n').filter(p => p.trim());
    const pages: string[] = [];
    let currentPage = '';

    for (const paragraph of paragraphs) {
      if (currentPage && (currentPage + '\n\n' + paragraph).split(' ').length > 100) {
        pages.push(currentPage);
        currentPage = paragraph;
      } else {
        currentPage = currentPage ? currentPage + '\n\n' + paragraph : paragraph;
      }
    }

    if (currentPage) {
      pages.push(currentPage);
    }

    return pages;
  }

  private async generateImagesForBook(bookId: string, pages: string[]) {
    const logContext = {
      bookId,
      requestId: `img_${Date.now()}`
    };

    try {
      logger.info('Iniciando geração de imagens para o livro', logContext);

      const book = await Book.findById(bookId);
      if (!book) {
        logger.error('Livro não encontrado', logContext);
        throw new Error('Livro não encontrado');
      }

      // Adicionar informações do livro ao contexto de log
      Object.assign(logContext, {
        title: book.title,
        mainCharacter: book.mainCharacter,
        secondaryCharacter: book.secondaryCharacter
      });

      // Preparar descrições dos personagens com imagens processadas
      logger.info('Preparando descrições dos personagens', logContext);
      
      let mainCharacterDescription = '';
      let secondaryCharacterDescription = '';
      
      try {
        logger.info('Processando avatar do personagem principal', {
          ...logContext,
          avatarPath: book.mainCharacterAvatar
        });

        if (book.mainCharacterAvatar) {
          mainCharacterDescription = await imageProcessor.prepareCharacterDescription({
            name: book.mainCharacter || 'personagem principal',
            avatarPath: book.mainCharacterAvatar,
            type: 'main'
          });
          logger.info('Avatar do personagem principal processado', logContext);
        }
        
        if (book.secondaryCharacterAvatar && book.secondaryCharacter) {
          logger.info('Processando avatar do personagem secundário', {
            ...logContext,
            avatarPath: book.secondaryCharacterAvatar
          });

          secondaryCharacterDescription = await imageProcessor.prepareCharacterDescription({
            name: book.secondaryCharacter,
            avatarPath: book.secondaryCharacterAvatar,
            type: 'secondary'
          });
          logger.info('Avatar do personagem secundário processado', logContext);
        }
      } catch (error) {
        logger.error('Erro ao processar avatares dos personagens', {
          ...logContext,
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          } : 'Erro desconhecido',
          mainAvatarPath: book.mainCharacterAvatar,
          secondaryAvatarPath: book.secondaryCharacterAvatar
        });
        throw new Error('Falha ao processar avatares dos personagens');
      }

      // Gerar imagens para cada página
      for (let i = 0; i < pages.length; i++) {
        const pageContext = {
          ...logContext,
          pageNumber: i + 1,
          totalPages: pages.length
        };

        try {
          const pageText = pages[i];
          logger.info('Gerando imagem para página', {
            ...pageContext,
            textPreview: pageText.substring(0, 100) + '...'
          });
          
          // Construir prompt detalhado
          const basePrompt = `Crie uma ilustração colorida e detalhada para um livro infantil que represente a seguinte cena: ${pageText.substring(0, 200)}. 
A ilustração deve ser em estilo cartoon, amigável e apropriada para crianças.`;
          
          const styleInstructions = `
A ilustração deve ter:
- Cores vibrantes e alegres
- Iluminação suave e acolhedora
- Cenário detalhado e contextualizado com a história
- Expressões faciais claras e emoções bem definidas
- Composição que mantenha os personagens facilmente reconhecíveis
- Estilo consistente com livros infantis modernos`;

          const prompt = `
${basePrompt}

${mainCharacterDescription}

${secondaryCharacterDescription}

${styleInstructions}

Importante:
- Mantenha os personagens exatamente como mostrados nas imagens de referência
- Adapte as poses e expressões mantendo a fidelidade visual
- Garanta que os personagens estejam bem integrados à cena
`.trim();

          logger.info('Enviando prompt para geração de imagem', {
            ...pageContext,
            promptLength: prompt.length
          });
          
          const imageUrl = await openAIUnifiedService.generateImage(prompt);
          logger.info('Imagem gerada com sucesso', {
            ...pageContext,
            imageUrl: imageUrl.substring(0, 100) + '...'
          });
          
          book.pages[i].imageUrl = imageUrl;
          await book.save();
          
          logger.info('Imagem salva no documento do livro', pageContext);
        } catch (error) {
          logger.error('Erro ao gerar imagem para página', {
            ...pageContext,
            error: error instanceof Error ? {
              name: error.name,
              message: error.message,
              stack: error.stack
            } : 'Erro desconhecido'
          });
        }
      }

      // Gerar PDF
      logger.info('Iniciando geração do PDF', logContext);
      try {
        const pdfPath = await generateBookPDF(book);
        logger.info('PDF gerado com sucesso', {
          ...logContext,
          pdfPath
        });
        
        book.pdfUrl = pdfPath;
        book.status = 'completed';
        await book.save();
        
        logger.info('Livro finalizado com sucesso', {
          ...logContext,
          status: 'completed'
        });
      } catch (error) {
        logger.error('Erro ao gerar PDF', {
          ...logContext,
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          } : 'Erro desconhecido'
        });
        throw error;
      }
    } catch (error) {
      logger.error('Erro fatal no processo de geração de imagens e PDF', {
        ...logContext,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Erro desconhecido'
      });
      
      // Atualizar status do livro para erro
      try {
        const book = await Book.findById(bookId);
        if (book) {
          book.status = 'error';
          book.metadata.error = error instanceof Error ? error.message : 'Erro desconhecido';
          await book.save();
          
          logger.info('Status do livro atualizado para error', logContext);
        }
      } catch (updateError) {
        logger.error('Erro ao atualizar status do livro para error', {
          ...logContext,
          error: updateError instanceof Error ? updateError.message : 'Erro desconhecido'
        });
      }

      // Propagar o erro para ser tratado pelo chamador
      throw error;
    }
  }
}

export default new BookService();