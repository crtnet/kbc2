import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BookList } from '../components/BookList';
import { FAB } from '../components/FAB';
import { useBooks } from '../hooks/useBooks';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { logger } from '../utils/logger';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { books, loading, error, fetchBooks } = useBooks();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    logger.info('Loading user books');
    fetchBooks();
  }, []);

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
        icon="plus"
        onPress={handleCreateBook}
        style={styles.fab}
        color={theme.colors.primary}
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