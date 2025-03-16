// src/components/BookCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Book } from '../types/book';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import OptimizedImage from './OptimizedImage';

// Biblioteca para formatação de datas
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BookCardProps {
  book: Book;
  onPress: () => void;
  onViewPDF: () => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onPress, onViewPDF }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  // Formata a data de criação do livro
  const formattedDate = book.createdAt
    ? format(new Date(book.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : '';

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.colors.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <OptimizedImage
        source={{ uri: book.coverImage }}
        style={styles.cover}
        width={100}
        height={140}
        quality={75}
        resizeMode="cover"
        showPlaceholder={true}
        placeholderColor={theme.colors.background}
      />
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2} ellipsizeMode="tail">
          {book.title}
        </Text>
        <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
          {formattedDate}
        </Text>
        <TouchableOpacity
          style={[styles.pdfButton, { backgroundColor: theme.colors.primary }]}
          onPress={onViewPDF}
          activeOpacity={0.8}
        >
          <MaterialIcons name="book" size={20} color="#fff" />
          <Text style={styles.pdfButtonText}>
            {t('Ver PDF')}
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
    marginBottom: 12, // Espaço entre os cartões
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
    color: '#fff',
    marginLeft: 8,
    fontWeight: '500',
  },
});