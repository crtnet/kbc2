// /frontend/src/screens/FlipBookScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
  Text,
  TouchableOpacity,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../contexts/AuthContext'; 
import { logger } from '../utils/logger';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import WebView from 'react-native-webview';
import { api } from '../services/api';

type FlipBookScreenRouteProp = RouteProp<RootStackParamList, 'FlipBook'>;

export const FlipBookScreen: React.FC = () => {
  const route = useRoute<FlipBookScreenRouteProp>();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { token, isLoading } = useAuth();

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { bookId } = route.params;

  console.log('FlipBookScreen => token:', token, 'isLoading:', isLoading, 'bookId:', bookId);

  // Caso a plataforma não seja iOS ou Android, exibimos fallback
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.text, padding: 16, textAlign: 'center' }}>
          Visualização de PDF não é suportada nesta plataforma.
        </Text>
        <TouchableOpacity
          onPress={() => {
            logger.warn('Tentou abrir PDF em plataforma não suportada');
            if (navigation.canGoBack()) {
              navigation.goBack();
            }
          }}
        >
          <Text style={{ textAlign: 'center', color: theme.colors.primary }}>
            Voltar
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  useEffect(() => {
    if (!bookId) {
      logger.error('No bookId provided to FlipBookScreen');
      setError('ID do livro não fornecido');
      setLoading(false);
      return;
    }
    buildPdfUrl();
  }, [bookId]);

  const buildPdfUrl = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!api.defaults.baseURL) {
        throw new Error('API baseURL não configurada');
      }

      const constructedUrl = `${api.defaults.baseURL}/books/${bookId}/pdf`;
      logger.info('PDF URL constructed', { bookId, pdfUrl: constructedUrl });

      setPdfUrl(constructedUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao acessar PDF';
      logger.error('Error building PDF URL', { error: message, bookId });
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }
  if (!token) {
    return <ErrorMessage message="Token de autenticação não encontrado" onRetry={buildPdfUrl} />;
  }
  if (loading) {
    return <LoadingSpinner />;
  }
  if (error) {
    return <ErrorMessage message={error} onRetry={buildPdfUrl} />;
  }
  if (!pdfUrl) {
    return <ErrorMessage message="PDF não encontrado" onRetry={buildPdfUrl} />;
  }

  /**
   * HTML injetado com turn.js + jquery + pdf.js
   * Carregamos **todas** as páginas do PDF.
   * Se o PDF for muito grande, pode haver impacto de performance.
   */
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <!-- PDF.js -->
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.min.js"></script>
        <!-- jQuery (turn.js depende de jQuery 1.x ou 2.x) -->
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/2.2.4/jquery.min.js"></script>
        <!-- turn.js -->
        <script src="https://cdnjs.cloudflare.com/ajax/libs/turn.js/4/turn.min.js"></script>
        <style>
          body {
            margin: 0; padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: ${theme.colors.background};
            overflow: hidden;
          }
          #loadingMessage {
            position: absolute;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            color: #666;
            font-family: system-ui;
          }
          #flipbook {
            width: 100vw;
            height: 100vh;
          }
          .page {
            width: 100%;
            height: 100%;
            background-color: #fff;
          }
          #errorMessage {
            position: absolute;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            color: #ff4444;
            font-family: system-ui;
            text-align: center;
            padding: 20px;
          }
          canvas {
            width: 100% !important;
            height: auto !important;
          }
        </style>
      </head>
      <body>
        <div id="loadingMessage">Carregando PDF...</div>
        <div id="flipbook"></div>
        <script>
          function postMessage(type, data = {}) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type,
              ...data
            }));
          }

          async function loadPDF() {
            try {
              postMessage('PDF_LOADING_START');

              // PDF.js worker
              const workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';
              pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

              // Carrega o PDF
              const loadingTask = pdfjsLib.getDocument({
                url: '${pdfUrl}',
                httpHeaders: {
                  'Authorization': 'Bearer ${token}'
                }
              });

              const pdf = await loadingTask.promise;
              postMessage('PDF_DOCUMENT_LOADED', { numPages: pdf.numPages });

              // Carregar TODAS as páginas
              for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);

                // Calcular viewport
                const viewport = page.getViewport({ scale: 1.0 });
                const containerWidth = document.documentElement.clientWidth;
                // Ajuste scale como preferir
                const scale = (containerWidth * 0.4) / viewport.width; 
                const scaledViewport = page.getViewport({ scale });

                // Criar canvas
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = scaledViewport.width;
                canvas.height = scaledViewport.height;

                await page.render({ canvasContext: context, viewport: scaledViewport }).promise;

                // Criar div de página e inserir o canvas
                const pageDiv = document.createElement('div');
                pageDiv.className = 'page';
                pageDiv.appendChild(canvas);

                // Inserir no flipbook
                document.getElementById('flipbook').appendChild(pageDiv);

                postMessage('PDF_PAGE_RENDERED', { pageNumber: pageNum });
              }

              // Esconde mensagem de loading
              document.getElementById('loadingMessage').style.display = 'none';

              // Inicializar flipbook após um pequeno delay
              setTimeout(() => {
                $('#flipbook').turn({
                  width: document.documentElement.clientWidth * 0.8,
                  height: document.documentElement.clientHeight * 0.8,
                  elevation: 50,
                  gradients: true,
                  autoCenter: true
                });
              }, 500);

            } catch (error) {
              console.error('Erro ao carregar PDF:', error);
              document.getElementById('loadingMessage').style.display = 'none';

              const errorDiv = document.createElement('div');
              errorDiv.id = 'errorMessage';
              errorDiv.textContent = 'Erro ao carregar o PDF. Por favor, tente novamente.';
              document.body.appendChild(errorDiv);

              postMessage('PDF_ERROR', {
                error: error.message,
                code: error.code,
                name: error.name
              });
            }
          }

          document.addEventListener('DOMContentLoaded', loadPDF);
        </script>
      </body>
    </html>
  `;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <WebView
        source={{ html }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => <LoadingSpinner />}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            switch (data.type) {
              case 'PDF_LOADING_START':
                logger.info('Started loading PDF', { bookId });
                break;
              case 'PDF_DOCUMENT_LOADED':
                logger.info('PDF document loaded', {
                  bookId,
                  numPages: data.numPages,
                });
                break;
              case 'PDF_PAGE_RENDERED':
                logger.info('PDF page rendered', {
                  bookId,
                  pageNumber: data.pageNumber,
                });
                break;
              case 'PDF_ERROR':
                logger.error('Error loading PDF in WebView', {
                  bookId,
                  error: data.error,
                  code: data.code,
                  name: data.name,
                });
                setError(`Erro ao carregar o PDF: ${data.error}`);
                break;
              default:
                break;
            }
          } catch (error) {
            logger.error('Error processing WebView message', {
              error,
              bookId,
            });
          }
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          logger.error('WebView error', {
            error: nativeEvent,
            bookId,
          });
          setError('Erro ao carregar o visualizador de PDF');
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          logger.error('WebView HTTP error', {
            status: nativeEvent.statusCode,
            description: nativeEvent.description,
            bookId,
          });
          setError(`Erro ao carregar o PDF (${nativeEvent.statusCode})`);
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