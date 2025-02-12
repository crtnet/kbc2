import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import WebView from 'react-native-webview';
import { API_URL } from '@env';

interface PDFViewerProps {
  pdfUrl: string;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ pdfUrl }) => {
  const webViewRef = useRef<WebView>(null);

  // HTML para renderizar o PDF com efeito flip page
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdnjs.cloudflare.com/ajax/libs/turn.js/4.1.0/turn.min.js"></script>
      <style>
        body, html {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        #flipbook {
          width: 100%;
          height: 100%;
        }
        .page {
          background-color: white;
        }
        .page-wrapper {
          -webkit-perspective: 2000px;
          perspective: 2000px;
        }
      </style>
    </head>
    <body>
      <div id="flipbook"></div>
      <script>
        const pdfUrl = '${API_URL}${pdfUrl}';
        
        // Carregar o PDF usando PDF.js
        pdfjsLib.getDocument(pdfUrl).promise.then(function(pdf) {
          const numPages = pdf.numPages;
          const flipbook = document.getElementById('flipbook');
          
          // Criar páginas
          for(let i = 1; i <= numPages; i++) {
            const page = document.createElement('div');
            page.className = 'page';
            flipbook.appendChild(page);
            
            // Renderizar página do PDF
            pdf.getPage(i).then(function(pdfPage) {
              const canvas = document.createElement('canvas');
              page.appendChild(canvas);
              
              const scale = 1.5;
              const viewport = pdfPage.getViewport({ scale });
              
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              
              const context = canvas.getContext('2d');
              const renderContext = {
                canvasContext: context,
                viewport: viewport
              };
              
              pdfPage.render(renderContext);
            });
          }
          
          // Inicializar turn.js
          $(flipbook).turn({
            width: window.innerWidth,
            height: window.innerHeight,
            autoCenter: true,
            display: 'double',
            acceleration: true,
            gradients: true,
            elevation: 50,
            when: {
              turning: function(e, page, view) {
                const book = $(this);
                if (book.turn('is')) {
                  e.preventDefault();
                }
              }
            }
          });
          
          // Ajustar tamanho ao redimensionar
          window.addEventListener('resize', function() {
            $(flipbook).turn('size', window.innerWidth, window.innerHeight);
          });
        });
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView error: ', nativeEvent);
        }}
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

export default PDFViewer;