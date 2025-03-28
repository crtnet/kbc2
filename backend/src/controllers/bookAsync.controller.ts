import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Book } from '../models/Book';
import { AuthRequest } from '../interfaces/AuthRequest';
import { logger } from '../utils/logger';
import { avatarService } from '../services';
import { bookGenerationQueue } from '../queues/bookGeneration.queue';

/**
 * Controlador para criação assíncrona de livros
 * Esta implementação separa completamente o processo de inicialização
 * do processo de geração do conteúdo do livro
 */
export class BookAsyncController {
  /**
   * POST /api/books/async
   * Inicia o processo de criação de livro de forma assíncrona
   * Retorna imediatamente com o ID do livro e status "processing"
   */
  public createBookAsync = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      logger.info('Iniciando criação assíncrona de novo livro');

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
        characterDescription,
        environmentDescription
      } = req.body;

      // Validação de campos críticos
      if (!title || !genre || !theme || !mainCharacter || !setting || !tone) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: 'Campos obrigatórios ausentes'
        });
      }

      logger.info('Validação de dados concluída, criando registro inicial do livro', { title });

      // Processamento simplificado e robusto de avatares
      let normalizedMainAvatar;
      let normalizedSecondaryAvatar = '';

      try {
        // Processa avatar principal
        normalizedMainAvatar = avatarService.processAvatarUrl(mainCharacterAvatar, true);
        logger.info('Avatar principal processado com sucesso');

        // Processa avatar secundário, se existir
        if (secondaryCharacter) {
          normalizedSecondaryAvatar = avatarService.processAvatarUrl(secondaryCharacterAvatar, false);
          logger.info('Avatar secundário processado com sucesso');
        }
      } catch (avatarError) {
        logger.error('Erro no processamento de avatares, usando padrões', {
          error: avatarError instanceof Error ? avatarError.message : 'Erro desconhecido'
        });
        
        // Garante que mesmo em caso de erro, teremos avatares válidos
        normalizedMainAvatar = avatarService.getDefaultAvatarUrl(true);
        if (secondaryCharacter) {
          normalizedSecondaryAvatar = avatarService.getDefaultAvatarUrl(false);
        }
      }

      // Cria um livro inicial com status "processing"
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
        prompt: req.body.prompt,
        pages: [], // Inicialmente sem páginas
        metadata: {
          wordCount: 0,
          pageCount: 0,
          progress: 0,
          estimatedTimeRemaining: '10-15 minutos'
        },
        status: 'processing',
        styleGuide: {
          character: characterDescription || `${mainCharacter} é um personagem de livro infantil`,
          environment: environmentDescription || `${setting} é um ambiente colorido e acolhedor para crianças`,
          artisticStyle: "ilustração cartoon, cores vibrantes, traços suaves"
        },
        characterDescription: characterDescription || `${mainCharacter} é um personagem de livro infantil`,
        environmentDescription: environmentDescription || `${setting} é um ambiente colorido e acolhedor para crianças`
      });

      // Salva o livro inicial no banco de dados
      await newBook.save();
      logger.info('Livro inicial salvo no banco de dados', { bookId: newBook._id });

      // Responde imediatamente com o ID do livro antes de adicionar à fila
      // Isso garante que o cliente receba uma resposta rápida
      res.status(202).json({
        message: 'Livro iniciado com sucesso. O conteúdo está sendo gerado em segundo plano.',
        bookId: newBook._id,
        status: 'processing',
        estimatedTime: '10-15 minutos'
      });

      // Adiciona o trabalho à fila de processamento após responder ao cliente
      // Isso evita que problemas na fila afetem o tempo de resposta
      try {
        await bookGenerationQueue.add('generateBook', {
          bookId: newBook._id.toString(),
          bookData: req.body
        }, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 60000 // 1 minuto inicial, depois exponencial
          },
          timeout: 1800000 // 30 minutos de timeout para o job
        });

        logger.info('Trabalho de geração de livro adicionado à fila', { bookId: newBook._id });
      } catch (queueError) {
        // Registra o erro, mas não afeta a resposta ao cliente que já foi enviada
        logger.error('Erro ao adicionar trabalho à fila, mas o livro foi criado', { 
          error: queueError instanceof Error ? queueError.message : 'Erro desconhecido',
          bookId: newBook._id
        });
        
        // Atualiza o status do livro para indicar o problema
        await Book.findByIdAndUpdate(newBook._id, {
          'metadata.queueError': true,
          'metadata.queueErrorMessage': queueError instanceof Error ? queueError.message : 'Erro desconhecido'
        }).catch(updateError => {
          logger.error('Erro adicional ao atualizar status do livro após falha na fila', {
            error: updateError instanceof Error ? updateError.message : 'Erro desconhecido',
            bookId: newBook._id
          });
        });
      }

    } catch (error: any) {
      logger.error('Erro ao iniciar criação assíncrona de livro', { 
        error: error.message, 
        stack: error.stack 
      });
      
      return res.status(500).json({
        error: 'Erro no servidor ao iniciar a criação do livro.',
        details: error.message
      });
    }
  };

  /**
   * GET /api/books/:bookId/status
   * Verifica o status atual de um livro em processamento
   */
  public checkBookStatus = async (req: Request, res: Response) => {
    try {
      const { bookId } = req.params;
      
      if (!mongoose.Types.ObjectId.isValid(bookId)) {
        return res.status(400).json({ error: 'ID de livro inválido' });
      }
      
      // Definir um timeout para a consulta ao banco de dados
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout ao buscar livro no banco de dados')), 5000);
      });
      
      // Consulta ao banco de dados
      const bookPromise = Book.findById(bookId);
      
      // Usar Promise.race para implementar timeout
      let book;
      try {
        book = await Promise.race([bookPromise, timeoutPromise]) as any;
      } catch (timeoutError) {
        logger.warn(`Timeout ao buscar livro ${bookId} no banco de dados`);
        // Retornar uma resposta genérica em vez de erro
        return res.status(200).json({
          bookId: bookId,
          status: 'processing', // Assumimos que está em processamento
          progress: 50, // Valor médio para não alarmar o usuário
          pageCount: 0,
          estimatedTimeRemaining: 'alguns minutos',
          message: 'Seu livro está sendo processado. Por favor, aguarde.'
        });
      }
      
      if (!book) {
        return res.status(404).json({ error: 'Livro não encontrado' });
      }
      
      // Verifica se o usuário tem permissão para acessar este livro
      const authReq = req as AuthRequest;
      if (authReq.user && book.userId.toString() !== authReq.user.id) {
        return res.status(403).json({ error: 'Acesso negado a este livro' });
      }
      
      // Verifica se há erro na fila e atualiza a mensagem
      let statusMessage = this.getStatusMessage(book.status, book.metadata?.progress || 0);
      if (book.metadata?.queueError) {
        statusMessage = 'Houve um problema ao processar seu livro. Nossa equipe foi notificada e está trabalhando para resolver.';
      }
      
      // Retorna o status atual do livro
      return res.status(200).json({
        bookId: book._id,
        status: book.status,
        progress: book.metadata?.progress || 0,
        pageCount: book.metadata?.pageCount || 0,
        estimatedTimeRemaining: book.metadata?.estimatedTimeRemaining || 'desconhecido',
        message: statusMessage
      });
      
    } catch (error: any) {
      logger.error('Erro ao verificar status do livro', { 
        error: error.message, 
        stack: error.stack 
      });
      
      // Em caso de erro, retornamos uma resposta genérica em vez de erro
      // Isso evita que o frontend mostre mensagens de erro alarmantes ao usuário
      return res.status(200).json({
        bookId: req.params.bookId,
        status: 'processing',
        progress: 50,
        pageCount: 0,
        estimatedTimeRemaining: 'alguns minutos',
        message: 'Seu livro está sendo processado. Por favor, aguarde.'
      });
    }
  };

  /**
   * Gera uma mensagem amigável baseada no status e progresso
   */
  private getStatusMessage(status: string, progress: number): string {
    switch (status) {
      case 'processing':
        if (progress < 20) {
          return 'Iniciando a criação da sua história...';
        } else if (progress < 40) {
          return 'Desenvolvendo a narrativa e criando os personagens...';
        } else if (progress < 60) {
          return 'Criando as ilustrações para cada página...';
        } else if (progress < 80) {
          return 'Finalizando as ilustrações e formatando o livro...';
        } else {
          return 'Quase pronto! Finalizando os últimos detalhes...';
        }
      case 'generating_images':
        return 'Criando as ilustrações para cada página do seu livro...';
      case 'images_completed':
        return 'Imagens concluídas! Preparando para gerar o PDF...';
      case 'generating_pdf':
        return 'Gerando o PDF final do seu livro...';
      case 'completed':
        return 'Seu livro está pronto!';
      case 'failed':
        return 'Houve um problema na criação do seu livro. Por favor, tente novamente.';
      case 'error':
        return 'Ocorreu um erro durante o processamento. Nossa equipe foi notificada.';
      case 'images_error':
        return 'Houve um problema ao gerar as imagens. Tentando novamente...';
      default:
        return 'Processando seu livro...';
    }
  }
}

export const bookAsyncController = new BookAsyncController();