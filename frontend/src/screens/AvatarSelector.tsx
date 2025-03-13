// src/screens/AvatarSelector.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal, // Modal do React Native
  TouchableOpacity,
  Image,
  ScrollView,
  FlatList,
  Dimensions,
  SafeAreaView,
  Platform,
  Animated,
  PanResponder,
  Alert
} from 'react-native';
import {
  ActivityIndicator,
  Searchbar,
  Button,
  IconButton,
  SegmentedButtons,
  Chip
} from 'react-native-paper';

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
  onSelectAvatar: (avatarUrlOrIdentifier: string) => void;
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
  // Modo: list ou mii
  const [selectorMode, setSelectorMode] = useState<'list' | 'mii'>(enableCustomization ? 'mii' : 'list');

  // Lista de avatares
  const [avatars, setAvatars] = useState<string[]>([]);
  const [filteredAvatars, setFilteredAvatars] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedGender, setSelectedGender] = useState('all');
  const [selectedStyle, setSelectedStyle] = useState('cartoon');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Customização
  const [customAvatar, setCustomAvatar] = useState<CustomAvatar>(INITIAL_CUSTOM_AVATAR);
  const [currentPartCategory, setCurrentPartCategory] = useState('face');
  const [currentCustomization, setCurrentCustomization] = useState<'option' | 'color' | 'sliders'>('option');
  const [savedColors, setSavedColors] = useState<AvatarColor[]>(DEFAULT_COLORS);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [colorMenuAnchor, setColorMenuAnchor] = useState({ x: 0, y: 0 });

  // Animações (preview 3D)
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
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

  // Tamanho da tela e colunas
  const screenWidth = Dimensions.get('window').width;
  const numColumns = screenWidth > 600 ? 4 : 3;

  // Efeito: quando o modal abre
  useEffect(() => {
    if (visible) {
      const newMode = enableCustomization ? 'mii' : 'list';
      setSelectorMode(newMode);

      if (newMode === 'list') {
        fetchAvatars();
      } else {
        initCustomAvatar();
        restoreAvatarIfNeeded();
      }
    }
  }, [visible]);

  // Função para buscar avatares do modo lista
  const fetchAvatars = async () => {
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
        setAvatars(response);
        setFilteredAvatars(response);
      } else {
        console.warn('Nenhum avatar retornado; usando padrão');
        const defaultAvatars = [
          'https://cdn-icons-png.flaticon.com/512/4140/4140048.png',
          'https://cdn-icons-png.flaticon.com/512/4140/4140051.png'
        ];
        setAvatars(defaultAvatars);
        setFilteredAvatars(defaultAvatars);
      }
    } catch (err) {
      console.error('Erro ao buscar avatares:', err);
      const fallbackAvatars = [
        'https://cdn-icons-png.flaticon.com/512/4140/4140048.png',
        'https://cdn-icons-png.flaticon.com/512/4140/4140051.png'
      ];
      setAvatars(fallbackAvatars);
      setFilteredAvatars(fallbackAvatars);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  // Inicializa o avatar customizado
  const initCustomAvatar = () => {
    if (!enableCustomization) return;
    if (AVATAR_PARTS.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);

    console.log('Inicializando avatar personalizado...');
    const initialCustom = { ...INITIAL_CUSTOM_AVATAR };
    AVATAR_PARTS.forEach(part => {
      if (part.options.length > 0) {
        initialCustom[part.id] = {
          ...initialCustom[part.id],
          option: part.options[0].imageUrl
        };
        if (part.colorizeOptions && part.defaultColor) {
          initialCustom[part.id].color = part.defaultColor;
        }
      }
    });
    setCustomAvatar(initialCustom);
    setCurrentPartCategory(AVATAR_PARTS[0]?.id || 'face');
    setCurrentCustomization('option');
    setTimeout(() => setLoading(false), 500);
  };

  // Tenta restaurar avatar personalizado, se disponível
  const restoreAvatarIfNeeded = () => {
    if (!enableCustomization) return;

    const isMainCharacter = title.toLowerCase().includes('principal');
    const avatarIdentifier = isMainCharacter
      ? window.mainCharacterAvatarData
      : window.secondaryCharacterAvatarData;
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
      }
    }
  };

  // Restaura a partir de um identificador
  const restoreCustomAvatarFromIdentifier = (avatarIdentifier: string): boolean => {
    try {
      if (!avatarIdentifier.startsWith('CUSTOM||')) {
        console.log('Não é identificador de avatar customizado');
        return false;
      }
      const parts = avatarIdentifier.split('||CUSTOM_AVATAR_DATA||');
      if (parts.length !== 2) return false;

      const faceUrl = parts[0].replace('CUSTOM||', '');
      const avatarJsonStr = parts[1];
      if (!avatarJsonStr) return false;

      const avatarData = JSON.parse(avatarJsonStr);
      if (!avatarData.parts || !Array.isArray(avatarData.parts)) return false;

      const restored = { ...INITIAL_CUSTOM_AVATAR };
      avatarData.parts.forEach((partObj: any) => {
        const partId = partObj.partId;
        if (partId) {
          restored[partId] = {
            option: partObj.option,
            color: partObj.color,
            size: partObj.size,
            position: partObj.position,
            width: partObj.width,
            height: partObj.height,
            spacing: partObj.spacing,
            rotation: partObj.rotation,
            density: partObj.density
          };
        }
      });
      setCustomAvatar(restored);
      setSelectorMode('mii');
      return true;
    } catch (err) {
      console.error('Erro ao restaurar avatar:', err);
      return false;
    }
  };

  // Filtra avatares ao digitar no search
  useEffect(() => {
    if (selectorMode !== 'list') return;
    let filtered = [...avatars];
    if (searchQuery) {
      const queryLower = searchQuery.toLowerCase();
      filtered = filtered.filter(avatar => {
        const filename = avatar.split('/').pop()?.toLowerCase() || '';
        return filename.includes(queryLower);
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
  }, [searchQuery, selectedCategory, selectedGender, avatars, selectorMode]);

  // Handler de search
  const handleSearch = (query: string) => setSearchQuery(query);

  // Seleciona avatar do modo lista
  const handleSelectAvatar = (avatarUrl: string) => {
    onSelectAvatar(avatarUrl);
    onDismiss();
  };

  // Abre menu de cores (caso precise)
  const handleOpenColorMenu = (event: any) => {
    setColorMenuAnchor({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
    setShowColorMenu(true);
  };

  // Seleciona cor
  const handleSelectColor = (color: string) => {
    setCustomAvatar(prev => ({
      ...prev,
      [currentPartCategory]: {
        ...prev[currentPartCategory],
        color
      }
    }));
    setShowColorMenu(false);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true })
    ]).start();
  };

  // Salva cor customizada
  const handleSaveCustomColor = (color: string, name: string) => {
    const newColor = { id: `custom_${Date.now()}`, name, value: color };
    setSavedColors(prev => [...prev, newColor]);
    setShowColorMenu(false);
  };

  // Confirma avatar customizado, gera identificador
  const handleSelectCustomAvatar = async () => {
    try {
      setLoading(true);
      const requiredParts = ['face', 'eyes', 'mouth'];
      const missing = requiredParts.filter(part => !customAvatar[part] || !customAvatar[part].option);
      if (missing.length > 0) {
        Alert.alert('Avatar Incompleto', `Faltam partes: ${missing.join(', ')}`, [{ text: 'OK' }]);
        setLoading(false);
        return;
      }

      // Corrige URLs inválidas
      for (const partId in customAvatar) {
        const part = customAvatar[partId];
        if (part && part.option && !part.option.startsWith('http')) {
          const def = AVATAR_PARTS.find(p => p.id === partId);
          if (def?.options?.length) {
            customAvatar[partId].option = def.options[0].imageUrl;
          }
        }
      }

      const faceUrl = customAvatar.face?.option;
      if (!faceUrl || !faceUrl.startsWith('http')) {
        Alert.alert('Erro no Avatar', 'Rosto inválido.', [{ text: 'OK' }]);
        setLoading(false);
        return;
      }

      // Monta dados do avatar
      const partsData = Object.keys(customAvatar).map(partId => {
        const p = customAvatar[partId];
        return {
          partId,
          option: p.option,
          color: p.color,
          size: p.size,
          position: p.position,
          width: p.width,
          height: p.height,
          spacing: p.spacing,
          rotation: p.rotation,
          density: p.density
        };
      });
      const avatarData = {
        type: 'custom',
        parts: partsData,
        createdAt: new Date().toISOString()
      };
      const avatarDataJson = JSON.stringify(avatarData);
      const customAvatarIdentifier = `CUSTOM||${faceUrl}||CUSTOM_AVATAR_DATA||${avatarDataJson}`;

      console.log('Avatar customizado criado:', customAvatarIdentifier.slice(0, 100), '...');
      onSelectAvatar(customAvatarIdentifier);
      onDismiss();
    } catch (error) {
      console.error('Erro ao criar avatar personalizado:', error);
      Alert.alert('Erro', 'Não foi possível criar o avatar. Usando padrão.', [{ text: 'OK' }]);
      onSelectAvatar('https://cdn-icons-png.flaticon.com/512/4140/4140048.png');
      onDismiss();
    } finally {
      setLoading(false);
    }
  };

  // Muda a categoria de parte
  const handleSelectPartCategory = (partId: string) => {
    setCurrentPartCategory(partId);
    setCurrentCustomization('option');
  };

  // Muda a opção de parte
  const handleSelectPartOption = (partId: string, optionUrl: string) => {
    setCustomAvatar(prev => ({
      ...prev,
      [partId]: {
        ...prev[partId],
        option: optionUrl
      }
    }));
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true })
    ]).start();
  };

  // Muda slider
  const handleSliderChange = (sliderId: string, value: number) => {
    const part = { ...customAvatar[currentPartCategory] };
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
    setCustomAvatar(prev => ({ ...prev, [currentPartCategory]: part }));
    Animated.timing(scaleAnim, {
      toValue: 1 + (value - 1) * 0.05,
      duration: 10,
      useNativeDriver: true
    }).start();
  };

  // Randomiza
  const handleRandomizeAvatar = () => {
    const randomized = { ...customAvatar };
    AVATAR_PARTS.forEach(part => {
      if (part.options.length > 0) {
        const randOpt = Math.floor(Math.random() * part.options.length);
        randomized[part.id] = {
          ...randomized[part.id],
          option: part.options[randOpt].imageUrl
        };
        if (part.colorizeOptions) {
          const randColor = Math.floor(Math.random() * savedColors.length);
          randomized[part.id].color = savedColors[randColor].value;
        }
      }
    });
    setCustomAvatar(randomized);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.8, duration: 150, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.1, duration: 150, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true })
    ]).start();
  };

  // Render item do FlatList
  const renderAvatarItem = ({ item }: { item: string }) => (
    <TouchableOpacity style={styles.avatarItem} onPress={() => handleSelectAvatar(item)}>
      <View style={styles.avatarWrapper}>
        <Image source={{ uri: item }} style={styles.avatarImage} />
      </View>
    </TouchableOpacity>
  );

  // Render do modo lista
  const renderListMode = () => (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Searchbar
        placeholder="Pesquisar avatares..."
        value={searchQuery}
        onChangeText={handleSearch}
        style={{ margin: 10 }}
      />
      <ScrollView horizontal style={{ marginHorizontal: 10 }}>
        {/* Exemplo de filtros */}
        <Chip
          style={{ margin: 5 }}
          selected={selectedCategory === 'all'}
          onPress={() => setSelectedCategory('all')}
        >
          Todos
        </Chip>
        <Chip
          style={{ margin: 5 }}
          selected={selectedCategory === 'sport'}
          onPress={() => setSelectedCategory('sport')}
        >
          Esportistas
        </Chip>
      </ScrollView>

      {loading ? (
        <ActivityIndicator style={{ margin: 20 }} />
      ) : error ? (
        <Text style={{ margin: 20, color: 'red' }}>{error}</Text>
      ) : filteredAvatars.length === 0 ? (
        <Text style={{ margin: 20 }}>Nenhum avatar encontrado.</Text>
      ) : (
        <FlatList
          data={filteredAvatars}
          renderItem={renderAvatarItem}
          keyExtractor={(_, idx) => String(idx)}
          numColumns={numColumns}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      <Button
        mode="contained"
        onPress={() => setSelectorMode('mii')}
        style={{ margin: 10 }}
      >
        Criar Avatar Personalizado
      </Button>
    </View>
  );

  // Toggle Opções / Cores / Ajustes
  const renderCustomizationToggle = () => {
    const currentPartDef = AVATAR_PARTS.find(p => p.id === currentPartCategory);
    const hasColorOptions = !!currentPartDef?.colorizeOptions;
    return (
      <SegmentedButtons
        value={currentCustomization}
        onValueChange={(val) => {
          if (val === 'color' && !hasColorOptions) return;
          setCurrentCustomization(val as any);
        }}
        buttons={[
          { value: 'option', label: 'Opções' },
          { value: 'color', label: 'Cores', disabled: !hasColorOptions },
          { value: 'sliders', label: 'Ajustes' }
        ]}
        style={{ margin: 10 }}
      />
    );
  };

  // Render do modo Mii
  const renderMiiMode = () => {
    if (loading) {
      return (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <ActivityIndicator />
          <Text>Carregando...</Text>
        </View>
      );
    }
    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#fff' }}>
        {/* Preview */}
        <View style={{ height: 220, backgroundColor: '#2196F3' }}>
          <AvatarPreview
            customAvatar={customAvatar}
            onRandomize={handleRandomizeAvatar}
            rotateAnim={rotateAnim}
            scaleAnim={scaleAnim}
            panResponder={panResponder}
            avatarParts={AVATAR_PARTS}
          />
        </View>

        {/* Abas das partes */}
        <ScrollView horizontal style={{ backgroundColor: '#e0e0e0', height: 50 }}>
          {AVATAR_PARTS.map(part => (
            <TouchableOpacity
              key={part.id}
              onPress={() => handleSelectPartCategory(part.id)}
              style={[
                { padding: 10, margin: 5, borderRadius: 20 },
                currentPartCategory === part.id
                  ? { backgroundColor: '#2196F3' }
                  : { backgroundColor: '#e0e0e0' }
              ]}
            >
              <Text style={{ color: currentPartCategory === part.id ? '#fff' : '#333' }}>
                {part.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Toggle */}
        {renderCustomizationToggle()}

        {/* Conteúdo (opções, cores ou sliders) */}
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
            canColorize={AVATAR_PARTS.find(p => p.id === currentPartCategory)?.colorizeOptions === true}
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

        {/* Botões de ação */}
        <View style={{ flexDirection: 'row', margin: 10 }}>
          <Button
            mode="outlined"
            onPress={onDismiss}
            style={{ flex: 1, marginRight: 5 }}
          >
            Cancelar
          </Button>
          <Button
            mode="contained"
            onPress={handleSelectCustomAvatar}
            style={{ flex: 1, marginLeft: 5 }}
          >
            Confirmar
          </Button>
        </View>
      </ScrollView>
    );
  };

  // Render final do modal
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onDismiss} // Para Android
    >
      <SafeAreaView style={styles.container}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {selectorMode === 'list' ? title : 'Criação de Avatar'}
          </Text>
          <IconButton icon="close" onPress={onDismiss} />
        </View>

        {/* Conteúdo principal */}
        <View style={styles.content}>
          {selectorMode === 'list' ? renderListMode() : renderMiiMode()}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  header: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  content: {
    flex: 1
  },
  avatarItem: {
    margin: 5
  },
  avatarWrapper: {
    backgroundColor: '#fff',
    borderRadius: 50,
    padding: 5,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40
  }
});

export default AvatarSelector;