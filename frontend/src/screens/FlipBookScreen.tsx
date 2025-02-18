import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
  Text,
  TouchableOpacity,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { logger } from '../utils/logger';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import WebView from 'react-native-webview';
import { api } from '../services/api';

type FlipBookScreenRouteProp = RouteProp<RootStackParamList, 'FlipBook'>;

export const FlipBookScreen: React.FC = () => {
  const route = useRoute<FlipBookScreenRouteProp>();
  const { theme } = useTheme();
  const { token } = useAuth();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pegamos o ID do livro que veio na rota
  const { bookId } = route.params;

  // Se não for iOS ou Android, exibimos um fallback
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.text, padding: 16, textAlign: 'center' }}>
          Visualização de PDF não é suportada nesta plataforma.
        </Text>
        <TouchableOpacity onPress={() => logger.warn('Tentou abrir PDF em plataforma não suportada')}>
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

  /**
   * Monta a URL do PDF baseado no baseURL da API e no bookId.
   * O carregamento efetivo do PDF (e do token) acontece dentro
   * do WebView, via PDF.js.
   */
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

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={buildPdfUrl} />;
  }

  if (!pdfUrl) {
    return (
      <ErrorMessage
        message="PDF não encontrado"
        onRetry={buildPdfUrl}
      />
    );
  }

  // HTML injetado no WebView para carregar o PDF.js e renderizar a 1ª página
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.min.js"></script>
        <style>
          body {
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: ${theme.colors.background};
            overflow: hidden;
          }
          #viewerContainer {
            width: 100vw;
            height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            overflow: hidden;
          }
          #pdfViewer {
            max-width: 100%;
            height: auto;
          }
          #loadingMessage {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #666;
            font-family: system-ui;
          }
          #errorMessage {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #ff4444;
            font-family: system-ui;
            text-align: center;
            padding: 20px;
          }
        </style>
      </head>
      <body>
        <div id="viewerContainer">
          <div id="loadingMessage">Carregando PDF...</div>
          <canvas id="pdfViewer"></canvas>
        </div>
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
              const workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';
              pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

              const loadingTask = pdfjsLib.getDocument({
                url: '${pdfUrl}',
                httpHeaders: {
                  'Authorization': 'Bearer ${token}'
                }
              });

              loadingTask.onProgress = function(progress) {
                if (progress && progress.total) {
                  const percent = (progress.loaded / progress.total) * 100;
                  postMessage('PDF_LOADING_PROGRESS', { percent });
                }
              };

              const pdf = await loadingTask.promise;
              postMessage('PDF_DOCUMENT_LOADED', { numPages: pdf.numPages });

              const page = await pdf.getPage(1);
              const canvas = document.getElementById('pdfViewer');
              const context = canvas.getContext('2d');

              const viewport = page.getViewport({ scale: 1.0 });
              const containerWidth = document.getElementById('viewerContainer').clientWidth;
              const scale = (containerWidth * 0.9) / viewport.width;
              const scaledViewport = page.getViewport({ scale });

              canvas.width = scaledViewport.width;
              canvas.height = scaledViewport.height;

              document.getElementById('loadingMessage').style.display = 'none';

              await page.render({
                canvasContext: context,
                viewport: scaledViewport
              }).promise;

              postMessage('PDF_PAGE_RENDERED', { pageNumber: 1 });
            } catch (error) {
              console.error('Erro ao carregar PDF:', error);
              document.getElementById('loadingMessage').style.display = 'none';

              const errorDiv = document.createElement('div');
              errorDiv.id = 'errorMessage';
              errorDiv.textContent = 'Erro ao carregar o PDF. Por favor, tente novamente.';
              document.getElementById('viewerContainer').appendChild(errorDiv);

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
              case 'PDF_LOADING_PROGRESS':
                logger.info('PDF loading progress', {
                  bookId,
                  percent: data.percent,
                });
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