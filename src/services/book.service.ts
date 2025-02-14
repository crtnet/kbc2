import authService from './auth.service';
import { logger } from '../utils/logger';

interface BookData {
  title: string;
  genre: string;
  theme: string;
  mainCharacter: string;
  setting: string;
  description?: string;
}

interface BookResponse {
  id: string;
  _id?: string;
  title: string;
  genre: string;
  theme: string;
  mainCharacter: string;
  setting: string;
  description?: string;
}

class BookService {
  private baseUrl = '/api/books';

  async createBook(bookData: BookData): Promise<BookResponse> {
    try {
      const token = await authService.getToken();
      
      logger.info('API Request', {
        method: 'post',
        url: '/books'
      });

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bookData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      logger.info('API Response', {
        status: response.status,
        url: '/books'
      });

      if (data.success === false) {
        throw new Error(data.message || 'Failed to create book');
      }

      // Normalize the response to always have an 'id'
      const normalizedResponse: BookResponse = {
        ...data,
        id: data.id || data._id,
        _id: data._id || data.id
      };

      logger.info('Book created successfully', {
        bookId: normalizedResponse.id
      });

      return normalizedResponse;
    } catch (error) {
      logger.error('Error in createBook:', error);
      throw error;
    }
  }

  async getBookPdf(bookId: string): Promise<Blob> {
    try {
      const token = await authService.getToken();
      
      logger.info('Building PDF URL', { bookId });
      const url = `${this.baseUrl}/${bookId}/pdf`;
      logger.info('PDF URL constructed', { bookId, pdfUrl: url });

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`PDF não encontrado (${response.status})`);
      }

      return await response.blob();
    } catch (error) {
      logger.error('Error getting book PDF:', error);
      throw error;
    }
  }
}

export default new BookService();