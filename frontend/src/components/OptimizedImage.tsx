// src/components/OptimizedImage.tsx

import React, { useState, useEffect } from 'react';
import { Image, ImageProps, ActivityIndicator, View, StyleSheet } from 'react-native';
import { imageOptimizationService } from '../services/imageOptimizationService';

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string } | number;
  width?: number;
  height?: number;
  quality?: number;
  showPlaceholder?: boolean;
  placeholderColor?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  source,
  width = 300,
  height,
  quality = 80,
  showPlaceholder = true,
  placeholderColor = '#f0f0f0',
  style,
  ...props
}) => {
  const [optimizedUri, setOptimizedUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const optimizeImage = async () => {
      try {
        setLoading(true);
        setError(false);
        
        // Se a fonte for um número (recurso local), usa diretamente
        if (typeof source === 'number') {
          if (isMounted) {
            setOptimizedUri(null); // Usa a fonte original para recursos locais
            setLoading(false);
          }
          return;
        }
        
        // Se a fonte for um objeto com URI
        if (source && typeof source === 'object' && 'uri' in source && source.uri) {
          const uri = source.uri;
          
          // Pula otimização para data URIs e recursos locais
          if (uri.startsWith('data:') || uri.startsWith('file:')) {
            if (isMounted) {
              setOptimizedUri(uri);
              setLoading(false);
            }
            return;
          }
          
          // Otimiza a imagem
          const optimized = await imageOptimizationService.getOptimizedImage(uri, {
            width,
            height,
            quality
          });
          
          if (isMounted) {
            setOptimizedUri(optimized);
            setLoading(false);
          }
        } else {
          // Fonte inválida
          if (isMounted) {
            setError(true);
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Erro ao otimizar imagem:', err);
        if (isMounted) {
          setError(true);
          setLoading(false);
          
          // Em caso de erro, tenta usar a URI original
          if (typeof source === 'object' && 'uri' in source) {
            setOptimizedUri(source.uri);
          }
        }
      }
    };
    
    optimizeImage();
    
    return () => {
      isMounted = false;
    };
  }, [typeof source === 'object' && 'uri' in source ? source.uri : source, width, height, quality]);

  // Calcula as dimensões finais para o estilo
  const finalStyle = [
    style,
    width && { width },
    height && { height }
  ];

  // Se estiver carregando e showPlaceholder for true, mostra um placeholder
  if (loading && showPlaceholder) {
    return (
      <View 
        style={[
          styles.placeholder, 
          { backgroundColor: placeholderColor },
          width && { width },
          height && { height },
          style
        ]}
      >
        <ActivityIndicator size="small" color="#999" />
      </View>
    );
  }

  // Se ocorreu um erro e showPlaceholder for true, mostra um placeholder de erro
  if (error && showPlaceholder) {
    return (
      <View 
        style={[
          styles.placeholder, 
          { backgroundColor: '#ffeeee' },
          width && { width },
          height && { height },
          style
        ]}
      />
    );
  }

  // Se for um recurso local (número), usa diretamente
  if (typeof source === 'number') {
    return <Image source={source} style={finalStyle} {...props} />;
  }

  // Se tiver uma URI otimizada, usa ela
  if (optimizedUri) {
    return <Image source={{ uri: optimizedUri }} style={finalStyle} {...props} />;
  }

  // Fallback para a URI original
  return <Image source={source} style={finalStyle} {...props} />;
};

const styles = StyleSheet.create({
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  }
});

export default OptimizedImage;