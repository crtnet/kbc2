// src/screens/HomeScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BookList } from '../components/BookList';
import { FAB } from '../components/FAB';
import { api } from '../services/api';
import { useTheme } from '../hooks/useTheme';
import { logger } from '../utils/logger';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { Book } from '../types/book';
import { Appbar, Menu } from 'react-native-paper';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const fetchBooks = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      logger.info('Fetching user books');
      const response = await api.get('/books');

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
          image: page.imageUrl,
        })) || [],
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

  useFocusEffect(
    useCallback(() => {
      fetchBooks();
    }, [fetchBooks])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchBooks();
    setIsRefreshing(false);
  };

  const handleLogout = () => {
    // Aqui você pode implementar a lógica de logout, como limpar tokens e redirecionar para a tela de login.
    closeMenu();
    navigation.navigate('Login');
  };

  if (loading && !isRefreshing) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchBooks} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
        <Appbar.Content
          title="Meus livros"
          subtitle={`Total de livros ${books.length}`}
          titleStyle={styles.headerTitle}
          subtitleStyle={styles.headerSubtitle}
        />
        <Menu
          visible={menuVisible}
          onDismiss={closeMenu}
          anchor={
            <Appbar.Action icon="menu" color="#fff" onPress={openMenu} />
          }
        >
        <Menu.Item
          leadingIcon="plus"
          onPress={() => {
            closeMenu();
            navigation.navigate('CreateBook');
          }}
          title="Criar livro"
        />
        <Menu.Item
          leadingIcon="account"
          onPress={() => {
            closeMenu();
            navigation.navigate('Profile');
          }}
          title="Perfil"
        />
        <Menu.Item
          leadingIcon="logout"
          onPress={handleLogout}
          title="Sair"
        />
        </Menu>
      </Appbar.Header>

      <BookList
        books={books}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <FAB
        icon="add"
        onPress={() => navigation.navigate('CreateBook')}
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
  },
});

export default HomeScreen;