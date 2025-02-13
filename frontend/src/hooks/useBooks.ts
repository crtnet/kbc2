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
      
      setBooks(response.data);
      logger.info('Books fetched successfully', { count: response.data.length });
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