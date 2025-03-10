// src/components/avatar/AvatarPreview.tsx
import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  Text,
  TouchableOpacity,
  Platform,
  ActivityIndicator
} from 'react-native';
import { AvatarPart } from './AvatarParts';

// Componente simulando LinearGradient para ambientes sem o módulo
const GradientBackdrop = ({ children, style }) => (
  <View style={[{ backgroundColor: '#2196F3' }, style]}>
    {children}
  </View>
);

interface AvatarPreviewProps {
  customAvatar: any;
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
  
  // Estado para controlar carregamento de imagens
  const [loading, setLoading] = useState(true);
  const [imageLoadErrors, setImageLoadErrors] = useState<{[key: string]: boolean}>({});
  
  // Efeito melhorado para resetar carregamento quando o avatar muda
  useEffect(() => {
    setLoading(true);
    console.log("Avatar mudou, recarregando preview...");
    
    // Verificar se temos as partes essenciais
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
      
      // Pré-carregar imagens
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
      
      // Resetar erros de carregamento
      setImageLoadErrors({});
      
      // Mostrar o avatar após um pequeno atraso
      setTimeout(() => {
        setLoading(false);
      }, 500);
    } else {
      console.log("Avatar está incompleto:", 
        hasFace ? "tem rosto" : "sem rosto", 
        hasEyes ? "tem olhos" : "sem olhos", 
        hasMouth ? "tem boca" : "sem boca");
      
      // Tentar corrigir partes ausentes
      const updatedAvatar = { ...customAvatar };
      let wasUpdated = false;
      
      if (!hasFace) {
        const facePart = avatarParts.find(part => part.id === 'face');
        if (facePart && facePart.options && facePart.options.length > 0) {
          updatedAvatar.face = {
            ...updatedAvatar.face,
            option: facePart.options[0].imageUrl
          };
          wasUpdated = true;
          console.log("Corrigido: adicionado rosto padrão");
        }
      }
      
      if (!hasEyes) {
        const eyesPart = avatarParts.find(part => part.id === 'eyes');
        if (eyesPart && eyesPart.options && eyesPart.options.length > 0) {
          updatedAvatar.eyes = {
            ...updatedAvatar.eyes,
            option: eyesPart.options[0].imageUrl
          };
          wasUpdated = true;
          console.log("Corrigido: adicionado olhos padrão");
        }
      }
      
      if (!hasMouth) {
        const mouthPart = avatarParts.find(part => part.id === 'mouth');
        if (mouthPart && mouthPart.options && mouthPart.options.length > 0) {
          updatedAvatar.mouth = {
            ...updatedAvatar.mouth,
            option: mouthPart.options[0].imageUrl
          };
          wasUpdated = true;
          console.log("Corrigido: adicionada boca padrão");
        }
      }
      
      // Se houve correções, atualizar o avatar
      if (wasUpdated) {
        // Não podemos atualizar diretamente o customAvatar, então apenas logamos
        console.log("Avatar foi corrigido com partes padrão");
      }
      
      // Mostrar o avatar após um pequeno atraso
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  }, [customAvatar, avatarParts]);

  // Para debug, vamos verificar quais partes temos
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
  
  // Função para tratar erros de carregamento de imagem
  const handleImageLoadError = (partId: string) => {
    console.error(`Erro ao carregar imagem para parte ${partId}`);
    setImageLoadErrors(prev => ({
      ...prev,
      [partId]: true
    }));
  };
  
  // Função melhorada para renderizar cada parte do avatar com suas transformações
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
    
    // Se não houver opção definida, usamos a primeira das opções disponíveis
    if (!part.option && partDef.options && partDef.options.length > 0) {
      console.log(`Definindo opção padrão para parte ${partId}: ${partDef.options[0].imageUrl}`);
      part.option = partDef.options[0].imageUrl;
    }
    
    if (!part.option) {
      console.log(`Parte ${partId} não tem opção definida nem opção padrão`);
      return null;
    }
    
    // Verificar se a URL da opção é válida
    if (typeof part.option !== 'string' || !part.option.startsWith('http')) {
      console.error(`URL inválida para parte ${partId}: ${part.option}`);
      
      // Tentar usar a primeira opção disponível como fallback
      if (partDef.options && partDef.options.length > 0) {
        part.option = partDef.options[0].imageUrl;
        console.log(`Usando URL de fallback para ${partId}: ${part.option}`);
      } else {
        return null; // Não podemos renderizar esta parte
      }
    }
    
    // Verificar se esta imagem teve erro de carregamento
    const hasError = imageLoadErrors[partId];
    
    // URL de fallback para caso de erro
    const fallbackImageUrl = 'https://cdn-icons-png.flaticon.com/512/1173/1173879.png';
    const imageUrl = hasError ? fallbackImageUrl : part.option;
    
    const canColorize = partDef?.colorizeOptions;
    
    // Calcular transformações com base nas propriedades do avatar
    const transforms = [];
    
    // Escala
    if (part.size !== undefined && !isNaN(part.size)) {
      transforms.push({ scale: part.size });
    } else {
      transforms.push({ scale: 1 }); // Valor padrão
    }
    
    // Largura (se disponível)
    if (part.width !== undefined && !isNaN(part.width)) {
      transforms.push({ scaleX: part.width });
    }
    
    // Altura (se disponível)
    if (part.height !== undefined && !isNaN(part.height)) {
      transforms.push({ scaleY: part.height });
    }
    
    // Rotação (se disponível)
    if (part.rotation !== undefined && !isNaN(part.rotation)) {
      transforms.push({ rotate: `${part.rotation}deg` });
    }
    
    // Posição
    const translateY = part.position?.y !== undefined && !isNaN(part.position.y) ? part.position.y : 0;
    const translateX = part.position?.x !== undefined && !isNaN(part.position.x) ? part.position.x : 0;
    
    // Espaçamento para olhos e sobrancelhas
    let additionalStyle = {};
    if (partId === 'eyes' || partId === 'eyebrows') {
      const spacing = part.spacing !== undefined && !isNaN(part.spacing) ? part.spacing : 1;
      additionalStyle = {
        width: '100%',
        justifyContent: 'space-around',
        paddingHorizontal: 10 * spacing
      };
    }
    
    // Estilo específico para cada tipo de parte
    let containerStyle = {};
    let imageStyle = {
      width: 150,
      height: 150,
      resizeMode: 'contain' as 'contain',
      tintColor: canColorize && part.color ? part.color : undefined,
      transform: transforms
    };
    
    // Posicionamento específico para cada parte
    switch (partId) {
      case 'face':
        containerStyle = { zIndex: 1, position: 'absolute' as 'absolute' };
        break;
      case 'hair':
        containerStyle = { 
          zIndex: 10, 
          position: 'absolute' as 'absolute',
          top: -20 + translateY,
          transform: [{ translateX }]
        };
        break;
      case 'eyes':
        containerStyle = { 
          zIndex: 5, 
          position: 'absolute' as 'absolute',
          top: 50 + translateY,
          transform: [{ translateX }],
          flexDirection: 'row' as 'row',
          ...additionalStyle
        };
        imageStyle = {
          ...imageStyle,
          width: 40,
          height: 40
        };
        // Renderizar dois olhos lado a lado
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
          position: 'absolute' as 'absolute',
          top: 30 + translateY,
          transform: [{ translateX }],
          flexDirection: 'row' as 'row',
          ...additionalStyle
        };
        imageStyle = {
          ...imageStyle,
          width: 40,
          height: 20
        };
        // Renderizar duas sobrancelhas lado a lado
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
          position: 'absolute' as 'absolute',
          top: 70 + translateY,
          left: '50%',
          marginLeft: -15 + translateX,
        };
        imageStyle = {
          ...imageStyle,
          width: 30,
          height: 30
        };
        break;
      case 'mouth':
        containerStyle = { 
          zIndex: 3, 
          position: 'absolute' as 'absolute',
          top: 100 + translateY,
          left: '50%',
          marginLeft: -25 + translateX,
        };
        imageStyle = {
          ...imageStyle,
          width: 50,
          height: 30
        };
        break;
      case 'beard':
        // Verificar se "Nenhuma" está selecionado
        const noneBeardOption = avatarParts.find(p => p.id === 'beard')?.options[0]?.imageUrl;
        if (part.option === noneBeardOption) {
          return null; // Não renderizar se for "Nenhuma"
        }
        containerStyle = { 
          zIndex: 2, 
          position: 'absolute' as 'absolute',
          top: 90 + translateY,
          left: '50%',
          marginLeft: -40 + translateX,
        };
        imageStyle = {
          ...imageStyle,
          width: 80,
          height: 60
        };
        break;
      case 'glasses':
        // Verificar se "Nenhum" está selecionado
        const noneGlassesOption = avatarParts.find(p => p.id === 'glasses')?.options[0]?.imageUrl;
        if (part.option === noneGlassesOption) {
          return null; // Não renderizar se for "Nenhum"
        }
        containerStyle = { 
          zIndex: 7, 
          position: 'absolute' as 'absolute',
          top: 55 + translateY,
          left: '50%',
          marginLeft: -40 + translateX,
        };
        imageStyle = {
          ...imageStyle,
          width: 80,
          height: 30
        };
        break;
      case 'accessories':
        // Verificar se "Nenhum" está selecionado
        const noneAccessoriesOption = avatarParts.find(p => p.id === 'accessories')?.options[0]?.imageUrl;
        if (part.option === noneAccessoriesOption) {
          return null; // Não renderizar se for "Nenhum"
        }
        containerStyle = { 
          zIndex: 11, 
          position: 'absolute' as 'absolute',
          top: -10 + translateY,
          left: '50%',
          marginLeft: -40 + translateX,
        };
        imageStyle = {
          ...imageStyle,
          width: 80,
          height: 50
        };
        break;
      case 'outfit':
        containerStyle = { 
          zIndex: 0, 
          position: 'absolute' as 'absolute',
          top: 120,  // Ajustado para baixo
          left: '50%',
          marginLeft: -75,
        };
        imageStyle = {
          ...imageStyle,
          width: 150,
          height: 100
        };
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
                      outputRange: ['-10deg', '10deg'] // Reativada a rotação para melhor experiência
                    })
                  },
                  { scale: scaleAnim }
                ]
              }
            ]}
            {...panResponder.panHandlers}
          >
            {/* Renderizar todas as partes do avatar em ordem de camadas */}
            {avatarParts.sort((a, b) => a.zIndex - b.zIndex).map(part => 
              renderAvatarPart(part.id)
            )}
          </Animated.View>
        )}
        
        <Text style={styles.previewInstructions}>Toque e arraste para girar</Text>
      </GradientBackdrop>
      
      {/* Botão de aleatorização */}
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
    overflow: 'visible',  // Importante: permite que partes fiquem visíveis fora do círculo
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