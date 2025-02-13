import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Book } from '../types/book';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

interface BookCardProps {
  book: Book;
  onPress: () => void;
  onViewPDF: () => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onPress, onViewPDF }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: theme.colors.card }]} 
      onPress={onPress}
    >
      <Image 
        source={{ uri: book.coverImage }} 
        style={styles.cover} 
        resizeMode="cover"
      />
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {book.title}
        </Text>
        <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
          {new Date(book.createdAt).toLocaleDateString()}
        </Text>
        <TouchableOpacity 
          style={[styles.pdfButton, { backgroundColor: theme.colors.primary }]}
          onPress={onViewPDF}
        >
          <MaterialIcons name="book" size={20} color="white" />
          <Text style={styles.pdfButtonText}>
            {t('book.viewPDF')}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cover: {
    width: 100,
    height: 140,
  },
  content: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  pdfButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '500',
  },
});