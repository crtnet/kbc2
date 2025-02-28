import { api } from './api';
import { logger } from '../utils/logger';

export interface Book {
  _id: string;
  title: string;
  genre: string;
  theme: string;
  mainCharacter: string;
  setting: string;
  tone: string;
  pages: Array<{
    text: string;
    pageNumber: number;
    imageUrl: string;
  }>;
  userId: string;
  language: string;
  createdAt: string;
}

export type AgeRange = '1-2' | '3-4' | '5-6' | '7-8' | '9-10' | '11-12';

export interface CreateBookDTO {
  title: string;
  genre: string;
  theme: string;
  mainCharacter: string;
  mainCharacterAvatar: string;
  secondaryCharacter?: string;
  secondaryCharacterAvatar?: string;
  setting: string;
  tone: string;
  ageRange: AgeRange;
  authorName: string;
  language?: string;
}

class BookService {
  private static instance: BookService;

  private constructor() {}

  public static getInstance(): BookService {
    if (!BookService.instance) {
      BookService.instance = new BookService();
    }
    return BookService.instance;
  }

  async createBook(bookData: CreateBookDTO): Promise<Book> {
    try {
      logger.info('Iniciando criação do livro:', bookData);
      
      const response = await api.post('/books', bookData);
      
      logger.info('Livro criado com sucesso:', response.data);
      
      if (!response.data.book || !response.data.book._id) {
        logger.error('Resposta inválida da API:', response.data);
        throw new Error('ID do livro não retornado pela API');
      }

      return response.data.book;
    } catch (error: any) {
      logger.error('Erro ao criar livro:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  }

  async getBook(bookId: string): Promise<Book> {
    try {
      logger.info('Buscando livro:', { bookId });

      if (!bookId || bookId === 'undefined') {
        const error = new Error('ID do livro não fornecido ou inválido');
        logger.error(error.message);
        throw error;
      }

      const response = await api.get(`/books/${bookId}`);
      
      logger.info('Livro encontrado:', response.data);
      return response.data;
    } catch (error: any) {
      logger.error('Erro ao buscar livro:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  }

  async getBooks(): Promise<Book[]> {
    try {
      logger.info('Buscando lista de livros');
      const response = await api.get('/books');
      logger.info('Livros encontrados:', { count: response.data.length });
      return response.data;
    } catch (error: any) {
      logger.error('Erro ao buscar livros:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  }

  async updateBook(bookId: string, updateData: Partial<Book>): Promise<Book> {
    try {
      logger.info('Atualizando livro:', { bookId, data: updateData });
      const response = await api.put(`/books/${bookId}`, updateData);
      logger.info('Livro atualizado com sucesso');
      return response.data;
    } catch (error: any) {
      logger.error('Erro ao atualizar livro:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  }

  async deleteBook(bookId: string): Promise<void> {
    try {
      logger.info('Deletando livro:', { bookId });
      await api.delete(`/books/${bookId}`);
      logger.info('Livro deletado com sucesso');
    } catch (error: any) {
      logger.error('Erro ao deletar livro:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  }
}

export default BookService.getInstance();