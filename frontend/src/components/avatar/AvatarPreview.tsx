// src/components/avatar/AvatarPreview.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Text,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Image,
  PanResponderGestureState
} from 'react-native';
import { AvatarPart, CustomAvatar } from './AvatarParts';

// Componente simulando LinearGradient para ambientes sem o módulo
const GradientBackdrop: React.FC<{ style?: any }> = ({ children, style }) => (
  <View style={[{ backgroundColor: '#2196F3' }, style]}>
    {children}
  </View>
);

interface AvatarPreviewProps {
  customAvatar: CustomAvatar;
  onRandomize: () => void;
  rotateAnim: Animated.Value;
  scaleAnim: Animated.Value;
  panResponder: any;
  avatarParts: AvatarPart[];
}

const AvatarPreview: React.FC<AvatarPreviewProps> = ({
  customAvatar,
  onRandomize,
  rotateAnim,
  scaleAnim,
  panResponder,
  avatarParts
}) => {
  console.log("Renderizando preview do avatar");

  const [loading, setLoading] = useState(true);
  const [imageLoadErrors, setImageLoadErrors] = useState<{ [key: string]: boolean }>({});

  // Efeito para reiniciar o carregamento quando o avatar muda
  useEffect(() => {
    setLoading(true);
    console.log("Avatar mudou, recarregando preview...");

    // Verifica se temos as partes essenciais: face, eyes e mouth
    const hasFace = customAvatar.face && customAvatar.face.option && 
                    typeof customAvatar.face.option === 'string' && 
                    customAvatar.face.option.startsWith('http');
    const hasEyes = customAvatar.eyes && customAvatar.eyes.option && 
                    typeof customAvatar.eyes.option === 'string' && 
                    customAvatar.eyes.option.startsWith('http');
    const hasMouth = customAvatar.mouth && customAvatar.mouth.option && 
                     typeof customAvatar.mouth.option === 'string' && 
                     customAvatar.mouth.option.startsWith('http');

    if (hasFace && hasEyes && hasMouth) {
      console.log("Avatar tem todas as partes essenciais");

      // Pré-carrega as imagens das partes essenciais
      const partsToPreload = ['face', 'eyes', 'mouth'];
      partsToPreload.forEach(partId => {
        if (customAvatar[partId] && customAvatar[partId].option) {
          const imageUrl = customAvatar[partId].option;
          if (Platform.OS !== 'web') {
            try {
              Image.prefetch(imageUrl).catch(err => 
                console.log(`Erro ao pré-carregar ${imageUrl}:`, err)
              );
            } catch (e) {
              console.log(`Exceção ao pré-carregar ${imageUrl}:`, e);
            }
          }
        }
      });

      // Reseta erros de carregamento
      setImageLoadErrors({});

      // Exibe o avatar após um pequeno atraso
      setTimeout(() => {
        setLoading(false);
      }, 500);
    } else {
      console.log("Avatar está incompleto:",
        hasFace ? "tem rosto" : "sem rosto",
        hasEyes ? "tem olhos" : "sem olhos",
        hasMouth ? "tem boca" : "sem boca");

      // Tenta corrigir partes ausentes (apenas log; atualização real deve ser feita no componente pai)
      let wasUpdated = false;
      if (!hasFace) {
        const facePart = avatarParts.find(part => part.id === 'face');
        if (facePart && facePart.options && facePart.options.length > 0) {
          console.log("Corrigido: adicionado rosto padrão");
          wasUpdated = true;
        }
      }
      if (!hasEyes) {
        const eyesPart = avatarParts.find(part => part.id === 'eyes');
        if (eyesPart && eyesPart.options && eyesPart.options.length > 0) {
          console.log("Corrigido: adicionado olhos padrão");
          wasUpdated = true;
        }
      }
      if (!hasMouth) {
        const mouthPart = avatarParts.find(part => part.id === 'mouth');
        if (mouthPart && mouthPart.options && mouthPart.options.length > 0) {
          console.log("Corrigido: adicionada boca padrão");
          wasUpdated = true;
        }
      }
      if (wasUpdated) {
        console.log("Avatar foi corrigido com partes padrão");
      }
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  }, [customAvatar, avatarParts]);

  // Log para depuração das partes do avatar
  useEffect(() => {
    console.log("Verificando partes do avatar disponíveis:");
    Object.keys(customAvatar).forEach(partId => {
      const part = customAvatar[partId];
      if (part && part.option) {
        console.log(`Parte ${partId}: ${part.option.substring(0, 30)}...`);
      } else {
        console.log(`Parte ${partId}: sem opção definida`);
      }
    });
  }, [customAvatar]);

  // Função para tratar erros no carregamento das imagens
  const handleImageLoadError = (partId: string) => {
    console.error(`Erro ao carregar imagem para parte ${partId}`);
    setImageLoadErrors(prev => ({
      ...prev,
      [partId]: true
    }));
  };

  // Renderiza cada parte do avatar com suas transformações
  const renderAvatarPart = (partId: string) => {
    const part = customAvatar[partId];
    if (!part) {
      console.log(`Parte ${partId} não encontrada no customAvatar`);
      return null;
    }

    const partDef = avatarParts.find(p => p.id === partId);
    if (!partDef) {
      console.log(`Definição da parte ${partId} não encontrada em avatarParts`);
      return null;
    }

    // Caso não haja opção definida, utiliza a primeira opção disponível
    if (!part.option && partDef.options && partDef.options.length > 0) {
      console.log(`Definindo opção padrão para parte ${partId}: ${partDef.options[0].imageUrl}`);
      part.option = partDef.options[0].imageUrl;
    }

    if (!part.option) {
      console.log(`Parte ${partId} não tem opção definida nem opção padrão`);
      return null;
    }

    // Verifica se a URL da opção é válida; se não, utiliza fallback
    if (typeof part.option !== 'string' || !part.option.startsWith('http')) {
      console.error(`URL inválida para parte ${partId}: ${part.option}`);
      if (partDef.options && partDef.options.length > 0) {
        part.option = partDef.options[0].imageUrl;
        console.log(`Usando URL de fallback para ${partId}: ${part.option}`);
      } else {
        return null;
      }
    }

    const hasError = imageLoadErrors[partId];
    const fallbackImageUrl = 'https://cdn-icons-png.flaticon.com/512/1173/1173879.png';
    const imageUrl = hasError ? fallbackImageUrl : part.option;
    const canColorize = partDef?.colorizeOptions;

    // Calcula as transformações baseadas nas propriedades do avatar
    const transforms: any[] = [];
    transforms.push({ scale: part.size !== undefined && !isNaN(part.size) ? part.size : 1 });
    if (part.width !== undefined && !isNaN(part.width)) {
      transforms.push({ scaleX: part.width });
    }
    if (part.height !== undefined && !isNaN(part.height)) {
      transforms.push({ scaleY: part.height });
    }
    if (part.rotation !== undefined && !isNaN(part.rotation)) {
      transforms.push({ rotate: `${part.rotation}deg` });
    }

    const translateY = part.position?.y !== undefined && !isNaN(part.position.y) ? part.position.y : 0;
    const translateX = part.position?.x !== undefined && !isNaN(part.position.x) ? part.position.x : 0;

    let additionalStyle = {};
    if (partId === 'eyes' || partId === 'eyebrows') {
      const spacing = part.spacing !== undefined && !isNaN(part.spacing) ? part.spacing : 1;
      additionalStyle = {
        width: '100%',
        justifyContent: 'space-around',
        paddingHorizontal: 10 * spacing
      };
    }

    let containerStyle = {};
    let imageStyle: any = {
      width: 150,
      height: 150,
      resizeMode: 'contain',
      tintColor: canColorize && part.color ? part.color : undefined,
      transform: transforms
    };

    switch (partId) {
      case 'face':
        containerStyle = { zIndex: 1, position: 'absolute' };
        break;
      case 'hair':
        containerStyle = { 
          zIndex: 10, 
          position: 'absolute',
          top: -20 + translateY,
          transform: [{ translateX }]
        };
        break;
      case 'eyes':
        containerStyle = { 
          zIndex: 5, 
          position: 'absolute',
          top: 50 + translateY,
          transform: [{ translateX }],
          flexDirection: 'row',
          ...additionalStyle
        };
        imageStyle = { ...imageStyle, width: 40, height: 40 };
        // Renderiza dois olhos lado a lado
        return (
          <View style={containerStyle} key={partId}>
            <Animated.Image 
              source={{ uri: imageUrl }} 
              style={imageStyle}
              onError={() => handleImageLoadError(partId)}
            />
            <Animated.Image 
              source={{ uri: imageUrl }} 
              style={imageStyle}
              onError={() => handleImageLoadError(partId)}
            />
          </View>
        );
      case 'eyebrows':
        containerStyle = { 
          zIndex: 6, 
          position: 'absolute',
          top: 30 + translateY,
          transform: [{ translateX }],
          flexDirection: 'row',
          ...additionalStyle
        };
        imageStyle = { ...imageStyle, width: 40, height: 20 };
        // Renderiza duas sobrancelhas lado a lado
        return (
          <View style={containerStyle} key={partId}>
            <Animated.Image 
              source={{ uri: imageUrl }} 
              style={imageStyle} 
              onError={() => handleImageLoadError(partId)}
            />
            <Animated.Image 
              source={{ uri: imageUrl }} 
              style={imageStyle}
              onError={() => handleImageLoadError(partId)}
            />
          </View>
        );
      case 'nose':
        containerStyle = { 
          zIndex: 4, 
          position: 'absolute',
          top: 70 + translateY,
          left: '50%',
          marginLeft: -15 + translateX,
        };
        imageStyle = { ...imageStyle, width: 30, height: 30 };
        break;
      case 'mouth':
        containerStyle = { 
          zIndex: 3, 
          position: 'absolute',
          top: 100 + translateY,
          left: '50%',
          marginLeft: -25 + translateX,
        };
        imageStyle = { ...imageStyle, width: 50, height: 30 };
        break;
      case 'beard':
        const noneBeardOption = avatarParts.find(p => p.id === 'beard')?.options[0]?.imageUrl;
        if (part.option === noneBeardOption) {
          return null;
        }
        containerStyle = { 
          zIndex: 2, 
          position: 'absolute',
          top: 90 + translateY,
          left: '50%',
          marginLeft: -40 + translateX,
        };
        imageStyle = { ...imageStyle, width: 80, height: 60 };
        break;
      case 'glasses':
        const noneGlassesOption = avatarParts.find(p => p.id === 'glasses')?.options[0]?.imageUrl;
        if (part.option === noneGlassesOption) {
          return null;
        }
        containerStyle = { 
          zIndex: 7, 
          position: 'absolute',
          top: 55 + translateY,
          left: '50%',
          marginLeft: -40 + translateX,
        };
        imageStyle = { ...imageStyle, width: 80, height: 30 };
        break;
      case 'accessories':
        const noneAccessoriesOption = avatarParts.find(p => p.id === 'accessories')?.options[0]?.imageUrl;
        if (part.option === noneAccessoriesOption) {
          return null;
        }
        containerStyle = { 
          zIndex: 11, 
          position: 'absolute',
          top: -10 + translateY,
          left: '50%',
          marginLeft: -40 + translateX,
        };
        imageStyle = { ...imageStyle, width: 80, height: 50 };
        break;
      case 'outfit':
        containerStyle = { 
          zIndex: 0, 
          position: 'absolute',
          top: 120,
          left: '50%',
          marginLeft: -75,
        };
        imageStyle = { ...imageStyle, width: 150, height: 100 };
        break;
    }

    return (
      <View key={partId} style={containerStyle}>
        <Animated.Image 
          source={{ uri: imageUrl }} 
          style={imageStyle}
          onError={() => handleImageLoadError(partId)}
        />
      </View>
    );
  };

  return (
    <View style={styles.previewContainer}>
      <GradientBackdrop style={styles.previewBackground}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Carregando avatar...</Text>
          </View>
        ) : (
          <Animated.View 
            style={[
              styles.preview,
              {
                transform: [
                  { 
                    rotate: rotateAnim.interpolate({
                      inputRange: [-10, 10],
                      outputRange: ['-10deg', '10deg']
                    })
                  },
                  { scale: scaleAnim }
                ]
              }
            ]}
            {...panResponder.panHandlers}
          >
            {avatarParts
              .sort((a, b) => a.zIndex - b.zIndex)
              .map(part => renderAvatarPart(part.id))
            }
          </Animated.View>
        )}
        
        <Text style={styles.previewInstructions}>Toque e arraste para girar</Text>
      </GradientBackdrop>
      
      <TouchableOpacity
        style={styles.randomizeButton}
        onPress={onRandomize}
        accessibilityLabel="Gerar avatar aleatório"
      >
        <Text style={styles.randomizeButtonText}>Aleatório</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    position: 'relative',
    width: '100%',
    backgroundColor: '#2196F3'
  },
  previewBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  preview: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ddd',
    overflow: 'visible',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8
  },
  previewInstructions: {
    marginTop: 15,
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2
  },
  randomizeButton: {
    position: 'absolute',
    right: 15,
    bottom: 15,
    backgroundColor: '#FF9800',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 5
  },
  randomizeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 180,
    width: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 3,
    borderColor: '#ddd'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2
  }
});

export default AvatarPreview;