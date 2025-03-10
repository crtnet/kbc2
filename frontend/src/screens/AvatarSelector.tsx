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

// Importar componentes personalizados
import AvatarPreview from '../components/avatar/AvatarPreview';
import ColorSelector from '../components/avatar/ColorSelector';
import CustomizationSliders from '../components/avatar/CustomizationSliders';
import PartOptions from '../components/avatar/PartOptions';

// Importar dados de partes do avatar
import { 
  AVATAR_PARTS, 
  AVATAR_SLIDERS, 
  DEFAULT_COLORS, 
  INITIAL_CUSTOM_AVATAR,
  AvatarColor
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
  // Estados para o modo de seleção e lista de avatares
  const [avatars, setAvatars] = useState<string[]>([]);
  const [filteredAvatars, setFilteredAvatars] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [selectedStyle, setSelectedStyle] = useState<string>('cartoon');
  const [error, setError] = useState<string | null>(null);
  
  // Estados para o modo de personalização de avatar estilo Mii
  // Definimos o modo inicial com base em enableCustomization
  const [selectorMode, setSelectorMode] = useState<'list' | 'mii'>(enableCustomization ? 'mii' : 'list');
  
  // Estados para o menu de personalização
  const [showColorMenu, setShowColorMenu] = useState<boolean>(false);
  const [colorMenuAnchor, setColorMenuAnchor] = useState({ x: 0, y: 0 });
  
  // Estados para o avatar personalizado
  const [customAvatar, setCustomAvatar] = useState<{ [key: string]: any }>(INITIAL_CUSTOM_AVATAR);
  const [currentPartCategory, setCurrentPartCategory] = useState<string>('face');
  const [currentCustomization, setCurrentCustomization] = useState<'option' | 'color' | 'sliders'>('option');
  
  // Estado para as cores salvas pelo usuário
  const [savedColors, setSavedColors] = useState<AvatarColor[]>(DEFAULT_COLORS);
  
  // Referências para animações
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  // Configuração para rotação do avatar 3D
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        // Rotacionar avatar com base no movimento horizontal
        rotateAnim.setValue(gestureState.dx / 30);
      },
      onPanResponderRelease: () => {
        // Voltar à posição normal com animação suave
        Animated.spring(rotateAnim, {
          toValue: 0,
          friction: 5,
          useNativeDriver: true
        }).start();
      }
    })
  ).current;

  // Dimensões da tela
  const screenWidth = Dimensions.get('window').width;
  const numColumns = screenWidth > 600 ? 4 : 3;

  // Efeito para inicializar estado e pré-carregar imagens
  useEffect(() => {
    if (visible && enableCustomization) {
      console.log("Inicializando avatar personalizado...");
      
      // Verificar se AvatarParts foi carregado corretamente
      if (AVATAR_PARTS && AVATAR_PARTS.length > 0) {
        console.log(`AVATAR_PARTS carregado: ${AVATAR_PARTS.length} partes`);
        
        // Indicador de carregamento
        setLoading(true);
        
        // Inicializar o avatar personalizado com opções e cores
        const initialCustomAvatar = { ...INITIAL_CUSTOM_AVATAR };
        
        // Garantir que cada parte do avatar tenha uma opção definida inicialmente
        AVATAR_PARTS.forEach(part => {
          if (part.options && part.options.length > 0) {
            // Definir a primeira opção como padrão
            initialCustomAvatar[part.id] = {
              ...initialCustomAvatar[part.id] || {},
              option: part.options[0].imageUrl
            };
            
            // Definir a cor padrão para partes coloríveis
            if (part.colorizeOptions && part.defaultColor) {
              initialCustomAvatar[part.id] = {
                ...initialCustomAvatar[part.id],
                color: part.defaultColor
              };
            }
            
            // Log para debug
            console.log(`Inicializando parte ${part.id} com opção: ${part.options[0].imageUrl}`);
            
            // Pré-carregar imagens (em React Native, isso pode ser apenas um log)
            part.options.forEach(option => {
              console.log(`Pré-carregando imagem: ${option.imageUrl}`);
              
              // Em uma implementação real, você poderia usar Image.prefetch 
              // ou outra técnica específica da plataforma
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
        
        console.log("Avatar inicializado com opções padrão:", JSON.stringify(initialCustomAvatar));
        
        // Aplicar os valores iniciais
        setCustomAvatar(initialCustomAvatar);
        
        // Definir categoria e modo padrão
        const defaultCategory = AVATAR_PARTS[0]?.id || 'face';
        setCurrentPartCategory(defaultCategory);
        setCurrentCustomization('option');
        
        // Selecionar a categoria "face" por padrão
        const facePart = AVATAR_PARTS.find(part => part.id === 'face');
        if (facePart) {
          console.log(`Categoria face encontrada com ${facePart.options.length} opções`);
          
          // Log para debug: imprimir todas as opções de rosto
          facePart.options.forEach(option => {
            console.log(`Opção de rosto: ${option.name}, URL: ${option.imageUrl}`);
          });
          
          // Forçar a atualização para a primeira opção do rosto
          if (facePart.options.length > 0) {
            const firstFaceOption = facePart.options[0].imageUrl;
            console.log(`Definindo opção padrão para face: ${firstFaceOption}`);
            
            // Garante que customAvatar.face.option está definido corretamente
            setCustomAvatar(prev => ({
              ...prev,
              face: {
                ...prev.face,
                option: firstFaceOption
              }
            }));
          }
        }
        
        // Desativar indicador de carregamento após um pequeno atraso
        setTimeout(() => {
          setLoading(false);
        }, 1000);
      } else {
        console.error("AVATAR_PARTS não está disponível ou está vazio!");
        setLoading(false);
      }
    }
  }, [visible, enableCustomization]);

  // Efeito para filtrar avatares com base nas seleções do usuário
  useEffect(() => {
    if (selectorMode === 'list') {
      // Filtra avatares com base na pesquisa e filtros
      let filtered = [...avatars];
      
      // Filtra por termo de pesquisa
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(avatar => {
          const filename = avatar.split('/').pop()?.toLowerCase() || '';
          return filename.includes(query);
        });
      }
      
      // Filtra por categoria
      if (selectedCategory !== 'all') {
        filtered = filtered.filter(avatar => {
          const filename = avatar.split('/').pop()?.toLowerCase() || '';
          return filename.includes(selectedCategory.toLowerCase());
        });
      }
      
      // Filtra por gênero
      if (selectedGender !== 'all') {
        filtered = filtered.filter(avatar => {
          const filename = avatar.split('/').pop()?.toLowerCase() || '';
          return filename.includes(selectedGender.toLowerCase());
        });
      }
      
      setFilteredAvatars(filtered);
    }
  }, [searchQuery, selectedCategory, selectedGender, avatars, selectorMode]);

  // FUNÇÃO MELHORADA: Restaurar um avatar personalizado a partir de um identificador
  const restoreCustomAvatarFromIdentifier = (avatarIdentifier: string) => {
    try {
      if (!avatarIdentifier || typeof avatarIdentifier !== 'string') {
        console.log('Identificador de avatar inválido ou ausente');
        return false;
      }
      
      if (!avatarIdentifier.startsWith('CUSTOM||')) {
        console.log('Não é um identificador de avatar personalizado válido');
        return false;
      }
      
      console.log('Tentando restaurar avatar personalizado a partir do identificador');
      
      // Dividir a string pelos delimitadores únicos
      const parts = avatarIdentifier.split('||CUSTOM_AVATAR_DATA||');
      
      if (parts.length !== 2) {
        console.error('Formato de identificador inválido: não foi possível dividir corretamente');
        return false;
      }
      
      // Extrair a URL da face (removendo o prefixo "CUSTOM||")
      const faceUrl = parts[0].replace('CUSTOM||', '');
      // Extrair os dados JSON
      const avatarJsonStr = parts[1];
      
      console.log('URL da face extraída:', faceUrl);
      console.log('JSON extraído de tamanho:', avatarJsonStr.length);
      
      if (!avatarJsonStr) {
        console.error('Dados JSON ausentes no identificador do avatar');
        return false;
      }
      
      try {
        // Analisar o JSON
        const avatarData = JSON.parse(avatarJsonStr);
        console.log('Dados do avatar recuperados - tipo:', avatarData.type);
        
        if (!avatarData.parts || !Array.isArray(avatarData.parts)) {
          console.error('Formato inválido: partes do avatar não encontradas');
          return false;
        }
        
        // Construir objeto customAvatar a partir dos dados salvos
        const restoredAvatar = { ...INITIAL_CUSTOM_AVATAR };
        
        // Verificar se temos as partes essenciais
        const hasFace = avatarData.parts.some(part => part.partId === 'face' && part.option);
        const hasEyes = avatarData.parts.some(part => part.partId === 'eyes' && part.option);
        const hasMouth = avatarData.parts.some(part => part.partId === 'mouth' && part.option);
        
        if (!hasFace || !hasEyes || !hasMouth) {
          console.error('Avatar incompleto: faltam partes essenciais');
          console.log(`Face: ${hasFace}, Olhos: ${hasEyes}, Boca: ${hasMouth}`);
          return false;
        }
        
        // Processar cada parte do avatar
        avatarData.parts.forEach(part => {
          if (part.partId) {
            // Verificar se a opção é uma URL válida
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
              console.warn(`Opção inválida para parte ${part.partId}: ${part.option}`);
              // Tentar encontrar uma opção padrão para esta parte
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
        
        // Verificar novamente se temos as partes essenciais após a restauração
        if (!restoredAvatar.face?.option || !restoredAvatar.eyes?.option || !restoredAvatar.mouth?.option) {
          console.error('Falha ao restaurar partes essenciais do avatar');
          return false;
        }
        
        console.log('Avatar restaurado com sucesso');
        
        // Atualizar o estado
        setCustomAvatar(restoredAvatar);
        
        // Se o avatar foi restaurado com sucesso, ativar o modo de customização
        setSelectorMode('mii');
        
        return true;
      } catch (jsonError) {
        console.error('Erro ao analisar JSON do avatar:', jsonError);
        return false;
      }
    } catch (error) {
      console.error('Erro ao restaurar avatar personalizado:', error);
      return false;
    }
  };

  // EFEITO MELHORADO: Tentar restaurar um avatar personalizado
  useEffect(() => {
    if (visible && enableCustomization) {
      // Extrair o tipo de personagem do título (principal ou secundário)
      const isMainCharacter = title.toLowerCase().includes('principal');
      
      // Identificador que poderia ser passado como propriedade
      const avatarIdentifier = isMainCharacter 
        ? window.mainCharacterAvatarData
        : window.secondaryCharacterAvatarData;
      
      console.log(`Verificando dados do avatar ${isMainCharacter ? 'principal' : 'secundário'}`);
      
      if (avatarIdentifier && typeof avatarIdentifier === 'string') {
        if (avatarIdentifier.startsWith('CUSTOM||')) {
          console.log(`Tentando restaurar avatar ${isMainCharacter ? 'principal' : 'secundário'}`);
          
          // Limpar o estado atual antes de restaurar
          setCustomAvatar({ ...INITIAL_CUSTOM_AVATAR });
          
          // Tentar restaurar o avatar
          const success = restoreCustomAvatarFromIdentifier(avatarIdentifier);
          console.log(`Restauração do avatar ${success ? 'bem-sucedida' : 'falhou'}`);
          
          // Se a restauração falhar, limpar os dados do avatar
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
        console.log(`Nenhum avatar encontrado para restaurar (${isMainCharacter ? 'principal' : 'secundário'})`);
      }
    }
  }, [visible, enableCustomization, title]);

  // Efeito para carregar avatares para o modo de lista
  useEffect(() => {
    const fetchAvatars = async () => {
      if (!visible || selectorMode !== 'list') return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Determina a categoria com base no tipo de personagem
        let category = 'children';
        if (characterType === 'adult') category = 'adults';
        else if (characterType === 'animal') category = 'animals';
        else if (characterType === 'fantasy') category = 'fantasy';
        
        console.log(`Buscando avatares para categoria ${category} e estilo ${selectedStyle}`);
        
        // Get avatars from service (which now includes fallback to default avatars)
        const response = await avatarService.getAvatars(category, selectedStyle);
        
        if (response && response.length > 0) {
          console.log(`Carregados ${response.length} avatares para ${category}/${selectedStyle}`);
          setAvatars(response);
          setFilteredAvatars(response);
          setError(null);
        } else {
          console.warn('Nenhum avatar retornado do serviço');
          // Usar avatares padrão em vez de mostrar erro
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
        // Usar avatares padrão em vez de mostrar erro
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

    // Definir o modo inicial com base no enableCustomization
    if (visible) {
      const newMode = enableCustomization ? 'mii' : 'list';
      console.log(`Definindo modo inicial: ${newMode}`);
      setSelectorMode(newMode);
      
      // Se estiver no modo de lista, buscar avatares
      if (newMode === 'list') {
        fetchAvatars();
      }
      
      // Animar entrada do modal
      slideAnim.setValue(0);
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web'
      }).start();
    }
  }, [visible, characterType, selectedStyle, enableCustomization, selectorMode]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleSelectAvatar = (avatarUrl: string) => {
    console.log('Avatar selecionado:', avatarUrl);
    // Notificar o componente pai imediatamente, sem fechar o modal ainda
    onSelectAvatar(avatarUrl);
    // Fechar o modal após a seleção
    onDismiss();
  };
  
  // Função para mostrar menu de cores
  const handleOpenColorMenu = (event: any) => {
    // Obter a posição do toque
    setColorMenuAnchor({
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY
    });
    setShowColorMenu(true);
  };
  
  // Função para selecionar cor
  const handleSelectColor = (color: string) => {
    setCustomAvatar({
      ...customAvatar,
      [currentPartCategory]: {
        ...customAvatar[currentPartCategory],
        color
      }
    });
    setShowColorMenu(false);
    
    // Animar seleção de cor
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true
      })
    ]).start();
  };
  
  // Função para salvar uma cor personalizada
  const handleSaveCustomColor = (color: string, name: string) => {
    const newColor = {
      id: `custom_${Date.now()}`,
      name,
      value: color
    };
    
    setSavedColors([...savedColors, newColor]);
    setShowColorMenu(false);
  };

  // FUNÇÃO MELHORADA: Confirmar o avatar personalizado
  const handleSelectCustomAvatar = async () => {
    try {
      // Mostrar indicador de carregamento
      setLoading(true);
      
      // Verificar se o avatar está completo
      const requiredParts = ['face', 'eyes', 'mouth']; // partes que são obrigatórias
      const missingParts = requiredParts.filter(part => 
        !customAvatar[part] || !customAvatar[part].option
      );
      
      if (missingParts.length > 0) {
        // Traduzir os nomes das partes para o português para a mensagem de erro
        const partTranslations = {
          face: 'Rosto',
          eyes: 'Olhos',
          mouth: 'Boca'
        };
        
        const translatedMissingParts = missingParts.map(part => 
          partTranslations[part] || part
        );
        
        Alert.alert(
          "Avatar Incompleto",
          `Algumas partes obrigatórias estão faltando: ${translatedMissingParts.join(', ')}.\n\nPor favor, selecione opções para todas as partes obrigatórias.`,
          [{ text: "OK" }]
        );
        
        setLoading(false);
        return;
      }
      
      // Verificar se todas as URLs são válidas
      for (const partId in customAvatar) {
        const part = customAvatar[partId];
        if (part && part.option && typeof part.option === 'string') {
          if (!part.option.startsWith('http')) {
            console.error(`URL inválida para parte ${partId}: ${part.option}`);
            
            // Tentar corrigir a URL
            const partDef = AVATAR_PARTS.find(p => p.id === partId);
            if (partDef && partDef.options && partDef.options.length > 0) {
              customAvatar[partId].option = partDef.options[0].imageUrl;
              console.log(`Corrigida URL para ${partId}: ${partDef.options[0].imageUrl}`);
            } else {
              // Se não puder corrigir e for uma parte obrigatória, mostrar erro
              if (requiredParts.includes(partId)) {
                Alert.alert(
                  "Erro no Avatar",
                  `Erro na imagem da parte: ${partId}. Por favor, selecione outra opção.`,
                  [{ text: "OK" }]
                );
                setLoading(false);
                return;
              }
            }
          }
        }
      }
      
      // Criar uma representação persistente de todas as partes do avatar
      const serializedAvatar = {
        type: 'custom_avatar',
        parts: Object.entries(customAvatar)
          .filter(([_, partData]) => partData && partData.option) // Filtrar partes sem opção
          .map(([partId, partData]) => {
            return {
              partId,
              option: partData.option,
              color: partData.color,
              size: partData.size,
              position: partData.position,
              // Incluir todas as outras propriedades relevantes
              width: partData.width,
              height: partData.height,
              spacing: partData.spacing,
              rotation: partData.rotation,
              density: partData.density
            };
          }),
        // Incluir URL da face como representação visual principal (para compatibilidade)
        previewUrl: customAvatar.face?.option,
        // Adicionar timestamp para evitar problemas de cache
        timestamp: Date.now()
      };
      
      // Serializar o objeto para JSON
      const avatarJson = JSON.stringify(serializedAvatar);
      console.log('Avatar serializado para persistência:', avatarJson.substring(0, 100) + '...');
      
      // Verificar se temos uma URL de face válida
      const faceUrl = customAvatar.face?.option;
      
      if (!faceUrl || typeof faceUrl !== 'string' || !faceUrl.startsWith('http')) {
        console.error('URL de face inválida:', faceUrl);
        Alert.alert(
          "Erro no Avatar",
          "A imagem do rosto é inválida. Por favor, selecione outro rosto.",
          [{ text: "OK" }]
        );
        setLoading(false);
        return;
      }
      
      // Criar um identificador especial para o avatar customizado
      // Usando um delimitador único "||CUSTOM_AVATAR_DATA||" que é improvável de aparecer em URLs ou JSON
      const customAvatarIdentifier = `CUSTOM||${faceUrl}||CUSTOM_AVATAR_DATA||${avatarJson}`;
      
      console.log('Avatar customizado criado com sucesso, retornando identificador');
      
      // Passar o identificador completo para o componente pai
      onSelectAvatar(customAvatarIdentifier);
      onDismiss();
    } catch (error) {
      console.error('Erro ao criar avatar personalizado:', error);
      
      // Em caso de erro, usar um avatar padrão
      const defaultUrl = 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png';
      console.log('Erro ao processar avatar, usando padrão:', defaultUrl);
      
      Alert.alert(
        "Erro ao Criar Avatar",
        "Ocorreu um erro ao criar seu avatar personalizado. Um avatar padrão será usado.",
        [{ text: "OK" }]
      );
      
      // Certificar-se de que a URL padrão é uma string válida
      onSelectAvatar(defaultUrl);
      onDismiss();
    } finally {
      setLoading(false);
    }
  };

  // Função para alterar a categoria de personalização
  const handleSelectPartCategory = (partId: string) => {
    console.log(`Alterando categoria para: ${partId}`);
    
    // Primeiro, verificar se a categoria existe e tem opções
    const targetPart = AVATAR_PARTS.find(part => part.id === partId);
    if (!targetPart) {
      console.error(`Categoria ${partId} não encontrada!`);
      return;
    }
    
    console.log(`Categoria ${partId} encontrada com ${targetPart.options.length} opções`);
    
    // Atualizar estado de categoria
    setCurrentPartCategory(partId);
    
    // Resetar para o modo de opções ao trocar de categoria
    setCurrentCustomization('option');
    
    // Garantir que o avatar tenha uma opção inicial para esta categoria
    const updatedAvatar = { ...customAvatar };
    
    // Se não houver uma opção definida para esta categoria, configure a primeira opção disponível
    if (!updatedAvatar[partId] || !updatedAvatar[partId].option) {
      if (targetPart.options && targetPart.options.length > 0) {
        updatedAvatar[partId] = {
          ...updatedAvatar[partId] || {},
          option: targetPart.options[0].imageUrl
        };
        
        if (targetPart.colorizeOptions && targetPart.defaultColor) {
          updatedAvatar[partId].color = targetPart.defaultColor;
        }
        
        console.log(`Definida opção padrão para ${partId}: ${targetPart.options[0].imageUrl}`);
      }
    }
    
    // Debug: imprimir opções da categoria selecionada
    if (targetPart.options && targetPart.options.length > 0) {
      console.log("Opções disponíveis para esta categoria:");
      targetPart.options.forEach(option => {
        console.log(`- ${option.name}: ${option.imageUrl}`);
      });
    }
    
    // Forçar uma atualização no estado do avatar
    setCustomAvatar(updatedAvatar);
    
    // Animar transição entre categorias
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true
      })
    ]).start();
  };

  // Função para selecionar uma opção dentro de uma categoria
  const handleSelectPartOption = (partId: string, optionUrl: string) => {
    console.log(`Selecionando opção para parte ${partId}: ${optionUrl}`);
    
    // Atualizar objeto customAvatar
    setCustomAvatar(prevAvatar => {
      // Criar uma cópia do objeto atual
      const newAvatar = { ...prevAvatar };
      
      // Verificar se já existe uma entrada para esta categoria
      if (!newAvatar[partId]) {
        newAvatar[partId] = {};
      }
      
      // Atualizar a opção selecionada
      newAvatar[partId] = {
        ...newAvatar[partId],
        option: optionUrl
      };
      
      // Para debug
      console.log(`Avatar atualizado para parte ${partId}:`, JSON.stringify(newAvatar[partId]));
      
      return newAvatar;
    });
    
    // Animar seleção
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true
      })
    ]).start();
  };
  
  // Função para atualizar o valor de um slider
  const handleSliderChange = (sliderId: string, value: number) => {
    const updatedAvatar = { ...customAvatar };
    const part = { ...updatedAvatar[currentPartCategory] };
    
    // Atualizar o valor apropriado com base no ID do slider
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
    
    // Feedback sutil de animação
    Animated.timing(scaleAnim, {
      toValue: 1 + (value - 1) * 0.05,
      duration: 10,
      useNativeDriver: true
    }).start();
  };
  
  // Função para aleatorizar o avatar
  const handleRandomizeAvatar = () => {
    const randomizedAvatar = { ...customAvatar };
    
    // Para cada parte do avatar, escolher uma opção aleatória
    AVATAR_PARTS.forEach(part => {
      if (part.options.length > 0) {
        const randomIndex = Math.floor(Math.random() * part.options.length);
        randomizedAvatar[part.id] = {
          ...randomizedAvatar[part.id],
          option: part.options[randomIndex].imageUrl
        };
        
        // Se a parte pode ser colorizada, escolher uma cor aleatória
        if (part.colorizeOptions) {
          const randomColorIndex = Math.floor(Math.random() * savedColors.length);
          randomizedAvatar[part.id].color = savedColors[randomColorIndex].value;
        }
        
        // Randomizar alguns sliders para mais variedade
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
    
    // Animar aleatorização
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true
      }),
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 150,
        useNativeDriver: true
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true
      })
    ]).start();
  };

  // Componente para renderizar o avatar da lista
  const renderAvatar = React.useCallback(({ item }: { item: string }) => {
    return (
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
    );
  }, []);

  // Componente para renderizar as abas de categorias de personalização
  const renderMiiCategoryTabs = () => {
    return (
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
  };
  
  // Componente para renderizar os botões de alternância entre opções, cores e ajustes
  const renderCustomizationToggle = () => {
    const currentPart = AVATAR_PARTS.find(part => part.id === currentPartCategory);
    const hasColorOptions = currentPart?.colorizeOptions;
    
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

  // Componente para renderizar o modo de customização de Mii
  const renderMiiCustomizationMode = () => {
    console.log("Renderizando modo de customização Mii");
    
    // Verificar se os dados estão prontos
    if (!AVATAR_PARTS || AVATAR_PARTS.length === 0) {
      console.log("AVATAR_PARTS não está disponível");
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Carregando opções de customização...</Text>
        </View>
      );
    }
    
    // Verificar se o customAvatar está inicializado corretamente
    const hasValidCustomAvatar = customAvatar && Object.keys(customAvatar).length > 0;
    if (!hasValidCustomAvatar) {
      console.log("customAvatar não está inicializado corretamente");
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Preparando avatar para customização...</Text>
        </View>
      );
    }
    
    return (
      <View style={[styles.miiContainer, {height: Dimensions.get('window').height - 50}]}>
        {/* Preview do avatar 3D com rotação */}
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
        
        {/* Área de tabs fixada abaixo do preview */}
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
        
        {/* Toggle entre opções/cores/ajustes */}
        <View style={styles.customizationToggleContainer}>
          <SegmentedButtons
            value={currentCustomization}
            onValueChange={(value) => setCurrentCustomization(value as any)}
            buttons={[
              { value: 'option', label: 'Opções', icon: 'shape-outline' },
              { 
                value: 'color', 
                label: 'Cores', 
                icon: 'palette', 
                disabled: !AVATAR_PARTS.find(part => part.id === currentPartCategory)?.colorizeOptions 
              },
              { value: 'sliders', label: 'Ajustes', icon: 'tune-vertical' }
            ]}
            style={styles.customizationToggle}
          />
        </View>
        
        <View style={styles.divider} />
        
        {/* Conteúdo baseado na seleção atual (opções/cores/ajustes) */}
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
              canColorize={AVATAR_PARTS.find(part => part.id === currentPartCategory)?.colorizeOptions || false}
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
        
        {/* Botões de ação no rodapé fixo */}
        <View style={styles.miiActionButtons}>
          <Button 
            mode="outlined" 
            onPress={onDismiss}
            style={styles.miiActionButton}
            icon="arrow-left"
          >
            Cancelar
          </Button>
          <Button 
            mode="contained" 
            onPress={handleSelectCustomAvatar}
            style={[styles.miiActionButton, styles.confirmButton]}
            icon="check"
            loading={loading}
            disabled={loading}
          >
            Confirmar
          </Button>
        </View>
      </View>
    );
  };

  // Componente para renderizar o modo de lista de avatares
  const renderListMode = () => {
    return (
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
              {getCategories().map((category) => (
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
              <Chip
                selected={selectedGender === 'all'}
                onPress={() => setSelectedGender('all')}
                style={styles.chip}
                mode={selectedGender === 'all' ? 'flat' : 'outlined'}
              >
                Todos
              </Chip>
              <Chip
                selected={selectedGender === 'male'}
                onPress={() => setSelectedGender('male')}
                style={styles.chip}
                mode={selectedGender === 'male' ? 'flat' : 'outlined'}
              >
                Masculino
              </Chip>
              <Chip
                selected={selectedGender === 'female'}
                onPress={() => setSelectedGender('female')}
                style={styles.chip}
                mode={selectedGender === 'female' ? 'flat' : 'outlined'}
              >
                Feminino
              </Chip>
              <Chip
                selected={selectedGender === 'neutral'}
                onPress={() => setSelectedGender('neutral')}
                style={styles.chip}
                mode={selectedGender === 'neutral' ? 'flat' : 'outlined'}
              >
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

        {/* Botão para criar avatar personalizado */}
        <Button 
          mode="contained" 
          icon="account-edit" 
          onPress={() => setSelectorMode('mii')}
          style={styles.createMiiButton}
        >
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
                  // Trigger a re-fetch by changing and resetting the style
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
  };

  // Componente para renderizar as categorias disponíveis com filtro por tipo
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
        return [
          { label: 'Todos', value: 'all' }
        ];
    }
  };

  // Efeito para imprimir informações de debug no console
  useEffect(() => {
    console.log("AvatarSelector - Estado atual:");
    console.log("- Modo: " + selectorMode);
    console.log("- Visível: " + visible);
    console.log("- enableCustomization: " + enableCustomization);
    console.log("- Categoria atual: " + currentPartCategory);
    console.log("- Modo de customização: " + currentCustomization);
    
    // Para debug: verificar valores do customAvatar
    console.log("- customAvatar: ", JSON.stringify(customAvatar));
    
    // Verificar se AVATAR_PARTS contém dados
    console.log("- AVATAR_PARTS carregado: " + (AVATAR_PARTS?.length || 0) + " partes");
    
    // Para debug: verificar a categoria atual
    const currentPartDef = AVATAR_PARTS.find(part => part.id === currentPartCategory);
    console.log("- Categoria atual tem " + (currentPartDef?.options?.length || 0) + " opções");
    
    // Garantir que quando enableCustomization for verdadeiro, o modo seja 'mii'
    if (visible && enableCustomization && selectorMode !== 'mii') {
      console.log("Forçando modo 'mii' porque enableCustomization é verdadeiro");
      setSelectorMode('mii');
    }
  }, [visible, selectorMode, enableCustomization, currentPartCategory, currentCustomization, customAvatar]);

  // Renderização principal do componente
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
        dismissable={true}
      >
        <SafeAreaView style={{flex: 1, width: '100%', height: '100%'}}>
          <Animated.View style={[
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
          ]}>
            <View style={styles.cardContainer}>
              {/* Wrap the Card in a container that doesn't clip shadows */}
              <View style={styles.cardWrapper}>
                <Card style={styles.card}>
                  <Card.Title 
                    title={selectorMode === 'list' ? title : "Criação de Avatar"} 
                    subtitle={selectorMode === 'mii' ? "Personalize seu avatar ao estilo Mii" : undefined}
                    right={(props) => (
                      <IconButton 
                        {...props} 
                        icon="close" 
                        onPress={onDismiss}
                        accessibilityLabel="Fechar"
                      />
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
    justifyContent: 'flex-start', // Alterado para flex-start
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalContent: {
    flex: 1,
    width: '100%',
    height: '100%'
  },
  cardContainer: {
    flex: 1,
    padding: 0 // Removido o padding para tela cheia
  },
  cardWrapper: {
    flex: 1,
    width: '100%',
    height: '100%'
  },
  card: {
    flex: 1,
    borderRadius: 0, // Removido o borderRadius para tela cheia
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
  
  // Estilos para o modo de customização estilo Mii
  miiContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    flexDirection: 'column'
  },
  previewWrapper: {
    width: '100%',
    height: 220, // Reduzido para dar mais espaço para as opções
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
    zIndex: 10 // Garante que fique acima de outros elementos
  },
  customizationToggleContainer: {
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 2,
    zIndex: 9 // Menor que o tabsContainer
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
    paddingBottom: 80, // Aumentado o espaço para os botões no rodapé
    height: 300, // Altura mínima para garantir visibilidade
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
    elevation: 5, // Adicionado para destacar mais no Android
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