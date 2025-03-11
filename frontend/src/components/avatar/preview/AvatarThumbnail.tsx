// src/components/avatar/preview/AvatarThumbnail.tsx
import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { AVATAR_PARTS, CustomAvatar, INITIAL_CUSTOM_AVATAR } from '../AvatarParts';

interface AvatarThumbnailProps {
  avatarIdentifier: string;
  size?: number;
  style?: any;
}

const AvatarThumbnail: React.FC<AvatarThumbnailProps> = ({ 
  avatarIdentifier, 
  size = 60,
  style = {}
}) => {
  const [loading, setLoading] = useState(true);
  const [customAvatar, setCustomAvatar] = useState<CustomAvatar | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!avatarIdentifier) {
      setLoading(false);
      return;
    }

    // Se não for um avatar customizado, apenas use a URL diretamente
    if (!avatarIdentifier.startsWith('CUSTOM||')) {
      setFallbackUrl(avatarIdentifier);
      setLoading(false);
      return;
    }

    try {
      // Extrair dados do avatar customizado
      const parts = avatarIdentifier.split('||CUSTOM_AVATAR_DATA||');
      if (parts.length !== 2) {
        console.error('Formato de avatar inválido');
        setFallbackUrl(parts[0].replace('CUSTOM||', ''));
        setLoading(false);
        return;
      }

      const faceUrl = parts[0].replace('CUSTOM||', '');
      setFallbackUrl(faceUrl); // Usar a URL da face como fallback

      const avatarJsonStr = parts[1];
      const avatarData = JSON.parse(avatarJsonStr);

      if (!avatarData.parts || !Array.isArray(avatarData.parts)) {
        console.error('Dados de avatar inválidos');
        setLoading(false);
        return;
      }

      // Reconstruir o objeto de avatar customizado
      const restoredAvatar = { ...INITIAL_CUSTOM_AVATAR };
      avatarData.parts.forEach((part: any) => {
        if (part.partId && part.option) {
          restoredAvatar[part.partId] = {
            option: part.option,
            color: part.color || restoredAvatar[part.partId]?.color,
            size: part.size !== undefined ? part.size : 1,
            position: part.position || { x: 0, y: 0 },
            width: part.width,
            height: part.height,
            spacing: part.spacing,
            rotation: part.rotation,
            density: part.density
          };
        }
      });

      setCustomAvatar(restoredAvatar);
    } catch (error) {
      console.error('Erro ao processar avatar:', error);
      if (avatarIdentifier.includes('||')) {
        setFallbackUrl(avatarIdentifier.split('||')[0].replace('CUSTOM||', ''));
      } else {
        setFallbackUrl(avatarIdentifier);
      }
    } finally {
      setLoading(false);
    }
  }, [avatarIdentifier]);

  // Renderiza cada parte do avatar
  const renderAvatarPart = (partId: string) => {
    if (!customAvatar) return null;
    
    const part = customAvatar[partId];
    if (!part || !part.option) return null;

    const partDef = AVATAR_PARTS.find(p => p.id === partId);
    if (!partDef) return null;

    // Verificar se é uma opção "none" (sem item)
    if (partId !== 'face' && partId !== 'eyes' && partId !== 'mouth') {
      const noneOption = AVATAR_PARTS.find(p => p.id === partId)?.options[0]?.imageUrl;
      if (part.option === noneOption) {
        return null;
      }
    }

    // Calcular transformações
    const transforms: any[] = [];
    transforms.push({ scale: part.size !== undefined ? part.size : 1 });
    if (part.width !== undefined) transforms.push({ scaleX: part.width });
    if (part.height !== undefined) transforms.push({ scaleY: part.height });
    if (part.rotation !== undefined) transforms.push({ rotate: `${part.rotation}deg` });

    const translateY = part.position?.y !== undefined ? part.position.y / 3 : 0;
    const translateX = part.position?.x !== undefined ? part.position.x / 3 : 0;

    let containerStyle = {};
    let imageStyle: any = {
      width: size * 0.8,
      height: size * 0.8,
      resizeMode: 'contain',
      tintColor: partDef.colorizeOptions && part.color ? part.color : undefined,
      transform: transforms
    };

    // Posicionamento específico para cada parte
    switch (partId) {
      case 'face':
        containerStyle = { zIndex: 1, position: 'absolute' };
        break;
      case 'hair':
        containerStyle = { 
          zIndex: 10, 
          position: 'absolute',
          top: -size * 0.1 + translateY,
          transform: [{ translateX }]
        };
        break;
      case 'eyes':
        containerStyle = { 
          zIndex: 5, 
          position: 'absolute',
          top: size * 0.25 + translateY,
          transform: [{ translateX }],
          flexDirection: 'row',
          width: '100%',
          justifyContent: 'space-around',
          paddingHorizontal: 5 * (part.spacing || 1)
        };
        imageStyle = { ...imageStyle, width: size * 0.2, height: size * 0.2 };
        // Renderiza dois olhos lado a lado
        return (
          <View style={containerStyle} key={partId}>
            <Image source={{ uri: part.option }} style={imageStyle} />
            <Image source={{ uri: part.option }} style={imageStyle} />
          </View>
        );
      case 'eyebrows':
        containerStyle = { 
          zIndex: 6, 
          position: 'absolute',
          top: size * 0.15 + translateY,
          transform: [{ translateX }],
          flexDirection: 'row',
          width: '100%',
          justifyContent: 'space-around',
          paddingHorizontal: 5 * (part.spacing || 1)
        };
        imageStyle = { ...imageStyle, width: size * 0.2, height: size * 0.1 };
        // Renderiza duas sobrancelhas lado a lado
        return (
          <View style={containerStyle} key={partId}>
            <Image source={{ uri: part.option }} style={imageStyle} />
            <Image source={{ uri: part.option }} style={imageStyle} />
          </View>
        );
      case 'nose':
        containerStyle = { 
          zIndex: 4, 
          position: 'absolute',
          top: size * 0.35 + translateY,
          left: '50%',
          marginLeft: -size * 0.075 + translateX,
        };
        imageStyle = { ...imageStyle, width: size * 0.15, height: size * 0.15 };
        break;
      case 'mouth':
        containerStyle = { 
          zIndex: 3, 
          position: 'absolute',
          top: size * 0.5 + translateY,
          left: '50%',
          marginLeft: -size * 0.125 + translateX,
        };
        imageStyle = { ...imageStyle, width: size * 0.25, height: size * 0.15 };
        break;
      case 'beard':
        containerStyle = { 
          zIndex: 2, 
          position: 'absolute',
          top: size * 0.45 + translateY,
          left: '50%',
          marginLeft: -size * 0.2 + translateX,
        };
        imageStyle = { ...imageStyle, width: size * 0.4, height: size * 0.3 };
        break;
      case 'glasses':
        containerStyle = { 
          zIndex: 7, 
          position: 'absolute',
          top: size * 0.275 + translateY,
          left: '50%',
          marginLeft: -size * 0.2 + translateX,
        };
        imageStyle = { ...imageStyle, width: size * 0.4, height: size * 0.15 };
        break;
      case 'accessories':
        containerStyle = { 
          zIndex: 11, 
          position: 'absolute',
          top: -size * 0.05 + translateY,
          left: '50%',
          marginLeft: -size * 0.2 + translateX,
        };
        imageStyle = { ...imageStyle, width: size * 0.4, height: size * 0.25 };
        break;
      case 'outfit':
        containerStyle = { 
          zIndex: 0, 
          position: 'absolute',
          top: size * 0.6,
          left: '50%',
          marginLeft: -size * 0.375,
        };
        imageStyle = { ...imageStyle, width: size * 0.75, height: size * 0.5 };
        break;
    }

    return (
      <View key={partId} style={containerStyle}>
        <Image source={{ uri: part.option }} style={imageStyle} />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { width: size, height: size }, style]}>
        <ActivityIndicator size="small" color="#2196F3" />
      </View>
    );
  }

  // Se temos um avatar customizado, renderize todas as partes
  if (customAvatar) {
    return (
      <View style={[styles.container, { width: size, height: size }, style]}>
        {AVATAR_PARTS
          .sort((a, b) => a.zIndex - b.zIndex)
          .map(part => renderAvatarPart(part.id))
        }
      </View>
    );
  }

  // Fallback para avatar simples (não customizado)
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Image 
        source={{ uri: fallbackUrl || 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png' }} 
        style={styles.fallbackImage} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 100,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
    position: 'relative'
  },
  fallbackImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  }
});

export default AvatarThumbnail;