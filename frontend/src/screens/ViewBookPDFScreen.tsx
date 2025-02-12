import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import PDFViewer from '../components/PDFViewer';
import { getBook } from '../services/api';
import { Book } from '../types';

type RouteParams = {
  ViewBookPDF: {
    bookId: string;
  };
};

export const ViewBookPDFScreen: React.FC = () => {
  const route = useRoute<RouteProp<RouteParams, 'ViewBookPDF'>>();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBook = async () => {
      try {
        const bookData = await getBook(route.params.bookId);
        setBook(bookData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadBook();
  }, [route.params.bookId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !book) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>
          {error || 'Não foi possível carregar o livro'}
        </Text>
      </View>
    );
  }

  if (!book.pdfUrl) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>
          PDF ainda não foi gerado para este livro
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PDFViewer pdfUrl={book.pdfUrl} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    color: 'red',
    textAlign: 'center',
    margin: 20,
  },
});

export default ViewBookPDFScreen;