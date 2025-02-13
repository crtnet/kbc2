import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { logger } from '../utils/logger';

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
          }
          iframe, embed {
            width: 100%;
            height: 100%;
            border: none;
          }
        </style>
      </head>
      <body>
        ${Platform.OS === 'web' 
          ? `<embed src="${pdfUrl}" type="application/pdf" />`
          : `<iframe src="${pdfUrl}" type="application/pdf"></iframe>`
        }
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: pdfHTML }}
        style={styles.webview}
        originWhitelist={['*']}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        startInLoadingState
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        scalesPageToFit={true}
        bounces={false}
        scrollEnabled={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
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