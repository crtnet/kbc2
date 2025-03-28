import Queue, { Job } from 'bull';
import { Book } from '../models/Book';
import { logger } from '../utils/logger';
import { bookService } from '../services/book.service';
import { config } from '../config';

interface BookGenerationJobData {
  bookId: string;
  bookData: any; // TODO: Definir o tipo correto do bookData
}

// Cria a fila de processamento de livros com configuração simplificada
export const bookGenerationQueue = new Queue<BookGenerationJobData>('bookGeneration', {
  redis: config.redis
});

// Processa os trabalhos na fila
bookGenerationQueue.process('generateBook', async (job: Job<BookGenerationJobData>) => {
  const { bookId, bookData } = job.data;
  
  logger.info(`Iniciando processamento do livro ${bookId} na fila`);
  
  try {
    // Atualiza o progresso para 10%
    await updateBookProgress(bookId, 10, '10-12 minutos');
    
    // Gera o conteúdo do livro (texto)
    logger.info(`Gerando conteúdo textual para o livro ${bookId}`);
    const bookContent = await bookService.generateBookContent(bookData);
    
    // Atualiza o progresso para 40%
    await updateBookProgress(bookId, 40, '6-8 minutos');
    
    // Gera as ilustrações para o livro
    logger.info(`Gerando ilustrações para o livro ${bookId}`);
    const bookWithIllustrations = await bookService.generateBookIllustrations(bookId, bookContent);
    
    // Atualiza o progresso para 80%
    await updateBookProgress(bookId, 80, '2-3 minutos');
    
    // Finaliza o livro
    logger.info(`Finalizando o livro ${bookId}`);
    await bookService.finalizeBook(bookId, bookWithIllustrations);
    
    // Marca o livro como concluído
    await Book.findByIdAndUpdate(bookId, {
      status: 'completed',
      'metadata.progress': 100,
      'metadata.estimatedTimeRemaining': '0 minutos'
    });
    
    logger.info(`Livro ${bookId} processado com sucesso`);
    return { success: true, bookId };
    
  } catch (error) {
    logger.error(`Erro ao processar livro ${bookId} na fila`, {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Marca o livro como falho
    try {
      await Book.findByIdAndUpdate(bookId, {
        status: 'failed',
        'metadata.error': error instanceof Error ? error.message : 'Erro desconhecido'
      });
      logger.info(`Status do livro ${bookId} atualizado para 'failed'`);
    } catch (updateError) {
      logger.error(`Erro adicional ao atualizar status do livro ${bookId} para 'failed'`, {
        error: updateError instanceof Error ? updateError.message : 'Erro desconhecido'
      });
    }
    
    // Propaga o erro para que o Bull possa tentar novamente
    throw error;
  }
});

// Função auxiliar para atualizar o progresso do livro
async function updateBookProgress(bookId: string, progress: number, estimatedTime: string) {
  try {
    await Book.findByIdAndUpdate(bookId, {
      'metadata.progress': progress,
      'metadata.estimatedTimeRemaining': estimatedTime
    });
    
    logger.info(`Progresso do livro ${bookId} atualizado para ${progress}%`);
  } catch (error) {
    logger.error(`Erro ao atualizar progresso do livro ${bookId}`, {
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
    // Não propaga o erro para não interromper o fluxo principal
  }
}

// Eventos da fila
bookGenerationQueue.on('completed', (job: Job<BookGenerationJobData>) => {
  logger.info(`Job ${job.id} concluído com sucesso`, { bookId: job.data.bookId });
});

bookGenerationQueue.on('failed', (job: Job<BookGenerationJobData>, error: Error) => {
  logger.error(`Job ${job.id} falhou`, { 
    bookId: job.data.bookId,
    error: error.message,
    stack: error.stack
  });
  
  // Tenta atualizar o livro para indicar a falha
  Book.findByIdAndUpdate(job.data.bookId, {
    status: 'failed',
    'metadata.error': error.message,
    'metadata.failedAt': new Date()
  }).catch(updateError => {
    logger.error(`Erro adicional ao atualizar status do livro ${job.data.bookId} após falha do job`, {
      error: updateError instanceof Error ? updateError.message : 'Erro desconhecido'
    });
  });
});

bookGenerationQueue.on('stalled', (job: Job<BookGenerationJobData>) => {
  logger.warn(`Job ${job.id} travado`, { bookId: job.data.bookId });
  
  // Atualiza o livro para indicar o problema
  Book.findByIdAndUpdate(job.data.bookId, {
    'metadata.stalledAt': new Date(),
    'metadata.stalledJobId': job.id
  }).catch(updateError => {
    logger.error(`Erro ao atualizar status do livro ${job.data.bookId} após job travado`, {
      error: updateError instanceof Error ? updateError.message : 'Erro desconhecido'
    });
  });
});

// Adiciona mais eventos para monitoramento
bookGenerationQueue.on('error', (error: Error) => {
  logger.error('Erro na fila de geração de livros', {
    error: error.message,
    stack: error.stack
  });
});

bookGenerationQueue.on('waiting', (jobId: string) => {
  logger.info(`Job ${jobId} aguardando processamento`);
});

bookGenerationQueue.on('active', (job: Job<BookGenerationJobData>) => {
  logger.info(`Job ${job.id} iniciado`, { bookId: job.data.bookId });
});

bookGenerationQueue.on('progress', (job: Job<BookGenerationJobData>, progress: number) => {
  logger.info(`Job ${job.id} progresso: ${progress}%`, { bookId: job.data.bookId });
});

// Exporta a fila para uso em outros módulos
export default bookGenerationQueue;