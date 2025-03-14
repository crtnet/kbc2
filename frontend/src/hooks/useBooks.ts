import { useState, useCallback } from 'react';
import { Book } from '../types/book';
import { api } from '../services/api';
import { logger } from '../utils/logger';

export const useBooks = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBooks = useCallback(async () => {
    try {
      setError(null);
      if (!loading) setLoading(true);
      
      logger.info('Fetching user books');
      const response = await api.get('/books');
      
      // Mapeia os livros para o formato esperado no frontend
      const mappedBooks: Book[] = response.data.map((book: any) => ({
        id: book._id,
        title: book.title,
        coverImage: book.pages?.[0]?.imageUrl || '/default-book-image.png',
        createdAt: book.createdAt,
        updatedAt: book.updatedAt,
        userId: book.userId,
        pdfUrl: book.pdfUrl,
        language: book.language,
        theme: book.theme,
        status: book.status === 'completed' ? 'published' : 'draft',
        pages: book.pages?.map((page: any) => ({
          text: page.text,
          image: page.imageUrl
        })) || []
      }));
      
      setBooks(mappedBooks);
      logger.info('Books fetched successfully', { count: mappedBooks.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch books';
      logger.error('Error fetching books', { error: message });
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    books,
    loading,
    error,
    fetchBooks,
  };
};