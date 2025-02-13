import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../hooks/useTheme';
import { logger } from '../utils/logger';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import WebView from 'react-native-webview';
import { api } from '../services/api';

type FlipBookScreenRouteProp = RouteProp<RootStackParamList, 'FlipBook'>;

export const FlipBookScreen: React.FC = () => {
  const route = useRoute<FlipBookScreenRouteProp>();
  const { theme } = useTheme();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { bookId } = route.params;

  useEffect(() => {
    if (!bookId) {
      logger.error('No bookId provided to FlipBookScreen');
      setError('ID do livro não fornecido');
      setLoading(false);
      return;
    }
    fetchPdfUrl();
  }, [bookId]);

  const fetchPdfUrl = async () => {
    try {
      setLoading(true);
      setError(null);
      
      logger.info('Fetching PDF URL', { bookId });
      const response = await api.get(`/books/${bookId}/pdf`);
      
      if (!response.data?.viewerUrl) {
        throw new Error('URL do visualizador de PDF não encontrada');
      }
      
      setPdfUrl(response.data.viewerUrl);
      logger.info('PDF URL fetched successfully', { bookId, viewerUrl: response.data.viewerUrl });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar URL do PDF';
      logger.error('Error fetching PDF URL', { error: message, bookId });
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchPdfUrl} />;
  }

  if (!pdfUrl) {
    return <ErrorMessage message="PDF não encontrado" onRetry={fetchPdfUrl} />;
  }

  // Injeta o script do PDF.js e configura o visualizador
  const injectedJavaScript = `
    if (!window.PDFViewerApplication) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.min.js';
      document.head.appendChild(script);
      
      script.onload = () => {
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';
        
        const loadingTask = pdfjsLib.getDocument('${pdfUrl}');
        loadingTask.promise.then(pdf => {
          // Configuração do visualizador flip
          const container = document.getElementById('viewerContainer');
          // Aqui você pode adicionar a lógica do efeito flip
        });
      };
    }
  `;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          body { margin: 0; padding: 0; }
          #viewerContainer { width: 100vw; height: 100vh; }
        </style>
      </head>
      <body>
        <div id="viewerContainer"></div>
      </body>
    </html>
  `;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <WebView
        source={{ html }}
        injectedJavaScript={injectedJavaScript}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => <LoadingSpinner />}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          logger.error('WebView error', { error: nativeEvent });
          setError('Erro ao carregar o PDF');
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
});

export default FlipBookScreen;