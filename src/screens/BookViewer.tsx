import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { PDFView } from 'react-native-pdf';
import * as FileSystem from 'expo-file-system';

const BookViewer = ({ route }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const { bookId } = route.params;

  useEffect(() => {
    const loadPdf = async () => {
      try {
        console.log(`[BookViewer] Iniciando carregamento do PDF para o livro ${bookId}`);
        
        const response = await fetch(`${API_URL}/books/${bookId}/pdf`);
        
        if (!response.ok) {
          console.error(`[BookViewer] Erro ao buscar PDF: ${response.status}`);
          throw new Error('Erro ao carregar o PDF');
        }

        const pdfBlob = await response.blob();
        console.log(`[BookViewer] PDF recebido com tamanho: ${pdfBlob.size} bytes`);

        const fileUri = `${FileSystem.documentDirectory}book-${bookId}.pdf`;
        await FileSystem.writeAsStringAsync(fileUri, pdfBlob, {
          encoding: FileSystem.EncodingType.Base64,
        });

        console.log(`[BookViewer] PDF salvo localmente em: ${fileUri}`);
        setPdfUrl(fileUri);
        setLoading(false);
      } catch (err) {
        console.error('[BookViewer] Erro:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    loadPdf();
  }, [bookId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Carregando seu livro...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Erro ao carregar o livro: {error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {pdfUrl && (
        <PDFView
          style={styles.pdf}
          source={{ uri: pdfUrl }}
          onLoadComplete={() => console.log('[BookViewer] PDF carregado com sucesso')}
          onError={(error) => console.error('[BookViewer] Erro ao renderizar PDF:', error)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdf: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
});

export default BookViewer;