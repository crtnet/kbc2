// src/components/avatar/AvatarParts.ts
// Definições e tipos para as partes do avatar personalizável

export interface AvatarColor {
  id: string;
  name: string;
  value: string;
}

export interface AvatarPartOption {
  id: string;
  name: string;
  imageUrl: string;
}

export interface AvatarPart {
  id: string;
  name: string;
  options: AvatarPartOption[];
  zIndex: number;
  colorizeOptions?: boolean;
  defaultColor?: string;
}

export interface CustomizationSlider {
  id: string;
  name: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

// Cores padrão disponíveis
export const DEFAULT_COLORS: AvatarColor[] = [
  { id: 'red', name: 'Vermelho', value: '#FF4D4D' },
  { id: 'green', name: 'Verde', value: '#4CAF50' },
  { id: 'blue', name: 'Azul', value: '#2196F3' },
  { id: 'yellow', name: 'Amarelo', value: '#FFC107' },
  { id: 'purple', name: 'Roxo', value: '#9C27B0' },
  { id: 'orange', name: 'Laranja', value: '#FF9800' },
  { id: 'brown', name: 'Marrom', value: '#795548' },
  { id: 'grey', name: 'Cinza', value: '#9E9E9E' },
  { id: 'black', name: 'Preto', value: '#000000' },
  { id: 'white', name: 'Branco', value: '#FFFFFF' },
  { id: 'skin1', name: 'Pele Clara', value: '#FFE0B2' },
  { id: 'skin2', name: 'Pele Média', value: '#FFCC80' },
  { id: 'skin3', name: 'Pele Morena', value: '#D2B48C' },
  { id: 'skin4', name: 'Pele Escura', value: '#A0522D' },
  { id: 'blonde', name: 'Loiro', value: '#FFF176' },
  { id: 'brown_hair', name: 'Castanho', value: '#8D6E63' },
  { id: 'red_hair', name: 'Ruivo', value: '#FF7043' },
  { id: 'black_hair', name: 'Preto', value: '#424242' },
  { id: 'grey_hair', name: 'Grisalho', value: '#B0BEC5' }
];

// Estado inicial para o avatar personalizado
export const INITIAL_CUSTOM_AVATAR = {
  face: {
    option: '',
    color: '#FFE0B2',
    size: 1,
    position: { x: 0, y: 0 }
  },
  eyes: {
    option: '',
    color: '#2196F3',
    size: 1,
    spacing: 1,
    position: { x: 0, y: 0 }
  },
  eyebrows: {
    option: '',
    color: '#8D6E63',
    size: 1,
    spacing: 1,
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
    width: 1,
    height: 1,
    position: { x: 0, y: 0 }
  },
  hair: {
    option: '',
    color: '#8D6E63',
    size: 1,
    position: { x: 0, y: 0 }
  },
  beard: {
    option: '',
    color: '#8D6E63',
    size: 1,
    density: 1,
    position: { x: 0, y: 0 }
  },
  glasses: {
    option: '',
    color: '#424242',
    size: 1,
    position: { x: 0, y: 0 }
  },
  accessories: {
    option: '',
    color: '#FFC107',
    size: 1,
    position: { x: 0, y: 0 }
  },
  outfit: {
    option: '',
    color: '#2196F3',
    size: 1,
    position: { x: 0, y: 0 }
  }
};

// Definição das partes do avatar
export const AVATAR_PARTS: AvatarPart[] = [
  {
    id: 'face',
    name: 'Rosto',
    zIndex: 1,
    colorizeOptions: true,
    defaultColor: '#FFE0B2',
    options: [
      { id: 'face_round', name: 'Redondo', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665909.png' },
      { id: 'face_oval', name: 'Oval', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665931.png' },
      { id: 'face_square', name: 'Quadrado', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665921.png' },
      { id: 'face_heart', name: 'Coração', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665941.png' },
      { id: 'face_triangle', name: 'Triângulo', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665951.png' }
    ]
  },
  {
    id: 'eyes',
    name: 'Olhos',
    zIndex: 5,
    colorizeOptions: true,
    defaultColor: '#2196F3',
    options: [
      { id: 'eyes_round', name: 'Redondos', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665845.png' },
      { id: 'eyes_almond', name: 'Amendoados', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665851.png' },
      { id: 'eyes_wide', name: 'Grandes', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665847.png' },
      { id: 'eyes_sleepy', name: 'Sonolentos', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665849.png' },
      { id: 'eyes_playful', name: 'Brincalhões', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665855.png' }
    ]
  },
  {
    id: 'eyebrows',
    name: 'Sobrancelhas',
    zIndex: 6,
    colorizeOptions: true,
    defaultColor: '#8D6E63',
    options: [
      { id: 'eyebrows_straight', name: 'Retas', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665859.png' },
      { id: 'eyebrows_arched', name: 'Arqueadas', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665862.png' },
      { id: 'eyebrows_thick', name: 'Grossas', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665865.png' },
      { id: 'eyebrows_thin', name: 'Finas', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665867.png' },
      { id: 'eyebrows_angled', name: 'Anguladas', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665870.png' }
    ]
  },
  {
    id: 'nose',
    name: 'Nariz',
    zIndex: 4,
    colorizeOptions: false,
    options: [
      { id: 'nose_small', name: 'Pequeno', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665874.png' },
      { id: 'nose_medium', name: 'Médio', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665877.png' },
      { id: 'nose_large', name: 'Grande', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665880.png' },
      { id: 'nose_pointed', name: 'Pontudo', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665882.png' },
      { id: 'nose_round', name: 'Arredondado', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665885.png' }
    ]
  },
  {
    id: 'mouth',
    name: 'Boca',
    zIndex: 3,
    colorizeOptions: true,
    defaultColor: '#FF4D4D',
    options: [
      { id: 'mouth_smile', name: 'Sorriso', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665889.png' },
      { id: 'mouth_neutral', name: 'Neutra', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665891.png' },
      { id: 'mouth_wide', name: 'Larga', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665893.png' },
      { id: 'mouth_small', name: 'Pequena', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665895.png' },
      { id: 'mouth_laugh', name: 'Rindo', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665898.png' }
    ]
  },
  {
    id: 'hair',
    name: 'Cabelo',
    zIndex: 10,
    colorizeOptions: true,
    defaultColor: '#8D6E63',
    options: [
      { id: 'hair_none', name: 'Nenhum', imageUrl: 'https://cdn-icons-png.flaticon.com/512/8148/8148760.png' },
      { id: 'hair_short', name: 'Curto', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3244/3244365.png' },
      { id: 'hair_medium', name: 'Médio', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3244/3244351.png' },
      { id: 'hair_long', name: 'Longo', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3244/3244347.png' },
      { id: 'hair_curly', name: 'Cacheado', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3244/3244362.png' },
      { id: 'hair_spiky', name: 'Espetado', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3244/3244358.png' },
      { id: 'hair_bald', name: 'Careca', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3244/3244331.png' },
      { id: 'hair_bob', name: 'Chanel', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3244/3244342.png' },
      { id: 'hair_bun', name: 'Coque', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3244/3244338.png' },
      { id: 'hair_ponytail', name: 'Rabo de Cavalo', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3244/3244345.png' }
    ]
  },
  {
    id: 'beard',
    name: 'Barba',
    zIndex: 2,
    colorizeOptions: true,
    defaultColor: '#8D6E63',
    options: [
      { id: 'beard_none', name: 'Nenhuma', imageUrl: 'https://cdn-icons-png.flaticon.com/512/8148/8148760.png' },
      { id: 'beard_short', name: 'Curta', imageUrl: 'https://cdn-icons-png.flaticon.com/512/1326/1326377.png' },
      { id: 'beard_medium', name: 'Média', imageUrl: 'https://cdn-icons-png.flaticon.com/512/1326/1326405.png' },
      { id: 'beard_long', name: 'Longa', imageUrl: 'https://cdn-icons-png.flaticon.com/512/1326/1326419.png' },
      { id: 'beard_goatee', name: 'Cavanhaque', imageUrl: 'https://cdn-icons-png.flaticon.com/512/1326/1326425.png' },
      { id: 'beard_mustache', name: 'Bigode', imageUrl: 'https://cdn-icons-png.flaticon.com/512/1326/1326187.png' }
    ]
  },
  {
    id: 'glasses',
    name: 'Óculos',
    zIndex: 7,
    colorizeOptions: true,
    defaultColor: '#424242',
    options: [
      { id: 'glasses_none', name: 'Nenhum', imageUrl: 'https://cdn-icons-png.flaticon.com/512/8148/8148760.png' },
      { id: 'glasses_round', name: 'Redondos', imageUrl: 'https://cdn-icons-png.flaticon.com/512/6411/6411516.png' },
      { id: 'glasses_square', name: 'Quadrados', imageUrl: 'https://cdn-icons-png.flaticon.com/512/6411/6411518.png' },
      { id: 'glasses_rimless', name: 'Sem Aro', imageUrl: 'https://cdn-icons-png.flaticon.com/512/6411/6411520.png' },
      { id: 'glasses_sunglasses', name: 'De Sol', imageUrl: 'https://cdn-icons-png.flaticon.com/512/6411/6411522.png' }
    ]
  },
  {
    id: 'accessories',
    name: 'Acessórios',
    zIndex: 11,
    colorizeOptions: true,
    defaultColor: '#FFC107',
    options: [
      { id: 'accessories_none', name: 'Nenhum', imageUrl: 'https://cdn-icons-png.flaticon.com/512/8148/8148760.png' },
      { id: 'accessories_hat', name: 'Chapéu', imageUrl: 'https://cdn-icons-png.flaticon.com/512/8148/8148728.png' },
      { id: 'accessories_cap', name: 'Boné', imageUrl: 'https://cdn-icons-png.flaticon.com/512/8148/8148725.png' },
      { id: 'accessories_beanie', name: 'Gorro', imageUrl: 'https://cdn-icons-png.flaticon.com/512/8148/8148731.png' },
      { id: 'accessories_headband', name: 'Bandana', imageUrl: 'https://cdn-icons-png.flaticon.com/512/8148/8148734.png' },
      { id: 'accessories_earring', name: 'Brinco', imageUrl: 'https://cdn-icons-png.flaticon.com/512/8148/8148740.png' }
    ]
  },
  {
    id: 'outfit',
    name: 'Roupa',
    zIndex: 0,
    colorizeOptions: true,
    defaultColor: '#2196F3',
    options: [
      { id: 'outfit_tshirt', name: 'Camiseta', imageUrl: 'https://cdn-icons-png.flaticon.com/512/1867/1867700.png' },
      { id: 'outfit_shirt', name: 'Camisa', imageUrl: 'https://cdn-icons-png.flaticon.com/512/1867/1867710.png' },
      { id: 'outfit_hoodie', name: 'Moletom', imageUrl: 'https://cdn-icons-png.flaticon.com/512/1867/1867721.png' },
      { id: 'outfit_suit', name: 'Terno', imageUrl: 'https://cdn-icons-png.flaticon.com/512/1867/1867731.png' },
      { id: 'outfit_dress', name: 'Vestido', imageUrl: 'https://cdn-icons-png.flaticon.com/512/1867/1867742.png' },
      { id: 'outfit_uniform', name: 'Uniforme', imageUrl: 'https://cdn-icons-png.flaticon.com/512/1867/1867752.png' }
    ]
  }
];

// Definições de sliders de customização para cada parte
export const AVATAR_SLIDERS: { [key: string]: CustomizationSlider[] } = {
  face: [
    { id: 'size', name: 'Tamanho', min: 0.8, max: 1.2, step: 0.01, defaultValue: 1 },
    { id: 'width', name: 'Largura', min: 0.8, max: 1.2, step: 0.01, defaultValue: 1 },
    { id: 'height', name: 'Altura', min: 0.8, max: 1.2, step: 0.01, defaultValue: 1 }
  ],
  eyes: [
    { id: 'size', name: 'Tamanho', min: 0.8, max: 1.5, step: 0.01, defaultValue: 1 },
    { id: 'spacing', name: 'Espaçamento', min: 0.5, max: 1.5, step: 0.01, defaultValue: 1 },
    { id: 'position_y', name: 'Posição Vertical', min: -20, max: 20, step: 1, defaultValue: 0 }
  ],
  eyebrows: [
    { id: 'size', name: 'Tamanho', min: 0.8, max: 1.5, step: 0.01, defaultValue: 1 },
    { id: 'spacing', name: 'Espaçamento', min: 0.5, max: 1.5, step: 0.01, defaultValue: 1 },
    { id: 'position_y', name: 'Posição Vertical', min: -20, max: 20, step: 1, defaultValue: 0 }
  ],
  nose: [
    { id: 'size', name: 'Tamanho', min: 0.8, max: 1.5, step: 0.01, defaultValue: 1 },
    { id: 'position_y', name: 'Posição Vertical', min: -20, max: 20, step: 1, defaultValue: 0 },
    { id: 'position_x', name: 'Posição Horizontal', min: -10, max: 10, step: 1, defaultValue: 0 }
  ],
  mouth: [
    { id: 'size', name: 'Tamanho', min: 0.8, max: 1.5, step: 0.01, defaultValue: 1 },
    { id: 'width', name: 'Largura', min: 0.8, max: 1.5, step: 0.01, defaultValue: 1 },
    { id: 'position_y', name: 'Posição Vertical', min: -20, max: 20, step: 1, defaultValue: 0 }
  ],
  hair: [
    { id: 'size', name: 'Tamanho', min: 0.8, max: 1.5, step: 0.01, defaultValue: 1 },
    { id: 'position_y', name: 'Posição Vertical', min: -30, max: 10, step: 1, defaultValue: 0 }
  ],
  beard: [
    { id: 'size', name: 'Tamanho', min: 0.8, max: 1.5, step: 0.01, defaultValue: 1 },
    { id: 'density', name: 'Densidade', min: 0.7, max: 1.3, step: 0.01, defaultValue: 1 },
    { id: 'position_y', name: 'Posição Vertical', min: -15, max: 15, step: 1, defaultValue: 0 }
  ],
  glasses: [
    { id: 'size', name: 'Tamanho', min: 0.8, max: 1.5, step: 0.01, defaultValue: 1 },
    { id: 'position_y', name: 'Posição Vertical', min: -15, max: 15, step: 1, defaultValue: 0 }
  ],
  accessories: [
    { id: 'size', name: 'Tamanho', min: 0.8, max: 1.5, step: 0.01, defaultValue: 1 },
    { id: 'position_y', name: 'Posição Vertical', min: -30, max: 10, step: 1, defaultValue: 0 },
    { id: 'rotation', name: 'Rotação', min: -30, max: 30, step: 1, defaultValue: 0 }
  ],
  outfit: [
    { id: 'size', name: 'Tamanho', min: 0.8, max: 1.5, step: 0.01, defaultValue: 1 }
  ]
};