import axios from 'axios';
import { API_URL } from '../config';

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
  setting: string;
  tone: string;
  ageRange: AgeRange;
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
      console.log('Dados enviados para criação do livro:', bookData);
      
      const response = await axios.post(`${API_URL}/api/books`, bookData);
      
      if (!response.data.book._id) {
        throw new Error('ID do livro não retornado pela API');
      }

      return response.data.book;
    } catch (error) {
      console.error('Erro ao criar livro:', error.response?.data || error.message);
      throw error;
    }
  }

  async getBook(bookId: string): Promise<Book> {
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

  async getBooks(): Promise<Book[]> {
    try {
      const response = await axios.get(`${API_URL}/api/books`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar livros:', error);
      throw error;
    }
  }

  async updateBook(bookId: string, updateData: Partial<Book>): Promise<Book> {
    try {
      const response = await axios.put(`${API_URL}/api/books/${bookId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar livro:', error);
      throw error;
    }
  }

  async deleteBook(bookId: string): Promise<void> {
    try {
      await axios.delete(`${API_URL}/api/books/${bookId}`);
    } catch (error) {
      console.error('Erro ao deletar livro:', error);
      throw error;
    }
  }
}

export default BookService.getInstance();