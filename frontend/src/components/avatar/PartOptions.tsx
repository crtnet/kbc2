// src/components/avatar/PartOptions.tsx
import React, { useMemo, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  Image,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { AvatarPart } from './AvatarParts';

interface PartOptionsProps {
  currentPartCategory: string;
  customAvatar: any;
  avatarParts: AvatarPart[];
  onSelectPartOption: (partId: string, optionUrl: string) => void;
}

const PartOptions: React.FC<PartOptionsProps> = ({
  currentPartCategory,
  customAvatar,
  avatarParts,
  onSelectPartOption
}) => {
  // Estado local para rastrear se dados foram carregados
  const [loadingImages, setLoadingImages] = useState<boolean>(true);
  const [imageLoadErrors, setImageLoadErrors] = useState<{[key: string]: boolean}>({});
  
  // Usar useMemo para evitar recálculos desnecessários
  const currentPart = useMemo(() => {
    return avatarParts.find(part => part.id === currentPartCategory);
  }, [avatarParts, currentPartCategory]);
  
  // Determinar número de colunas com base na largura da tela
  const screenWidth = Dimensions.get('window').width;
  const numColumns = screenWidth > 500 ? 5 : 3;
  
  // Efeito melhorado para carregar as imagens quando a categoria muda
  useEffect(() => {
    console.log(`Renderizando opções para: ${currentPartCategory}`);
    if (currentPart) {
      console.log(`Opções disponíveis: ${currentPart.options?.length || 0}`);
      setLoadingImages(true); // Iniciar carregamento de imagens para a nova categoria
      
      // Para debug: imprimir as opções disponíveis
      if (currentPart.options && currentPart.options.length > 0) {
        console.log("Primeiras 3 opções disponíveis para a categoria:");
        currentPart.options.slice(0, 3).forEach(option => {
          console.log(`- ${option.name}: ${option.imageUrl}`);
        });
      }
      
      // Verificar o estado atual da opção selecionada
      const currentOption = customAvatar[currentPartCategory]?.option;
      console.log(`Opção atual para ${currentPartCategory}: ${currentOption ? currentOption.substring(0, 30) + '...' : 'nenhuma'}`);
      
      // Verificar se a opção atual é válida
      if (currentOption && typeof currentOption === 'string') {
        if (!currentOption.startsWith('http')) {
          console.error(`Opção atual para ${currentPartCategory} tem URL inválida: ${currentOption}`);
          
          // Tentar encontrar uma opção válida
          if (currentPart.options && currentPart.options.length > 0) {
            const validOption = currentPart.options[0].imageUrl;
            console.log(`Substituindo por opção válida: ${validOption}`);
            
            // Não podemos atualizar diretamente o customAvatar, então apenas logamos
            console.log(`Recomendado atualizar ${currentPartCategory} para ${validOption}`);
          }
        }
      }
      
      // Pré-carregar imagens
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
      
      // Adicionar um timeout para permitir que o UI renderize
      setTimeout(() => {
        setLoadingImages(false);
      }, 500); // Aumentado para dar mais tempo ao componente para renderizar
      
      // Resetar erros de imagem ao trocar de categoria
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
  
  // Verificar se temos opções para exibir
  if (!currentPart.options || currentPart.options.length === 0) {
    console.log('PartOptions: Sem opções disponíveis');
    return (
      <View style={styles.noOptionsContainer}>
        <Text style={styles.noOptionsText}>Nenhuma opção disponível para esta categoria</Text>
      </View>
    );
  }
  
  console.log(`PartOptions: Renderizando ${currentPart.options.length} opções para a categoria ${currentPartCategory}`);
  
  // Otimizar renderização de cada item
  const renderOptionItem = ({ item }) => {
    console.log(`Renderizando opção: ${item.name}, imageUrl: ${item.imageUrl}`);
    
    // Log para debug
    console.log(`Comparando ${customAvatar[currentPartCategory]?.option} com ${item.imageUrl}`);
    
    // Verifica se esta opção está selecionada
    const isSelected = customAvatar[currentPartCategory]?.option === item.imageUrl;
    
    const tintColor = currentPart.colorizeOptions && customAvatar[currentPartCategory]?.color 
      ? customAvatar[currentPartCategory]?.color 
      : undefined;
    
    // Verificar se esta imagem teve erro de carregamento
    const hasError = imageLoadErrors[item.id];
    
    // URL de fallback para caso de erro
    const fallbackImageUrl = 'https://cdn-icons-png.flaticon.com/512/1173/1173879.png';
    
    return (
      <TouchableOpacity
        key={item.id}
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
            source={{ uri: hasError ? fallbackImageUrl : item.imageUrl }} 
            style={[
              styles.partOptionImage,
              { tintColor: hasError ? undefined : tintColor }
            ]}
            resizeMode="contain"
            onError={(e) => {
              console.error(`Erro ao carregar imagem para opção ${item.name}:`, e.nativeEvent.error, 'URL:', item.imageUrl);
              // Marcar esta imagem como com erro
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

  // Forçar uma nova instância de FlatList quando a categoria muda
  // Isso garante que o componente será completamente recriado
  const flatListKey = `options-list-${currentPartCategory}`;

  return (
    <View style={styles.optionsContainer} testID="part-options-container">
      <Text style={styles.optionsTitle}>
        Selecione o formato para: {currentPart.name}
      </Text>
      
      {/* Debug info */}
      {/* Removido para produção */}
      
      {loadingImages ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Carregando opções...</Text>
        </View>
      ) : (
        <View style={styles.optionsList}>
          {currentPart.options.map((item) => (
            <TouchableOpacity
              key={`${currentPartCategory}-${item.id}`}
              style={[
                styles.partOptionContainer,
                customAvatar[currentPartCategory]?.option === item.imageUrl && styles.selectedPartOption
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
                  source={{ uri: item.imageUrl }} 
                  style={[
                    styles.partOptionImage,
                    { tintColor: currentPart.colorizeOptions && customAvatar[currentPartCategory]?.color 
                      ? customAvatar[currentPartCategory]?.color 
                      : undefined }
                  ]}
                  resizeMode="contain"
                  onError={(e) => {
                    console.error(`Erro ao carregar imagem para opção ${item.name}:`, e.nativeEvent.error, 'URL:', item.imageUrl);
                    setImageLoadErrors(prev => ({
                      ...prev,
                      [item.id]: true
                    }));
                  }}
                />
              </View>
              <Text style={styles.partOptionText}>{item.name}</Text>
            </TouchableOpacity>
          ))}
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
  gridContainer: {
    paddingBottom: 100, // Espaço extra para garantir que todas as opções sejam visíveis
    flexGrow: 1
  },
  optionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingBottom: 100, // Espaço extra no final
    flex: 1
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    marginBottom: 5
  },
  partOptionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    margin: 5,
    width: 100, // Tamanho fixo para evitar problemas de layout
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
  },
  debugInfo: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  debugText: {
    fontSize: 12,
    color: '#555'
  }
});

export default PartOptions;