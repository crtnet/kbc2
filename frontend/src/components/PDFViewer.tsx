import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';
import { logger } from '../utils/logger';

const API_URL = Constants.manifest?.extra?.apiUrl || 'http://localhost:3000';

interface PDFViewerProps {
  pdfUrl: string;
  onLoadEnd?: () => void;
  onError?: (error: any) => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ 
  pdfUrl, 
  onLoadEnd, 
  onError 
}) => {
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    logger.info('PDFViewer initialized', { pdfUrl });
  }, [pdfUrl]);

  const handleLoadEnd = () => {
    logger.info('PDF loaded successfully');
    onLoadEnd?.();
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    logger.error('PDF loading error', { 
      error: nativeEvent.description,
      url: pdfUrl 
    });
    onError?.(nativeEvent);
  };

  // URL para renderizar PDF no navegador
  const pdfViewerUrl = Platform.select({
    web: pdfUrl,
    default: `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`
  });

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: pdfViewerUrl }}
        style={styles.webview}
        originWhitelist={['*']}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        startInLoadingState
        onLoadEnd={handleLoadEnd}
        onError={handleError}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  webview: {
    flex: 1,
  },
});