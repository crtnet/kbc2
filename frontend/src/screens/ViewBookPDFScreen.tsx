import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { PDFViewer } from '../components/PDFViewer';
import { getBookById, getBookPdfUrl } from '../services/bookService';
import { Book } from '../types';
import { logger } from '../utils/logger';

type RouteParams = {
  ViewBookPDF: {
    bookId: string;
  };
};

export const ViewBookPDFScreen: React.FC = () => {
  const route = useRoute<RouteProp<RouteParams, 'ViewBookPDF'>>();
  const [book, setBook] = useState<Book | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBookAndPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        
        logger.info('Carregando informações do livro', { bookId: route.params.bookId });
        const bookData = await getBookById(route.params.bookId);
        setBook(bookData);

        logger.info('Obtendo URL do PDF', { bookId: route.params.bookId });
        const url = await getBookPdfUrl(route.params.bookId);
        setPdfUrl(url);
      } catch (err: any) {
        logger.error('Erro ao carregar PDF do livro', { 
          error: err.message,
          status: err.response?.status 
        });
        
        if (err.response?.status === 401) {
          setError('Sessão expirada. Por favor, faça login novamente.');
        } else if (err.response?.status === 404) {
          setError('PDF não encontrado. O arquivo pode ainda estar sendo gerado.');
        } else {
          setError('Não foi possível carregar o PDF. Tente novamente mais tarde.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadBookAndPdf();
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

  if (!pdfUrl) {
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
      <PDFViewer 
        pdfUrl={pdfUrl}
        onError={(error) => {
          logger.error('Erro ao exibir PDF', { error });
          setError('Erro ao exibir o PDF');
        }}
      />
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