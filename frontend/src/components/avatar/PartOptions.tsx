// src/components/avatar/PartOptions.tsx
import React, { useMemo, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
  ActivityIndicator,
  Dimensions,
  Platform
} from 'react-native';
import { AvatarPart, CustomAvatar } from './AvatarParts';

interface PartOptionsProps {
  currentPartCategory: string;
  customAvatar: CustomAvatar;
  avatarParts: AvatarPart[];
  onSelectPartOption: (partId: string, optionUrl: string) => void;
}

const PartOptions: React.FC<PartOptionsProps> = ({
  currentPartCategory,
  customAvatar,
  avatarParts,
  onSelectPartOption
}) => {
  // Estado para controle do carregamento de imagens e erros
  const [loadingImages, setLoadingImages] = useState<boolean>(true);
  const [imageLoadErrors, setImageLoadErrors] = useState<{ [key: string]: boolean }>({});

  // Obtém a definição da parte atual baseada na categoria selecionada
  const currentPart = useMemo(() => {
    return avatarParts.find(part => part.id === currentPartCategory);
  }, [avatarParts, currentPartCategory]);

  // Efeito para pré-carregar imagens e resetar erros quando a categoria muda
  useEffect(() => {
    console.log(`Renderizando opções para: ${currentPartCategory}`);
    if (currentPart) {
      console.log(`Opções disponíveis: ${currentPart.options?.length || 0}`);
      setLoadingImages(true);

      // Exibe algumas das primeiras opções para debug
      if (currentPart.options && currentPart.options.length > 0) {
        console.log("Primeiras 3 opções disponíveis:");
        currentPart.options.slice(0, 3).forEach(option => {
          console.log(`- ${option.name}: ${option.imageUrl}`);
        });
      }

      // Verifica a opção atual do avatar
      const currentOption = customAvatar[currentPartCategory]?.option;
      console.log(`Opção atual para ${currentPartCategory}: ${currentOption ? currentOption.substring(0, 30) + '...' : 'nenhuma'}`);

      // Se a opção atual não for válida, loga o erro (a atualização do avatar deve ser feita no componente pai)
      if (currentOption && typeof currentOption === 'string' && !currentOption.startsWith('http')) {
        console.error(`Opção atual para ${currentPartCategory} tem URL inválida: ${currentOption}`);
        if (currentPart.options && currentPart.options.length > 0) {
          const validOption = currentPart.options[0].imageUrl;
          console.log(`Recomendado atualizar ${currentPartCategory} para ${validOption}`);
        }
      }

      // Pré-carrega imagens para todas as opções, se possível
      if (currentPart.options && currentPart.options.length > 0) {
        currentPart.options.forEach(option => {
          if (Platform.OS !== 'web') {
            try {
              Image.prefetch(option.imageUrl).catch(err =>
                console.log(`Erro ao pré-carregar ${option.imageUrl}:`, err)
              );
            } catch (e) {
              console.log(`Exceção ao pré-carregar ${option.imageUrl}:`, e);
            }
          }
        });
      }

      // Dá um pequeno delay para atualizar a UI
      setTimeout(() => {
        setLoadingImages(false);
      }, 500);

      // Reseta os erros de imagem quando a categoria muda
      setImageLoadErrors({});
    }
  }, [currentPartCategory, currentPart, customAvatar]);

  if (!currentPart) {
    console.log('PartOptions: currentPart não está definido');
    return (
      <View style={styles.noOptionsContainer}>
        <Text style={styles.noOptionsText}>Categoria não encontrada</Text>
      </View>
    );
  }

  if (!currentPart.options || currentPart.options.length === 0) {
    console.log('PartOptions: Sem opções disponíveis');
    return (
      <View style={styles.noOptionsContainer}>
        <Text style={styles.noOptionsText}>Nenhuma opção disponível para esta categoria</Text>
      </View>
    );
  }

  console.log(`PartOptions: Renderizando ${currentPart.options.length} opções para ${currentPartCategory}`);

  // Função para renderizar cada opção
  const renderOptionItem = (item: { id: string; name: string; imageUrl: string }) => {
    console.log(`Renderizando opção: ${item.name}, imageUrl: ${item.imageUrl}`);
    const isSelected = customAvatar[currentPartCategory]?.option === item.imageUrl;
    const tintColor = currentPart.colorizeOptions && customAvatar[currentPartCategory]?.color
      ? customAvatar[currentPartCategory]?.color
      : undefined;
    const hasError = imageLoadErrors[item.id];
    const fallbackImageUrl = 'https://cdn-icons-png.flaticon.com/512/1173/1173879.png';
    const imageSource = { uri: hasError ? fallbackImageUrl : item.imageUrl };

    return (
      <TouchableOpacity
        key={`${currentPartCategory}-${item.id}`}
        style={[
          styles.partOptionContainer,
          isSelected && styles.selectedPartOption
        ]}
        onPress={() => {
          console.log(`Opção selecionada: ${item.name} com URL: ${item.imageUrl}`);
          onSelectPartOption(currentPartCategory, item.imageUrl);
        }}
        accessibilityLabel={`Opção ${item.name}`}
        activeOpacity={0.7}
      >
        <View style={styles.partOptionImageContainer}>
          <Image
            source={imageSource}
            style={[
              styles.partOptionImage,
              { tintColor: hasError ? undefined : tintColor }
            ]}
            resizeMode="contain"
            onError={(e) => {
              console.error(`Erro ao carregar imagem para ${item.name}:`, e.nativeEvent.error, 'URL:', item.imageUrl);
              setImageLoadErrors(prev => ({
                ...prev,
                [item.id]: true
              }));
            }}
          />
        </View>
        <Text style={styles.partOptionText}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.optionsContainer} testID="part-options-container">
      <Text style={styles.optionsTitle}>
        Selecione o formato para: {currentPart.name}
      </Text>
      {loadingImages ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Carregando opções...</Text>
        </View>
      ) : (
        <View style={styles.optionsList}>
          {currentPart.options.map(renderOptionItem)}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  optionsContainer: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 5,
    backgroundColor: 'white',
    height: '100%'
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center'
  },
  optionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingBottom: 100,
    flex: 1
  },
  partOptionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    margin: 5,
    width: 100,
    height: 110,
    padding: 5,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1
  },
  selectedPartOption: {
    borderWidth: 2,
    borderColor: '#2196F3',
    backgroundColor: '#e3f2fd'
  },
  partOptionImageContainer: {
    width: '100%',
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    backgroundColor: '#fff',
    borderRadius: 4
  },
  partOptionImage: {
    width: 50,
    height: 50,
    backgroundColor: 'transparent'
  },
  partOptionText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#333',
    fontWeight: '500'
  },
  noOptionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30
  },
  noOptionsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  }
});

export default PartOptions;