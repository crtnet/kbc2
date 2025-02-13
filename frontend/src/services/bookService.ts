import { api } from './api';
import { Book } from '../types/book';
import { logger } from '../utils/logger';

export const createBook = async (bookData: Partial<Book>) => {
  try {
    const response = await api.post('/books', bookData);
    logger.info('Book created successfully', { bookId: response.data.id });
    return response.data;
  } catch (error) {
    logger.error('Error creating book', error);
    throw error;
  }
};

export const getBooks = async (): Promise<Book[]> => {
  try {
    const response = await api.get('/books');
    logger.info('Books fetched successfully', { count: response.data.length });
    return response.data;
  } catch (error) {
    logger.error('Error fetching books', error);
    throw error;
  }
};

export const getBookById = async (bookId: string): Promise<Book> => {
  try {
    const response = await api.get(`/books/${bookId}`);
    logger.info('Book fetched successfully', { bookId });
    return response.data;
  } catch (error) {
    logger.error(`Error fetching book ${bookId}`, error);
    throw error;
  }
};

export const updateBook = async (bookId: string, bookData: Partial<Book>) => {
  try {
    const response = await api.patch(`/books/${bookId}`, bookData);
    logger.info('Book updated successfully', { bookId });
    return response.data;
  } catch (error) {
    logger.error(`Error updating book ${bookId}`, error);
    throw error;
  }
};

export const deleteBook = async (bookId: string) => {
  try {
    await api.delete(`/books/${bookId}`);
    logger.info('Book deleted successfully', { bookId });
  } catch (error) {
    logger.error(`Error deleting book ${bookId}`, error);
    throw error;
  }
};

export const getBookPdfUrl = async (bookId: string): Promise<string> => {
  try {
    logger.info('Iniciando download do PDF', { bookId });
    
    const response = await api.get(`/books/${bookId}/pdf`, {
      responseType: 'blob',
      headers: {
        Accept: 'application/pdf',
      },
    });
    
    if (!response.data) {
      throw new Error('Resposta vazia do servidor');
    }

    logger.info('PDF baixado com sucesso', { 
      bookId,
      contentType: response.headers['content-type'],
      size: response.data.size 
    });
    
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    logger.info('URL do PDF criada', { bookId, url });
    return url;
  } catch (error) {
    logger.error('Erro ao obter PDF', { 
      bookId, 
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText 
    });
    throw error;
  }
};