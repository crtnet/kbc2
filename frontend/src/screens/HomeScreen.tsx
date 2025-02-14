import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BookList } from '../components/BookList';
import { FAB } from '../components/FAB';
import { api } from '../services/api';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { logger } from '../utils/logger';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { Book } from '../types/book';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchBooks = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      
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

  useEffect(() => {
    logger.info('Loading user books');
    fetchBooks();
  }, [fetchBooks]);

  const handleRefresh = async () => {
    logger.info('Refreshing books list');
    setIsRefreshing(true);
    await fetchBooks();
    setIsRefreshing(false);
  };

  const handleCreateBook = () => {
    logger.info('Navigating to create book screen');
    navigation.navigate('CreateBook');
  };

  if (loading && !isRefreshing) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchBooks} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <BookList
        books={books}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
      <FAB
        icon="add"
        onPress={handleCreateBook}
        style={styles.fab}
        color={theme.colors.onPrimary}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});