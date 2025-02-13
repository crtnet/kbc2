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