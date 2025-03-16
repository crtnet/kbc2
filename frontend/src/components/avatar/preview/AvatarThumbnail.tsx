// src/components/avatar/preview/AvatarThumbnail.tsx
import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { AVATAR_PARTS, CustomAvatar, INITIAL_CUSTOM_AVATAR } from '../AvatarParts';

interface AvatarThumbnailProps {
  avatarIdentifier: string;
  size?: number;
  style?: any;
  onDescriptionGenerated?: (description: string) => void;
}

const AvatarThumbnail: React.FC<AvatarThumbnailProps> = ({ 
  avatarIdentifier, 
  size = 60,
  style = {},
  onDescriptionGenerated
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
      
      // Gerar descrição do avatar
      if (onDescriptionGenerated) {
        const description = generateAvatarDescription(restoredAvatar);
        onDescriptionGenerated(description);
      }
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

  // Gera uma descrição detalhada do avatar com base nas partes selecionadas
  const generateAvatarDescription = (avatar: CustomAvatar): string => {
    let description = '';
    
    // Adiciona descrição do rosto
    if (avatar.face && avatar.face.option) {
      const faceOption = AVATAR_PARTS.find(p => p.id === 'face')?.options.find(
        o => o.imageUrl === avatar.face.option
      );
      if (faceOption?.description) {
        description += faceOption.description + ' ';
      }
    }
    
    // Adiciona descrição dos olhos
    if (avatar.eyes && avatar.eyes.option) {
      const eyesOption = AVATAR_PARTS.find(p => p.id === 'eyes')?.options.find(
        o => o.imageUrl === avatar.eyes.option
      );
      if (eyesOption?.description) {
        description += eyesOption.description + ' ';
      }
    }
    
    // Adiciona descrição da boca
    if (avatar.mouth && avatar.mouth.option) {
      const mouthOption = AVATAR_PARTS.find(p => p.id === 'mouth')?.options.find(
        o => o.imageUrl === avatar.mouth.option
      );
      if (mouthOption?.description) {
        description += mouthOption.description + ' ';
      }
    }
    
    // Adiciona descrição do nariz
    if (avatar.nose && avatar.nose.option) {
      const noseOption = AVATAR_PARTS.find(p => p.id === 'nose')?.options.find(
        o => o.imageUrl === avatar.nose.option
      );
      if (noseOption?.description) {
        description += noseOption.description + ' ';
      }
    }
    
    // Adiciona descrição das sobrancelhas
    if (avatar.eyebrows && avatar.eyebrows.option) {
      const eyebrowsOption = AVATAR_PARTS.find(p => p.id === 'eyebrows')?.options.find(
        o => o.imageUrl === avatar.eyebrows.option
      );
      if (eyebrowsOption?.description) {
        description += eyebrowsOption.description + ' ';
      }
    }
    
    // Adiciona descrição do cabelo
    if (avatar.hair && avatar.hair.option) {
      // Verifica se não é a opção "nenhum"
      const noneOption = AVATAR_PARTS.find(p => p.id === 'hair')?.options[0]?.imageUrl;
      if (avatar.hair.option !== noneOption) {
        const hairOption = AVATAR_PARTS.find(p => p.id === 'hair')?.options.find(
          o => o.imageUrl === avatar.hair.option
        );
        if (hairOption?.description) {
          description += hairOption.description + ' ';
        }
        
        // Adiciona cor do cabelo se disponível
        if (avatar.hair.color) {
          const colorName = getColorName(avatar.hair.color);
          if (colorName) {
            description += `Cabelo na cor ${colorName}. `;
          }
        }
      }
    }
    
    // Adiciona descrição da barba
    if (avatar.beard && avatar.beard.option) {
      // Verifica se não é a opção "nenhum"
      const noneOption = AVATAR_PARTS.find(p => p.id === 'beard')?.options[0]?.imageUrl;
      if (avatar.beard.option !== noneOption) {
        const beardOption = AVATAR_PARTS.find(p => p.id === 'beard')?.options.find(
          o => o.imageUrl === avatar.beard.option
        );
        if (beardOption?.description) {
          description += beardOption.description + ' ';
        }
        
        // Adiciona cor da barba se disponível
        if (avatar.beard.color) {
          const colorName = getColorName(avatar.beard.color);
          if (colorName) {
            description += `Barba na cor ${colorName}. `;
          }
        }
      }
    }
    
    // Adiciona descrição dos óculos
    if (avatar.glasses && avatar.glasses.option) {
      // Verifica se não é a opção "nenhum"
      const noneOption = AVATAR_PARTS.find(p => p.id === 'glasses')?.options[0]?.imageUrl;
      if (avatar.glasses.option !== noneOption) {
        const glassesOption = AVATAR_PARTS.find(p => p.id === 'glasses')?.options.find(
          o => o.imageUrl === avatar.glasses.option
        );
        if (glassesOption?.description) {
          description += glassesOption.description + ' ';
        }
      }
    }
    
    // Adiciona descrição dos acessórios
    if (avatar.accessories && avatar.accessories.option) {
      // Verifica se não é a opção "nenhum"
      const noneOption = AVATAR_PARTS.find(p => p.id === 'accessories')?.options[0]?.imageUrl;
      if (avatar.accessories.option !== noneOption) {
        const accessoriesOption = AVATAR_PARTS.find(p => p.id === 'accessories')?.options.find(
          o => o.imageUrl === avatar.accessories.option
        );
        if (accessoriesOption?.description) {
          description += accessoriesOption.description + ' ';
        }
      }
    }
    
    // Adiciona descrição da roupa
    if (avatar.outfit && avatar.outfit.option) {
      const outfitOption = AVATAR_PARTS.find(p => p.id === 'outfit')?.options.find(
        o => o.imageUrl === avatar.outfit.option
      );
      if (outfitOption?.description) {
        description += outfitOption.description + ' ';
        
        // Adiciona cor da roupa se disponível
        if (avatar.outfit.color) {
          const colorName = getColorName(avatar.outfit.color);
          if (colorName) {
            description += `Roupa na cor ${colorName}. `;
          }
        }
      }
    }
    
    // Adiciona uma frase final para garantir que a descrição seja completa
    description += "Mantenha esta aparência exata em todas as ilustrações para consistência visual.";
    
    return description.trim();
  };
  
  // Função auxiliar para obter nome da cor a partir do código hexadecimal
  const getColorName = (hexColor: string): string | null => {
    const colorMap: {[key: string]: string} = {
      '#FF4D4D': 'vermelha',
      '#4CAF50': 'verde',
      '#2196F3': 'azul',
      '#FFC107': 'amarela',
      '#9C27B0': 'roxa',
      '#FF9800': 'laranja',
      '#795548': 'marrom',
      '#9E9E9E': 'cinza',
      '#000000': 'preta',
      '#FFFFFF': 'branca',
      '#FFE0B2': 'pele clara',
      '#FFCC80': 'pele média',
      '#D2B48C': 'pele morena',
      '#A0522D': 'pele escura',
      '#FFF176': 'loira',
      '#8D6E63': 'castanha',
      '#FF7043': 'ruiva',
      '#424242': 'preta',
      '#B0BEC5': 'grisalha'
    };
    
    return colorMap[hexColor] || null;
  };

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