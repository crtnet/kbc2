// src/screens/ViewBookScreen.tsx
import React, { useEffect, useState, useCallback, useLayoutEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Text, Card, ActivityIndicator, Button } from 'react-native-paper';
import { getBookById } from '../services/bookService';
import { useNavigation } from '@react-navigation/native';

interface Page {
  pageNumber: number;
  text: string;
  imageUrl?: string; // se "placeholder_image_url", tratamos como undefined
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

interface ViewBookScreenProps {
  route: {
    params: {
      bookId: string;
    };
  };
  // se quiser tipar a navigation, use:
  // navigation: StackNavigationProp<RootStackParamList, 'ViewBook'>;
  navigation: any;
}

const ViewBookScreen: React.FC<ViewBookScreenProps> = ({ route, navigation }) => {
  const { bookId } = route.params;

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  /**
   * Customiza o header:
   * - Remove botão de voltar
   * - Exibe "Concluído" que leva para HomeScreen
   */
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => null, // remove o botão de voltar
      headerBackVisible: false, // em versões mais recentes do RN Navigation
      headerRight: () => (
        <Button
          onPress={() => navigation.navigate('Home')}
          mode="text"
        >
          Concluído
        </Button>
      ),
    });
  }, [navigation]);

  const loadBook = useCallback(async () => {
    try {
      console.log(`Buscando livro com ID: ${bookId}`);
      setRefreshing(true);
      setError('');
      const bookData = await getBookById(bookId);
      console.log('Livro obtido:', bookData);
      setBook(bookData);
    } catch (err: any) {
      console.error('Erro ao carregar livro:', err);

      // Tratamento de erros específicos
      if (err.response) {
        // Se o backend retornou status code
        const { status, data } = err.response;
        if (status === 400) {
          setError('O ID do livro é inválido.');
        } else if (status === 404) {
          setError('Livro não encontrado ou excluído.');
        } else {
          setError(data?.error || 'Erro ao carregar o livro.');
        }
      } else {
        setError('Erro ao carregar o livro. Verifique sua conexão ou tente novamente.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bookId]);

  useEffect(() => {
    loadBook();
  }, [loadBook]);

  // Se o livro estiver em geração, podemos revalidar periodicamente
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (book && (book.status === 'processing' || book.status === 'generating')) {
      interval = setInterval(() => {
        console.log('Revalidando status do livro...');
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

  // Se não houver erro nem loading, mas também não tiver 'book'
  if (!book) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Não foi possível carregar o livro.</Text>
        <Button mode="contained" onPress={loadBook}>
          Tentar novamente
        </Button>
      </View>
    );
  }

  const renderStatus = () => {
    const status = book.status || 'completed';

    switch (status) {
      case 'processing':
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
        return book.pages.map((page) => {
          // Se page.imageUrl for 'placeholder_image_url' ou falsy, exibe placeholder local
          const imageSource =
            page.imageUrl && page.imageUrl !== 'placeholder_image_url'
              ? { uri: page.imageUrl }
              : require('../assets/placeholder-image.png');

          return (
            <Card key={page.pageNumber} style={styles.pageCard}>
              <Card.Cover source={imageSource} style={styles.pageImage} />
              <Card.Content>
                <Text style={styles.pageNumber}>
                  Página {page.pageNumber}
                </Text>
                <Text style={styles.pageText}>{page.text}</Text>
              </Card.Content>
            </Card>
          );
        });
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

  const handleOpenPDF = () => {
    if (book.pdfUrl) {
      // Navega para FlipBookScreen
      navigation.navigate('FlipBook', { bookId: book._id });
    } else {
      console.log('PDF não disponível.');
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
          <Text style={styles.title}>{book.title}</Text>
          <Text style={styles.detail}>Personagem: {book.mainCharacter}</Text>
          <Text style={styles.detail}>Cenário: {book.setting}</Text>
          <Text style={styles.detail}>Gênero: {book.genre}</Text>
          <Text style={styles.detail}>Tema: {book.theme}</Text>
          <Text style={styles.detail}>Tom: {book.tone}</Text>

          {book.pdfUrl && (
            <Button
              mode="contained"
              onPress={handleOpenPDF}
              style={styles.pdfButton}
            >
              Ver PDF
            </Button>
          )}
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
  },
  pdfButton: {
    marginTop: 20
  }
});

export default ViewBookScreen;