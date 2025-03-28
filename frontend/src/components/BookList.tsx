import React from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Book } from '../types/book';
import { BookCard } from './BookCard';
import { useTranslation } from 'react-i18next';
import { logger } from '../utils/logger';

interface BookListProps {
  books: Book[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const BookList: React.FC<BookListProps> = ({ 
  books, 
  onRefresh, 
  isRefreshing = false 
}) => {
  const navigation = useNavigation();
  const { t } = useTranslation();

  const handleBookPress = (book: Book) => {
    logger.info('Opening book details', { bookId: book.id });
    navigation.navigate('ViewBook', { bookId: book.id });
  };

  const handleViewPDF = (book: Book) => {
    if (!book?.id) {
      logger.error('Attempted to open PDF without book ID');
      return;
    }
    logger.info('Opening book PDF', { bookId: book.id });
    navigation.navigate('ViewBookPDF', { bookId: book.id });
  };

  const renderItem = ({ item: book }: { item: Book }) => (
    <BookCard
      book={book}
      onPress={() => handleBookPress(book)}
      onViewPDF={() => handleViewPDF(book)}
    />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={books}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={isRefreshing}
        onRefresh={onRefresh}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
});