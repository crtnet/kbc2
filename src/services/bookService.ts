import axios from 'axios';
import { API_URL } from '../config';

export interface Book {
  _id: string;
  title: string;
  story: string;
  images: string[];
  userId: string;
  createdAt: string;
}

export const bookService = {
  async createBook(bookData: Partial<Book>) {
    try {
      const response = await axios.post(`${API_URL}/api/books`, bookData);
      if (!response.data._id) {
        throw new Error('ID do livro não retornado pela API');
      }
      return response.data;
    } catch (error) {
      console.error('Erro ao criar livro:', error);
      throw error;
    }
  },

  async getBook(bookId: string) {
    try {
      if (!bookId) {
        throw new Error('ID do livro não fornecido');
      }
      const response = await axios.get(`${API_URL}/api/books/${bookId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar livro:', error);
      throw error;
    }
  }
};