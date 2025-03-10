// src/components/character/AvatarSelector.tsx
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
  SegmentedButtons,
  Menu,
  Slider
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
import * as avatarService from '../../services/avatarService';
// Importação condicional para evitar erros quando o módulo não está disponível
let LinearGradient: any;
try {
  LinearGradient = require('expo-linear-gradient').LinearGradient;
} catch (e) {
  // Componente substituto caso o módulo não esteja disponível
  LinearGradient = ({ children, style }) => (
    <View style={[{ backgroundColor: '#2196F3' }, style]}>
      {children}
    </View>
  );
}

interface AvatarSelectorProps {
  visible: boolean;
  onDismiss: () => void;
  onSelectAvatar: (avatarUrl: string) => void;
  title: string;
  characterType?: 'child' | 'adult' | 'animal' | 'fantasy';
}

// Tipos para partes de avatar customizáveis
interface AvatarPart {
  id: string;
  name: string;
  options: AvatarOption[];
  colorizeOptions?: boolean;
}

interface AvatarOption {
  id: string;
  imageUrl: string;
  name: string;
}

// Interfaces para cores e opções de personalização
interface AvatarColor {
  id: string;
  name: string;
  value: string;
}

interface CustomizationSlider {
  id: string;
  name: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

const AvatarSelector: React.FC<AvatarSelectorProps> = ({
  visible,
  onDismiss,
  onSelectAvatar,
  title,
  characterType = 'child'
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
  const [selectorMode, setSelectorMode] = useState<'list' | 'mii'>('list');
  
  // Estados para o menu de personalização
  const [showColorMenu, setShowColorMenu] = useState<boolean>(false);
  const [colorMenuAnchor, setColorMenuAnchor] = useState({ x: 0, y: 0 });
  
  // Estados para o avatar personalizado
  const [customAvatar, setCustomAvatar] = useState<{ [key: string]: any }>({
    face: {
      option: '',
      color: '#FFD3B6',
      size: 1,
      position: { x: 0, y: 0 }
    },
    eyes: {
      option: '',
      color: '#614700',
      size: 1,
      position: { x: 0, y: 0 },
      spacing: 1
    },
    eyebrows: {
      option: '',
      color: '#614700',
      size: 1,
      position: { x: 0, y: 0 }
    },
    nose: {
      option: '',
      size: 1,
      position: { x: 0, y: 0 }
    },
    mouth: {
      option: '',
      color: '#FF4D4D',
      size: 1,
      position: { x: 0, y: 0 }
    },
    hair: {
      option: '',
      color: '#614700',
      size: 1,
      position: { x: 0, y: 0 }
    },
    beard: {
      option: '',
      color: '#614700',
      size: 1,
      position: { x: 0, y: 0 }
    },
    glasses: {
      option: '',
      color: '#000000',
      size: 1,
      position: { x: 0, y: 0 }
    },
    accessories: {
      option: '',
      color: '#E4E4E4',
      size: 1,
      position: { x: 0, y: 0 }
    },
    body: {
      option: '',
      color: '#FFD3B6',
      size: 1
    },
    outfit: {
      option: '',
      color: '#4A6DD0',
      size: 1
    }
  });
  const [currentPartCategory, setCurrentPartCategory] = useState<string>('face');
  const [currentCustomization, setCurrentCustomization] = useState<'option' | 'color' | 'sliders'>('option');
  
  // Estado para as cores salvas pelo usuário
  const [savedColors, setSavedColors] = useState<AvatarColor[]>([
    { id: 'skin1', name: 'Pele Clara', value: '#FFD3B6' },
    { id: 'skin2', name: 'Pele Média', value: '#E5B887' },
    { id: 'skin3', name: 'Pele Escura', value: '#8D5524' },
    { id: 'hair1', name: 'Castanho', value: '#614700' },
    { id: 'hair2', name: 'Preto', value: '#000000' },
    { id: 'hair3', name: 'Loiro', value: '#FFC300' },
    { id: 'hair4', name: 'Ruivo', value: '#FF4500' },
    { id: 'outfit1', name: 'Azul', value: '#4A6DD0' },
    { id: 'outfit2', name: 'Vermelho', value: '#FF4D4D' },
    { id: 'outfit3', name: 'Verde', value: '#4CAF50' }
  ]);
  
  // Controles para sliders de personalização (tamanho, posição, etc.)
  const sliders: { [key: string]: CustomizationSlider[] } = {
    face: [
      { id: 'size', name: 'Tamanho', min: 0.8, max: 1.2, step: 0.05, defaultValue: 1 },
      { id: 'position_y', name: 'Posição Vertical', min: -20, max: 20, step: 1, defaultValue: 0 }
    ],
    eyes: [
      { id: 'size', name: 'Tamanho', min: 0.8, max: 1.2, step: 0.05, defaultValue: 1 },
      { id: 'spacing', name: 'Espaçamento', min: 0.8, max: 1.2, step: 0.05, defaultValue: 1 },
      { id: 'position_y', name: 'Posição Vertical', min: -10, max: 10, step: 1, defaultValue: 0 }
    ],
    eyebrows: [
      { id: 'size', name: 'Tamanho', min: 0.8, max: 1.2, step: 0.05, defaultValue: 1 },
      { id: 'position_y', name: 'Posição Vertical', min: -10, max: 10, step: 1, defaultValue: 0 }
    ],
    nose: [
      { id: 'size', name: 'Tamanho', min: 0.8, max: 1.2, step: 0.05, defaultValue: 1 },
      { id: 'position_y', name: 'Posição Vertical', min: -10, max: 10, step: 1, defaultValue: 0 }
    ],
    mouth: [
      { id: 'size', name: 'Tamanho', min: 0.8, max: 1.2, step: 0.05, defaultValue: 1 },
      { id: 'position_y', name: 'Posição Vertical', min: -10, max: 10, step: 1, defaultValue: 0 }
    ],
    hair: [
      { id: 'size', name: 'Volume', min: 0.8, max: 1.2, step: 0.05, defaultValue: 1 },
      { id: 'position_y', name: 'Posição Vertical', min: -10, max: 10, step: 1, defaultValue: 0 }
    ],
    beard: [
      { id: 'size', name: 'Tamanho', min: 0.8, max: 1.2, step: 0.05, defaultValue: 1 },
      { id: 'position_y', name: 'Posição Vertical', min: -5, max: 5, step: 1, defaultValue: 0 }
    ],
    glasses: [
      { id: 'size', name: 'Tamanho', min: 0.8, max: 1.2, step: 0.05, defaultValue: 1 },
      { id: 'position_y', name: 'Posição Vertical', min: -5, max: 5, step: 1, defaultValue: 0 }
    ],
    accessories: [
      { id: 'size', name: 'Tamanho', min: 0.8, max: 1.2, step: 0.05, defaultValue: 1 },
      { id: 'position_y', name: 'Posição Vertical', min: -10, max: 10, step: 1, defaultValue: 0 }
    ],
    body: [
      { id: 'size', name: 'Largura', min: 0.8, max: 1.2, step: 0.05, defaultValue: 1 }
    ],
    outfit: [
      { id: 'size', name: 'Tamanho', min: 0.8, max: 1.2, step: 0.05, defaultValue: 1 }
    ]
  };
  
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

  // Definição das partes customizáveis do avatar (estilo Mii)
  const avatarParts: AvatarPart[] = [
    {
      id: 'face',
      name: 'Rosto',
      colorizeOptions: true,
      options: [
        { id: 'face1', name: 'Redondo', imageUrl: 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png' },
        { id: 'face2', name: 'Oval', imageUrl: 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png' },
        { id: 'face3', name: 'Quadrado', imageUrl: 'https://cdn-icons-png.flaticon.com/512/4140/4140051.png' },
        { id: 'face4', name: 'Triangular', imageUrl: 'https://cdn-icons-png.flaticon.com/512/4140/4140047.png' }
      ]
    },
    {
      id: 'eyes',
      name: 'Olhos',
      colorizeOptions: true,
      options: [
        { id: 'eyes1', name: 'Redondos', imageUrl: 'https://cdn-icons-png.flaticon.com/512/1691/1691243.png' },
        { id: 'eyes2', name: 'Puxados', imageUrl: 'https://cdn-icons-png.flaticon.com/512/1691/1691291.png' },
        { id: 'eyes3', name: 'Grandes', imageUrl: 'https://cdn-icons-png.flaticon.com/512/1691/1691287.png' },
        { id: 'eyes4', name: 'Pequenos', imageUrl: 'https://cdn-icons-png.flaticon.com/512/1691/1691284.png' }
      ]
    },
    {
      id: 'eyebrows',
      name: 'Sobrancelhas',
      colorizeOptions: true,
      options: [
        { id: 'eyebrows1', name: 'Retas', imageUrl: 'https://cdn-icons-png.flaticon.com/512/1691/1691243.png' },
        { id: 'eyebrows2', name: 'Arqueadas', imageUrl: 'https://cdn-icons-png.flaticon.com/512/1691/1691291.png' },
        { id: 'eyebrows3', name: 'Grossas', imageUrl: 'https://cdn-icons-png.flaticon.com/512/1691/1691287.png' }
      ]
    },
    {
      id: 'nose',
      name: 'Nariz',
      options: [
        { id: 'nose1', name: 'Pequeno', imageUrl: 'https://cdn-icons-png.flaticon.com/512/4140/4140076.png' },
        { id: 'nose2', name: 'Grande', imageUrl: 'https://cdn-icons-png.flaticon.com/512/4140/4140047.png' },
        { id: 'nose3', name: 'Arredondado', imageUrl: 'https://cdn-icons-png.flaticon.com/512/616/616554.png' }
      ]
    },
    {
      id: 'mouth',
      name: 'Boca',
      colorizeOptions: true,
      options: [
        { id: 'mouth1', name: 'Sorriso', imageUrl: 'https://cdn-icons-png.flaticon.com/512/616/616412.png' },
        { id: 'mouth2', name: 'Neutra', imageUrl: 'https://cdn-icons-png.flaticon.com/512/616/616408.png' },
        { id: 'mouth3', name: 'Surpresa', imageUrl: 'https://cdn-icons-png.flaticon.com/512/616/616430.png' },
        { id: 'mouth4', name: 'Grande', imageUrl: 'https://cdn-icons-png.flaticon.com/512/616/616554.png' }
      ]
    },
    {
      id: 'hair',
      name: 'Cabelo',
      colorizeOptions: true,
      options: [
        { id: 'hair1', name: 'Curto', imageUrl: 'https://cdn-icons-png.flaticon.com/512/4140/4140061.png' },
        { id: 'hair2', name: 'Médio', imageUrl: 'https://cdn-icons-png.flaticon.com/512/4140/4140066.png' },
        { id: 'hair3', name: 'Longo', imageUrl: 'https://cdn-icons-png.flaticon.com/512/4140/4140060.png' },
        { id: 'hair4', name: 'Cacheado', imageUrl: 'https://cdn-icons-png.flaticon.com/512/4140/4140076.png' },
        { id: 'hair5', name: 'Raspado', imageUrl: 'https://cdn-icons-png.flaticon.com/512/616/616430.png' }
      ]
    },
    {
      id: 'beard',
      name: 'Barba',
      colorizeOptions: true,
      options: [
        { id: 'beard1', name: 'Nenhuma', imageUrl: 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png' },
        { id: 'beard2', name: 'Curta', imageUrl: 'https://cdn-icons-png.flaticon.com/512/4140/4140061.png' },
        { id: 'beard3', name: 'Longa', imageUrl: 'https://cdn-icons-png.flaticon.com/512/4140/4140060.png' }
      ]
    },
    {
      id: 'glasses',
      name: 'Óculos',
      colorizeOptions: true,
      options: [
        { id: 'glasses1', name: 'Nenhum', imageUrl: 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png' },
        { id: 'glasses2', name: 'Redondo', imageUrl: 'https://cdn-icons-png.flaticon.com/512/1691/1691284.png' },
        { id: 'glasses3', name: 'Quadrado', imageUrl: 'https://cdn-icons-png.flaticon.com/512/1691/1691243.png' }
      ]
    },
    {
      id: 'accessories',
      name: 'Acessórios',
      colorizeOptions: true,
      options: [
        { id: 'accessory1', name: 'Nenhum', imageUrl: 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png' },
        { id: 'accessory2', name: 'Chapéu', imageUrl: 'https://cdn-icons-png.flaticon.com/512/1691/1691243.png' },
        { id: 'accessory3', name: 'Boné', imageUrl: 'https://cdn-icons-png.flaticon.com/512/1691/1691291.png' }
      ]
    },
    {
      id: 'outfit',
      name: 'Roupa',
      colorizeOptions: true,
      options: [
        { id: 'outfit1', name: 'Casual', imageUrl: 'https://cdn-icons-png.flaticon.com/512/4140/4140076.png' },
        { id: 'outfit2', name: 'Esporte', imageUrl: 'https://cdn-icons-png.flaticon.com/512/4140/4140047.png' },
        { id: 'outfit3', name: 'Formal', imageUrl: 'https://cdn-icons-png.flaticon.com/512/616/616554.png' }
      ]
    }
  ];

  // Efeito para carregar avatares e inicializar estado
  useEffect(() => {
    const fetchAvatars = async () => {
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

    if (visible) {
      fetchAvatars();
      
      // Inicializar o avatar personalizado com as primeiras opções de cada categoria
      const initialCustomAvatar = { ...customAvatar };
      avatarParts.forEach(part => {
        if (part.options.length > 0) {
          initialCustomAvatar[part.id] = {
            ...initialCustomAvatar[part.id],
            option: part.options[0].imageUrl
          };
        }
      });
      setCustomAvatar(initialCustomAvatar);
      
      // Iniciar no modo lista por padrão
      setSelectorMode('list');
      setCurrentPartCategory('face');
      setCurrentCustomization('option');
      
      // Animar entrada do modal
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }).start();
    }
  }, [visible, characterType, selectedStyle]);

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

  // Animações e referências
  useEffect(() => {
    if (visible) {
      // Animar entrada do modal
      slideAnim.setValue(0);
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web', // Native Driver pode causar problemas no web
      }).start();
    }
  }, [visible]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleSelectAvatar = (avatarUrl: string) => {
    console.log('Avatar selecionado:', avatarUrl);
    
    // Garantir que a URL seja HTTPS
    let secureUrl = avatarUrl;
    if (secureUrl.startsWith('http:')) {
      secureUrl = secureUrl.replace('http:', 'https:');
      console.log('URL convertida para HTTPS:', secureUrl);
    }
    
    // Notificar o componente pai imediatamente, sem fechar o modal ainda
    onSelectAvatar(secureUrl);
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

  // Função para confirmar o avatar personalizado
  const handleSelectCustomAvatar = () => {
    // Preparar um objeto com os dados do avatar para enviar ao servidor
    const avatarData = {
      parts: Object.entries(customAvatar).map(([partId, partData]) => ({
        partId,
        option: partData.option,
        color: partData.color,
        size: partData.size,
        position: partData.position
      }))
    };
    
    // Aqui você enviaria avatarData para o servidor para compor a imagem
    // Para este exemplo, vamos apenas simular isso
    
    Alert.alert(
      "Avatar Personalizado",
      "Seu avatar personalizado foi criado com sucesso! Em um cenário real, este avatar seria gerado pelo servidor.",
      [
        {
          text: "OK",
          onPress: () => {
            // Use o rosto como representação temporária (num cenário real, seria a imagem composta pelo servidor)
            onSelectAvatar(customAvatar.face.option);
            onDismiss();
          }
        }
      ]
    );
  };

  // Função para alterar a categoria de personalização
  const handleSelectPartCategory = (partId: string) => {
    setCurrentPartCategory(partId);
    
    // Resetar para o modo de opções ao trocar de categoria
    setCurrentCustomization('option');
    
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
    setCustomAvatar({
      ...customAvatar,
      [partId]: {
        ...customAvatar[partId],
        option: optionUrl
      }
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
    // Verificar o tipo de slider
    if (sliderId === 'size') {
      setCustomAvatar({
        ...customAvatar,
        [currentPartCategory]: {
          ...customAvatar[currentPartCategory],
          size: value
        }
      });
    } else if (sliderId === 'spacing') {
      setCustomAvatar({
        ...customAvatar,
        [currentPartCategory]: {
          ...customAvatar[currentPartCategory],
          spacing: value
        }
      });
    } else if (sliderId === 'position_y') {
      setCustomAvatar({
        ...customAvatar,
        [currentPartCategory]: {
          ...customAvatar[currentPartCategory],
          position: {
            ...customAvatar[currentPartCategory].position,
            y: value
          }
        }
      });
    }
    
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
    avatarParts.forEach(part => {
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

  // Componente para renderizar um avatar da lista
  const renderAvatar = React.useCallback(({ item }: { item: string }) => {
    return (
      <TouchableOpacity
        style={styles.avatarContainer}
        onPress={() => handleSelectAvatar(item)}
        testID={`avatar-item-${item.split('/').pop()}`}
        activeOpacity={0.7}
      >
        <View style={styles.avatarWrapper}>
          <Image 
            source={{ uri: item }} 
            style={styles.avatar} 
            onError={(e) => {
              console.error('Erro ao carregar imagem:', e.nativeEvent.error, 'URL:', item);
            }}
            defaultSource={require('../../assets/placeholder-image.png')}
            resizeMode="cover"
          />
        </View>
      </TouchableOpacity>
    );
  }, []);

  // Componente para renderizar as opções de uma categoria no modo Mii
  const renderCustomizerOptions = () => {
    const currentPart = avatarParts.find(part => part.id === currentPartCategory);
    
    if (!currentPart) return null;
    
    return (
      <View style={styles.customizationOptionsContainer}>
        <FlatList
          data={currentPart.options}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.partOptionContainer,
                customAvatar[currentPartCategory].option === item.imageUrl && styles.selectedPartOption
              ]}
              onPress={() => handleSelectPartOption(currentPartCategory, item.imageUrl)}
            >
              <Image 
                source={{ uri: item.imageUrl }} 
                style={[
                  styles.partOptionImage,
                  { 
                    tintColor: currentPart.colorizeOptions ? customAvatar[currentPartCategory].color : undefined 
                  }
                ]} 
              />
              <Text style={styles.partOptionText}>{item.name}</Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.partOptionsContent}
        />
      </View>
    );
  };
  
  // Componente para renderizar o seletor de cores
  const renderColorSelector = () => {
    const currentPart = avatarParts.find(part => part.id === currentPartCategory);
    
    if (!currentPart || !currentPart.colorizeOptions) {
      return (
        <View style={styles.colorSelectorContainer}>
          <Text style={styles.noColorOptionsText}>
            Este elemento não possui opções de cor
          </Text>
        </View>
      );
    }
    
    return (
      <View style={styles.colorSelectorContainer}>
        <Text style={styles.colorSelectorTitle}>Selecione uma cor:</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.colorSwatchesContainer}
        >
          {savedColors.map((color) => (
            <TouchableOpacity
              key={color.id}
              style={[
                styles.colorSwatch,
                { backgroundColor: color.value },
                customAvatar[currentPartCategory].color === color.value && styles.selectedColorSwatch
              ]}
              onPress={() => handleSelectColor(color.value)}
            >
              {customAvatar[currentPartCategory].color === color.value && (
                <View style={styles.selectedColorIndicator} />
              )}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.addColorButton}
            onPress={handleOpenColorMenu}
          >
            <Text style={styles.addColorButtonText}>+</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };
  
  // Componente para renderizar os sliders de personalização
  const renderCustomizationSliders = () => {
    const currentPartSliders = sliders[currentPartCategory] || [];
    
    if (currentPartSliders.length === 0) {
      return (
        <View style={styles.slidersContainer}>
          <Text style={styles.noSlidersText}>
            Este elemento não possui opções de ajuste
          </Text>
        </View>
      );
    }
    
    return (
      <View style={styles.slidersContainer}>
        <Text style={styles.slidersTitle}>Ajustes:</Text>
        {currentPartSliders.map((slider) => {
          // Determinar o valor atual do slider com base no ID
          let currentValue = 1;
          if (slider.id === 'size') {
            currentValue = customAvatar[currentPartCategory].size;
          } else if (slider.id === 'spacing') {
            currentValue = customAvatar[currentPartCategory].spacing || 1;
          } else if (slider.id === 'position_y') {
            currentValue = customAvatar[currentPartCategory].position?.y || 0;
          }
          
          return (
            <View key={slider.id} style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>{slider.name}: {currentValue.toFixed(2)}</Text>
              <Slider
                value={currentValue}
                minimumValue={slider.min}
                maximumValue={slider.max}
                step={slider.step}
                onValueChange={(value) => handleSliderChange(slider.id, value)}
                style={styles.slider}
                minimumTrackTintColor="#2196F3"
                maximumTrackTintColor="#D1D1D1"
              />
            </View>
          );
        })}
      </View>
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

  // Componente para renderizar o preview do avatar personalizado estilo Mii
  const renderMiiAvatarPreview = () => {
    // Neste exemplo usamos a imagem do rosto como representação do avatar completo
    // Em um cenário real, você renderizaria cada componente em camadas
    const currentPart = avatarParts.find(part => part.id === currentPartCategory);
    const canColorize = currentPart?.colorizeOptions;
    
    return (
      <View style={styles.miiPreviewContainer}>
        <LinearGradient
          colors={['#87CEEB', '#1E90FF']}
          style={styles.miiPreviewBackground}
        >
          <Animated.View 
            style={[
              styles.miiPreview,
              {
                transform: [
                  { rotate: rotateAnim.interpolate({
                    inputRange: [-10, 10],
                    outputRange: ['-30deg', '30deg']
                  })},
                  { scale: scaleAnim }
                ]
              }
            ]}
            {...panResponder.panHandlers}
          >
            {/* Base do personagem (rosto) */}
            <Image 
              source={{ uri: customAvatar.face.option || avatarParts[0].options[0].imageUrl }} 
              style={[
                styles.miiPartImage,
                { 
                  width: 150, 
                  height: 150,
                  tintColor: customAvatar.face.color,
                  transform: [
                    { scale: customAvatar.face.size || 1 }
                  ]
                }
              ]} 
            />
            
            {/* Aqui renderizaríamos as outras partes do avatar em camadas
                Em um cenário real, cada parte seria posicionada corretamente */}
            
          </Animated.View>
          
          <Text style={styles.miiPreviewInstructions}>Arraste para girar</Text>
        </LinearGradient>
        
        {/* Botão de aleatorização */}
        <TouchableOpacity
          style={styles.randomizeButton}
          onPress={handleRandomizeAvatar}
        >
          <Text style={styles.randomizeButtonText}>Aleatório</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Componente para renderizar as abas de categorias de personalização
  const renderMiiCategoryTabs = () => {
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.miiCategoryTabs}
        contentContainerStyle={styles.miiCategoryTabsContent}
      >
        {avatarParts.map(part => (
          <TouchableOpacity
            key={part.id}
            style={[
              styles.miiCategoryTab,
              currentPartCategory === part.id && styles.activeMiiCategoryTab
            ]}
            onPress={() => handleSelectPartCategory(part.id)}
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
    const currentPart = avatarParts.find(part => part.id === currentPartCategory);
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
    return (
      <SafeAreaView style={styles.miiContainer}>
        {/* Preview do avatar 3D com rotação */}
        {renderMiiAvatarPreview()}
        
        {/* Toggle entre opções/cores/ajustes */}
        {renderCustomizationToggle()}
        
        {/* Tabs para escolher categorias de personalização */}
        {renderMiiCategoryTabs()}
        
        <Divider style={styles.divider} />
        
        {/* Conteúdo baseado na seleção atual (opções/cores/ajustes) */}
        <View style={styles.miiContentContainer}>
          {currentCustomization === 'option' && renderCustomizerOptions()}
          {currentCustomization === 'color' && renderColorSelector()}
          {currentCustomization === 'sliders' && renderCustomizationSliders()}
        </View>
        
        {/* Menu de cores */}
        <Menu
          visible={showColorMenu}
          onDismiss={() => setShowColorMenu(false)}
          style={[
            styles.colorMenu,
            { 
              top: colorMenuAnchor.y - 100, 
              left: Platform.OS === 'web' ? colorMenuAnchor.x - 150 : 20
            }
          ]}
        >
          <Menu.Item 
            onPress={() => handleSelectColor('#FF4D4D')} 
            title="Vermelho" 
            leadingIcon={() => <View style={[styles.colorMenuItem, { backgroundColor: '#FF4D4D' }]} />}
          />
          <Menu.Item 
            onPress={() => handleSelectColor('#4CAF50')} 
            title="Verde" 
            leadingIcon={() => <View style={[styles.colorMenuItem, { backgroundColor: '#4CAF50' }]} />}
          />
          <Menu.Item 
            onPress={() => handleSelectColor('#2196F3')} 
            title="Azul" 
            leadingIcon={() => <View style={[styles.colorMenuItem, { backgroundColor: '#2196F3' }]} />}
          />
          <Menu.Item 
            onPress={() => handleSelectColor('#FFC107')} 
            title="Amarelo" 
            leadingIcon={() => <View style={[styles.colorMenuItem, { backgroundColor: '#FFC107' }]} />}
          />
          <Menu.Item 
            onPress={() => handleSelectColor('#9C27B0')} 
            title="Roxo" 
            leadingIcon={() => <View style={[styles.colorMenuItem, { backgroundColor: '#9C27B0' }]} />}
          />
          <Menu.Item 
            onPress={() => handleSelectColor('#FF9800')} 
            title="Laranja" 
            leadingIcon={() => <View style={[styles.colorMenuItem, { backgroundColor: '#FF9800' }]} />}
          />
          <Menu.Item 
            onPress={() => handleSelectColor('#795548')} 
            title="Marrom" 
            leadingIcon={() => <View style={[styles.colorMenuItem, { backgroundColor: '#795548' }]} />}
          />
          <Menu.Item 
            onPress={() => handleSelectColor('#607D8B')} 
            title="Azul Acinzentado" 
            leadingIcon={() => <View style={[styles.colorMenuItem, { backgroundColor: '#607D8B' }]} />}
          />
          <Divider />
          <Menu.Item 
            onPress={() => {
              // Em um app real, abriria um color picker
              const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16);
              handleSaveCustomColor(randomColor, 'Personalizada');
            }} 
            title="Personalizar cor..." 
            leadingIcon="eyedropper-variant"
          />
        </Menu>
        
        {/* Botões de ação */}
        <View style={styles.miiActionButtons}>
          <Button 
            mode="outlined" 
            onPress={() => setSelectorMode('list')}
            style={styles.miiActionButton}
            icon="arrow-left"
          >
            Voltar
          </Button>
          <Button 
            mode="contained" 
            onPress={handleSelectCustomAvatar}
            style={styles.miiActionButton}
            icon="check"
          >
            Confirmar
          </Button>
        </View>
      </SafeAreaView>
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

  // Renderização principal do componente
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
        dismissable={true}
      >
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
            <Card style={styles.card}>
              <Card.Title 
                title={selectorMode === 'list' ? title : "Criação de Avatar"} 
                subtitle={selectorMode === 'mii' ? "Personalize seu avatar ao estilo Mii" : undefined}
                right={(props) => (
                  <IconButton 
                    {...props} 
                    icon="close" 
                    onPress={onDismiss}
                  />
                )}
              />
              
              {selectorMode === 'list' ? renderListMode() : renderMiiCustomizationMode()}
              
              {selectorMode === 'list' && (
                <Card.Actions style={styles.actions}>
                  <Button onPress={onDismiss}>Cancelar</Button>
                </Card.Actions>
              )}
            </Card>
          </View>
        </Animated.View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    margin: 15,
    justifyContent: 'center',
    backgroundColor: 'transparent'
  },
  modalContent: {
    flex: 1,
    backgroundColor: 'transparent'
  },
  cardContainer: {
    flex: 1,
    overflow: 'visible' // Importante: permite que as sombras sejam renderizadas corretamente
  },
  card: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  listContent: {
    flex: 1,
    padding: 10
  },
  searchBar: {
    marginBottom: 10,
    elevation: 2
  },
  filtersContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    backgroundColor: 'transparent'
  },
  filterSection: {
    marginRight: 20,
    backgroundColor: 'transparent'
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    marginTop: 10
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: 'transparent'
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
    borderRadius: 30,
    elevation: 3
  },
  avatarListWrapper: {
    flex: 1,
    minHeight: 300,
    maxHeight: 400
  },
  avatarListContent: {
    paddingVertical: 10,
    backgroundColor: '#ffffff'
  },
  avatarContainer: {
    flex: 1,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    margin: 5
  },
  avatarWrapper: {
    backgroundColor: '#ffffff',
    borderRadius: 60,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4
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
    padding: 40,
    backgroundColor: '#ffffff'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666'
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#ffffff'
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
    padding: 40,
    backgroundColor: '#ffffff'
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666'
  },
  actions: {
    justifyContent: 'flex-end',
    backgroundColor: 'transparent'
  },
  
  // Estilos para o modo de customização estilo Mii
  miiContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  miiPreviewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    position: 'relative'
  },
  miiPreviewBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  miiPreview: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    overflow: 'hidden'
  },
  miiPartImage: {
    width: 150,
    height: 150,
    resizeMode: 'contain'
  },
  miiPreviewInstructions: {
    marginTop: 10,
    fontSize: 12,
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
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3
  },
  randomizeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14
  },
  customizationToggleContainer: {
    padding: 10,
    backgroundColor: '#fff',
    elevation: 3,
    zIndex: 1
  },
  customizationToggle: {
    backgroundColor: '#f0f0f0'
  },
  miiCategoryTabs: {
    backgroundColor: '#e0e0e0',
    maxHeight: 50
  },
  miiCategoryTabsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5
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
    padding: 10,
    backgroundColor: '#fff'
  },
  customizationOptionsContainer: {
    flex: 1,
    paddingVertical: 10
  },
  partOptionsContent: {
    paddingBottom: 15
  },
  partOptionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    width: 100,
    height: 120,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 2
  },
  selectedPartOption: {
    borderWidth: 2,
    borderColor: '#2196F3',
    backgroundColor: '#e3f2fd'
  },
  partOptionImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 8
  },
  partOptionText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#333'
  },
  colorSelectorContainer: {
    paddingVertical: 15
  },
  colorSelectorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333'
  },
  colorSwatchesContainer: {
    flexDirection: 'row',
    paddingBottom: 10
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center'
  },
  selectedColorSwatch: {
    borderWidth: 2,
    borderColor: '#2196F3'
  },
  selectedColorIndicator: {
    width: 15,
    height: 15,
    borderRadius: 10,
    backgroundColor: '#fff'
  },
  addColorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed'
  },
  addColorButtonText: {
    fontSize: 20,
    color: '#666'
  },
  noColorOptionsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 20
  },
  colorMenu: {
    width: 250,
    position: 'absolute'
  },
  colorMenuItem: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  slidersContainer: {
    paddingVertical: 15
  },
  slidersTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333'
  },
  sliderContainer: {
    marginBottom: 15
  },
  sliderLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5
  },
  slider: {
    height: 40
  },
  noSlidersText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 20
  },
  miiActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  miiActionButton: {
    flex: 1,
    marginHorizontal: 5
  }
});

export default AvatarSelector;