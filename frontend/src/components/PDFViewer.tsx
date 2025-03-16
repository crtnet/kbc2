import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Platform, Text, ActivityIndicator, TouchableOpacity, Share, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { logger } from '../utils/logger';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

interface PDFViewerProps {
  pdfUrl: string;
  onLoadEnd?: () => void;
  onError?: (error: any) => void;
  bookTitle?: string;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ 
  pdfUrl, 
  onLoadEnd, 
  onError,
  bookTitle = 'Livro' 
}) => {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const maxRetries = 3;

  useEffect(() => {
    logger.info('PDFViewer initialized', { pdfUrl });
    // Reset states when URL changes
    setLoading(true);
    setError(null);
    setRetryCount(0);
    setDownloadProgress(0);
    setIsDownloading(false);
  }, [pdfUrl]);

  const handleLoadEnd = () => {
    logger.info('PDF loaded successfully');
    setLoading(false);
    onLoadEnd?.();
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    const errorMessage = nativeEvent.description || 'Erro ao carregar o PDF';
    
    logger.error('PDF loading error', { 
      error: errorMessage,
      url: pdfUrl,
      retryCount
    });
    
    setLoading(false);
    setError(errorMessage);
    onError?.(nativeEvent);
  };

  const handleRetry = () => {
    if (retryCount < maxRetries) {
      setLoading(true);
      setError(null);
      setRetryCount(prev => prev + 1);
      
      // Force WebView to reload with a new key
      if (webViewRef.current) {
        webViewRef.current.reload();
      }
    } else {
      setError(`Não foi possível carregar o PDF após ${maxRetries} tentativas. Por favor, tente novamente mais tarde.`);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      setDownloadProgress(0);
      
      // Verifica se o compartilhamento está disponível
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Erro', 'O compartilhamento não está disponível neste dispositivo');
        setIsDownloading(false);
        return;
      }
      
      // Nome do arquivo baseado no título do livro
      const safeTitle = bookTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const fileName = `${safeTitle}_${Date.now()}.pdf`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      
      logger.info('Iniciando download do PDF', { pdfUrl, fileUri });
      
      // Download do PDF com progresso
      const downloadResumable = FileSystem.createDownloadResumable(
        pdfUrl,
        fileUri,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          setDownloadProgress(progress);
        }
      );
      
      const { uri } = await downloadResumable.downloadAsync();
      
      if (uri) {
        logger.info('PDF baixado com sucesso', { uri });
        
        // Compartilha o arquivo
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Compartilhar ${bookTitle}`,
          UTI: 'com.adobe.pdf' // para iOS
        });
        
        logger.info('PDF compartilhado com sucesso');
      } else {
        throw new Error('URI do arquivo não disponível após download');
      }
    } catch (error) {
      logger.error('Erro ao baixar/compartilhar PDF', { error });
      Alert.alert(
        'Erro ao baixar PDF',
        'Não foi possível baixar ou compartilhar o PDF. Por favor, tente novamente mais tarde.'
      );
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const handleSharePDF = async () => {
    try {
      await Share.share({
        url: pdfUrl,
        title: `${bookTitle} - PDF`,
        message: `Confira este livro: ${bookTitle}`
      });
      logger.info('Link do PDF compartilhado com sucesso');
    } catch (error) {
      logger.error('Erro ao compartilhar link do PDF', { error });
      Alert.alert(
        'Erro ao compartilhar',
        'Não foi possível compartilhar o link do PDF. Por favor, tente novamente mais tarde.'
      );
    }
  };

  // Adiciona timestamp para evitar cache
  const pdfUrlWithTimestamp = `${pdfUrl}${pdfUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;

  // HTML personalizado para visualização do PDF
  const pdfHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background-color: #f5f5f5;
          }
          iframe, embed, object {
            width: 100%;
            height: 100%;
            border: none;
          }
          .error-container {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100%;
            padding: 20px;
            text-align: center;
            font-family: Arial, sans-serif;
          }
          .error-message {
            color: #d32f2f;
            margin-bottom: 20px;
            font-size: 16px;
          }
          .retry-button {
            background-color: #2196F3;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        ${Platform.OS === 'web' 
          ? `<embed src="${pdfUrlWithTimestamp}" type="application/pdf" />`
          : Platform.OS === 'ios'
            ? `<iframe src="${pdfUrlWithTimestamp}" type="application/pdf"></iframe>`
            : `<object data="${pdfUrlWithTimestamp}" type="application/pdf" width="100%" height="100%"></object>`
        }
      </body>
    </html>
  `;

  // JavaScript para detectar erros de carregamento do PDF
  const injectedJavaScript = `
    window.onerror = function(message, source, lineno, colno, error) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'error',
        message: message,
        source: source
      }));
      return true;
    };
    
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(function() {
        const embedElement = document.querySelector('embed, iframe, object');
        if (embedElement) {
          embedElement.onerror = function(e) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              message: 'Erro ao carregar o elemento PDF'
            }));
          };
        }
        
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'loaded'
        }));
      }, 1000);
    });
    
    true;
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'error') {
        handleError({ nativeEvent: { description: data.message } });
      } else if (data.type === 'loaded') {
        handleLoadEnd();
      }
    } catch (e) {
      logger.error('Error parsing WebView message', { error: e });
    }
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Erro ao carregar o PDF</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        {retryCount < maxRetries && (
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        key={`pdf-viewer-${retryCount}`}
        ref={webViewRef}
        source={{ html: pdfHTML }}
        style={styles.webview}
        originWhitelist={['*']}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        startInLoadingState
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        onMessage={handleMessage}
        injectedJavaScript={injectedJavaScript}
        scalesPageToFit={true}
        bounces={false}
        scrollEnabled={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        allowFileAccessFromFileURLs={true}
        mixedContentMode="always"
        cacheEnabled={true}
        renderToHardwareTextureAndroid={true}
      />
      
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Carregando PDF...</Text>
        </View>
      )}
      
      {!loading && !error && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleDownloadPDF}
            disabled={isDownloading}
          >
            <MaterialIcons name="file-download" size={24} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleSharePDF}
            disabled={isDownloading}
          >
            <MaterialIcons name="share" size={24} color="white" />
          </TouchableOpacity>
        </View>
      )}
      
      {isDownloading && (
        <View style={styles.downloadProgressContainer}>
          <View style={[styles.progressBar, { width: `${downloadProgress * 100}%` }]} />
          <Text style={styles.progressText}>{`${Math.round(downloadProgress * 100)}%`}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    position: 'relative',
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f8f8',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'column',
  },
  actionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(33, 150, 243, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  downloadProgressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    position: 'absolute',
    left: 0,
    top: 0,
  },
  progressText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});