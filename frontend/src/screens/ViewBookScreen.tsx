import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, ActivityIndicator, Button } from 'react-native-paper';
import * as bookService from '../services/bookService';

export default function ViewBookScreen({ route, navigation }) {
  const { bookId } = route.params;
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadBook = async () => {
    try {
      setRefreshing(true);
      const bookData = await bookService.getBook(bookId);
      setBook(bookData);
      setError('');
    } catch (error) {
      console.error('Erro ao carregar livro:', error);
      setError('Erro ao carregar o livro');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Carrega o livro na montagem do componente
  useEffect(() => {
    loadBook();
  }, [bookId]);

  // Reconfigura um intervalo para atualizar o livro enquanto estiver gerando
  useEffect(() => {
    let interval;
    if (book?.status === 'generating') {
      interval = setInterval(loadBook, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [book?.status]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text>{error}</Text>
        <Button onPress={loadBook}>Tentar novamente</Button>
      </View>
    );
  }

  const renderStatus = () => {
    if (!book) return null;

    switch (book.status) {
      case 'generating':
        return (
          <Card style={styles.statusCard}>
            <Card.Content>
              <ActivityIndicator style={styles.loader} />
              <Text style={styles.statusText}>
                Gerando sua história... Por favor, aguarde.
              </Text>
            </Card.Content>
          </Card>
        );
      case 'completed':
        if (!book.pages?.length) {
          return (
            <Card style={styles.statusCard}>
              <Card.Content>
                <Text style={styles.statusText}>
                  O livro foi gerado mas não possui páginas.
                </Text>
              </Card.Content>
            </Card>
          );
        }
        return book.pages.map((page, index) => (
          <Card key={index} style={styles.pageCard}>
            {page.imageUrl && <Card.Cover source={{ uri: page.imageUrl }} />}
            <Card.Content>
              <Text style={styles.pageNumber}>Página {index + 1}</Text>
              <Text style={styles.pageText}>{page.text}</Text>
            </Card.Content>
          </Card>
        ));
      case 'failed':
        return (
          <Card style={[styles.statusCard, styles.errorCard]}>
            <Card.Content>
              <Text style={styles.errorText}>
                Ocorreu um erro ao gerar sua história.
              </Text>
              <Button 
                mode="contained" 
                onPress={loadBook}
                style={styles.retryButton}
              >
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
    <ScrollView style={styles.container}>
      <Card style={styles.infoCard}>
        <Card.Content>
          <Text style={styles.title}>{book?.title}</Text>
          <Text style={styles.detail}>Personagem: {book?.mainCharacter}</Text>
          <Text style={styles.detail}>Cenário: {book?.setting}</Text>
          <Text style={styles.detail}>Gênero: {book?.genre}</Text>
          <Text style={styles.detail}>Tema: {book?.theme}</Text>
        </Card.Content>
      </Card>

      {renderStatus()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  infoCard: {
    margin: 10,
    elevation: 2,
  },
  statusCard: {
    margin: 10,
    elevation: 2,
    backgroundColor: '#e3f2fd',
  },
  errorCard: {
    backgroundColor: '#ffebee',
  },
  pageCard: {
    margin: 10,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  detail: {
    fontSize: 16,
    marginBottom: 5,
    color: '#666',
  },
  statusText: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 16,
  },
  progressText: {
    textAlign: 'center',
    marginTop: 5,
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
    fontSize: 16,
  },
  loader: {
    marginVertical: 10,
  },
  pageText: {
    fontSize: 16,
    lineHeight: 24,
    marginVertical: 10,
  },
  pageNumber: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    fontWeight: 'bold',
  },
  pageImage: {
    height: 200,
    resizeMode: 'cover',
  },
  retryButton: {
    marginTop: 10,
  },
});
