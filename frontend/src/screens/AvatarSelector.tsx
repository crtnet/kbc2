// src/screens/AvatarSelector.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  Portal,
  Button,
  Text,
  Card,
  Searchbar,
  ActivityIndicator,
  Chip,
  IconButton,
  Divider,
  SegmentedButtons
} from 'react-native-paper';
import {
  View,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
  PanResponder,
  Alert,
  SafeAreaView,
  Platform
} from 'react-native';
import * as avatarService from '../services/avatarService';

// Componentes personalizados
import AvatarPreview from '../components/avatar/AvatarPreview';
import ColorSelector from '../components/avatar/ColorSelector';
import CustomizationSliders from '../components/avatar/CustomizationSliders';
import PartOptions from '../components/avatar/PartOptions';

// Dados e tipos das partes do avatar
import {
  AVATAR_PARTS,
  AVATAR_SLIDERS,
  DEFAULT_COLORS,
  INITIAL_CUSTOM_AVATAR,
  AvatarColor,
  CustomAvatar
} from '../components/avatar/AvatarParts';

interface AvatarSelectorProps {
  visible: boolean;
  onDismiss: () => void;
  onSelectAvatar: (avatarUrl: string) => void;
  title: string;
  characterType?: 'child' | 'adult' | 'animal' | 'fantasy';
  enableCustomization?: boolean;
}

const AvatarSelector: React.FC<AvatarSelectorProps> = ({
  visible,
  onDismiss,
  onSelectAvatar,
  title,
  characterType = 'child',
  enableCustomization = false
}) => {
  // Estados para seleção de avatares em modo lista
  const [avatars, setAvatars] = useState<string[]>([]);
  const [filteredAvatars, setFilteredAvatars] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [selectedStyle, setSelectedStyle] = useState<string>('cartoon');
  const [error, setError] = useState<string | null>(null);

  // Estado para modo de customização: 'list' ou 'mii'
  const [selectorMode, setSelectorMode] = useState<'list' | 'mii'>(enableCustomization ? 'mii' : 'list');

  // Estados para o menu de customização
  const [showColorMenu, setShowColorMenu] = useState<boolean>(false);
  const [colorMenuAnchor, setColorMenuAnchor] = useState({ x: 0, y: 0 });

  // Estado para o avatar personalizado
  const [customAvatar, setCustomAvatar] = useState<CustomAvatar>(INITIAL_CUSTOM_AVATAR);
  const [currentPartCategory, setCurrentPartCategory] = useState<string>('face');
  const [currentCustomization, setCurrentCustomization] = useState<'option' | 'color' | 'sliders'>('option');

  // Estado para as cores salvas pelo usuário
  const [savedColors, setSavedColors] = useState<AvatarColor[]>(DEFAULT_COLORS);

  // Valores animados
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Configuração do PanResponder para rotação 3D do avatar
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        rotateAnim.setValue(gestureState.dx / 30);
      },
      onPanResponderRelease: () => {
        Animated.spring(rotateAnim, {
          toValue: 0,
          friction: 5,
          useNativeDriver: true
        }).start();
      }
    })
  ).current;

  // Dimensões e número de colunas para o modo lista
  const screenWidth = Dimensions.get('window').width;
  const numColumns = screenWidth > 600 ? 4 : 3;

  // Efeito para inicializar avatar personalizado quando o modal é aberto
  useEffect(() => {
    if (visible && enableCustomization) {
      console.log("Inicializando avatar personalizado...");
      if (AVATAR_PARTS && AVATAR_PARTS.length > 0) {
        setLoading(true);
        const initialCustomAvatar = { ...INITIAL_CUSTOM_AVATAR };
        AVATAR_PARTS.forEach(part => {
          if (part.options && part.options.length > 0) {
            initialCustomAvatar[part.id] = {
              ...initialCustomAvatar[part.id] || {},
              option: part.options[0].imageUrl
            };
            if (part.colorizeOptions && part.defaultColor) {
              initialCustomAvatar[part.id] = {
                ...initialCustomAvatar[part.id],
                color: part.defaultColor
              };
            }
            console.log(`Inicializando ${part.id} com ${part.options[0].imageUrl}`);
            part.options.forEach(option => {
              console.log(`Pré-carregando imagem: ${option.imageUrl}`);
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
        });
        console.log("Avatar inicializado:", JSON.stringify(initialCustomAvatar));
        setCustomAvatar(initialCustomAvatar);
        setCurrentPartCategory(AVATAR_PARTS[0]?.id || 'face');
        setCurrentCustomization('option');
        const facePart = AVATAR_PARTS.find(part => part.id === 'face');
        if (facePart && facePart.options.length > 0) {
          const firstFaceOption = facePart.options[0].imageUrl;
          console.log(`Definindo rosto padrão: ${firstFaceOption}`);
          setCustomAvatar(prev => ({
            ...prev,
            face: { ...prev.face, option: firstFaceOption }
          }));
        }
        setTimeout(() => setLoading(false), 1000);
      } else {
        console.error("AVATAR_PARTS não disponível!");
        setLoading(false);
      }
    }
  }, [visible, enableCustomization]);

  // Efeito para filtrar avatares no modo lista
  useEffect(() => {
    if (selectorMode === 'list') {
      let filtered = [...avatars];
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(avatar => {
          const filename = avatar.split('/').pop()?.toLowerCase() || '';
          return filename.includes(query);
        });
      }
      if (selectedCategory !== 'all') {
        filtered = filtered.filter(avatar => {
          const filename = avatar.split('/').pop()?.toLowerCase() || '';
          return filename.includes(selectedCategory.toLowerCase());
        });
      }
      if (selectedGender !== 'all') {
        filtered = filtered.filter(avatar => {
          const filename = avatar.split('/').pop()?.toLowerCase() || '';
          return filename.includes(selectedGender.toLowerCase());
        });
      }
      setFilteredAvatars(filtered);
    }
  }, [searchQuery, selectedCategory, selectedGender, avatars, selectorMode]);

  // Função para restaurar avatar personalizado a partir de um identificador
  const restoreCustomAvatarFromIdentifier = (avatarIdentifier: string): boolean => {
    try {
      if (!avatarIdentifier || typeof avatarIdentifier !== 'string') {
        console.log('Identificador inválido');
        return false;
      }
      if (!avatarIdentifier.startsWith('CUSTOM||')) {
        console.log('Identificador não é de avatar personalizado');
        return false;
      }
      console.log('Restaurando avatar personalizado...');
      const parts = avatarIdentifier.split('||CUSTOM_AVATAR_DATA||');
      if (parts.length !== 2) {
        console.error('Formato inválido do identificador');
        return false;
      }
      const faceUrl = parts[0].replace('CUSTOM||', '');
      const avatarJsonStr = parts[1];
      console.log('Face URL:', faceUrl, '| Tamanho JSON:', avatarJsonStr.length);
      if (!avatarJsonStr) {
        console.error('JSON ausente no identificador');
        return false;
      }
      try {
        const avatarData = JSON.parse(avatarJsonStr);
        console.log('Avatar recuperado - tipo:', avatarData.type);
        if (!avatarData.parts || !Array.isArray(avatarData.parts)) {
          console.error('Formato inválido: partes não encontradas');
          return false;
        }
        const restoredAvatar = { ...INITIAL_CUSTOM_AVATAR };
        const hasFace = avatarData.parts.some((part: any) => part.partId === 'face' && part.option);
        const hasEyes = avatarData.parts.some((part: any) => part.partId === 'eyes' && part.option);
        const hasMouth = avatarData.parts.some((part: any) => part.partId === 'mouth' && part.option);
        if (!hasFace || !hasEyes || !hasMouth) {
          console.error('Avatar incompleto: faltam partes essenciais');
          return false;
        }
        avatarData.parts.forEach((part: any) => {
          if (part.partId) {
            if (part.option && typeof part.option === 'string' && part.option.startsWith('http')) {
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
            } else {
              console.warn(`Opção inválida para ${part.partId}: ${part.option}`);
              const partDef = AVATAR_PARTS.find(p => p.id === part.partId);
              if (partDef && partDef.options && partDef.options.length > 0) {
                restoredAvatar[part.partId] = {
                  ...restoredAvatar[part.partId],
                  option: partDef.options[0].imageUrl
                };
                console.log(`Usando opção padrão para ${part.partId}: ${partDef.options[0].imageUrl}`);
              }
            }
          }
        });
        if (!restoredAvatar.face?.option || !restoredAvatar.eyes?.option || !restoredAvatar.mouth?.option) {
          console.error('Falha ao restaurar partes essenciais');
          return false;
        }
        console.log('Avatar restaurado com sucesso');
        setCustomAvatar(restoredAvatar);
        setSelectorMode('mii');
        return true;
      } catch (jsonError) {
        console.error('Erro ao analisar JSON:', jsonError);
        return false;
      }
    } catch (error) {
      console.error('Erro na restauração do avatar:', error);
      return false;
    }
  };

  // Efeito para restaurar avatar personalizado, se disponível em dados globais
  useEffect(() => {
    if (visible && enableCustomization) {
      const isMainCharacter = title.toLowerCase().includes('principal');
      const avatarIdentifier = isMainCharacter
        ? window.mainCharacterAvatarData
        : window.secondaryCharacterAvatarData;
      console.log(`Verificando avatar ${isMainCharacter ? 'principal' : 'secundário'}`);
      if (avatarIdentifier && typeof avatarIdentifier === 'string') {
        if (avatarIdentifier.startsWith('CUSTOM||')) {
          console.log(`Tentando restaurar avatar ${isMainCharacter ? 'principal' : 'secundário'}`);
          setCustomAvatar({ ...INITIAL_CUSTOM_AVATAR });
          const success = restoreCustomAvatarFromIdentifier(avatarIdentifier);
          console.log(`Restauração ${success ? 'bem-sucedida' : 'falhou'}`);
          if (!success) {
            if (isMainCharacter) {
              window.mainCharacterAvatarData = null;
            } else {
              window.secondaryCharacterAvatarData = null;
            }
          }
        } else {
          console.log(`Avatar ${isMainCharacter ? 'principal' : 'secundário'} não é personalizado`);
        }
      } else {
        console.log(`Nenhum avatar para restaurar (${isMainCharacter ? 'principal' : 'secundário'})`);
      }
    }
  }, [visible, enableCustomization, title]);

  // Efeito para carregar avatares no modo lista
  useEffect(() => {
    const fetchAvatars = async () => {
      if (!visible || selectorMode !== 'list') return;
      try {
        setLoading(true);
        setError(null);
        let category = 'children';
        if (characterType === 'adult') category = 'adults';
        else if (characterType === 'animal') category = 'animals';
        else if (characterType === 'fantasy') category = 'fantasy';
        console.log(`Buscando avatares para ${category} / ${selectedStyle}`);
        const response = await avatarService.getAvatars(category, selectedStyle);
        if (response && response.length > 0) {
          console.log(`Carregados ${response.length} avatares para ${category}/${selectedStyle}`);
          setAvatars(response);
          setFilteredAvatars(response);
          setError(null);
        } else {
          console.warn('Nenhum avatar retornado; usando padrão');
          const defaultAvatars = [
            'https://cdn-icons-png.flaticon.com/512/4140/4140048.png',
            'https://cdn-icons-png.flaticon.com/512/4140/4140051.png',
            'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
            'https://cdn-icons-png.flaticon.com/512/4140/4140047.png'
          ];
          setAvatars(defaultAvatars);
          setFilteredAvatars(defaultAvatars);
          setError(null);
        }
      } catch (err) {
        console.error('Erro ao buscar avatares:', err);
        const defaultAvatars = [
          'https://cdn-icons-png.flaticon.com/512/4140/4140048.png',
          'https://cdn-icons-png.flaticon.com/512/4140/4140051.png',
          'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
          'https://cdn-icons-png.flaticon.com/512/4140/4140047.png'
        ];
        setAvatars(defaultAvatars);
        setFilteredAvatars(defaultAvatars);
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    if (visible) {
      const newMode = enableCustomization ? 'mii' : 'list';
      console.log(`Definindo modo: ${newMode}`);
      setSelectorMode(newMode);
      if (newMode === 'list') fetchAvatars();
      slideAnim.setValue(0);
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web'
      }).start();
    }
  }, [visible, characterType, selectedStyle, enableCustomization, selectorMode]);

  const handleSearch = (query: string) => setSearchQuery(query);
  const handleSelectAvatar = (avatarUrl: string) => {
    console.log('Avatar selecionado:', avatarUrl);
    onSelectAvatar(avatarUrl);
    onDismiss();
  };

  const handleOpenColorMenu = (event: any) => {
    setColorMenuAnchor({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
    setShowColorMenu(true);
  };

  const handleSelectColor = (color: string) => {
    setCustomAvatar({
      ...customAvatar,
      [currentPartCategory]: {
        ...customAvatar[currentPartCategory],
        color
      }
    });
    setShowColorMenu(false);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true })
    ]).start();
  };

  const handleSaveCustomColor = (color: string, name: string) => {
    const newColor = { id: `custom_${Date.now()}`, name, value: color };
    setSavedColors([...savedColors, newColor]);
    setShowColorMenu(false);
  };

  // Função para selecionar avatar personalizado
  // Cria um identificador customizado que contém a URL da face e os dados completos do avatar
  const handleSelectCustomAvatar = async () => {
    try {
      setLoading(true);
      const requiredParts = ['face', 'eyes', 'mouth'];
      const missingParts = requiredParts.filter(part => !customAvatar[part] || !customAvatar[part].option);
      if (missingParts.length > 0) {
        const partTranslations: { [key: string]: string } = {
          face: 'Rosto',
          eyes: 'Olhos',
          mouth: 'Boca'
        };
        const translatedMissing = missingParts.map(part => partTranslations[part] || part);
        Alert.alert(
          "Avatar Incompleto",
          `Faltam partes obrigatórias: ${translatedMissing.join(', ')}. Selecione todas as partes.`,
          [{ text: "OK" }]
        );
        setLoading(false);
        return;
      }
      
      // Validação e correção de URLs
      for (const partId in customAvatar) {
        const part = customAvatar[partId];
        if (part && part.option && typeof part.option === 'string') {
          if (!part.option.startsWith('http')) {
            console.error(`URL inválida para ${partId}: ${part.option}`);
            const partDef = AVATAR_PARTS.find(p => p.id === partId);
            if (partDef && partDef.options && partDef.options.length > 0) {
              customAvatar[partId].option = partDef.options[0].imageUrl;
              console.log(`Corrigindo URL para ${partId}: ${partDef.options[0].imageUrl}`);
            } else if (requiredParts.includes(partId)) {
              Alert.alert(
                "Erro no Avatar",
                `Erro na imagem da parte: ${partId}. Selecione outra opção.`,
                [{ text: "OK" }]
              );
              setLoading(false);
              return;
            }
          }
        }
      }
      
      // Verificar se temos uma URL de face válida
      const faceUrl = customAvatar.face?.option;
      if (!faceUrl || typeof faceUrl !== 'string' || !faceUrl.startsWith('http')) {
        console.error('URL de face inválida:', faceUrl);
        Alert.alert(
          "Erro no Avatar",
          "A imagem do rosto é inválida. Selecione outro rosto.",
          [{ text: "OK" }]
        );
        setLoading(false);
        return;
      }
      
      // Preparar os dados do avatar para serialização
      const avatarPartsData = Object.keys(customAvatar).map(partId => {
        const part = customAvatar[partId];
        return {
          partId,
          option: part.option,
          color: part.color,
          size: part.size,
          position: part.position,
          width: part.width,
          height: part.height,
          spacing: part.spacing,
          rotation: part.rotation,
          density: part.density
        };
      });
      
      // Criar o objeto de dados completo do avatar
      const avatarData = {
        type: 'custom',
        parts: avatarPartsData,
        createdAt: new Date().toISOString()
      };
      
      // Serializar os dados para JSON
      const avatarDataJson = JSON.stringify(avatarData);
      
      // Criar o identificador customizado no formato: CUSTOM||URL_DA_FACE||CUSTOM_AVATAR_DATA||JSON_DATA
      const customAvatarIdentifier = `CUSTOM||${faceUrl}||CUSTOM_AVATAR_DATA||${avatarDataJson}`;
      
      console.log('Avatar customizado criado com sucesso');
      console.log('URL da face:', faceUrl);
      console.log('Tamanho dos dados serializados:', avatarDataJson.length);
      
      // Retornar o identificador completo
      onSelectAvatar(customAvatarIdentifier);
      onDismiss();
    } catch (error) {
      console.error('Erro ao criar avatar personalizado:', error);
      const defaultUrl = 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png';
      Alert.alert(
        "Erro ao Criar Avatar",
        "Ocorreu um erro ao criar seu avatar. Um avatar padrão será usado.",
        [{ text: "OK" }]
      );
      onSelectAvatar(defaultUrl);
      onDismiss();
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPartCategory = (partId: string) => {
    console.log(`Alterando categoria para: ${partId}`);
    const targetPart = AVATAR_PARTS.find(part => part.id === partId);
    if (!targetPart) {
      console.error(`Categoria ${partId} não encontrada`);
      return;
    }
    setCurrentPartCategory(partId);
    setCurrentCustomization('option');
    const updatedAvatar = { ...customAvatar };
    if (!updatedAvatar[partId] || !updatedAvatar[partId].option) {
      if (targetPart.options && targetPart.options.length > 0) {
        updatedAvatar[partId] = {
          ...updatedAvatar[partId] || {},
          option: targetPart.options[0].imageUrl
        };
        if (targetPart.colorizeOptions && targetPart.defaultColor) {
          updatedAvatar[partId].color = targetPart.defaultColor;
        }
        console.log(`Opção padrão para ${partId}: ${targetPart.options[0].imageUrl}`);
      }
    }
    setCustomAvatar(updatedAvatar);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 200, useNativeDriver: true })
    ]).start();
  };

  const handleSelectPartOption = (partId: string, optionUrl: string) => {
    console.log(`Selecionando opção para ${partId}: ${optionUrl}`);
    setCustomAvatar(prev => {
      const newAvatar = { ...prev };
      newAvatar[partId] = { ...newAvatar[partId], option: optionUrl };
      console.log(`Avatar atualizado para ${partId}:`, JSON.stringify(newAvatar[partId]));
      return newAvatar;
    });
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true })
    ]).start();
  };

  const handleSliderChange = (sliderId: string, value: number) => {
    const updatedAvatar = { ...customAvatar };
    const part = { ...updatedAvatar[currentPartCategory] };
    switch (sliderId) {
      case 'size':
        part.size = value;
        break;
      case 'width':
        part.width = value;
        break;
      case 'height':
        part.height = value;
        break;
      case 'spacing':
        part.spacing = value;
        break;
      case 'rotation':
        part.rotation = value;
        break;
      case 'density':
        part.density = value;
        break;
      case 'position_y':
        part.position = { ...part.position, y: value };
        break;
      case 'position_x':
        part.position = { ...part.position, x: value };
        break;
    }
    updatedAvatar[currentPartCategory] = part;
    setCustomAvatar(updatedAvatar);
    Animated.timing(scaleAnim, { toValue: 1 + (value - 1) * 0.05, duration: 10, useNativeDriver: true }).start();
  };

  const handleRandomizeAvatar = () => {
    const randomizedAvatar = { ...customAvatar };
    AVATAR_PARTS.forEach(part => {
      if (part.options.length > 0) {
        const randomIndex = Math.floor(Math.random() * part.options.length);
        randomizedAvatar[part.id] = {
          ...randomizedAvatar[part.id],
          option: part.options[randomIndex].imageUrl
        };
        if (part.colorizeOptions) {
          const randomColorIndex = Math.floor(Math.random() * savedColors.length);
          randomizedAvatar[part.id].color = savedColors[randomColorIndex].value;
        }
        if (AVATAR_SLIDERS[part.id]) {
          AVATAR_SLIDERS[part.id].forEach(slider => {
            const randomValue = slider.min + Math.random() * (slider.max - slider.min);
            switch (slider.id) {
              case 'size':
                randomizedAvatar[part.id].size = randomValue;
                break;
              case 'width':
                randomizedAvatar[part.id].width = randomValue;
                break;
              case 'height':
                randomizedAvatar[part.id].height = randomValue;
                break;
              case 'spacing':
                randomizedAvatar[part.id].spacing = randomValue;
                break;
              case 'rotation':
                randomizedAvatar[part.id].rotation = randomValue;
                break;
              case 'density':
                randomizedAvatar[part.id].density = randomValue;
                break;
              case 'position_y':
                randomizedAvatar[part.id].position = { 
                  ...randomizedAvatar[part.id].position, 
                  y: randomValue 
                };
                break;
              case 'position_x':
                randomizedAvatar[part.id].position = { 
                  ...randomizedAvatar[part.id].position, 
                  x: randomValue 
                };
                break;
            }
          });
        }
      }
    });
    setCustomAvatar(randomizedAvatar);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.8, duration: 150, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.1, duration: 150, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true })
    ]).start();
  };

  const renderAvatar = React.useCallback(({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.avatarContainer}
      onPress={() => handleSelectAvatar(item)}
      testID={`avatar-item-${item.split('/').pop()}`}
      activeOpacity={0.7}
      accessibilityLabel="Selecionar este avatar"
    >
      <View style={styles.avatarWrapper}>
        <Image 
          source={{ uri: item }} 
          style={styles.avatar} 
          onError={(e) => {
            console.error('Erro ao carregar imagem:', e.nativeEvent.error, 'URL:', item);
          }}
          resizeMode="cover"
        />
      </View>
    </TouchableOpacity>
  ), []);

  const renderMiiCategoryTabs = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      style={styles.miiCategoryTabs}
      contentContainerStyle={styles.miiCategoryTabsContent}
    >
      {AVATAR_PARTS.map(part => (
        <TouchableOpacity
          key={part.id}
          style={[
            styles.miiCategoryTab,
            currentPartCategory === part.id && styles.activeMiiCategoryTab
          ]}
          onPress={() => handleSelectPartCategory(part.id)}
          accessibilityLabel={`Categoria ${part.name}`}
        >
          <Text style={[
            styles.miiCategoryTabText,
            currentPartCategory === part.id && styles.activeMiiCategoryTabText
          ]}>
            {part.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderCustomizationToggle = () => {
    const currentPartDef = AVATAR_PARTS.find(part => part.id === currentPartCategory);
    const hasColorOptions = currentPartDef?.colorizeOptions;
    return (
      <View style={styles.customizationToggleContainer}>
        <SegmentedButtons
          value={currentCustomization}
          onValueChange={(value) => setCurrentCustomization(value as any)}
          buttons={[
            { value: 'option', label: 'Opções', icon: 'shape-outline' },
            { value: 'color', label: 'Cores', icon: 'palette', disabled: !hasColorOptions },
            { value: 'sliders', label: 'Ajustes', icon: 'tune-vertical' }
          ]}
          style={styles.customizationToggle}
        />
      </View>
    );
  };

  const renderMiiCustomizationMode = () => {
    console.log("Renderizando modo Mii");
    if (!AVATAR_PARTS || AVATAR_PARTS.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Carregando opções de customização...</Text>
        </View>
      );
    }
    if (!customAvatar || Object.keys(customAvatar).length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Preparando avatar para customização...</Text>
        </View>
      );
    }
    return (
      <View style={[styles.miiContainer, {height: Dimensions.get('window').height - 50}]}>
        <View style={styles.previewWrapper}>
          <AvatarPreview
            customAvatar={customAvatar}
            onRandomize={handleRandomizeAvatar}
            rotateAnim={rotateAnim}
            scaleAnim={scaleAnim}
            panResponder={panResponder}
            avatarParts={AVATAR_PARTS}
          />
        </View>
        <View style={styles.tabsContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.miiCategoryTabsContent}
          >
            {AVATAR_PARTS.map(part => (
              <TouchableOpacity
                key={part.id}
                style={[
                  styles.miiCategoryTab,
                  currentPartCategory === part.id && styles.activeMiiCategoryTab
                ]}
                onPress={() => handleSelectPartCategory(part.id)}
                accessibilityLabel={`Categoria ${part.name}`}
              >
                <Text style={[
                  styles.miiCategoryTabText,
                  currentPartCategory === part.id && styles.activeMiiCategoryTabText
                ]}>
                  {part.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        {renderCustomizationToggle()}
        <View style={styles.divider} />
        <View style={styles.miiContentContainer}>
          {currentCustomization === 'option' && (
            <PartOptions
              currentPartCategory={currentPartCategory}
              customAvatar={customAvatar}
              avatarParts={AVATAR_PARTS}
              onSelectPartOption={handleSelectPartOption}
            />
          )}
          {currentCustomization === 'color' && (
            <ColorSelector
              currentPartCategory={currentPartCategory}
              customAvatar={customAvatar}
              savedColors={savedColors}
              onSelectColor={handleSelectColor}
              onOpenColorMenu={handleOpenColorMenu}
              showColorMenu={showColorMenu}
              onDismissColorMenu={() => setShowColorMenu(false)}
              colorMenuAnchor={colorMenuAnchor}
              onSaveCustomColor={handleSaveCustomColor}
              canColorize={AVATAR_PARTS.find(p => p.id === currentPartCategory)?.colorizeOptions || false}
            />
          )}
          {currentCustomization === 'sliders' && (
            <CustomizationSliders
              currentPartCategory={currentPartCategory}
              customAvatar={customAvatar}
              sliders={AVATAR_SLIDERS}
              onSliderChange={handleSliderChange}
            />
          )}
        </View>
        <View style={styles.miiActionButtons}>
          <Button mode="outlined" onPress={onDismiss} style={styles.miiActionButton} icon="arrow-left">
            Cancelar
          </Button>
          <Button mode="contained" onPress={handleSelectCustomAvatar} style={[styles.miiActionButton, styles.confirmButton]} icon="check" loading={loading} disabled={loading}>
            Confirmar
          </Button>
        </View>
      </View>
    );
  };

  const renderListMode = () => (
    <Card.Content style={styles.listContent}>
      <Searchbar
        placeholder="Pesquisar avatares..."
        onChangeText={handleSearch}
        value={searchQuery}
        style={styles.searchBar}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>Categoria:</Text>
          <View style={styles.chipContainer}>
            {getCategories().map(category => (
              <Chip
                key={category.value}
                selected={selectedCategory === category.value}
                onPress={() => setSelectedCategory(category.value)}
                style={styles.chip}
                mode={selectedCategory === category.value ? 'flat' : 'outlined'}
              >
                {category.label}
              </Chip>
            ))}
          </View>
        </View>
        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>Gênero:</Text>
          <View style={styles.chipContainer}>
            <Chip selected={selectedGender === 'all'} onPress={() => setSelectedGender('all')} style={styles.chip} mode={selectedGender === 'all' ? 'flat' : 'outlined'}>
              Todos
            </Chip>
            <Chip selected={selectedGender === 'male'} onPress={() => setSelectedGender('male')} style={styles.chip} mode={selectedGender === 'male' ? 'flat' : 'outlined'}>
              Masculino
            </Chip>
            <Chip selected={selectedGender === 'female'} onPress={() => setSelectedGender('female')} style={styles.chip} mode={selectedGender === 'female' ? 'flat' : 'outlined'}>
              Feminino
            </Chip>
            <Chip selected={selectedGender === 'neutral'} onPress={() => setSelectedGender('neutral')} style={styles.chip} mode={selectedGender === 'neutral' ? 'flat' : 'outlined'}>
              Neutro
            </Chip>
          </View>
        </View>
      </ScrollView>
      <Text style={styles.filterTitle}>Estilo Visual:</Text>
      <SegmentedButtons
        value={selectedStyle}
        onValueChange={setSelectedStyle}
        buttons={[
          { value: 'cartoon', label: 'Cartoon' },
          { value: 'realistic', label: 'Realista' },
          { value: 'anime', label: 'Anime' }
        ]}
        style={styles.segmentedButton}
      />
      <Button mode="contained" icon="account-edit" onPress={() => setSelectorMode('mii')} style={styles.createMiiButton}>
        Criar Avatar Personalizado
      </Button>
      <View style={styles.avatarListWrapper}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>Carregando avatares...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Button
              mode="contained"
              onPress={() => {
                setLoading(true);
                const currentStyle = selectedStyle;
                setSelectedStyle(currentStyle === 'cartoon' ? 'realistic' : 'cartoon');
                setTimeout(() => setSelectedStyle(currentStyle), 100);
              }}
            >
              Tentar Novamente
            </Button>
          </View>
        ) : filteredAvatars.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhum avatar encontrado com os filtros selecionados.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredAvatars}
            renderItem={renderAvatar}
            keyExtractor={(item, index) => `${item}-${index}`}
            numColumns={numColumns}
            contentContainerStyle={styles.avatarListContent}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={5}
            removeClippedSubviews={Platform.OS !== 'web'}
          />
        )}
      </View>
    </Card.Content>
  );

  const getCategories = () => {
    switch (characterType) {
      case 'child':
        return [
          { label: 'Todos', value: 'all' },
          { label: 'Estudantes', value: 'student' },
          { label: 'Aventureiros', value: 'adventure' },
          { label: 'Esportistas', value: 'sport' }
        ];
      case 'adult':
        return [
          { label: 'Todos', value: 'all' },
          { label: 'Profissionais', value: 'professional' },
          { label: 'Pais', value: 'parent' },
          { label: 'Idosos', value: 'elderly' }
        ];
      case 'animal':
        return [
          { label: 'Todos', value: 'all' },
          { label: 'Domésticos', value: 'pet' },
          { label: 'Selvagens', value: 'wild' },
          { label: 'Marinhos', value: 'sea' }
        ];
      case 'fantasy':
        return [
          { label: 'Todos', value: 'all' },
          { label: 'Mágicos', value: 'magic' },
          { label: 'Criaturas', value: 'creature' },
          { label: 'Heróis', value: 'hero' }
        ];
      default:
        return [{ label: 'Todos', value: 'all' }];
    }
  };

  useEffect(() => {
    console.log("AvatarSelector - Estado atual:");
    console.log("- Modo:", selectorMode);
    console.log("- Visível:", visible);
    console.log("- enableCustomization:", enableCustomization);
    console.log("- Categoria atual:", currentPartCategory);
    console.log("- Modo de customização:", currentCustomization);
    console.log("- customAvatar:", JSON.stringify(customAvatar));
    console.log("- AVATAR_PARTS carregado:", AVATAR_PARTS?.length || 0, "partes");
    const currentPartDef = AVATAR_PARTS.find(part => part.id === currentPartCategory);
    console.log("- Categoria atual tem", currentPartDef?.options?.length || 0, "opções");
    if (visible && enableCustomization && selectorMode !== 'mii') {
      console.log("Forçando modo 'mii' devido a enableCustomization");
      setSelectorMode('mii');
    }
  }, [visible, selectorMode, enableCustomization, currentPartCategory, currentCustomization, customAvatar]);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
        dismissable={true}
      >
        <SafeAreaView style={{ flex: 1, width: '100%', height: '100%' }}>
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [
                  {
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0]
                    })
                  }
                ],
                opacity: slideAnim
              }
            ]}
          >
            <View style={styles.cardContainer}>
              <View style={styles.cardWrapper}>
                <Card style={styles.card}>
                  <Card.Title
                    title={selectorMode === 'list' ? title : "Criação de Avatar"}
                    subtitle={selectorMode === 'mii' ? "Personalize seu avatar ao estilo Mii" : undefined}
                    right={(props) => (
                      <IconButton {...props} icon="close" onPress={onDismiss} accessibilityLabel="Fechar" />
                    )}
                  />
                  {selectorMode === 'list' ? renderListMode() : renderMiiCustomizationMode()}
                </Card>
              </View>
            </View>
          </Animated.View>
        </SafeAreaView>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    margin: 0,
    padding: 0,
    justifyContent: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalContent: {
    flex: 1,
    width: '100%',
    height: '100%'
  },
  cardContainer: {
    flex: 1,
    padding: 0
  },
  cardWrapper: {
    flex: 1,
    width: '100%',
    height: '100%'
  },
  card: {
    flex: 1,
    borderRadius: 0,
    backgroundColor: '#ffffff',
    width: '100%',
    height: '100%'
  },
  listContent: {
    flex: 1,
    padding: 10
  },
  searchBar: {
    marginBottom: 10
  },
  filtersContainer: {
    flexDirection: 'row',
    marginBottom: 10
  },
  filterSection: {
    marginRight: 20
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    marginTop: 10
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  chip: {
    margin: 4
  },
  segmentedButton: {
    marginBottom: 15
  },
  createMiiButton: {
    marginVertical: 15,
    backgroundColor: '#FF9800',
    borderRadius: 30
  },
  avatarListWrapper: {
    flex: 1,
    minHeight: 300
  },
  avatarListContent: {
    paddingVertical: 10
  },
  avatarContainer: {
    flex: 1,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 5
  },
  avatarWrapper: {
    backgroundColor: '#ffffff',
    borderRadius: 60,
    padding: 5,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#ffffff'
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666'
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  errorText: {
    marginBottom: 20,
    fontSize: 16,
    color: 'red',
    textAlign: 'center'
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666'
  },
  actions: {
    justifyContent: 'flex-end'
  },
  miiContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    flexDirection: 'column'
  },
  previewWrapper: {
    width: '100%',
    height: 220,
    backgroundColor: '#2196F3'
  },
  miiOptionsContainer: {
    flex: 1,
    flexDirection: 'column'
  },
  tabsContainer: {
    backgroundColor: '#e0e0e0',
    height: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    zIndex: 10
  },
  customizationToggleContainer: {
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 2,
    zIndex: 9
  },
  customizationToggle: {
    marginHorizontal: 8
  },
  miiCategoryTabs: {
    backgroundColor: '#e0e0e0',
    minHeight: 50,
    height: 'auto',
    maxHeight: 60
  },
  miiCategoryTabsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 5,
    height: 50
  },
  miiCategoryTab: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#e0e0e0'
  },
  activeMiiCategoryTab: {
    backgroundColor: '#2196F3'
  },
  miiCategoryTabText: {
    fontSize: 14,
    color: '#333'
  },
  activeMiiCategoryTabText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd'
  },
  miiContentContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingBottom: 80,
    height: 300,
    minHeight: 300,
    overflow: 'visible'
  },
  miiActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3
  },
  miiActionButton: {
    flex: 1,
    marginHorizontal: 5
  },
  confirmButton: {
    backgroundColor: '#4CAF50'
  }
});

export default AvatarSelector;