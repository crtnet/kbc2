// src/screens/ViewBookScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl
} from 'react-native';
import { Text, Card, ActivityIndicator, Button } from 'react-native-paper';
import { getBookById } from '../services/bookService';

interface Page {
  pageNumber: number;
  text: string;
  imageUrl?: string;
}

interface Book {
  _id: string;
  title: string;
  genre: string;
  theme: string;
  mainCharacter: string;
  setting: string;
  tone: string;
  pages: Page[];
  status?: string;
  pdfUrl?: string;
  // outros campos, se necessário
}

const ViewBookScreen = ({ route, navigation }: { route: any; navigation: any }) => {
  const { bookId } = route.params;
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadBook = useCallback(async () => {
    try {
      console.log(`Buscando livro com ID: ${bookId}`);
      setRefreshing(true);
      const bookData = await getBookById(bookId);
      console.log('Livro obtido:', bookData);
      setBook(bookData);
      setError('');
    } catch (err) {
      console.error('Erro ao carregar livro:', err);
      setError('Erro ao carregar o livro. Verifique sua conexão ou tente novamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bookId]);

  useEffect(() => {
    loadBook();
  }, [loadBook]);

  // Atualiza periodicamente enquanto o livro estiver em status "generating"
  // ou enquanto o PDF não estiver disponível (indicando que o processo ainda está em andamento)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (book && ((book.status && book.status === 'generating') || !book.pdfUrl)) {
      console.log('Revalidando status do livro...');
      interval = setInterval(() => {
        loadBook();
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [book, loadBook]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.statusText}>Carregando livro...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" onPress={loadBook}>
          Tentar novamente
        </Button>
      </View>
    );
  }

  const renderStatus = () => {
    if (!book) return null;

    // Se o status não estiver definido, trata como 'completed'
    const status = book.status || 'completed';

    switch (status) {
      case 'generating':
        return (
          <Card style={styles.statusCard}>
            <Card.Content>
              <ActivityIndicator style={styles.loader} />
              <Text style={styles.statusText}>
                Sua história está sendo gerada... Por favor, aguarde.
              </Text>
            </Card.Content>
          </Card>
        );
      case 'completed':
        if (!book.pages || book.pages.length === 0) {
          return (
            <Card style={styles.statusCard}>
              <Card.Content>
                <Text style={styles.statusText}>
                  O livro foi gerado, mas não possui páginas para exibir.
                </Text>
              </Card.Content>
            </Card>
          );
        }
        return book.pages.map((page, index) => (
          <Card key={page.pageNumber || index} style={styles.pageCard}>
            {page.imageUrl ? (
              <Card.Cover source={{ uri: page.imageUrl }} style={styles.pageImage} />
            ) : (
              // Exibe um placeholder se não houver imagem; verifique o caminho do arquivo
              <Card.Cover 
                source={require('../assets/placeholder-image.png')}
                style={styles.pageImage}
              />
            )}
            <Card.Content>
              <Text style={styles.pageNumber}>Página {page.pageNumber || index + 1}</Text>
              <Text style={styles.pageText}>{page.text}</Text>
            </Card.Content>
          </Card>
        ));
      case 'error':
        return (
          <Card style={[styles.statusCard, styles.errorCard]}>
            <Card.Content>
              <Text style={styles.errorText}>
                Ocorreu um erro ao gerar sua história.
              </Text>
              <Button mode="contained" onPress={loadBook} style={styles.retryButton}>
                Tentar novamente
              </Button>
            </Card.Content>
          </Card>
        );
      default:
        return (
          <Card style={styles.statusCard}>
            <Card.Content>
              <Text style={styles.statusText}>
                Status desconhecido: {book.status}
              </Text>
            </Card.Content>
          </Card>
        );
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadBook} />
      }
    >
      <Card style={styles.infoCard}>
        <Card.Content>
          <Text style={styles.title}>{book?.title}</Text>
          <Text style={styles.detail}>Personagem: {book?.mainCharacter}</Text>
          <Text style={styles.detail}>Cenário: {book?.setting}</Text>
          <Text style={styles.detail}>Gênero: {book?.genre}</Text>
          <Text style={styles.detail}>Tema: {book?.theme}</Text>
          <Text style={styles.detail}>Tom: {book?.tone}</Text>
        </Card.Content>
      </Card>
      {renderStatus()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  infoCard: {
    margin: 10,
    elevation: 2
  },
  statusCard: {
    margin: 10,
    elevation: 2,
    backgroundColor: '#e3f2fd'
  },
  errorCard: {
    backgroundColor: '#ffebee'
  },
  pageCard: {
    margin: 10,
    elevation: 2
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10
  },
  detail: {
    fontSize: 16,
    marginBottom: 5,
    color: '#666'
  },
  statusText: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 16
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
    fontSize: 16
  },
  loader: {
    marginVertical: 10
  },
  pageText: {
    fontSize: 16,
    lineHeight: 24,
    marginVertical: 10
  },
  pageNumber: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    fontWeight: 'bold'
  },
  pageImage: {
    height: 200,
    resizeMode: 'cover'
  },
  retryButton: {
    marginTop: 10
  }
});

export default ViewBookScreen;